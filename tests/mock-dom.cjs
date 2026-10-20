const fs=require('fs'),vm=require('vm');
module.exports=function createEnvironment(storage=new Map(),search='',prototype='alerts'){
// Startup smoke check using a minimal DOM adapter; does not replace browser QA.
const nodes=new Map();
class Node {
 constructor(id=''){this.id=id;this.value='';this.hidden=false;this.dataset={};this.style={};this.innerHTML='';this.listeners={};this.attrs={};const s=new Set();this.classList={add:(...a)=>a.forEach(x=>s.add(x)),remove:(...a)=>a.forEach(x=>s.delete(x)),contains:x=>s.has(x),toggle:(x,v)=>{if(v===undefined)v=!s.has(x);v?s.add(x):s.delete(x);}};}
 addEventListener(type,fn){(this.listeners[type]||=[]).push(fn);} fire(type,event={}){event.target||=this;for(const fn of this.listeners[type]||[])fn(event);} setAttribute(k,v){this.attrs[k]=v;} getAttribute(k){return this.attrs[k]||'';} focus(){} append(...children){this.children||=[];this.children.push(...children);} insertAdjacentElement(){} getBoundingClientRect(){return{left:500,top:100};} querySelector(s){return node(s);} querySelectorAll(){return [];} closest(s){return s==='[data-expanded-range]'&&this.dataset.expandedRange?this:null;}
}
function node(s){if(!nodes.has(s))nodes.set(s,new Node(s));return nodes.get(s);}
const document=new Node();document.querySelector=node;document.createElement=()=>new Node();document.body=new Node();document.activeElement=new Node();
const sessionStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)};
const window={sessionStorage,innerWidth:1500,addEventListener(){},location:{search,assign(url){this.lastURL=url;}}};document.body.dataset.prototype=prototype;document.getElementById=id=>node('#'+id);
const ctx=vm.createContext({document,window,Date,console,URL,URLSearchParams,sessionStorage,Map,Set,setTimeout(){},clearTimeout(){},setInterval(){},requestAnimationFrame:fn=>fn()});
function load(files){for(const file of files)vm.runInContext(fs.readFileSync('dist/'+file,'utf8'),ctx,{filename:file});}
return {node,document,window,ctx,load,storage};
};
