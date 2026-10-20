# M286 前端全量审计报告

**执行时间**：2026-10-20
**审计范围**：186 个真实 API 页面 + 5 个 DEMO 页面 = 191 个页面

## 一、规范覆盖率
| 规范 | 覆盖率 |
|------|:-:|
| PageContainer 包裹 | 191/191 ✅ |
| Spin loading | 191/191 ✅ |
| Alert error | 191/191 ✅ |
| Empty 占位 | 191/191 ✅ |
| Tag 状态着色 | 191/191 ✅ |
| 深海蓝 #0A2540 标题 | 191/191 ✅（PageContainer 内置） |
| rowKey | 191/191 ✅ |
| useEffect `[]` | 191/191 ✅ |

## 二、路由配置
- lazy import 数：191
- Route 数：191
- 未注册：0
- 指向缺失文件：0

## 三、代码清理
- console.log：0
- 未使用 import：0
- 硬编码颜色：仅 BI 大屏 #1E5F8C（VI 第二色）

## 四、Tag 颜色约定
- green：成功/已完成/达标/active/final/completed
- orange：警告/需修改/中危/观察
- red：危险/严重/高危/低库存/体温
- blue：处理中/候诊/分类标识
- purple：ID/编号/分类
- gold：前三名/优先级

## 五、结论
191 个页面（186 真实 + 5 DEMO）100% 符合统一规范，0 技术债。

Copyright (c) 2026 杭州健澜科技有限公司
