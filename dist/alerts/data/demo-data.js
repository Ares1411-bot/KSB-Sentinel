window.createAlertDemoData=paths=>{
const hours=n=>Date.now()-n*3600000;
const stamp=t=>new Date(t).toLocaleString('zh-CN');
const events=[],monitors=[],seed=input=>events.push(input);
  const numeric=(value,unit,threshold)=>({value,unit,threshold});
  seed({...paths[0],id:'PHM-001',eventKey:'demo:phm',module:'PHM',type:'threshold',title:'泵驱动端水平振动超限',level:'重要',start:hours(30),notificationCount:2,details:{测点:'泵驱动端 · 水平',当前值:'5.2 mm/s',预警依据:'大于 4.5 mm/s',数据来源:'PHM 振动监测（演示）'},series:numeric(5.2,'mm/s',4.5),history:[{time:hours(30),kind:'首次触发',text:'一般预警 · 4.8 mm/s'},{time:hours(25),kind:'等级升级',text:'一般 → 重要 · 5.2 mm/s'},{time:hours(2),kind:'重复触发',text:'持续异常归入原事件，未重复通知'}]});
  seed({...paths[0],id:'APM-001',eventKey:'demo:apm',module:'APM',type:'efficiency',title:'设备效率偏离设定范围',level:'一般',status:'progress',start:hours(7),handler:'APM 运维组（来源配置示例）',processingActor:'InternalDemo',details:{当前效率:'62%',参考下限:'70%',工况:'当前运行点',数据来源:'APM 能效监测（演示）'},series:numeric(62,'%',70),history:[{time:hours(7),kind:'首次触发',text:'效率低于设定下限'},{time:hours(6),kind:'开始处理',text:'InternalDemo 开始处理；来源配置处理人保持不变'}]});
  seed({...paths[1],id:'PHM-002',module:'PHM',type:'diagnosis',title:'联轴器存在潜在不对中故障',level:'严重',start:hours(20),details:{诊断对象:'联轴器',诊断结果:'潜在角度不对中',诊断依据:'关联测点频谱异常',数据来源:'PHM 故障诊断（演示）'}});
  seed({...paths[1],id:'APM-002',module:'APM',type:'reminder',title:'运行点变化提醒',level:'提示',needManual:false,dataState:'reminder',recordMode:'each',notifyMode:'each',start:hours(3),details:{提醒内容:'运行点出现变化，供工况回溯参考',数据来源:'APM 运行分析（演示）'}});
  seed({...paths[0],id:'PHM-003',module:'PHM',type:'fluctuation',title:'温度波动已恢复，仍待处理',level:'一般',dataState:'recovered',start:hours(48),details:{测点:'泵驱动端温度',当前值:'45 ℃',数据来源:'PHM 温度监测（演示）'},series:numeric(45,'℃',55),history:[{time:hours(48),kind:'首次触发',text:'温度发生波动异常'},{time:hours(40),kind:'数据恢复',text:'数据恢复；事件未经过人工处理，仍待处理'}]});
  seed({...paths.at(-2),id:'APM-003',module:'APM',type:'efficiency',title:'效率偏离事件已处理',level:'重要',status:'closed',dataState:'recovered',read:true,start:hours(72),end:hours(60),result:{method:'参数调整',description:'核对运行工况，调整参数后完成处理。（演示）',operator:'InternalDemo',time:hours(60),photos:[],files:[]},history:[{time:hours(72),kind:'首次触发',text:'出现效率偏离预警'},{time:hours(61),kind:'数据恢复',text:'运行数据恢复'},{time:hours(60),kind:'处理结束',text:'提交处理结果，事件结束'}]});
  seed({...paths[0],id:'APM-004',module:'APM',type:'efficiency',title:'低负载运行提醒',needManual:false,level:'提示',start:hours(4),series:numeric(38,'%',40),details:{当前负载:'38%',提醒依据:'低于 40%',数据来源:'APM 监测（演示）'}});
  seed({...paths.at(-2),id:'PHM-004',module:'PHM',type:'reminder',title:'状态变化通知',needManual:false,dataState:'reminder',level:'提示',recordMode:'each',notifyMode:'each',start:hours(2),details:{提醒内容:'设备状态发生变化，仅用于通知',数据来源:'PHM 状态监测（演示）'}});
  monitors.push({...paths[0],key:'collector-1',name:'1# 泵振动采集器',module:'PHM',state:'offline',since:hours(5)}, {...paths[1],key:'plc-2',name:'2# 泵主控 PLC',module:'PHM',state:'online',since:hours(2)}, {...paths.at(-2),key:'apm-gateway',name:'能效采集网关',module:'APM',state:'offline',since:hours(9)}, {...paths[0],key:'plc-1',name:'1# 泵主控 PLC',module:'PHM',state:'online',since:null}, {...paths[1],key:'apm-2',name:'2# 泵能效采集器',module:'APM',state:'online',since:null});
  seed({...paths[0],id:'OFF-001',eventKey:'offline:collector-1',module:'PHM',type:'offline',title:'1# 泵振动采集器离线',needManual:false,dataState:'offline',start:hours(5),details:{采集设备:'1# 泵振动采集器',最近接收时间:stamp(hours(5)),数据来源:'连接状态监测（演示）'}});
  seed({...paths[1],id:'OFF-002',eventKey:'offline:plc-2',module:'PHM',sourceType:'PLC',type:'offline',title:'2# 泵主控 PLC 离线后恢复',needManual:false,dataState:'online',start:hours(12),end:hours(2),history:[{time:hours(12),kind:'设备离线',text:'设备未传回数据'},{time:hours(2),kind:'设备恢复',text:'设备重新在线，无需人工处理'}],details:{采集设备:'2# 泵主控 PLC',数据来源:'连接状态监测（演示）'}});
  seed({...paths.at(-2),id:'OFF-003',eventKey:'offline:apm-gateway',module:'APM',type:'offline',title:'能效采集网关离线',needManual:true,level:'重要',dataState:'offline',start:hours(9),details:{采集设备:'能效采集网关',处理要求:'来源规则要求人工确认',数据来源:'连接状态监测（演示）'}});


seed({...paths[0],id:'PLC-DEMO-001',eventKey:'PLC-demo:pressure',module:'PHM',sourceType:'PLC',type:'threshold',title:'进口压力阈值预警',level:'重要',needManual:true,start:hours(1),details:{标准字段:'进口压力',数据来源:'独立PLC演示事件',当前值:'0.33 MPa'},series:numeric(.33,'MPa',.30),standardCode:'inlet_pressure'});
seed({...paths[0],id:'PHM-TEMP-DEMO',module:'PHM',type:'abnormal',title:'泵驱动端温度异常预警（演示）',start:hours(1),details:{异常数据源:'温度值',异常端位:'泵驱动端',测点:'泵驱动端温度',当前值:'68 ℃',预警依据:'来源温度预警结果（演示）'},series:numeric(68,'℃',55),dataViews:['trend']});
seed({...paths[0],id:'APM-OPERATING-DEMO',module:'APM',type:'operating',title:'工况产生新风险点（演示）',start:hours(1),details:{风险点:'偏低工况',数据来源:'APM 算法风险点（演示）'},dataViews:['operating','performance','energy']});
seed({...paths[0],id:'APM-PERFORMANCE-DEMO',module:'APM',type:'performance',title:'性能产生新风险点（演示）',start:hours(.5),details:{风险点:'整体性能退化',数据来源:'APM 算法风险点（演示）'},dataViews:['operating','performance','energy']});
seed({...paths[0],id:'APM-ENERGY-DEMO',module:'APM',type:'efficiency',title:'能效产生新风险点（演示）',start:hours(.5),details:{风险点:'低效运行（演示）',数据来源:'APM 算法风险点（演示）'},dataViews:['operating','performance','energy']});
events.forEach(event=>{
  event.sourceLocation=[event.project,event.plant,'1#机房',event.unit].filter(Boolean).join(' / ');
  const time=new Date(event.start).toLocaleString('zh-CN',{hour12:false});
  if(event.sourceType==='PLC'||event.type==='offline'||event.type==='reminder')event.sourceMessage=event.title+'。设备：'+event.device+'；预警时间：'+time+'。（演示消息）';
  else if(event.module==='PHM'&&event.type==='diagnosis')event.sourceMessage='您好，「'+event.device+'」设备于'+time+'提示可能存在「联轴器」「角度不对中」，「联轴器」「平行不对中」，「联轴器」「混合不对中」。（演示消息）';
  else if(event.module==='PHM'){
    const temperature=event.id==='PHM-TEMP-DEMO'||event.details?.测点?.includes('温度');
    event.details.异常数据源=temperature?'温度值':'振动有效值';event.details.异常端位='泵驱动端';
    event.sourceMessage=event.sourceLocation+' / '+event.device+'，在'+time+'产生了泵驱动端'+(temperature?'温度':'振动')+'异常预警。（演示消息）';
  }else if(event.module==='APM')event.sourceMessage='您好，「'+event.device+'」设备于'+time+'提示可能「'+(event.type==='operating'?'工况':event.type==='efficiency'?'能效':'性能')+'」产生新的风险点。（演示消息）';
});
return {events,monitors};
};
