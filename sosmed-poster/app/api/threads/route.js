import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { getFacebookImageUrls, threads, waitUntilReady } from "@/lib/graph";

export const maxDuration = 120;

export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    // text = judul + footer, sudah disusun di browser (maks 500 karakter)
    const { text, facebookPostId } = await req.json();
    if (!facebookPostId) throw new Error("Post ID Facebook belum diisi");
    if ((text || "").length > 500) throw new Error("Teks Threads lebih dari 500 karakter");

    const uid = process.env.THREADS_USER_ID;
    const urls = (await getFacebookImageUrls(facebookPostId)).slice(0, 20);

    let creationId;

    if (urls.length === 0) {
      const c = await threads(`${uid}/threads`, {
        method: "POST",
        params: { media_type: "TEXT", text },
      });
      creationId = c.id;
    } else if (urls.length === 1) {
      const c = await threads(`${uid}/threads`, {
        method: "POST",
        params: { media_type: "IMAGE", image_url: urls[0], text },
      });
      creationId = c.id;
    } else {
      const childIds = [];
      for (const url of urls) {
        const c = await threads(`${uid}/threads`, {
          method: "POST",
          params: { media_type: "IMAGE", image_url: url, is_carousel_item: "true" },
        });
        childIds.push(c.id);
      }
      for (const id of childIds) {
        await waitUntilReady(() => threads(id, { params: { fields: "status" } }), "status");
      }
      const c = await threads(`${uid}/threads`, {
        method: "POST",
        params: { media_type: "CAROUSEL", children: childIds.join(","), text },
      });
      creationId = c.id;
    }

    await waitUntilReady(() => threads(creationId, { params: { fields: "status" } }), "status");

    const pub = await threads(`${uid}/threads_publish`, {
      method: "POST",
      params: { creation_id: creationId },
    });
    const info = await threads(pub.id, { params: { fields: "permalink" } });

    return NextResponse.json({ id: pub.id, link: info.permalink });
  } catch (e) {
    return fail(e);
  }
}
