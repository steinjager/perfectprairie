/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { withBindings } from "../db";

type WorkerEnv = Cloudflare.Env & { CONTACT_WEBHOOK_URL?: string };

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext): Promise<Response> {
    return withBindings(env, async () => {
    const url = new URL(request.url);
    const isLocal = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    const isAdminHost = url.hostname === "admin.perfectprairie.com";
    const isAdminPath = url.pathname === "/admin" || url.pathname.startsWith("/admin/") || url.pathname.startsWith("/api/admin/");

    if (isAdminPath && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
      const origin = request.headers.get("origin");
      if ((origin && origin !== url.origin) || request.headers.get("sec-fetch-site") === "cross-site") return new Response("Cross-origin writes are not allowed", { status: 403 });
      if (!request.headers.get("content-type")?.startsWith("application/json")) return new Response("JSON required", { status: 415 });
    }

    if (isAdminHost) {
      const identity = await authorizeAdmin(request, env);
      if (!identity.ok) return new Response(identity.message, { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
      const forwarded = new Request(request);
      forwarded.headers.set("x-perfect-prairie-user-email", identity.email);
      if (url.pathname === "/") {
        const adminUrl = new URL(request.url);
        adminUrl.pathname = "/admin";
        request = new Request(adminUrl, forwarded);
      } else {
        request = forwarded;
      }
    } else if (isAdminPath && !isLocal) {
      return new Response("Not found", { status: 404 });
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format: format as "image/jpeg" | "image/png" | "image/webp" | "image/avif", quality });
          return result.response();
        },
      }, allowedWidths);
    }

    const response = await handler.fetch(request, env, ctx);
    if (isAdminHost || isAdminPath || url.pathname.startsWith("/projects/") || url.pathname.startsWith("/api/project/")) {
      const privateResponse = new Response(response.body, response);
      privateResponse.headers.set("Cache-Control", "private, no-store");
      privateResponse.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
      privateResponse.headers.set("Referrer-Policy", "no-referrer");
      return privateResponse;
    }
    return response;
    });
  },
};

const accessKeySets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function authorizeAdmin(request: Request, env: WorkerEnv): Promise<{ ok: true; email: string } | { ok: false; message: string }> {
  const allowedEmails = (env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_POLICY_AUD || allowedEmails.length === 0) {
    return { ok: false, message: "Perfect Prairie Field Office authentication is not configured." };
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return { ok: false, message: "A valid Cloudflare Access session is required." };

  try {
    const teamDomain = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
    let jwks = accessKeySets.get(teamDomain);
    if (!jwks) {
      jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
      accessKeySets.set(teamDomain, jwks);
    }
    const { payload } = await jwtVerify(token, jwks, { issuer: teamDomain, audience: env.ACCESS_POLICY_AUD });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!allowedEmails.includes(email)) return { ok: false, message: "This email is not authorized for the Perfect Prairie Field Office." };
    return { ok: true, email };
  } catch (error) {
    console.error(JSON.stringify({ event: "admin_access_rejected", message: error instanceof Error ? error.message : "unknown" }));
    return { ok: false, message: "Your Cloudflare Access session could not be verified." };
  }
}

export default worker;
