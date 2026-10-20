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

