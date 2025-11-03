import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = searchParams.get("limit") || "6";

  if (q.length < 2) {
    return NextResponse.json({ features: [] }, { status: 200 });
  }

  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    q
  )}&limit=${encodeURIComponent(limit)}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(photonUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "sass_pozstar/0.1.0 (+http://localhost:3001)"
      },
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: "photon_error", detail: text },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "photon_fetch_failed", detail: String(err instanceof Error ? err.message : err) },
      { status: 502 }
    );
  }
}