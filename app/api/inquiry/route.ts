import { NextRequest } from "next/server";

const fields = ["firstName", "lastName", "email", "phone", "location", "size", "service", "message"] as const;
const contactRecipients = ["emmahowerter@gmail.com", "contact@perfectprairie.com"] as const;

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 30_000) return Response.json({ error: "Request too large" }, { status: 413 });

  let input: Record<string, unknown>;
  try {
    input = await request.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  if (typeof input.website === "string" && input.website.length > 0) {
    return Response.json({ ok: true });
  }

  const inquiry = Object.fromEntries(fields.map((field) => [field, clean(input[field])])) as Record<(typeof fields)[number], string>;
  if (!inquiry.firstName || !inquiry.lastName || !validEmail(inquiry.email) || !inquiry.location || !inquiry.message) {
    return Response.json({ error: "Please complete the required fields" }, { status: 400 });
  }

  const webhookUrl = process.env.CONTACT_WEBHOOK_URL;
  if (!webhookUrl) {
    return Response.json({ error: "Contact delivery is not configured" }, { status: 503 });
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "Perfect Prairie website",
        submittedAt: new Date().toISOString(),
        to: contactRecipients.join(", "),
        recipients: [...contactRecipients],
        replyTo: inquiry.email,
        subject: `New Perfect Prairie project request — ${inquiry.firstName} ${inquiry.lastName}`,
        inquiry,
      }),
    });

    if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error(JSON.stringify({ event: "inquiry_delivery_failed", message: error instanceof Error ? error.message : "unknown" }));
    return Response.json({ error: "Delivery failed" }, { status: 502 });
  }
}

function clean(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 2_000) : "";
}

function validEmail(value: string) {
  return value.length <= 160 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
