import { NextResponse } from "next/server";

// Free tier: Cloudflare Workers AI gives 10,000 "neurons" a day, roughly 200+ small FLUX images.
// Set both values in .env.local (see the setup steps).
const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const MODEL = "@cf/black-forest-labs/flux-1-schnell";

// Remembers recent images in server memory. Saving a meal re-requests the same URL the browser
// already showed, and without this it would spend free-tier quota drawing it a second time.
const MAX_CACHED = 40;
const cache = new Map<string, Buffer>();
// If the same image is requested twice at once, share one Cloudflare call.
const inFlight = new Map<string, Promise<Buffer>>();

async function generate(prompt: string, seed: number): Promise<Buffer> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/${MODEL}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
        body: JSON.stringify({ prompt, steps: 4 }),
    },
  );
  if (!res.ok) {
    throw new Error(`Cloudflare ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  // The REST API wraps the answer as { result: { image } }.
  const base64: string | undefined = json?.result?.image ?? json?.image;
  if (!base64) throw new Error("Cloudflare returned no image");
  return Buffer.from(base64, "base64");
}

export async function GET(req: Request) {
  if (!ACCOUNT_ID || !API_TOKEN) {
    return NextResponse.json(
      { error: "CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN not set" },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(req.url);
  const prompt = (searchParams.get("p") ?? "").slice(0, 2000); // Cloudflare's limit is 2048
  const seed = Number(searchParams.get("seed")) || 1;
  if (!prompt) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  const key = `${seed}:${prompt}`;
  try {
    let image = cache.get(key);
    if (!image) {
      let pending = inFlight.get(key);
      if (!pending) {
        pending = generate(prompt, seed).finally(() => inFlight.delete(key));
        inFlight.set(key, pending);
      }
      image = await pending;
      cache.set(key, image);
      if (cache.size > MAX_CACHED) {
        cache.delete(cache.keys().next().value!); // drop the oldest
      }
    }

    return new NextResponse(new Uint8Array(image), {
      headers: {
        "Content-Type": "image/jpeg",
        // Same prompt + seed = same image, so the browser can keep it.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (err: any) {
    console.error("plate-image failed:", err.message);
    return NextResponse.json(
      { error: "Image generation failed", detail: err.message },
      { status: 502 },
    );
  }
}   