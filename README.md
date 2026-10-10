# Sentinel PLC 交互原型

当前版本：v18（2026-10-10），包含 PLC 数据卡片渲染修复。

## 运行

直接打开 `dist/index.html`，或在仓库根目录启动静态服务器：

```bash
python -m http.server 8000 --directory dist
```

然后访问 http://localhost:8000 。无需安装依赖或编译。

## 功能

- PLC 设备、模板、标准字段及全平台预警规则配置。
- 项目 → 厂房 → 机组 → 设备四级筛选。
- 汇总 PLC 数据卡片、参数趋势、设备标签悬停展开。
- 多等级预警与颜色配置；布尔异常值自定义。
- 设备与标准字段两个预警记录入口、事件过程及处理表单。
- 首次触发、等级升降、数值变化、恢复、再次异常、处理结束节点。
- 字段记录时间筛选、等级/时间/时长排序、未处理数量提示。
- 独立事件趋势窗口及所有趋势的放大查看弹窗。

## 文件

| 路径 | 内容 |
| --- | --- |
| `dist/index.html` | 页面、统一设计样式、设备/模板/字段/规则配置与主趋势逻辑 |
| `dist/assets/alert-records.js` | 预警事件、记录列表、详情、处理与事件趋势 |
| `dist/assets/alert-records.css` | 预警界面及放大趋势样式 |
| `dist/assets/expanded-trends.js` | 放大趋势、独立时间筛选、基础统计 |
| `dist/assets/*.png` / `*.jpg` | 模型、背景及图标 |
| `tests/startup-smoke.cjs` | 页面初始化、卡片渲染、单项选中、趋势与预警入口检查 |

## 检查

安装 Node.js 后，在仓库根目录执行：

```bash
node tests/startup-smoke.cjs
node --check dist/assets/alert-records.js
node --check dist/assets/expanded-trends.js
```

启动检查使用简化 DOM，不能替代真实浏览器的布局与交互验收。

## 前端接入说明

这是可运行的交互原型，尚未接入服务端。设备、点位、趋势、历史事件及处理人员使用演示数据；配置、处理记录和附件随刷新清空。附件仅通过本地对象 URL 预览；AI 建议为规划功能展示。

`window.sentinelPrototype` 提供设备、字段、规则、趋势及刷新接口；`window.PLCRecords` 提供事件列表、详情和未处理数量；`window.PLCExpandedTrends` 提供放大趋势开关。接入时将演示数据替换为实际 API，事件创建、升级记录及处理结束由服务端保存。

处理完成即结束当前事件；本版已移除“处理后仍异常”自动生成新事件的演示逻辑。

原型预览：https://sentinel-device-health-prototype.frosty-bear-8273.chatgpt.site
