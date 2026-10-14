import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { fb, getFacebookImageUrls, waitUntilReady } from "@/lib/graph";

export const maxDuration = 120;

export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const { message, facebookPostId } = await req.json();
    if (!facebookPostId) throw new Error("Post ID Facebook belum diisi");

    const igId = process.env.IG_USER_ID;
    const urls = (await getFacebookImageUrls(facebookPostId)).slice(0, 10); // maks 10 item
    if (!urls.length) throw new Error("Tidak ada gambar di post Facebook tersebut");

    let creationId;

    if (urls.length === 1) {
      const c = await fb(`${igId}/media`, {
        method: "POST",
        params: { image_url: urls[0], caption: message },
      });
      creationId = c.id;
    } else {
      // Carousel: buat tiap item dulu, lalu gabungkan
      const childIds = [];
      for (const url of urls) {
        const c = await fb(`${igId}/media`, {
          method: "POST",
          params: { image_url: url, is_carousel_item: "true" },
        });
        childIds.push(c.id);
      }
      for (const id of childIds) {
        await waitUntilReady(() => fb(id, { params: { fields: "status_code" } }), "status_code");
      }
      const c = await fb(`${igId}/media`, {
        method: "POST",
        params: { media_type: "CAROUSEL", children: childIds.join(","), caption: message },
      });
      creationId = c.id;
    }

    await waitUntilReady(() => fb(creationId, { params: { fields: "status_code" } }), "status_code");

    const pub = await fb(`${igId}/media_publish`, {
      method: "POST",
      params: { creation_id: creationId },
    });
    const info = await fb(pub.id, { params: { fields: "permalink" } });

    return NextResponse.json({ id: pub.id, link: info.permalink });
  } catch (e) {
    return fail(e);
  }
}
