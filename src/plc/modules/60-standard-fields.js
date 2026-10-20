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

