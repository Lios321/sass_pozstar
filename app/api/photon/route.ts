import { NextResponse } from "next/server";

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit = searchParams.get("limit") || "6";

  if (q.length < 2) {
    return NextResponse.json({ features: [] }, { status: 200 });
  }

  const query = q
    .replace(/\bR\.\s*/gi, "Rua ")
    .replace(/\bAv\.\s*/gi, "Avenida ")
    .replace(/\d{5}-\d{3}/g, "")
    .replace(/,\s*\d+\b/g, "")
    .trim();
  const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
    query
  )}&limit=${encodeURIComponent(limit)}&lang=default`;

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
      const nomiUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${encodeURIComponent(
        limit
      )}&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
      const nomRes = await fetch(nomiUrl, {
        headers: {
          accept: "application/json",
          "user-agent": "sass_pozstar/0.1.0 (+http://localhost:3001)",
        },
        cache: "no-store",
      });
      if (!nomRes.ok) {
        return NextResponse.json({ features: [] }, { status: 200 });
      }
      const nomData = await nomRes.json();
      const features =
        Array.isArray(nomData) &&
        nomData.map((item: any) => {
          const addr = item.address || {};
          const city = addr.city || addr.town || addr.village || addr.locality || "";
          const district = addr.neighbourhood || addr.suburb || addr.district || "";
          return {
            properties: {
              name: item.display_name || addr.road || "",
              street: addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || "",
              housenumber: addr.house_number || "",
              city,
              state: addr.state || "",
              postcode: addr.postcode || "",
              country: addr.country || "",
              district,
              osm_id: item.osm_id,
              osm_type: item.osm_type,
            },
            geometry: { coordinates: [Number(item.lon), Number(item.lat)] },
          };
        });
      return NextResponse.json({ features: features || [] }, { status: 200 });
    }

    const data = await res.json();
    if (Array.isArray((data as any)?.features) && (data as any).features.length > 0) {
      return NextResponse.json(data);
    }
    const nomiUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${encodeURIComponent(
      limit
    )}&accept-language=pt-BR&q=${encodeURIComponent(query)}`;
    const nomRes = await fetch(nomiUrl, {
      headers: {
        accept: "application/json",
        "user-agent": "sass_pozstar/0.1.0 (+http://localhost:3001)",
      },
      cache: "no-store",
    });
    if (!nomRes.ok) {
      return NextResponse.json({ features: [] }, { status: 200 });
    }
    const nomData = await nomRes.json();
    const features =
      Array.isArray(nomData) &&
      nomData.map((item: any) => {
        const addr = item.address || {};
        const city = addr.city || addr.town || addr.village || addr.locality || "";
        const district = addr.neighbourhood || addr.suburb || addr.district || "";
        return {
          properties: {
            name: item.display_name || addr.road || "",
            street: addr.road || addr.pedestrian || addr.footway || addr.path || addr.cycleway || "",
            housenumber: addr.house_number || "",
            city,
            state: addr.state || "",
            postcode: addr.postcode || "",
            country: addr.country || "",
            district,
            osm_id: item.osm_id,
            osm_type: item.osm_type,
          },
          geometry: { coordinates: [Number(item.lon), Number(item.lat)] },
        };
      });
    return NextResponse.json({ features: features || [] }, { status: 200 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "photon_fetch_failed", detail: String(err instanceof Error ? err.message : err), features: [] },
      { status: 200 }
    );
  }
}
