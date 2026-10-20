// 80-add-device.js — compiled in declaration order by build-prototypes.cjs
      const renderTemplateChoices = () => {
        $('#templateChoiceGrid').innerHTML = templates.filter(item=>item.enabled!==false).map(item => `<button class="template-choice ${item.id === selectedTemplateId ? 'selected' : ''}" data-template-choice="${item.id}" type="button"><span class="choice-check">✓</span><h3>${esc(item.name)}</h3><p>协议：${esc(item.protocol)}</p><p>${item.points.length} 个点位 · 更新于 ${esc(item.updated)}</p></button>`).join('')||'<div class="empty-config">暂无启用模板，请先新增或启用模板。</div>';
      };
      const updateWizard = () => {
        $('#addDeviceModal .wizard-steps').hidden=Boolean(editingDeviceId);
        $$('.wizard-page').forEach(page => page.classList.toggle('active', Number(page.dataset.wizardPage) === wizardStep));
        $$('[data-step-indicator]').forEach(item => { const step = Number(item.dataset.stepIndicator); item.classList.toggle('active', step === wizardStep); item.classList.toggle('done', step < wizardStep); });
        $('#wizardPrevious').textContent = editingDeviceId||wizardStep === 1 ? '取消' : '上一步';
        $('#wizardPrevious').disabled = false;
        $('#wizardNext').textContent = editingDeviceId ? '保存修改' : wizardStep === 1 ? '下一步' : wizardStep === 2 ? '连接' : wizardConnected ? '完成' : connectionViewState === 'failure' ? '请选择处理方式' : '连接中…';
        $('#wizardNext').disabled = wizardStep === 3 && !wizardConnected;
      };
      const renderDevicePoints = () => {
        if(!deviceDraftGroups.some(group=>group.name===selectedDeviceGroup))selectedDeviceGroup=deviceDraftGroups[0]?.name||'默认组';
        $('#deviceGroupTabs').innerHTML=deviceDraftGroups.map(group=>'<button class="template-group-tab '+(group.name===selectedDeviceGroup?'active':'')+'" role="tab" aria-selected="'+(group.name===selectedDeviceGroup)+'" data-device-group="'+esc(group.name)+'" type="button">'+esc(group.name)+'<small>'+deviceDraftPoints.filter(item=>(item.templateGroup||'默认组')===group.name).length+'</small></button>').join('');
        const current=deviceDraftGroups.find(group=>group.name===selectedDeviceGroup);$('#deviceGroupMeta').textContent=current?'采集间隔：'+current.intervalMs+' ms':'';
        $('#devicePointBody').innerHTML = deviceDraftPoints.map((item,index)=>({item,index})).filter(({item})=>(item.templateGroup||'默认组')===selectedDeviceGroup).map(({item,index})=>pointEditorCells(item,index)).join('')||'<tr><td colspan="10" class="point-empty">该组暂无点位，可点击“新增点位”添加</td></tr>';
      };
      const prepareDeviceForm = () => {
        const template = templates.find(item => item.id === selectedTemplateId) || templates[0];
        if(preparedDeviceTemplateId===template.id)return;
        $('#deviceProtocolInput').value = template.protocol; $('#deviceIpInput').value = template.ip; $('#devicePortInput').value = template.port; $('#selectedTemplateName').textContent = template.name;
        deviceProtocolDraft=clone(template.protocolConfigCache||{[template.protocol]:template.protocolConfig||{}});renderProtocolFields(template.protocol,deviceProtocolDraft,'#deviceProtocolFields');$('#deviceProtocolDetails').open=false;
        deviceDraftPoints = clone(template.points);deviceDraftGroups=groupsFrom(template);selectedDeviceGroup=deviceDraftGroups[0]?.name||'默认组';preparedDeviceTemplateId=template.id;renderDevicePoints();
      };
      const openAddDevice = () => { editingDeviceId='';editingDevicePumpId='';$('#addDeviceTitle').textContent='添加 PLC 设备';$('#addDeviceModal .modal-header p').textContent='选择模板，按现场情况调整设备与点位信息，然后连接中转平台。';$('#deviceNameInput').value='PLC-'+(devices.length+1);clearTimeout(connectionTimer); wizardStep = 1; wizardConnected = false; connectionViewState = 'loading'; deviceDraftSaved = false;preparedDeviceTemplateId='';if(!templates.some(item=>item.id===selectedTemplateId&&item.enabled!==false))selectedTemplateId=templates.find(item=>item.enabled!==false)?.id||'';renderContextSelectors(); renderTemplateChoices(); updateWizard(); openModal('addDeviceModal'); };
      const openDeviceEditor=deviceId=>{
        const device=devices.find(item=>item.id===deviceId);if(!device)return;
        clearTimeout(connectionTimer);editingDeviceId=device.id;editingDevicePumpId=currentPumpId;wizardStep=2;wizardConnected=false;deviceDraftSaved=false;
        $('#addDeviceTitle').textContent='编辑 PLC 设备';$('#addDeviceModal .modal-header p').textContent='调整当前设备的接入参数、采集组与点位配置，保存后更新设备信息。';
        $('#deviceNameInput').value=device.name;$('#deviceProtocolInput').value=device.protocol;$('#deviceIpInput').value=device.ip||'';$('#devicePortInput').value=device.port||(device.protocol==='S7'?'102':device.protocol==='Modbus TCP'?'502':'');$('#selectedTemplateName').textContent=device.template||'当前设备';
        deviceDraftPoints=clone(device.points);deviceDraftGroups=groupsFrom(device);selectedDeviceGroup=deviceDraftGroups[0]?.name||'默认组';deviceProtocolDraft=clone(device.protocolConfigCache||{[device.protocol]:device.protocolConfig||{}});
        renderProtocolFields(device.protocol,deviceProtocolDraft,'#deviceProtocolFields');$('#deviceProtocolDetails').open=false;renderDevicePoints();updateWizard();openModal('addDeviceModal');
      };
      const saveEditedDevice=()=>{
        const device=devices.find(item=>item.id===editingDeviceId);if(!device||currentPumpId!==editingDevicePumpId){toast('设备范围已变化，请重新打开编辑。');closeModal('addDeviceModal');return;}
        const previous=new Map(device.points.map(item=>[item.id,item]));
        const points=deviceDraftPoints.filter(item=>!item.deleted).map(item=>{
          const old=previous.get(item.id),field=standardFields.find(field=>field.code===item.standardCode),saved={...clone(item),precision:Number(item.precision),factor:Number(item.factor),offset:Number(item.offset)};
          saved.value=old&&old.standardCode===item.standardCode?old.value:field?sampleValue(field):null;saved.group=old?.group||field?.category||'其他参数';delete saved.deleted;return saved;
        });
        Object.assign(device,{name:$('#deviceNameInput').value.trim(),ip:$('#deviceIpInput').value.trim(),port:$('#devicePortInput').value,groups:clone(deviceDraftGroups),protocolConfig:clone(deviceProtocolDraft[device.protocol]||{}),points});
        const sources=new Set(points.map(item=>device.id+':'+item.id));cardConfig.items=cardConfig.items.filter(item=>!item.source.startsWith(device.id+':')||sources.has(item.source));
        if(selectedTrendSource.startsWith(device.id+':')&&!sources.has(selectedTrendSource))selectedTrendSource='';
        pumpStates[currentPumpId]={devices,cardConfig};expandedDeviceIds.add(device.id);closeModal('addDeviceModal');editingDeviceId='';editingDevicePumpId='';renderContextSelectors();renderPanel();renderDeviceTable($('#deviceSearch').value);window.sentinelPrototype?.saveSession();toast('设备配置已更新');
      };
      $('#addPlcButton').addEventListener('click', openAddDevice);
      $('#templateChoiceGrid').addEventListener('click', event => { const choice = event.target.closest('[data-template-choice]'); if (!choice) return; selectedTemplateId = choice.dataset.templateChoice; renderTemplateChoices(); });
      ['input','change'].forEach(type=>$('#devicePointBody').addEventListener(type,event=>{const row=event.target.closest('tr');if(!row||!event.target.dataset.field)return;const item=deviceDraftPoints[Number(row.dataset.index)];if(!item.deleted)item[event.target.dataset.field]=event.target.value;}));
      $('#devicePointBody').addEventListener('click',event=>{const button=event.target.closest('[data-point-delete]');if(!button)return;const item=deviceDraftPoints[Number(button.dataset.pointDelete)];item.deleted=!item.deleted;renderDevicePoints();});
      $('#deviceGroupTabs').addEventListener('click',event=>{const tab=event.target.closest('[data-device-group]');if(tab){selectedDeviceGroup=tab.dataset.deviceGroup;renderDevicePoints();}});
      $('#addDevicePoint').addEventListener('click', () => {
        const number = deviceDraftPoints.length + 1;
        deviceDraftPoints.push({...point(`POINT_${number}`, '新增点位', standardFields[0].code, `400${String(number).padStart(2,'0')}`),templateGroup:selectedDeviceGroup});
        renderDevicePoints();
        const rows = $$('#devicePointBody tr');
        rows.at(-1)?.querySelector('input')?.focus();
      });
      const openPointGroup=(target,edit=false)=>{
        groupEditorTarget=target;editingGroupName=edit?(target==='template'?selectedTemplateGroup:selectedDeviceGroup):'';
        const group=(target==='template'?templateDraftGroups:deviceDraftGroups).find(item=>item.name===editingGroupName);
        $('#pointGroupTitle').textContent=edit?'编辑采集组':'新增采集组';$('#pointGroupName').value=group?.name||'';$('#pointGroupInterval').value=group?.intervalMs??1000;$('#pointGroupError').textContent='';openModal('pointGroupModal');
      };
      $('#addDeviceGroup').addEventListener('click',()=>openPointGroup('device'));$('#editDeviceGroup').addEventListener('click',()=>openPointGroup('device',true));
      $('#addTemplateGroup').addEventListener('click',()=>openPointGroup('template'));$('#editTemplateGroup').addEventListener('click',()=>openPointGroup('template',true));
      document.addEventListener('keydown',event=>{if(event.key==='Escape'&&$('#pointGroupModal').classList.contains('open')){event.preventDefault();event.stopImmediatePropagation();closeModal('pointGroupModal');}},true);
      $('#savePointGroup').addEventListener('click',()=>{
        const name=$('#pointGroupName').value.trim(),intervalMs=Number($('#pointGroupInterval').value),groups=groupEditorTarget==='template'?templateDraftGroups:deviceDraftGroups;
        const error=$('#pointGroupError');error.textContent='';if(!name){error.textContent='请填写组名。';return;}if(!Number.isInteger(intervalMs)||intervalMs<=0){error.textContent='采集间隔须为大于 0 的整数（ms）。';return;}if(groups.some(group=>group.name===name&&group.name!==editingGroupName)){error.textContent='组名不能重复。';return;}
        const group=groups.find(item=>item.name===editingGroupName);if(group){group.name=name;group.intervalMs=intervalMs;const points=groupEditorTarget==='template'?templateDraftPoints:deviceDraftPoints;points.filter(item=>(item.templateGroup||'默认组')===editingGroupName).forEach(item=>item.templateGroup=name);}else groups.push({name,intervalMs});
        if(groupEditorTarget==='template'){selectedTemplateGroup=name;renderTemplatePoints();}else{selectedDeviceGroup=name;renderDevicePoints();}closeModal('pointGroupModal');
      });
      const sampleValue = field => field.type === 'BOOLEAN' ? '运行' : ({ inlet_pressure:.31, outlet_pressure:2.46, running_frequency:35.2, current_ab:9.2, current_bc:9.0, current_ca:9.1, voltage_a:381.4, total_energy:631169.2, active_power:119.4, bearing_temperature:42.6 }[field.code] ?? 18.6);
      const saveDraftDevice = status => {
        if (deviceDraftSaved) { const existing = devices.at(-1); existing.enabled = true; existing.status = status; renderPanel(); renderDeviceTable(); return existing; }
        const template = templates.find(item => item.id === selectedTemplateId) || templates[0];
        const deviceId = `plc-${Date.now()}`;
        const newDevice = { id: deviceId, name: $('#deviceNameInput').value.trim() || `PLC-${devices.length + 1}`, template: template.name, protocol: $('#deviceProtocolInput').value, ip: $('#deviceIpInput').value,port:$('#devicePortInput').value,groups:clone(deviceDraftGroups),protocolConfig:clone(deviceProtocolDraft[$('#deviceProtocolInput').value]||{}), enabled: true, status, points: deviceDraftPoints.filter(item=>!item.deleted).map((item,index) => {
          const field = standardFields.find(field => field.code === item.standardCode) || standardFields[0];
          const saved={ ...clone(item), id: `point-${index}`, value: sampleValue(field), unit: item.unit || field.unit, group: field.category };delete saved.deleted;return saved;
        })};
        devices.push(newDevice);
        deviceDraftSaved = true;
        pumpStates[currentPumpId].devices = devices;
        expandedDeviceIds.add(newDevice.id);
        renderContextSelectors(); renderPanel(); renderDeviceTable();
        return newDevice;
      };
      const renderConnectionState = state => {
        clearTimeout(connectionTimer);
        connectionViewState = state;
        wizardConnected = state === 'success';
        $$('[data-connection-demo]').forEach(button => button.classList.toggle('active', button.dataset.connectionDemo === state));
        const visual = $('#connectionVisual');
        visual.className = `connection-visual ${state === 'success' ? 'success' : state === 'failure' ? 'failure' : ''}`;
        if (state === 'success') visual.innerHTML = `<span class="connection-icon">✓</span><h3>PLC 设备连接成功</h3><p>${esc($('#deviceNameInput').value.trim() || '当前 PLC 设备')} 已开始通过中转平台传输标准化数据</p>`;
        else if (state === 'failure') visual.innerHTML = '<span class="connection-icon">!</span><h3>PLC 设备未传回信息</h3><p>当前未收到设备响应，你可以再次尝试、返回上一步检查配置，或跳过连接完成配置。</p><div class="connection-failure-actions"><button class="retry" data-failure-action="retry" type="button">再次尝试</button><button data-failure-action="back" type="button">返回上一步</button><button class="skip" data-failure-action="skip" type="button">跳过连接并完成配置</button></div>';
        else visual.innerHTML = '<span class="connection-icon">⇄</span><h3>正在连接中转平台</h3><p>正在提交设备信息与点位配置，请稍候…</p><div class="progress-track"><i></i></div>';
        updateWizard();
      };
      const finishConnection = () => {
        const newDevice = saveDraftDevice('online');
        renderConnectionState('success');
        $('#connectionVisual p').textContent = `${newDevice.name} 已开始通过中转平台传输标准化数据`;
      };
      $$('[data-connection-demo]').forEach(button => button.addEventListener('click', () => renderConnectionState(button.dataset.connectionDemo)));
      $('#connectionVisual').addEventListener('click', event => {
        const action = event.target.closest('[data-failure-action]')?.dataset.failureAction;
        if (action === 'retry') { renderConnectionState('loading'); connectionTimer = setTimeout(() => renderConnectionState('failure'), 1300); }
        if (action === 'back') { clearTimeout(connectionTimer); wizardStep = 2; wizardConnected = false; updateWizard(); }
        if (action === 'skip') { saveDraftDevice('offline'); closeModal('addDeviceModal'); setManagementTab('devices'); renderDeviceTable(); toast('已跳过连接，PLC 配置保存为未连接状态'); }
      });
      $('#wizardNext').addEventListener('click', () => {
        if (wizardStep === 1) {if(!templates.some(item=>item.id===selectedTemplateId&&item.enabled!==false))return toast('请选择一个启用模板');prepareDeviceForm(); wizardStep = 2; updateWizard(); return; }
        if (wizardStep === 2) { if ($('#deviceProtocolInput').value!=='Modbus RTU'&&!$('#deviceIpInput').value.trim()) return toast('请填写设备 IP 地址');if(!$('#deviceNameInput').value.trim())return toast('请填写设备名称');const invalid=validateDraftPoints(deviceDraftPoints);if(invalid)return toast(invalid);const port=Number($('#devicePortInput').value);if($('#deviceProtocolInput').value!=='Modbus RTU'&&(!Number.isInteger(port)||port<1||port>65535))return toast('请填写有效端口号');const protocol=$('#deviceProtocolInput').value,values=deviceProtocolDraft[protocol]||{};if((protocolSchemas[protocol]||[]).some(field=>field.type==='number'&&(!Number.isInteger(Number(values[field.key]))||Number(values[field.key])<0||values[field.key]==='')))return toast('请填写有效的协议数值配置');if(editingDeviceId){saveEditedDevice();return;}wizardStep = 3; renderConnectionState('loading'); connectionTimer = setTimeout(finishConnection, 1300); return; }
        if (wizardStep === 3 && wizardConnected) { saveDraftDevice('online'); closeModal('addDeviceModal'); setManagementTab('devices'); renderDeviceTable(); toast('PLC 已接入，可在设备条目中配置展示参数'); }
      });
      $('#wizardPrevious').addEventListener('click', () => { clearTimeout(connectionTimer); if (editingDeviceId||wizardStep === 1) return closeModal('addDeviceModal'); wizardStep -= 1; wizardConnected = false; updateWizard(); });

