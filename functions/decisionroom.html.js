// ============================================================
// Cloudflare Pages Function — per-case OpenGraph previews
// PLACE THIS FILE AT:  functions/decisionroom.html.js   (in the repo root)
//
// When a link like  https://neeleshpmtoolkit.com/decisionroom.html?case=dr123
// is crawled by LinkedIn / Reddit / Slack / iMessage, this rewrites the page's
// og: / twitter: tags to that case's title + decision, so the shared card shows
// the real case instead of the generic site preview. Humans get the exact same
// HTML, and the app auto-opens the case (the app already handles ?case=).
//
// dr_get_case is a public (anon-executable) RPC that only returns non-draft cases,
// so nothing private is exposed. The anon key below is the same public read-only
// key already shipped in the client.
// ============================================================

const SUPA = "https://oxxzygbfgmlnvavjmhct.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHp5Z2JmZ21sbnZhdmptaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODE0MTYsImV4cCI6MjA5Njk1NzQxNn0.mJN45x-3-E1ctXlivr-nqJUt0D4F5Xs1gIWAs9BLxBc";

export async function onRequest(context) {
  const { request, next } = context;
  const res = await next(); // the static decisionroom.html
  const url = new URL(request.url);
  const caseId = url.searchParams.get("case");
  const ct = res.headers.get("content-type") || "";
  if (!caseId || !ct.includes("text/html")) return res;

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
      body: JSON.stringify({ p_id: caseId }),
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

  const full = title + " \u00b7 DecisionRoom";
  const setContent = (val) => ({
    element(el) {
      el.setAttribute("content", val);
    },
  });

  return new HTMLRewriter()
    .on('meta[property="og:title"]', setContent(full))
    .on('meta[name="twitter:title"]', setContent(full))
    .on('meta[property="og:description"]', setContent(desc))
    .on('meta[name="twitter:description"]', setContent(desc))
    .on('meta[property="og:url"]', setContent(url.href))
    .on("title", {
      element(el) {
        el.setInnerContent(full);
      },
    })
    .transform(res);
}
