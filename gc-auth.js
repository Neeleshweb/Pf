/* ============================================================
   PM Gut Check — shared cross-page auth widget
   Drop into index.html, portfolio.html, toolkit.html.
   Uses the SAME Supabase project as gutcheck.html, so the login
   session is shared across the whole site: sign in on any page and
   you're signed in everywhere; sign out anywhere signs out everywhere.

   PASTE the same Supabase URL + anon key you use in gutcheck.html:
   ============================================================ */
(function () {
  var GC_PROD_HOSTS = ['neeleshpmtoolkit.com','www.neeleshpmtoolkit.com','productjudgmentlabs.com','www.productjudgmentlabs.com','pm-gut-check.pages.dev'];
  var GC_IS_PROD = GC_PROD_HOSTS.indexOf(location.hostname) !== -1;
  var SUPA_URL  = GC_IS_PROD
    ? 'https://oxxzygbfgmlnvavjmhct.supabase.co/rest/v1/'
    : 'https://wdfttdakwygkdgfakavc.supabase.co/rest/v1/';
  var SUPA_ANON = GC_IS_PROD
    ? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHp5Z2JmZ21sbnZhdmptaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODE0MTYsImV4cCI6MjA5Njk1NzQxNn0.mJN45x-3-E1ctXlivr-nqJUt0D4F5Xs1gIWAs9BLxBc'
    : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZnR0ZGFrd3lna2RnZmFrYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjI2NTYsImV4cCI6MjA5NzczODY1Nn0.1D85vTzCoi7nUYH9YllsdV47AEDhFliT3zsjUfYXJss';

  function cleanURL(u){ u=(u||'').trim().replace(/\/+$/,''); u=u.replace(/\/rest\/v1$/,'').replace(/\/+$/,''); return u; }
  SUPA_URL = cleanURL(SUPA_URL);
  var LIVE = SUPA_URL.indexOf('supabase.co') !== -1 && SUPA_ANON.length > 20;

  var slot = document.getElementById('gc-auth-slot');
  if (!slot) return;
  if (!LIVE) { slot.style.display = 'none'; return; }

  var SB = null, user = null, prof = null;

  /* ── Additive public API for other page scripts (e.g. toolkit gating).
        Does not change the widget's behaviour; just exposes the shared session. ── */
  var authListeners = [], readyResolve = null;
  var readyPromise = new Promise(function (res) { readyResolve = res; });
  function notifyAuth(){ for (var i = 0; i < authListeners.length; i++) { try { authListeners[i](user); } catch (e) {} } }
  window.GCAuth = {
    ready: readyPromise,
    getUser: function(){ return user; },
    isSignedIn: function(){ return !!user; },
    signIn: function(){ signIn(); },
    signOut: function(){ signOut(); },
    onChange: function(cb){ if (typeof cb === 'function') { authListeners.push(cb); try { cb(user); } catch (e) {} } }
  };

  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function meta(){ return (user && user.user_metadata) ? user.user_metadata : {}; }
  function firstName(){ if(prof&&prof.firstName) return prof.firstName; var m=meta(); if(m.given_name) return m.given_name; var fn=m.full_name||m.name||''; if(fn) return fn.split(' ')[0]; if(user&&user.email) return user.email.split('@')[0]; return 'there'; }
  function fullName(){ if(prof&&(prof.firstName||prof.lastName)) return ((prof.firstName||'')+' '+(prof.lastName||'')).trim(); var m=meta(); return m.full_name||m.name||(user&&user.email)||'You'; }
  function photo(){ if(prof&&prof.avatar) return prof.avatar; var m=meta(); return m.avatar_url||m.picture||''; }
  function initials(){ var f=firstName()||'', l=(prof&&prof.lastName)||''; var s=((f.charAt(0)||'')+(l.charAt(0)||'')).toUpperCase(); return s||'U'; }
  function avatar(size){ var ph=photo(), dim='width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.42)+'px'; if(ph) return '<span class="gca-av" style="'+dim+'"><i>'+esc(initials())+'</i><img src="'+esc(ph)+'" alt="" onerror="this.remove()"></span>'; return '<span class="gca-av" style="'+dim+'"><i>'+esc(initials())+'</i></span>'; }

  function injectStyles(){
    if (document.getElementById('gca-styles')) return;
    var css = [
      '.gc-auth-slot{display:flex;align-items:center;}',
      '.gca-wrap{position:relative;}',
      '.gca-signin{background:var(--accent,#e8540a);color:#fff;border:none;font-weight:600;font-size:.74rem;letter-spacing:.3px;text-transform:uppercase;padding:.5rem .95rem;border-radius:9px;cursor:pointer;white-space:nowrap;}',
      '.gca-signin:hover{background:var(--accent2,#f0a500);color:#111;}',
      '.gca-btn{display:flex;align-items:center;gap:.3rem;background:none;border:none;cursor:pointer;padding:.1rem;}',
      '.gca-caret{width:14px;height:14px;fill:none;stroke:var(--muted,#6b6b6b);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round;}',
      '.gca-btn:hover .gca-caret{stroke:var(--white,#f0ece4);}',
      ".gca-av{position:relative;border-radius:50%;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--accent,#e8540a),var(--accent2,#f0a500));color:#140d07;font-weight:800;font-family:'DM Sans',sans-serif;flex-shrink:0;}",
      '.gca-av i{font-style:normal;line-height:1;}',
      '.gca-av img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;}',
      '.gca-menu{position:absolute;top:calc(100% + 10px);right:0;width:232px;background:var(--card,#141414);border:1px solid var(--border2,#2e2e2e);border-radius:12px;box-shadow:0 22px 60px rgba(0,0,0,.55);padding:.5rem;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .18s,transform .18s;z-index:600;}',
      '.gca-menu.open{opacity:1;visibility:visible;transform:translateY(0);}',
      '.gca-head{display:flex;align-items:center;gap:.55rem;padding:.5rem .5rem .65rem;border-bottom:1px solid var(--border,#242424);margin-bottom:.4rem;}',
      '.gca-name{color:var(--white,#f0ece4);font-weight:600;font-size:.84rem;}',
      '.gca-email{color:var(--muted,#6b6b6b);font-size:.7rem;word-break:break-all;}',
      '.gca-item{display:block;width:100%;text-align:left;background:none;border:none;color:#c9c4bb;font-size:.82rem;padding:.55rem .5rem;border-radius:8px;cursor:pointer;text-decoration:none;}',
      '.gca-item:hover{background:var(--card2,#191919);color:var(--white,#f0ece4);}',
      '@media (max-width:860px){.gca-signin{padding:.45rem .7rem;font-size:.7rem;}}'
    ].join('');
    var st = document.createElement('style'); st.id='gca-styles'; st.textContent=css; document.head.appendChild(st);
  }

  function render(){
    if (user) {
      slot.innerHTML = '<div class="gca-wrap"><button class="gca-btn" id="gca-btn" aria-label="Account menu">'+avatar(30)+'<svg class="gca-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>'
        + '<div class="gca-menu" id="gca-menu"><div class="gca-head">'+avatar(38)+'<div><div class="gca-name">'+esc(fullName())+'</div><div class="gca-email">'+esc(user.email||'')+'</div></div></div>'
        + '<a class="gca-item" href="https://neeleshpmtoolkit.com/gutcheck.html#profile">\uD83E\uDDED  Your Gut Check</a>'
        + '<button class="gca-item" id="gca-signout">\u21A9  Sign out</button></div></div>';
      var btn=document.getElementById('gca-btn'), menu=document.getElementById('gca-menu');
      if (btn) btn.onclick = function(e){ e.stopPropagation(); menu.classList.toggle('open'); };
      var so=document.getElementById('gca-signout'); if (so) so.onclick = signOut;
    } else {
      slot.innerHTML = '<button class="gca-signin" id="gca-signin">Sign in</button>';
      var si=document.getElementById('gca-signin'); if (si) si.onclick = signIn;
    }
    slot.style.display = 'flex';
    notifyAuth();
  }

  document.addEventListener('click', function(e){ var m=document.getElementById('gca-menu'); if (m && m.classList.contains('open') && !e.target.closest('#gc-auth-slot')) m.classList.remove('open'); });

  function signIn(){ if(!SB) return; try { SB.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.href.split('#')[0].split('?')[0] } }); } catch(e){} }
  function signOut(){ if(!SB) return; SB.auth.signOut().then(function(){ user=null; prof=null; render(); }).catch(function(){ user=null; prof=null; render(); }); }

  function loadProfile(){
    if(!SB||!user) return Promise.resolve();
    return SB.from('gc_profiles').select('data').eq('user_id', user.id).maybeSingle()
      .then(function(res){ if(res && !res.error && res.data && res.data.data) prof=res.data.data; })
      .catch(function(){});
  }

  function start(){
    try { injectStyles(); SB = window.supabase.createClient(SUPA_URL, SUPA_ANON); }
    catch(e){ slot.style.display='none'; return; }
    SB.auth.getSession().then(function(res){ user=(res&&res.data&&res.data.session)?res.data.session.user:null; return user?loadProfile():null; })
      .then(function(){ render(); if (readyResolve) { readyResolve(user); readyResolve = null; } })
      .catch(function(){ render(); if (readyResolve) { readyResolve(user); readyResolve = null; } });
    if (SB.auth.onAuthStateChange) SB.auth.onAuthStateChange(function(evt, sess){
      var was=user?user.id:null; user=sess?sess.user:null; var now=user?user.id:null;
      if (now===was){ render(); return; }
      if (user){ loadProfile().then(render); } else { prof=null; render(); }
    });
  }

  function ensureSupabase(cb){
    if (window.supabase && window.supabase.createClient) return cb();
    var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=cb; s.onerror=function(){ slot.style.display='none'; }; document.head.appendChild(s);
  }
  ensureSupabase(start);
})();
