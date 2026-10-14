export const GRAPH = `https://graph.facebook.com/${process.env.GRAPH_VERSION || "v23.0"}`;
export const THREADS_API = "https://graph.threads.net/v1.0";

async function graph(base, path, { method = "GET", params = {}, token }) {
  const p = new URLSearchParams({ ...params, access_token: token });
  const url = method === "GET" ? `${base}/${path}?${p}` : `${base}/${path}`;
  const res = await fetch(url, {
    method,
    body: method === "GET" ? undefined : p,
    cache: "no-store",
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(data.error?.message || `Graph API error ${res.status}`);
  }
  return data;
}

// Facebook & Instagram (graph.facebook.com)
export const fb = (path, opts = {}) =>
  graph(GRAPH, path, { ...opts, token: process.env.FB_PAGE_TOKEN });

// Threads (graph.threads.net)
export const threads = (path, opts = {}) =>
  graph(THREADS_API, path, { ...opts, token: process.env.THREADS_TOKEN });

// Ambil URL gambar dari sebuah post Facebook (urutan sesuai urutan di post).
export async function getFacebookImageUrls(postId) {
  const data = await fb(postId, {
    params: { fields: "attachments{media,subattachments}" },
  });
  const att = data.attachments?.data?.[0];
  if (!att) return [];
  const subs = att.subattachments?.data;
  const items = subs?.length ? subs : [att];
  return items.map((i) => i.media?.image?.src).filter(Boolean);
}

// Tunggu container Instagram/Threads selesai diproses.
// field: "status_code" (Instagram) atau "status" (Threads)
export async function waitUntilReady(check, field) {
  for (let i = 0; i < 20; i++) {
    const r = await check();
    const s = r[field];
    if (s === "FINISHED") return;
    if (s === "ERROR" || s === "EXPIRED") throw new Error(`Media gagal diproses (${s})`);
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timeout menunggu media diproses");
}
