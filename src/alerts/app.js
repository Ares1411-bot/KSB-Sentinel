(() => {
  const api=window.SentinelAlertRuntime,sourceFields=window.SentinelSourceFields,$=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=t=>new Date(t).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const local=t=>{const d=new Date(t);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const numeric=(value,unit,threshold)=>({value,unit,threshold});
  const levels=['提示','一般','重要','严重'],colors=['#2784d5','#bc9300','#df792d','#d95157'];
  const stateNames={pending:'待处理',progress:'处理中',closed:'已结束',notice:'无需处理'};
  const dataNames={abnormal:'异常中',recovered:'已恢复',unknown:'暂无实时数据',offline:'离线中',online:'在线',reminder:'一次性提醒'};
  const typeNames={threshold:'阈值异常',fluctuation:'波动异常',diagnosis:'潜在故障',efficiency:'能效偏离',reminder:'运行提醒',offline:'设备离线'};
  const hierarchy=api.hierarchy(),paths=[];
  hierarchy.forEach(project=>project.plants.forEach(plant=>plant.units.forEach(unit=>unit.pumps.forEach(pump=>paths.push({projectId:project.id,plantId:plant.id,unitId:unit.id,pumpId:pump.id,project:project.name,plant:plant.name,unit:unit.name,device:pump.name})))));
  const events=[],bridges=new Map(),checked=new Set(),drafts=new Map(),monitors=[];
  let serial=0,selectedId='',tab='all',page=1,onlyOpen=false,previousFocus=null,customBounds=null,trendEvent=null,trendBounds=null,selectedData=null;
  const selection={projectId:api.filters.project||'all',plantId:api.filters.plant||'all',unitId:api.filters.unit||'all',pumpId:api.filters.device||'all'};
  let fieldFilter=api.filters.field||null;
  const rank=e=>levels.indexOf(e.level),isOpen=e=>e.needManual&&e.status!=='closed';
  const hours=n=>Date.now()-n*3600000;
  const pathText=e=>[e.project,e.plant,e.unit,e.device].filter(Boolean).join(' / ');
  const tag=(text,color)=>'<span class="ac-tag" '+(color?'style="color:'+color+';background:'+color+'10;border-color:'+color+'30"':'')+'>'+esc(text)+'</span>';
  const levelTag=e=>e.pumpCase?tag('来源未提供等级'):tag(e.level,colors[rank(e)]||'#8792a3');
  const statusTag=e=>tag(stateNames[e.status],e.status==='pending'?'#b36e28':e.status==='progress'?'#2784d5':null);
  const elapsed=e=>{const mins=Math.max(1,Math.floor(((e.end||Date.now())-e.start)/60000));return mins>=60?Math.floor(mins/60)+'小时 '+mins%60+'分钟':mins+'分钟';};
  function normalize(input){
    const path=paths.find(p=>p.pumpId===input.pumpId)||(input.pumpId?{projectId:input.projectId||'unknown',plantId:input.plantId||'unknown',unitId:input.unitId||'unknown',pumpId:input.pumpId,project:input.project||'未提供项目',plant:input.plant||'未提供厂房',unit:input.unit||'未提供机组',device:input.device||input.pumpId}:paths[0]);
    const needManual=input.needManual!==false;
    return {...path,id:input.id||'AL-'+String(++serial).padStart(4,'0'),eventKey:input.eventKey||input.module+':'+input.type+':'+path.pumpId,module:input.module||'PHM',sourceType:input.sourceType||input.module||'PHM',type:input.type||'threshold',title:input.title||'设备预警',level:input.pumpCase?null:input.level||'一般',needManual,status:needManual?(input.status||'pending'):'notice',dataState:input.dataState||'abnormal',start:input.start||Date.now(),updated:input.updated||input.start||Date.now(),end:input.end||null,handler:input.handler||null,recordMode:input.recordMode||'merge',notifyMode:input.notifyMode||'first_upgrade',notificationCount:input.notificationCount??1,read:input.read||false,details:input.details||{},standardCode:input.standardCode||null,history:input.history||[{time:input.start||Date.now(),kind:'首次触发',text:'首次触发 · '+(input.level||'一般')}],series:input.series||null,result:input.result||null,processingActor:input.processingActor||null,origin:input.origin||null,pumpCase:input.pumpCase||null,sourceMessage:input.sourceMessage||null,sourceLocation:input.sourceLocation||null,sourceTime:'sourceTime' in input?input.sourceTime:input.start??null,category:input.category||null,typeName:input.typeName||null,dataViews:input.dataViews||null};
  }
  function ingest(input){
    if(input.id&&events.some(e=>e.id===input.id))return events.find(e=>e.id===input.id);
    const mode=input.recordMode||'merge';
    const old=mode==='merge'?events.filter(e=>e.eventKey===input.eventKey&&e.pumpId===(input.pumpId||paths[0].pumpId)&&e.module===(input.module||'PHM')&&e.needManual===(input.needManual!==false)&&e.recordMode===mode&&(e.needManual?e.status!=='closed':!['recovered','online','reminder'].includes(e.dataState))).at(-1):null;
    if(old){
      const next=input.level||old.level,upgraded=levels.indexOf(next)>rank(old),time=input.start||Date.now();
      old.updated=time;old.dataState=input.dataState||old.dataState;
      if(upgraded){old.level=next;old.history.push({time,kind:'等级升级',text:'预警等级升级至 '+next});}
      else old.history.push({time,kind:'重复触发',text:'再次收到来源预警，归入原事件'});
      if(old.notifyMode==='each'||upgraded){old.notificationCount++;old.read=false;}
      if(input.series)old.series=input.series;if(input.sourceMessage)old.sourceMessage=input.sourceMessage;
      refresh();return old;
    }
    if(input.type&&input.typeName)typeNames[input.type]=input.typeName;
    const event=normalize(input);events.push(event);refresh();return event;
  }
  function seed(input){const reference=demo.events.find(e=>e.id===input.id);events.push(normalize({...input,details:{...reference?.details,...input.details},sourceMessage:input.sourceMessage||reference?.sourceMessage,sourceLocation:input.sourceLocation||reference?.sourceLocation,dataViews:input.dataViews||reference?.dataViews}));}
  const saved=window.SentinelSession.get('alerts.events',null),demo=window.createAlertDemoData(paths);
  (saved||demo.events).forEach(seed);monitors.push(...window.SentinelSession.get('alerts.monitors',demo.monitors));
  demo.events.filter(e=>['PHM-TEMP-DEMO','APM-OPERATING-DEMO','APM-PERFORMANCE-DEMO','APM-ENERGY-DEMO'].includes(e.id)&&!events.some(old=>old.id===e.id)).forEach(seed);
  if(!events.some(e=>e.id==='PHM-PUMP-DEMO-001'))seed(window.PHMPumpDemo.create(paths[0]));
  serial=Math.max(0,...events.map(e=>Number(e.id.match(/^AL-(\d+)$/)?.[1])||0));
  const container=$('#alertCenterRoot');

  ['acModule','acSourceType','acType','acLevel','acRange','acOfflineState'].forEach(id=>$('#'+id).value='all');$('#acSort').value='priority';
  $('#acSimSource').value='phm';$('#acSimManual').value='yes';$('#acSimRecord').value='merge';$('#acSimNotify').value='first_upgrade';$('#acSimHandler').value='no';
  if(api.filters.source)$('#acSourceType').value=api.filters.source;
  $('#acStart').value=local(hours(24));$('#acEnd').value=local(Date.now());
  function syncPLC(){
    api.plcEvents().forEach(source=>{
      const path=paths.find(p=>p.pumpId===source.pumpId);if(!path)return;
      const found=source.pumpId===api.pumpId()?api.findSource(source.source):null;
      const dataState=source.lastState==='已恢复'?'recovered':['无实时数据','规则未启用'].includes(source.lastState)?'unknown':'abnormal';
      const id='PLC:'+source.id,old=bridges.get(id)||events.find(e=>e.id===id);
      const values={...path,id,sourceTime:source.start,eventKey:'PLC:'+source.pumpId+':'+source.source,module:'PHM',sourceType:'PLC',standardCode:source.code,type:'threshold',title:source.field+'阈值预警',level:source.highest,needManual:true,status:source.handledAt?'closed':source.centerStatus||'pending',dataState,start:source.start,updated:source.timeline.at(-1)?.time||source.start,end:source.handledAt,history:source.timeline.map(item=>({...item,kind:window.SentinelTimeline.kind(item)})),details:{标准字段:source.field,来源PLC:source.device,预警极值:source.value+' '+source.unit,最近同步值:found?found.metric.value+' '+source.unit:'未提供数据快照',数据来源:'PLC 预警记录（演示）'},series:typeof Number(source.value)==='number'&&Number.isFinite(Number(source.value))?numeric(Number(source.value),source.unit,source.ruleSnapshot?.levels?.[0]?.max??source.ruleSnapshot?.levels?.[0]?.min):null,result:source.result?{...source.result,time:source.handledAt}:null,origin:source};
      if(old){Object.assign(old,values);bridges.set(id,old);}else{const event=normalize(values);events.push(event);bridges.set(id,event);}
      const standalone=events.findIndex(e=>e.id==='PLC-DEMO-001'&&e.pumpId===source.pumpId);if(standalone>=0)events.splice(standalone,1);
    });
  }
  const scopeMatch=e=>Object.entries(selection).every(([key,value])=>value==='all'||e[key]===value);
  const moduleMatch=e=>($('#acModule').value==='all'||e.module===$('#acModule').value)&&($('#acSourceType').value==='all'||e.sourceType===$('#acSourceType').value);
  const baseEvents=()=>events.filter(e=>scopeMatch(e)&&moduleMatch(e));
  const tabMatch=e=>tab==='all'||tab==='offline'?tab==='all'||e.type==='offline':tab==='notice'?!e.needManual:e.needManual&&e.status===tab;
  function filtered(){
    const query=$('#acSearch').value.trim().toLowerCase(),range=$('#acRange').value;
    const timeMatch=e=>range==='all'||range==='custom'&&(!customBounds||e.start>=customBounds.start&&e.start<=customBounds.end)||range!=='custom'&&e.start>=hours(Number(range));
    const data=baseEvents().filter(e=>(!fieldFilter||e.standardCode===fieldFilter||e.origin?.code===fieldFilter)&&(!onlyOpen||isOpen(e))&&tabMatch(e)&&($('#acType').value==='all'||sourceFields.category(e)===$('#acType').value)&&($('#acLevel').value==='all'||e.level===$('#acLevel').value)&&[e.title,e.id,pathText(e),e.handler].join(' ').toLowerCase().includes(query)&&timeMatch(e));
    const sort=$('#acSort').value;return data.sort((a,b)=>sort==='oldest'?a.start-b.start:sort==='newest'?b.start-a.start:Number(isOpen(b))-Number(isOpen(a))||rank(b)-rank(a)||b.start-a.start);
  }
  function renderScope(){
    const opts=(list,key,name,current,label)=>'<option value="all">'+label+'</option>'+list.map(item=>'<option value="'+esc(item[key])+'" '+(item[key]===current?'selected':'')+'>'+esc(item[name])+'</option>').join('');
    const projects=hierarchy.filter(p=>selection.projectId==='all'||p.id===selection.projectId),plants=projects.flatMap(p=>p.plants),selectedPlants=plants.filter(p=>selection.plantId==='all'||p.id===selection.plantId),units=selectedPlants.flatMap(p=>p.units),selectedUnits=units.filter(u=>selection.unitId==='all'||u.id===selection.unitId);
    $('#acProject').innerHTML=opts(hierarchy,'id','name',selection.projectId,'全部项目');$('#acPlant').innerHTML=opts(plants,'id','name',selection.plantId,'全部厂房');$('#acUnit').innerHTML=opts(units,'id','name',selection.unitId,'全部机组');$('#acDevice').innerHTML=opts(selectedUnits.flatMap(u=>u.pumps),'id','name',selection.pumpId,'全部设备');
    const scope=paths.filter(scopeMatch);$('#acScopeNote').textContent=scope.length+' 台设备范围';
    $('#acSimScope').textContent='演示事件归属：'+api.context().text;
  }
  let pageData=[];
  function updateHeaderBadge(){const count=events.filter(isOpen).length;$('#alertCenterBadge').textContent=count;$('#alertCenterBadge').hidden=!count;$('#openAlertCenterBell').setAttribute('aria-label','预警中心，'+count+'个未处理事件');}
  function render(){
    syncPLC();renderScope();
    const options=(values,current,label)=>'<option value="all">'+label+'</option>'+values.map(value=>'<option value="'+esc(value)+'" '+(value===current?'selected':'')+'>'+esc(value)+'</option>').join('');
    $('#acModule').innerHTML=options([...new Set(['PHM','APM',...events.map(e=>e.module)])],$('#acModule').value,'全部模块');$('#acSourceType').innerHTML=options([...new Set(['PHM','APM','PLC',...events.map(e=>e.sourceType)])],$('#acSourceType').value,'全部来源');
    const base=baseEvents(),types=[...new Set(events.map(sourceFields.category))];
    $('#acType').innerHTML='<option value="all">全部类型</option>'+types.map(code=>'<option value="'+esc(code)+'" '+($('#acType').value===code?'selected':'')+'>'+esc(code)+'</option>').join('');
    updateHeaderBadge();
    $('#acFieldFilter').hidden=!fieldFilter;$('#acFieldFilterName').textContent=fieldFilter?(events.find(e=>e.origin?.code===fieldFilter||e.standardCode===fieldFilter)?.details.标准字段||fieldFilter):'';
    const cards=[['pending','待处理',base.filter(e=>e.needManual&&e.status==='pending').length,'待提交处理结果'],['progress','处理中',base.filter(e=>e.status==='progress').length,'正在处理的事件'],['serious','严重未处理',base.filter(e=>isOpen(e)&&e.level==='严重').length,'需优先关注'],['closed','已结束',base.filter(e=>e.needManual&&e.status==='closed').length,'已保存处理结果']];
    $('#acStats').innerHTML=cards.map(([key,title,count,note])=>'<button class="ac-stat '+key+'" data-ac-stat="'+key+'"><span>'+title+'</span><strong>'+count+'</strong><small>'+note+'</small></button>').join('');
    const tabs=[['all','全部'],['pending','待处理'],['progress','处理中'],['closed','已结束'],['notice','无需处理'],['offline','设备离线']];
    $('#acTabs').innerHTML=tabs.map(([value,title])=>'<button role="tab" aria-selected="'+(tab===value)+'" class="'+(tab===value?'active':'')+'" data-ac-tab="'+value+'">'+title+'<span>'+base.filter(e=>value==='all'||value==='offline'?value==='all'||e.type==='offline':value==='notice'?!e.needManual:e.needManual&&e.status===value).length+'</span></button>').join('');
    const data=filtered();page=Math.max(1,Math.min(page,Math.ceil(data.length/8)||1));pageData=data.slice((page-1)*8,page*8);
    $('#acListCount').textContent=data.length+' 个事件';$('#acListHint').textContent=onlyOpen?'仅展示严重未处理事件':tab==='notice'?'无需人工处理，不计入待处理数量':tab==='offline'?'离线事件记录；恢复与处理结束分别记录':'已读只影响通知阅读状态，不影响事件处理';
    $('#acRows').innerHTML=pageData.map(e=>'<tr><td><input type="checkbox" data-ac-check="'+esc(e.id)+'" '+(checked.has(e.id)?'checked':'')+' aria-label="选择'+esc(e.id)+'"></td><td><button class="ac-event-title" data-ac-event="'+esc(e.id)+'">'+(!e.read?'<i class="ac-unread" title="未读"></i>':'')+esc(e.title)+'</button>'+(e.pumpCase?'<small class="ac-pump-list-summary">'+e.pumpCase.issues.filter(item=>item.status==='abnormal').length+'项异常中 / '+e.pumpCase.issues.length+'项累计提示 · '+e.pumpCase.feedbacks.length+'次算法反馈</small>':'')+'<small>'+esc(e.device)+' · '+esc(e.id)+'</small><small>'+esc([e.project,e.plant,e.unit].join(' / '))+'</small></td><td>'+tag(e.module)+'<small>'+esc(e.sourceType)+'</small></td><td>'+esc(sourceFields.category(e))+'<br>'+levelTag(e)+'</td><td>'+stamp(e.start)+'<small>'+elapsed(e)+'</small></td><td>'+tag(dataNames[e.dataState]||e.dataState)+'</td><td>'+statusTag(e)+'<small>'+e.notificationCount+' 次通知</small></td><td>'+esc(e.handler||'未指定')+'</td><td><button class="ac-row-link" data-ac-event="'+esc(e.id)+'">'+(isOpen(e)?'查看 / 处理':'查看详情')+'</button></td></tr>').join('')||'<tr><td colspan="9" class="ac-empty">当前筛选范围内暂无预警事件</td></tr>';
    $('#acSelectPage').checked=pageData.length>0&&pageData.every(e=>checked.has(e.id));$('#acReadSelected').disabled=!checked.size;
    $('#acPageInfo').textContent='第 '+page+' / '+(Math.ceil(data.length/8)||1)+' 页';$('#acPrev').disabled=page===1;$('#acNext').disabled=page*8>=data.length;
    $('#acCustomRange').hidden=$('#acRange').value!=='custom';$('#acOfflineSection').hidden=tab!=='offline';if(tab==='offline')renderOffline();persist();
  }
  function persist(){window.SentinelSession.set('alerts.events',events.map(({origin,...event})=>event));window.SentinelSession.set('alerts.monitors',monitors);}
  function refresh(){if($('#alertCenter'))render();}
  function renderOffline(){
    const all=monitors.filter(m=>scopeMatch(m)&&moduleMatch({module:m.module,sourceType:m.key.startsWith('plc')?'PLC':m.module}));
    $('#acOfflineStats').innerHTML='<span>监控设备 <strong>'+all.length+'</strong></span><span>离线中 <strong>'+all.filter(m=>m.state==='offline').length+'</strong></span><span>在线 / 已恢复 <strong>'+all.filter(m=>m.state==='online').length+'</strong></span>';
    $('#acOfflineRows').innerHTML=all.filter(m=>$('#acOfflineState').value==='all'||m.state===$('#acOfflineState').value).map(m=>{const related=events.filter(e=>e.eventKey==='offline:'+m.key),last=related.at(-1);return'<tr><td><strong>'+esc(m.name)+'</strong><small>'+esc(pathText(m))+'</small></td><td>'+tag(m.module)+'</td><td>'+tag(m.state==='offline'?'离线中':'在线 / 已恢复',m.state==='offline'?'#d95157':'#3b8e71')+'</td><td>'+(last?stamp(last.start):'—')+'</td><td>'+(last?elapsed({...last,end:m.state==='offline'?null:last.recoveredAt||last.end}):'—')+'</td><td>'+related.length+' 条</td><td>'+(last?'<button class="ac-row-link" data-ac-event="'+esc(last.id)+'">查看记录</button>':'')+'<button class="ac-row-link" data-ac-connection="'+esc(m.key)+'">模拟'+(m.state==='offline'?'恢复':'离线')+'</button></td></tr>';}).join('')||'<tr><td colspan="7" class="ac-empty">当前范围暂无连接监控设备</td></tr>';
  }
  function connection(key){
    const monitor=monitors.find(m=>m.key===key);if(!monitor)return;
    if(monitor.state==='offline'){
      monitor.state='online';const related=events.filter(e=>e.eventKey==='offline:'+key&&e.dataState==='offline');related.forEach(e=>recover(e.id));api.toast('设备已恢复在线；人工事件仍需处理');
    }else{monitor.state='offline';monitor.since=Date.now();ingest({...monitor,eventKey:'offline:'+key,type:'offline',sourceType:monitor.module,needManual:false,title:monitor.name+'离线',dataState:'offline',details:{采集设备:monitor.name,数据来源:'连接状态演示'}});api.toast('已产生离线监控记录');}render();
  }
  function saveDraft(){const e=events.find(e=>e.id===selectedId);if(!e||!isOpen(e))return;const draft=drafts.get(e.id);if(draft){draft.method=$('#acMethod').value;draft.description=$('#acDescription').value;}}
  function renderFiles(){const draft=drafts.get(selectedId);if(!draft)return;['photos','files'].forEach(kind=>{$(kind==='photos'?'#acPhotoList':'#acFileList').innerHTML=draft[kind].map((file,i)=>'<div class="ac-file">'+(kind==='photos'?'<a href="'+file.url+'" target="_blank" rel="noopener"><img src="'+file.url+'" alt="'+esc(file.name)+'"></a>':'<a href="'+file.url+'" download="'+esc(file.name)+'">'+esc(file.name)+'</a>')+'<button data-ac-remove="'+kind+':'+i+'" class="ac-row-link">移除</button></div>').join('');});}
  function show(id){
    saveDraft();const e=events.find(e=>e.id===id);if(!e)return;selectedId=id;e.read=true;previousFocus=document.activeElement;closeTrend();
    $('#acDetailTitle').textContent=e.title;$('#acDetailPath').textContent=pathText(e)+' · '+e.id;
    const overview=[['事件编号',e.id],['预警来源',sourceFields.source(e)],['预警类别',sourceFields.category(e)],['所属设备',e.device],['所属位置',sourceFields.location(e)],['首次预警时间',e.sourceTime?stamp(e.sourceTime):'来源未提供'],['处理状态',stateNames[e.status]]];
    if(e.handler)overview.push(['配置处理人',e.handler]);
    $('#acMessageText').textContent=e.sourceMessage||'来源尚未提供消息正文。';
    $('#acMessageNote').textContent=e.sourceMessage?'保留来源消息内容 · 当前为演示数据':'等待来源提供完整消息，平台不根据专业字段补写结论。';
    renderPumpCase(e);
    $('#acOverview').innerHTML=overview.map(([k,v])=>'<div class="'+(k==='所属位置'?'ac-overview-location':'')+'"><span>'+k+'</span><strong>'+esc(v)+'</strong></div>').join('');
    $('#acPolicies').innerHTML=tag(e.recordMode==='each'?'每次预警独立记录':'同一异常归并')+tag(e.notifyMode==='each'?'每次来源预警通知':'首次及升级时通知');
    $('#acEventUpdates').innerHTML='<span>通知：'+e.notificationCount+' 次</span><span>最近接收／更新：'+stamp(e.updated)+'</span>'+(e.pumpCase?'<span>算法反馈：'+e.pumpCase.feedbacks.length+' 次</span>':'');
    $('#acHistory').innerHTML=window.SentinelTimeline.nodes(e.history,{unit:e.origin?.unit||e.series?.unit||''}).map(h=>'<li><time>'+stamp(h.time)+(h.endTime&&stamp(h.endTime)!==stamp(h.time)?' — '+stamp(h.endTime):'')+'</time>'+tag(h.kind||'状态记录')+'<p>'+esc(h.text)+'</p></li>').join('');
    $('#acProcessForm').hidden=!isOpen(e);$('#acProcessResult').hidden=!e.result;$('#acNoProcess').hidden=e.needManual;
    $('#acSubmitProcess').hidden=!isOpen(e);$('#acViewTrend').hidden=false;$('#acAdviceContent').innerHTML=window.SentinelDataViews.advice(e);
    $('#acHandlerNote').textContent=e.handler?'来源配置处理人：'+e.handler+'。本版不提供重新分配；提交时另行记录实际操作人。':'来源未指定处理人。提交时记录当前实际操作人，本版不提供分配操作。';
    if(e.pumpCase)$('#acHandlerNote').textContent+=' 本次提交统一处理该泵级事件，请在说明中覆盖所有提示项。';
    $('#acProcessError').textContent='';
    if(isOpen(e)){if(!drafts.has(e.id))drafts.set(e.id,{method:'',description:'',photos:[],files:[]});const draft=drafts.get(e.id);$('#acMethod').value=draft.method;$('#acDescription').value=draft.description;renderFiles();}
    if(e.result){const r=e.result;$('#acResultContent').innerHTML='<p>处理方式：'+esc(r.method)+'</p><p>说明：'+esc(r.description)+'</p><p>实际处理人：'+esc(r.operator)+'</p><p>处理时间：'+stamp(r.time||e.end)+'</p>'+[...(r.photos||[]),...(r.files||[])].map(file=>'<a href="'+file.url+'" target="_blank" rel="noopener">'+esc(file.name)+'</a>').join('<br>');}
    $('#acDetailModal').classList.add('open');$('#acDetailModal').setAttribute('aria-hidden','false');$('#acCloseDetail').focus();render();
  }
  function startProcessing(id){const e=events.find(e=>e.id===id);if(!e||!e.needManual||e.status!=='pending')return false;e.status='progress';e.processingActor='InternalDemo';e.history.push({time:Date.now(),kind:'开始处理',text:'InternalDemo 开始处理'});if(e.origin){e.origin.centerStatus='progress';e.origin.timeline.push({time:Date.now(),text:'开始处理 · InternalDemo'});}render();return true;}
  function process(id,result){
    const e=events.find(e=>e.id===id);if(!e||!isOpen(e))return false;
    if(!result.method||!String(result.description||'').trim())return false;
    const time=Date.now();e.status='closed';e.end=time;e.updated=time;e.result={method:result.method,description:result.description,photos:result.photos||[],files:result.files||[],operator:'InternalDemo',time};e.history.push({time,kind:'处理结束',text:'提交处理结果 · '+result.method+' · 事件结束'});
    if(e.origin){e.origin.handledAt=time;e.origin.centerStatus='closed';e.origin.result={...e.result};e.origin.timeline.push({time,text:'提交处理 · '+result.method+' · 事件结束'});api.savePLCEvent(e.origin);}
    drafts.delete(id);render();return true;
  }
  function recover(id){const e=events.find(e=>e.id===id);if(!e)return;e.dataState=e.type==='offline'?'online':'recovered';e.updated=Date.now();e.recoveredAt=e.updated;if(e.type==='offline'){const monitor=monitors.find(m=>'offline:'+m.key===e.eventKey);if(monitor)monitor.state='online';}if(!e.needManual)e.end=e.updated;e.history.push({time:e.updated,kind:e.type==='offline'?'设备恢复':'数据恢复',text:e.needManual?'数据已恢复，人工事件仍需提交处理结果':'来源确认恢复，无需人工处理'});render();}
  function closeDetail(){saveDraft();closeTrend();$('#acDetailModal').classList.remove('open');$('#acDetailModal').setAttribute('aria-hidden','true');previousFocus?.focus();}
  function closeTrend(){$('#acTrendDrawer').hidden=true;$('#acDetailModal').classList.remove('with-trend');}
  const dataExamples={
    fault:{label:'故障百分比 / 时域图 / 频域图',key:'fault'},
    vibration:{label:'振动信息',key:'vibration'},
    spectrum:{label:'频谱信息',key:'spectrum'},
    correlation:{label:'相关性信息',key:'correlation'},
    trend:{label:'数据趋势',key:'trend'},
    operating:{label:'工况详情',key:'operating'},
    performance:{label:'性能详情',key:'performance'},
    energy:{label:'能效详情',key:'energy'}
  };
  function openSourceDrawer(title){const e=events.find(e=>e.id===selectedId);if(!e)return null;trendEvent=e;selectedData=null;$('#acTrendTitle').textContent=title;$('#acTrendRange').textContent=e.module+' / '+e.sourceType+' · '+e.title;$('#acTrendDrawer').hidden=false;$('#acDetailModal').classList.add('with-trend');return e;}
  function showTrend(){const e=openSourceDrawer('数据详情');if(!e)return;const available=sourceFields.views(e).filter(key=>dataExamples[key]);$('#acDataExamples').hidden=!available.length;$('#acDataButtons').innerHTML=available.map(key=>'<button type="button" data-ac-data="'+key+'" class="secondary-action" aria-pressed="false">'+esc(dataExamples[key].label)+'</button>').join('');$('#acDataSourceFields').innerHTML=sourceFields.detailMarkup(e);$('#acDataSourceFields').hidden=!$('#acDataSourceFields').innerHTML;$('#acDataPlaceholder').hidden=false;$('#acDataPlaceholder').innerHTML='<strong>'+esc(available.length?'根据预警来源展示对应图表':'来源未提供可展示的数据详情')+'</strong><p>'+esc(available.length?'请选择该预警可提供的数据内容。':'保留来源接入位置，不补造专业数据。')+'</p>';$('#acDataPreview').hidden=true;$('#acExpandTrend').hidden=true;}

  function showDataExample(key){const example=dataExamples[key];if(!example||!trendEvent||!sourceFields.views(trendEvent).includes(key))return;selectedData={...example,mode:'working'};$('#acDataPlaceholder').hidden=true;$('#acDataPreview').hidden=false;$('#acDataCaption').textContent=sourceFields.source(trendEvent)+' · '+example.label+' · 原型演示数据';renderDataDrawing();$('#acExpandTrend').hidden=false;document.querySelectorAll('[data-ac-data]').forEach(b=>{const active=b.dataset.acData===key;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});}
  function renderDataDrawing() {if(!selectedData)return;const content=window.SentinelDataViews.render(selectedData.key,selectedData.mode,selectedData.key==='fault'?trendEvent?.pumpCase:trendEvent);$('#acDataDrawing').innerHTML=content;if($('#acTrendModal').classList.contains('open'))$('#acBigDrawing').innerHTML=content;}
  function showBigTrend(){if(!selectedData)return;$('#acBigTrendTitle').textContent=selectedData.label+' · 放大查看';$('#acBigRangeLabel').textContent=sourceFields.source(trendEvent)+' · 原型演示数据';$('#acBigDrawing').innerHTML=window.SentinelDataViews.render(selectedData.key,selectedData.mode,selectedData.key==='fault'?trendEvent?.pumpCase:trendEvent);$('#acTrendModal').classList.add('open');$('#acTrendModal').setAttribute('aria-hidden','false');}
  function closeBigTrend(){$('#acTrendModal').classList.remove('open');$('#acTrendModal').setAttribute('aria-hidden','true');}
  function simulate(upgrade=false){
    const source=$('#acSimSource').value,context=api.context(),p=paths.find(p=>p.pumpId===context.pump.id)||paths[0],existing=events.filter(e=>e.eventKey==='demo:'+source&&isOpen(e)).at(-1),level=upgrade?levels[Math.min(3,(existing?rank(existing):1)+1)]:'一般';
    const event=ingest({...p,eventKey:'demo:'+source,module:source==='apm'?'APM':'PHM',sourceType:source==='plc'?'PLC':source==='apm'?'APM':'PHM',type:source==='apm'?'efficiency':'threshold',title:source==='apm'?'设备效率偏离设定范围':source==='plc'?'进口压力阈值异常':'泵驱动端水平振动超限',level,needManual:$('#acSimManual').value==='yes',recordMode:$('#acSimRecord').value,notifyMode:$('#acSimNotify').value,handler:$('#acSimHandler').value==='yes'?'来源规则配置处理人（演示）':null,series:source==='apm'?numeric(62,'%',70):source==='plc'?numeric(.33,'MPa',.3):numeric(5.2,'mm/s',4.5),details:{数据来源:'规则兼容演示',说明:'用于验证来源规则接入，不修改模块的实际规则'}});
    $('#acSimFeedback').textContent=event.id+' · '+(event.recordMode==='each'?'独立记录':'归并事件')+' · '+event.notificationCount+' 次通知';return event;
  }
  function open(){syncPLC();$('#accountMenu').classList.remove('open');$('#accountMenu').setAttribute('aria-hidden','true');$('#userMenuButton').setAttribute('aria-expanded','false');$('#alertCenter').classList.add('open');$('#alertCenter').setAttribute('aria-hidden','false');$('#openAlertCenterBell').setAttribute('aria-expanded','true');render();}
  function close(){persist();api.navigatePLC();}
  ['openAlertCenterBell','openAlertCenterMenu','openAlertCenterButton'].forEach(id=>$('#'+id).addEventListener('click',open));$('#acBack').addEventListener('click',close);
  const keys=['projectId','plantId','unitId','pumpId'];['acProject','acPlant','acUnit','acDevice'].forEach((id,index)=>$('#'+id).addEventListener('change',event=>{selection[keys[index]]=event.target.value;keys.slice(index+1).forEach(key=>selection[key]='all');page=1;checked.clear();render();}));
  ['acModule','acSourceType','acType','acLevel','acRange','acSort','acOfflineState'].forEach(id=>$('#'+id).addEventListener('change',()=>{page=1;checked.clear();render();}));$('#acSearch').addEventListener('input',()=>{page=1;render();});
  $('#acApplyRange').addEventListener('click',()=>{const start=new Date($('#acStart').value),end=new Date($('#acEnd').value);if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end){$('#acRangeError').textContent='请选择有效的起止时间。';return;}customBounds={start:+start,end:+end};$('#acRangeError').textContent='';page=1;render();});
  container.addEventListener('click',event=>{
    const target=event.target;
    const t=target.closest('[data-ac-tab]');if(t){tab=t.dataset.acTab;onlyOpen=false;page=1;checked.clear();render();return;}
    const stat=target.closest('[data-ac-stat]');if(stat){onlyOpen=stat.dataset.acStat==='serious';tab=onlyOpen?'all':stat.dataset.acStat;$('#acLevel').value=onlyOpen?'严重':'all';page=1;render();return;}
    const row=target.closest('[data-ac-event]');if(row){show(row.dataset.acEvent);return;}
    const conn=target.closest('[data-ac-connection]');if(conn){connection(conn.dataset.acConnection);return;}
    const remove=target.closest('[data-ac-remove]');if(remove){const [kind,index]=remove.dataset.acRemove.split(':'),draft=drafts.get(selectedId);URL.revokeObjectURL(draft[kind][index].url);draft[kind].splice(Number(index),1);renderFiles();}
    if(target.id==='acDetailModal')closeDetail();if(target.id==='acTrendModal')closeBigTrend();
  });
  container.addEventListener('change',event=>{const id=event.target.dataset.acCheck;if(!id)return;event.target.checked?checked.add(id):checked.delete(id);$('#acReadSelected').disabled=!checked.size;$('#acSelectPage').checked=pageData.every(e=>checked.has(e.id));});
  $('#acSelectPage').addEventListener('change',event=>{pageData.forEach(e=>event.target.checked?checked.add(e.id):checked.delete(e.id));render();});$('#acReadSelected').addEventListener('click',()=>{events.filter(e=>checked.has(e.id)).forEach(e=>e.read=true);checked.clear();render();});
  $('#acPrev').addEventListener('click',()=>{page--;render();});$('#acNext').addEventListener('click',()=>{page++;render();});
  ['acCloseDetail','acCloseDetailFooter'].forEach(id=>$('#'+id).addEventListener('click',closeDetail));
  $('#acSubmitProcess').addEventListener('click',()=>{saveDraft();if(!process(selectedId,drafts.get(selectedId)||{})){$('#acProcessError').textContent='请选择处理方式并填写处理说明。';return;}show(selectedId);api.toast('事件已处理，结果与过程已保存');});
  ['acPhotos','acFiles'].forEach(id=>$('#'+id).addEventListener('change',event=>{const draft=drafts.get(selectedId);if(!draft)return;const kind=id==='acPhotos'?'photos':'files';[...event.target.files].forEach(file=>{if(kind==='photos'&&!file.type.startsWith('image/'))return;draft[kind].push({name:file.name,url:URL.createObjectURL(file)});});event.target.value='';renderFiles();}));
  $('#acViewTrend').addEventListener('click',showTrend);
  $('#acDataExamples').addEventListener('click',event=>{const button=event.target.closest('[data-ac-data]');if(button)showDataExample(button.dataset.acData);});$('#acCloseTrend').addEventListener('click',closeTrend);$('#acExpandTrend').addEventListener('click',showBigTrend);$('#acCloseBigTrend').addEventListener('click',closeBigTrend);
  ['acDataDrawing','acBigDrawing'].forEach(id=>$('#'+id).addEventListener('click',event=>{const button=event.target.closest('[data-ac-curve]');if(button&&selectedData?.key==='operating'){selectedData.mode=button.dataset.acCurve;renderDataDrawing();}}));
  function renderPumpCase(e){
    const model=e.pumpCase;$('#acPumpSection').hidden=!model;if(!model)return;
    const active=model.issues.filter(item=>item.status==='abnormal').length;
    $('#acPumpSummary').textContent=active+' 项异常中 / '+model.issues.length+' 项累计提示';
    $('#acPumpIssues').innerHTML=model.issues.map(item=>'<article class="ac-pump-issue"><header><strong>'+esc(item.component)+' · '+esc(item.name)+'</strong>'+tag(item.status==='normal'?'已恢复':'异常中',item.status==='normal'?'#529a71':'#d36b50')+'</header><p>'+esc(item.module)+(item.warningCode?' · '+esc(item.warningCode):'')+(item.sourcePercent!=null?' · 来源百分比 <b>'+esc(item.sourcePercent)+'%</b>':'')+'</p><small>首次：'+stamp(item.firstSeen)+' · 最近反馈：'+stamp(item.lastSeen)+'</small><button data-ac-issue-view="'+esc(item.view||'fault')+'" class="ac-row-link">查看数据</button></article>').join('');
    const steps=['首次反馈：三项联轴器提示','相同异常再次反馈，归入原事件','新增振动提示，仍为同一事件','两项联轴器提示恢复，保留历史','全部恢复，仍待人工提交处理'];
    $('#acPumpStep').textContent=(model.step+1)+' / 5 · '+steps[model.step];
    $('#acPumpRaw').textContent=JSON.stringify(model.feedbacks.at(-1),null,2);
    $('#acPumpNext').textContent=e.status==='closed'?'模拟再次异常（新事件）':'下一次算法反馈';$('#acPumpNext').disabled=e.status!=='closed'&&model.step>=4;
  }
  $('#acOpenPumpDemo').addEventListener('click',()=>show('PHM-PUMP-DEMO-001'));
  $('#acPumpNext').addEventListener('click',()=>{
    const e=events.find(e=>e.id===selectedId);if(!e?.pumpCase)return;saveDraft();
    if(e.status==='closed'){const fresh=window.PHMPumpDemo.create(paths.find(p=>p.pumpId===e.pumpId),Date.now());fresh.id=null;fresh.title=e.title;const created=normalize(fresh);events.push(created);show(created.id);return;}
    if(window.PHMPumpDemo.next(e)){show(e.id);api.toast('已更新原事件，未新增预警条目');}
  });
  $('#acPumpReset').addEventListener('click',()=>{const e=events.find(e=>e.id===selectedId);if(!e?.pumpCase)return;const fresh=normalize(window.PHMPumpDemo.create(paths.find(p=>p.pumpId===e.pumpId)));fresh.id=e.id;drafts.delete(e.id);Object.assign(e,fresh);show(e.id);});
  $('#acPumpIssues').addEventListener('click',event=>{const b=event.target.closest('[data-ac-issue-view]');if(!b)return;showTrend();showDataExample(b.dataset.acIssueView);});
  $('#acClearField').addEventListener('click',()=>{fieldFilter=null;render();});
  $('#acPolicyInfo').addEventListener('click',()=>{$('#acInfoModal').classList.add('open');$('#acInfoModal').setAttribute('aria-hidden','false');});$('#acCloseInfo').addEventListener('click',()=>{$('#acInfoModal').classList.remove('open');$('#acInfoModal').setAttribute('aria-hidden','true');});
  $('#acSimTrigger').addEventListener('click',()=>simulate());$('#acSimUpgrade').addEventListener('click',()=>simulate(true));$('#acSimRecover').addEventListener('click',()=>{const source=$('#acSimSource').value,e=events.filter(e=>e.eventKey==='demo:'+source&&(e.needManual?e.status!=='closed':e.dataState==='abnormal')).at(-1);if(!e)return api.toast('请先模拟一条预警');recover(e.id);$('#acSimFeedback').textContent=e.id+' 数据已恢复'+(e.needManual?'，仍需人工处理':'，无需处理');});
  window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const big=$('#acTrendModal'),info=$('#acInfoModal'),detail=$('#acDetailModal');if(big.classList.contains('open'))closeBigTrend();else if(info.classList.contains('open')){info.classList.remove('open');info.setAttribute('aria-hidden','true');}else if(detail.classList.contains('open'))closeDetail();else if($('#alertCenter').classList.contains('open'))close();else return;event.preventDefault();event.stopImmediatePropagation();},true);
  window.SentinelAlertCenter={events,ingest,open,close,render,show,startProcessing,process,recover,filtered,simulate,monitors};
  syncPLC();render();
  open();
  if(api.filters.event&&events.some(e=>e.id===api.filters.event))show(api.filters.event);
})();
