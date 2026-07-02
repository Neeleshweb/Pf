// ============================================================
// Cloudflare Pages Function — DecisionRoom share links: /c/<caseId>
// PLACE THIS FILE AT:  functions/c/[id].js   (in the repo root)
//
// Why this exists:
//   LinkedIn/Reddit build their preview card from the shared URL's og: tags, and the
//   card's IMAGE links back to that same URL. If we share /decisionroom.html?case=..,
//   LinkedIn may click through to the generic page (cached / canonical). So instead we
//   share a dedicated /c/<id> URL that:
//     1) serves case-specific og: tags (rich preview, not junk), and
//     2) immediately redirects any human (including the preview-image click) to
//        /decisionroom.html?case=<id>, which auto-opens the case modal.
//   Result: clicking the link OR the preview image both land on the case.
//
// dr_get_case is a public (anon) RPC that only returns non-draft cases, so nothing
// private is exposed. The anon key below is the same public read-only key in the client.
// ============================================================

const SUPA = "https://oxxzygbfgmlnvavjmhct.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHp5Z2JmZ21sbnZhdmptaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODE0MTYsImV4cCI6MjA5Njk1NzQxNn0.mJN45x-3-E1ctXlivr-nqJUt0D4F5Xs1gIWAs9BLxBc";
const OG_IMAGE = "https://neeleshpmtoolkit.com/og-gutcheck.png";

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export async function onRequest(context) {
  const { params, request } = context;
  const id = String(params.id || "").trim();
  const origin = new URL(request.url).origin;
  const selfUrl = origin + "/c/" + encodeURIComponent(id);
  const deep = origin + "/decisionroom.html?case=" + encodeURIComponent(id);

  let title = "A PM decision on DecisionRoom";
  let desc =
    "See the situation, the options, and structured feedback from experienced PMs. Sign in to add your take.";

  try {
    const r = await fetch(SUPA + "/rest/v1/rpc/dr_get_case", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: ANON,
        authorization: "Bearer " + ANON,
      },
      body: JSON.stringify({ p_id: id }),
    });
    const j = await r.json();
    const c = j && j.ok ? j.case : null;
    if (c && c.title) {
      title = c.title;
      const n = Number(c.response_count) || 0;
      desc =
        (c.decision ? String(c.decision).slice(0, 150) : desc) +
        (n ? " \u00b7 " + n + " PM response" + (n === 1 ? "" : "s") + " so far." : "");
    }
  } catch (e) {
    // fall back to generic copy
  }

  const full = esc(title) + " \u00b7 DecisionRoom";
  const d = esc(desc);
  const html =
    "<!DOCTYPE html><html lang=\"en\"><head><meta charset=\"utf-8\"/>" +
    "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"/>" +
    "<title>" + full + "</title>" +
    "<link rel=\"canonical\" href=\"" + esc(selfUrl) + "\"/>" +
    "<meta name=\"description\" content=\"" + d + "\"/>" +
    "<meta property=\"og:type\" content=\"article\"/>" +
    "<meta property=\"og:url\" content=\"" + esc(selfUrl) + "\"/>" +
    "<meta property=\"og:title\" content=\"" + full + "\"/>" +
    "<meta property=\"og:description\" content=\"" + d + "\"/>" +
    "<meta property=\"og:image\" content=\"" + esc(OG_IMAGE) + "\"/>" +
    "<meta property=\"og:site_name\" content=\"DecisionRoom\"/>" +
    "<meta name=\"twitter:card\" content=\"summary_large_image\"/>" +
    "<meta name=\"twitter:title\" content=\"" + full + "\"/>" +
    "<meta name=\"twitter:description\" content=\"" + d + "\"/>" +
    "<meta name=\"twitter:image\" content=\"" + esc(OG_IMAGE) + "\"/>" +
    "<meta http-equiv=\"refresh\" content=\"0; url=" + esc(deep) + "\"/>" +
    "<script>location.replace(" + JSON.stringify(deep) + ");</script>" +
    "</head><body style=\"background:#0f0f0f;color:#f0ece4;font-family:system-ui,-apple-system,sans-serif;padding:2.5rem;line-height:1.6\">" +
    "<p>Opening this case on DecisionRoom\u2026</p>" +
    "<p><a style=\"color:#e8540a;font-weight:600\" href=\"" + esc(deep) + "\">Continue to the case \u2192</a></p>" +
    "</body></html>";

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=300",
    },
  });
}
