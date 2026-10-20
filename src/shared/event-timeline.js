// Presentation adapter: preserve raw rows and merge only correlated changes.
(() => {
  const number='[-+]?\\d+(?:\\.\\d+)?';
  const numericChange=new RegExp('('+number+')\\s*[→→]\\s*('+number+')');
  const levelChange=/(提示|一般|重要|严重)\s*→\s*(提示|一般|重要|严重)/;
  function kind(row){const text=row.text||'';if(row.kind&&row.kind!=='状态记录')return row.kind;for(const [pattern,label] of [[/等级升级|升级/,'等级升级'],[/等级下降/,'等级下降'],[/首次触发/,'首次触发'],[/数值上升/,'数值上升'],[/数值下降/,'数值下降'],[/再次异常/,'再次异常'],[/恢复/,'数据恢复'],[/结束/,'处理结束']])if(pattern.test(text))return label;return row.kind||'状态记录';}
  const isLevel=row=>['等级升级','等级下降'].includes(kind(row));
  const isValue=row=>/^数值(上升|下降)$/.test(kind(row));
  function sameChange(a,b){
    if(a.changeId||b.changeId)return Boolean(a.changeId&&a.changeId===b.changeId);
    if(a.feedbackId||b.feedbackId)return Boolean(a.feedbackId&&a.feedbackId===b.feedbackId);
    // Old live rows used consecutive Date.now calls for the same observation.
    return Math.abs(Number(a.time)-Number(b.time))<=1;
  }
  function compatible(level,value){
    const change=value.text?.match(numericChange);if(!change)return false;
    if(level.value!=null&&Number(level.value)!==Number(change[2]))return false;
    if(level.source&&value.source&&level.source!==value.source)return false;
    return true;
  }
  function combine(level,value,unit){
    const levels=level.text.match(levelChange),values=value.text.match(numericChange);
    const heading=kind(level),levelText=levels?levels[1]+'→'+levels[2]:String(level.text||'').replace(/^等级(?:升级|下降)\s*[·：:]?\s*/,'');
    const suffix=String(value.text||'').slice((values?.index||0)+(values?.[0]?.length||0)).trim();
    const valueText=values?values[1]+'→'+values[2]+(suffix||unit?' '+(suffix||unit):''):value.text;
    const note=/事件未结束/.test(level.text)?'，事件未结束':'';
    return {...level,time:Math.min(level.time,value.time),endTime:Math.max(level.time,value.time),kind:heading,text:levelText+' / '+valueText+note,rawRows:[level,value],merged:true};
  }
  function nodes(rows,{unit=''}={}){
    const sorted=rows.map((row,index)=>({...row,_order:index})).sort((a,b)=>a.time-b.time||a._order-b._order),used=new Set(),result=[];
    sorted.forEach((row,index)=>{
      if(used.has(index))return;
      if(isLevel(row)||isValue(row)){
        const peer=sorted.findIndex((other,j)=>j!==index&&!used.has(j)&&(isLevel(row)?isValue(other):isLevel(other))&&sameChange(row,other)&&compatible(isLevel(row)?row:other,isValue(row)?row:other));
        if(peer>=0){used.add(peer);used.add(index);result.push(combine(isLevel(row)?row:sorted[peer],isValue(row)?row:sorted[peer],unit));return;}
      }
      result.push({...row,kind:kind(row)});
    });
    return result.sort((a,b)=>a.time-b.time);
  }
  window.SentinelTimeline={nodes,kind};
})();
