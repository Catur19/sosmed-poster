import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { fb } from "@/lib/graph";

export const maxDuration = 60;

// Buat post di Page dengan foto yang sudah di-upload (photoIds).
export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const { message, photoIds = [] } = await req.json();

    const params = { message: message || "" };
    photoIds.forEach((id, i) => {
      params[`attached_media[${i}]`] = JSON.stringify({ media_fbid: id });
    });

    const data = await fb(`${process.env.FB_PAGE_ID}/feed`, { method: "POST", params });
    const info = await fb(data.id, { params: { fields: "permalink_url" } });

    return NextResponse.json({ postId: data.id, link: info.permalink_url });
  } catch (e) {
    return fail(e);
  }
}
