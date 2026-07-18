/* ============================================================================
   pm-auth.js — shared sign-in + profile widget (Product Judgment Lab)
   Faithful port of DecisionRoom's account widget: Google sign-in, avatar menu,
   and the Edit-profile modal (alias rename + PM context). Self-contained:
   - creates its own Supabase client (same project, so the session in
     localStorage is shared across every page — sign in once, signed in
     everywhere; edit your alias here and it changes everywhere).
   - injects its own sign-in modal + edit-profile modal + CSS.
   - renders into #nav-account (desktop) and #mm-account (mobile) if present.
   Backend-safe: read/writes only via the SAME RPCs DecisionRoom already uses
   (dr_get_or_create_profile, dr_save_profile, dr_rename_alias). No schema, no
   new backend. Load with: <script src="/pm-auth.js"></script>
   Optional hook: define window.pmOnAuth to react to sign-in/out (e.g. reload a
   signed-in view).
============================================================================ */
(function(){
  'use strict';
  var HOSTS=['neeleshpmtoolkit.com','www.neeleshpmtoolkit.com','productjudgmentlabs.com','www.productjudgmentlabs.com','pm-gut-check.pages.dev'];
  var PROD=HOSTS.indexOf(location.hostname)!==-1;
  var URL=PROD?'https://oxxzygbfgmlnvavjmhct.supabase.co':'https://wdfttdakwygkdgfakavc.supabase.co';
  var ANON=PROD?'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94eHp5Z2JmZ21sbnZhdmptaGN0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzODE0MTYsImV4cCI6MjA5Njk1NzQxNn0.mJN45x-3-E1ctXlivr-nqJUt0D4F5Xs1gIWAs9BLxBc':'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZnR0ZGFrd3lna2RnZmFrYXZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNjI2NTYsImV4cCI6MjA5NzczODY1Nn0.1D85vTzCoi7nUYH9YllsdV47AEDhFliT3zsjUfYXJss';
  var wasRedirect=/[#&?](access_token|code)=/.test((location.hash||'')+(location.search||''));
  var SB=null, currentUser=null, DRP=null;

  var ROLES=['APM / Associate PM','Product Manager','Senior PM','Lead / Staff PM','Group PM','Director of Product','VP Product','Founder / CPO','Other'];
  var PRODUCT=['B2B SaaS','B2C','Marketplace','Platform','Internal Tool','AI Product','Fintech','Healthtech','DevTools','E-commerce','Mobile Consumer App','Hardware / IoT','Data / Analytics Platform','Infrastructure / Cloud','EdTech','Gaming','Other'];

  function escHtml(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function toast(msg){ var t=document.getElementById('pm-toast'); if(!t){ t=document.createElement('div'); t.id='pm-toast'; t.className='pm-toast'; document.body.appendChild(t); } t.textContent=msg; t.classList.add('show'); clearTimeout(t._h); t._h=setTimeout(function(){ t.classList.remove('show'); }, 3800); }
  function drInitials(){ var a=(DRP&&DRP.alias)||''; var m=a.replace('PM-',''); var caps=(m.match(/[A-Z]/g)||[]).slice(0,2).join(''); return caps||'PM'; }
  function avatarMarkup(size){ var dim='width:'+size+'px;height:'+size+'px;font-size:'+Math.round(size*0.4)+'px'; return '<span class="pm-av" style="'+dim+'"><i>'+escHtml(drInitials())+'</i></span>'; }
  function credibilityLine(){ if(!DRP) return ''; var bits=[]; if(DRP.role) bits.push(DRP.role); if(DRP.track) bits.push(DRP.track==='aspiring'?'Aspiring PM':'Working PM'); return bits.join(' \u00B7 '); }
  function profOpts(list, cur){ return list.map(function(v){ return '<option'+(String(cur||'')===v?' selected':'')+'>'+escHtml(v)+'</option>'; }).join(''); }

  /* ---------- CSS (theme-adaptive: uses host vars with light fallbacks) ---------- */
  function injectCSS(){
    if(document.getElementById('pm-auth-css')) return;
    var st=document.createElement('style'); st.id='pm-auth-css';
    st.textContent=[
      '.pm-av{display:inline-flex;align-items:center;justify-content:center;border-radius:50%;background:linear-gradient(135deg,var(--accent,#4f43d8),#7c3aed);color:#fff;font-weight:800;flex:none;line-height:1}',
      '.pm-av i{font-style:normal}',
      '.nav-signin{background:var(--accent,#4f43d8);color:#fff;border:none;border-radius:10px;padding:.5rem 1rem;font-size:.85rem;font-weight:700;cursor:pointer;font-family:inherit}',
      '.nav-signin:hover{filter:brightness(1.06)}',
      '#nav-account{position:relative;display:flex;align-items:center}',
      '.acct-btn{display:flex;align-items:center;gap:.3rem;background:none;border:none;cursor:pointer;padding:.15rem;border-radius:40px}',
      '.acct-caret{width:15px;height:15px;fill:none;stroke:var(--muted,#8a91a0);stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
      '.acct-menu{position:absolute;top:calc(100% + 10px);right:0;width:250px;background:var(--card,#fff);border:1px solid var(--border,#e4e8f4);border-radius:12px;box-shadow:0 22px 60px rgba(20,25,45,.18);padding:.5rem;opacity:0;visibility:hidden;transform:translateY(-6px);transition:opacity .18s,transform .18s;z-index:420}',
      '.acct-menu.open{opacity:1;visibility:visible;transform:translateY(0)}',
      '.acct-head{display:flex;align-items:center;gap:.6rem;padding:.55rem .55rem .7rem;border-bottom:1px solid var(--border,#e4e8f4);margin-bottom:.4rem}',
      '.acct-name{color:var(--ink,#16233f);font-weight:700;font-size:.86rem}',
      '.acct-email{color:var(--muted,#8a91a0);font-size:.72rem;word-break:break-all}',
      '.acct-item{width:100%;text-align:left;background:none;border:none;color:var(--ink,#3a4358);font-size:.84rem;padding:.6rem .55rem;border-radius:8px;cursor:pointer;display:flex;align-items:center;font-family:inherit}',
      '.acct-item:hover{background:var(--tint,#f4f6fc);color:var(--ink,#16233f)}',
      '.pm-ov{position:fixed;inset:0;background:rgba(15,20,35,.55);display:none;align-items:flex-start;justify-content:center;padding:5vh 1rem;overflow-y:auto;z-index:600}',
      '.pm-ov.open{display:flex}',
      '.pm-modal{background:var(--card,#fff);border:1px solid var(--border,#e4e8f4);border-radius:18px;max-width:440px;width:100%;padding:1.6rem;margin:auto;box-shadow:0 24px 64px rgba(20,25,45,.3)}',
      '.pm-modal h3{margin:0 0 .5rem;font-size:1.1rem;color:var(--ink,#16233f);letter-spacing:.3px}',
      '.pm-modal p{margin:0 0 1rem;font-size:.86rem;line-height:1.5;color:var(--muted,#6b7280)}',
      '.prof-modal{max-width:480px}',
      '.prof-h{font-size:1.15rem;font-weight:800;color:var(--ink,#16233f);margin-bottom:.35rem}',
      '.prof-sub{font-size:.82rem;line-height:1.5;color:var(--muted,#6b7280);margin:0 0 1rem}',
      '.prof-l{display:block;font-size:.76rem;font-weight:700;color:var(--ink,#3a4358);margin:.7rem 0 .28rem;text-transform:uppercase;letter-spacing:.4px}',
      '.prof-opt{font-weight:600;color:var(--muted,#9aa0b0);text-transform:none;letter-spacing:0}',
      '.prof-modal input,.prof-modal select{width:100%;box-sizing:border-box;background:var(--surface,#fbfcfe);border:1px solid var(--border,#e4e8f4);border-radius:9px;padding:.55rem .7rem;font-size:.9rem;color:var(--ink,#16233f);font-family:inherit}',
      '.prof-modal input:focus,.prof-modal select:focus{outline:none;border-color:var(--accent,#4f43d8)}',
      '.pf-alias-row{display:flex;gap:.5rem}',
      '.pf-alias-row input{flex:1}',
      '.pf-alias-btn{background:var(--surface,#f4f6fc);border:1px solid var(--border,#e4e8f4);color:var(--ink,#16233f);border-radius:9px;padding:.4rem .9rem;cursor:pointer;font-size:.85rem;white-space:nowrap;font-family:inherit}',
      '.pf-alias-note{font-size:.72rem;color:var(--muted,#8a91a0);margin:.3rem 0 .2rem}',
      '.prof-act{display:flex;align-items:center;gap:.6rem;margin-top:1.2rem;flex-wrap:wrap}',
      '.prof-err{font-size:.78rem;color:#c0392b}',
      '.pm-btn-primary{background:var(--accent,#4f43d8);color:#fff;border:none;border-radius:10px;padding:.6rem 1.1rem;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit}',
      '.pm-btn-ghost{background:none;border:1px solid var(--border,#e4e8f4);color:var(--ink,#3a4358);border-radius:10px;padding:.6rem 1.1rem;font-size:.88rem;font-weight:700;cursor:pointer;font-family:inherit}',
      '.pm-gbtn{width:100%;display:flex;align-items:center;justify-content:center;gap:.55rem;background:var(--accent,#4f43d8);color:#fff;border:none;border-radius:10px;padding:.7rem;font-size:.92rem;font-weight:700;cursor:pointer;font-family:inherit}',
      '.pm-cancel{width:100%;margin-top:.6rem;background:none;border:1px solid var(--border,#e4e8f4);color:var(--muted,#6b7280);border-radius:10px;padding:.6rem;font-size:.86rem;font-weight:600;cursor:pointer;font-family:inherit}',
      '.pm-toast{position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(18px);background:#16233f;color:#fff;padding:.7rem 1.1rem;border-radius:10px;font-size:.86rem;font-weight:600;opacity:0;pointer-events:none;transition:opacity .25s,transform .25s;z-index:9999;box-shadow:0 12px 34px rgba(0,0,0,.28)}',
      '.pm-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
      '.mm-account .mma-id{display:flex;align-items:center;gap:.6rem;margin-bottom:.6rem}',
      '.mm-account .mma-name{font-weight:700;color:var(--ink,#16233f);font-size:.92rem}',
      '.mm-account .mma-sub{font-size:.76rem;color:var(--muted,#8a91a0)}',
      '.mm-account .mma-btn{width:100%;margin-bottom:.5rem}',
      '.mm-account .mma-hint{font-size:.74rem;color:var(--muted,#8a91a0);margin-top:.4rem}',
      '@media(max-width:860px){#nav-account{display:none !important}}'
    ].join('\n');
    document.head.appendChild(st);
  }

  /* ---------- sign-in modal ---------- */
  function injectSigninModal(){
    if(document.getElementById('signin-overlay')) return;
    var ov=document.createElement('div'); ov.className='pm-ov'; ov.id='signin-overlay';
    ov.innerHTML='<div class="pm-modal" role="dialog" aria-modal="true">'
      +'<h3>Sign in</h3>'
      +'<p id="signin-msg">One tap with Google \u2014 no passwords. You appear only as an alias (plus optional PM context); your name and company are never shown.</p>'
      +'<button class="pm-gbtn" id="signin-google"><svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 7.9-21l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.2-.1-2.3-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5A20 20 0 0 0 24 44z"/><path fill="#1976D2" d="M43.6 20.5H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39.9 35.9 44 30.5 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg> Continue with Google</button>'
      +'<button class="pm-cancel" id="signin-cancel">Cancel</button>'
      +'</div>';
    document.body.appendChild(ov);
    var c=document.getElementById('signin-cancel'); if(c) c.onclick=closeSignIn;
    ov.addEventListener('click', function(e){ if(e.target===ov) closeSignIn(); });
    var g=document.getElementById('signin-google');
    if(g) g.onclick=function(){
      if(!SB){ toast('Sign-in activates once connected.'); return; }
      g.disabled=true; g.textContent='Redirecting to Google\u2026';
      SB.auth.signInWithOAuth({ provider:'google', options:{ redirectTo: location.href.split('#')[0].split('?')[0] } })
        .then(function(res){ if(res&&res.error){ toast('Could not start Google sign-in \u2014 try again.'); g.disabled=false; g.textContent='Continue with Google'; } })
        .catch(function(){ toast('Could not start Google sign-in \u2014 try again.'); g.disabled=false; g.textContent='Continue with Google'; });
    };
  }
  function openSignIn(msg){ var m=document.getElementById('signin-msg'); if(m&&msg) m.textContent=msg; var ov=document.getElementById('signin-overlay'); if(ov) ov.classList.add('open'); }
  function closeSignIn(){ var ov=document.getElementById('signin-overlay'); if(ov) ov.classList.remove('open'); }

  /* ---------- nav + mobile account ---------- */
  function renderNavAccount(){
    var d=document.getElementById('nav-account'); if(!d) return;
    if(!SB){ d.style.display='none'; return; }
    d.style.display='flex';
    if(currentUser){
      d.innerHTML='<button class="acct-btn" id="acct-btn" aria-label="Account">'+avatarMarkup(30)+'<svg class="acct-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg></button>'
        +'<div class="acct-menu" id="acct-menu"><div class="acct-head">'+avatarMarkup(40)+'<div class="acct-meta"><div class="acct-name">'+escHtml((DRP&&DRP.alias)||'You')+'</div><div class="acct-email">'+escHtml(currentUser.email||'')+'</div></div></div>'
        +(credibilityLine()?'<div class="acct-item" style="cursor:default">'+escHtml(credibilityLine())+(DRP&&DRP.willing_to_answer?' \u00B7 reviewer':'')+'</div>':'')
        +'<button class="acct-item" id="acct-editprof">\u270E&nbsp; Edit profile</button>'
        +'<button class="acct-item" id="acct-signout">\u21A9&nbsp; Sign out</button></div>';
      var b=document.getElementById('acct-btn'), menu=document.getElementById('acct-menu');
      if(b&&menu) b.onclick=function(e){ e.stopPropagation(); menu.classList.toggle('open'); };
      var ep=document.getElementById('acct-editprof'); if(ep) ep.onclick=function(){ if(menu) menu.classList.remove('open'); openProfileForm(false); };
      var so=document.getElementById('acct-signout'); if(so) so.onclick=function(){ signOutUser(); };
    } else {
      d.innerHTML='<button class="nav-signin" id="nav-signin">Sign in</button>';
      var ns=document.getElementById('nav-signin'); if(ns) ns.onclick=function(){ openSignIn(); };
    }
    renderMobileAccount();
  }
  function renderMobileAccount(){
    var el=document.getElementById('mm-account'); if(!el) return;
    if(!SB){ el.style.display='none'; return; }
    el.style.display='block';
    function closeMM(){ var m=document.getElementById('mobile-menu'); if(m) m.classList.remove('open'); var bd=document.getElementById('mobile-backdrop'); if(bd) bd.classList.remove('open'); var ham=document.getElementById('hamburger'); if(ham) ham.classList.remove('open'); document.body.style.overflow=''; }
    if(currentUser){
      var sub=credibilityLine()||currentUser.email||'';
      el.innerHTML='<div class="mma-id">'+avatarMarkup(38)+'<div><div class="mma-name">'+escHtml((DRP&&DRP.alias)||'You')+'</div><div class="mma-sub">'+escHtml(sub)+'</div></div></div><button class="pm-btn-ghost mma-btn" id="mm-editprof">Edit profile</button><button class="pm-btn-ghost mma-btn" id="mm-signout">Sign out</button>';
      var mep=document.getElementById('mm-editprof'); if(mep) mep.onclick=function(){ closeMM(); openProfileForm(false); };
      var so=document.getElementById('mm-signout'); if(so) so.onclick=function(){ closeMM(); signOutUser(); };
    } else {
      el.innerHTML='<button class="nav-signin mma-btn" id="mm-signin" style="width:100%">Sign in</button><div class="mma-hint">You appear only as an alias \u2014 never your name.</div>';
      var si=document.getElementById('mm-signin'); if(si) si.onclick=function(){ closeMM(); openSignIn(); };
    }
  }
  document.addEventListener('click', function(e){ var menu=document.getElementById('acct-menu'); if(menu&&menu.classList.contains('open')&&!(e.target.closest&&e.target.closest('#nav-account'))) menu.classList.remove('open'); });

  /* ---------- profile ---------- */
  function loadProfile(){
    if(!SB||!currentUser){ DRP=null; return Promise.resolve(); }
    return SB.rpc('dr_get_or_create_profile').then(function(res){ if(res&&res.data&&res.data.ok){ DRP=res.data; } }).catch(function(e){ console.warn('[pm-auth] profile failed', e); });
  }
  function openProfileForm(isOnboarding){
    if(!currentUser){ openSignIn(); return; }
    var d=DRP||{};
    var ex=document.getElementById('profile-ov'); if(ex&&ex.parentNode) ex.parentNode.removeChild(ex);
    var ov=document.createElement('div'); ov.id='profile-ov'; ov.className='pm-ov';
    var ind=(d.industries&&d.industries.length)?d.industries[0]:'';
    ov.innerHTML='<div class="pm-modal prof-modal" role="dialog" aria-modal="true">'
      +'<div class="prof-h">'+(isOnboarding?'Complete your PM profile':'Edit your profile')+'</div>'
      +'<p class="prof-sub">Self-attested \u2014 this shows as context on your cases and responses (e.g. \u201CSenior PM \u00b7 B2B SaaS \u00b7 7y\u201D). Your real name and company are never shown.</p>'
      +'<label class="prof-l">Display name (alias)</label><div class="pf-alias-row"><input id="pf-alias" type="text" maxlength="24" value="'+escHtml(d.alias||'')+'" placeholder="e.g. PM-SageForge"/><button type="button" class="pf-alias-btn" id="pf-alias-btn">Rename</button></div><div class="pf-alias-note" id="pf-alias-note">Shown to others instead of your name \u00b7 3\u201324 chars, must be unique.</div>'
      +'<label class="prof-l">Your role</label><select id="pf-role"><option value="">\u2014 select \u2014</option>'+profOpts(ROLES, d.role)+'</select>'
      +'<label class="prof-l">Working as a PM now?</label><select id="pf-track"><option value="working"'+(d.track==='working'?' selected':'')+'>Yes, currently a PM</option><option value="aspiring"'+(d.track==='aspiring'?' selected':'')+'>Aspiring / transitioning</option></select>'
      +'<label class="prof-l">Primary product type</label><select id="pf-prod"><option value="">\u2014 select \u2014</option>'+profOpts(PRODUCT, d.product_type)+'</select>'
      +'<label class="prof-l">Years of PM experience</label><input id="pf-years" type="number" min="0" max="50" inputmode="numeric" value="'+escHtml(d.years_experience||'')+'" placeholder="e.g. 7"/>'
      +'<label class="prof-l">Industry <span class="prof-opt">optional</span></label><input id="pf-ind" type="text" maxlength="40" value="'+escHtml(ind)+'" placeholder="e.g. Fintech, Healthcare"/>'
      +'<label class="prof-l">LinkedIn URL <span class="prof-opt">optional</span></label><input id="pf-li" type="url" maxlength="200" value="'+escHtml(d.linkedin_url||'')+'" placeholder="https://linkedin.com/in/\u2026"/>'
      +'<div class="prof-act"><button type="button" class="pm-btn-primary" id="pf-save">Save profile</button><button type="button" class="pm-btn-ghost" id="pf-later">'+(isOnboarding?'Maybe later':'Cancel')+'</button><span class="prof-err" id="pf-err"></span></div>'
      +'</div>';
    document.body.appendChild(ov);
    requestAnimationFrame(function(){ ov.classList.add('open'); });
    function close(){ ov.classList.remove('open'); setTimeout(function(){ if(ov.parentNode) ov.parentNode.removeChild(ov); }, 200); }
    ov.addEventListener('click', function(e){ if(e.target===ov){ close(); } });
    document.getElementById('pf-later').onclick=function(){ close(); };
    (function(){ var abtn=document.getElementById('pf-alias-btn'); if(!abtn) return; abtn.onclick=function(){ var inp=document.getElementById('pf-alias'), note=document.getElementById('pf-alias-note'); var v=(inp&&inp.value||'').trim(); if(!SB) return; abtn.disabled=true; SB.rpc('dr_rename_alias',{p_alias:v}).then(function(res){ abtn.disabled=false; var o=(res&&res.data)||{}; if(o.ok){ if(DRP) DRP.alias=o.alias; if(note){ note.textContent='Saved'+(o.renames_left!=null?(' \u00b7 '+o.renames_left+' rename(s) left'):''); note.style.color='#0e9f6e'; } renderNavAccount(); } else { if(note){ note.textContent=({taken:'That name is taken \u2014 try another.',limit:'Rename limit reached (max '+(o.cap||3)+').',length:'Use 3\u201324 characters.',chars:'Letters, numbers, spaces, - and _ only.',auth:'Please sign in.'})[o.error]||'Could not rename.'; note.style.color='#c0392b'; } } }, function(){ abtn.disabled=false; if(note){ note.textContent='Could not rename. Try again.'; note.style.color='#c0392b'; } }); }; })();
    document.getElementById('pf-save').onclick=function(){ saveProfileForm(close); };
  }
  function saveProfileForm(done){
    var err=document.getElementById('pf-err');
    var role=((document.getElementById('pf-role')||{}).value||'');
    var track=((document.getElementById('pf-track')||{}).value||'working');
    var prod=((document.getElementById('pf-prod')||{}).value||'');
    var years=((document.getElementById('pf-years')||{}).value||'').trim();
    var ind=((document.getElementById('pf-ind')||{}).value||'').trim();
    var li=((document.getElementById('pf-li')||{}).value||'').trim();
    if(!role||!prod||!years){ if(err) err.textContent='Add your role, product type, and years to finish.'; return; }
    var btn=document.getElementById('pf-save'); if(btn){ btn.disabled=true; btn.textContent='Saving\u2026'; }
    SB.rpc('dr_save_profile',{ p_role:role, p_track:track, p_product_type:prod, p_years:years, p_industries: ind?[ind]:null, p_linkedin: li||null }).then(function(res){
      var r=(res&&res.data)||{};
      if(r.ok){
        if(DRP){ DRP.role=role; DRP.track=track; DRP.product_type=prod; DRP.years_experience=years; if(ind) DRP.industries=[ind]; if(li) DRP.linkedin_url=li; }
        renderNavAccount();
        toast('Profile saved \u2014 that context now travels with your alias everywhere.');
        done&&done();
      } else { if(err) err.textContent='Couldn\u2019t save right now \u2014 try again.'; if(btn){ btn.disabled=false; btn.textContent='Save profile'; } }
    }).catch(function(){ if(err) err.textContent='Something went wrong \u2014 try again.'; if(btn){ btn.disabled=false; btn.textContent='Save profile'; } });
  }
  window.drOpenProfile=function(o){ openProfileForm(o); };

  /* ---------- sign-out ---------- */
  function signOutUser(){ if(!SB){ return; } SB.auth.signOut().then(function(){ currentUser=null; DRP=null; try{ location.reload(); }catch(e){ renderNavAccount(); } }); }

  /* ---------- boot ---------- */
  function updateAuthUI(){ renderNavAccount(); if(typeof window.pmOnAuth==='function'){ try{ window.pmOnAuth(!!currentUser); }catch(e){} } }
  function ensureSupabase(cb){
    if(window.supabase&&window.supabase.createClient) return cb();
    var s=document.createElement('script'); s.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload=cb; s.onerror=function(){ cb(); }; document.head.appendChild(s);
  }
  function boot(){
    injectCSS(); injectSigninModal();
    ensureSupabase(function(){
      try{ if((URL.indexOf('supabase.co')!==-1) && window.supabase && window.supabase.createClient){ SB=window.supabase.createClient(URL, ANON); } }catch(e){ SB=null; }
      updateAuthUI();
      if(!SB) return;
      SB.auth.getSession().then(function(res){ var sess=res&&res.data&&res.data.session; currentUser=sess?sess.user:null; return currentUser?loadProfile():Promise.resolve(); }).then(function(){
        updateAuthUI();
        if(wasRedirect&&currentUser){ wasRedirect=false; toast('Signed in'+((DRP&&DRP.alias)?(' as '+DRP.alias):'')+'.'); }
      }).catch(function(){ updateAuthUI(); });
      if(SB.auth.onAuthStateChange) SB.auth.onAuthStateChange(function(evt, sess){
        var was=currentUser?currentUser.id:null; currentUser=sess?sess.user:null; var now=currentUser?currentUser.id:null;
        if(now===was){ updateAuthUI(); return; }
        if(currentUser){ loadProfile().then(function(){ updateAuthUI(); }); } else { DRP=null; updateAuthUI(); }
      });
    });
  }
  if(document.readyState!=='loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
})();
