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

