import { NextResponse } from "next/server";
import { SIGNALING_HTTP_ORIGIN } from "@/lib/signaling/config";

const upstreamUrl = `${SIGNALING_HTTP_ORIGIN}/rooms`;

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      cache: "no-store",
    });

    const body = await upstream.text();
    const headers = new Headers();
    const contentType = upstream.headers.get("content-type");

    if (contentType) {
      headers.set("content-type", contentType);
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "Failed to reach signaling service",
        message,
      },
      { status: 502 }
    );
  }
}
