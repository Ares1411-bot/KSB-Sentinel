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

