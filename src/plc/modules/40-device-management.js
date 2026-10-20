// 40-device-management.js — compiled in declaration order by build-prototypes.cjs
      const displayTypeName = type => ({ number:'数值＋单位', status:'状态标签', progress:'进度条', trend:'小型趋势' }[type] || '数值＋单位');
      const pointCurrentValue = metric => `${typeof metric.value === 'number' ? metric.value.toLocaleString('zh-CN', { maximumFractionDigits: metric.precision ?? 2 }) : metric.value}${metric.unit && metric.unit !== '-' ? ` ${metric.unit}` : ''}`;
      const renderDeviceTable = (query = '') => {
        const status = $('#deviceStatusFilter').value;
        const filtered = devices.filter(device => {
          const matchesQuery = `${device.name}${device.ip}`.toLowerCase().includes(query.toLowerCase());
          return matchesQuery && (status === 'all' || device.status === status);
        });
        $('#plcDeviceTableBody').innerHTML = filtered.map(device => {
          const enabled = device.enabled !== false;
          const included = cardConfig.items.filter(item => item.source.startsWith(`${device.id}:`)).length;
          const isOpen = expandedDeviceIds.has(device.id);
          const points = device.points.map(metric => {
            const source = `${device.id}:${metric.id}`;
            const field = standardFields.find(item => item.code === metric.standardCode);
            return `<tr data-source="${esc(source)}"><td><strong>${esc(metric.name)}</strong><small>${esc(metric.key)}</small></td><td>${esc(field?.name || metric.standardCode)}<small>${esc(metric.standardCode)}</small></td><td>${enabled ? esc(pointCurrentValue(metric)) : '—'}</td><td>${esc(metric.address || '—')}</td><td>${esc(metric.precision ?? 2)}</td><td>${esc(metric.factor ?? 1)}</td><td>${esc(metric.offset ?? 0)}</td></tr>`;
          }).join('');
          return `<tr class="device-row ${isOpen ? 'open' : ''}" data-device-row="${device.id}" tabindex="0" role="button" aria-expanded="${isOpen}" aria-label="${isOpen ? '收起' : '展开'} ${esc(device.name)} 的点位"><td><div class="device-name-cell"><span class="device-plc-icon">PLC</span><span>${esc(device.name)}</span></div></td><td>${esc(device.protocol)}</td><td>${esc(device.protocol==='Modbus RTU'?(device.protocolConfig?.serial||'—'):device.ip+':'+(device.port||(device.protocol==='S7'?'102':'502')))}</td><td>${device.points.length}</td><td>${included} / ${device.points.length}</td><td><span class="enable-tag ${enabled ? '' : 'disabled'}">${enabled ? '已启用' : '已停用'}</span></td><td><span class="connection-tag ${enabled && device.status === 'online' ? '' : 'offline'}">${enabled && device.status === 'online' ? '已连接' : '未连接'}</span></td><td><div class="table-actions">${enabled ? `<button type="button" data-reconnect-device="${device.id}">重新连接</button>` : ''}<button type="button" data-toggle-device="${device.id}">${enabled ? '停用' : '启用'}</button><button class="danger-link" type="button" data-delete-device="${device.id}">删除</button><span class="row-chevron" aria-hidden="true">⌄</span></div></td></tr>${isOpen ? `<tr class="device-detail-row"><td colspan="8"><div class="device-config-panel">${enabled ? '' : '<div class="device-disabled-note">设备已停用，当前不接收实时数据；点位和卡片配置已保留。</div>'}<div class="device-config-head"><div><h4>${esc(device.name)} · 组与点位信息</h4><p>查看点位配置；如需调整设备、采集组或点位，请点击“编辑设备”。</p></div><button class="secondary-action" type="button" data-edit-device="${esc(device.id)}">编辑设备</button></div><table class="embedded-point-table device-point-summary"><thead><tr><th>设备点位</th><th>标准字段</th><th>当前值</th><th>点位地址</th><th>精度</th><th>系数</th><th>偏移量</th></tr></thead><tbody>${points}</tbody></table></div></td></tr>` : ''}`;
        }).join('');
        $('#deviceCount').textContent = `共 ${filtered.length} 台设备`;
      };
      $('#templateSearch').addEventListener('input', event => renderTemplateTable(event.target.value));
      $('#fieldSearch').addEventListener('input', event => renderFieldTable(event.target.value));
      $('#deviceSearch').addEventListener('input', event => renderDeviceTable(event.target.value));
      $('#deviceStatusFilter').addEventListener('change', () => renderDeviceTable($('#deviceSearch').value));
      $('#warningFieldSearch').addEventListener('input', renderWarningRules);
      $('#warningTypeFilter').addEventListener('change', renderWarningRules);
      $('#warningStatusFilter').addEventListener('change', renderWarningRules);
      $('#warningScopeSwitch').addEventListener('click', event => {
        const button = event.target.closest('[data-warning-scope]'); if (!button) return;
        alertScopeMode = button.dataset.warningScope;
        $$('[data-warning-scope]').forEach(item => {item.classList.toggle('active', item === button);item.setAttribute('aria-selected',String(item===button));});
        $('#warningPumpContext').classList.toggle('disabled', alertScopeMode === 'default');
        $('#warningPumpContext').hidden=alertScopeMode==='default';
        updateWarningScopeNote();
        renderWarningRules();
      });
      $('#warningRuleTableBody').addEventListener('click', event => {
        const toggle=event.target.closest('[data-toggle-warning]');
        if(toggle){const code=toggle.dataset.toggleWarning;let rule=displayedRule(code);if(!rule||toggle.disabled)return;if(alertScopeMode==='pump'&&!configuredRule(code)){rule=clone(rule);(pumpThresholdRules[currentPumpId]||={})[code]=rule;}rule.enabled=rule.enabled===false;renderWarningRules();renderPanel();toast(rule.enabled?'规则已启用':'规则已停用');return;}
        const row = event.target.closest('[data-warning-field]'); if (!row) return;
        openWarningRuleEditor(standardFields.find(field => field.code === row.dataset.warningField));
      });
      $('#warningRuleTableBody').addEventListener('keydown', event => {
        if (event.target.closest('button')) return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const row = event.target.closest('[data-warning-field]'); if (!row) return;
        event.preventDefault(); openWarningRuleEditor(standardFields.find(field => field.code === row.dataset.warningField));
      });
      $('#projectSelect').addEventListener('change', event => {
        const project = hierarchy.find(item => item.id === event.target.value) || hierarchy[0];
        const plant = project.plants[0];
        const unit = plant.units[0];
        switchPumpContext(project.id, plant.id, unit.id, unit.pumps[0].id);
      });
      $('#plantSelect').addEventListener('change', event => {
        const project = hierarchy.find(item => item.id === currentProjectId) || hierarchy[0];
        const plant = project.plants.find(item => item.id === event.target.value) || project.plants[0];
        const unit = plant.units[0];
        switchPumpContext(project.id, plant.id, unit.id, unit.pumps[0].id);
      });
      $('#unitSelect').addEventListener('change', event => {
        const project = hierarchy.find(item => item.id === currentProjectId) || hierarchy[0];
        const plant = project.plants.find(item => item.id === currentPlantId) || project.plants[0];
        const unit = plant.units.find(item => item.id === event.target.value) || plant.units[0];
        switchPumpContext(project.id, plant.id, unit.id, unit.pumps[0].id);
      });
      $('#pumpSelect').addEventListener('change', event => switchPumpContext(currentProjectId, currentPlantId, currentUnitId, event.target.value));
      $('#alertProjectSelect').addEventListener('change', event => {
        const project = hierarchy.find(item => item.id === event.target.value) || hierarchy[0];
        const plant = project.plants[0];
        const unit = plant.units[0];
        switchPumpContext(project.id, plant.id, unit.id, unit.pumps[0].id);
        updateWarningScopeNote();
      });
      $('#alertPlantSelect').addEventListener('change', event => {
        const project = hierarchy.find(item => item.id === currentProjectId) || hierarchy[0];
        const plant = project.plants.find(item => item.id === event.target.value) || project.plants[0];
        const unit = plant.units[0];
        switchPumpContext(project.id, plant.id, unit.id, unit.pumps[0].id);
        updateWarningScopeNote();
      });
      $('#alertUnitSelect').addEventListener('change',event=>{
        const context=currentContext(),unit=context.plant.units.find(item=>item.id===event.target.value)||context.plant.units[0];
        switchPumpContext(currentProjectId,currentPlantId,unit.id,unit.pumps[0].id);updateWarningScopeNote();
      });
      $('#alertPumpSelect').addEventListener('change', event => {
        const context = currentContext();
        const unit = context.plant.units.find(item => item.pumps.some(pump => pump.id === event.target.value)) || context.plant.units[0];
        switchPumpContext(currentProjectId, currentPlantId, unit.id, event.target.value);
        updateWarningScopeNote();
      });
      $('#openPumpTree').addEventListener('click', event => { event.stopPropagation(); setPumpTreeOpen(!$('#pumpTreePopover').classList.contains('open')); });
      $('#closePumpTree').addEventListener('click', () => setPumpTreeOpen(false));
      $('#pumpTreePopover').addEventListener('click', event => event.stopPropagation());
      $('#pumpTreeSearch').addEventListener('input', event => renderPumpTree(event.target.value));
      $('#pumpTreeContent').addEventListener('click', event => {
        const pump = event.target.closest('[data-tree-pump]');
        if (pump) switchPumpContext(pump.dataset.treeProject, pump.dataset.treePlant, pump.dataset.treeUnit, pump.dataset.treePump);
      });
      document.addEventListener('click', () => setPumpTreeOpen(false));

      const setManagementTab = tabName => {
        $$('[data-management-tab]').forEach(item => item.classList.toggle('active', item.dataset.managementTab === tabName));
        $$('.management-tab').forEach(tab => tab.classList.toggle('active', tab.id === `${tabName}Tab`));
      };
      $('#plcManagementEntry').addEventListener('click', () => {
        setAccountMenu(false); setPanelOpen(false); setManagementTab('devices'); $('#managementView').classList.add('open'); $('#managementView').setAttribute('aria-hidden','false'); renderDeviceTable(); renderTemplateTable(); renderFieldTable(); renderWarningRules();
      });
      $('#closeManagement').addEventListener('click', () => { $('#managementView').classList.remove('open'); $('#managementView').setAttribute('aria-hidden','true'); });
      $$('[data-management-tab]').forEach(button => button.addEventListener('click', () => {
        setManagementTab(button.dataset.managementTab);
        if (button.dataset.managementTab === 'alerts') renderWarningRules();
      }));

      const openDeviceAction = (action, deviceId) => {
        const device = devices.find(item => item.id === deviceId); if (!device) return;
        pendingDeviceAction = action; pendingDeviceId = deviceId;
        const title = action === 'delete' ? '删除 PLC 设备' : device.enabled === false ? '启用 PLC 设备' : '停用 PLC 设备';
        $('#deviceActionTitle').textContent = title;
        const content = $('#deviceActionContent');
        if (action === 'delete') content.innerHTML = `<div class="action-confirm-icon">!</div><div><h3>确认删除“${esc(device.name)}”吗？</h3><p>删除后将解除该设备与当前泵机的绑定。</p><ul><li>移除数据卡片中引用该设备点位的参数</li><li>设备模板和标准字段库不受影响</li><li>设备已产生的历史数据继续保留</li></ul></div>`;
        else if (device.enabled === false) content.innerHTML = `<div class="action-confirm-icon">✓</div><div><h3>确认启用“${esc(device.name)}”吗？</h3><p>启用后系统将自动向中转平台重新发起连接。</p><ul><li>恢复实时数据接收</li><li>恢复原有卡片参数配置</li></ul></div>`;
        else content.innerHTML = `<div class="action-confirm-icon">!</div><div><h3>确认停用“${esc(device.name)}”吗？</h3><p>停用后设备将停止连接和实时数据接收。</p><ul><li>点位和卡片配置继续保留</li><li>实时卡片相关参数显示暂无数据</li><li>历史趋势数据仍可查看</li></ul></div>`;
        content.classList.toggle('delete', action === 'delete');
        const confirm = $('#confirmDeviceAction');
        confirm.textContent = action === 'delete' ? '确认删除' : device.enabled === false ? '确认启用' : '确认停用';
        confirm.className = device.enabled === false && action !== 'delete' ? 'primary-action' : 'danger-action';
        openModal('deviceActionModal');
      };

      $('#confirmDeviceAction').addEventListener('click', () => {
        const device = devices.find(item => item.id === pendingDeviceId); if (!device) return closeModal('deviceActionModal');
        if (pendingDeviceAction === 'delete') {
          devices = devices.filter(item => item.id !== pendingDeviceId);
          cardConfig.items = cardConfig.items.filter(item => !item.source.startsWith(`${pendingDeviceId}:`));
          expandedDeviceIds.delete(pendingDeviceId);
          if (selectedTrendSource.startsWith(`${pendingDeviceId}:`)) selectedTrendSource = '';
          pumpStates[currentPumpId] = { devices, cardConfig };
          closeModal('deviceActionModal'); renderContextSelectors(); renderDeviceTable($('#deviceSearch').value); renderPanel(); toast(`${device.name} 已删除，历史数据已保留`); return;
        }
        const enabling = device.enabled === false;
        device.enabled = enabling;
        device.status = enabling ? 'online' : 'offline';
        pumpStates[currentPumpId] = { devices, cardConfig };
        closeModal('deviceActionModal'); renderDeviceTable($('#deviceSearch').value); renderPanel(); toast(enabling ? `${device.name} 已启用并重新连接` : `${device.name} 已停用`);
      });

      $('#plcDeviceTableBody').addEventListener('click', event => {
        const edit=event.target.closest('[data-edit-device]');if(edit)return openDeviceEditor(edit.dataset.editDevice);
        const reconnect = event.target.closest('[data-reconnect-device]');
        if (reconnect) { const device = devices.find(item => item.id === reconnect.dataset.reconnectDevice); toast(`${device?.name || 'PLC'} 已重新提交连接`); return; }
        const toggle = event.target.closest('[data-toggle-device]');
        if (toggle) return openDeviceAction('toggle', toggle.dataset.toggleDevice);
        const remove = event.target.closest('[data-delete-device]');
        if (remove) return openDeviceAction('delete', remove.dataset.deleteDevice);
        const row = event.target.closest('[data-device-row]');
        if (row) { expandedDeviceIds.has(row.dataset.deviceRow) ? expandedDeviceIds.delete(row.dataset.deviceRow) : expandedDeviceIds.add(row.dataset.deviceRow); renderDeviceTable($('#deviceSearch').value); }
      });
      $('#plcDeviceTableBody').addEventListener('keydown', event => {
        if(event.target.closest('button,input,select'))return;
        const row = event.target.closest('[data-device-row]');
        if (!row || !['Enter',' '].includes(event.key)) return;
        event.preventDefault();
        expandedDeviceIds.has(row.dataset.deviceRow) ? expandedDeviceIds.delete(row.dataset.deviceRow) : expandedDeviceIds.add(row.dataset.deviceRow);
        renderDeviceTable($('#deviceSearch').value);
      });
      $('#plcDeviceTableBody').addEventListener('change', event => {
        const displayToggle = event.target.closest('[data-display-toggle]');
        if (displayToggle) {
          const source = displayToggle.dataset.displayToggle;
          if (displayToggle.checked) { const found = findSource(source); if (found && !cardConfig.items.some(item => item.source === source)) { const group = found.metric.group || '其他参数'; cardConfig.groups ||= []; if (!cardConfig.groups.includes(group)) cardConfig.groups.push(group); cardConfig.items.push({ source, label:found.metric.name, type:found.metric.type === 'BOOL' ? 'status' : 'number', span:1, group }); } }
          else cardConfig.items = cardConfig.items.filter(item => item.source !== source);
          pumpStates[currentPumpId].cardConfig = cardConfig;
          renderContextSelectors(); renderPanel(); renderDeviceTable($('#deviceSearch').value); return;
        }
        const cardField = event.target.closest('[data-device-card-field]');
        if (cardField) { const item = cardConfig.items.find(config => config.source === cardField.dataset.source); if (item) item[cardField.dataset.deviceCardField] = cardField.value; renderPanel(); renderDeviceTable($('#deviceSearch').value); return; }
        const pointField = event.target.closest('[data-point-field]');
        if (pointField) { const found = findSource(pointField.dataset.source); if (found) found.metric[pointField.dataset.pointField] = Number(pointField.value); renderPanel(); renderDeviceTable($('#deviceSearch').value); }
      });

