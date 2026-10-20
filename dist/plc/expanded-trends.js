(() => {
  const api=window.sentinelPrototype,$=s=>document.querySelector(s);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const local=v=>{const d=new Date(v);return new Date(+d-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const stamp=v=>new Date(v).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});
  const layer=document.createElement('div');
  layer.id='expandedTrendModal';layer.className='modal-layer expanded-trend-modal';layer.setAttribute('aria-hidden','true');
  layer.innerHTML=`<section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="expandedTrendTitle"><header class="modal-header"><div><h2 id="expandedTrendTitle">数据趋势</h2><p id="expandedTrendSubtitle"></p></div><button class="modal-close" id="closeExpandedTrend" aria-label="关闭放大趋势">×</button></header><div class="modal-body"><div class="trend-range" id="expandedTrendRanges"><button data-expanded-range="initial" class="active">当前时间段</button><button data-expanded-range="1">1小时</button><button data-expanded-range="6">6小时</button><button data-expanded-range="24">24小时</button><button data-expanded-range="168">7天</button><button data-expanded-range="custom">自定义</button></div><div class="record-custom-range" id="expandedTrendCustom" hidden><input type="datetime-local" id="expandedTrendStart" aria-label="放大趋势开始时间"><span>至</span><input type="datetime-local" id="expandedTrendEnd" aria-label="放大趋势结束时间"><button id="applyExpandedTrendRange" class="secondary-action">应用</button></div><div id="expandedTrendStats" class="trend-stats"></div><svg id="expandedTrendChart" class="trend-chart" viewBox="0 0 1000 420" role="img" aria-label="放大数据趋势图"></svg></div></section>`;
  document.body.append(layer);
  const button=document.createElement('button');button.id='expandMainTrend';button.type='button';button.className='secondary-action';button.textContent='放大查看';
  $('.trend-chart-caption').append(button);
  let state=null,previousFocus=null;
  const asBool=v=>['1','true','运行'].includes(String(v))?1:0;
  function eventSeries(event,bounds){
    const found=api.findSource(event.source),isStatus=api.fields().find(f=>f.code===event.code)?.type==='BOOLEAN';
    const anchors=event.timeline.filter(p=>p.value!=null).map(p=>({time:p.time,value:isStatus?asBool(p.value):Number(p.value)})).filter(p=>Number.isFinite(p.value)).sort((a,b)=>a.time-b.time);
    if(!anchors.length)anchors.push({time:event.start,value:isStatus?asBool(event.value):Number(event.value)||0});
    anchors.push({time:Date.now(),value:found?isStatus?asBool(found.metric.value):Number(found.metric.value):anchors.at(-1).value});
    const times=Array.from({length:61},(_,i)=>new Date(+bounds.start+(bounds.end-bounds.start)*i/60));
    const values=times.map(time=>{if(+time<=anchors[0].time)return anchors[0].value;let i=anchors.findIndex(p=>p.time>=+time);if(i<0)return anchors.at(-1).value;const a=anchors[Math.max(0,i-1)],b=anchors[i];return isStatus?a.value:a.value+(b.value-a.value)*(+time-a.time)/(b.time-a.time||1);});
    return{isStatus,times,values,rule:event.ruleSnapshot};
  }
  function render(){
    if(!state)return;
    const found=api.findSource(state.source);if(!found)return close();
    const {isStatus,times,values,rule}=state.event?eventSeries(state.event,state.bounds):api.series(found,state.bounds);
    const unit=found.metric.unit==='-'?'':found.metric.unit,format=v=>Number(v).toLocaleString('zh-CN',{maximumFractionDigits:found.metric.precision??2});
    $('#expandedTrendSubtitle').textContent=stamp(state.bounds.start)+' — '+stamp(state.bounds.end)+' · 演示数据';
    const avg=values.reduce((a,b)=>a+b,0)/values.length;
    const stats=isStatus?[['运行占比',Math.round(avg*100)+'%'],['状态切换',values.slice(1).filter((v,i)=>v!==values[i]).length+' 次'],['最近状态',values.at(-1)?'运行':'停止']]:[['最小值',format(Math.min(...values))+' '+unit],['平均值',format(avg)+' '+unit],['最大值',format(Math.max(...values))+' '+unit]];
    $('#expandedTrendStats').innerHTML=stats.map(([k,v])=>'<div class="trend-stat"><span>'+k+'</span><strong>'+esc(v)+'</strong></div>').join('');
    const levels=rule?.levels||[],limits=isStatus?[]:levels.flatMap(l=>[l.min,l.max].filter(v=>v!=null).map(Number));
    const low=isStatus?0:Math.min(...values,...limits),high=isStatus?1:Math.max(...values,...limits),pad=isStatus?.15:Math.max((high-low)*.15,.01),min=low-pad,max=high+pad;
    const x=i=>70+i/(times.length-1)*890,y=v=>25+(1-(v-min)/(max-min))*340;
    const grid=Array.from({length:5},(_,i)=>{const v=max-(max-min)*i/4;return'<line class="grid-line" x1="70" x2="960" y1="'+y(v)+'" y2="'+y(v)+'"/><text class="axis-label" x="60" y="'+(y(v)+4)+'" text-anchor="end">'+(isStatus?v>.8?'1':v<.2?'0':'':format(v))+'</text>';}).join('');
    let path='M '+x(0)+' '+y(values[0]);values.slice(1).forEach((v,i)=>path+=isStatus?' H '+x(i+1)+' V '+y(v):' L '+x(i+1)+' '+y(v));
    const thresholds=isStatus?'':levels.map(l=>['min','max'].filter(side=>l[side]!=null).map(side=>'<line x1="70" x2="960" y1="'+y(l[side])+'" y2="'+y(l[side])+'" stroke="'+l.color+'" stroke-dasharray="6 5"/><text x="956" y="'+(y(l[side])-5)+'" text-anchor="end" fill="'+l.color+'" font-size="11">'+esc(l.severity)+' '+l[side]+'</text>').join('')).join('');
    const dots=values.map((v,i)=>'<circle class="data-point" cx="'+x(i)+'" cy="'+y(v)+'" r="3.5" style="stroke:'+(api.matchedLevel(v,rule)?.color||'#298ed6')+'"><title>'+esc(stamp(times[i])+' · '+(isStatus?v?'运行':'停止':format(v)+' '+unit))+'</title></circle>').join('');
    const labels=[0,Math.floor(times.length/4),Math.floor(times.length/2),Math.floor(times.length*3/4),times.length-1].map(i=>'<text class="axis-label" x="'+x(i)+'" y="397" text-anchor="middle">'+stamp(times[i])+'</text>').join('');
    $('#expandedTrendChart').innerHTML=grid+thresholds+'<path class="data-line" d="'+path+'"/>'+dots+labels;
  }
  function open(source,event=null){
    const found=api.findSource(source);if(!found)return;
    previousFocus=document.activeElement;
    const bounds=event?{start:new Date(event.start),end:new Date()}:api.bounds();
    state={source,event,bounds,initial:bounds};
    $('#expandedTrendTitle').textContent=(event?.field||api.fields().find(f=>f.code===found.metric.standardCode)?.name||found.metric.name)+' · 数据趋势';
    $('#expandedTrendStart').value=local(bounds.start);$('#expandedTrendEnd').value=local(bounds.end);$('#expandedTrendCustom').hidden=true;
    layer.querySelectorAll('[data-expanded-range]').forEach(b=>b.classList.toggle('active',b.dataset.expandedRange==='initial'));
    layer.classList.add('open');layer.setAttribute('aria-hidden','false');render();$('#closeExpandedTrend').focus();
  }
  function close(){layer.classList.remove('open');layer.setAttribute('aria-hidden','true');previousFocus?.focus();state=null;}
  $('#closeExpandedTrend').addEventListener('click',close);
  layer.addEventListener('click',e=>{if(e.target===layer)close();});
  $('#expandedTrendRanges').addEventListener('click',e=>{
    const button=e.target.closest('[data-expanded-range]');if(!button||!state)return;
    const range=button.dataset.expandedRange;$('#expandedTrendCustom').hidden=range!=='custom';
    layer.querySelectorAll('[data-expanded-range]').forEach(b=>b.classList.toggle('active',b===button));
    if(range==='custom')return;
    const end=new Date();state.bounds=range==='initial'?state.initial:{start:new Date(+end-Number(range)*3600000),end};render();
  });
  $('#applyExpandedTrendRange').addEventListener('click',()=>{const start=new Date($('#expandedTrendStart').value),end=new Date($('#expandedTrendEnd').value);if(!Number.isFinite(+start)||!Number.isFinite(+end)||start>=end)return api.toast('请选择有效的开始和结束时间');state.bounds={start,end};render();});
  button.addEventListener('click',()=>open(api.trendSource()));
  $('#expandEventTrend').addEventListener('click',()=>{const event=window.PLCRecords.selectedEvent();if(event)open(event.source,event);});
  document.addEventListener('click',e=>{const trigger=e.target.closest('[data-expand-source]');if(trigger){e.preventDefault();e.stopImmediatePropagation();open(trigger.dataset.expandSource);}},true);
  document.addEventListener('keydown',e=>{const trigger=e.target.closest('[data-expand-source]');if(trigger&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();open(trigger.dataset.expandSource);}else if(e.key==='Escape'&&layer.classList.contains('open')){e.preventDefault();e.stopImmediatePropagation();close();}},true);
  window.PLCExpandedTrends={open,close};
})();
