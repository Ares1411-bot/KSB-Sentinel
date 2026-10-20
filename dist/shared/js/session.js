// Prototype-only, tab-scoped state. No server calls or production credentials.
(() => {
  const prefix='sentinel.prototype.v2.',memory=new Map();
  window.SentinelSession={
    get(key,fallback=null){try{const value=window.sessionStorage?.getItem(prefix+key)??memory.get(key);return value?JSON.parse(value):fallback;}catch{return fallback;}},
    set(key,value){try{const text=JSON.stringify(value);memory.set(key,text);try{window.sessionStorage?.setItem(prefix+key,text);}catch{}return true;}catch{return false;}},
    clear(){for(const key of ['context','plc.configuration','plc.events','alerts.events','alerts.monitors']){memory.delete(key);try{window.sessionStorage?.removeItem(prefix+key);}catch{}}}
  };
})();
