// The alert page only knows the shared hierarchy and exported event snapshots.
(() => {
  const hierarchy=window.SentinelHierarchy,store=window.SentinelSession;
  const query=new URLSearchParams(window.location?.search||''),filters=Object.fromEntries(query);
  const saved=store.get('context',{});let selectedPump=filters.device||saved.pumpId||hierarchy[0].plants[0].units[0].pumps[0].id;
  function context(){for(const project of hierarchy)for(const plant of project.plants)for(const unit of plant.units)for(const pump of unit.pumps)if(pump.id===selectedPump)return{project,plant,unit,pump,text:[project.name,plant.name,unit.name,pump.name].join(' / ')};selectedPump=hierarchy[0].plants[0].units[0].pumps[0].id;return context();}
  window.SentinelAlertRuntime={
    filters,hierarchy:()=>hierarchy,context,pumpId:()=>context().pump.id,toast:window.SentinelShared.toast,
    plcEvents:()=>store.get('plc.events',[]),
    findSource(source){const event=store.get('plc.events',[]).find(e=>e.source===source&&e.pumpId===context().pump.id);if(!event)return null;return{device:{enabled:true,status:event.lastState==='无实时数据'?'offline':'online'},metric:{value:event.currentValue??event.lastValue??event.value}};},
    effectiveThresholdRule(code){return store.get('plc.events',[]).find(e=>e.code===code&&e.pumpId===context().pump.id)?.ruleSnapshot||null;},
    matchedLevel(value,rule){return(rule?.levels||[]).filter(l=>l.abnormalValue!=null?String(value)===String(l.abnormalValue):Number.isFinite(Number(value))&&((l.min!=null&&value<l.min)||(l.max!=null&&value>l.max))).sort((a,b)=>['提示','一般','重要','严重'].indexOf(b.severity)-['提示','一般','重要','严重'].indexOf(a.severity))[0]||null;},
    savePLCEvent(event){const all=store.get('plc.events',[]),index=all.findIndex(e=>e.id===event.id);if(index>=0)all[index]=event;else all.push(event);store.set('plc.events',all);},
    navigatePLC:()=>window.SentinelShared.navigate('plc')
  };
})();
