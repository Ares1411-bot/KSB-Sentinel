(() => {
  const api=window.sentinelPrototype,$=s=>document.querySelector(s),records=window.PLCRecords;
  function navigate(filters={}){
    records.persist();const c=api.context();
    return window.SentinelShared.navigate('alerts',{project:c.project.id,plant:c.plant.id,unit:c.unit.id,device:c.pump.id,...filters});
  }
  function updateBadge(){const count=records.scopeEvents().filter(e=>!e.handledAt).length;$('#plcUnhandledBadge').textContent=count;$('#plcUnhandledBadge').hidden=!count;$('#alertCenterBadge').textContent=count;$('#alertCenterBadge').hidden=!count;$('#openAlertCenterBell').setAttribute('aria-label','预警中心，当前设备 '+count+' 个 PLC 未处理事件');}
  ['openAlertCenterBell','openAlertCenterMenu','openAlertCenterButton'].forEach(id=>$('#'+id)?.addEventListener('click',()=>navigate()));
  window.PLCAlertLinks={navigate,updateBadge};updateBadge();
  window.addEventListener('pagehide',()=>records.persist());
  const query=new URLSearchParams(window.location?.search||'');if(query.get('view')==='management')$('#plcManagementEntry').click?.();
})();
