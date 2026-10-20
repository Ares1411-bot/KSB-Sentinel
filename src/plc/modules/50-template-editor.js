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
