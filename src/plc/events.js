(() => {
  const api=window.sentinelPrototype;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const events=window.SentinelSession.get('plc.events',[]),seeded=new Set(events.map(e=>e.pumpId+':'+e.source));
  let serial=Math.max(0,...events.map(e=>Number(e.id.match(/(\d+)$/)?.[1])||0));
  const stamp=v=>new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const localDate=v=>{const d=new Date(v);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const duration=e=>{const minutes=Math.max(1,Math.round(((e.handledAt||Date.now())-e.start)/60000));return minutes>=60?Math.floor(minutes/60)+'小时'+minutes%60+'分钟':minutes+'分钟';};
  const sourceOf=(pumpId,source)=>pumpId===api.pumpId()?api.findSource(source):null;
  const color=e=>e.colorSnapshot||api.severityColors[api.severityNames.indexOf(e.highest)]||'#8792a3';
  const levelLabel=(severity,custom)=>'<span class="event-tag" style="color:'+(custom||api.severityColors[api.severityNames.indexOf(severity)]||'#8792a3')+'">'+esc(severity||'无当前预警')+'</span>';
  const contextText=()=>api.context().text;
  const activeLevel=e=>{const found=sourceOf(e.pumpId,e.source);return found?.device.enabled!==false&&found?.device.status==='online'?api.matchedLevel(found.metric.value,api.effectiveThresholdRule(e.code)):null;};
  const dataState=e=>{const found=sourceOf(e.pumpId,e.source);if(!found||found.device.enabled===false||found.device.status!=='online')return'无实时数据';if(!api.effectiveThresholdRule(e.code))return'规则未启用';return activeLevel(e)?'异常中':'已恢复';};
  const unit=e=>e.unit&&e.unit!=='-'?' '+e.unit:'';
  function markDemoChanges(event){
    // Migrate only the known ten-node pressure example from earlier versions.
    const rows=event.timeline;if(event.code!=='inlet_pressure'||rows.length<10||rows[0].text!=='首次触发 · 提示 · 0.29 MPa')return;
    for(const [valueIndex,levelIndex] of [[1,2],[4,5],[8,9]]){
      const value=rows[valueIndex],level=rows[levelIndex];
      if(/^数值(上升|下降)/.test(value?.text)&&/^等级(升级|下降)/.test(level?.text)&&value.value===level.value){const id=event.id+':demo-change:'+valueIndex;value.changeId??=id;level.changeId??=id;}
    }
  }
  function makeEvent(found,start,value,highest,timeline,handled=false){
    const field=api.fields().find(f=>f.code===found.metric.standardCode);
    const rule=api.effectiveThresholdRule(found.metric.standardCode);
    const event={id:'PLC-E'+String(++serial).padStart(4,'0'),pumpId:api.pumpId(),source:found.device.id+':'+found.metric.id,code:found.metric.standardCode,field:field?.name||found.metric.name,device:found.device.name,unit:found.metric.unit,start,value,highest,timeline,handledAt:handled?start+25*60000:null,ruleSnapshot:rule?JSON.parse(JSON.stringify(rule)):null,path:contextText()};
    if(handled)event.result={method:'现场检修',description:'检查连接与测量信号，调整后数据恢复正常。（示例记录）',operator:'项目配置人员（演示）',photos:[],files:[]};
    event.lastSeverity=activeLevel(event)?.severity||null;
    event.lastState=dataState(event);
    event.lastValue=sourceOf(event.pumpId,event.source)?.metric.value;
    event.colorSnapshot=event.ruleSnapshot?.levels.find(level=>level.severity===highest)?.color||color(event);
    markDemoChanges(event);events.push(event);return event;
  }
  function ensureEvents(){
    api.devices().forEach(device=>device.points.forEach(metric=>{
      const source=device.id+':'+metric.id,key=api.pumpId()+':'+source;
      if(seeded.has(key))return;seeded.add(key);
      const found={device,metric},rule=api.effectiveThresholdRule(metric.standardCode);
      const history=(api.history[metric.standardCode]||[]).slice().sort((a,b)=>b.hoursAgo-a.hoursAgo);
      const current=device.enabled!==false&&device.status==='online'?api.matchedLevel(metric.value,rule):null;
      if(!history.length&&!current)return;
      const start=Date.now()-(history.at(-1)?.hoursAgo||.2)*3600000;
      const value=history.at(-1)?.value??metric.value;
      const first=rule?.levels?.length>1?rule.levels[0]:api.matchedLevel(value,rule)||rule?.levels?.[0];
      let highest=first?.severity||'一般';
      const timeline=[{time:start,text:'首次触发 · '+highest+' · '+value+(metric.unit==='-'?'':' '+metric.unit),value}];
      const historicLevel=api.matchedLevel(value,rule);
      if(historicLevel&&api.severityNames.indexOf(historicLevel.severity)>api.severityNames.indexOf(highest)){
        timeline[0].text='首次触发 · '+highest;
        timeline.push({time:start+60000,text:'等级升级 · '+highest+' → '+historicLevel.severity+' · '+value,value});highest=historicLevel.severity;
      }
      if(current&&api.severityNames.indexOf(current.severity)>api.severityNames.indexOf(highest)){
        timeline.push({time:start+5*60000,text:'等级升级 · '+highest+' → '+current.severity+' · '+metric.value,value:metric.value});highest=current.severity;
      }
      if(!current){timeline.push({time:start+12*60000,text:'数据恢复正常，事件仍待处理'});}
      if(history.length>1){
        const at=Date.now()-history[0].hoursAgo*3600000;
        makeEvent(found,at,history[0].value,api.matchedLevel(history[0].value,rule)?.severity||highest,[{time:at,text:'首次触发',value:history[0].value},{time:at+25*60000,text:'提交处理，事件结束'}],true);
      }
      if(metric.standardCode==='inlet_pressure'&&rule?.levels.length>1){
        // 完整的演示事件过程；真实节点由服务端事件记录提供。
        const span=Math.max(1,Date.now()-start),at=ratio=>start+span*ratio;
        timeline.splice(0,timeline.length,
          {time:start,text:'首次触发 · 提示 · 0.29 MPa',value:.29},
          {time:at(.1),text:'数值上升 · 0.29 → 0.31 MPa',value:.31},
          {time:at(.11),text:'等级升级 · 提示 → 一般',value:.31},
          {time:at(.2),text:'等级升级 · 一般 → 重要 · 0.33 MPa',value:.33},
          {time:at(.35),text:'数值下降 · 0.33 → 0.31 MPa',value:.31},
          {time:at(.36),text:'等级下降 · 重要 → 一般，事件未结束',value:.31},
          {time:at(.5),text:'数据恢复 · 0.25 MPa，事件仍待处理',value:.25},
          {time:at(.7),text:'再次异常 · 一般 · 0.31 MPa，归入原事件',value:.31},
          {time:at(.85),text:'数值下降 · 0.31 → 0.30 MPa',value:.30},
          {time:at(.86),text:'等级下降 · 一般 → 提示，事件未结束',value:.30}
        );highest='重要';
      }
      makeEvent(found,start,metric.standardCode==='inlet_pressure'&&rule?.levels.length>1?.33:value,highest,timeline);
    }));
  }
  function syncOpenEvents(){
    events.filter(e=>e.pumpId===api.pumpId()&&!e.handledAt).forEach(e=>{
      const state=dataState(e),level=activeLevel(e),severity=level?.severity||null;
      const changeId=e.id+':observation:'+Date.now()+':'+e.timeline.length;
      if(state==='已恢复'&&e.lastState==='异常中')e.timeline.push({time:Date.now(),text:'数据恢复正常，事件仍待处理'});
      if(state==='异常中'&&e.lastState==='已恢复')e.timeline.push({time:Date.now(),text:'再次异常，归入原事件 · '+severity});
      if(severity&&e.lastSeverity&&api.severityNames.indexOf(severity)>api.severityNames.indexOf(e.lastSeverity))e.timeline.push({time:Date.now(),changeId,text:'等级升级 · '+e.lastSeverity+' → '+severity});
      if(severity&&e.lastSeverity&&api.severityNames.indexOf(severity)<api.severityNames.indexOf(e.lastSeverity))e.timeline.push({time:Date.now(),changeId,text:'等级下降 · '+e.lastSeverity+' → '+severity+'，事件未结束'});
      if(severity&&api.severityNames.indexOf(severity)>api.severityNames.indexOf(e.highest)){e.highest=severity;e.colorSnapshot=level.color;}
      const value=sourceOf(e.pumpId,e.source)?.metric.value;
      if(typeof value==='number'&&typeof e.lastValue==='number'&&value!==e.lastValue)e.timeline.push({time:Date.now(),changeId,text:(value<e.lastValue?'数值下降':'数值上升')+' · '+e.lastValue+' → '+value+unit(e),value});
      if(level&&typeof value==='number'&&Math.abs(value)>Math.abs(Number(e.value)))e.value=value;
      e.lastState=state;e.lastSeverity=severity;e.lastValue=value;
    });
  }
  const scopeEvents=()=>{ensureEvents();syncOpenEvents();return events.filter(e=>e.pumpId===api.pumpId());};
  const trendEvents=found=>{
    ensureEvents();syncOpenEvents();
    return events.filter(e=>e.pumpId===api.pumpId()&&e.source===found.device.id+':'+found.metric.id).map(e=>({id:e.id,time:new Date(e.start),value:e.value,duration:duration(e),severity:e.highest,color:e.colorSnapshot}));
  };

  function persist(){
    events.forEach(e=>{const found=sourceOf(e.pumpId,e.source);if(found)e.currentValue=found.metric.value;});
    window.SentinelSession.set('plc.events',events);api.saveSession();
  }
  function updateBadge(){scopeEvents();persist();window.PLCRecordsView?.updateBadge();window.PLCAlertLinks?.updateBadge();}
  window.PLCRecords={events,trendEvents,updateBadge,persist,scopeEvents,
    showEvent:id=>window.PLCRecordsView?.showEvent(id),
    selectedEvent:()=>window.PLCRecordsView?.selectedEvent(),
    viewHelpers:{esc,stamp,localDate,duration,sourceOf,color,levelLabel,contextText,activeLevel,dataState,unit}};
  events.forEach(markDemoChanges);ensureEvents();api.refresh();persist();
})();
