import { NextResponse } from "next/server";
import { checkPasscode, fail } from "@/lib/auth";
import { GRAPH } from "@/lib/graph";

export const maxDuration = 60;

// Upload SATU foto ke Page sebagai foto "unpublished". Dipanggil per foto dari browser.
export async function POST(req) {
  const denied = checkPasscode(req);
  if (denied) return denied;
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file) throw new Error("File tidak ada");

    const fd = new FormData();
    fd.append("source", file, file.name);
    fd.append("published", "false");
    fd.append("access_token", process.env.FB_PAGE_TOKEN);

    const res = await fetch(`${GRAPH}/${process.env.FB_PAGE_ID}/photos`, {
      method: "POST",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error?.message || "Upload foto gagal");
    return NextResponse.json({ id: data.id });
  } catch (e) {
    return fail(e);
  }
}
