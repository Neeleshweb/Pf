/* ============================================================================
   mm-drawer.js — mobile navigation drawer (shared, both sites)
   Restyles the existing drawer to the approved mockup WITHOUT touching any
   page's auth: it proxies clicks to whatever sign-in controls the page already
   renders ("wrap", not "unify"). Desktop is never modified.
   Config comes from window.MMCFG set inline on each page.
============================================================================ */
(function(){
  var C = window.MMCFG || {};
  var IC = {
    home:'<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    gutcheck:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    decisionroom:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><line x1="7.5" y1="10" x2="16.5" y2="10"/><line x1="7.5" y1="14" x2="13" y2="14"/>',
    performance:'<path d="M6 20V10M12 20V4M18 20v-6"/><path d="M3 21h18"/>',
    about:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    labs:'<path d="M9 3h6M10 3v6.5L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 9.5V3"/>',
    doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    star:'<polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2z"/>',
    book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
    bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.1.7h5.2l.1-.7c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3z"/>',
    cap:'<path d="M3 9l9-4 9 4-9 4z"/><path d="M7 11v4c0 1.5 2.5 3 5 3s5-1.5 5-3v-4"/>',
    briefcase:'<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/>',
    pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20.4 10H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    dot:'<circle cx="12" cy="12" r="3.2"/>',
    signout:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    crown:'<path d="M4 18h16"/><path d="m3 7 4.5 4L12 5l4.5 6L21 7l-1.8 9H4.8z"/>',
    diamond:'<path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="m12 3-3 6 3 12 3-12-3-6"/>'
  };
  /* saturated mid-tone colours: legible on both light and dark themes */
  var COL = {purple:'#6D5EF0', green:'#16A34A', blue:'#2F82E4', orange:'#E2683C',
             red:'#DC2626', gold:'#CA8A04', teal:'#0d9488', indigo:'#5B4BD4'};
  var KEY = [['home',['home','gear']],['today',['gutcheck','green']],['call',['gutcheck','green']],
    ['archive',['doc','blue']],['gut check',['star','gold']],['suggest',['pen','orange']],
    ['email',['mail','blue']],['subscrib',['mail','blue']],['open case',['decisionroom','purple']],
    ['librar',['book','blue']],['how it works',['bulb','green']],['example',['grid','orange']],
    ['reviewer',['about','red']],['philosoph',['bulb','gold']],['educat',['cap','teal']],
    ['experien',['briefcase','blue']],['case stud',['grid','orange']],['featured',['star','gold']],
    ['skill',['star','gold']],['writing',['pen','purple']],['contact',['mail','blue']],
    ['template',['doc','blue']],['tool',['wrench','teal']],['teardown',['doc','orange']],
    ['framework',['grid','purple']],['coach',['about','red']],['book',['book','blue']],
    ['about',['about','red']],['series',['doc','blue']],['resource',['grid','purple']]];

  function svg(p,sz){ return '<svg viewBox="0 0 24 24" width="'+(sz||18)+'" height="'+(sz||18)+'" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
  function tile(icon,col){ var c=COL[col]||COL.purple;
    return '<span class="mmd-ic" style="color:'+c+';background:'+hexa(c,.14)+'">'+svg(IC[icon]||IC.dot)+'</span>'; }
  function hexa(h,a){ h=h.replace('#',''); return 'rgba('+parseInt(h.substr(0,2),16)+','+parseInt(h.substr(2,2),16)+','+parseInt(h.substr(4,2),16)+','+a+')'; }
  function chev(){ return '<svg class="mmd-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>'; }
  function match(t){ t=t.toLowerCase(); for(var i=0;i<KEY.length;i++){ if(t.indexOf(KEY[i][0])>=0) return KEY[i][1]; } return ['dot','purple']; }
  function clean(t){ return (t||'').replace(/[\u2197\u2192\u2190]/g,'').replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g,'').replace(/\s+/g,' ').trim(); }
  function closeMenu(){ try{
      ['mobile-menu','mobile-backdrop','hamburger'].forEach(function(id){ var e=document.getElementById(id); if(e) e.classList.remove('open'); });
      document.body.style.overflow='';
    }catch(e){} }

  /* --- proxy helpers: click whatever control the page already renders --- */
  function q(sel){ try{ return document.querySelector(sel); }catch(e){ return null; } }
  function signedIn(){ return !!(q('#acct-btn') || q('.acct-btn') || q('#gc-acct-btn') || q('.gc-avatar')); }
  function proxy(openSel, itemSel){
    var o=q(openSel); if(o) o.click();
    setTimeout(function(){ var t=q(itemSel); if(t) t.click(); }, 30);
  }
  function doSignIn(){
    var b=q('#nav-signin')||q('.nav-signin')||q('#gc-signin')||q('[data-gc-signin]');
    if(b){ b.click(); return true; }
    try{ if(window.GCAuth&&window.GCAuth.signIn){ window.GCAuth.signIn(); return true; } }catch(e){}
    return false;
  }

  function build(){
    var body=document.getElementById('mm-body'); if(!body||body.getAttribute('data-mmd')) return;
    body.setAttribute('data-mmd','1');

    /* ---------- 1. account card ---------- */
    var acc=document.createElement('div'); acc.className='mmd-acct';
    if(signedIn()){
      var alias=''; var an=q('.acct-name')||q('#acct-menu .acct-name'); if(an) alias=an.textContent.trim();
      acc.innerHTML='<div class="mmd-acct-top"><span class="mmd-av">'+svg(IC.about,22)+'</span>'
        +'<div class="mmd-acct-tx"><b>'+(alias||'Your account')+'</b><small>Signed in</small></div></div>'
        +(C.badge?'<div class="mmd-badge" id="mmd-badge" style="display:none"><span class="mmd-badge-ic">'+svg(IC.crown,18)+'</span><div><b id="mmd-badge-t"></b><small>Keep going \u2014 you\u2019re doing great.</small></div></div>':'')
        +'<div class="mmd-acct-acts"><button type="button" class="mmd-abtn" data-mmd-edit="1">'+svg(IC.pen,15)+' Edit profile</button>'
        +'<button type="button" class="mmd-abtn ghost" data-mmd-out="1">'+svg(IC.signout,15)+' Sign out</button></div>';
    } else {
      acc.innerHTML='<div class="mmd-si-top"><span class="mmd-si-ic">'+svg('<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><circle cx="12" cy="10" r="2.2"/><path d="M8.4 16.2a4.2 4.2 0 0 1 7.2 0"/>',30)+'</span>'
        +'<div class="mmd-si-tx"><b>Sign in</b><small>'+(C.signinSub||'Post anonymously \u2014 alias + PM context only.')+'</small></div></div>'
        +'<button type="button" class="mmd-si-btn" data-mmd-in="1">Sign in <span>\u2192</span></button>';
    }
    body.insertBefore(acc, body.firstChild);

    /* ---------- 2. restyle the page's own section links ---------- */
    var links=[].slice.call(body.querySelectorAll('.mm-link'));
    links.forEach(function(el){
      var t=clean(el.textContent);
      var lc=t.toLowerCase(), drop=false;
      (C.remove||[]).forEach(function(r){ if(lc.indexOf(r)>=0) drop=true; });
      if(drop){ el.parentNode.removeChild(el); return; }
      if(C.home && lc==='home'){ el.onclick=function(){ closeMenu(); location.href=C.home; }; }
      var m=match(lc);
      el.classList.add('mmd-row');
      el.innerHTML=tile(m[0],m[1])+'<span class="mmd-lbl">'+t+'</span>'+chev();
    });

    /* ---------- 3. extra in-site rows ---------- */
    (C.rows||[]).forEach(function(r){
      var d=document.createElement('div'); d.className='mm-link mmd-row';
      d.innerHTML=tile(r[2],r[3])+'<span class="mmd-lbl">'+r[0]+'</span>'+chev();
      d.onclick=function(){ closeMenu(); location.href=r[1]; };
      body.appendChild(d);
    });

    /* ---------- 4. Settings (themes live here) ---------- */
    var themeBox=document.querySelector('.mm-theme');
    if(themeBox && C.settings){
      var det=document.createElement('details'); det.className='mmd-set';
      var sum=document.createElement('summary');
      sum.innerHTML=tile('gear','indigo')+'<span class="mmd-lbl">Settings</span>'
        +'<svg class="mmd-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      det.appendChild(sum);
      themeBox.parentNode.insertBefore(det, themeBox);
      det.appendChild(themeBox);      /* moved, not cloned: theme buttons keep their handlers */
      body.appendChild(det);
    }

    /* ---------- 5. external-link cards ---------- */
    (C.ext||[]).forEach(function(x){
      var a=document.createElement('div'); a.className='mmd-ext'+(x.hero?' hero':'');
      a.innerHTML='<span class="mmd-ext-ic'+(x.hero?' hero':'')+'">'+svg(IC[x.icon]||IC.labs,20)+'</span>'
        +'<div class="mmd-ext-tx"><b>'+x.title+'</b><small>'+x.desc+'</small></div>'
        +'<span class="mmd-ext-go"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14 21 3"/><path d="M15 3h6v6"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></svg></span>';
      if(x.leave){ a.setAttribute('data-leave','1'); a.onclick=function(){ closeMenu(); }; }
      else { a.onclick=function(){ closeMenu(); location.href=x.href; }; }
      body.appendChild(a);
    });

    /* ---------- 6. wire account actions (proxy to existing auth) ---------- */
    body.addEventListener('click', function(e){
      var t=e.target.closest?e.target.closest('[data-mmd-in],[data-mmd-edit],[data-mmd-out]'):null;
      if(!t) return;
      e.preventDefault();
      if(t.hasAttribute('data-mmd-in')){ closeMenu(); if(!doSignIn()) location.href=C.signinFallback||'#'; return; }
      if(t.hasAttribute('data-mmd-edit')){ closeMenu(); proxy('#acct-btn','#acct-editprof'); return; }
      if(t.hasAttribute('data-mmd-out')){ closeMenu(); proxy('#acct-btn','#acct-signout'); return; }
    });
  }

  /* Performance Center only: fill the Top X% badge from data already loaded */
  window.mmdBadge=function(pct){
    try{ var b=document.getElementById('mmd-badge'), t=document.getElementById('mmd-badge-t');
      if(b&&t&&pct!=null){ t.textContent="You\u2019re in the Top "+pct+"%"; b.style.display='flex'; } }catch(e){}
  };

  if(document.readyState==='complete') build(); else window.addEventListener('load', build);
})();
