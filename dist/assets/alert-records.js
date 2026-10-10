(() => {
  const api=window.sentinelPrototype;
  const $=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const events=[],seeded=new Set(),drafts=new Map();
  let selectedId='',fieldSource='',serial=0;
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
  function makeEvent(found,start,value,highest,timeline,handled=false){
    const field=api.fields().find(f=>f.code===found.metric.standardCode);
    const rule=api.effectiveThresholdRule(found.metric.standardCode);
    const event={id:'PLC-E'+String(++serial).padStart(4,'0'),pumpId:api.pumpId(),source:found.device.id+':'+found.metric.id,code:found.metric.standardCode,field:field?.name||found.metric.name,device:found.device.name,unit:found.metric.unit,start,value,highest,timeline,handledAt:handled?start+25*60000:null,ruleSnapshot:rule?JSON.parse(JSON.stringify(rule)):null,path:contextText()};
    if(handled)event.result={method:'现场检修',description:'检查连接与测量信号，调整后数据恢复正常。（示例记录）',operator:'项目配置人员（演示）',photos:[],files:[]};
    event.lastSeverity=activeLevel(event)?.severity||null;
    event.lastState=dataState(event);
    event.lastValue=sourceOf(event.pumpId,event.source)?.metric.value;
    event.colorSnapshot=event.ruleSnapshot?.levels.find(level=>level.severity===highest)?.color||color(event);
    events.push(event);return event;
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
      if(state==='已恢复'&&e.lastState==='异常中')e.timeline.push({time:Date.now(),text:'数据恢复正常，事件仍待处理'});
      if(state==='异常中'&&e.lastState==='已恢复')e.timeline.push({time:Date.now(),text:'再次异常，归入原事件 · '+severity});
      if(severity&&e.lastSeverity&&api.severityNames.indexOf(severity)>api.severityNames.indexOf(e.lastSeverity))e.timeline.push({time:Date.now(),text:'等级升级 · '+e.lastSeverity+' → '+severity});
      if(severity&&e.lastSeverity&&api.severityNames.indexOf(severity)<api.severityNames.indexOf(e.lastSeverity))e.timeline.push({time:Date.now(),text:'等级下降 · '+e.lastSeverity+' → '+severity+'，事件未结束'});
      if(severity&&api.severityNames.indexOf(severity)>api.severityNames.indexOf(e.highest)){e.highest=severity;e.colorSnapshot=level.color;}
      const value=sourceOf(e.pumpId,e.source)?.metric.value;
      if(typeof value==='number'&&typeof e.lastValue==='number'&&value!==e.lastValue)e.timeline.push({time:Date.now(),text:(value<e.lastValue?'数值下降':'数值上升')+' · '+e.lastValue+' → '+value+unit(e),value});
      if(level&&typeof value==='number'&&Math.abs(value)>Math.abs(Number(e.value)))e.value=value;
      e.lastState=state;e.lastSeverity=severity;e.lastValue=value;
    });
  }
  const scopeEvents=()=>{ensureEvents();syncOpenEvents();return events.filter(e=>e.pumpId===api.pumpId());};
  const trendEvents=found=>{
    ensureEvents();syncOpenEvents();
    return events.filter(e=>e.pumpId===api.pumpId()&&e.source===found.device.id+':'+found.metric.id).map(e=>({id:e.id,time:new Date(e.start),value:e.value,duration:duration(e),severity:e.highest,color:e.colorSnapshot}));
  };
  const overlay=document.createElement('div');
  overlay.innerHTML=`
    <div id="recordsModal" class="modal-layer records-modal" aria-hidden="true">
      <section class="modal-card modal-xl" role="dialog" aria-modal="true" aria-labelledby="recordsTitle">
        <header class="modal-header"><div><h2 id="recordsTitle">PLC 预警记录</h2><p>同一未处理异常归为一个事件，升级过程保留在事件详情中。</p></div><button class="modal-close" data-records-close="recordsModal" aria-label="关闭预警记录">×</button></header>
        <div class="modal-body scroll-body"><div id="recordsScope" class="records-scope"></div>
          <div class="records-toolbar"><input id="recordsSearch" type="search" placeholder="搜索字段或事件编号" aria-label="搜索记录"><select id="recordsDevice" aria-label="来源PLC"></select><select id="recordsSeverity" aria-label="最高预警等级"><option value="all">全部等级</option><option>提示</option><option>一般</option><option>重要</option><option>严重</option></select><select id="recordsStatus" aria-label="处理状态"><option value="all">全部处理状态</option><option value="open">未处理</option><option value="handled">已处理</option></select><select id="recordsRange" aria-label="时间范围"><option value="24">最近24小时</option><option value="168">最近7天</option><option value="all">全部时间</option></select></div>
          <div id="recordsSummary" class="records-summary"></div><div class="data-table-wrap"><table class="data-table records-table"><thead><tr><th>标准字段 / 来源PLC</th><th>最高等级</th><th>首次预警时间</th><th>事件时长</th><th>数据状态</th><th>处理状态</th><th>操作</th></tr></thead><tbody id="recordsRows"></tbody></table></div>
        </div><footer class="modal-footer"><button class="secondary-action" data-records-close="recordsModal">关闭</button></footer>
      </section>
    </div>
    <aside id="fieldRecords" class="field-records" aria-hidden="true" aria-labelledby="fieldRecordsTitle">
      <header><div><h2 id="fieldRecordsTitle">字段预警记录</h2><p id="fieldRecordsSubtitle"></p></div><button class="trend-close" id="closeFieldRecords" aria-label="关闭字段预警记录">×</button></header>
      <div class="field-records-body"><div class="records-toolbar"><select id="fieldRecordsSeverity" aria-label="字段最高预警等级"><option value="all">全部等级</option><option>提示</option><option>一般</option><option>重要</option><option>严重</option></select><select id="fieldRecordsStatus" aria-label="字段处理状态"><option value="all">全部处理状态</option><option value="open">未处理</option><option value="handled">已处理</option></select><select id="fieldRecordsRange" aria-label="字段记录时间范围"><option value="trend">沿用趋势时间</option><option value="24">最近24小时</option><option value="168">最近7天</option><option value="all">全部时间</option><option value="custom">自定义时间</option></select><select id="fieldRecordsSort" aria-label="字段记录排序"><option value="newest">首次触发：最新优先</option><option value="oldest">首次触发：最早优先</option><option value="severity">预警等级：高到低</option><option value="duration">事件时长：长到短</option></select><div id="fieldRecordsCustom" class="record-custom-range" hidden><input id="fieldRecordsStart" type="datetime-local" aria-label="记录开始时间"><input id="fieldRecordsEnd" type="datetime-local" aria-label="记录结束时间"><button id="applyFieldRecordsRange" class="secondary-action">应用时间</button></div></div><div id="fieldRecordRows"></div></div>
    </aside>
    <div id="eventModal" class="modal-layer event-modal" aria-hidden="true"><div class="event-workspace">
      <section class="modal-card modal-xl" role="dialog" aria-modal="true" aria-labelledby="eventTitle">
        <header class="modal-header"><div><h2 id="eventTitle">预警事件详情</h2><p id="eventSubtitle"></p></div><button class="modal-close" data-records-close="eventModal" aria-label="关闭事件详情">×</button></header>
        <div class="modal-body event-detail-body"><div class="event-columns">
          <section class="event-section ai-planned event-ai-column"><h3>AI 建议 <span class="event-tag">规划功能</span></h3><p>以下为示例建议，尚未接入真实 AI 分析。</p><p id="eventAISuggestion"></p></section>
          <div class="event-history-column">
          <section class="event-section"><h3>事件概况</h3><div id="eventOverview" class="event-overview"></div></section>
          <section class="event-section event-history-section"><h3>事件过程</h3><div class="event-node-legend">首次触发 · 数值上升 · 等级升级 · 数值下降 · 等级下降 · 数据恢复 · 再次异常 · 处理结束</div><div class="event-timeline-scroll" tabindex="0" aria-label="垂直滚动查看事件过程"><ul id="eventTimeline" class="event-timeline"></ul></div></section>
        </div><div class="event-process-column">
          <section id="eventProcessSection" class="event-section"><h3>事件处理</h3>
            <div class="event-form"><label><span>处理方式 <em>*</em></span><select id="eventMethod"><option value="">请选择</option><option>现场检修</option><option>参数调整</option><option>误报确认</option><option>其他</option></select></label><label><span>处理说明 <em>*</em></span><textarea id="eventDescription" placeholder="填写原因、采取的措施及处理结果"></textarea></label>
              <label><span>现场照片</span></label><div class="event-upload"><label><input id="eventPhotos" type="file" accept="image/*" multiple><span class="secondary-action">＋ 添加照片</span></label></div><p class="upload-note">原型仅本地预览，不上传服务器。</p><div id="eventPhotoList" class="event-files"></div>
              <label style="margin-top:16px"><span>相关附件</span></label><div class="event-upload"><label><input id="eventFiles" type="file" multiple><span class="secondary-action">＋ 添加附件</span></label></div><p class="upload-note">支持选择文件并打开或下载预览。</p><div id="eventFileList" class="event-files"></div>
            </div><div id="eventFormError" class="form-error" role="alert"></div>
          </section>
          <section id="eventResultSection" class="event-section" hidden><h3>处理结果</h3><div id="eventResult" class="event-result"></div></section>
        </div></div></div>
        <footer class="modal-footer"><button class="secondary-action" id="eventViewTrend">查看对应趋势</button><button class="secondary-action" data-records-close="eventModal">关闭</button><button class="primary-action" id="submitEventProcess">提交处理并结束事件</button></footer>
      </section>
      <aside id="eventTrendDrawer" class="event-trend-drawer" hidden aria-labelledby="eventTrendTitle">
        <header><div><h3 id="eventTrendTitle">事件对应趋势</h3><p id="eventTrendRange"></p></div><button id="closeEventTrend" class="trend-close" aria-label="收起事件趋势">×</button></header>
        <div class="event-trend-content"><div class="event-trend-caption"><p class="event-trend-note">首次触发至现在 · 演示数据</p><button id="expandEventTrend" class="secondary-action">放大查看</button></div><svg id="eventTrendChart" viewBox="0 0 420 280" role="img" aria-label="首次触发至现在的趋势图"></svg><div id="eventTrendLegend"></div><div id="eventTrendNodes"></div></div>
      </aside>
      </div>
    </div>`;
  document.body.append(overlay);
  const entry=document.createElement('button');entry.id='openPLCRecords';entry.className='secondary-action record-entry';entry.textContent='预警记录';entry.type='button';
  entry.innerHTML='预警记录 <span id="plcUnhandledBadge" class="plc-unhandled-badge" hidden></span>';
  $('#plcPanel .plc-summary').append(entry);
  function updateBadge(){const count=scopeEvents().filter(e=>!e.handledAt).length,badge=$('#plcUnhandledBadge');badge.textContent=count;badge.hidden=!count;entry.setAttribute('aria-label','预警记录，'+count+'个未处理事件');}
  const trendEntry=$('.trend-alert-overview');trendEntry.setAttribute('tabindex','0');trendEntry.setAttribute('role','button');trendEntry.setAttribute('aria-label','打开当前标准字段的预警记录');
  const hint=document.createElement('div');hint.className='record-field';hint.textContent='点击查看该字段预警记录';trendEntry.append(hint);
  let previousFocus=null;
  function open(id){previousFocus=document.activeElement;$('#'+id).classList.add('open');$('#'+id).setAttribute('aria-hidden','false');$('#'+id+' button')?.focus();}
  function close(id){if(id==='eventModal'){saveDraft();closeEventTrend();}$('#'+id).classList.remove('open');$('#'+id).setAttribute('aria-hidden','true');previousFocus?.focus();}
  function statusMatch(e,value){return value==='all'||(value==='handled'?Boolean(e.handledAt):!e.handledAt);}
  function renderAll(){
    const data=scopeEvents().filter(e=>{
      const q=$('#recordsSearch').value.trim().toLowerCase(),hours=$('#recordsRange').value;
      return (e.field+e.id).toLowerCase().includes(q)&&($('#recordsDevice').value==='all'||e.device===$('#recordsDevice').value)&&($('#recordsSeverity').value==='all'||e.highest===$('#recordsSeverity').value)&&statusMatch(e,$('#recordsStatus').value)&&(hours==='all'||e.start>=Date.now()-Number(hours)*3600000);
    }).sort((a,b)=>b.start-a.start);
    $('#recordsScope').textContent=contextText();
    $('#recordsSummary').innerHTML='<span><strong>'+data.length+'</strong>个事件</span><span><strong>'+data.filter(e=>!e.handledAt).length+'</strong>未处理</span><span><strong>'+data.filter(e=>e.handledAt).length+'</strong>已处理</span>';
    $('#recordsRows').innerHTML=data.map(e=>'<tr><td><button class="record-link" data-event="'+e.id+'">'+esc(e.field)+'</button><small class="record-field">'+esc(e.device)+' · '+e.id+'</small></td><td>'+levelLabel(e.highest,color(e))+'</td><td>'+stamp(e.start)+'</td><td>'+duration(e)+'</td><td>'+dataState(e)+'</td><td><span class="event-tag">'+(e.handledAt?'已处理':'未处理')+'</span></td><td><div class="table-actions"><button data-event="'+e.id+'">'+(e.handledAt?'查看':'查看 / 处理')+'</button></div></td></tr>').join('')||'<tr><td colspan="7" class="records-empty">该范围暂无预警事件</td></tr>';
  }
  function placeField(){
    const trend=$('#trendPanel').getBoundingClientRect(),panel=$('#fieldRecords');
    const width=Math.min(380,window.innerWidth-24);
    panel.style.left=Math.max(12,trend.left-width-12)+'px';
    panel.style.width=width+'px';
    panel.style.top=Math.max(12,trend.top)+'px';
  }
  function renderField(){
    if(!$('#fieldRecords').classList.contains('open'))return;
    const source=api.trendSource();if(!source)return closeField();
    fieldSource=source;const found=api.findSource(source);if(!found)return closeField();
    const range=$('#fieldRecordsRange').value;let bounds=api.bounds();
    $('#fieldRecordsCustom').hidden=range!=='custom';
    if(range==='all')bounds={start:new Date(0),end:new Date()};
    else if(range==='custom'){const start=new Date($('#fieldRecordsStart').value),end=new Date($('#fieldRecordsEnd').value);if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end)return;bounds={start,end};}
    else if(range!=='trend')bounds={start:new Date(Date.now()-Number(range)*3600000),end:new Date()};
    $('#fieldRecordsTitle').textContent=(api.fields().find(f=>f.code===found.metric.standardCode)?.name||found.metric.name)+' · 预警记录';
    $('#fieldRecordsSubtitle').textContent=range==='all'?'全部时间':stamp(bounds.start)+' — '+stamp(bounds.end)+(range==='trend'?' · 沿用趋势范围':'');
    const sort=$('#fieldRecordsSort').value;
    const elapsed=e=>(e.handledAt||Date.now())-e.start;
    const data=scopeEvents().filter(e=>e.code===found.metric.standardCode&&e.start>=bounds.start&&e.start<=bounds.end&&($('#fieldRecordsSeverity').value==='all'||e.highest===$('#fieldRecordsSeverity').value)&&statusMatch(e,$('#fieldRecordsStatus').value)).sort((a,b)=>sort==='oldest'?a.start-b.start:sort==='severity'?api.severityNames.indexOf(b.highest)-api.severityNames.indexOf(a.highest)||b.start-a.start:sort==='duration'?elapsed(b)-elapsed(a)||b.start-a.start:b.start-a.start);
    $('#fieldRecordRows').innerHTML=data.map(e=>'<article class="record-mini"><div class="record-mini-head">'+levelLabel(e.highest,color(e))+'<span class="event-tag">'+(e.handledAt?'已处理':'未处理')+'</span></div><strong>'+e.id+'</strong><p>'+esc(e.device)+'<br>首次预警：'+stamp(e.start)+'<br>预警极值：'+esc(e.value)+esc(unit(e))+'<br>事件时长：'+duration(e)+' · '+dataState(e)+'</p><div class="table-actions"><button data-event="'+e.id+'">'+(e.handledAt?'查看结果':'查看 / 处理')+'</button><button data-event-trend="'+e.id+'">定位趋势</button></div></article>').join('')||'<div class="records-empty">所选时间范围内暂无事件</div>';
    placeField();
  }
  function closeField(){$('#fieldRecords').classList.remove('open');$('#fieldRecords').setAttribute('aria-hidden','true');}
  function saveDraft(){const e=events.find(e=>e.id===selectedId);if(!e||e.handledAt)return;const draft=drafts.get(e.id);if(draft){draft.method=$('#eventMethod').value;draft.description=$('#eventDescription').value;}}
  function renderFiles(){
    const draft=drafts.get(selectedId);if(!draft)return;
    const list=(files,kind)=>files.map((file,index)=>'<div class="event-file '+(kind==='photos'?'photo':'')+'">'+(kind==='photos'?'<a href="'+file.url+'" target="_blank" rel="noopener"><img src="'+file.url+'" alt="'+esc(file.name)+'"></a>':'<a href="'+file.url+'" download="'+esc(file.name)+'">'+esc(file.name)+'</a>')+'<div class="table-actions"><button class="danger-link" data-remove-file="'+kind+':'+index+'">移除</button></div></div>').join('');
    $('#eventPhotoList').innerHTML=list(draft.photos,'photos');$('#eventFileList').innerHTML=list(draft.files,'files');
  }
  function showEvent(id){
    saveDraft();const e=events.find(e=>e.id===id);if(!e)return;selectedId=id;
    closeEventTrend();
    if($('#fieldRecords').classList.contains('open'))locate(e);
    const found=sourceOf(e.pumpId,e.source),level=activeLevel(e);
    $('#eventTitle').textContent=e.field+' · '+e.id;$('#eventSubtitle').textContent=e.path+' / '+e.device;
    const cells=[['处理状态',e.handledAt?'已处理，事件已结束':'未处理，事件未结束'],['当前数据状态',dataState(e)],['当前等级',level?.severity||'无当前预警'],['最高等级',e.highest],['首次预警时间',stamp(e.start)],['事件时长',duration(e)],['预警极值',e.value+unit(e)],['当前值',found?found.metric.value+unit(e):'暂无数据']];
    $('#eventOverview').innerHTML=cells.map(([label,value])=>'<div><span>'+label+'</span>'+esc(value)+'</div>').join('');
    $('#eventTimeline').innerHTML=e.timeline.slice().sort((a,b)=>a.time-b.time).map(item=>'<li><time>'+stamp(item.time)+'</time><span class="event-node-label">'+esc(nodeKind(item.text))+'</span><div>'+esc(item.text)+'</div></li>').join('');
    $('#eventAISuggestion').textContent=e.code.includes('pressure')?'建议核查压力传感器信号与现场压力表是否一致，并结合阀门开度、运行工况排查；处理前确认现场设备状态。':'建议核查采集信号、设备负载与异常时段的工况变化，并对照现场测量结果判断。';
    $('#eventProcessSection').hidden=Boolean(e.handledAt);$('#eventResultSection').hidden=!e.handledAt;$('#submitEventProcess').hidden=Boolean(e.handledAt);
    $('#eventFormError').textContent='';
    if(e.handledAt){
      const r=e.result;
      $('#eventResult').innerHTML='处理方式：'+esc(r.method)+'<br>处理说明：'+esc(r.description)+'<br>处理人：'+esc(r.operator)+'<br>处理时间：'+stamp(e.handledAt)+'<br>现场照片：'+r.photos.length+' 张 · 附件：'+r.files.length+' 个'+r.photos.map(f=>'<div class="event-file photo"><a href="'+f.url+'" target="_blank" rel="noopener"><img src="'+f.url+'" alt="'+esc(f.name)+'"></a></div>').join('')+r.files.map(f=>'<div><a href="'+f.url+'" download="'+esc(f.name)+'">'+esc(f.name)+'</a></div>').join('');
    }else{
      if(!drafts.has(id))drafts.set(id,{method:'',description:'',photos:[],files:[]});
      const draft=drafts.get(id);$('#eventMethod').value=draft.method;$('#eventDescription').value=draft.description;renderFiles();
    }
    open('eventModal');
  }
  function nodeKind(text){
    if(text.includes('首次触发'))return'首次触发';
    if(text.includes('升级'))return'等级升级';
    if(text.includes('等级下降'))return'等级下降';
    if(text.includes('数值下降'))return'数值下降';
    if(text.includes('数值上升'))return'数值上升';
    if(text.includes('恢复'))return'数据恢复';
    if(text.includes('再次异常'))return'再次异常';
    if(text.includes('结束'))return'处理结束';
    return'状态记录';
  }
  function closeEventTrend(){
    $('#eventTrendDrawer').hidden=true;$('#eventModal').classList.remove('with-event-trend');
    $('#eventViewTrend').setAttribute('aria-expanded','false');
  }
  function openEventTrend(e){
    const start=e.start,end=Date.now(),found=sourceOf(e.pumpId,e.source),rule=e.ruleSnapshot;
    const boolean=api.fields().find(f=>f.code===e.code)?.type==='BOOLEAN';
    const anchors=e.timeline.filter(item=>item.value!=null).map(item=>({time:item.time,value:boolean?(String(item.value)==='运行'||String(item.value)==='1'||String(item.value)==='true'?1:0):Number(item.value)})).filter(item=>Number.isFinite(item.value)).sort((a,b)=>a.time-b.time);
    if(!anchors.length)anchors.push({time:start,value:boolean?0:Number(e.value)||0});
    if(anchors[0].time>start)anchors.unshift({time:start,value:anchors[0].value});
    const current=boolean?(String(found?.metric.value)==='运行'||String(found?.metric.value)==='1'||String(found?.metric.value)==='true'?1:0):Number(found?.metric.value??anchors.at(-1).value);
    anchors.push({time:end,value:current});
    const points=Array.from({length:61},(_,i)=>{
      const time=start+(end-start)*i/60;
      let index=anchors.findIndex(item=>item.time>=time);if(index<0)index=anchors.length-1;
      const b=anchors[index],a=anchors[Math.max(0,index-1)],ratio=(time-a.time)/(b.time-a.time||1);
      return{time,value:boolean?a.value:a.value+(b.value-a.value)*Math.max(0,Math.min(1,ratio))};
    });points.at(-1).value=current;
    const levels=rule?.levels||[],limits=boolean?[]:levels.flatMap(level=>[level.min,level.max].filter(v=>v!=null));
    const values=[...points.map(p=>p.value),...limits],low=boolean?0:Math.min(...values),high=boolean?1:Math.max(...values),pad=boolean?.15:Math.max((high-low)*.15,.01);
    const min=low-pad,max=high+pad,x=time=>44+(time-start)/(end-start||1)*358,y=value=>20+(1-(value-min)/(max-min||1))*210;
    const grid=Array.from({length:5},(_,i)=>{const v=max-(max-min)*i/4;return'<line x1="44" y1="'+y(v)+'" x2="402" y2="'+y(v)+'" stroke="#e0e7f0"/><text x="39" y="'+(y(v)+4)+'" text-anchor="end" fill="#8b96a7" font-size="10">'+(boolean?v>.8?'1':v<.2?'0':'':v.toFixed(2))+'</text>';}).join('');
    let path='M '+x(points[0].time)+' '+y(points[0].value);points.slice(1).forEach(p=>{path+=boolean?' H '+x(p.time)+' V '+y(p.value):' L '+x(p.time)+' '+y(p.value);});
    const thresholds=boolean?'':levels.map(level=>['min','max'].filter(side=>level[side]!=null).map(side=>'<line x1="44" y1="'+y(level[side])+'" x2="402" y2="'+y(level[side])+'" stroke="'+level.color+'" stroke-dasharray="5 4"/><text x="398" y="'+(y(level[side])-4)+'" text-anchor="end" fill="'+level.color+'" font-size="10">'+esc(level.severity)+' '+level[side]+'</text>').join('')).join('');
    const dots=e.timeline.filter(item=>item.value!=null).map(item=>'<circle cx="'+x(item.time)+'" cy="'+y(boolean?(String(item.value)==='运行'?1:0):Number(item.value))+'" r="4" fill="'+(api.matchedLevel(item.value,rule)?.color||'#298ed6')+'"><title>'+esc(stamp(item.time)+' · '+item.text)+'</title></circle>').join('');
    $('#eventTrendChart').innerHTML=grid+thresholds+'<path d="'+path+'" fill="none" stroke="#298ed6" stroke-width="2"/>'+dots+'<text x="44" y="258" fill="#8792a3" font-size="10">'+stamp(start).split(' ')[1]+'</text><text x="402" y="258" fill="#8792a3" font-size="10" text-anchor="end">现在</text>';
    $('#eventTrendTitle').textContent=e.field+' · 事件趋势';$('#eventTrendRange').textContent=stamp(start)+' — '+stamp(end);
    $('#eventTrendLegend').innerHTML=levels.map(level=>'<span style="color:'+level.color+'">● '+esc(level.severity)+'</span>').join('');
    $('#eventTrendNodes').innerHTML='<strong>事件节点</strong>'+e.timeline.map(item=>'<div>'+stamp(item.time)+' · '+esc(nodeKind(item.text))+'</div>').join('');
    $('#eventTrendDrawer').hidden=false;$('#eventModal').classList.add('with-event-trend');$('#eventViewTrend').setAttribute('aria-expanded','true');
  }
  function locate(e){
    const start=e.start-30*60000,end=Math.min(Date.now(),(e.handledAt||e.start+60*60000)+30*60000);
    api.setRange(localDate(start),localDate(end));api.openTrend(e.source);renderField();
  }
  $('#submitEventProcess').addEventListener('click',()=>{
    const e=events.find(e=>e.id===selectedId);if(!e||e.handledAt)return;
    saveDraft();const draft=drafts.get(e.id);
    if(!draft.method||!draft.description.trim()){$('#eventFormError').textContent='请选择处理方式并填写处理说明。';return;}
    e.handledAt=Date.now();e.result={...draft,operator:'项目配置人员（演示）'};
    e.timeline.push({time:e.handledAt,text:'提交处理 · '+draft.method+' · 事件结束'});
    drafts.delete(e.id);showEvent(e.id);renderAll();renderField();api.refresh();api.toast('事件已处理，两个入口已同步');
  });
  ['eventPhotos','eventFiles'].forEach(id=>$('#'+id).addEventListener('change',event=>{
    const draft=drafts.get(selectedId);if(!draft)return;
    const kind=id==='eventPhotos'?'photos':'files';
    [...event.target.files].forEach(file=>{
      if(kind==='photos'&&!file.type.startsWith('image/'))return api.toast('请选择图片文件');
      draft[kind].push({name:file.name,url:URL.createObjectURL(file)});
    });event.target.value='';renderFiles();
  }));
  overlay.addEventListener('click',event=>{
    const closeButton=event.target.closest('[data-records-close]');if(closeButton)return close(closeButton.dataset.recordsClose);
    const remove=event.target.closest('[data-remove-file]');if(remove){const[kind,index]=remove.dataset.removeFile.split(':'),draft=drafts.get(selectedId);URL.revokeObjectURL(draft[kind][index].url);draft[kind].splice(Number(index),1);return renderFiles();}
    const trend=event.target.closest('[data-event-trend]');if(trend)return locate(events.find(e=>e.id===trend.dataset.eventTrend));
    const button=event.target.closest('[data-event]');if(button)return showEvent(button.dataset.event);
    if(event.target.classList.contains('modal-layer'))close(event.target.id);
  });
  $('#eventViewTrend').addEventListener('click',()=>{const e=events.find(e=>e.id===selectedId);if(e)openEventTrend(e);});
  $('#closeEventTrend').addEventListener('click',closeEventTrend);
  entry.addEventListener('click',()=>{
    ensureEvents();$('#recordsDevice').innerHTML='<option value="all">全部来源PLC</option>'+[...new Set(scopeEvents().map(e=>e.device))].map(name=>'<option>'+esc(name)+'</option>').join('');
    renderAll();open('recordsModal');
  });
  const openField=()=>{if(!api.trendSource())return;const bounds=api.bounds();$('#fieldRecordsStart').value=localDate(bounds.start);$('#fieldRecordsEnd').value=localDate(bounds.end);$('#fieldRecords').classList.add('open');$('#fieldRecords').setAttribute('aria-hidden','false');renderField();};
  trendEntry.addEventListener('click',openField);
  trendEntry.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();openField();}});
  $('#closeFieldRecords').addEventListener('click',closeField);
  ['recordsSearch','recordsDevice','recordsSeverity','recordsStatus','recordsRange'].forEach(id=>$('#'+id).addEventListener(id==='recordsSearch'?'input':'change',renderAll));
  ['fieldRecordsSeverity','fieldRecordsStatus','fieldRecordsRange','fieldRecordsSort'].forEach(id=>$('#'+id).addEventListener('change',renderField));
  $('#applyFieldRecordsRange').addEventListener('click',()=>{const start=new Date($('#fieldRecordsStart').value),end=new Date($('#fieldRecordsEnd').value);if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end)return api.toast('请选择有效的开始和结束时间');renderField();});
  $('#plcMetricSections').addEventListener('click',renderField);
  $('#trendRangeButtons').addEventListener('click',renderField);
  $('#applyCustomTrendRange').addEventListener('click',renderField);
  $('#trendClose').addEventListener('click',closeField);$('#plcClose').addEventListener('click',closeField);
  $('#plcManagementEntry').addEventListener('click',closeField);
  window.addEventListener('resize',()=>{if($('#fieldRecords').classList.contains('open'))placeField();});
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if($('#expandedTrendModal')?.classList.contains('open'))return;
    if($('#eventModal').classList.contains('open')){event.stopImmediatePropagation();close('eventModal');}
    else if($('#recordsModal').classList.contains('open')){event.stopImmediatePropagation();close('recordsModal');}
    else if($('#fieldRecords').classList.contains('open')){event.stopImmediatePropagation();closeField();}
  },true);
  window.PLCRecords={trendEvents,events,showEvent,renderAll,renderField,updateBadge,selectedEvent:()=>events.find(e=>e.id===selectedId)};
  ensureEvents();api.refresh();
})();
