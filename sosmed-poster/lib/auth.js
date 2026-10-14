import { NextResponse } from "next/server";

// Panggil di awal setiap route. Kalau return nilai (bukan null), langsung return nilai itu.
export function checkPasscode(req) {
  const given = req.headers.get("x-passcode") || "";
  const expected = process.env.APP_PASSCODE || "";
  if (!expected || given !== expected) {
    return NextResponse.json({ error: "Passcode salah" }, { status: 401 });
  }
  return null;
}

export function fail(e, status = 500) {
  console.error(e);
  return NextResponse.json({ error: e?.message || "Terjadi kesalahan" }, { status });
}
