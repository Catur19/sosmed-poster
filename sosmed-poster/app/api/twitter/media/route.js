import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { xClient } from "@/lib/x";

export const maxDuration = 60;

// Upload SATU gambar ke X, return media id.
// Catatan: X pernah mengubah endpoint upload media. Kalau error, cek dokumentasi
// terbaru dan library twitter-api-v2 (client.v1.uploadMedia vs client.v2.uploadMedia).
export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) throw new Error("File tidak ada");

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = await xClient().v1.uploadMedia(buffer, { mimeType: file.type });
    return NextResponse.json({ id });
  } catch (e) {
    return fail(e);
  }
}
