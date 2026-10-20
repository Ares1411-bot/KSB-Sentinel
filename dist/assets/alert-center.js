(() => {
  const api=window.sentinelPrototype,$=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stamp=t=>new Date(t).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const local=t=>{const d=new Date(t);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const levels=['提示','一般','重要','严重'],colors=['#2784d5','#bc9300','#df792d','#d95157'];
  const stateNames={pending:'待处理',progress:'处理中',closed:'已结束',notice:'无需处理'};
  const dataNames={abnormal:'异常中',recovered:'已恢复',unknown:'暂无实时数据',offline:'离线中',online:'在线',reminder:'一次性提醒'};
  const typeNames={threshold:'阈值异常',fluctuation:'波动异常',diagnosis:'潜在故障',efficiency:'能效偏离',reminder:'运行提醒',offline:'设备离线'};
  const hierarchy=api.hierarchy(),paths=[];
  hierarchy.forEach(project=>project.plants.forEach(plant=>plant.units.forEach(unit=>unit.pumps.forEach(pump=>paths.push({projectId:project.id,plantId:plant.id,unitId:unit.id,pumpId:pump.id,project:project.name,plant:plant.name,unit:unit.name,device:pump.name})))));
  const events=[],bridges=new Map(),checked=new Set(),drafts=new Map(),monitors=[];
  let serial=0,selectedId='',tab='all',page=1,onlyOpen=false,previousFocus=null,customBounds=null,trendEvent=null,trendBounds=null;
  const selection={projectId:'all',plantId:'all',unitId:'all',pumpId:'all'};
  const rank=e=>levels.indexOf(e.level),isOpen=e=>e.needManual&&e.status!=='closed';
  const hours=n=>Date.now()-n*3600000;
  const pathText=e=>[e.project,e.plant,e.unit,e.device].filter(Boolean).join(' / ');
  const tag=(text,color)=>'<span class="ac-tag" '+(color?'style="color:'+color+';background:'+color+'10;border-color:'+color+'30"':'')+'>'+esc(text)+'</span>';
  const levelTag=e=>tag(e.level,colors[rank(e)]||'#8792a3');
  const statusTag=e=>tag(stateNames[e.status],e.status==='pending'?'#b36e28':e.status==='progress'?'#2784d5':null);
  const elapsed=e=>{const mins=Math.max(1,Math.floor(((e.end||Date.now())-e.start)/60000));return mins>=60?Math.floor(mins/60)+'小时 '+mins%60+'分钟':mins+'分钟';};
  function normalize(input){
    const path=paths.find(p=>p.pumpId===input.pumpId)||(input.pumpId?{projectId:input.projectId||'unknown',plantId:input.plantId||'unknown',unitId:input.unitId||'unknown',pumpId:input.pumpId,project:input.project||'未提供项目',plant:input.plant||'未提供厂房',unit:input.unit||'未提供机组',device:input.device||input.pumpId}:paths[0]);
    const needManual=input.needManual!==false;
    return {...path,id:input.id||'AL-'+String(++serial).padStart(4,'0'),eventKey:input.eventKey||input.module+':'+input.type+':'+path.pumpId,module:input.module||'PHM',sourceType:input.sourceType||input.module||'PHM',type:input.type||'threshold',title:input.title||'设备预警',level:input.level||'一般',needManual,status:needManual?(input.status||'pending'):'notice',dataState:input.dataState||'abnormal',start:input.start||Date.now(),updated:input.updated||input.start||Date.now(),end:input.end||null,handler:input.handler||null,recordMode:input.recordMode||'merge',notifyMode:input.notifyMode||'first_upgrade',notificationCount:input.notificationCount??1,read:input.read||false,details:input.details||{},history:input.history||[{time:input.start||Date.now(),kind:'首次触发',text:'首次触发 · '+(input.level||'一般')}],series:input.series||null,result:input.result||null,processingActor:input.processingActor||null,origin:input.origin||null};
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
      if(input.series)old.series=input.series;
      refresh();return old;
    }
    if(input.type&&input.typeName)typeNames[input.type]=input.typeName;
    const event=normalize(input);events.push(event);refresh();return event;
  }
  function seed(input){events.push(normalize(input));}
  const numeric=(value,unit,threshold)=>({value,unit,threshold});
  seed({...paths[0],id:'PHM-001',eventKey:'demo:phm',module:'PHM',type:'threshold',title:'泵驱动端水平振动超限',level:'重要',start:hours(30),notificationCount:2,details:{测点:'泵驱动端 · 水平',当前值:'5.2 mm/s',预警依据:'大于 4.5 mm/s',数据来源:'PHM 振动监测（演示）'},series:numeric(5.2,'mm/s',4.5),history:[{time:hours(30),kind:'首次触发',text:'一般预警 · 4.8 mm/s'},{time:hours(25),kind:'等级升级',text:'一般 → 重要 · 5.2 mm/s'},{time:hours(2),kind:'重复触发',text:'持续异常归入原事件，未重复通知'}]});
  seed({...paths[0],id:'APM-001',eventKey:'demo:apm',module:'APM',type:'efficiency',title:'设备效率偏离设定范围',level:'一般',status:'progress',start:hours(7),handler:'APM 运维组（来源配置示例）',processingActor:'InternalDemo',details:{当前效率:'62%',参考下限:'70%',工况:'当前运行点',数据来源:'APM 能效监测（演示）'},series:numeric(62,'%',70),history:[{time:hours(7),kind:'首次触发',text:'效率低于设定下限'},{time:hours(6),kind:'开始处理',text:'InternalDemo 开始处理；来源配置处理人保持不变'}]});
  seed({...paths[1],id:'PHM-002',module:'PHM',type:'diagnosis',title:'联轴器存在潜在不对中故障',level:'严重',start:hours(20),details:{诊断对象:'联轴器',诊断结果:'潜在角度不对中',诊断依据:'关联测点频谱异常',数据来源:'PHM 故障诊断（演示）'}});
  seed({...paths[1],id:'APM-002',module:'APM',type:'reminder',title:'运行点变化提醒',level:'提示',needManual:false,dataState:'reminder',recordMode:'each',notifyMode:'each',start:hours(3),details:{提醒内容:'运行点出现变化，供工况回溯参考',数据来源:'APM 运行分析（演示）'}});
  seed({...paths[0],id:'PHM-003',module:'PHM',type:'fluctuation',title:'温度波动已恢复，仍待处理',level:'一般',dataState:'recovered',start:hours(48),details:{测点:'泵驱动端温度',当前值:'45 ℃',数据来源:'PHM 温度监测（演示）'},series:numeric(45,'℃',55),history:[{time:hours(48),kind:'首次触发',text:'温度发生波动异常'},{time:hours(40),kind:'数据恢复',text:'数据恢复；事件未经过人工处理，仍待处理'}]});
  seed({...paths.at(-2),id:'APM-003',module:'APM',type:'efficiency',title:'效率偏离事件已处理',level:'重要',status:'closed',dataState:'recovered',read:true,start:hours(72),end:hours(60),result:{method:'参数调整',description:'核对运行工况，调整参数后完成处理。（演示）',operator:'InternalDemo',time:hours(60),photos:[],files:[]},history:[{time:hours(72),kind:'首次触发',text:'出现效率偏离预警'},{time:hours(61),kind:'数据恢复',text:'运行数据恢复'},{time:hours(60),kind:'处理结束',text:'提交处理结果，事件结束'}]});
  seed({...paths[0],id:'APM-004',module:'APM',type:'efficiency',title:'低负载运行提醒',needManual:false,level:'提示',start:hours(4),series:numeric(38,'%',40),details:{当前负载:'38%',提醒依据:'低于 40%',数据来源:'APM 监测（演示）'}});
  seed({...paths.at(-2),id:'PHM-004',module:'PHM',type:'reminder',title:'状态变化通知',needManual:false,dataState:'reminder',level:'提示',recordMode:'each',notifyMode:'each',start:hours(2),details:{提醒内容:'设备状态发生变化，仅用于通知',数据来源:'PHM 状态监测（演示）'}});
  monitors.push({...paths[0],key:'collector-1',name:'1# 泵振动采集器',module:'PHM',state:'offline',since:hours(5)}, {...paths[1],key:'plc-2',name:'2# 泵主控 PLC',module:'PHM',state:'online',since:hours(2)}, {...paths.at(-2),key:'apm-gateway',name:'能效采集网关',module:'APM',state:'offline',since:hours(9)}, {...paths[0],key:'plc-1',name:'1# 泵主控 PLC',module:'PHM',state:'online',since:null}, {...paths[1],key:'apm-2',name:'2# 泵能效采集器',module:'APM',state:'online',since:null});
  seed({...paths[0],id:'OFF-001',eventKey:'offline:collector-1',module:'PHM',type:'offline',title:'1# 泵振动采集器离线',needManual:false,dataState:'offline',start:hours(5),details:{采集设备:'1# 泵振动采集器',最近接收时间:stamp(hours(5)),数据来源:'连接状态监测（演示）'}});
  seed({...paths[1],id:'OFF-002',eventKey:'offline:plc-2',module:'PHM',sourceType:'PLC',type:'offline',title:'2# 泵主控 PLC 离线后恢复',needManual:false,dataState:'online',start:hours(12),end:hours(2),history:[{time:hours(12),kind:'设备离线',text:'设备未传回数据'},{time:hours(2),kind:'设备恢复',text:'设备重新在线，无需人工处理'}],details:{采集设备:'2# 泵主控 PLC',数据来源:'连接状态监测（演示）'}});
  seed({...paths.at(-2),id:'OFF-003',eventKey:'offline:apm-gateway',module:'APM',type:'offline',title:'能效采集网关离线',needManual:true,level:'重要',dataState:'offline',start:hours(9),details:{采集设备:'能效采集网关',处理要求:'来源规则要求人工确认',数据来源:'连接状态监测（演示）'}});

  const container=document.createElement('div');
  container.innerHTML=`<section id="alertCenter" class="ac-view" aria-hidden="true" aria-labelledby="acTitle">
    <header class="ac-header"><button id="acBack" class="back-button" aria-label="返回设备页面">←</button><div><h1 id="acTitle">预警中心</h1><p>统一通知与处理 · PHM / APM / PLC</p></div><span class="ac-demo-tag">功能验证原型 · 演示数据</span><button id="acPolicyInfo" class="secondary-action">预警规范说明</button></header>
    <div class="ac-content"><section class="ac-scope"><div class="ac-scope-title">监控范围</div><label>项目<select id="acProject"></select></label><span>›</span><label>厂房<select id="acPlant"></select></label><span>›</span><label>机组<select id="acUnit"></select></label><span>›</span><label>设备<select id="acDevice"></select></label><div class="ac-scope-note" id="acScopeNote">全部项目</div></section>
    <div class="ac-stats-note">当前范围事件统计 · 不受列表时间筛选影响</div><div class="ac-stats" id="acStats"></div>
    <section class="ac-panel"><nav class="ac-tabs" id="acTabs" role="tablist" aria-label="预警业务分类"></nav>
      <div class="ac-filters"><label>来源模块<select id="acModule"><option value="all">全部模块</option><option>PHM</option><option>APM</option></select></label><label>来源类型<select id="acSourceType"><option value="all">全部来源</option><option>PHM</option><option>APM</option><option>PLC</option></select></label><label>预警类型<select id="acType"></select></label><label>预警等级<select id="acLevel"><option value="all">全部等级</option><option>提示</option><option>一般</option><option>重要</option><option>严重</option></select></label><label>时间范围<select id="acRange"><option value="all">全部时间</option><option value="24">最近24小时</option><option value="168">最近7天</option><option value="custom">自定义</option></select></label><label>排序<select id="acSort"><option value="priority">未结束与高等级优先</option><option value="newest">首次触发：最新优先</option><option value="oldest">首次触发：最早优先</option></select></label><label class="ac-search-label">搜索<input id="acSearch" type="search" placeholder="设备、预警内容或事件编号"></label></div>
      <div id="acCustomRange" class="ac-custom-range" hidden><input type="datetime-local" id="acStart" aria-label="查询开始时间"><span>至</span><input type="datetime-local" id="acEnd" aria-label="查询结束时间"><button id="acApplyRange" class="secondary-action">应用时间</button><span id="acRangeError" role="alert"></span></div>
      <div id="acOfflineSection" hidden><div class="ac-offline-head"><div><h2>设备连接监控</h2><p>离线监控独立展示，是否需要人工处理由来源规则决定。</p></div><select id="acOfflineState" aria-label="设备连接状态"><option value="all">全部连接状态</option><option value="offline">离线中</option><option value="online">在线 / 已恢复</option></select></div><div id="acOfflineStats" class="ac-offline-summary"></div><div class="ac-table-wrap"><table class="ac-table"><thead><tr><th>采集设备 / 所属设备</th><th>模块</th><th>连接状态</th><th>最近离线时间</th><th>离线时长</th><th>离线记录</th><th>操作</th></tr></thead><tbody id="acOfflineRows"></tbody></table></div></div>
      <div class="ac-list-toolbar"><div><strong id="acListCount"></strong><span id="acListHint"></span></div><button id="acReadSelected" class="secondary-action">标记选中已读</button></div>
      <div class="ac-table-wrap"><table class="ac-table ac-event-table"><thead><tr><th><input id="acSelectPage" type="checkbox" aria-label="选择当前页事件"></th><th>预警事件 / 设备</th><th>来源</th><th>类型 / 等级</th><th>首次触发 / 时长</th><th>数据状态</th><th>处理状态</th><th>配置处理人</th><th>操作</th></tr></thead><tbody id="acRows"></tbody></table></div>
      <footer class="ac-pagination"><span id="acPageInfo"></span><button id="acPrev" class="secondary-action">上一页</button><button id="acNext" class="secondary-action">下一页</button></footer>
    </section>
    <details class="ac-sim-panel"><summary><strong>规则兼容演示</strong><span>模拟来源配置，验证不同客户与预警类型的接入效果</span></summary><div class="ac-sim-content"><p id="acSimScope"></p><div class="ac-sim-controls"><label>演示来源<select id="acSimSource"><option value="phm">PHM 振动阈值</option><option value="apm">APM 能效偏离</option><option value="plc">PHM / PLC 压力阈值</option></select></label><label>处理要求<select id="acSimManual"><option value="yes">需要人工处理</option><option value="no">无需人工处理</option></select></label><label>事件记录<select id="acSimRecord"><option value="merge">同一异常归并</option><option value="each">每次预警独立记录</option></select></label><label>通知方式<select id="acSimNotify"><option value="first_upgrade">首次及升级时通知</option><option value="each">每次来源预警到达时通知</option></select></label><label>来源是否带处理人<select id="acSimHandler"><option value="no">不带处理人</option><option value="yes">带来源配置处理人</option></select></label></div><div class="ac-sim-actions"><button id="acSimTrigger" class="primary-action">模拟预警到达</button><button id="acSimUpgrade" class="secondary-action">模拟等级升级</button><button id="acSimRecover" class="secondary-action">模拟数据恢复</button><span id="acSimFeedback" role="status"></span></div><p class="ac-sim-note">这里的“每次”指一次来源预警结果，不是原始采样数据。配置只用于后续演示事件，不改动已存在的事件。</p></div></details>
    </div></section>
    <div id="acDetailModal" class="modal-layer ac-detail-modal" aria-hidden="true"><div class="ac-detail-workspace"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="acDetailTitle"><header class="modal-header"><div><h2 id="acDetailTitle"></h2><p id="acDetailPath"></p></div><button class="modal-close" id="acCloseDetail" aria-label="关闭事件详情">×</button></header><div class="modal-body ac-detail-body"><div class="ac-detail-grid">
      <aside class="ac-ai"><h3>AI 建议 ${tag('规划功能')}</h3><p>示例建议，尚未接入真实 AI 分析。</p><p id="acAIText"></p></aside>
      <div class="ac-history-column"><section><h3>事件概况</h3><div id="acOverview" class="ac-overview"></div><div id="acPolicies" class="ac-event-policies"></div></section><section class="ac-source-section"><h3>来源分析与数据</h3><div id="acSourceDetails"></div></section><section class="ac-history-section"><h3>事件过程</h3><div class="ac-history-scroll" tabindex="0" aria-label="滚动查看事件过程"><ol id="acHistory" class="ac-history"></ol></div></section></div>
      <aside class="ac-process-column"><section id="acProcessForm"><h3>事件处理</h3><div class="ac-handler-note" id="acHandlerNote"></div><label>处理方式 <em>*</em><select id="acMethod"><option value="">请选择</option><option>现场检修</option><option>参数调整</option><option>误报确认</option><option>其他</option></select></label><label>处理说明 <em>*</em><textarea id="acDescription" placeholder="填写原因、措施及处理结果"></textarea></label><div class="ac-upload-title">现场照片</div><div class="ac-upload"><label><input id="acPhotos" type="file" accept="image/*" multiple><span class="secondary-action">＋ 添加照片</span></label></div><div id="acPhotoList" class="ac-files"></div><div class="ac-upload-title">相关附件</div><div class="ac-upload"><label><input id="acFiles" type="file" multiple><span class="secondary-action">＋ 添加附件</span></label></div><div id="acFileList" class="ac-files"></div><p class="ac-local-note">附件仅本地预览；原型记录刷新后清空。</p><div id="acProcessError" class="form-error" role="alert"></div></section><section id="acProcessResult" hidden><h3>处理结果</h3><div id="acResultContent"></div></section><section id="acNoProcess" hidden><h3>无需人工处理</h3><p>来源规则指定此预警仅供关注，不进入待处理队列。</p><p>异常状态与处理要求独立；恢复后仍可查询记录。</p></section></aside>
      </div></div><footer class="modal-footer"><button id="acViewTrend" class="secondary-action">查看对应趋势</button><button id="acCloseDetailFooter" class="secondary-action">关闭</button><button id="acStartProcess" class="secondary-action">开始处理</button><button id="acSubmitProcess" class="primary-action">提交处理并结束事件</button></footer></section>
      <aside id="acTrendDrawer" class="ac-trend-drawer" hidden><header><div><h3 id="acTrendTitle"></h3><p id="acTrendRange"></p></div><button id="acCloseTrend" class="trend-close" aria-label="关闭趋势">×</button></header><div class="ac-trend-content"><button id="acExpandTrend" class="secondary-action">放大查看</button><svg id="acTrendChart" viewBox="0 0 420 280" role="img" aria-label="首次触发至当前的趋势图"></svg><div id="acTrendStats" class="ac-trend-stats"></div><p>首次触发至现在 · 演示数据</p></div></aside></div></div>
    <div id="acTrendModal" class="modal-layer ac-trend-modal" aria-hidden="true"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="acBigTrendTitle"><header class="modal-header"><h2 id="acBigTrendTitle"></h2><button id="acCloseBigTrend" class="modal-close" aria-label="关闭放大趋势">×</button></header><div class="modal-body"><div class="ac-big-range" id="acBigRanges"><button data-ac-trend-range="event" class="secondary-action">首次触发至现在</button><button data-ac-trend-range="1" class="secondary-action">1小时</button><button data-ac-trend-range="24" class="secondary-action">24小时</button><button data-ac-trend-range="custom" class="secondary-action">自定义</button></div><div id="acBigCustom" class="ac-custom-range" hidden><input type="datetime-local" id="acBigStart" aria-label="趋势开始时间"><span>至</span><input type="datetime-local" id="acBigEnd" aria-label="趋势结束时间"><button id="acBigApply" class="secondary-action">应用</button></div><p id="acBigRangeLabel"></p><div id="acBigStats" class="ac-trend-stats"></div><svg id="acBigChart" viewBox="0 0 1000 420" role="img" aria-label="放大事件趋势图"></svg></div></section></div>
    <div id="acInfoModal" class="modal-layer ac-info-modal" aria-hidden="true"><section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="acInfoTitle"><header class="modal-header"><h2 id="acInfoTitle">平台预警规范</h2><button id="acCloseInfo" class="modal-close" aria-label="关闭规范说明">×</button></header><div class="modal-body"><p>人工事件：待处理 → 处理中 → 提交结果 → 结束。数据恢复、已读和处理结束各自独立。</p><p>无需处理：只查询和关注，不进入待处理统计；设备离线单独监控，按来源规则决定是否要求人工处理。</p><p>事件记录与通知方式独立：默认同一未结束异常归并，首次及升级时通知；也可每次来源预警独立记录或通知。</p><p>来源配置带有处理人时中心保留并展示；本版不提供分配操作，实际处理操作人另行记录。</p><p>后续类型接入：共用事件概况、查询与处理记录；来源分析区域按预警类型扩展。专业内容缺失时显示“未提供”，不补造分析结论。</p></div></section></div>`;
  document.body.append(container);
  ['acModule','acSourceType','acType','acLevel','acRange','acOfflineState'].forEach(id=>$('#'+id).value='all');$('#acSort').value='priority';
  $('#acSimSource').value='phm';$('#acSimManual').value='yes';$('#acSimRecord').value='merge';$('#acSimNotify').value='first_upgrade';$('#acSimHandler').value='no';
  $('#acStart').value=local(hours(24));$('#acEnd').value=local(Date.now());
  function syncPLC(){
    (window.PLCRecords?.events||[]).forEach(source=>{
      const path=paths.find(p=>p.pumpId===source.pumpId);if(!path)return;
      const found=source.pumpId===api.pumpId()?api.findSource(source.source):null;
      const dataState=found?found.device.enabled===false||found.device.status!=='online'?'unknown':api.matchedLevel(found.metric.value,api.effectiveThresholdRule(source.code))?'abnormal':'recovered':'unknown';
      const id='PLC:'+source.id,old=bridges.get(id);
      const values={...path,id,eventKey:'PLC:'+source.pumpId+':'+source.source,module:'PHM',sourceType:'PLC',type:'threshold',title:source.field+'阈值预警',level:source.highest,needManual:true,status:source.handledAt?'closed':source.centerStatus||'pending',dataState,start:source.start,updated:source.timeline.at(-1)?.time||source.start,end:source.handledAt,history:source.timeline.map(item=>({time:item.time,kind:item.text.includes('升级')?'等级升级':item.text.includes('恢复')?'数据恢复':item.text.includes('结束')?'处理结束':'状态记录',text:item.text})),details:{标准字段:source.field,来源PLC:source.device,预警极值:source.value+' '+source.unit,当前值:found?found.metric.value+' '+source.unit:'未提供实时数据',数据来源:'PLC 预警记录（演示）'},series:typeof Number(source.value)==='number'&&Number.isFinite(Number(source.value))?numeric(Number(source.value),source.unit,source.ruleSnapshot?.levels?.[0]?.max??source.ruleSnapshot?.levels?.[0]?.min):null,result:source.result?{...source.result,time:source.handledAt}:null,origin:source};
      if(old){Object.assign(old,values);}else{const event=normalize(values);events.push(event);bridges.set(id,event);}
    });
  }
  const scopeMatch=e=>Object.entries(selection).every(([key,value])=>value==='all'||e[key]===value);
  const moduleMatch=e=>($('#acModule').value==='all'||e.module===$('#acModule').value)&&($('#acSourceType').value==='all'||e.sourceType===$('#acSourceType').value);
  const baseEvents=()=>events.filter(e=>scopeMatch(e)&&moduleMatch(e));
  const tabMatch=e=>tab==='all'||tab==='offline'?tab==='all'||e.type==='offline':tab==='notice'?!e.needManual:e.needManual&&e.status===tab;
  function filtered(){
    const query=$('#acSearch').value.trim().toLowerCase(),range=$('#acRange').value;
    const timeMatch=e=>range==='all'||range==='custom'&&(!customBounds||e.start>=customBounds.start&&e.start<=customBounds.end)||range!=='custom'&&e.start>=hours(Number(range));
    const data=baseEvents().filter(e=>(!onlyOpen||isOpen(e))&&tabMatch(e)&&($('#acType').value==='all'||e.type===$('#acType').value)&&($('#acLevel').value==='all'||e.level===$('#acLevel').value)&&[e.title,e.id,pathText(e),e.handler].join(' ').toLowerCase().includes(query)&&timeMatch(e));
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
    const base=baseEvents(),types=[...new Set([...Object.keys(typeNames),...events.map(e=>e.type)])];
    $('#acType').innerHTML='<option value="all">全部类型</option>'+types.map(code=>'<option value="'+esc(code)+'" '+($('#acType').value===code?'selected':'')+'>'+esc(typeNames[code]||code)+'</option>').join('');
    updateHeaderBadge();
    const cards=[['pending','待处理',base.filter(e=>e.needManual&&e.status==='pending').length,'待提交处理结果'],['progress','处理中',base.filter(e=>e.status==='progress').length,'正在处理的事件'],['serious','严重未处理',base.filter(e=>isOpen(e)&&e.level==='严重').length,'需优先关注'],['closed','已结束',base.filter(e=>e.needManual&&e.status==='closed').length,'已保存处理结果']];
    $('#acStats').innerHTML=cards.map(([key,title,count,note])=>'<button class="ac-stat '+key+'" data-ac-stat="'+key+'"><span>'+title+'</span><strong>'+count+'</strong><small>'+note+'</small></button>').join('');
    const tabs=[['all','全部'],['pending','待处理'],['progress','处理中'],['closed','已结束'],['notice','无需处理'],['offline','设备离线']];
    $('#acTabs').innerHTML=tabs.map(([value,title])=>'<button role="tab" aria-selected="'+(tab===value)+'" class="'+(tab===value?'active':'')+'" data-ac-tab="'+value+'">'+title+'<span>'+base.filter(e=>value==='all'||value==='offline'?value==='all'||e.type==='offline':value==='notice'?!e.needManual:e.needManual&&e.status===value).length+'</span></button>').join('');
    const data=filtered();page=Math.max(1,Math.min(page,Math.ceil(data.length/8)||1));pageData=data.slice((page-1)*8,page*8);
    $('#acListCount').textContent=data.length+' 个事件';$('#acListHint').textContent=onlyOpen?'仅展示严重未处理事件':tab==='notice'?'无需人工处理，不计入待处理数量':tab==='offline'?'离线事件记录；恢复与处理结束分别记录':'已读只影响通知阅读状态，不影响事件处理';
    $('#acRows').innerHTML=pageData.map(e=>'<tr><td><input type="checkbox" data-ac-check="'+esc(e.id)+'" '+(checked.has(e.id)?'checked':'')+' aria-label="选择'+esc(e.id)+'"></td><td><button class="ac-event-title" data-ac-event="'+esc(e.id)+'">'+(!e.read?'<i class="ac-unread" title="未读"></i>':'')+esc(e.title)+'</button><small>'+esc(e.device)+' · '+esc(e.id)+'</small><small>'+esc([e.project,e.plant,e.unit].join(' / '))+'</small></td><td>'+tag(e.module)+'<small>'+esc(e.sourceType)+'</small></td><td>'+esc(typeNames[e.type]||e.type)+'<br>'+levelTag(e)+'</td><td>'+stamp(e.start)+'<small>'+elapsed(e)+'</small></td><td>'+tag(dataNames[e.dataState]||e.dataState)+'</td><td>'+statusTag(e)+'<small>'+e.notificationCount+' 次通知</small></td><td>'+esc(e.handler||'未指定')+'</td><td><button class="ac-row-link" data-ac-event="'+esc(e.id)+'">'+(isOpen(e)?'查看 / 处理':'查看详情')+'</button></td></tr>').join('')||'<tr><td colspan="9" class="ac-empty">当前筛选范围内暂无预警事件</td></tr>';
    $('#acSelectPage').checked=pageData.length>0&&pageData.every(e=>checked.has(e.id));$('#acReadSelected').disabled=!checked.size;
    $('#acPageInfo').textContent='第 '+page+' / '+(Math.ceil(data.length/8)||1)+' 页';$('#acPrev').disabled=page===1;$('#acNext').disabled=page*8>=data.length;
    $('#acCustomRange').hidden=$('#acRange').value!=='custom';$('#acOfflineSection').hidden=tab!=='offline';if(tab==='offline')renderOffline();
  }
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
    const overview=[['来源模块',e.module+' / '+e.sourceType],['预警类型',typeNames[e.type]||e.type],['最高等级',e.level],['处理状态',stateNames[e.status]],['数据状态',dataNames[e.dataState]||e.dataState],['首次触发',stamp(e.start)],['事件时长',elapsed(e)],['配置处理人',e.handler||'未指定'],['实际处理操作人',e.result?.operator||e.processingActor||'尚未处理'],['通知次数',e.notificationCount+' 次']];
    $('#acOverview').innerHTML=overview.map(([k,v])=>'<div><span>'+k+'</span><strong>'+esc(v)+'</strong></div>').join('');
    $('#acPolicies').innerHTML=tag(e.recordMode==='each'?'每次预警独立记录':'同一异常归并')+tag(e.notifyMode==='each'?'每次来源预警通知':'首次及升级时通知');
    $('#acSourceDetails').innerHTML=Object.keys(e.details).length?Object.entries(e.details).map(([k,v])=>'<div><span>'+esc(k)+'</span><strong>'+esc(typeof v==='object'?JSON.stringify(v):v)+'</strong></div>').join(''):'<p class="ac-local-note">来源模块未提供分析与数据。</p>';
    $('#acHistory').innerHTML=e.history.slice().sort((a,b)=>a.time-b.time).map(h=>'<li><time>'+stamp(h.time)+'</time>'+tag(h.kind||'状态记录')+'<p>'+esc(h.text)+'</p></li>').join('');
    $('#acAIText').textContent=e.type==='offline'?'建议核查采集端供电与网络连接，并确认现场设备运行状态。（示例）':e.module==='APM'?'建议结合流量、扬程和当前运行点核查工况，确认指标变化原因。（示例）':'建议核查现场工况和采集信号，结合关联测点与历史趋势判断异常原因。（示例）';
    $('#acProcessForm').hidden=!isOpen(e);$('#acProcessResult').hidden=!e.result;$('#acNoProcess').hidden=e.needManual;
    $('#acStartProcess').hidden=!e.needManual||e.status!=='pending';$('#acSubmitProcess').hidden=!isOpen(e);$('#acViewTrend').hidden=!e.series;
    $('#acHandlerNote').textContent=e.handler?'来源配置处理人：'+e.handler+'。本版不提供重新分配；提交时另行记录实际操作人。':'来源未指定处理人。提交时记录当前实际操作人，本版不提供分配操作。';
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
    if(e.origin){e.origin.handledAt=time;e.origin.centerStatus='closed';e.origin.result={...e.result};e.origin.timeline.push({time,text:'提交处理 · '+result.method+' · 事件结束'});api.refresh();window.PLCRecords.renderAll();window.PLCRecords.renderField();}
    drafts.delete(id);render();return true;
  }
  function recover(id){const e=events.find(e=>e.id===id);if(!e)return;e.dataState=e.type==='offline'?'online':'recovered';e.updated=Date.now();e.recoveredAt=e.updated;if(e.type==='offline'){const monitor=monitors.find(m=>'offline:'+m.key===e.eventKey);if(monitor)monitor.state='online';}if(!e.needManual)e.end=e.updated;e.history.push({time:e.updated,kind:e.type==='offline'?'设备恢复':'数据恢复',text:e.needManual?'数据已恢复，人工事件仍需提交处理结果':'来源确认恢复，无需人工处理'});render();}
  function closeDetail(){saveDraft();closeTrend();$('#acDetailModal').classList.remove('open');$('#acDetailModal').setAttribute('aria-hidden','true');previousFocus?.focus();}
  function closeTrend(){$('#acTrendDrawer').hidden=true;$('#acDetailModal').classList.remove('with-trend');}
  function drawTrend(e,bounds,svgId,statsId,width=420,height=280){
    const v=e.series.value,threshold=e.series.threshold,unit=e.series.unit||'',count=41;
    const points=Array.from({length:count},(_,i)=>({time:+bounds.start+(bounds.end-bounds.start)*i/(count-1),value:v*(1+Math.sin(i*.48)*.055)+Math.cos(i*.22)*Math.max(Math.abs(v)*.018,.005)}));points.at(-1).value=v;
    const vals=points.map(p=>p.value),all=threshold==null?vals:[...vals,threshold],low=Math.min(...all),high=Math.max(...all),pad=Math.max((high-low)*.2,Math.abs(v)*.01,.01),min=low-pad,max=high+pad;
    const left=52,right=20,top=20,bottom=48,w=width-left-right,h=height-top-bottom,x=t=>left+(t-bounds.start)/(bounds.end-bounds.start||1)*w,y=n=>top+(1-(n-min)/(max-min))*h;
    const grid=Array.from({length:5},(_,i)=>{const value=max-(max-min)*i/4;return'<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y(value)+'" y2="'+y(value)+'" stroke="#e4ebf3"/><text x="'+(left-6)+'" y="'+(y(value)+4)+'" text-anchor="end" fill="#8792a3" font-size="10">'+value.toFixed(2)+'</text>';}).join('');
    const line=points.map((p,i)=>(i?'L':'M')+' '+x(p.time)+' '+y(p.value)).join(' '),ticks=[0,10,20,30,40].map(i=>'<text x="'+x(points[i].time)+'" y="'+(height-15)+'" text-anchor="'+(i===0?'start':i===40?'end':'middle')+'" fill="#8792a3" font-size="10">'+new Date(points[i].time).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit',hour12:false})+'</text>').join('');
    $(svgId).innerHTML=grid+(threshold==null?'':'<line x1="'+left+'" x2="'+(width-right)+'" y1="'+y(threshold)+'" y2="'+y(threshold)+'" stroke="#df792d" stroke-dasharray="6 4"/><text x="'+(width-right)+'" y="'+(y(threshold)-6)+'" fill="#bc742c" text-anchor="end" font-size="11">参考阈值 '+threshold+' '+esc(unit)+'</text>')+'<path d="'+line+'" stroke="#298ed6" stroke-width="2.2" fill="none"/>'+points.map(p=>'<circle cx="'+x(p.time)+'" cy="'+y(p.value)+'" r="2.8" fill="#fff" stroke="#298ed6"><title>'+esc(stamp(p.time)+' · '+p.value.toFixed(2)+' '+unit)+'</title></circle>').join('')+ticks;
    $(statsId).innerHTML=[['最小值',Math.min(...vals)],['平均值',vals.reduce((a,b)=>a+b,0)/vals.length],['最大值',Math.max(...vals)]].map(([name,value])=>'<div><span>'+name+'</span><strong>'+value.toFixed(2)+' '+esc(unit)+'</strong></div>').join('');
  }
  function showTrend(){const e=events.find(e=>e.id===selectedId);if(!e?.series)return;trendEvent=e;const bounds={start:new Date(e.start),end:new Date()};$('#acTrendTitle').textContent=e.title+' · 趋势';$('#acTrendRange').textContent=stamp(bounds.start)+' — '+stamp(bounds.end);drawTrend(e,bounds,'#acTrendChart','#acTrendStats');$('#acTrendDrawer').hidden=false;$('#acDetailModal').classList.add('with-trend');}
  function showBigTrend(){if(!trendEvent)return;trendBounds={start:new Date(trendEvent.start),end:new Date()};$('#acBigTrendTitle').textContent=trendEvent.title+' · 数据趋势';$('#acBigCustom').hidden=true;$('#acBigStart').value=local(trendBounds.start);$('#acBigEnd').value=local(trendBounds.end);$('#acTrendModal').classList.add('open');$('#acTrendModal').setAttribute('aria-hidden','false');renderBigTrend();}
  function renderBigTrend(){$('#acBigRangeLabel').textContent=stamp(trendBounds.start)+' — '+stamp(trendBounds.end)+' · 演示数据';drawTrend(trendEvent,trendBounds,'#acBigChart','#acBigStats',1000,420);}
  function closeBigTrend(){$('#acTrendModal').classList.remove('open');$('#acTrendModal').setAttribute('aria-hidden','true');}
  function simulate(upgrade=false){
    const source=$('#acSimSource').value,context=api.context(),p=paths.find(p=>p.pumpId===context.pump.id)||paths[0],existing=events.filter(e=>e.eventKey==='demo:'+source&&isOpen(e)).at(-1),level=upgrade?levels[Math.min(3,(existing?rank(existing):1)+1)]:'一般';
    const event=ingest({...p,eventKey:'demo:'+source,module:source==='apm'?'APM':'PHM',sourceType:source==='plc'?'PLC':source==='apm'?'APM':'PHM',type:source==='apm'?'efficiency':'threshold',title:source==='apm'?'设备效率偏离设定范围':source==='plc'?'进口压力阈值异常':'泵驱动端水平振动超限',level,needManual:$('#acSimManual').value==='yes',recordMode:$('#acSimRecord').value,notifyMode:$('#acSimNotify').value,handler:$('#acSimHandler').value==='yes'?'来源规则配置处理人（演示）':null,series:source==='apm'?numeric(62,'%',70):source==='plc'?numeric(.33,'MPa',.3):numeric(5.2,'mm/s',4.5),details:{数据来源:'规则兼容演示',说明:'用于验证来源规则接入，不修改模块的实际规则'}});
    $('#acSimFeedback').textContent=event.id+' · '+(event.recordMode==='each'?'独立记录':'归并事件')+' · '+event.notificationCount+' 次通知';return event;
  }
  function open(){syncPLC();$('#accountMenu').classList.remove('open');$('#accountMenu').setAttribute('aria-hidden','true');$('#userMenuButton').setAttribute('aria-expanded','false');$('#alertCenter').classList.add('open');$('#alertCenter').setAttribute('aria-hidden','false');$('#openAlertCenterBell').setAttribute('aria-expanded','true');render();}
  function close(){$('#alertCenter').classList.remove('open');$('#alertCenter').setAttribute('aria-hidden','true');$('#openAlertCenterBell').setAttribute('aria-expanded','false');}
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
  ['acCloseDetail','acCloseDetailFooter'].forEach(id=>$('#'+id).addEventListener('click',closeDetail));$('#acStartProcess').addEventListener('click',()=>{saveDraft();startProcessing(selectedId);show(selectedId);});
  $('#acSubmitProcess').addEventListener('click',()=>{saveDraft();if(!process(selectedId,drafts.get(selectedId)||{})){$('#acProcessError').textContent='请选择处理方式并填写处理说明。';return;}show(selectedId);api.toast('事件已处理，结果与过程已保存');});
  ['acPhotos','acFiles'].forEach(id=>$('#'+id).addEventListener('change',event=>{const draft=drafts.get(selectedId);if(!draft)return;const kind=id==='acPhotos'?'photos':'files';[...event.target.files].forEach(file=>{if(kind==='photos'&&!file.type.startsWith('image/'))return;draft[kind].push({name:file.name,url:URL.createObjectURL(file)});});event.target.value='';renderFiles();}));
  $('#acViewTrend').addEventListener('click',showTrend);$('#acCloseTrend').addEventListener('click',closeTrend);$('#acExpandTrend').addEventListener('click',showBigTrend);$('#acCloseBigTrend').addEventListener('click',closeBigTrend);
  $('#acBigRanges').addEventListener('click',event=>{const b=event.target.closest('[data-ac-trend-range]');if(!b)return;const value=b.dataset.acTrendRange;$('#acBigCustom').hidden=value!=='custom';if(value==='custom')return;trendBounds={start:new Date(value==='event'?trendEvent.start:hours(Number(value))),end:new Date()};renderBigTrend();});
  $('#acBigApply').addEventListener('click',()=>{const start=new Date($('#acBigStart').value),end=new Date($('#acBigEnd').value);if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end)return api.toast('请选择有效的趋势时间范围');trendBounds={start,end};renderBigTrend();});
  $('#acPolicyInfo').addEventListener('click',()=>{$('#acInfoModal').classList.add('open');$('#acInfoModal').setAttribute('aria-hidden','false');});$('#acCloseInfo').addEventListener('click',()=>{$('#acInfoModal').classList.remove('open');$('#acInfoModal').setAttribute('aria-hidden','true');});
  $('#acSimTrigger').addEventListener('click',()=>simulate());$('#acSimUpgrade').addEventListener('click',()=>simulate(true));$('#acSimRecover').addEventListener('click',()=>{const source=$('#acSimSource').value,e=events.filter(e=>e.eventKey==='demo:'+source&&(e.needManual?e.status!=='closed':e.dataState==='abnormal')).at(-1);if(!e)return api.toast('请先模拟一条预警');recover(e.id);$('#acSimFeedback').textContent=e.id+' 数据已恢复'+(e.needManual?'，仍需人工处理':'，无需处理');});
  window.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const big=$('#acTrendModal'),info=$('#acInfoModal'),detail=$('#acDetailModal');if(big.classList.contains('open'))closeBigTrend();else if(info.classList.contains('open')){info.classList.remove('open');info.setAttribute('aria-hidden','true');}else if(detail.classList.contains('open'))closeDetail();else if($('#alertCenter').classList.contains('open'))close();else return;event.preventDefault();event.stopImmediatePropagation();},true);
  window.SentinelAlertCenter={events,ingest,open,close,render,show,startProcessing,process,recover,filtered,simulate,monitors};
  if(window.PLCRecords){const original=window.PLCRecords.updateBadge;window.PLCRecords.updateBadge=()=>{original();syncPLC();updateHeaderBadge();};}
  syncPLC();render();
  if(window.location&&new URLSearchParams(window.location.search).get('view')==='alerts')open();
})();
