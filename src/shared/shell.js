(() => {
  let toastTimer;
  window.SentinelShared={
    toast(message){const el=document.querySelector('#toast');if(!el)return;clearTimeout(toastTimer);el.textContent=message;el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),1800);},
    navigate(module,params={}){const query=new URLSearchParams(Object.entries(params).filter(([,value])=>value!=null&&value!==''&&value!=='all'));const url='../'+module+'/index.html'+(query.size?'?'+query.toString():'');window.location?.assign?.(url);return url;}
  };
  if(document.body.dataset.prototype!=='alerts')return;
  const user=document.querySelector('#userMenuButton'),menu=document.querySelector('#accountMenu');
  user?.addEventListener('click',event=>{event.stopPropagation?.();const open=!menu.classList.contains('open');menu.classList.toggle('open',open);menu.setAttribute('aria-hidden',String(!open));user.setAttribute('aria-expanded',String(open));});
  document.querySelector('#plcManagementEntry')?.addEventListener('click',()=>window.SentinelShared.navigate('plc',{view:'management'}));
  document.addEventListener('click',event=>{if(!event.target.closest?.('#accountMenu')&&!event.target.closest?.('#userMenuButton')){menu.classList.remove('open');menu.setAttribute('aria-hidden','true');user.setAttribute('aria-expanded','false');}});
})();
