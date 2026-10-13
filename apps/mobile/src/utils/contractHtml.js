// Contract -> printable HTML, shared by host and creator (pure; the PDF
// export lives in contractPdf.js so this stays testable without Expo). Every
// user-entered value is HTML-escaped (names, terms and listing titles are
// free text and end up inside the document).

import { CONTRACT_FIELDS } from "@/utils/contract";

export const escapeHtml = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : null);

// model: { listing, creatorName, handle, fields, rounds, signatures, date? }
export function generateContractHtml({ listing, creatorName, handle, fields = {}, rounds = 0, signatures = {}, date = new Date() }) {
  const rows = CONTRACT_FIELDS.filter((f) => fields[f.key])
    .map(
      (f) =>
        `<tr><td style="font-weight:700;width:140px;padding:10px 14px;border-bottom:1px solid #eee;">${escapeHtml(f.label)}</td><td style="padding:10px 14px;border-bottom:1px solid #eee;">${escapeHtml(fields[f.key])}</td></tr>`,
    )
    .join("");
  const blank = "___________________________";
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Collabnb Contract</title>
<style>body{font-family:Georgia,serif;max-width:680px;margin:48px auto;color:#192524;line-height:1.6}h1{font-size:22px;margin:0 0 4px}p.meta{color:#666;font-size:13px;margin:0 0 32px}table{width:100%;border-collapse:collapse;margin:24px 0}h2{font-size:14px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#666;margin:28px 0 8px}.sig-row{display:flex;gap:40px;margin-top:40px}.sig-box{flex:1;border-top:1px solid #ccc;padding-top:12px}.sig-name{font-size:20px;font-style:italic;margin-bottom:4px}.sig-label{font-size:11px;color:#666}</style></head>
<body>
<h1>Collaboration Agreement</h1>
<p class="meta">${escapeHtml(listing)} · ${escapeHtml(creatorName)}${handle ? ` (${escapeHtml(handle)})` : ""} · ${date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
<h2>Terms</h2><table>${rows}</table>
${rounds ? `<p style="font-size:12px;color:#666;margin-top:8px;">Negotiated over ${rounds} round${rounds > 1 ? "s" : ""}.</p>` : ""}
<h2>Signatures</h2>
<div class="sig-row">
  <div class="sig-box"><div class="sig-name">${escapeHtml(signatures.hostSignature) || blank}</div><div class="sig-label">Host · ${fmtDate(signatures.hostSignedAt) || "Not yet signed"}</div></div>
  <div class="sig-box"><div class="sig-name">${escapeHtml(signatures.creatorSignature) || blank}</div><div class="sig-label">${escapeHtml(creatorName)} (Creator) · ${fmtDate(signatures.creatorSignedAt) || "Not yet signed"}</div></div>
</div>
</body></html>`;
}
