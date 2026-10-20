// Shared help bubble for both PLC point editors, outside scrolling dialogs.
(() => {
  const bubble=document.querySelector('#pointValidationHelp');
  let current=null,timer;
  function hide(){clearTimeout(timer);current=null;bubble.classList.remove('open');bubble.setAttribute('aria-hidden','true');}
  function later(){clearTimeout(timer);timer=setTimeout(hide,120);}
  function show(trigger){
    clearTimeout(timer);current=trigger;bubble.classList.add('open');bubble.setAttribute('aria-hidden','false');
    const anchor=trigger.getBoundingClientRect(),bounds=bubble.getBoundingClientRect();
    const width=bounds.width||380,height=bounds.height||300,right=anchor.right??anchor.left+18,bottom=anchor.bottom??anchor.top+18;
    bubble.style.left=Math.max(12,Math.min(right+10,window.innerWidth-width-12))+'px';
    bubble.style.top=Math.max(12,Math.min(bottom+8,(window.innerHeight||800)-height-12))+'px';
  }
  document.querySelectorAll('[data-point-help]').forEach(trigger=>{
    trigger.addEventListener('pointerenter',()=>show(trigger));trigger.addEventListener('pointerleave',later);
    trigger.addEventListener('focus',()=>show(trigger));trigger.addEventListener('blur',later);
    trigger.addEventListener('click',()=>show(trigger));
  });
  bubble.addEventListener('pointerenter',()=>clearTimeout(timer));bubble.addEventListener('pointerleave',later);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&current){hide();event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('scroll',event=>{if(current&&!bubble.contains?.(event.target))hide();},true);
  window.addEventListener('resize',hide);
})();
