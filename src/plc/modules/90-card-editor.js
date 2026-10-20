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

