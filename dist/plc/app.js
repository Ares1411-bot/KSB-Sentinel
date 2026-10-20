// Generated from src/plc/modules/*.js; edit the source fragments.
(() => {
// 00-state-and-trends.js — compiled in declaration order by build-prototypes.cjs

      const $ = (selector, root = document) => root.querySelector(selector);
      const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
      const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
      const clone = value => JSON.parse(JSON.stringify(value));

      const {standardFields,thresholdRules,pumpThresholdRules,thresholdAlertHistory,severityNames,severityColors,fieldOptions,point,templatePoint,templates,normalizeDevicePoint,baseDevices,baseCardConfig,hierarchy,pumpStates} = window.createPLCDemoData();
      let warningLevelDraft=[],warningConditionDraft='range';
      const savedContext=window.SentinelSession.get('context',{});
      let currentProjectId = savedContext.projectId || 'project-demo';
      let currentPlantId = savedContext.plantId || 'plant-water';
      let currentUnitId = savedContext.unitId || 'unit-water-main';
      let currentPumpId = savedContext.pumpId || 'pump-omega-1';
      let devices = pumpStates[currentPumpId].devices;
      let cardConfig = pumpStates[currentPumpId].cardConfig;
      let workingConfig = clone(cardConfig);
      let selectedEditorSource = '';
      let selectedEditorGroup = '';
      let draggedEditorSource = '';
      let editorUndoStack = [];
      let editorRedoStack = [];
      let templateDraftPoints = [];
      let templateDraftGroups=[],templateProtocolDraft={},deviceProtocolDraft={},deviceDraftGroups=[],selectedDeviceGroup='',groupEditorTarget='device',editingGroupName='';
      let editingTemplateId = '';
      let selectedTemplateGroup = '';
      let selectedTemplateId = templates[0].id;
      let deviceDraftPoints = [];
      let preparedDeviceTemplateId='',editingDeviceId='',editingDevicePumpId='';
      let wizardStep = 1;
      let wizardConnected = false;
      let connectionViewState = 'loading';
      let deviceDraftSaved = false;
      let connectionTimer;
      const expandedDeviceIds = new Set(['plc-main']);
      let selectedTrendSource = '';
      let trendRange = '24h';
      let editingFieldCode = '';
      let alertScopeMode = 'default';
      let editingWarningFieldCode = '';
      let pendingDeviceAction = '';
      let pendingDeviceId = '';
      let toastTimer;

      const findSource = source => {
        const [deviceId, pointId] = source.split(':');
        const device = devices.find(item => item.id === deviceId);
        const metric = device?.points.find(item => item.id === pointId);
        return device && metric ? { device, metric } : null;
      };

      const effectiveThresholdRule = code => {
        const field=standardFields.find(item=>item.code===code),rule=pumpThresholdRules[currentPumpId]?.[code]||thresholdRules[code]||null;
        return field?.enabled===false||rule?.enabled===false?null:rule;
      };
      const thresholdRuleFor=source=>effectiveThresholdRule(source?.metric?.standardCode);
      const thresholdEventsFor=source=>window.PLCRecords ? window.PLCRecords.trendEvents(source) : (thresholdAlertHistory[source?.metric?.standardCode]||[]).map(event=>({...event,time:new Date(Date.now()-event.hoursAgo*3600000)}));
      const matchesLevel=(value,level)=>level.abnormalValue!=null?String(value)===String(level.abnormalValue):Number.isFinite(Number(value))&&((level.min!=null&&Number(value)<level.min)||(level.max!=null&&Number(value)>level.max));
      const matchedLevel=(value,rule)=>(rule?.levels||[]).filter(level=>matchesLevel(value,level)).sort((a,b)=>severityNames.indexOf(b.severity)-severityNames.indexOf(a.severity))[0]||null;
      const isThresholdExceeded=(value,rule)=>Boolean(matchedLevel(value,rule));
      const levelText=level=>level.abnormalValue!=null?'等于“'+level.abnormalValue+'”':level.min!=null&&level.max!=null?'超出 '+level.min+'～'+level.max:level.max!=null?'高于 '+level.max:'低于 '+level.min;
      const thresholdDirection=(value,rule)=>{const level=matchedLevel(value,rule);return level?level.severity+' · '+levelText(level):'处于正常范围';};
      const thresholdText=(source,rule=thresholdRuleFor(source))=>rule?rule.levels.map(level=>level.severity+'：'+levelText(level)).join('；'):'阈值：未配置或已停用';
      const thresholdState=source=>{const rule=thresholdRuleFor(source),level=source?.device?.enabled!==false?matchedLevel(source?.metric?.value,rule):null;return{rule,level,currentExceeded:Boolean(level),hadHistory:thresholdEventsFor(source).length>0};};

      const metricValue = ({ device, metric }, type, preview = false) => {
        if (!preview && device.enabled === false) return '<strong class="metric-unavailable">—</strong><span class="metric-state-note">设备已停用</span>';
        const value = typeof metric.value === 'number' ? metric.value.toLocaleString('zh-CN', { maximumFractionDigits: metric.precision ?? 2 }) : metric.value;
        const unit = metric.unit && metric.unit !== '-' ? metric.unit : '';
        if (type === 'status') return `<span class="${preview ? '' : 'metric-value status-value'}">${esc(value)}</span>`;
        if (type === 'progress') return `<strong>${esc(value)}${esc(unit)}</strong><div class="mini-progress"><i style="width:${Math.max(15, Math.min(92, Number(metric.value) || 68))}%"></i></div>`;
        if (type === 'trend') return `<strong>${esc(value)}${esc(unit)}</strong><svg class="mini-trend" viewBox="0 0 100 20" preserveAspectRatio="none"><path d="M0 15 L13 12 L26 14 L39 7 L52 10 L65 5 L78 8 L100 3"/></svg><span class="mini-expand" role="button" tabindex="0" data-expand-source="${esc(device.id+':'+metric.id)}" aria-label="放大查看${esc(metric.name)}趋势">⤢ 放大查看</span>`;
        return `<strong>${esc(value)}${esc(unit)}</strong>`;
      };

      const renderPanel = () => {
        if (selectedTrendSource && !findSource(selectedTrendSource)) selectedTrendSource = '';
        $('#plcPanelTitle').textContent = `PLC 数据 · ${currentContext().pump.name}`;
        $('#connectedCount').textContent = `${devices.filter(device => device.enabled !== false && device.status === 'online').length} 台 PLC 已连接`;
        $('#parameterCount').textContent = `${cardConfig.items.length} 个参数已展示`;
        $('#deviceChips').innerHTML = devices.map(device => `<span class="device-chip ${device.enabled === false || device.status !== 'online' ? 'offline' : ''}"><i></i>${esc(device.name)}${device.enabled === false ? ' · 已停用' : ''}</span>`).join('');
        const groups = {};
        cardConfig.items.forEach(item => {
          const source = findSource(item.source);
          if (!source) return;
          const group = item.group || source.metric.group || '其他参数';
          (groups[group] ||= []).push({ item, source });
        });
        const groupOrder = [...new Set([...(cardConfig.groups || []), ...Object.keys(groups)])];
        $('#plcMetricSections').innerHTML = groupOrder.filter(group => groups[group]?.length).map(group => `
          <section class="panel-section"><h3 class="section-title">${esc(group)}</h3>
            <div class="metric-grid dynamic" style="--metric-cols:${cardConfig.columns}">
              ${groups[group].map(({ item, source }) => {
                const state = thresholdState(source);
                const stateClass = state.currentExceeded ? 'threshold-current' : '';
                const badge = state.currentExceeded ? '<span class="threshold-badge" style="color:'+state.level.color+';background:'+state.level.color+'18">'+state.level.severity+'预警</span>' : state.hadHistory ? '<span class="threshold-badge" style="color:#76818e;background:#eef1f4">⚑ 曾预警</span>' : '';
                return `<button class="metric dynamic-metric ${stateClass} ${item.source === selectedTrendSource ? 'selected' : ''}" style="${state.level ? '--warning-color:'+state.level.color : ''}" data-span="${item.span}" data-trend-source="${esc(item.source)}" type="button" aria-pressed="${item.source === selectedTrendSource}"><div class="metric-label">${esc(item.label)}</div>${badge}${metricValue(source, item.type)}<div class="source-hint">${esc(source.device.name)}</div></button>`;
              }).join('')}
            </div>
          </section>`).join('') || '<div class="empty-config">当前泵机尚未配置 PLC 数据卡片</div>';
        if (selectedTrendSource) renderTrendPanel();
        window.PLCRecords?.updateBadge();
      };

      const rangeNames = { '1h':'最近1小时', '6h':'最近6小时', '24h':'最近24小时', '7d':'最近7天', custom:'自定义范围' };
      const selectedTrendBounds = () => {
        const now = new Date();
        const durations = { '1h':3600000, '6h':21600000, '24h':86400000, '7d':604800000 };
        let end = now;
        let start = new Date(now.getTime() - (durations[trendRange] || 86400000));
        if (trendRange === 'custom') {
          const customStart = new Date($('#trendStartTime').value);
          const customEnd = new Date($('#trendEndTime').value);
          if (!Number.isNaN(customStart.getTime()) && !Number.isNaN(customEnd.getTime()) && customStart < customEnd) { start = customStart; end = customEnd; }
        }
        return { start, end };
      };
      const trendTimeBounds = count => {
        const { start, end } = selectedTrendBounds();
        return Array.from({length:count}, (_,index) => new Date(start.getTime() + (end.getTime() - start.getTime()) * index / (count - 1)));
      };
      const trendLabel = date => {
        const longRange = trendRange === '7d' || trendRange === 'custom';
        return date.toLocaleString('zh-CN', longRange ? { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false } : { hour:'2-digit', minute:'2-digit', hour12:false });
      };
      const trendSeries = (source, bounds=selectedTrendBounds()) => {
        const isStatus = source.metric.type === 'BOOL' || standardFields.find(field => field.code === source.metric.standardCode)?.type === 'BOOLEAN';
        const rule = thresholdRuleFor(source);
        const count = trendRange === '7d' ? 15 : 13;
        const times = Array.from({length:count},(_,index)=>new Date(+bounds.start+(bounds.end-bounds.start)*index/(count-1)));
        const base = Number(source.metric.value) || 1;
        const seed = [...source.metric.id].reduce((sum,char) => sum + char.charCodeAt(0),0);
        const values = isStatus ? times.map((_,index) => ((index + seed) % 7 === 0 || (index + seed) % 11 === 0 ? 0 : 1)) : times.map((_,index) => {
          const swing = Math.sin(index * .82 + seed) * .035 + Math.cos(index * .39 + seed / 3) * .018;
          const scale = Math.abs(base) > 10000 ? .0025 : 1;
          return Number((base + base * swing * scale + (Math.sin(index * 1.7) * (Math.abs(base) < 1 ? .018 : 0))).toFixed(source.metric.precision ?? 2));
        });
        if (!isStatus && rule) {
          const { start, end } = bounds;
          thresholdEventsFor(source).filter(event => event.time >= start && event.time <= end).forEach(event => {
            const ratio = (event.time.getTime() - start.getTime()) / (end.getTime() - start.getTime() || 1);
            const index = Math.max(0, Math.min(values.length - 2, Math.round(ratio * (values.length - 1))));
            values[index] = event.value;
          });
        }
        if (isStatus) values[values.length - 1] = String(source.metric.value).includes('停') ? 0 : 1;
        else values[values.length - 1] = Number(source.metric.value) || base;
        return { isStatus, times, values, rule };
      };
      const renderTrendPanel = () => {
        const panel = $('#trendPanel');
        const found = selectedTrendSource ? findSource(selectedTrendSource) : null;
        if (!found) { panel.classList.remove('open'); panel.setAttribute('aria-hidden','true'); return; }
        const item = cardConfig.items.find(config => config.source === selectedTrendSource);
        const title = item?.label || found.metric.name;
        const unit = found.metric.unit && found.metric.unit !== '-' ? found.metric.unit : '';
        $('#trendPanelTitle').textContent = `${title} · 数据趋势`;
        $('#trendPanelSubtitle').textContent = `${currentContext().pump.name} · ${found.device.name} · 历史数据保留`;
        $$('[data-trend-range]').forEach(button => button.classList.toggle('active', button.dataset.trendRange === trendRange));
        $('#customTrendRange').classList.toggle('open', trendRange === 'custom');
        $('#trendRangeLabel').textContent = rangeNames[trendRange];
        $('#trendChartTitle').textContent = `${title}历史变化`;
        const series = trendSeries(found);
        const { values, times, isStatus, rule } = series;
        const { start, end } = selectedTrendBounds();
        const alertEvents = thresholdEventsFor(found).filter(event => event.time >= start && event.time <= end).sort((a,b) => b.time - a.time);
        $('#trendAlertCount').textContent = `${alertEvents.length} 次预警`;
        $('#trendThresholdLabel').textContent = thresholdText(found, rule);
        $('#trendAlertSummary').textContent = alertEvents.length ? `最近一次：${alertEvents[0].time.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})} · 持续 ${alertEvents[0].duration}` : rule ? '所选时间范围内未产生阈值预警' : '该参数暂未配置数值阈值';
        $('#trendAlertList').innerHTML = alertEvents.length ? alertEvents.slice(0,3).map(event => `<div class="trend-alert-item" style="color:${matchedLevel(event.value,rule)?.color || '#76818e'}"><i style="background:${matchedLevel(event.value,rule)?.color || '#76818e'}"></i><strong>${thresholdDirection(event.value, rule)} · ${event.value}${esc(unit)}</strong><time>${event.time.toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false})}</time></div>`).join('') : '<div class="trend-alert-empty">暂无历史预警条目</div>';
        const w = 440, h = 250, left = 42, right = 14, top = 18, bottom = 32;
        const plotW = w - left - right, plotH = h - top - bottom;
        const dataMin = isStatus ? 0 : Math.min(...values), dataMax = isStatus ? 1 : Math.max(...values);
        const scaleValues = isStatus ? values : [...values, ...(rule?.levels||[]).flatMap(level=>[level.min,level.max].filter(value=>value!=null))];
        const scaleMin = isStatus ? 0 : Math.min(...scaleValues), scaleMax = isStatus ? 1 : Math.max(...scaleValues);
        const padding = isStatus ? 0 : Math.max((scaleMax - scaleMin) * .18, Math.abs(scaleMax || 1) * .015);
        const min = isStatus ? 0 : scaleMin - padding, max = isStatus ? 1 : scaleMax + padding;
        const x = index => left + plotW * index / (values.length - 1);
        const y = value => top + plotH * (1 - (value - min) / (max - min || 1));
        let path = `M ${x(0).toFixed(1)} ${y(values[0]).toFixed(1)}`;
        for (let index = 1; index < values.length; index += 1) path += isStatus ? ` H ${x(index).toFixed(1)} V ${y(values[index]).toFixed(1)}` : ` L ${x(index).toFixed(1)} ${y(values[index]).toFixed(1)}`;
        const areaPath = `${path} L ${x(values.length - 1).toFixed(1)} ${(top + plotH).toFixed(1)} L ${x(0).toFixed(1)} ${(top + plotH).toFixed(1)} Z`;
        const grid = Array.from({length:5},(_,index) => {
          const gy = top + plotH * index / 4;
          const value = max - (max - min) * index / 4;
          const label = isStatus ? (index === 0 ? '运行' : index === 4 ? '停止' : '') : value.toLocaleString('zh-CN',{maximumFractionDigits:found.metric.precision ?? 2});
          return `<line class="grid-line" x1="${left}" y1="${gy}" x2="${w-right}" y2="${gy}"/><text class="axis-label" x="${left-7}" y="${gy+3}" text-anchor="end">${esc(label)}</text>`;
        }).join('');
        const tickIndexes = [...new Set([0,Math.floor((values.length-1)/3),Math.floor((values.length-1)*2/3),values.length-1])];
        const xLabels = tickIndexes.map(index => `<text class="axis-label" x="${x(index)}" y="${h-9}" text-anchor="middle">${esc(trendLabel(times[index]))}</text>`).join('');
        let thresholdVisuals = '';
        if (!isStatus && rule) {
          rule.levels.forEach(level=>['min','max'].forEach(side=>{
            if(level[side]==null)return;
            const thresholdY=y(level[side]);
            thresholdVisuals+='<line x1="'+left+'" y1="'+thresholdY+'" x2="'+(w-right)+'" y2="'+thresholdY+'" stroke="'+level.color+'" stroke-width="1.5" stroke-dasharray="5 4"/><text x="'+(w-right-3)+'" y="'+Math.max(top+9,Math.min(top+plotH-4,thresholdY-4))+'" fill="'+level.color+'" font-size="10" text-anchor="end">'+level.severity+' '+(side==='min'?'下限 ':'上限 ')+level[side]+esc(unit)+'</text>';
          }));
        }
        const points = values.map((value,index) => {
          const level = matchedLevel(isStatus ? (value ? '运行' : '停止') : value, rule); const warning=Boolean(level);
          return `<circle class="data-point ${warning ? 'warning' : ''}" style="fill:${level?.color || '#4494ce'};stroke:${level?.color || '#4494ce'}" data-trend-point="${index}" cx="${x(index)}" cy="${y(value)}" r="3.5"><title>${esc(trendLabel(times[index]))} · ${isStatus ? (value ? '运行' : '停止') : `${value}${unit}${warning ? ' · 超出阈值' : ''}`}</title></circle>`;
        }).join('');
        $('#trendChart').innerHTML = `<defs><linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5aace3" stop-opacity=".55"/><stop offset="1" stop-color="#d9edf9" stop-opacity=".08"/></linearGradient></defs>${grid}${thresholdVisuals}<path class="data-area" d="${areaPath}"/><path class="data-line" d="${path}"/>${points}${xLabels}`;
        if (isStatus) {
          const running = Math.round(values.filter(Boolean).length / values.length * 100);
          const switches = values.slice(1).filter((value,index) => value !== values[index]).length;
          $('#trendStats').innerHTML = `<div class="trend-stat"><span>运行占比</span><strong>${running}%</strong></div><div class="trend-stat"><span>状态切换</span><strong>${switches} 次</strong></div><div class="trend-stat"><span>当前状态</span><strong>${values.at(-1) ? '运行' : '停止'}</strong></div>`;
        } else {
          const average = values.reduce((sum,value) => sum + value,0) / values.length;
          $('#trendStats').innerHTML = `<div class="trend-stat"><span>最小值</span><strong>${dataMin.toLocaleString('zh-CN',{maximumFractionDigits:found.metric.precision ?? 2})}${esc(unit)}</strong></div><div class="trend-stat"><span>平均值</span><strong>${average.toLocaleString('zh-CN',{maximumFractionDigits:found.metric.precision ?? 2})}${esc(unit)}</strong></div><div class="trend-stat"><span>最大值</span><strong>${dataMax.toLocaleString('zh-CN',{maximumFractionDigits:found.metric.precision ?? 2})}${esc(unit)}</strong></div>`;
        }
        const currentWarning = !isStatus && isThresholdExceeded(values.at(-1), rule);
        $('#trendTooltip').textContent = `${trendLabel(times.at(-1))} · ${isStatus ? (values.at(-1) ? '运行' : '停止') : `${values.at(-1)} ${unit}${currentWarning ? ' · 超出阈值' : ''}`}`;
        $$('#trendChart [data-trend-point]').forEach(point => point.addEventListener('mouseenter', () => {
          const index = Number(point.dataset.trendPoint);
          const warning = !isStatus && isThresholdExceeded(values[index], rule);
          $('#trendTooltip').textContent = `${trendLabel(times[index])} · ${isStatus ? (values[index] ? '运行' : '停止') : `${values[index]} ${unit}${warning ? ' · 超出阈值' : ''}`}`;
        }));
        panel.classList.add('open'); panel.setAttribute('aria-hidden','false');
      };


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


// 20-field-list.js — compiled in declaration order by build-prototypes.cjs
      const renderTemplateTable = (query = '') => {
        const filtered = templates.filter(item => `${item.name}${item.protocol}`.toLowerCase().includes(query.toLowerCase()));
        $('#templateTableBody').innerHTML = filtered.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.protocol)}</td><td>${item.points.length}</td><td>${esc(item.updated)}</td><td><span class="status-tag">${item.enabled===false?'停用':'启用'}</span></td><td><div class="table-actions"><button type="button" data-map-template="${item.id}">编辑模板</button><button type="button" data-use-template="${item.id}" ${item.enabled===false?'disabled':''}>用于添加设备</button></div></td></tr>`).join('');
        $('#templateCount').textContent = `共 ${filtered.length} 个模板`;
      };
      const renderFieldTable = (query = '') => {
        const filtered = standardFields.filter(item => `${item.name}${item.code}`.toLowerCase().includes(query.toLowerCase()));
        $('#fieldTableBody').innerHTML = filtered.map(item => `<tr><td>${esc(item.name)}</td><td>${esc(item.code)}</td><td>${esc(item.category)}</td><td>${esc(item.type)}</td><td>${esc(item.unit || '-')}</td><td><span class="status-tag ${item.enabled === false ? 'disabled' : ''}">${item.enabled === false ? '停用' : '启用'}</span></td><td><div class="table-actions"><button type="button" data-edit-field="${esc(item.code)}">编辑</button></div></td></tr>`).join('');
        $('#fieldCount').textContent = `共 ${filtered.length} 个字段`;
      };

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


// 50-template-editor.js — compiled in declaration order by build-prototypes.cjs
      const groupsFrom=source=>clone(source.groups||[...new Set(source.points.map(item=>item.templateGroup||'默认组'))].map(name=>({name,intervalMs:1000})));
      const protocolSchemas={
        S7:[{key:'rack',label:'机架号',type:'number',value:'0'},{key:'slot',label:'插槽号',type:'number',value:'1'},{key:'timeout',label:'通信超时（ms）',type:'number',value:'3000'},{key:'reconnect',label:'自动重连',type:'radio',options:['启用','停用'],value:'启用'}],
        'Modbus TCP':[{key:'station',label:'站号',type:'number',value:'1'},{key:'timeout',label:'通信超时（ms）',type:'number',value:'3000'},{key:'byteOrder',label:'字节序',type:'radio',options:['ABCD','CDAB','BADC','DCBA'],value:'ABCD'}],
        'Modbus RTU':[{key:'serial',label:'串口',type:'text',value:''},{key:'baud',label:'波特率',type:'select',options:['9600','19200','38400','115200'],value:'9600'},{key:'parity',label:'校验方式',type:'radio',options:['无校验','奇校验','偶校验'],value:'无校验'},{key:'station',label:'站号',type:'number',value:'1'},{key:'timeout',label:'通信超时（ms）',type:'number',value:'3000'}]
      };
      const renderProtocolFields=(protocol=$('#templateProtocolInput').value,draft=templateProtocolDraft,target='#templateProtocolFields')=>{
        const schema=protocolSchemas[protocol]||[];
        const values=draft[protocol]||={};
        $(target==='#templateProtocolFields'?'#templateProtocolMeta':'#deviceProtocolMeta').textContent=protocol?protocol+' · '+schema.length+' 项配置':'选择协议后配置';
        $(target).innerHTML=schema.length?schema.map(field=>{
          const value=values[field.key]??field.value;values[field.key]=value;
          const label='<span>'+esc(field.label)+'</span>';
          if(field.type==='radio')return '<fieldset class="protocol-radio"><legend>'+esc(field.label)+'</legend>'+field.options.map(option=>'<label><input type="radio" name="'+target.slice(1)+'-'+field.key+'" data-protocol-field="'+field.key+'" value="'+esc(option)+'" '+(value===option?'checked':'')+'>'+esc(option)+'</label>').join('')+'</fieldset>';
          if(field.type==='select')return '<label>'+label+'<select data-protocol-field="'+field.key+'">'+field.options.map(option=>'<option '+(value===option?'selected':'')+'>'+esc(option)+'</option>').join('')+'</select></label>';
          return '<label>'+label+'<input type="'+field.type+'" '+(field.type==='number'?'min="0" step="1"':'')+' data-protocol-field="'+field.key+'" value="'+esc(value)+'"></label>';
        }).join(''):'<div class="empty-config">请选择协议后配置参数</div>';
      };
      ['input','change'].forEach(type=>$('#templateProtocolFields').addEventListener(type,event=>{const key=event.target.dataset.protocolField;if(key&&(!(event.target.type==='radio')||event.target.checked))(templateProtocolDraft[$('#templateProtocolInput').value]||={})[key]=event.target.value;}));
      ['input','change'].forEach(type=>$('#deviceProtocolFields').addEventListener(type,event=>{const key=event.target.dataset.protocolField;if(key&&(!(event.target.type==='radio')||event.target.checked))(deviceProtocolDraft[$('#deviceProtocolInput').value]||={})[key]=event.target.value;}));
      $('#templateProtocolInput').addEventListener('change',()=>{if(!$('#templatePortInput').value||['102','502'].includes($('#templatePortInput').value))$('#templatePortInput').value=$('#templateProtocolInput').value==='S7'?'102':$('#templateProtocolInput').value==='Modbus TCP'?'502':'';renderProtocolFields();});
      const templateGroups = () => templateDraftGroups.map(group=>group.name);
      const pointEditorCells=(item,index,template=false)=>{
        const input=(field,type='text')=>'<input type="'+type+'" data-field="'+field+'" value="'+esc(item[field]??'')+'" aria-label="'+esc(item.name||'点位')+' '+field+'" '+(item.deleted?'disabled':'')+' '+(type==='number'?'step="any"':'')+'>';
        const select=(field,options)=>'<select data-field="'+field+'" '+(item.deleted?'disabled':'')+'>'+options+'</select>';
        const types=['FLOAT32','FLOAT64','INT16','UINT16','INT32','UINT32','BOOL','STRING'];
        const group=template?'<td>'+select('templateGroup',templateGroups().map(name=>'<option '+(name===item.templateGroup?'selected':'')+'>'+esc(name)+'</option>').join(''))+'</td>':'';
        const code='<td>'+select('standardCode',fieldOptions(item.standardCode))+'</td>',type='<td>'+select('type',types.map(type=>'<option '+(type===item.type?'selected':'')+'>'+type+'</option>').join(''))+'</td>';
        return '<tr data-index="'+index+'" class="'+(item.deleted?'point-pending-delete':'')+'">'+group+'<td>'+input('key')+'</td><td>'+input('name')+'</td>'+(template?type:code+type)+'<td>'+input('address')+'</td><td>'+input('precision','number')+'</td><td>'+input('factor','number')+'</td><td>'+input('offset','number')+'</td><td>'+input('unit')+'</td>'+(template?code+'<td>'+input('description')+'</td>':'')+'<td><button type="button" class="point-row-action '+(item.deleted?'':'danger-link')+'" data-point-delete="'+index+'">'+(item.deleted?'恢复':'删除')+'</button>'+(item.deleted?'<small class="pending-delete-label">待删除</small>':'')+'</td></tr>';
      };
      const renderTemplatePoints = () => {
        const groups = templateGroups();
        if (!groups.includes(selectedTemplateGroup)) selectedTemplateGroup = groups[0] || '默认组';
        $('#templateGroupTabs').innerHTML = groups.map(group => {
          const count = templateDraftPoints.filter(item => (item.templateGroup || '默认组') === group).length;
          return `<button class="template-group-tab ${group === selectedTemplateGroup ? 'active' : ''}" data-template-group="${esc(group)}" role="tab" aria-selected="${group === selectedTemplateGroup}" type="button">${esc(group)}<small>${count}</small></button>`;
        }).join('');
        const current=templateDraftGroups.find(group=>group.name===selectedTemplateGroup);
        $('#templateGroupMeta').textContent=current?'采集间隔：'+current.intervalMs+' ms':'暂无采集组';
        $('#editTemplateGroup').disabled=!current;
        const visiblePoints = templateDraftPoints.map((item,index) => ({ item,index })).filter(({item}) => (item.templateGroup || '默认组') === selectedTemplateGroup);
        $('#templatePointBody').innerHTML = visiblePoints.map(({item,index})=>pointEditorCells(item,index,true)).join('') || '<tr><td colspan="12" class="point-empty">该组暂无点位，可点击“新增点位”添加</td></tr>';
      };
      const openTemplateEditor = sourceTemplate => {
        const source = sourceTemplate || {name:'',protocol:'',ip:'',port:'',points:[],groups:[{name:'默认组',intervalMs:1000}]};
        editingTemplateId = source.id||'';
        $('#templateProtocolDetails').open=false;
        $('#templateModalTitle').textContent=editingTemplateId?'编辑 PLC 设备模板':'新增 PLC 设备模板';
        $('#templateNameInput').value=source.name;$('#templateProtocolInput').value=source.protocol;$('#templateIpInput').value=source.ip||'';$('#templatePortInput').value=source.port||'';$('#templateEnabledInput').value=source.enabled===false?'disabled':'enabled';$('#templateDescriptionInput').value=source.description||'';
        templateDraftGroups=groupsFrom(source);templateProtocolDraft=clone(source.protocolConfigCache||{[source.protocol]:source.protocolConfig||{}});renderProtocolFields();
        templateDraftPoints = clone(source.points);
        $('#templateFormError').textContent='';
        selectedTemplateGroup = templateGroups()[0] || '默认组';
        renderTemplatePoints(); openModal('templateModal');
      };
      $('#addTemplateButton').addEventListener('click',()=>openTemplateEditor());
      $('#templateGroupTabs').addEventListener('click', event => {
        const tab = event.target.closest('[data-template-group]'); if (!tab) return;
        selectedTemplateGroup = tab.dataset.templateGroup; renderTemplatePoints();
      });
      ['input','change'].forEach(type=>$('#templatePointBody').addEventListener(type,event=>{const row=event.target.closest('tr'),field=event.target.dataset.field;if(!row||!field)return;const item=templateDraftPoints[Number(row.dataset.index)];if(item.deleted)return;item[field]=event.target.value;if(field==='templateGroup')renderTemplatePoints();}));
      $('#templatePointBody').addEventListener('click',event=>{const button=event.target.closest('[data-point-delete]');if(!button)return;const item=templateDraftPoints[Number(button.dataset.pointDelete)];item.deleted=!item.deleted;renderTemplatePoints();});
      $('#addTemplatePoint').addEventListener('click',()=>{if(!selectedTemplateGroup)return;const number=templateDraftPoints.length+1;templateDraftPoints.push({...point('POINT_'+number,'新增点位',standardFields[0].code,''),templateGroup:selectedTemplateGroup});renderTemplatePoints();});
      const validateDraftPoints=points=>{
        const active=points.filter(item=>!item.deleted);
        if(!active.length)return '请至少保留一个有效点位。';
        if(active.some(item=>!String(item.key).trim()||!String(item.name).trim()||!String(item.address).trim()))return '请填写所有有效点位的标识、名称与地址。';
        if(new Set(active.map(item=>item.key.trim())).size!==active.length)return '点位标识不能重复。';
        if(active.some(item=>!Number.isInteger(Number(item.precision))||Number(item.precision)<0||Number(item.precision)>10||String(item.precision).trim()===''||[item.factor,item.offset].some(v=>String(v).trim()===''||!Number.isFinite(Number(v)))))return '精度须为 0～10 的整数；系数与偏移量须为有效数值。';
        return '';
      };
      $('#saveTemplateButton').addEventListener('click', () => {
        const name=$('#templateNameInput').value.trim(),protocol=$('#templateProtocolInput').value,error=$('#templateFormError');error.textContent='';
        if(!name||!protocol){error.textContent='请填写模板名称并选择协议。';return;}
        if(templates.some(item=>item.id!==editingTemplateId&&item.name===name)){error.textContent='模板名称不能重复。';return;}
        const invalid=validateDraftPoints(templateDraftPoints);if(invalid){error.textContent=invalid;return;}
        const port=$('#templatePortInput').value;if(port&&(!Number.isInteger(Number(port))||Number(port)<1||Number(port)>65535)){error.textContent='端口须为 1～65535 的整数。';return;}
        const schema=protocolSchemas[protocol]||[],values=templateProtocolDraft[protocol]||{};
        if(schema.some(field=>field.type==='number'&&(!Number.isInteger(Number(values[field.key]))||Number(values[field.key])<0||values[field.key]===''))){error.textContent='协议数值配置须为非负整数。';return;}
        const data={id:editingTemplateId||'tpl-'+Date.now(),name,protocol,ip:$('#templateIpInput').value.trim(),port,description:$('#templateDescriptionInput').value,enabled:$('#templateEnabledInput').value==='enabled',groups:clone(templateDraftGroups),protocolConfig:clone(values),protocolConfigCache:clone(templateProtocolDraft),points:clone(templateDraftPoints.filter(item=>!item.deleted)).map(item=>{delete item.deleted;return item;}),updated:new Date().toLocaleDateString('en-CA')};
        const template=templates.find(item=>item.id===editingTemplateId);if(template)Object.assign(template,data);else templates.push(data);
        closeModal('templateModal'); renderTemplateTable($('#templateSearch').value);toast('PLC 设备模板已保存');
      });
      $('#templateTableBody').addEventListener('click', event => {
        const mapping = event.target.closest('[data-map-template]');
        if (mapping) return openTemplateEditor(templates.find(item => item.id === mapping.dataset.mapTemplate));
        const use = event.target.closest('[data-use-template]');
        if (use) { selectedTemplateId = use.dataset.useTemplate; openAddDevice(); }
      });

// 60-standard-fields.js — compiled in declaration order by build-prototypes.cjs
      const openFieldEditor = field => {
        editingFieldCode = field?.code || '';
        $('#fieldModalTitle').textContent = field ? '编辑标准字段' : '新增标准字段';
        $('#fieldModalDescription').textContent = field ? '字段编码创建后不可修改，其他信息可继续维护。' : '维护平台统一使用的标准字段信息。';
        $('#fieldNameInput').value = field?.name || '';
        $('#fieldCodeInput').value = field?.code || '';
        $('#fieldCodeInput').disabled = Boolean(field);
        $('#fieldCodeHint').textContent = field ? '字段已被模板和点位引用，不支持修改编码。' : '创建后不可修改，用于模板和点位引用。';
        $('#fieldCategoryInput').value = field?.category || '';
        $('#fieldTypeInput').value = field?.type || 'FLOAT32';
        $('#fieldUnitInput').value = field?.unit || '';
        $('#fieldStatusInput').value = field?.enabled === false ? 'disabled' : 'enabled';
        $('#fieldCategoryOptions').innerHTML = [...new Set(standardFields.map(item => item.category))].map(category => `<option value="${esc(category)}"></option>`).join('');
        $('#fieldFormError').textContent = '';
        openModal('fieldModal'); setTimeout(() => $('#fieldNameInput').focus(), 0);
      };
      $('#addFieldButton').addEventListener('click', () => openFieldEditor());
      $('#fieldTableBody').addEventListener('click', event => {
        const button = event.target.closest('[data-edit-field]'); if (!button) return;
        openFieldEditor(standardFields.find(item => item.code === button.dataset.editField));
      });
      $('#saveFieldButton').addEventListener('click', () => {
        const name = $('#fieldNameInput').value.trim();
        const code = $('#fieldCodeInput').value.trim();
        const category = $('#fieldCategoryInput').value.trim();
        const type = $('#fieldTypeInput').value;
        const unit = $('#fieldUnitInput').value.trim() || '-';
        const enabled = $('#fieldStatusInput').value === 'enabled';
        const error = $('#fieldFormError');
        if (!name || !code || !category) { error.textContent = '请填写字段名称、字段编码和数据分类标识。'; return; }
        if (!/^[a-z][a-z0-9_]*$/.test(code)) { error.textContent = '字段编码需以小写字母开头，仅使用小写字母、数字和下划线。'; return; }
        if (!editingFieldCode && standardFields.some(item => item.code === code)) { error.textContent = '字段编码已存在，请更换后再保存。'; return; }
        if (editingFieldCode) {
          const field = standardFields.find(item => item.code === editingFieldCode); if (!field) return;
          Object.assign(field, { name, category, type, unit, enabled });
        } else standardFields.push({ name, code, category, type, unit, enabled });
        closeModal('fieldModal'); renderFieldTable($('#fieldSearch').value); renderWarningRules(); toast(editingFieldCode ? '标准字段已更新' : '标准字段已新增');
      });


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


// 90-card-editor.js — compiled in declaration order by build-prototypes.cjs
      const updateEditorHistoryButtons = () => {
        $('#editorUndo').disabled = editorUndoStack.length === 0;
        $('#editorRedo').disabled = editorRedoStack.length === 0;
      };
      const recordEditorSnapshot = () => {
        editorUndoStack.push(clone(workingConfig));
        if (editorUndoStack.length > 30) editorUndoStack.shift();
        editorRedoStack = [];
        updateEditorHistoryButtons();
      };
      const setStandardFieldPickerOpen = open => {
        $('#standardFieldPicker').classList.toggle('open', open);
        $('#standardFieldPicker').setAttribute('aria-hidden', String(!open));
        if (open) {
          $('#standardFieldSearch').value = '';
          renderStandardFieldPicker();
          setTimeout(() => $('#standardFieldSearch').focus(), 0);
        }
      };
      const renderStandardFieldPicker = (query = '') => {
        const keyword = query.trim().toLowerCase();
        const filtered = standardFields.filter(field => field.enabled !== false && `${field.name}${field.code}${field.category}`.toLowerCase().includes(keyword));
        $('#standardFieldList').innerHTML = filtered.map(field => {
          const sources = devices.filter(device => device.enabled !== false).flatMap(device => device.points.filter(metric => metric.standardCode === field.code).map(metric => ({ source:`${device.id}:${metric.id}`, device, metric })));
          const alreadyIncluded = workingConfig.items.some(item => findSource(item.source)?.metric.standardCode === field.code);
          const availableSource = sources.find(entry => !workingConfig.items.some(item => item.source === entry.source));
          const state = alreadyIncluded ? '已加入' : availableSource ? '加入' : '未绑定';
          const sourceText = sources.length ? `${sources.length} 个可用点位 · ${sources.map(entry => entry.device.name).join('、')}` : '当前泵机没有绑定该字段的 PLC 点位';
          return `<div class="standard-field-item"><span class="field-picker-icon">SF</span><div><strong>${esc(field.name)}</strong><small>${esc(field.code)} · ${esc(field.category)} · ${esc(sourceText)}</small></div><button type="button" ${!availableSource || alreadyIncluded ? 'disabled' : `data-add-standard-source="${esc(availableSource.source)}"`}>${state}</button></div>`;
        }).join('') || '<div class="tree-empty">未找到匹配的标准字段</div>';
      };
      const normalizeWorkingGroups = () => {
        const derived = [];
        workingConfig.items.forEach(item => {
          const source = findSource(item.source);
          item.group ||= source?.metric.group || '其他参数';
          if (!derived.includes(item.group)) derived.push(item.group);
        });
        workingConfig.groups = [...new Set([...(workingConfig.groups || []), ...derived])];
      };
      const setCategoryCreatorOpen = open => {
        $('#categoryCreator').classList.toggle('open', open);
        $('#categoryCreator').setAttribute('aria-hidden', String(!open));
        if (open) { setStandardFieldPickerOpen(false); $('#newCategoryName').value = ''; setTimeout(() => $('#newCategoryName').focus(), 0); }
      };
      const renderVisualEditor = () => {
        normalizeWorkingGroups();
        $('#layoutColumnsSelect').value = String(workingConfig.columns);
        const groups = {};
        workingConfig.items.forEach(item => {
          const source = findSource(item.source);
          if (!source) return;
          const group = item.group || '其他参数';
          (groups[group] ||= []).push({ item, source });
        });
        const groupOrder = workingConfig.groups || [];
        const groupOptions = current => groupOrder.map(group => `<option value="${esc(group)}" ${group === current ? 'selected' : ''}>${esc(group)}</option>`).join('');
        const content = groupOrder.map(group => `<section class="editor-section"><div class="editor-section-title"><span>${esc(group)}</span><small>可拖入其他分类</small></div><div class="editor-grid" data-editor-drop-group="${esc(group)}" style="--editor-cols:${workingConfig.columns}">${(groups[group] || []).map(({ item, source }) => {
          const selected = item.source === selectedEditorSource;
          const span = item.span === 'full' ? 'full' : Number(item.span) === 2 ? 2 : 1;
          return `<article class="editor-metric ${selected ? 'selected' : ''}" draggable="true" data-editor-source="${esc(item.source)}" data-editor-group="${esc(group)}" data-span="${span}"><span class="drag-handle">⠿</span><div class="tile-tools"><select class="tile-group" data-editor-group-select aria-label="移动至分类">${groupOptions(group)}</select><select class="tile-type" data-editor-type aria-label="显示方式"><option value="number" ${item.type==='number'?'selected':''}>数值＋单位</option><option value="status" ${item.type==='status'?'selected':''}>状态标签</option><option value="progress" ${item.type==='progress'?'selected':''}>进度条</option><option value="trend" ${item.type==='trend'?'selected':''}>小型趋势</option></select><button class="${span===1?'active':''}" data-editor-span="1" type="button">1格</button><button class="${span===2?'active':''}" data-editor-span="2" type="button">2格</button><button class="${span==='full'?'active':''}" data-editor-span="full" type="button">整行</button><button class="remove" data-editor-remove type="button" title="移出卡片">×</button></div><span class="metric-label" data-editor-label>${esc(item.label)}</span>${metricValue(source,item.type)}<div class="source-hint">${esc(source.device.name)} · 双击名称编辑</div></article>`;
        }).join('') || '<div class="editor-grid-empty">将字段拖入此分类，或新增标准字段</div>'}</div></section>`).join('');
        $('#visualEditorCanvas').innerHTML = content || '<div class="editor-empty"><div><strong>当前卡片还没有参数</strong>请点击“新增标准字段”，从当前泵机已绑定的点位中添加</div></div>';
        updateEditorHistoryButtons();
        if ($('#standardFieldPicker').classList.contains('open')) renderStandardFieldPicker($('#standardFieldSearch').value);
      };
      const openCardConfig = () => {
        workingConfig = clone(cardConfig);
        normalizeWorkingGroups();
        selectedEditorSource = workingConfig.items[0]?.source || '';
        selectedEditorGroup = workingConfig.items[0]?.group || workingConfig.groups[0] || '';
        editorUndoStack = [];
        editorRedoStack = [];
        setStandardFieldPickerOpen(false);
        setCategoryCreatorOpen(false);
        renderContextSelectors();
        renderVisualEditor();
        openModal('cardConfigModal');
      };
      const beginInlineLabelEdit = source => {
        selectedEditorSource = source;
        renderVisualEditor();
        requestAnimationFrame(() => {
          const label = $(`[data-editor-source="${source}"] [data-editor-label]`);
          if (!label) return;
          label.setAttribute('contenteditable','true');
          label.focus();
          const range = document.createRange();
          range.selectNodeContents(label);
          const selection = window.getSelection();
          selection.removeAllRanges(); selection.addRange(range);
        });
      };
      $('#cardLayoutButton').addEventListener('click', openCardConfig);
      $('#addStandardFieldButton').addEventListener('click', () => { setCategoryCreatorOpen(false); setStandardFieldPickerOpen(!$('#standardFieldPicker').classList.contains('open')); });
      $('#closeStandardFieldPicker').addEventListener('click', () => setStandardFieldPickerOpen(false));
      $('#standardFieldSearch').addEventListener('input', event => renderStandardFieldPicker(event.target.value));
      $('#addCardGroupButton').addEventListener('click', () => setCategoryCreatorOpen(!$('#categoryCreator').classList.contains('open')));
      $('#cancelCategoryCreate').addEventListener('click', () => setCategoryCreatorOpen(false));
      $('#confirmCategoryCreate').addEventListener('click', () => {
        const name = $('#newCategoryName').value.trim();
        if (!name) return toast('请输入分类名称');
        normalizeWorkingGroups();
        if (workingConfig.groups.includes(name)) return toast('该分类已存在');
        recordEditorSnapshot();
        workingConfig.groups.push(name);
        selectedEditorGroup = name;
        setCategoryCreatorOpen(false);
        renderVisualEditor();
        toast(`已新增分类“${name}”`);
      });
      $('#newCategoryName').addEventListener('keydown', event => { if (event.key === 'Enter') $('#confirmCategoryCreate').click(); });
      $('#standardFieldList').addEventListener('click', event => {
        const button = event.target.closest('[data-add-standard-source]');
        if (!button) return;
        const found = findSource(button.dataset.addStandardSource);
        if (!found) return toast('该标准字段尚未绑定可用点位');
        recordEditorSnapshot();
        const field = standardFields.find(item => item.code === found.metric.standardCode);
        const group = selectedEditorGroup || field?.category || found.metric.group || '其他参数';
        workingConfig.groups ||= [];
        if (!workingConfig.groups.includes(group)) workingConfig.groups.push(group);
        workingConfig.items.push({ source:button.dataset.addStandardSource, label:field?.name || found.metric.name, type:field?.type === 'BOOLEAN' || found.metric.type === 'BOOL' ? 'status' : 'number', span:1, group });
        selectedEditorSource = button.dataset.addStandardSource;
        selectedEditorGroup = group;
        setStandardFieldPickerOpen(false);
        renderVisualEditor();
        toast(`${field?.name || found.metric.name} 已加入卡片`);
      });
      $('#visualEditorCanvas').addEventListener('click', event => {
        const tile = event.target.closest('[data-editor-source]');
        if (!tile) return;
        const source = tile.dataset.editorSource;
        const item = workingConfig.items.find(config => config.source === source);
        if (!item) return;
        const spanButton = event.target.closest('[data-editor-span]');
        const removeButton = event.target.closest('[data-editor-remove]');
        if (spanButton) { recordEditorSnapshot(); item.span = spanButton.dataset.editorSpan === 'full' ? 'full' : Number(spanButton.dataset.editorSpan); selectedEditorSource = source; selectedEditorGroup = item.group; renderVisualEditor(); return; }
        if (removeButton) { recordEditorSnapshot(); workingConfig.items = workingConfig.items.filter(config => config.source !== source); selectedEditorSource = workingConfig.items[0]?.source || ''; renderVisualEditor(); return; }
        if (!event.target.closest('.tile-type') && !event.target.closest('.tile-group') && !event.target.closest('[data-editor-label]')) { selectedEditorSource = source; selectedEditorGroup = item.group; renderVisualEditor(); }
      });
      $('#visualEditorCanvas').addEventListener('change', event => {
        const typeSelect = event.target.closest('[data-editor-type]');
        const groupSelect = event.target.closest('[data-editor-group-select]');
        if (!typeSelect && !groupSelect) return;
        const tile = (typeSelect || groupSelect).closest('[data-editor-source]');
        const item = workingConfig.items.find(config => config.source === tile.dataset.editorSource);
        if (item) { recordEditorSnapshot(); if (typeSelect) item.type = typeSelect.value; if (groupSelect) { item.group = groupSelect.value; selectedEditorGroup = groupSelect.value; } selectedEditorSource = item.source; renderVisualEditor(); }
      });
      $('#visualEditorCanvas').addEventListener('dblclick', event => {
        const label = event.target.closest('[data-editor-label]');
        const tile = label?.closest('[data-editor-source]');
        if (tile) beginInlineLabelEdit(tile.dataset.editorSource);
      });
      $('#visualEditorCanvas').addEventListener('keydown', event => {
        if (event.target.matches('[data-editor-label][contenteditable="true"]') && event.key === 'Enter') { event.preventDefault(); event.target.blur(); }
      });
      $('#visualEditorCanvas').addEventListener('focusout', event => {
        const label = event.target.closest('[data-editor-label][contenteditable="true"]');
        if (!label) return;
        const tile = label.closest('[data-editor-source]');
        const item = workingConfig.items.find(config => config.source === tile.dataset.editorSource);
        const nextLabel = label.textContent.trim();
        if (item && nextLabel && nextLabel !== item.label) { recordEditorSnapshot(); item.label = nextLabel; }
        renderVisualEditor();
      });
      $('#visualEditorCanvas').addEventListener('dragstart', event => {
        const tile = event.target.closest('[data-editor-source]');
        if (!tile) return;
        draggedEditorSource = tile.dataset.editorSource;
        tile.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
      });
      $('#visualEditorCanvas').addEventListener('dragover', event => {
        const tile = event.target.closest('[data-editor-source]');
        const grid = event.target.closest('[data-editor-drop-group]');
        if (!draggedEditorSource || !grid || tile?.dataset.editorSource === draggedEditorSource) return;
        event.preventDefault();
        $$('.editor-metric.drag-over', $('#visualEditorCanvas')).forEach(item => item.classList.remove('drag-over'));
        $$('.editor-grid.drop-active', $('#visualEditorCanvas')).forEach(item => item.classList.remove('drop-active'));
        if (tile) tile.classList.add('drag-over');
        grid.classList.add('drop-active');
      });
      $('#visualEditorCanvas').addEventListener('drop', event => {
        const targetTile = event.target.closest('[data-editor-source]');
        const targetGrid = event.target.closest('[data-editor-drop-group]');
        if (!targetGrid || !draggedEditorSource || targetTile?.dataset.editorSource === draggedEditorSource) return;
        event.preventDefault();
        recordEditorSnapshot();
        const fromIndex = workingConfig.items.findIndex(item => item.source === draggedEditorSource);
        const [moved] = workingConfig.items.splice(fromIndex,1);
        const targetGroup = targetGrid.dataset.editorDropGroup;
        moved.group = targetGroup;
        if (targetTile) {
          const targetIndex = workingConfig.items.findIndex(item => item.source === targetTile.dataset.editorSource);
          workingConfig.items.splice(targetIndex,0,moved);
        } else {
          const groupIndexes = workingConfig.items.map((item,index) => item.group === targetGroup ? index : -1).filter(index => index >= 0);
          const insertIndex = groupIndexes.length ? groupIndexes.at(-1) + 1 : workingConfig.items.length;
          workingConfig.items.splice(insertIndex,0,moved);
        }
        selectedEditorSource = moved.source;
        selectedEditorGroup = targetGroup;
        renderVisualEditor();
      });
      $('#visualEditorCanvas').addEventListener('dragend', () => { draggedEditorSource = ''; renderVisualEditor(); });
      $('#layoutColumnsSelect').addEventListener('change', event => { recordEditorSnapshot(); workingConfig.columns = Number(event.target.value); renderVisualEditor(); });
      $('#editorUndo').addEventListener('click', () => { if (!editorUndoStack.length) return; editorRedoStack.push(clone(workingConfig)); workingConfig = editorUndoStack.pop(); selectedEditorSource = ''; selectedEditorGroup = workingConfig.groups?.[0] || ''; renderVisualEditor(); });
      $('#editorRedo').addEventListener('click', () => { if (!editorRedoStack.length) return; editorUndoStack.push(clone(workingConfig)); workingConfig = editorRedoStack.pop(); selectedEditorSource = ''; selectedEditorGroup = workingConfig.groups?.[0] || ''; renderVisualEditor(); });
      $('#saveCardConfig').addEventListener('click', () => {
        cardConfig = clone(workingConfig);
        pumpStates[currentPumpId].cardConfig = cardConfig;
        renderContextSelectors(); renderPanel(); renderDeviceTable($('#deviceSearch').value);
        setStandardFieldPickerOpen(false); setCategoryCreatorOpen(false); closeModal('cardConfigModal'); toast('PLC 数据卡片已保存');
      });


// 99-bootstrap.js — compiled in declaration order by build-prototypes.cjs
      $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
      $$('.modal-layer').forEach(layer => layer.addEventListener('mousedown', event => { if (event.target === layer) closeModal(layer.id); }));
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const openLayer = $$('.modal-layer.open').at(-1); if (openLayer) return closeModal(openLayer.id);
        if ($('#managementView').classList.contains('open')) { $('#managementView').classList.remove('open'); return; }
        if (plcButton.getAttribute('aria-expanded') === 'true') setPanelOpen(false, true);
      });


const savePLCSession=()=>{
 pumpStates[currentPumpId]={devices,cardConfig};
 window.SentinelSession.set('plc.configuration',{standardFields,templates,thresholdRules,pumpThresholdRules,pumpStates});
 window.SentinelSession.set('context',{projectId:currentProjectId,plantId:currentPlantId,unitId:currentUnitId,pumpId:currentPumpId});
};
window.addEventListener('pagehide',savePLCSession);
      window.sentinelPrototype = {
        context:currentContext, hierarchy:()=>hierarchy, pumpId:()=>currentPumpId, devices:()=>devices,
        fields:()=>standardFields, rules:()=>thresholdRules, history:thresholdAlertHistory,
        findSource, matchedLevel, severityNames, severityColors, effectiveThresholdRule,
        trendSource:()=>selectedTrendSource, bounds:selectedTrendBounds, series:trendSeries,
        openTrend:source=>{selectedTrendSource=source;setPanelOpen(true);renderPanel();renderTrendPanel();},
        setRange:(start,end)=>{$('#trendStartTime').value=start;$('#trendEndTime').value=end;trendRange='custom';},
        saveSession:savePLCSession, refresh:renderPanel, toast
      };
      renderContextSelectors(); renderPumpTree(); renderPanel(); renderDeviceTable(); renderTemplateTable(); renderFieldTable(); renderWarningRules();
    

})();
