window.createPLCDemoData=()=>{
const clone=value=>JSON.parse(JSON.stringify(value));
const esc=value=>String(value??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
      const standardFields = [
        { name: '设备运行状态', code: 'running_status', category: '设备状态', type: 'BOOLEAN', unit: '-', enabled: true },
        { name: '进口压力', code: 'inlet_pressure', category: '机组运行参数', type: 'FLOAT32', unit: 'MPa', enabled: true },
        { name: '出口压力', code: 'outlet_pressure', category: '机组运行参数', type: 'FLOAT32', unit: 'MPa', enabled: true },
        { name: '设备运行频率', code: 'running_frequency', category: '变频器状态', type: 'FLOAT32', unit: 'Hz', enabled: true },
        { name: 'AB 相电流', code: 'current_ab', category: '机组运行参数', type: 'FLOAT32', unit: 'A', enabled: true },
        { name: 'BC 相电流', code: 'current_bc', category: '机组运行参数', type: 'FLOAT32', unit: 'A', enabled: true },
        { name: 'CA 相电流', code: 'current_ca', category: '机组运行参数', type: 'FLOAT32', unit: 'A', enabled: true },
        { name: 'A 相电压', code: 'voltage_a', category: '机组运行参数', type: 'FLOAT32', unit: 'V', enabled: true },
        { name: '设备总能耗', code: 'total_energy', category: '能耗参数', type: 'FLOAT32', unit: 'kWh', enabled: true },
        { name: '设备有功功率', code: 'active_power', category: '能耗参数', type: 'FLOAT32', unit: 'kW', enabled: true }
      ];

      // 全平台按标准字段维护多等级预警规则。
      const thresholdRules = {
        inlet_pressure: { min:0.18, max:0.28, severity:'重要', enabled:true },
        outlet_pressure: { min:2.10, max:2.80, severity:'重要', enabled:true },
        running_frequency: { min:20, max:50, severity:'一般', enabled:true },
        current_ab: { max:10.5, severity:'重要', enabled:true },
        current_bc: { max:10.5, severity:'重要', enabled:true },
        current_ca: { max:10.5, severity:'重要', enabled:true },
        voltage_a: { min:360, max:400, severity:'重要', enabled:true },
        active_power: { max:120, severity:'一般', enabled:true }
      };
      const severityNames=['提示','一般','重要','严重'];
      const severityColors=['#2784d5','#c79a00','#ed7a25','#d94444'];
      Object.values(thresholdRules).forEach(rule=>{delete rule.duration;rule.levels=[{...rule,color:severityColors[severityNames.indexOf(rule.severity)]}];delete rule.recovery;delete rule.levels[0].recovery;});
      delete thresholdRules.running_status;
      thresholdRules.inlet_pressure={enabled:true,condition:'range',levels:[
        {severity:'提示',min:.18,max:.28,color:severityColors[0]},
        {severity:'一般',min:.16,max:.30,color:severityColors[1]},
        {severity:'重要',min:.14,max:.32,color:severityColors[2]},
        {severity:'严重',min:.12,max:.34,color:severityColors[3]}
      ]};
      const pumpThresholdRules={};
      const thresholdAlertHistory = {
        inlet_pressure: [
          { hoursAgo: .45, value: .31, duration: '12 分钟' },
          { hoursAgo: 5.2, value: .29, duration: '8 分钟' }
        ],
        outlet_pressure: [
          { hoursAgo: 17.5, value: 2.91, duration: '10 分钟' },
          { hoursAgo: 92, value: 2.86, duration: '18 分钟' }
        ],
        current_bc: [
          { hoursAgo: 4.1, value: 10.9, duration: '6 分钟' },
          { hoursAgo: 55, value: 10.7, duration: '9 分钟' }
        ],
        active_power: [
          { hoursAgo: 2.6, value: 125.4, duration: '15 分钟' },
          { hoursAgo: 30, value: 122.8, duration: '11 分钟' }
        ]
      };

      const fieldOptions = (selected = '') => standardFields.filter(field => field.enabled !== false || field.code === selected).map(field => `<option value="${esc(field.code)}" ${field.code === selected ? 'selected' : ''}>${esc(field.name)} · ${esc(field.code)}${field.enabled === false ? '（已停用）' : ''}</option>`).join('');
      const point = (key, name, standardCode, address, type = 'FLOAT32', precision = 2, factor = 1, offset = 0) => {
        const field = standardFields.find(item => item.code === standardCode) || standardFields[0];
        return { id: `${key}-${Math.random().toString(36).slice(2,7)}`, key, name, standardCode, address, type, precision, factor, offset, unit: field.unit, description: '' };
      };
      const templatePoint = (group, ...args) => ({ ...point(...args), templateGroup: group });

      const templates = [
        { id: 'tpl-s7', name: '西门子 S7-1200 泵站模板', protocol: 'S7', ip: '192.168.10.30', port: '102', updated: '2026-09-29', points: [
          templatePoint('运行控制','RUN_STATE','泵运行状态','running_status','DB1.DBX0.0','BOOL',0),
          templatePoint('压力与频率','IN_PRESS','进口压力','inlet_pressure','DB1.DBD2'),
          templatePoint('压力与频率','OUT_PRESS','出口压力','outlet_pressure','DB1.DBD6'),
          templatePoint('压力与频率','FREQUENCY','运行频率','running_frequency','DB1.DBD10')
        ]},
        { id: 'tpl-energy', name: '泵站能耗采集模板', protocol: 'Modbus TCP', ip: '192.168.10.40', port: '502', updated: '2026-09-27', points: [
          templatePoint('三相电流','CUR_AB','AB 相电流','current_ab','40001'), templatePoint('三相电流','CUR_BC','BC 相电流','current_bc','40003'),
          templatePoint('三相电流','CUR_CA','CA 相电流','current_ca','40005'), templatePoint('电压与能耗','VOLT_A','A 相电压','voltage_a','40007'),
          templatePoint('电压与能耗','ENERGY','设备总能耗','total_energy','40009'), templatePoint('电压与能耗','POWER','设备有功功率','active_power','40011')
        ]},
        { id: 'tpl-modbus', name: '通用 Modbus TCP 模板', protocol: 'Modbus TCP', ip: '192.168.1.100', port: '502', updated: '2026-09-25', points: [
          templatePoint('基础状态','RUN_STATE','设备运行状态','running_status','00001','BOOL',0), templatePoint('模拟量','IN_PRESS','进口压力','inlet_pressure','40001')
        ]}
      ];

      const normalizeDevicePoint = (source, id, value, group) => ({ ...clone(source), id, value, group });
      const baseDevices = [
        { id: 'plc-main', name: '主控 PLC-01', template: '西门子 S7-1200 泵站模板', protocol: 'S7', ip: '192.168.10.31', enabled: true, status: 'online', points: [
          normalizeDevicePoint(templates[0].points[0], 'run', '运行', '设备状态'),
          normalizeDevicePoint(templates[0].points[1], 'in-pressure', 0.30, '机组运行参数'),
          normalizeDevicePoint(templates[0].points[2], 'out-pressure', 2.50, '机组运行参数'),
          normalizeDevicePoint(templates[0].points[3], 'frequency', 33.46, '变频器状态')
        ]},
        { id: 'plc-energy', name: '能耗 PLC-02', template: '泵站能耗采集模板', protocol: 'Modbus TCP', ip: '192.168.10.41', enabled: true, status: 'online', points: [
          normalizeDevicePoint(templates[1].points[0], 'cur-ab', 9.0, '机组运行参数'),
          normalizeDevicePoint(templates[1].points[1], 'cur-bc', 9.1, '机组运行参数'),
          normalizeDevicePoint(templates[1].points[2], 'cur-ca', 8.9, '机组运行参数'),
          normalizeDevicePoint(templates[1].points[3], 'voltage-a', 380.2, '机组运行参数'),
          normalizeDevicePoint(templates[1].points[4], 'energy', 631158.4, '能耗参数'),
          normalizeDevicePoint(templates[1].points[5], 'power', 118.1, '能耗参数')
        ]}
      ];
      // 来自 PLC 返回值元数据的演示枚举；真实接入后由接口提供。
      baseDevices[0].points[0].returnedValues=['运行','停止'];

      const baseCardConfig = {
        columns: 4,
        groups: ['设备状态','机组运行参数','变频器状态','能耗参数'],
        items: [
          { source: 'plc-main:run', label: '泵运行状态', type: 'status', span: 2 },
          { source: 'plc-main:in-pressure', label: '进口压力', type: 'number', span: 1 },
          { source: 'plc-main:out-pressure', label: '出口压力', type: 'number', span: 1 },
          { source: 'plc-energy:cur-ab', label: 'AB 相电流', type: 'number', span: 1 },
          { source: 'plc-energy:cur-bc', label: 'BC 相电流', type: 'number', span: 1 },
          { source: 'plc-energy:cur-ca', label: 'CA 相电流', type: 'number', span: 1 },
          { source: 'plc-energy:energy', label: '设备总能耗', type: 'trend', span: 2 },
          { source: 'plc-energy:power', label: '设备有功功率', type: 'progress', span: 2 },
          { source: 'plc-main:frequency', label: '设备运行频率', type: 'number', span: 2 }
        ]
      };
      const hierarchy = window.SentinelHierarchy;
      const createPumpState = (suffix, pumpName, deviceCount = 1, valueOffset = 0) => {
        const selectedDevices = clone(baseDevices.slice(0, deviceCount));
        const idMap = {};
        selectedDevices.forEach((device, index) => {
          const previousId = device.id;
          device.id = `${previousId}-${suffix}`;
          device.name = `${pumpName} · ${index === 0 ? '主控 PLC' : '能耗 PLC'}`;
          device.ip = `192.168.${20 + valueOffset}.${31 + index * 10}`;
          device.points.forEach(metric => { if (typeof metric.value === 'number') metric.value = Number((metric.value + valueOffset * .07).toFixed(metric.precision || 2)); });
          idMap[previousId] = device.id;
        });
        const includedIds = new Set(Object.keys(idMap));
        const config = clone(baseCardConfig);
        config.items = config.items.filter(item => includedIds.has(item.source.split(':')[0])).map(item => {
          const [deviceId, pointId] = item.source.split(':');
          return { ...item, source:`${idMap[deviceId]}:${pointId}` };
        });
        return { devices:selectedDevices, cardConfig:config };
      };
      const pumpStates = {
        'pump-omega-1': { devices:clone(baseDevices), cardConfig:clone(baseCardConfig) },
        'pump-omega-2': createPumpState('omega2','2# Omega 泵机',2,2),
        'pump-aux': { devices:[], cardConfig:{ columns:4, groups:[], items:[] } },
        'pump-circulation-1': createPumpState('cir1','1# 循环泵',1,4),
        'pump-circulation-2': createPumpState('cir2','2# 循环泵',1,6),
        'pump-pressure-1': createPumpState('pressure1','1# 增压泵',2,8),
        'pump-pressure-2': { devices:[], cardConfig:{ columns:3, groups:[], items:[] } }
      };
      pumpStates['pump-omega-2'].devices[0].points[0].returnedValues=['1','0'];
      pumpStates['pump-omega-2'].devices[0].points[0].value='1';

const saved=window.SentinelSession.get('plc.configuration',null);
if(saved){
 if(saved.standardFields)standardFields.splice(0,standardFields.length,...saved.standardFields);
 if(saved.templates)templates.splice(0,templates.length,...saved.templates);
 if(saved.thresholdRules){Object.keys(thresholdRules).forEach(key=>delete thresholdRules[key]);Object.assign(thresholdRules,saved.thresholdRules);}
 if(saved.pumpThresholdRules)Object.assign(pumpThresholdRules,saved.pumpThresholdRules);
 if(saved.pumpStates)Object.assign(pumpStates,saved.pumpStates);
}
return {standardFields,thresholdRules,pumpThresholdRules,thresholdAlertHistory,severityNames,severityColors,fieldOptions,point,templatePoint,templates,normalizeDevicePoint,baseDevices,baseCardConfig,hierarchy,pumpStates};
};
