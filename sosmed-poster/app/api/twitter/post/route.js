import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { xClient } from "@/lib/x";

export const maxDuration = 60;

export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const { text, replyText, mediaIds = [] } = await req.json();
    const api = xClient().v2;

    // X maksimal 4 gambar per tweet -> sisanya jadi balasan berikutnya
    const chunks = [];
    for (let i = 0; i < mediaIds.length; i += 4) chunks.push(mediaIds.slice(i, i + 4));

    const first = await api.tweet({
      text: text || "",
      ...(chunks[0] ? { media: { media_ids: chunks[0] } } : {}),
    });
    let lastId = first.data.id;

    for (const c of chunks.slice(1)) {
      const t = await api.tweet({
        text: "",
        media: { media_ids: c },
        reply: { in_reply_to_tweet_id: lastId },
      });
      lastId = t.data.id;
    }

    // Balasan hashtag
    if (replyText) {
      await api.tweet({ text: replyText, reply: { in_reply_to_tweet_id: lastId } });
    }

    return NextResponse.json({
      id: first.data.id,
      link: `https://x.com/i/status/${first.data.id}`,
    });
  } catch (e) {
    return fail(e);
  }
}
