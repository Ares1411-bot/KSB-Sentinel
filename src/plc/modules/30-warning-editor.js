// 30-warning-editor.js — compiled in declaration order by build-prototypes.cjs
      const warningFieldKind = field => field.type === 'BOOLEAN' ? 'boolean' : field.type === 'STRING' ? 'text' : 'number';
      const configuredRule=code=>alertScopeMode==='default'?thresholdRules[code]:pumpThresholdRules[currentPumpId]?.[code];
      const displayedRule=code=>configuredRule(code)||(alertScopeMode==='pump'?thresholdRules[code]:null);
      const plcReturnedValues=code=>[...new Set(devices.flatMap(device=>device.points.filter(point=>point.standardCode===code).flatMap(point=>point.returnedValues||[])).map(String))];
      const updateWarningScopeNote=()=>{
        $('#warningScopeNote').innerHTML=alertScopeMode==='default'?'<strong>正在维护平台默认规则</strong>数值字段未配置自定义规则时沿用默认；布尔异常值仅在设备中配置。':'<strong>'+esc(currentContext().text)+'</strong>自定义仅用于此设备；未配置的数值字段沿用平台默认规则。';
      };
      const renderWarningRules=()=>{
        const fields=standardFields.filter(field=>warningFieldKind(field)!=='text');
        const query=$('#warningFieldSearch').value.trim().toLowerCase();
        const filtered=fields.filter(field=>{
          const rule=displayedRule(field.code),status=!rule?'unconfigured':rule.enabled!==false&&field.enabled!==false?'enabled':'disabled';
          return (field.name+field.code+field.category).toLowerCase().includes(query)&&($('#warningTypeFilter').value==='all'||$('#warningTypeFilter').value===warningFieldKind(field))&&($('#warningStatusFilter').value==='all'||$('#warningStatusFilter').value===status);
        });
        $('#warningRuleTableBody').innerHTML=filtered.map(field=>{
          const rule=displayedRule(field.code),enabled=rule?.enabled!==false&&field.enabled!==false,booleanDefault=alertScopeMode==='default'&&warningFieldKind(field)==='boolean';
          const inherited=alertScopeMode==='pump'&&!configuredRule(field.code)&&Boolean(rule);
          const copy=booleanDefault?'异常值仅在设备自定义规则中配置':rule?'<div class="rule-summary" tabindex="0" data-rule-tooltip="'+esc(field.code)+'" aria-describedby="warningRuleTooltip">'+rule.levels.slice(0,4).map(level=>'<span class="rule-level-tag"><span style="color:'+level.color+'">●</span> '+esc(level.severity)+'</span>').join('')+'</div>'+(inherited?'<small class="rule-inherited-note">使用平台默认规则</small>':''):'尚未配置';
          return '<tr class="warning-rule-row" data-warning-field="'+esc(field.code)+'" tabindex="0"><td><strong>'+esc(field.name)+'</strong><small>'+esc(field.code)+'</small></td><td>'+(warningFieldKind(field)==='number'?'数值型':'布尔型')+' / '+esc(field.unit||'-')+'</td><td>'+esc(field.category)+'</td><td>'+copy+'</td><td>'+(booleanDefault?'仅设备配置':!rule?'未配置':enabled?'已启用':field.enabled===false?'字段已停用':'已停用')+'</td><td><div class="table-actions"><button type="button" '+(booleanDefault?'disabled':'')+'>配置</button><button type="button" data-toggle-warning="'+esc(field.code)+'" '+(!rule||field.enabled===false||booleanDefault?'disabled':'')+'>'+(enabled?'停用':'启用')+'</button></div></td></tr>';
        }).join('')||'<tr><td colspan="6">未找到匹配的字段</td></tr>';
        const configured=fields.filter(field=>displayedRule(field.code)).length;
        $('#warningFieldTotal').textContent=fields.length;$('#warningConfiguredTotal').textContent=configured;
        $('#warningUnconfiguredTotal').textContent=fields.length-configured;$('#warningRuleCount').textContent='共 '+filtered.length+' 个字段';
      };
      const hideRuleTooltip=()=>{const bubble=$('#warningRuleTooltip');bubble.classList.remove('open');bubble.setAttribute('aria-hidden','true');};
      const showRuleTooltip=(trigger,x,y)=>{
        const field=standardFields.find(field=>field.code===trigger.dataset.ruleTooltip),rule=displayedRule(field?.code);
        if(!rule)return hideRuleTooltip();
        const bubble=$('#warningRuleTooltip'),unit=field.unit&&field.unit!=='-'?' '+field.unit:'';
        bubble.innerHTML='<h4>'+esc(field.name)+' · 预警规则</h4>'+rule.levels.map(level=>'<div class="rule-hover-line"><strong style="color:'+level.color+'">● '+esc(level.severity)+'</strong><span>'+esc(levelText(level)+(level.abnormalValue!=null?'':unit))+'</span></div>').join('')+'<div class="rule-hover-foot">同时满足时取最高等级。<br>等于数值上下限视为正常。</div>';
        bubble.classList.add('open');bubble.setAttribute('aria-hidden','false');
        const bounds=bubble.getBoundingClientRect(),width=window.innerWidth,height=window.innerHeight;
        bubble.style.left=Math.max(12,Math.min(x+16,width-bounds.width-12))+'px';
        bubble.style.top=Math.max(12,Math.min(y+12,height-bounds.height-12))+'px';
      };
      $('#warningRuleTableBody').addEventListener('pointermove',event=>{const trigger=event.target.closest('[data-rule-tooltip]');if(trigger)showRuleTooltip(trigger,event.clientX,event.clientY);else hideRuleTooltip();});
      $('#warningRuleTableBody').addEventListener('pointerleave',hideRuleTooltip);
      $('#warningRuleTableBody').addEventListener('focusin',event=>{const trigger=event.target.closest('[data-rule-tooltip]');if(trigger){const rect=trigger.getBoundingClientRect();showRuleTooltip(trigger,rect.right,rect.top);}});
      $('#warningRuleTableBody').addEventListener('focusout',hideRuleTooltip);
      document.addEventListener('scroll',hideRuleTooltip,true);
      document.addEventListener('click',hideRuleTooltip);
      document.addEventListener('keydown',event=>{if(event.key==='Escape')hideRuleTooltip();});
      window.addEventListener('resize',hideRuleTooltip);
      const renderWarningLevels=()=>{
        const field=standardFields.find(field=>field.code===editingWarningFieldCode),boolean=warningFieldKind(field)==='boolean';
        const returned=plcReturnedValues(field.code);
        $('#warningLowerTitle').textContent=boolean?'异常值':'下限';
        $('#warningConditionGroup').hidden=boolean;
        $('#warningLevelRows').innerHTML=warningLevelDraft.map((level,index)=>{
          const select='<select data-level-prop="severity">'+severityNames.map(name=>'<option '+(name===level.severity?'selected':'')+'>'+name+'</option>').join('')+'</select>';
          const input=(prop,type='number')=>'<input type="'+type+'" step="any" aria-label="'+esc(level.severity)+' '+({min:'下限',max:'上限',abnormalValue:'异常值',color:'展示颜色'}[prop]||prop)+'" data-level-prop="'+prop+'" value="'+esc(level[prop]??'')+'" '+(prop==='abnormalValue'?'placeholder="填写实际异常值"':'')+'>';
          const abnormal='<select data-level-prop="abnormalValue" aria-label="'+esc(level.severity)+'异常值" '+(!returned.length?'disabled':'')+'><option value="">'+(returned.length?'选择 PLC 返回值':'暂无 PLC 返回值')+'</option>'+returned.map(value=>'<option value="'+esc(value)+'" '+(String(level.abnormalValue??'')===value?'selected':'')+'>'+esc(value)+'</option>').join('')+'</select>';
          return '<tr data-level-index="'+index+'"><td>'+select+'</td><td>'+(boolean?abnormal:warningConditionDraft!=='max'?input('min'):'—')+'</td><td>'+(!boolean&&warningConditionDraft!=='min'?input('max'):'—')+'</td><td>'+input('color','color')+'</td><td><div class="table-actions"><button class="danger-link" type="button" data-remove-level="'+index+'">删除</button></div></td></tr>';
        }).join('');$('#addWarningLevel').disabled=warningLevelDraft.length>=4;
        $('#addWarningLevel').textContent=warningLevelDraft.length>=4?'已配置全部四个等级':'＋ 新增等级';
      };
      const updateWarningConditionFields=()=>{};
      const updateWarningInheritance=()=>{const inherited=alertScopeMode==='pump'&&$('#inheritDefaultRule').checked;$('#warningRuleForm').hidden=inherited;};
      $('#inheritDefaultRule').addEventListener('change',updateWarningInheritance);
      const openWarningRuleEditor=field=>{
        if(!field||warningFieldKind(field)==='text')return;editingWarningFieldCode=field.code;
        const boolean=warningFieldKind(field)==='boolean';
        if(alertScopeMode==='default'&&boolean)return toast('布尔异常值仅支持设备自定义配置。');
        const rule=displayedRule(field.code);
        warningLevelDraft=clone(rule?.levels||[{severity:'提示',color:severityColors[0]}]);
        const first=warningLevelDraft[0];warningConditionDraft=rule?.condition||(first.min!=null&&first.max!=null?'range':first.min!=null?'min':'max');
        $('#warningConditionInput').value=warningConditionDraft;
        $('#warningRuleFieldName').textContent=field.name;$('#warningRuleFieldMeta').textContent=field.code+' · '+field.type+' · '+(field.unit||'-');
        $('#warningRuleScopeName').textContent=alertScopeMode==='default'?'平台默认规则':'设备自定义规则';$('#warningRuleScopePath').textContent=alertScopeMode==='default'?'适用于未自定义的数值字段':currentContext().text;
        $('#inheritRuleOption').classList.toggle('hidden',alertScopeMode==='default'||boolean);
        $('#inheritDefaultRule').checked=alertScopeMode==='pump'&&!boolean&&!configuredRule(field.code);
        $('#warningEnabledInput').value=rule?.enabled===false?'disabled':'enabled';updateWarningInheritance();
        $('#warningRuleFormError').textContent='';$('#warningRuleHint').textContent=boolean?(plcReturnedValues(field.code).length?'异常值枚举来源于当前设备的 PLC 返回值（演示）；按相等判断。':'当前设备尚无 PLC 返回值枚举，请先完成采集接入。'):'所有等级共用一种预警条件；等于上下限视为正常。';
        renderWarningLevels();openModal('warningRuleModal');
      };
