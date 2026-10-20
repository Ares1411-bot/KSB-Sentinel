const assert=require('assert'),{storage,createEnvironment}=require('./startup-smoke.cjs');
const files=['shared/js/event-timeline.js','shared/js/session.js','shared/js/hierarchy.js','shared/js/shell.js','alerts/runtime.js','alerts/data/demo-data.js','alerts/data-views.js','alerts/pump-demo.js','alerts/source-fields.js','alerts/app.js'];
const standalone=createEnvironment();standalone.load(files);assert(standalone.window.SentinelAlertCenter.events.some(e=>e.sourceType==='PLC'));assert(!standalone.window.sentinelPrototype);
const {node,document,window,load}=createEnvironment(storage);load(files);
const targetData=(key,value,selector)=>({dataset:{[key]:value},closest:s=>s===selector?{dataset:{[key]:value}}:null});
const center=window.SentinelAlertCenter,centerRoot=node('#alertCenterRoot');
const markup=require('fs').readFileSync('dist/alerts/index.html','utf8');assert(!markup.includes('id="acStartProcess"'));assert(!markup.includes('id="acViewAdvice"'));assert(!markup.includes('来源分析与数据'));assert(!markup.includes('<img'));assert(markup.includes('ac-advice-column'));
node('#openAlertCenterBell').fire('click');assert(node('#alertCenter').classList.contains('open'));
assert(center.events.some(e=>e.sourceType==='PLC'));assert(node('#acStats').innerHTML.includes('严重未处理'));
const unreadBadge=node('#alertCenterBadge').textContent;center.show('PHM-001');assert(center.events.find(e=>e.id==='PHM-001').read);assert.equal(node('#alertCenterBadge').textContent,unreadBadge,'read does not clear unhandled count');
assert(center.startProcessing('PHM-001'));assert.equal(center.events.find(e=>e.id==='PHM-001').status,'progress');assert.equal(center.events.find(e=>e.id==='PHM-001').handler,null);
assert(!center.process('PHM-001',{method:'现场检修',description:''}));assert(center.process('PHM-001',{method:'现场检修',description:'已现场核查并处理'}));assert.equal(center.events.find(e=>e.id==='PHM-001').status,'closed');
const configuredHandler=center.events.find(e=>e.id==='APM-001').handler;center.process('APM-001',{method:'参数调整',description:'确认完成'});assert.equal(center.events.find(e=>e.id==='APM-001').handler,configuredHandler);assert.equal(center.events.find(e=>e.id==='APM-001').result.operator,'InternalDemo');
center.recover('PHM-003');assert.equal(center.events.find(e=>e.id==='PHM-003').status,'pending');
center.recover('APM-004');assert.equal(center.events.find(e=>e.id==='APM-004').status,'notice');assert(!center.process('APM-004',{method:'其他',description:'无需处理'}));center.show('APM-004');assert(node('#acSubmitProcess').hidden);assert(node('#acNoProcess').hidden===false);
const payload={pumpId:'pump-omega-1',module:'APM',sourceType:'APM',eventKey:'smoke:merge',type:'efficiency',level:'一般',needManual:true,recordMode:'merge',notifyMode:'first_upgrade'};
const merged=center.ingest(payload);assert.equal(center.ingest(payload).id,merged.id);assert.equal(merged.notificationCount,1);center.ingest({...payload,level:'重要'});assert.equal(merged.notificationCount,2);assert.equal(merged.level,'重要');
center.recover(merged.id);assert.equal(center.ingest(payload).id,merged.id,'recovered but unhandled event remains merged');
const otherDevice=center.ingest({...payload,pumpId:'pump-omega-2'});assert.notEqual(otherDevice.id,merged.id,'same key cannot merge across devices');
center.process(merged.id,{method:'其他',description:'事件完成'});assert.notEqual(center.ingest(payload).id,merged.id,'handled event ends merge window');
const eachPayload={...payload,eventKey:'smoke:each',recordMode:'each',notifyMode:'each',needManual:false};const once=center.ingest(eachPayload),twice=center.ingest(eachPayload);assert.notEqual(once.id,twice.id);assert.equal(once.status,'notice');assert.equal(twice.notificationCount,1);
const perNotify={...payload,eventKey:'smoke:notify',notifyMode:'each'};const n=center.ingest(perNotify);center.ingest(perNotify);assert.equal(n.notificationCount,2);
const future=center.ingest({...payload,eventKey:'future',module:'SPM',type:'future-type',typeName:'新增预警类型',details:{来源结果:'可扩展字段'},needManual:false});assert(node('#acModule').innerHTML.includes('SPM'));assert(node('#acType').innerHTML.includes('新增预警类型'));center.show(future.id);assert.equal(future.details.来源结果,'可扩展字段');
const plc=center.events.find(e=>e.origin&&!e.origin.handledAt);assert(plc);center.process(plc.id,{method:'现场检修',description:'从统一中心处理PLC事件'});assert(plc.origin.handledAt);assert.equal(plc.origin.result.description,'从统一中心处理PLC事件');
centerRoot.fire('click',{target:targetData('acTab','notice','[data-ac-tab]')});assert(center.filtered().every(e=>!e.needManual));
centerRoot.fire('click',{target:targetData('acTab','offline','[data-ac-tab]')});assert(!node('#acOfflineSection').hidden);assert(node('#acOfflineRows').innerHTML.includes('能效采集网关'));
centerRoot.fire('click',{target:targetData('acConnection','apm-gateway','[data-ac-connection]')});assert.equal(center.events.find(e=>e.id==='OFF-003').status,'pending');assert.equal(center.events.find(e=>e.id==='OFF-003').dataState,'online');
centerRoot.fire('click',{target:targetData('acStat','serious','[data-ac-stat]')});assert(center.filtered().every(e=>e.needManual&&e.status!=='closed'&&e.level==='严重'));
centerRoot.fire('click',{target:targetData('acTab','all','[data-ac-tab]')});node('#acLevel').value='all';node('#acModule').value='APM';node('#acModule').fire('change');assert(center.filtered().every(e=>e.module==='APM'));
node('#acProject').fire('change',{target:{value:'project-east'}});assert(center.filtered().every(e=>e.projectId==='project-east'));
center.show('PHM-001');assert(!node('#acOverview').innerHTML.includes('最高等级'));assert(!node('#acOverview').innerHTML.includes('预警类型'));assert(!node('#acOverview').innerHTML.includes('数据状态'));
node('#acViewTrend').fire('click');assert(!node('#acTrendDrawer').hidden);assert(!node('#acDataPlaceholder').hidden);assert(node('#acDataPreview').hidden);assert(!node('#acAdviceContent').hidden);
for(const [id,key,label] of [['PHM-002','fault','时域图'],['PHM-001','vibration','雷达图'],['APM-001','operating','工况指标'],['APM-001','performance','性能评分']]){center.show(id);node('#acViewTrend').fire('click');node('#acDataExamples').fire('click',{target:targetData('acData',key,'[data-ac-data]')});assert(!node('#acDataPreview').hidden);assert(node('#acDataDrawing').innerHTML.includes('<svg'));assert(!node('#acDataDrawing').innerHTML.includes('<img'));assert(node('#acDataDrawing').innerHTML.includes(label));assert(node('#acDataPlaceholder').hidden);}
node('#acExpandTrend').fire('click');assert(node('#acTrendModal').classList.contains('open'));assert(node('#acBigDrawing').innerHTML.includes('整体性能退化'));node('#acCloseBigTrend').fire('click');assert(node('#acDetailModal').classList.contains('open'));
assert(!node('#acAdviceContent').hidden);center.show('PHM-001');assert(node('#acAdviceContent').innerHTML.includes('风险提示'));
center.show('APM-001');assert(node('#acAdviceContent').innerHTML.includes('能效风险建议'));
const diagnosis=center.events.find(e=>e.module==='PHM'&&e.type==='diagnosis');assert(diagnosis);center.show(diagnosis.id);assert(node('#acAdviceContent').innerHTML.includes('重新调整泵组对中'));
center.show('APM-001');node('#acViewTrend').fire('click');node('#acDataExamples').fire('click',{target:targetData('acData','operating','[data-ac-data]')});node('#acDataDrawing').fire('click',{target:targetData('acCurve','efficiency','[data-ac-curve]')});assert(node('#acDataDrawing').innerHTML.includes('Q-η'));
center.show(plc.id);assert(!node('#acOverview').innerHTML.includes('最高等级'));assert(node('#acAdviceContent').innerHTML.includes('来源未提供建议'));node('#acViewTrend').fire('click');assert(!node('#acDataPlaceholder').hidden);assert(!node('#acAdviceContent').hidden);
console.log('PASS alert center startup, filters/stats, read separation, processing/source handler, no-manual events, merge/each/notifications, device isolation, future type, PLC bridge, offline recovery and trends');


const stored=window.SentinelSession.get('plc.events',[]).find(e=>e.id===plc.origin.id);assert(stored.handledAt);
const reload=createEnvironment(storage);reload.load(files);const ids=reload.window.SentinelAlertCenter.events.map(e=>e.id);assert.equal(new Set(ids).size,ids.length,'reload does not duplicate imported events');
const filtered=createEnvironment(storage,'?source=PLC&field=inlet_pressure');filtered.load(files);assert(filtered.window.SentinelAlertCenter.filtered().every(e=>e.origin?.code==='inlet_pressure'||e.standardCode==='inlet_pressure'));
const back=createEnvironment(storage,'','plc');back.load(['shared/js/event-timeline.js','shared/js/session.js','shared/js/hierarchy.js','shared/js/shell.js','plc/data/demo-data.js','plc/app.js','plc/events.js','plc/records-view.js','plc/alerts-link.js']);assert(back.window.PLCRecords.events.find(e=>e.id===stored.id).handledAt);assert(back.node('#templateTableBody').innerHTML.includes('新建RTU模板'));
console.log('PASS isolated alert startup, filtered cross-page navigation, handling round trip, session configuration and duplicate-free reload');

node('#acOpenPumpDemo').fire('click');
const pumpDemo=center.events.find(e=>e.id==='PHM-PUMP-DEMO-001'),countBefore=center.events.length;
assert.equal(pumpDemo.level,null);assert.equal(pumpDemo.pumpCase.issues.length,3);assert.equal(pumpDemo.pumpCase.feedbacks[0].items.length,4);assert(node('#acPumpIssues').innerHTML.includes('75.51%'));
assert.equal(pumpDemo.pumpCase.issues.filter(e=>e.component==='轴承').length,0);
for(let step=1;step<5;step++){node('#acPumpNext').fire('click');assert.equal(pumpDemo.pumpCase.step,step);assert.equal(center.events.length,countBefore);assert.equal(pumpDemo.status,'pending');}
assert.equal(pumpDemo.pumpCase.issues.length,4);assert(pumpDemo.pumpCase.issues.every(e=>e.status==='normal'));assert.equal(pumpDemo.dataState,'recovered');assert.equal(pumpDemo.notificationCount,1);assert(node('#acHistory').innerHTML.includes('全部恢复'));assert(!node('#acSubmitProcess').hidden);
assert(center.process(pumpDemo.id,{method:'现场检修',description:'核查联轴器对中及振动提示，完成整泵事件处理'}));center.show(pumpDemo.id);node('#acPumpNext').fire('click');
const newPumpEvent=center.events.at(-1);assert.notEqual(newPumpEvent.id,pumpDemo.id);assert(newPumpEvent.pumpCase);assert.equal(center.events.length,countBefore+1);assert.equal(pumpDemo.status,'closed');
node('#acPumpReset').fire('click');assert.equal(newPumpEvent.pumpCase.step,0);assert.equal(newPumpEvent.status,'pending');
const detached=window.PHMPumpDemo.create({pumpId:'test-pump'}),initial=detached.pumpCase.feedbacks[0];assert(!window.PHMPumpDemo.applyFeedback(detached,initial),'duplicate feedback ignored');
assert(window.PHMPumpDemo.applyFeedback(detached,{...initial,feedbackId:'missing-item',analysisTime:initial.analysisTime+1,items:[{key:'bearing:health',status:'normal'}]}));assert.equal(detached.pumpCase.issues.filter(i=>i.status==='abnormal').length,3,'missing items cannot imply recovery');
assert(!window.PHMPumpDemo.applyFeedback(detached,{...initial,feedbackId:'other-pump',pumpId:'different',analysisTime:initial.analysisTime+2}));
const pumpReload=createEnvironment(storage);pumpReload.load(files);assert(pumpReload.window.SentinelAlertCenter.events.find(e=>e.id===pumpDemo.id).pumpCase.issues.length===4);
console.log('PASS PHM pump aggregate: one event, source hints, repeat/add/recovery, normal-module exclusion, duplicate protection, handling and new incident');

for(const id of ['PHM-001','PHM-TEMP-DEMO','PHM-002','APM-OPERATING-DEMO','APM-PERFORMANCE-DEMO',plc.id]){
 center.show(id);const overview=node('#acOverview').innerHTML;
 for(const label of ['事件编号','预警来源','预警类别','所属设备','所属位置','首次预警时间','处理状态'])assert(overview.includes(label),id+': '+label);
 for(const label of ['最高等级','数据状态','事件时长','实际处理操作人','通知次数','算法反馈'])assert(!overview.includes(label),id+': removed '+label);
 assert(node('#acMessageText').textContent);assert(overview.includes('配置处理人')===Boolean(center.events.find(e=>e.id===id).handler));
}
center.show('PHM-TEMP-DEMO');assert(node('#acOverview').innerHTML.includes('异常预警'));assert(node('#acMessageText').textContent.includes('温度异常预警'));assert(node('#acOverview').innerHTML.includes('1#机房'));node('#acViewTrend').fire('click');assert(node('#acDataButtons').innerHTML.includes('data-ac-data="trend"'));assert(!node('#acDataButtons').innerHTML.includes('data-ac-data="vibration"'));
center.show('PHM-001');node('#acViewTrend').fire('click');assert(node('#acDataButtons').innerHTML.includes('相关性信息'));assert(!node('#acDataButtons').innerHTML.includes('工况详情'));assert(node('#acDataSourceFields').innerHTML.includes('振动有效值'));
center.show('APM-PERFORMANCE-DEMO');assert(node('#acOverview').innerHTML.includes('性能预警'));assert(!node('#acOverview').innerHTML.includes('能效预警'));node('#acViewTrend').fire('click');assert(node('#acDataButtons').innerHTML.includes('能效详情'));assert(!node('#acDataButtons').innerHTML.includes('振动信息'));node('#acDataExamples').fire('click',{target:targetData('acData','energy','[data-ac-data]')});assert(node('#acDataDrawing').innerHTML.includes('尚未提供'));
const incomplete=center.ingest({eventKey:'smoke:no-body',pumpId:'pump-omega-1',module:'SPM',type:'unknown',title:'未提供专业字段',needManual:false});center.show(incomplete.id);assert(node('#acOverview').innerHTML.includes('来源未提供'));assert(node('#acMessageText').textContent.includes('来源尚未提供消息正文'));node('#acViewTrend').fire('click');assert(node('#acDataExamples').hidden);
const reloadedCommon=createEnvironment(storage);reloadedCommon.load(files);const commonSaved=reloadedCommon.window.SentinelAlertCenter.events.find(e=>e.id==='PHM-TEMP-DEMO');assert(commonSaved.sourceMessage.includes('温度异常预警'));assert(commonSaved.sourceLocation.includes('1#机房'));
console.log('PASS shared overview, verbatim source message, optional handler, missing data/time, category adapters, source-only views and saved metadata');

for(const [id,expected,excluded] of [['APM-ENERGY-DEMO','能效风险建议',['工况风险建议','性能风险建议']],['APM-OPERATING-DEMO','工况风险建议',['能效风险建议','性能风险建议']],['APM-PERFORMANCE-DEMO','性能风险建议',['能效风险建议','工况风险建议']]]){center.show(id);const advice=node('#acAdviceContent').innerHTML;assert(advice.includes(expected));excluded.forEach(label=>assert(!advice.includes(label)));}
const timeline=window.SentinelTimeline,input=[{time:100,changeId:'x',text:'数值上升 · 0.29 → 0.31 MPa',value:.31},{time:200,changeId:'x',text:'等级升级 · 提示 → 一般',value:.31},{time:300,changeId:'y',text:'等级下降 · 一般 → 提示，事件未结束',value:.30},{time:310,changeId:'y',text:'数值下降 · 0.31 → 0.30 MPa',value:.30},{time:400,text:'数据恢复正常，事件仍待处理'}];
const rawBefore=JSON.stringify(input),mergedRows=timeline.nodes(input,{unit:'MPa'});assert.equal(mergedRows.length,3);assert.equal(mergedRows[0].kind,'等级升级');assert.equal(mergedRows[0].text,'提示→一般 / 0.29→0.31 MPa');assert.equal(mergedRows[0].time,100);assert.equal(mergedRows[0].endTime,200);assert(mergedRows[1].text.includes('一般→提示 / 0.31→0.30 MPa'));assert.equal(JSON.stringify(input),rawBefore);
assert.equal(timeline.nodes([{time:100,changeId:'a',text:'数值上升 · 1 → 2 MPa',value:2},{time:100,changeId:'b',text:'等级升级 · 提示 → 一般',value:2}]).length,2,'different observations cannot merge');
assert.equal(timeline.nodes([{time:100,text:'数值上升 · 1 → 2 MPa',value:2},{time:500,text:'等级升级 · 提示 → 一般',value:2}]).length,2,'time proximity is not correlation');
assert.equal(timeline.nodes([{time:100,changeId:'a',text:'数值上升 · 1 → 2 MPa',value:2},{time:100,changeId:'a',text:'等级升级 · 提示 → 一般',value:3}]).length,2,'conflicting values cannot merge');
const pressure=window.SentinelSession.get('plc.events').find(e=>e.timeline[0]?.text==='首次触发 · 提示 · 0.29 MPa');assert(pressure);center.show('PLC:'+pressure.id);assert(node('#acHistory').innerHTML.includes('提示→一般 / 0.29→0.31 MPa'));assert(!node('#acHistory').innerHTML.includes('数值上升 · 0.29 → 0.31 MPa'));
console.log('PASS APM risk-specific advice, merged upgrade/downgrade value nodes, time spans, raw preservation and unrelated-change isolation');
