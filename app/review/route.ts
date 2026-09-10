import { runtimeSetting } from "@/db";
import { GOOGLE_REVIEW_URL } from "@/lib/operations";

export async function GET() {
  return Response.redirect(runtimeSetting("GOOGLE_REVIEW_URL") || GOOGLE_REVIEW_URL, 302);
}
