import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { appendRow } from "@/lib/sheets";

export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const { date, title, links = {}, sheetWa, sheetImpact } = await req.json();

    // Link yang kosong akan terisi kosong
    const ig = links.instagram || "";
    const fbk = links.facebook || "";
    const x = links.twitter || "";
    const th = links.threads || "";

    // TODO: sesuaikan urutan kolom dengan sheet kamu
    if (sheetWa) await appendRow(sheetWa, [date, title, ig, fbk, x, th]);
    if (sheetImpact) await appendRow(sheetImpact, [date, title, ig, fbk, x, th]);

    return NextResponse.json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
