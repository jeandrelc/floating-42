import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

// Next.js normalizes 127.0.0.1 → localhost in req.url before our handler runs.
// Auth.js builds the OAuth redirect_uri from req.url, so we construct a new
// NextRequest with the AUTH_URL host baked into the URL.
function withCorrectedUrl(req: NextRequest): NextRequest {
  const authUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  if (!authUrl) return req;

  const base = new URL(authUrl);
  const reqUrl = new URL(req.url);
  if (reqUrl.host === base.host) return req;

  reqUrl.protocol = base.protocol;
  reqUrl.host = base.host;

  const headers = new Headers(req.headers);
  headers.set("host", base.host);
  headers.delete("x-forwarded-host");
  headers.delete("x-forwarded-proto");

  return new NextRequest(reqUrl.toString(), {
    method: req.method,
    headers,
    body: req.body,
    // @ts-expect-error — duplex is required when body is a ReadableStream
    duplex: "half",
  });
}

export async function GET(req: NextRequest) {
  return handlers.GET(withCorrectedUrl(req));
}

export async function POST(req: NextRequest) {
  return handlers.POST(withCorrectedUrl(req));
}
