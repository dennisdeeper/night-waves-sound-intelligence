
(function(){
  'use strict';
  const LOGO='./night-waves-corporate-logo-warm.png';

  function mark(compact){
    const wrap=document.createElement('div');
    wrap.className='nw-corporate-mark';
    wrap.setAttribute('aria-label','Night Waves Sound Intelligence');
    const img=document.createElement('img');
    img.src=LOGO; img.alt='Night Waves';
    const copy=document.createElement('div');
    copy.innerHTML='<div class="nw-ci-name">NIGHT WAVES</div><div class="nw-ci-sub">SOUND INTELLIGENCE</div>';
    wrap.append(img,copy);
    if(compact) wrap.classList.add('nw-corporate-mark--compact');
    return wrap;
  }

  function apply(){
    // Stamp every app interface panel without touching its functional controls.
    document.querySelectorAll('.appview').forEach(view=>{
      if(view.querySelector(':scope > .nw-view-brand')) return;
      const holder=document.createElement('div');
      holder.className='nw-view-brand';
      holder.appendChild(mark(true));
      view.prepend(holder);
    });

    // Brand the protected Studio surface externally; do not mutate the iframe/audio app.
    const frameWrap=document.querySelector('.studio-frame-wrap');
    if(frameWrap && !frameWrap.querySelector('.nw-studio-brandbar')){
      const bar=document.createElement('div');
      bar.className='nw-studio-brandbar';
      bar.innerHTML='<img src="'+LOGO+'" alt=""><span>NIGHT WAVES · STUDIO</span>';
      frameWrap.appendChild(bar);
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',apply,{once:true});
  else apply();

  window.NightWavesBrandIdentity={version:'1.4.0',logo:LOGO,apply};
})();
