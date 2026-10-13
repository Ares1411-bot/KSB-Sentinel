const fs=require('fs'),vm=require('vm'),assert=require('assert');
// Startup smoke check using a minimal DOM adapter; does not replace browser QA.
const nodes=new Map();
class Node {
 constructor(id=''){this.id=id;this.value='';this.hidden=false;this.dataset={};this.style={};this.innerHTML='';this.listeners={};this.attrs={};const s=new Set();this.classList={add:(...a)=>a.forEach(x=>s.add(x)),remove:(...a)=>a.forEach(x=>s.delete(x)),contains:x=>s.has(x),toggle:(x,v)=>{if(v===undefined)v=!s.has(x);v?s.add(x):s.delete(x);}};}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);} fire(type,event={}){event.target||=this;for(const fn of this.listeners[type]||[])fn(event);} setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]||'';} focus(){} append(){} insertAdjacentElement(){} getBoundingClientRect(){return{left:500,top:100};} querySelector(s){return node(s);} querySelectorAll(){return [];} closest(s){return s==='[data-expanded-range]'&&this.dataset.expandedRange?this:null;}
}
function node(s){if(!nodes.has(s))nodes.set(s,new Node(s));return nodes.get(s);}
const document=new Node();document.querySelector=node;document.createElement=()=>new Node();document.body=new Node();document.activeElement=new Node();
const window={innerWidth:1500,addEventListener(){}};
const ctx=vm.createContext({document,window,Date,console,URL,Map,Set,setTimeout(){},clearTimeout(){},setInterval(){},localStorage:{getItem(){return null;},setItem(){}},requestAnimationFrame:fn=>fn()});
const script=fs.readFileSync('dist/index.html','utf8').match(/<script>\s*([\s\S]*?)<\/script>/)[1];
vm.runInContext(script,ctx);
assert(node('#plcMetricSections').innerHTML.includes('进口压力'));
assert(node('#plcMetricSections').innerHTML.includes('mini-expand'));
for(const file of ['alert-records.js','expanded-trends.js'])vm.runInContext(fs.readFileSync('dist/assets/'+file,'utf8'),ctx);
window.sentinelPrototype.openTrend('plc-main:in-pressure');
assert(node('#trendChart').innerHTML.includes('<path'));
window.sentinelPrototype.openTrend('plc-main:out-pressure');
const card=node('#plcMetricSections').innerHTML;
assert.equal((card.match(/aria-pressed="true"/g)||[]).length,1);
assert(card.includes('data-trend-source="plc-main:in-pressure" type="button" aria-pressed="false"'));
assert(card.includes('data-trend-source="plc-main:out-pressure" type="button" aria-pressed="true"'));
assert(node('#plcUnhandledBadge').textContent>0);
window.PLCExpandedTrends.open('plc-main:in-pressure');
assert(node('#expandedTrendChart').innerHTML.includes('<path'));
window.PLCExpandedTrends.close();
console.log('PASS full page startup, PLC card contents including mini trends, records and expanded trends initialization, parameter trend rendering');

// Exercise the actual warning editor listeners with editable DOM row values.
document.getElementById=id=>node('#'+id);
let rowMarkup='',warningInputs=[];
document.querySelectorAll=selector=>{
 if(selector!=='#warningLevelRows [data-level-prop]')return [];
 const html=node('#warningLevelRows').innerHTML;
 if(html===rowMarkup)return warningInputs;
 rowMarkup=html;warningInputs=[];
 for(const match of html.matchAll(/<tr data-level-index="(\d+)">([\s\S]*?)<\/tr>/g)){
  const row=new Node();row.dataset.levelIndex=match[1];
  for(const item of match[2].matchAll(/<input\b[^>]*>|<select\b[^>]*>[\s\S]*?<\/select>/g)){
   const tag=item[0],prop=tag.match(/data-level-prop="([^"]+)"/)?.[1];if(!prop)continue;
   const input=new Node();input.dataset.levelProp=prop;
   if(tag.startsWith('<input'))input.value=tag.match(/value="([^"]*)"/)?.[1]||'';
   else{const options=[...tag.matchAll(/<option([^>]*)>([^<]*)<\/option>/g)],option=options.find(o=>/selected/.test(o[1]))||options[0];input.value=option?.[1].match(/value="([^"]*)"/)?.[1]??option?.[2]??'';}
   input.closest=()=>row;warningInputs.push(input);
  }
 }
 return warningInputs;
};
const editor=code=>{const row=new Node();row.dataset.warningField=code;node('#warningRuleTableBody').fire('click',{target:{closest:s=>s==='[data-warning-field]'?row:null}});};
const inputs=()=>document.querySelectorAll('#warningLevelRows [data-level-prop]');
const rows=()=>[...node('#warningLevelRows').innerHTML.matchAll(/<tr data-level-index=/g)].length;
const assign=(prop,values)=>{const all=inputs();all.filter(i=>i.dataset.levelProp===prop).forEach((i,n)=>{const severity=all.find(s=>s.dataset.levelProp==='severity'&&s.closest()===i.closest())?.value;const index=['min','max'].includes(prop)&&values.length===4?['提示','一般','重要','严重'].indexOf(severity):n;i.value=String(values[index]);});};
const scope=mode=>{const target=new Node();target.dataset.warningScope=mode;target.closest=()=>target;node('#warningScopeSwitch').fire('click',{target});};
const pump=id=>node('#alertPumpSelect').fire('change',{target:{value:id}});
const api=window.sentinelPrototype;
assert(!api.rules().running_status,'default boolean rule must be absent');
editor('running_status');assert(node('#toast').textContent.includes('仅支持设备'));
editor('current_ab');assert.equal(rows(),1);
node('#addWarningLevel').fire('click');assert.equal(rows(),2,'add level must append a row');
assert(inputs().some(i=>i.dataset.levelProp==='max'&&i.value==='10.5'),'existing input preserved');
node('#addWarningLevel').fire('click');node('#addWarningLevel').fire('click');assert.equal(rows(),4);assert(node('#addWarningLevel').disabled);
assert(!node('#warningLevelRows').innerHTML.includes('data-level-prop="condition"'),'condition is shared');
node('#warningConditionInput').value='min';node('#warningConditionInput').fire('change');assign('min',[10,8,6,4]);
node('#saveWarningRule').fire('click');assert.equal(node('#warningRuleFormError').textContent,'');assert.equal(api.rules().current_ab.condition,'min');assert(api.rules().current_ab.levels.every(l=>l.max==null&&l.min!=null));assert(!('duration' in api.rules().current_ab));
scope('pump');editor('current_ab');assert(node('#inheritDefaultRule').checked);
node('#inheritDefaultRule').checked=false;node('#inheritDefaultRule').fire('change');assign('min',[7,5,3,1]);node('#saveWarningRule').fire('click');
assert.equal(api.effectiveThresholdRule('current_ab').levels[0].min,7);assert.equal(api.rules().current_ab.levels[0].min,10,'custom save cannot modify platform default');
editor('running_status');assert(node('#warningLevelRows').innerHTML.includes('<select data-level-prop="abnormalValue"'));assert(node('#warningLevelRows').innerHTML.includes('value="停止"'));
assign('abnormalValue',['停止']);node('#saveWarningRule').fire('click');assert.equal(api.effectiveThresholdRule('running_status').levels[0].abnormalValue,'停止');
pump('pump-omega-2');assert.equal(api.effectiveThresholdRule('current_ab').levels[0].min,10,'other device inherits default');assert(!api.effectiveThresholdRule('running_status'));
editor('running_status');assert(node('#warningLevelRows').innerHTML.includes('value="0"'));assert(!node('#warningLevelRows').innerHTML.includes('value="停止"'),'PLC enums follow selected device');assign('abnormalValue',['0']);node('#saveWarningRule').fire('click');assert.equal(api.effectiveThresholdRule('running_status').levels[0].abnormalValue,'0');
pump('pump-omega-1');assert.equal(api.effectiveThresholdRule('running_status').levels[0].abnormalValue,'停止');
editor('current_ab');node('#inheritDefaultRule').checked=true;node('#inheritDefaultRule').fire('change');node('#saveWarningRule').fire('click');assert.equal(api.effectiveThresholdRule('current_ab').levels[0].min,10,'restore inherited rule');
node('#alertProjectSelect').fire('change',{target:{value:'project-east'}});assert.equal(api.context().project.id,'project-east');assert.equal(api.context().unit.id,'unit-pressure');assert.equal(api.context().pump.id,'pump-pressure-1');
assert(!api.effectiveThresholdRule('running_status'),'boolean custom rules remain isolated across projects');
assert(!fs.readFileSync('dist/index.html','utf8').includes('warningDurationInput'));
console.log('PASS add levels, shared numeric condition, scoped rules/inheritance, device PLC boolean enums, project isolation, removed duration');

const targetData=(key,value,selector)=>({dataset:{[key]:value},closest:s=>s===selector?{dataset:{[key]:value}}:null});
const groupTab=name=>node('#deviceGroupTabs').fire('click',{target:targetData('deviceGroup',name,'[data-device-group]')});
const pointAction=(body,index)=>node(body).fire('click',{target:targetData('pointDelete',String(index),'[data-point-delete]')});
const editPoint=(body,index,field,value)=>node(body).fire('input',{target:{dataset:{field},value,closest:s=>s==='tr'?{dataset:{index:String(index)}}:null}});
const setGroup=(name,frequency)=>{node('#pointGroupName').value=name;node('#pointGroupFrequency').value=String(frequency);node('#savePointGroup').fire('click');assert.equal(node('#pointGroupError').textContent,'');};
const openTemplate=id=>node('#templateTableBody').fire('click',{target:targetData('mapTemplate',id,'[data-map-template]')});
node('#addPlcButton').fire('click');node('#wizardNext').fire('click');
assert.equal(node('#deviceProtocolDetails').open,false);assert(node('#deviceProtocolFields').innerHTML.includes('机架号'));
node('#deviceProtocolFields').fire('input',{target:{dataset:{protocolField:'rack'},value:'7',type:'number'}});
node('#deviceProtocolDetails').open=true;node('#deviceProtocolDetails').open=false;
assert(node('#deviceGroupTabs').innerHTML.includes('运行控制'));assert(node('#deviceGroupTabs').innerHTML.includes('压力与频率'));
pointAction('#devicePointBody',0);assert(node('#devicePointBody').innerHTML.includes('point-pending-delete'));assert(node('#devicePointBody').innerHTML.includes('恢复'));assert(node('#devicePointBody').innerHTML.includes('disabled'));
pointAction('#devicePointBody',0);assert(!node('#devicePointBody').innerHTML.includes('point-pending-delete'));
groupTab('压力与频率');pointAction('#devicePointBody',1);
node('#addDeviceGroup').fire('click');setGroup('设备新增组',2);assert(node('#deviceGroupTabs').innerHTML.includes('设备新增组'));assert(node('#deviceGroupMeta').textContent.includes('2 Hz'));assert(node('#devicePointBody').innerHTML.includes('暂无点位'));
node('#addDevicePoint').fire('click');assert(node('#devicePointBody').innerHTML.includes('POINT_5'));
editPoint('#devicePointBody',4,'name','新组点位');
node('#wizardPrevious').fire('click');node('#wizardNext').fire('click');assert(node('#deviceGroupTabs').innerHTML.includes('设备新增组'),'wizard back/forward preserves draft');
node('#deviceNameInput').value='组功能检查PLC';node('#wizardNext').fire('click');
node('#connectionVisual').fire('click',{target:targetData('failureAction','skip','[data-failure-action]')});
let savedDevice=api.devices().at(-1);assert.equal(savedDevice.name,'组功能检查PLC');assert(savedDevice.groups.some(g=>g.name==='设备新增组'&&g.frequency===2));assert(!savedDevice.points.some(p=>p.key==='IN_PRESS'));assert(savedDevice.points.some(p=>p.name==='新组点位'&&p.templateGroup==='设备新增组'));assert(savedDevice.points.every(p=>!p.deleted));
assert.equal(savedDevice.protocolConfig.rack,'7','collapsed device protocol edits are saved');
openTemplate('tpl-s7');assert(!node('#templatePointBody').innerHTML.includes('point-pending-delete'),'device deletion does not change template');assert(node('#templatePointBody').innerHTML.includes('data-field="address"'));assert(node('#templatePointBody').innerHTML.includes('data-field="description"'));
assert.equal(node('#templateProtocolDetails').open,false);assert(!node('#templateProtocolFields').innerHTML.includes('value="7"'),'device protocol edit must not change template');
node('#templateProtocolFields').fire('input',{target:{dataset:{protocolField:'rack'},value:'5',type:'number'}});
node('#templateProtocolInput').value='Modbus TCP';node('#templateProtocolInput').fire('change');assert(node('#templateProtocolFields').innerHTML.includes('字节序'));
node('#templateProtocolInput').value='S7';node('#templateProtocolInput').fire('change');assert(node('#templateProtocolFields').innerHTML.includes('value="5"'),'protocol values preserved on switching');
node('#templateNameInput').value='编辑后的S7模板';editPoint('#templatePointBody',0,'name','编辑后状态点');editPoint('#templatePointBody',0,'address','DB9.DBX0.0');
node('#addTemplateGroup').fire('click');setGroup('诊断组',5);node('#addTemplatePoint').fire('click');editPoint('#templatePointBody',4,'address','DB9.DBD2');
node('#saveTemplateButton').fire('click');assert.equal(node('#templateFormError').textContent,'');assert(node('#templateTableBody').innerHTML.includes('编辑后的S7模板'));
openTemplate('tpl-s7');assert.equal(node('#templateNameInput').value,'编辑后的S7模板');assert(node('#templatePointBody').innerHTML.includes('编辑后状态点'));assert(node('#templatePointBody').innerHTML.includes('DB9.DBX0.0'));assert(node('#templateGroupTabs').innerHTML.includes('诊断组'));
node('#addTemplateButton').fire('click');assert.equal(node('#templateNameInput').value,'');assert(node('#templateProtocolFields').innerHTML.includes('请选择协议'));
node('#templateNameInput').value='新建RTU模板';node('#templateProtocolInput').value='Modbus RTU';node('#templateProtocolInput').fire('change');assert(node('#templateProtocolFields').innerHTML.includes('type="radio"'));assert(node('#templateProtocolFields').innerHTML.includes('<select'));
node('#templateProtocolFields').fire('change',{target:{dataset:{protocolField:'parity'},value:'奇校验',type:'radio',checked:true}});
node('#addTemplatePoint').fire('click');node('#saveTemplateButton').fire('click');assert(node('#templateFormError').textContent.includes('地址'));
editPoint('#templatePointBody',0,'address','40001');node('#saveTemplateButton').fire('click');assert.equal(node('#templateFormError').textContent,'');
const row=node('#templateTableBody').innerHTML.match(/<tr><td>新建RTU模板[\s\S]*?<\/tr>/)[0];const newId=row.match(/data-map-template="([^"]+)"/)[1];
openTemplate(newId);assert(node('#templateProtocolFields').innerHTML.includes('value="奇校验" checked'));assert(node('#templatePointBody').innerHTML.includes('40001'));
console.log('PASS device group tabs/add/frequency, point delete/restore/save exclusion, editable templates, new template validation, protocol dynamic fields/cache');

