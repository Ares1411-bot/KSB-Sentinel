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
