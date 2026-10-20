// Shared event identity and source-specific detail capabilities.
(() => {
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function category(event){
    if(event.category)return event.category;
    if(event.type==='offline')return '设备离线';
    if(event.sourceType==='PLC')return '阈值预警';
    if(event.module==='PHM'&&event.type==='diagnosis')return '故障诊断';
    if(event.module==='PHM'&&['threshold','fluctuation','abnormal'].includes(event.type))return '异常预警';
    if(event.module==='APM'&&['efficiency','energy'].includes(event.type))return '能效预警';
    if(event.module==='APM'&&event.type==='performance')return '性能预警';
    if(event.module==='APM'&&event.type==='operating')return '工况预警';
    return event.typeName||({reminder:'运行提醒'}[event.type])||'来源未提供类别';
  }
  const location=event=>event.sourceLocation||[event.project,event.plant,event.unit].filter(Boolean).join(' / ')||'来源未提供位置';
  const source=event=>event.sourceType==='PLC'?'PLC':event.module;
  function views(event){
    if(Array.isArray(event.dataViews))return event.dataViews;
    if(event.type==='offline')return [];
    if(event.sourceType==='PLC')return ['trend'];
    if(event.module==='PHM'&&event.type==='diagnosis')return ['fault'];
    if(event.module==='PHM'&&['threshold','fluctuation','abnormal'].includes(event.type))return event.details?.测点?.includes('温度')?['trend']:['trend','vibration','spectrum','correlation'];
    if(event.module==='APM'&&['efficiency','energy','performance','operating'].includes(event.type))return ['operating','performance','energy'];
    return [];
  }
  function details(event){
    if(event.sourceType==='PLC')return {...(event.details||{}),...(event.level?{最高等级:event.level}:{}),...(event.dataState?{数据状态:({abnormal:'异常中',recovered:'已恢复',unknown:'暂无实时数据'}[event.dataState]||event.dataState)}:{})};
    if(event.module==='PHM'&&category(event)==='异常预警')return Object.fromEntries(['异常数据源','异常端位','测点','当前值','预警依据'].filter(key=>event.details?.[key]!=null).map(key=>[key,event.details[key]]));
    if(event.module==='APM')return Object.fromEntries(['风险点','工况','诊断依据'].filter(key=>event.details?.[key]!=null).map(key=>[key,event.details[key]]));
    return {};
  }
  function detailMarkup(event){const fields=details(event);return Object.entries(fields).map(([name,value])=>'<div><span>'+esc(name)+'</span><strong>'+esc(value)+'</strong></div>').join('');}
  function apmRisk(event){const name=event.category||'';if(name.includes('能效'))return 'energy';if(name.includes('工况'))return 'operating';if(name.includes('性能'))return 'performance';return({efficiency:'energy',energy:'energy',operating:'operating',performance:'performance'})[event.type]||null;}
  window.SentinelSourceFields={category,location,source,views,detailMarkup,apmRisk};
})();
