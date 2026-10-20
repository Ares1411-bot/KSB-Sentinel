// 70-warning-save.js — compiled in declaration order by build-prototypes.cjs
      const captureWarningLevels=()=>$$('#warningLevelRows [data-level-prop]').forEach(input=>{warningLevelDraft[Number(input.closest('[data-level-index]').dataset.levelIndex)][input.dataset.levelProp]=input.value;});
      $('#warningLevelRows').addEventListener('change',captureWarningLevels);
      $('#warningConditionInput').addEventListener('change',event=>{captureWarningLevels();warningConditionDraft=event.target.value;renderWarningLevels();});
      $('#warningLevelRows').addEventListener('click',event=>{const remove=event.target.closest('[data-remove-level]');if(!remove)return;captureWarningLevels();warningLevelDraft.splice(Number(remove.dataset.removeLevel),1);renderWarningLevels();});
      $('#addWarningLevel').addEventListener('click',()=>{captureWarningLevels();const severity=severityNames.find(name=>!warningLevelDraft.some(level=>level.severity===name));if(!severity)return;warningLevelDraft.push({severity,color:severityColors[severityNames.indexOf(severity)]});renderWarningLevels();});
      $('#saveWarningRule').addEventListener('click',()=>{
        captureWarningLevels();const field=standardFields.find(field=>field.code===editingWarningFieldCode),error=$('#warningRuleFormError');
        const fail=text=>{error.textContent=text;};
        const boolean=warningFieldKind(field)==='boolean';
        if(alertScopeMode==='default'&&boolean)return fail('平台默认规则不支持布尔异常值。');
        if(alertScopeMode==='pump'&&!boolean&&$('#inheritDefaultRule').checked){delete (pumpThresholdRules[currentPumpId]||{})[field.code];closeModal('warningRuleModal');renderWarningRules();renderPanel();return toast('已恢复使用平台默认规则');}
        if(!warningLevelDraft.length)return fail('请至少配置一个等级。');
        if(new Set(warningLevelDraft.map(level=>level.severity)).size!==warningLevelDraft.length)return fail('同一等级不能重复配置。');
        const levels=[];
        for(const draft of warningLevelDraft){
          const level={severity:draft.severity,color:draft.color};
          if(boolean){if(!plcReturnedValues(field.code).includes(String(draft.abnormalValue??'')))return fail('请从当前 PLC 返回值中选择异常值。');level.abnormalValue=String(draft.abnormalValue);}
          else{
            for(const side of ['min','max']){
              if((side==='min'&&warningConditionDraft==='max')||(side==='max'&&warningConditionDraft==='min'))continue;
              if(draft[side]==null||String(draft[side]).trim()===''||!Number.isFinite(Number(draft[side])))return fail('请填写有效的阈值。');
              level[side]=Number(draft[side]);
            }
            if(level.min!=null&&level.max!=null&&level.min>=level.max)return fail('下限必须小于上限。');
          }levels.push(level);
        }
        levels.sort((a,b)=>severityNames.indexOf(a.severity)-severityNames.indexOf(b.severity));
        if(!boolean)for(let i=1;i<levels.length;i++){
          const a=levels[i-1],b=levels[i];
          if((b.min??-Infinity)>(a.min??-Infinity)||(b.max??Infinity)<(a.max??Infinity))return fail('更严重等级的正常范围必须包含较低等级的正常范围。');
          if(b.min===a.min&&b.max===a.max)return fail('不同等级不能使用完全相同的阈值。');
        }
        const rule={condition:boolean?'equals':warningConditionDraft,enabled:$('#warningEnabledInput').value==='enabled',levels};
        if(alertScopeMode==='default')thresholdRules[field.code]=rule;else (pumpThresholdRules[currentPumpId]||={})[field.code]=rule;
        closeModal('warningRuleModal');renderWarningRules();renderPanel();toast(alertScopeMode==='default'?'平台默认规则已保存':'当前设备自定义规则已保存');
      });

