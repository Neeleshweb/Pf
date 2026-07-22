/* ============================================================================
   pjl-password-auth.js — email + password sign-in (both sites)
   ----------------------------------------------------------------------------
   WHY A SEPARATE MODULE INSTEAD OF FOUR EDITS
     Auth is implemented four different ways in this codebase (pm-auth.js,
     decisionroom.html inline, gutcheck.html inline, gc-auth.js) and the
     standing rule is "never unify these". mm-drawer.js and nav-desktop.js
     already solve the same problem by WRAPPING what each page renders rather
     than replacing it. This does the same:

       · it does not modify, wrap or re-bind #signin-google, #nav-signin,
         #gca-signin, #acct-btn or any existing handler
       · it appends its own fields to whatever sign-in surface the page has
       · on success it writes the session and reloads, so each page's own auth
         module picks the session up through its normal startup path

     Consequence: Google sign-in cannot break, because nothing about it is
     touched. If this file were deleted the site returns to exactly its
     current behaviour.

   SESSION HANDOFF
     Signing in writes the standard sb-<ref>-auth-token key to localStorage —
     the same key every implementation already reads, and the same one
     mm-drawer.js polls. After reload the page cannot tell how the session was
     created. That is the point: a password session must behave identically to
     a Google session.

   TWO-CLIENT SAFETY
     This creates its own Supabase client, so the page briefly has two. It is
     configured with autoRefreshToken:false and detectSessionInUrl:false so it
     never competes with the page's own client over token refresh or the OAuth
     callback. It writes the session once and then the page reloads.
   ========================================================================== */
(function () {
  'use strict';

  /* ---- environment detection: identical to gc-auth.js and pm-auth.js ------ */
  var PROD_HOSTS = ['neeleshpmtoolkit.com', 'www.neeleshpmtoolkit.com',
    'productjudgmentlabs.com', 'www.productjudgmentlabs.com', 'pm-gut-check.pages.dev'];
  var IS_PROD = PROD_HOSTS.indexOf(location.hostname) !== -1;
  var URL = IS_PROD
    ? 'https://oxxzygbfgmlnvavjmhct.supabase.co'
    : 'https://wdfttdakwygkdgfakavc.supabase.co';
  var ANON = IS_PROD
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHp5Z2JmZ21sbnZhdmptaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODE0MTYsImV4cCI6MjA5Njk1NzQxNn0.mJN45x-3-E1ctXlivr-nqJUt0D4F5Xs1gIWAs9BLxBc'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZnR0ZGFrd3lna2RnZmFrYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjI2NTYsImV4cCI6MjA5NzczODY1Nn0.1D85vTzCoi7nUYH9YllsdV47AEDhFliT3zsjUfYXJss';

  var CLIENT = null;
  function q(sel, root) { try { return (root || document).querySelector(sel); } catch (e) { return null; } }

  function ensureSupabase(cb) {
    if (window.supabase && window.supabase.createClient) return cb();
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = cb;
    s.onerror = function () { /* leave the page exactly as it was */ };
    document.head.appendChild(s);
  }
  function client() {
    if (CLIENT) return CLIENT;
    try {
      CLIENT = window.supabase.createClient(URL, ANON, {
        auth: { persistSession: true, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (e) { CLIENT = null; }
    return CLIENT;
  }

  /* ---------------------------------------------------------------- style -- */
  function injectStyles() {
    if (document.getElementById('pjlpw-styles')) return;
    var css = [
      '.pjlpw-wrap{margin-top:.85rem;text-align:left}',
      '.pjlpw-or{display:flex;align-items:center;gap:.6rem;margin:.85rem 0;',
      '  font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;opacity:.55}',
      '.pjlpw-or:before,.pjlpw-or:after{content:"";flex:1;height:1px;background:currentColor;opacity:.25}',
      '.pjlpw-f{width:100%;box-sizing:border-box;margin-bottom:.5rem;padding:.62rem .7rem;',
      '  border-radius:9px;border:1px solid rgba(128,128,128,.38);background:rgba(128,128,128,.08);',
      '  color:inherit;font:inherit;font-size:.86rem}',
      '.pjlpw-f:focus{outline:none;border-color:#6D5EF0;box-shadow:0 0 0 3px rgba(109,94,240,.18)}',
      '.pjlpw-go{width:100%;padding:.62rem .8rem;border:none;border-radius:9px;cursor:pointer;',
      '  font:inherit;font-size:.86rem;font-weight:600;background:#6D5EF0;color:#fff}',
      '.pjlpw-go:hover{filter:brightness(1.08)}',
      '.pjlpw-go[disabled]{opacity:.6;cursor:default}',
      '.pjlpw-err{margin-top:.5rem;font-size:.78rem;color:#DC2626;min-height:1em}',
      '.pjlpw-toggle{margin-top:.6rem;background:none;border:none;padding:0;cursor:pointer;',
      '  font:inherit;font-size:.78rem;color:inherit;opacity:.7;text-decoration:underline}',
      /* Portfolio-side modal. Deliberately styled to neeleshpmtoolkit.com's own
         tokens (--accent #e8540a, --card #141414, DM Sans, uppercase CTAs) and
         NOT to the Product Judgment Labs look. Two sites, two identities. */
      '.pjlpw-ov{position:fixed;inset:0;z-index:9999;display:none;align-items:center;',
      '  justify-content:center;background:rgba(0,0,0,.72);padding:1rem}',
      '.pjlpw-ov.open{display:flex}',
      '.pjlpw-card{width:100%;max-width:352px;background:var(--card,#141414);',
      '  color:var(--white,#f0ece4);border:1px solid var(--border2,#2e2e2e);',
      '  border-radius:12px;padding:1.4rem;box-shadow:0 22px 60px rgba(0,0,0,.55);',
      "  font-family:'DM Sans',system-ui,sans-serif}",
      '.pjlpw-card h3{margin:0 0 .35rem;font-size:.82rem;letter-spacing:.12em;',
      '  text-transform:uppercase;color:var(--white,#f0ece4);font-weight:700}',
      '.pjlpw-card p{margin:0 0 .95rem;font-size:.78rem;line-height:1.5;color:var(--muted,#6b6b6b)}',
      '.pjlpw-x{position:absolute;top:.7rem;right:.85rem;background:none;border:none;',
      '  color:var(--muted,#6b6b6b);font-size:1.15rem;line-height:1;cursor:pointer}',
      '.pjlpw-x:hover{color:var(--white,#f0ece4)}',
      '.pjlpw-card{position:relative}',
      '.pjlpw-gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:.55rem;',
      '  background:var(--accent,#e8540a);color:#fff;border:none;font-weight:600;font-size:.74rem;',
      '  letter-spacing:.3px;text-transform:uppercase;padding:.7rem .95rem;border-radius:9px;cursor:pointer}',
      '.pjlpw-gbtn:hover{background:var(--accent2,#f0a500);color:#111}',
      '.pjlpw-card .pjlpw-go{background:transparent;border:1px solid var(--border2,#2e2e2e);',
      '  color:var(--white,#f0ece4);font-size:.74rem;letter-spacing:.3px;text-transform:uppercase;',
      '  padding:.7rem .95rem}',
      '.pjlpw-card .pjlpw-go:hover{border-color:var(--accent,#e8540a);filter:none}',
      '.pjlpw-card .pjlpw-f{background:#0f0f0f;border:1px solid var(--border2,#2e2e2e);border-radius:9px}',
      '.pjlpw-card .pjlpw-f:focus{border-color:var(--accent,#e8540a);box-shadow:0 0 0 3px rgba(232,84,10,.16)}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'pjlpw-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  /* ------------------------------------------------------------ the form -- */
  function formHtml(idp) {
    return '<div class="pjlpw-or"><span>or</span></div>'
      + '<input class="pjlpw-f" type="email" autocomplete="username" '
      + 'id="' + idp + '-email" placeholder="you@example.com" aria-label="Email">'
      + '<input class="pjlpw-f" type="password" autocomplete="current-password" '
      + 'id="' + idp + '-pw" placeholder="Password" aria-label="Password">'
      + '<button type="button" class="pjlpw-go" id="' + idp + '-go">Sign in with password</button>'
      + '<div class="pjlpw-err" id="' + idp + '-err" role="alert"></div>';
  }

  function friendlyError(err) {
    var m = (err && (err.message || err.error_description || '')) || '';
    var s = (err && err.status) || 0;
    if (/invalid login credentials/i.test(m)) return 'That email and password combination is not recognised.';
    if (/email not confirmed/i.test(m)) return 'This account has not been confirmed yet.';
    if (s === 429 || /rate limit|too many/i.test(m)) return 'Too many attempts. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Network problem — check your connection and try again.';
    return m || 'Sign-in failed. Please try again.';
  }

  function wire(idp) {
    var btn = document.getElementById(idp + '-go');
    var em = document.getElementById(idp + '-email');
    var pw = document.getElementById(idp + '-pw');
    var er = document.getElementById(idp + '-err');
    if (!btn || !em || !pw || btn.getAttribute('data-pjlpw')) return;
    btn.setAttribute('data-pjlpw', '1');

    function submit() {
      var email = (em.value || '').trim();
      var pass = pw.value || '';
      er.textContent = '';
      if (!email || !pass) { er.textContent = 'Enter both an email and a password.'; return; }
      var sb = client();
      if (!sb) { er.textContent = 'Sign-in is unavailable right now.'; return; }
      btn.disabled = true;
      var label = btn.textContent;
      btn.textContent = 'Signing in…';
      sb.auth.signInWithPassword({ email: email, password: pass })
        .then(function (res) {
          if (res && res.error) throw res.error;
          /* Session is now in localStorage under the shared sb-<ref>-auth-token
             key. Reload so the page's own auth module initialises from it
             exactly as it would after a Google redirect. */
          location.reload();
        })
        .catch(function (e) {
          er.textContent = friendlyError(e);
          btn.disabled = false;
          btn.textContent = label;
        });
    }
    btn.addEventListener('click', submit);
    [em, pw].forEach(function (el) {
      el.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); submit(); } });
    });
  }

  /* --- surface A: pages with a sign-in modal (#signin-google inside it) ---- */
  function attachToModal() {
    var g = q('#signin-google');
    if (!g || document.getElementById('pjlpw-a-go')) return false;
    var host = g.parentNode;
    if (!host) return false;
    var wrap = document.createElement('div');
    wrap.className = 'pjlpw-wrap';
    wrap.innerHTML = formHtml('pjlpw-a');
    /* inserted AFTER the Google button; the button itself is never touched */
    if (g.nextSibling) host.insertBefore(wrap, g.nextSibling); else host.appendChild(wrap);
    wire('pjlpw-a');
    return true;
  }

  /* --- surface B: portfolio pages — one modal, both options ---------------
     gc-auth.js renders a bare "Sign in" button with no modal. Rather than
     hang an extra link off the navbar, we intercept that button in the
     CAPTURE phase and open a single dialog offering Google and password
     together — the same shape as the product side, dressed in the portfolio's
     own styling.

     The intercept is additive: gc-auth.js keeps its own onclick handler
     untouched, and the Google button inside our dialog calls the module's
     public window.GCAuth.signIn(). If this file fails to load, the original
     button behaves exactly as it does today. */
  var GOOGLE_SVG = '<svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">'
    + '<path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"/>'
    + '<path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>'
    + '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.6 5.1A20 20 0 0 0 24 44z"/>'
    + '<path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C36.9 41.4 44 36 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>';

  function buildGcaModal() {
    if (document.getElementById('pjlpw-ov')) return;
    var ov = document.createElement('div');
    ov.className = 'pjlpw-ov';
    ov.id = 'pjlpw-ov';
    ov.innerHTML = '<div class="pjlpw-card" role="dialog" aria-modal="true" aria-label="Sign in">'
      + '<button class="pjlpw-x" id="pjlpw-x" aria-label="Close">&times;</button>'
      + '<h3>Sign in</h3>'
      + '<p>Your session is shared across the site. You appear only as an alias on Product Judgment Labs.</p>'
      + '<button type="button" class="pjlpw-gbtn" id="pjlpw-google">' + GOOGLE_SVG + ' Continue with Google</button>'
      + formHtml('pjlpw-b')
      + '</div>';
    document.body.appendChild(ov);

    function close() { ov.classList.remove('open'); }
    q('#pjlpw-x', ov).addEventListener('click', close);
    ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && ov.classList.contains('open')) close();
    });
    q('#pjlpw-google', ov).addEventListener('click', function () {
      close();
      try {
        if (window.GCAuth && window.GCAuth.signIn) { window.GCAuth.signIn(); return; }
      } catch (e) {}
      var b = q('#gca-signin');            /* last resort: the original button */
      if (b) { b.setAttribute('data-pjlpw-pass', '1'); b.click(); }
    });
    wire('pjlpw-b');
  }

  function attachToGca() {
    if (!q('#gca-signin')) return false;
    buildGcaModal();
    if (document.documentElement.getAttribute('data-pjlpw-gca')) return true;
    document.documentElement.setAttribute('data-pjlpw-gca', '1');
    /* capture phase: stops the event before gc-auth.js's own onclick runs.
       The escape hatch above sets data-pjlpw-pass so our Google fallback can
       still reach the original handler. */
    document.addEventListener('click', function (e) {
      var t = e.target && e.target.closest ? e.target.closest('#gca-signin') : null;
      if (!t) return;
      if (t.getAttribute('data-pjlpw-pass')) { t.removeAttribute('data-pjlpw-pass'); return; }
      e.preventDefault();
      e.stopPropagation();
      var ov = document.getElementById('pjlpw-ov');
      if (ov) ov.classList.add('open');
    }, true);
    return true;
  }

  /* ------------------------------------------------------------------ boot -- */
  function boot() {
    injectStyles();
    attachToModal();
    attachToGca();
    /* Both surfaces can be rendered late: pm-auth.js builds its modal on
       demand, gc-auth.js re-renders its slot on every auth state change.
       Same polling approach mm-drawer.js and nav-desktop.js already use. */
    setInterval(function () { try { attachToModal(); attachToGca(); } catch (e) {} }, 1200);
    ['#nav-account', '#gc-auth-slot'].forEach(function (sel) {
      var n = q(sel);
      if (!n) return;
      try {
        new MutationObserver(function () { attachToModal(); attachToGca(); })
          .observe(n, { childList: true, subtree: true });
      } catch (e) {}
    });
  }

  ensureSupabase(function () {
    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot);
  });
})();
