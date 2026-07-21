/* ============================================================================
   nav-desktop.js — desktop navbar + profile dropdown (productjudgmentlabs.com)
   Enhances what each page already renders. Does NOT replace any auth module:
   the profile dropdown (#acct-menu) is built by pm-auth.js / each page's inline
   auth, and we only inject a Settings section into it and restyle it.
   Mobile (<=860px) is untouched — the drawer owns that.
   Config: window.NAVCFG = { impact: true|false }
============================================================================ */
(function(){
  if (window.matchMedia && !window.matchMedia('(min-width: 861px)').matches) {
    /* still run: viewport can be resized. CSS scopes the visuals to desktop. */
  }
  var CFG = window.NAVCFG || {};

  var P = {
    home:'<path d="M3 9.5 12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    chat:'<path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l2-5.2a8.4 8.4 0 0 1-.9-3.8 8.4 8.4 0 0 1 8.4-8.4h.5a8.4 8.4 0 0 1 8 8v.4z"/>',
    doc:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.6"/><rect x="14" y="3" width="7" height="7" rx="1.6"/><rect x="3" y="14" width="7" height="7" rx="1.6"/><rect x="14" y="14" width="7" height="7" rx="1.6"/>',
    person:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    chart:'<path d="M6 20V10M12 20V4M18 20v-6"/><path d="M3 21h18"/>',
    star:'<polygon points="12 2 15 9 22 9.3 16.5 14 18.5 21 12 17 5.5 21 7.5 14 2 9.3 9 9"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    pen:'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    book:'<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M8 7h7"/>',
    bulb:'<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.1.7h5.2l.1-.7c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3z"/>',
    labs:'<path d="M9 3h6M10 3v6.5L5.2 18a2 2 0 0 0 1.8 3h10a2 2 0 0 0 1.8-3L14 9.5V3"/>',
    gear:'<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.1-2.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 3.6V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 20.4 10H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>',
    trophy:'<path d="M6 4h12v3a6 6 0 0 1-12 0V4Z"/><path d="M6 5H4a2 2 0 0 0 0 4h2"/><path d="M18 5h2a2 2 0 0 1 0 4h-2"/><path d="M12 13v3"/><path d="M9 20h6"/>',
    shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m8.6 11.6 2.4 2.4 4.4-4.6"/>',
    dot:'<circle cx="12" cy="12" r="3.2"/>'
  };
  var C = {purple:'#6D5EF0', green:'#16A34A', amber:'#D97706', blue:'#2F82E4',
           red:'#DC2626', gold:'#CA8A04', teal:'#0d9488', slate:'#64748b', indigo:'#5B4BD4'};
  var MAP = [
    ['reviewer leaderboard',['person','red']], ['author leaderboard',['trophy','amber']],
    ['performance vault',['shield','indigo']], ['vault',['shield','indigo']],
    ['home',['home','purple']], ['open case',['chat','green']], ['librar',['book','amber']],
    ['how it works',['info','blue']], ['example',['grid','purple']], ['reviewer',['person','red']],
    ['gutcheck',['target','green']], ['gut check',['target','green']],
    ['performance',['chart','blue']], ['decisionroom',['chat','purple']],
    ['judgment lab',['labs','teal']], ['about',['info','slate']],
    ["today",['target','green']], ['call',['target','green']], ['archive',['doc','blue']],
    ['your gut',['star','gold']], ['suggest',['pen','amber']], ['email',['mail','blue']],
    ['subscrib',['mail','blue']]
  ];
  function svg(p,s){ return '<svg viewBox="0 0 24 24" width="'+(s||20)+'" height="'+(s||20)+'" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">'+p+'</svg>'; }
  function rgba(h,a){ h=h.replace('#',''); return 'rgba('+parseInt(h.substr(0,2),16)+','+parseInt(h.substr(2,2),16)+','+parseInt(h.substr(4,2),16)+','+a+')'; }
  function pick(t){ t=t.toLowerCase(); for(var i=0;i<MAP.length;i++){ if(t.indexOf(MAP[i][0])>=0) return MAP[i][1]; } return ['dot','slate']; }
  function clean(t){ return (t||'').replace(/[\u2197\u2192]/g,'').replace(/[\uD83C-\uDBFF][\uDC00-\uDFFF]/g,'').replace(/\s+/g,' ').trim(); }
  function q(s,r){ try{ return (r||document).querySelector(s); }catch(e){ return null; } }

  /* ---------- 1. nav items: coloured icon tiles + active state ---------- */
  function styleNav(){
    var ul=q('.nav-links'); if(!ul || ul.getAttribute('data-nvd')) return;
    ul.setAttribute('data-nvd','1');
    var here=(location.pathname.replace(/\/$/,'')||'/judgment-lab').replace('.html','');
    [].slice.call(ul.querySelectorAll('a')).forEach(function(a){
      var t=clean(a.textContent); if(!t) return;
      var m=pick(t), col=C[m[1]]||C.slate;
      var href=(a.getAttribute('href')||'').replace('.html','').replace(/\/$/,'');
      a.classList.add('nvd-item'); a.setAttribute('title', t);
      a.innerHTML='<span class="nvd-ic" style="color:'+col+';background:'+rgba(col,.13)+'">'+svg(P[m[0]])+'</span><span class="nvd-lb">'+t+'</span>';
      if(href && href!=='#' && href.indexOf('#')!==0 && (href===here || (here==='/judgment-lab'&&href==='/'))){
        a.classList.add('nvd-active'); a.style.setProperty('--nc',col);
      }
    });
  }

  /* ---------- 2. profile dropdown: Settings (themes) + optional impact ---------- */
  function rankCard(){
    var d=window.__vaultD||null;
    if(!d) return '';
    var ps=[]; if(d.reviewer&&d.reviewer.percentile!=null) ps.push(Number(d.reviewer.percentile));
    if(d.author&&d.author.percentile!=null) ps.push(Number(d.author.percentile));
    if(!ps.length) return '<div class="nvd-sec nvd-rank"><div class="nvd-sec-l">Your rank</div>'
      +'<div class="nvd-empty">Not ranked yet \u2014 answer a case or post one to get on the board.</div></div>';
    return '<div class="nvd-sec nvd-rank"><div class="nvd-sec-l">Your rank</div>'
      +'<div class="nvd-rank-row"><b>Top '+Math.min.apply(null,ps)+'%</b><small>of ranked users</small></div></div>';
  }
  function impactCard(){
    var d=window.__vaultD||null; if(!d) return '';
    var r=d.reviewer||{}, a=d.author||{};
    var pts=(Number(r.score)||0)+(Number(a.score)||0);
    var t=window.__vaultT||null, pt=[], run=0;
    if(t&&t.weeks) t.weeks.forEach(function(w){
      var v=(w.rev_score!=null?Number(w.rev_score):0)+(w.aut_score!=null?Number(w.aut_score):0);
      run+=v; pt.push(run);
    });
    var spark='';
    if(pt.length>1){
      var mn=Math.min.apply(null,pt), mx=Math.max.apply(null,pt); if(mn===mx){mn-=1;mx+=1;}
      var W=120,H=38,seg=[];
      pt.forEach(function(v,i){ var x=W*i/(pt.length-1), y=4+(1-(v-mn)/(mx-mn))*(H-8);
        seg.push((i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)); });
      spark='<svg class="nvd-spark" viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none"><path d="'+seg.join(' ')+'" fill="none" stroke="#6D5EF0" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    }
    if(!pts && !spark) return '<div class="nvd-sec nvd-impact"><div class="nvd-sec-l">Your impact</div>'
      +'<div class="nvd-empty">No points yet \u2014 your first scored contribution shows up here.</div></div>';
    return '<div class="nvd-sec nvd-impact"><div class="nvd-sec-l">Your impact</div>'
      +'<div class="nvd-impact-row"><div class="nvd-impact-n"><b>'+(pts%1===0?pts:pts.toFixed(1))+'</b><small>points earned</small></div>'+spark+'</div></div>';
  }

  function injectStats(menu){
    if(!CFG.impact) return;
    menu=menu||q('#acct-menu'); if(!menu) return;
    var html=rankCard()+impactCard(); if(!html) return;
    var ex=q('.nvd-stats',menu);
    if(ex){ ex.innerHTML=html; return; }              /* update in place */
    var w=document.createElement('div'); w.className='nvd-stats'; w.innerHTML=html;
    var hd=q('.acct-head',menu);
    if(hd&&hd.nextSibling) menu.insertBefore(w, hd.nextSibling); else menu.appendChild(w);
  }
  /* called by the page as soon as vault data resolves — no waiting on the poll */
  window.nvdRefreshStats=function(){ try{ injectStats(); }catch(e){} };
  function enhanceMenu(){
    var menu=q('#acct-menu'); if(!menu || menu.getAttribute('data-nvd')) return;
    menu.setAttribute('data-nvd','1');
    menu.classList.add('nvd-menu');

    if(CFG.impact) injectStats(menu);

    /* Settings: CLONE the theme options and proxy clicks to the originals.
       (Moving the real node breaks: the auth module re-renders #nav-account,
       which destroys whatever was inside it.) */
    var opts=[].slice.call(document.querySelectorAll('.theme-pop .theme-opt'));
    if(opts.length && !q('.nvd-set',menu)){
      var det=document.createElement('details'); det.className='nvd-set';
      var sm=document.createElement('summary');
      sm.innerHTML='<span class="nvd-set-ic">'+svg(P.gear,17)+'</span><span>Settings</span>'
        +'<svg class="nvd-set-c" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
      det.appendChild(sm);
      var wrap=document.createElement('div'); wrap.className='nvd-themes';
      var lab=document.createElement('div'); lab.className='nvd-sec-l'; lab.textContent='Appearance';
      wrap.appendChild(lab);
      opts.forEach(function(o){
        var b=document.createElement('button'); b.type='button'; b.className='nvd-theme-opt';
        b.innerHTML=o.innerHTML;
        b.addEventListener('click', function(ev){ ev.preventDefault(); ev.stopPropagation(); o.click(); markActive(); });
        wrap.appendChild(b);
      });
      det.appendChild(wrap);
      var out=q('#acct-signout',menu)||q('#gca-signout',menu);
      if(out&&out.parentNode===menu) menu.insertBefore(det,out); else menu.appendChild(det);
      document.documentElement.classList.add('nvd-theme-moved');
      markActive();
    }
  }

  function markActive(){
    try{
      var cur=document.documentElement.getAttribute('data-dr-theme')||'signal';
      [].slice.call(document.querySelectorAll('.nvd-theme-opt')).forEach(function(b,i){
        var src=document.querySelectorAll('.theme-pop .theme-opt')[i];
        var on=src && src.getAttribute('data-theme')===cur;
        b.classList.toggle('on', !!on);
      });
    }catch(e){}
  }
  function boot(){
    styleNav();
    enhanceMenu();
    var host=q('#nav-account');
    if(host){ try{ new MutationObserver(enhanceMenu).observe(host,{childList:true,subtree:true}); }catch(e){} }
    setInterval(function(){ enhanceMenu(); injectStats(); }, 1200);
  }
  if(document.readyState==='complete') boot(); else window.addEventListener('load', boot);
})();
