import { NextResponse } from "next/server";
import { SIGNALING_HTTP_ORIGIN } from "@/lib/signaling/config";

type RouteContext = {
  params: Promise<{ roomId: string }>;
};

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: RouteContext) {
  // params を await する
  const params = await context.params;
  const roomId = params?.roomId;

  if (!roomId || typeof roomId !== "string") {
    return NextResponse.json(
      {
        error: "invalid_room_id",
        message: "Room id is required",
      },
      { status: 400 }
    );
  }

  const upstreamUrl = `${SIGNALING_HTTP_ORIGIN}/rooms/${encodeURIComponent(roomId)}/join`;

  let body: string | undefined;

  try {
    const rawBody = await request.text();
    body = rawBody.length > 0 ? rawBody : undefined;
  } catch (error) {
    console.warn("Failed to read join request body", error);
  }

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      cache: "no-store",
      headers,
      body,
    });

    const responseBody = await upstream.text();
    const responseHeaders = new Headers();
    const upstreamContentType = upstream.headers.get("content-type");

    if (upstreamContentType) {
      responseHeaders.set("content-type", upstreamContentType);
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        error: "signaling_unreachable",
        message,
      },
      { status: 502 }
    );
  }
}
