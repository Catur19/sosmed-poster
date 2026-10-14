"use client";

import { useMemo, useRef, useState } from "react";

// Batas per file. X mengizinkan 5MB, tapi Vercel membatasi body request ~4.5MB.
const MAX_MB = 4.5;

const DEFAULT_FOOTER = `=======
©2026
Tim Humas Kemenkum DIY

#KementerianHukum
#LayananHukumMakinMudah
#KanwilKemenkumDIY`;

const DEFAULT_REPLY = `#KementerianHukum
#LayananHukumMakinMudah
#KanwilKemenkumDIY`;

function Counter({ value, max }) {
  const over = value.length > max;
  return (
    <div className={`count${over ? " over" : ""}`}>
      {value.length}/{max} karakter
    </div>
  );
}

export default function Home() {
  const [caption, setCaption] = useState("");
  const [footer, setFooter] = useState(DEFAULT_FOOTER);
  const [replyCaption, setReplyCaption] = useState(DEFAULT_REPLY);
  const [newsDate, setNewsDate] = useState("");
  const [fbPostId, setFbPostId] = useState("");
  const [files, setFiles] = useState([]);
  const [mode, setMode] = useState("sequential"); // sequential | parallel
  const [passcode, setPasscode] = useState("");
  const [sheetWa, setSheetWa] = useState("Oktober 2026");
  const [sheetImpact, setSheetImpact] = useState("Pelaporan Mandiri Periode Sept - Okt");
  const [links, setLinks] = useState({ facebook: "", instagram: "", threads: "", twitter: "" });
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  // Judul = paragraf pertama caption (dipisah baris kosong)
  const title = useMemo(() => caption.split(/\n\s*\n/)[0].trim(), [caption]);
  const threadsText = useMemo(() => (title ? `${title}\n\n${footer}` : footer), [title, footer]);

  const waMessage = `${title || "[JUDUL/Paragraf pertama]"}

*Instagram:*
${links.instagram || "link-instagram"}

*Facebook:*
${links.facebook || "link-facebook"}

*X:*
${links.twitter || "link-twitter"}

*TikTok:*
(Belum Tersedia)

*YouTube:*
(Belum Tersedia)

*Threads:*
${links.threads || "link-threads"}

Tim Humas
Kemenkum DIY`;

  const log = (text, err = false) =>
    setLogs((l) => [...l, { t: new Date().toLocaleTimeString("id-ID"), text, err }]);

  // ---------- file handling ----------
  function addFiles(list) {
    const incoming = Array.from(list).filter((f) => f.type.startsWith("image/"));
    const ok = [];
    for (const f of incoming) {
      if (f.size > MAX_MB * 1024 * 1024) {
        log(`${f.name} dilewati: lebih dari ${MAX_MB}MB`, true);
      } else ok.push(f);
    }
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      ok.forEach((f) => map.set(f.name, f));
      // Urut abjad, sesuai aturan sistem
      return [...map.values()].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true })
      );
    });
  }

  // ---------- request helpers ----------
  async function postJson(url, body) {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-passcode": passcode },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || `HTTP ${r.status}`);
    return d;
  }

  async function uploadFiles(url) {
    const up = async (f) => {
      const fd = new FormData();
      fd.append("file", f);
      const r = await fetch(url, { method: "POST", headers: { "x-passcode": passcode }, body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(`${f.name}: ${d.error || `HTTP ${r.status}`}`);
      log(`Terupload: ${f.name}`);
      return d.id;
    };
    if (mode === "parallel") return Promise.all(files.map(up));
    const ids = [];
    for (const f of files) ids.push(await up(f));
    return ids;
  }

  async function run(label, fn) {
    if (busy) return;
    setBusy(label);
    log(`${label}: mulai...`);
    try {
      await fn();
      log(`${label}: berhasil`);
    } catch (e) {
      log(`${label}: GAGAL - ${e.message}`, true);
    } finally {
      setBusy("");
    }
  }

  // ---------- actions ----------
  const sendFacebook = () =>
    run("Facebook", async () => {
      const photoIds = await uploadFiles("/api/facebook/photo");
      const d = await postJson("/api/facebook/post", { message: caption, photoIds });
      setFbPostId(d.postId);
      setLinks((l) => ({ ...l, facebook: d.link }));
      log(`Post ID Facebook: ${d.postId}`);
    });

  const sendInstagram = () =>
    run("Instagram", async () => {
      const d = await postJson("/api/instagram", { message: caption, facebookPostId: fbPostId });
      setLinks((l) => ({ ...l, instagram: d.link }));
    });

  const sendThreads = () =>
    run("Threads", async () => {
      const d = await postJson("/api/threads", { text: threadsText, facebookPostId: fbPostId });
      setLinks((l) => ({ ...l, threads: d.link }));
    });

  const sendTwitter = () =>
    run("Twitter/X", async () => {
      const mediaIds = await uploadFiles("/api/twitter/media");
      const d = await postJson("/api/twitter/post", { text: caption, replyText: replyCaption, mediaIds });
      setLinks((l) => ({ ...l, twitter: d.link }));
    });

  const sendSheet = () =>
    run("Spreadsheet", async () => {
      const empty = Object.entries(links).filter(([, v]) => !v).map(([k]) => k);
      if (empty.length) log(`Link kosong akan terisi kosong: ${empty.join(", ")}`);
      await postJson("/api/sheets", { date: newsDate, title, links, sheetWa, sheetImpact });
    });

  const disabled = !!busy || !passcode;

  return (
    <main className="wrap">
      <h1>Post Sosmed Kemenkum Jogja</h1>
      <p className="sub">Posting ke Facebook, Instagram, Threads, dan X, lalu catat ke spreadsheet.</p>

      <ol className="rules">
        <li>Mengikuti aturan X/Twitter, semua gambar yang diunggah maksimal {MAX_MB}MB.</li>
        <li>Gambar diunggah berurutan secara abjad. Urutan memilih gambar tidak berpengaruh.</li>
        <li>Untuk Instagram dan Threads, kirim ke Facebook terlebih dahulu.</li>
        <li>Sebelum mengirim ke spreadsheet, pastikan link sudah terisi. Yang kosong akan terisi kosong.</li>
        <li>Khusus Threads, postingan hanya mengambil paragraf pertama (judul) dari caption.</li>
      </ol>

      <div className="grid">
        {/* ---------- Kolom kiri: input ---------- */}
        <section className="card">
          <div className="field">
            <label htmlFor="caption">Caption postingan</label>
            <textarea id="caption" rows={8} value={caption} onChange={(e) => setCaption(e.target.value)} />
            <Counter value={caption} max={1500} />
          </div>

          <div className="field">
            <label htmlFor="footer">Footer untuk Threads</label>
            <textarea id="footer" rows={8} value={footer} onChange={(e) => setFooter(e.target.value)} />
            <Counter value={threadsText} max={500} />
          </div>

          <div className="field">
            <label htmlFor="reply">Caption balasan untuk thread Twitter/X</label>
            <textarea id="reply" rows={4} value={replyCaption} onChange={(e) => setReplyCaption(e.target.value)} />
            <Counter value={replyCaption} max={500} />
          </div>

          <div className="field">
            <label htmlFor="date">Tanggal Berita</label>
            <input id="date" type="date" value={newsDate} onChange={(e) => setNewsDate(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="fbid">Post ID Facebook</label>
            <input id="fbid" type="text" value={fbPostId} onChange={(e) => setFbPostId(e.target.value)} />
          </div>

          <div className="field">
            <label>Gambar/Foto</label>
            <div
              className={`drop${dragging ? " active" : ""}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
            >
              Tarik foto ke sini atau klik untuk pilih foto
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
            </div>
            {files.length > 0 && (
              <ul className="files">
                {files.map((f) => (
                  <li key={f.name}>
                    <span>{f.name} ({(f.size / 1024 / 1024).toFixed(2)} MB)</span>
                    <button type="button" onClick={() => setFiles((fs) => fs.filter((x) => x !== f))}>
                      Hapus
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="field">
            <label>Metode Upload</label>
            <label className="radio">
              <input type="radio" checked={mode === "sequential"} onChange={() => setMode("sequential")} />
              <span>Satu per satu (lebih aman, tapi lebih lama). Cocok untuk internet terbatas.</span>
            </label>
            <label className="radio">
              <input type="radio" checked={mode === "parallel"} onChange={() => setMode("parallel")} />
              <span>Bersamaan (lebih cepat, risiko gagal lebih tinggi). Cocok untuk internet cepat dan stabil.</span>
            </label>
          </div>

          <div className="field">
            <label htmlFor="sheetWa">Sheet template WA</label>
            <input id="sheetWa" type="text" value={sheetWa} onChange={(e) => setSheetWa(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="sheetImpact">Sheet setahun berdampak</label>
            <input id="sheetImpact" type="text" value={sheetImpact} onChange={(e) => setSheetImpact(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="pass">Passcode</label>
            <input id="pass" type="password" value={passcode} onChange={(e) => setPasscode(e.target.value)} autoComplete="off" />
          </div>

          <div className="actions">
            <button className="btn" disabled={disabled} onClick={sendFacebook}>Kirim ke Facebook</button>
            <button className="btn" disabled={disabled || !fbPostId} onClick={sendInstagram}>Kirim ke Instagram</button>
            <button className="btn" disabled={disabled || !fbPostId} onClick={sendThreads}>Kirim ke Threads</button>
            <button className="btn" disabled={disabled} onClick={sendTwitter}>Kirim ke Twitter</button>
            <button className="btn alt wide" disabled={disabled} onClick={sendSheet}>Kirim ke Spreadsheet</button>
          </div>
        </section>

        {/* ---------- Kolom kanan: log + pesan WA ---------- */}
        <div className="stack">
          <section className="card">
            <h2>Log Proses</h2>
            <div className="log" role="log" aria-live="polite">
              {logs.length === 0 && <pre>Proses akan muncul di sini...</pre>}
              {logs.map((l, i) => (
                <pre key={i} className={l.err ? "err" : ""}>[{l.t}] {l.text}</pre>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Pesan untuk WA</h2>
            <pre>{waMessage}</pre>
            <div className="actions">
              <button
                className="btn alt wide"
                onClick={() => navigator.clipboard.writeText(waMessage).then(() => log("Pesan WA disalin"))}
              >
                Salin pesan
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
