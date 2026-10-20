// Native HTML/SVG source views. Example values follow the reference screens;
// generated waveforms and curves are demo shapes, not event measurements.
(() => {
  const blue='#326faf',orange='#f39434',ink='#314660',muted='#8995a8';
  const svg=(body,view='0 0 520 290',label='数据图')=>`<svg viewBox="${view}" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
  const text=(x,y,value,size=12,fill=muted,anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${fill}" text-anchor="${anchor}">${value}</text>`;
  const line=(x1,y1,x2,y2,color='#dfe7f1',extra='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" ${extra}/>`;
  const path=(points,color,extra='')=>`<path d="${points.map((p,i)=>(i?'L':'M')+p.map(n=>n.toFixed(2)).join(' ')).join(' ')}" fill="none" stroke="${color}" stroke-width="1.6" ${extra}/>`;
  function axes({yLabels,xLabels,xUnit,yUnit}){let s=text(42,18,yUnit);for(let i=0;i<yLabels.length;i++){const y=35+i*205/(yLabels.length-1);s+=line(45,y,475,y,'#dfe7f1','stroke-dasharray="4 4"')+text(38,y+4,yLabels[i],11,muted,'end');}for(let i=0;i<xLabels.length;i++){const x=45+i*430/(xLabels.length-1);s+=text(x,261,xLabels[i],11,muted,'middle');}return s+line(45,240,475,240,'#9dadbf')+text(482,263,xUnit,11);}
  const section=(name,content)=>`<section class="ac-native-section"><h4>${name}</h4>${content}</section>`;
  const gaugeIcon=svg(`<path d="M12 35V12h30v23Z" fill="none" stroke="${orange}" stroke-width="3"/><path d="M17 25a12 12 0 0 1 20 0M27 29l8-10" fill="none" stroke="${orange}" stroke-width="3"/>`,'0 0 54 48','工况图标');
  const shield=svg(`<path d="M25 4 44 12v16c0 10-12 18-19 22C18 46 6 38 6 28V12Z" fill="${orange}"/><path d="m14 20 17 16m-1-9 1 9-9-1" fill="none" stroke="#fff" stroke-width="3"/>`,'0 0 50 54','性能退化图标');
  const coupling=svg(`<defs><linearGradient id="couplingMetal"><stop stop-color="#aeb9c6"/><stop offset=".5" stop-color="#eff3f7"/><stop offset="1" stop-color="#7e8e9f"/></linearGradient></defs><path d="M7 24h50v16H7z" fill="#8b98aa"/><ellipse cx="22" cy="32" rx="10" ry="24" fill="#ce736b"/><ellipse cx="42" cy="32" rx="10" ry="24" fill="#ce736b"/><rect x="22" y="12" width="20" height="40" rx="6" fill="url(#couplingMetal)"/><ellipse cx="30" cy="32" rx="9" ry="20" fill="none" stroke="#748295" stroke-width="3"/>`,'0 0 64 64','联轴器');
  const pumpIcon=svg(`<defs><linearGradient id="pumpMetal"><stop stop-color="#9daebb"/><stop offset=".5" stop-color="#eef2f6"/><stop offset="1" stop-color="#7f8f9d"/></linearGradient></defs><path d="M37 28V12h26v10H51v22M32 66H15V51h24" fill="none" stroke="#9aa9b6" stroke-width="10"/><circle cx="47" cy="53" r="25" fill="url(#pumpMetal)" stroke="#9dacb9" stroke-width="2"/><circle cx="47" cy="53" r="15" fill="#d9e1e8" stroke="#8898a6" stroke-width="3"/><circle cx="47" cy="53" r="7" fill="#778997"/><path d="M31 80h38v8H24Z" fill="#a0adb8"/>`,'0 0 95 100','水泵图标');
  const motorIcon=svg(`<defs><linearGradient id="motorMetal"><stop stop-color="#a5b4c2"/><stop offset=".5" stop-color="#e6ecf2"/><stop offset="1" stop-color="#8194a5"/></linearGradient></defs><rect x="14" y="26" width="64" height="46" rx="13" fill="url(#motorMetal)" stroke="#8c9cac" stroke-width="2"/><ellipse cx="75" cy="49" rx="12" ry="23" fill="#b3c2ce" stroke="#8495a5" stroke-width="2"/><circle cx="75" cy="49" r="10" fill="#eef2f7"/><path d="M78 49h17M25 32v34m8-34v34m8-34v34m8-34v34m8-34v34" stroke="#8798a8" stroke-width="3"/><path d="M24 72v8h42v-8M38 26V17h21v9" fill="#a5b3c0"/>`,'0 0 105 100','电机图标');
  function fault(context){
    const wave=[];for(let i=0;i<=700;i++){const x=45+i*430/700;const v=Math.sin(i*1.79)*Math.sin(i*.21)+.25*Math.sin(i*.87);wave.push([x,137-v*76]);}
    const spectrum=[];for(let i=0;i<=850;i++){const f=i*998/850;let a=.07+.025*Math.sin(i*.8);for(const [peak,height] of [[50,.7],[100,.55],[150,.6],[200,1.8],[250,1.7],[300,1.8],[350,2.2],[400,4.1],[450,.6],[500,1.3],[600,1.3],[650,1.5],[700,1.5],[800,.45]])a+=height*Math.exp(-(((f-peak)/1.2)**2));spectrum.push([45+i*430/850,239-a/4.2*203]);}
    const hints=context?.issues?.filter(item=>item.module==='潜在故障')||[{name:'角度不对中',sourcePercent:75.51},{name:'平行不对中',sourcePercent:74.5},{name:'混合不对中',sourcePercent:74.5}];
    const faults=hints.map(item=>`<div class="ac-fault-row"><span class="ac-equipment-icon">${coupling}</span><div>联轴器${item.name}<strong>${item.status==='normal'?'已恢复':(item.sourcePercent??'—')}<small>${item.status==='normal'?'':'%'}</small>${item.status==='normal'?'':'<span class="ac-alert-mark">!</span>'}</strong></div></div>`).join('');
    return section('故障类型',faults)+section('时域图',`<div class="ac-plot-note">加速度频谱 · 泵驱动端水平方向</div>`+svg(axes({yLabels:['23.248','0','-24.282'],xLabels:['0','1','2','3','4.26'],xUnit:'s',yUnit:'m/s²'})+path(wave,blue),'0 0 520 285','加速度时域波形示例'))+section('频域图',svg(axes({yLabels:['4.199','2.1','0.005'],xLabels:['0','200','400','600','800','998'],xUnit:'Hz',yUnit:'m/s²'})+path(spectrum,orange),'0 0 520 285','加速度频域示例'));
  }
  function vibration(){
    const center=[260,188],labels=['速度峰值','加速度平均幅值','速度平均幅值','加速度峰峰值','加速度峰值','速度峰峰值'];
    const point=(i,r)=>[center[0]+Math.sin(i*Math.PI/3)*r,center[1]-Math.cos(i*Math.PI/3)*r];
    const polygon=(radii,stroke,fill,extra='')=>`<polygon points="${radii.map((r,i)=>point(i,r).join(',')).join(' ')}" stroke="${stroke}" fill="${fill}" ${extra}/>`;
    let chart='';for(const r of [32,64,96,128])chart+=polygon(Array(6).fill(r),'#d9e6f5','none');for(let i=0;i<6;i++)chart+=line(...center,...point(i,128));chart+=polygon(Array(6).fill(92),'#68b457','#dff0dd44','stroke-dasharray="6 4" stroke-width="2"')+polygon([88,87,90,91,88,105],blue,'#3f94be44','stroke-width="2"');[88,87,90,91,88,105].forEach((r,i)=>{const [x,y]=point(i,r);chart+=`<circle cx="${x}" cy="${y}" r="4.5" fill="#4c9ad1"/>`;});labels.forEach((label,i)=>{const [x,y]=point(i,161);chart+=text(x,y+4,label,12,ink,i===0||i===3?'middle':i<3?'start':'end');});
    chart+=text(330,23,'● 真实数据',12,blue)+text(330,43,'● 阈值数据',12,'#68b457');
    return '<div class="ac-native-meta"><strong>轴向方向</strong><span>检测时间：来源检测时刻</span></div>'+section('特征值雷达图',svg(chart,'0 0 520 370','振动特征值雷达图示例'))+section('预警信息','<div class="ac-warning-info"><span class="ac-alert-mark">!</span><span>A102</span><strong>振动速度峰峰值高</strong></div>')+section('风险提示','<p class="ac-risk-advice">可能出现故障，建议实地巡查设备整体状态。</p>');
  }
  function operating(mode='working'){
    const efficiency=mode==='efficiency';let chart=axes({yLabels:efficiency?['100','80','60','40','20','0']:['33','26.4','19.8','13.2','6.6','0'],xLabels:['0','1,000','2,000','3,000','4,000','5,000','6,000'],xUnit:'Q(m³/h)',yUnit:efficiency?'η(%)':'H(m)'});
    let bands='';for(const [from,to,color] of [[45,163,'#fbf3df'],[163,249,'#eaf5ed'],[249,475,'#f8e8eb']])bands+=`<rect x="${from}" y="35" width="${to-from}" height="205" fill="${color}" opacity=".55"/>`;
    const points=[];for(let i=0;i<=100;i++){const q=i*6000/100,y=efficiency?Math.max(0,82-((q-2400)/410)**2):Math.max(0,25+q*.004-q*q*.0000025);points.push([45+q/6000*430,240-y/(efficiency?100:33)*205]);if(!efficiency&&y===0)break;}
    chart=bands+chart+path(points,blue);for(let i=0;i<6;i++){const q=1060+i*44,y=efficiency?76-i*.8:25.3-i*.2;chart+=`<circle cx="${45+q/6000*430}" cy="${240-y/(efficiency?100:33)*205}" r="3.8" fill="#a7b1ba" opacity=".7"/>`;}
    chart+=`<circle cx="${45+1056.22/6000*430}" cy="${240-(efficiency?70.19:25.55)/(efficiency?100:33)*205}" r="5" fill="${blue}" stroke="#fff" stroke-width="2"/>`;
    return section('工况指标',`<div class="ac-operating-layout"><div class="ac-metric-tile"><span>效率</span><strong>70.190<small>%</small></strong></div><div class="ac-operating-state">${gaugeIcon}<strong>偏低工况</strong></div><div class="ac-metric-tile"><span>轴功率</span><strong>104.240<small>kW</small></strong></div><div class="ac-metric-tile"><span>扬程</span><strong>25.550<small>m</small></strong></div><div class="ac-metric-tile"><span>流量</span><strong>1056.220<small>m³/h</small></strong></div></div>`)+section('工况曲线',`<div class="ac-curve-switch"><button class="${efficiency?'':'active'}" data-ac-curve="working">工况</button><button class="${efficiency?'active':''}" data-ac-curve="efficiency">效率</button></div><div class="ac-plot-legend"><span>— ${efficiency?'Q-η':'Q-H'}</span><span>● 历史值</span><span>● 当前值</span></div>`+svg(chart,'0 0 540 285',efficiency?'效率曲线示例':'工况曲线示例'));
  }
  function performance(){const card=(name,score,icon)=>`<div class="ac-performance-card"><div class="ac-performance-ring" style="--score:${score}">${icon}</div><div><h4>${name}性能退化</h4><strong>${score}<small>分</small></strong>${shield}</div></div>`;return section('性能评分',`<div class="ac-performance-summary">${shield}<span>整体性能退化</span><strong>58<small>分</small></strong></div>`+card('泵',58,pumpIcon)+card('电机',80,motorIcon));}
  function advice(event){const note='<p class="ac-local-note">来源建议 · 原型展示示例</p>';
    if(event.sourceType==='PLC'||event.type==='offline')return '<p class="ac-local-note">来源未提供建议。</p>';
    if(event.module==='APM'){
      const risk=window.SentinelSourceFields.apmRisk(event),titles={energy:'能效风险建议',operating:'工况风险建议',performance:'性能风险建议'};
      if(!risk)return '<p class="ac-local-note">来源未提供对应风险类别的建议。</p>';
      const content={
        energy:'<p>结合当前效率、运行负载和历史能效变化核查风险点，确认是否存在低效运行。</p><h4>核查与调整建议</h4><ol><li>核对能耗、流量等相关数据是否完整，排查采集偏差。</li><li>结合实际运行需求核查泵组运行组合及控制参数。</li><li>调整后持续观察能效变化，记录核查过程与处理结果。</li></ol>',
        operating:'<p>结合流量、扬程及运行点位置核查工况风险，确认实际工况与当前运行需求。</p><h4>核查与调整建议</h4><ol><li>核对流量、压力及阀门开度等现场信息与平台数据。</li><li>结合设备允许运行范围评估运行点偏离原因。</li><li>根据现场核查结果调整运行参数，并观察工况变化。</li></ol>',
        performance:'<p>当前设备处于性能退化状态，能耗损耗较大，能耗利用率偏低，存在工况优化和能耗优化的空间。可投入一般性维护和日常保养，适当调整水泵运行状态和电机参数。</p><h4>根因分析</h4><ol><li>泵叶轮磨损。</li><li>泵轴承磨损。</li><li>进口条件不佳，管线压力过大。</li></ol><h4>维护建议</h4><ol><li>定期检修和维护叶轮部分，及时发现并处理磨损和腐蚀等问题。严重的时候需要切割叶轮外径或更换新的叶轮。</li><li>定期检修和维护轴承部分，及时发现并处理磨损和腐蚀等问题。严重的时候需要更换新的轴承。</li><li>调整系统阻力，改善进口条件。</li></ol>'
      };
      return note+'<section class="ac-risk-advice-section"><h4>'+titles[risk]+'</h4>'+content[risk]+'</section>';
    }
    if(event.type==='diagnosis')return note+`<div class="ac-advice-fault">${coupling}<div>联轴器角度不对中<strong>75.51<small>%</small></strong></div></div><h4>维修策略</h4><ol><li>更换异常零件；</li><li>重新调整泵组对中；</li><li>定期对联轴器进行检查，包括检查其磨损情况、变形情况、连接螺栓是否松动等。对于存在问题的联轴器，应及时进行更换或修复；</li></ol>`;
    if(event.module==='PHM')return note+'<h4>风险提示</h4><p class="ac-risk-advice">可能出现故障，建议实地巡查设备整体状态。</p>';
    return '<p class="ac-local-note">来源未提供建议。</p>';
  }
  function trend(event){
    if(!event?.series)return section('数据趋势','<p class="ac-local-note">来源尚未提供趋势数据。</p>');
    const value=Number(event.series.value),unit=String(event.series.unit||'').replace(/[<>&"]/g,''),spread=Math.max(Math.abs(value)*.18,1),max=value+spread,min=value-spread;
    if(!Number.isFinite(value))return section('数据趋势','<p class="ac-local-note">来源尚未提供数值趋势。</p>');
    const points=Array.from({length:101},(_,i)=>[45+i*4.3,137-Math.sin(i*.14)*38-Math.sin(i*.39)*12]);
    return section('数据趋势 · 演示曲线',svg(axes({yLabels:[max.toFixed(2),value.toFixed(2),min.toFixed(2)],xLabels:['首次预警','','','最近反馈'],xUnit:'时间',yUnit:unit})+path(points,blue),'0 0 540 285','来源指标趋势演示图'));
  }
  function spectrum(){const markup=fault();return markup.slice(markup.lastIndexOf('<section'));}
  const unavailable=name=>section(name,'<p class="ac-local-note">来源尚未提供对应数据，后续按实际报送内容展示。</p>');
  window.SentinelDataViews={render(key,mode,context){if(key==='fault')return fault(context);if(key==='trend')return trend(context);if(key==='spectrum')return spectrum();if(key==='correlation')return unavailable('相关性信息');if(key==='energy')return unavailable('能效详情');return({vibration,operating,performance}[key]||(()=>''))(mode);},advice};
})();
