// 10-navigation.js — compiled in declaration order by build-prototypes.cjs
      const openModal = id => { const el = document.getElementById(id); el.classList.add('open'); el.setAttribute('aria-hidden','false'); };
      const closeModal = id => { const el = document.getElementById(id); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); };
      const toast = message => { clearTimeout(toastTimer); $('#toast').textContent = message; $('#toast').classList.add('show'); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 1800); };

      const currentContext = () => {
        const project = hierarchy.find(item => item.id === currentProjectId) || hierarchy[0];
        const plant = project.plants.find(item => item.id === currentPlantId) || project.plants[0];
        const unit = plant.units.find(item => item.id === currentUnitId) || plant.units[0];
        const pump = unit.pumps.find(item => item.id === currentPumpId) || unit.pumps[0];
        return { project, plant, unit, pump, text:`${project.name} / ${plant.name} / ${unit.name} / ${pump.name}` };
      };
      const renderContextSelectors = () => {
        const context = currentContext();
        $('#projectSelect').innerHTML = hierarchy.map(item => `<option value="${item.id}" ${item.id === context.project.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#plantSelect').innerHTML = context.project.plants.map(item => `<option value="${item.id}" ${item.id === context.plant.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#unitSelect').innerHTML = context.plant.units.map(item => `<option value="${item.id}" ${item.id === context.unit.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#pumpSelect').innerHTML = context.unit.pumps.map(item => `<option value="${item.id}" ${item.id === context.pump.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#alertProjectSelect').innerHTML = hierarchy.map(item => `<option value="${item.id}" ${item.id === context.project.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#alertPlantSelect').innerHTML = context.project.plants.map(item => `<option value="${item.id}" ${item.id === context.plant.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#alertUnitSelect').innerHTML = context.plant.units.map(item => `<option value="${item.id}" ${item.id === context.unit.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#alertPumpSelect').innerHTML = context.unit.pumps.map(item => `<option value="${item.id}" ${item.id === context.pump.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('');
        $('#currentPumpSummary').textContent = `${devices.length} 台 PLC · ${cardConfig.items.length} 个卡片参数`;
        $('#deviceBindingContext').textContent = context.text;
        $('#editorContextPath').textContent = context.text;
      };
      const renderPumpTree = (query = '') => {
        const keyword = query.trim().toLowerCase();
        const sections = hierarchy.map(project => {
          const plants = project.plants.map(plant => {
            const units = plant.units.map(unit => {
              const pumps = unit.pumps.filter(pump => !keyword || `${project.name}${plant.name}${unit.name}${pump.name}`.toLowerCase().includes(keyword));
              if (!pumps.length) return '';
              return `<div class="tree-unit"><div class="tree-plant-title">⌄ ${esc(unit.name)}</div>${pumps.map(pump => `<button class="tree-pump ${pump.id === currentPumpId ? 'active' : ''}" type="button" data-tree-project="${project.id}" data-tree-plant="${plant.id}" data-tree-unit="${unit.id}" data-tree-pump="${pump.id}"><i></i>${esc(pump.name)}</button>`).join('')}</div>`;
            }).join('');
            return units ? `<div class="tree-plant"><div class="tree-project">${esc(plant.name)}</div>${units}</div>` : '';
          }).join('');
          return plants ? `<div class="tree-project">▣ ${esc(project.name)}</div>${plants}` : '';
        }).join('');
        $('#pumpTreeContent').innerHTML = sections || '<div class="tree-empty">未找到匹配的设备</div>';
      };
      const setPumpTreeOpen = open => {
        $('#pumpTreePopover').classList.toggle('open', open);
        $('#pumpTreePopover').setAttribute('aria-hidden', String(!open));
        if (open) { $('#pumpTreeSearch').value = ''; renderPumpTree(); setTimeout(() => $('#pumpTreeSearch').focus(), 0); }
      };
      const switchPumpContext = (projectId, plantId, unitId, pumpId, announce = true) => {
        pumpStates[currentPumpId] = { devices, cardConfig };
        currentProjectId = projectId;
        currentPlantId = plantId;
        currentUnitId = unitId;
        currentPumpId = pumpId;
        const state = pumpStates[currentPumpId] || { devices:[], cardConfig:{ columns:4, groups:[], items:[] } };
        pumpStates[currentPumpId] = state;
        devices = state.devices;
        cardConfig = state.cardConfig;
        workingConfig = clone(cardConfig);
        selectedTrendSource = '';
        $('#trendPanel').classList.remove('open');
        $('#trendPanel').setAttribute('aria-hidden','true');
        expandedDeviceIds.clear();
        if (devices[0]) expandedDeviceIds.add(devices[0].id);
        $('#deviceSearch').value = '';
        $('#deviceStatusFilter').value = 'all';
        renderContextSelectors();
        renderDeviceTable();
        renderPanel();
        renderWarningRules();
        if (alertScopeMode === 'pump') updateWarningScopeNote();
        setPumpTreeOpen(false);
        if (announce) toast(`已切换至 ${currentContext().pump.name}`);
      };

      const plcButton = $('#plcButton');
      const plcPanel = $('#plcPanel');
      const setPanelOpen = (open, returnFocus = false) => {
        plcButton.setAttribute('aria-expanded', String(open));
        plcPanel.setAttribute('aria-hidden', String(!open));
        plcPanel.classList.toggle('open', open);
        if (!open) { selectedTrendSource = ''; $('#trendPanel').classList.remove('open'); $('#trendPanel').setAttribute('aria-hidden','true'); renderPanel(); }
        if (!open && returnFocus) plcButton.focus();
      };
      plcButton.addEventListener('click', () => setPanelOpen(plcButton.getAttribute('aria-expanded') !== 'true'));
      $('#plcClose').addEventListener('click', () => setPanelOpen(false, true));
      $('#plcMetricSections').addEventListener('click', event => {
        const metric = event.target.closest('[data-trend-source]'); if (!metric) return;
        selectedTrendSource = metric.dataset.trendSource;
        renderPanel(); renderTrendPanel();
      });
      $('#trendClose').addEventListener('click', () => {
        selectedTrendSource = ''; $('#trendPanel').classList.remove('open'); $('#trendPanel').setAttribute('aria-hidden','true'); renderPanel();
      });
      $('#trendRangeButtons').addEventListener('click', event => {
        const button = event.target.closest('[data-trend-range]'); if (!button) return;
        trendRange = button.dataset.trendRange; renderTrendPanel();
      });
      $('#applyCustomTrendRange').addEventListener('click', () => {
        const start = new Date($('#trendStartTime').value), end = new Date($('#trendEndTime').value);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) return toast('请选择有效的开始和结束时间');
        trendRange = 'custom'; renderTrendPanel();
      });

      const accountButton = $('#userMenuButton');
      const accountMenu = $('#accountMenu');
      const setAccountMenu = open => {
        accountMenu.classList.toggle('open', open);
        accountMenu.setAttribute('aria-hidden', String(!open));
        accountButton.setAttribute('aria-expanded', String(open));
      };
      accountButton.addEventListener('click', event => { event.stopPropagation(); setAccountMenu(!accountMenu.classList.contains('open')); });
      accountMenu.addEventListener('click', event => event.stopPropagation());
      document.addEventListener('click', () => setAccountMenu(false));

