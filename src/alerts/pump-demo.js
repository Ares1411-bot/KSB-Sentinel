// One deliberately isolated PHM example. Proposed schema, not an algorithm API.
(() => {
  const copy=value=>JSON.parse(JSON.stringify(value));
  const percent=(code,name,value)=>({key:'coupling:'+code,module:'潜在故障',component:'联轴器',name,status:'abnormal',sourcePercent:value,view:'fault'});
  const firstItems=()=>[
    percent('angular','角度不对中',75.51),percent('parallel','平行不对中',74.5),percent('combined','混合不对中',74.5),
    {key:'bearing:health',module:'潜在故障',component:'轴承',name:'轴承状态',status:'normal'}
  ];
  function feedbacks(start){
    const initial=firstItems(),withVibration=[...copy(initial),{key:'vibration:drive-horizontal:A102',module:'振动特征值',component:'泵驱动端 · 水平',name:'振动速度峰峰值高',status:'abnormal',warningCode:'A102',view:'vibration'}];
    const partial=copy(withVibration);partial.filter(item=>['coupling:parallel','coupling:combined'].includes(item.key)).forEach(item=>{item.status='normal';item.sourcePercent=null;});
    const recovered=copy(withVibration).map(item=>({...item,status:'normal',sourcePercent:null}));
    return [initial,initial,withVibration,partial,recovered].map((items,i)=>({feedbackId:'PHM-DEMO-F'+(i+1),pumpId:null,analysisTime:start+i*15*60000,fullSnapshot:true,items:copy(items)}));
  }
  function applyFeedback(event,input){
    const model=event.pumpCase;if(!model||event.status==='closed')return false;
    if(input.pumpId&&input.pumpId!==event.pumpId)return false;
    if(model.feedbacks.some(item=>item.feedbackId===input.feedbackId)||input.analysisTime<model.latestFeedbackAt)return false;
    const snapshot=copy(input),time=snapshot.analysisTime,changes=[];
    snapshot.items.forEach(item=>{
      let issue=model.issues.find(old=>old.key===item.key);
      if(!issue&&item.status!=='abnormal')return;
      if(!issue){issue={...item,firstSeen:time,lastSeen:time,recoveredAt:null,history:[]};model.issues.push(issue);changes.push(item.component+' · '+item.name+'：'+(model.feedbacks.length?'新增异常':'首次提示'));}
      else if(issue.status!==item.status){changes.push(item.component+' · '+item.name+'：'+(item.status==='normal'?'恢复正常':'再次异常'));issue.recoveredAt=item.status==='normal'?time:null;}
      else if(item.status==='abnormal'&&issue.sourcePercent!==item.sourcePercent&&item.sourcePercent!=null)changes.push(item.component+' · '+item.name+'：来源百分比 '+issue.sourcePercent+'% → '+item.sourcePercent+'%');
      issue.history.push({time,status:item.status,sourcePercent:item.sourcePercent??null});Object.assign(issue,item,{lastSeen:time});
    });
    // Missing items are deliberately retained: absence is not a recovery signal.
    model.feedbacks.push(snapshot);model.latestFeedbackAt=time;model.step=model.feedbacks.length-1;
    const active=model.issues.filter(item=>item.status==='abnormal').length;
    event.dataState=active?'abnormal':'recovered';event.updated=time;
    const current=snapshot.items.filter(item=>item.status==='abnormal');
    event.sourceMessage='您好，「'+(event.device||'1#泵')+'」设备于'+new Date(time).toLocaleString('zh-CN',{hour12:false})+(current.length?'提示可能存在'+current.map(item=>'「'+item.component+'」「'+item.name+'」').join('，'):'本次整泵反馈未提示异常')+'。（演示消息）';
    event.history.push({time,kind:model.feedbacks.length===1?'首次触发':changes.length?(active?'异常明细变化':'全部恢复'):'重复反馈',text:changes.length?changes.join('；')+(active?'':'；数据已恢复，仍需提交处理结果'):'整泵再次反馈相同异常，更新原事件，不新增事件与通知'});
    return true;
  }
  function create(path,start=Date.now()-2*3600000){
    const event={...path,id:'PHM-PUMP-DEMO-001',eventKey:'demo:PHM:pump-health:'+path.pumpId,module:'PHM',sourceType:'PHM',type:'diagnosis',title:'1#泵健康预警（整泵示例）',level:null,needManual:true,status:'pending',start,notificationCount:1,recordMode:'merge',notifyMode:'first_upgrade',history:[],details:{数据来源:'PHM 整泵算法反馈（演示）'},pumpCase:{step:-1,latestFeedbackAt:0,issues:[],feedbacks:[],demoStart:start}};
    const initial=feedbacks(start)[0];initial.pumpId=path.pumpId;applyFeedback(event,initial);return event;
  }
  function next(event){const model=event.pumpCase;if(!model)return false;const next=feedbacks(model.demoStart)[model.step+1];if(!next)return false;next.pumpId=event.pumpId;return applyFeedback(event,next);}
  window.PHMPumpDemo={create,next,applyFeedback,totalSteps:5};
})();
