# e2e 404 路由分类报告

> **v5.0试点扩展（M184角色验证）**
>
> 数据来源：`scripts/e2e-smoke.ts`（前端路由 → BFF 启发式探测），404 明细落盘 `reports/e2e-404.txt`，
> 分类脚本 `scripts/classify-404.py`，机读结果 `reports/e2e-404-classification.json`。
> 执行时间：2026-10-19 ｜ BFF `localhost:8080` / `DEMO_MODE=1` / 凭证 `Bearer bff-access-token`(admin)。
>
> 说明：本次只做分类，**不修业务代码**。e2e-smoke 另报 10 个 500（独立问题，已按脚本约定交业务代理修复，不在本分类范围）。

---

## 1. 总量与分类结果

前端路由归一化去重后共 **1725** 条；其中：

| 状态码 | 数量 | 含义 |
|---|---:|---|
| 200 | 1369 | 接口正常 |
| **404** | **335** | 启发式探测路径无对应 BFF（本报告分类对象） |
| 500 | 10 | 服务端错误（另案，不在本报告） |

对 **335 条 404** 三分类：

| 类别 | 数量 | 占比 | 处置建议 |
|---|---:|---:|---|
| **A 类 — 前端页面缺 BFF（候选补接口）** | **3** | 0.9% | 优先补 BFF |
| **B 类 — BFF 同域存在（启发式误判，无需改）** | **276** | 82.4% | 不改 |
| **C 类 — 纯静态/登录/壳页面（无需 BFF）** | **56** | 16.7% | 不改 |
| 合计 | 335 | 100% | |

> 分类口径：e2e-smoke 用「`/api/v1` + 前端路由名」做朴素猜测，命中率有限。
> 本分类把每条 404 的域 token 与 BFF 已注册的 **2657 条去重路由路径**比对——
> 同域有后端即判 B；命中静态/登录/壳模式即判 C；其余判 A。该启发式用于排优先级，非逐接口审计。

---

## 2. A 类清单（优先补 BFF 的候选，共 3 条）

这 3 条是**真实业务页面但 BFF 路由表中没有同域后端**的候选缺口：

| 前端路由 | 朴素探测路径 | 现状 | 建议补的接口方向 |
|---|---|---|---|
| `/escalation` | `/api/v1/escalation` | 无 escalation 相关路由 | 升级/上报工单列表与处置 `GET /api/v1/escalations` |
| `/system/organization` | `/api/v1/system/organization` | 有 `dept/*`、`dept-profile` 等，但无**组织架构树/科室维护**接口 | 组织树 `GET /api/v1/admin/organization/tree` |
| `/system/tools` | `/api/v1/system/tools` | 无工具/技能注册中心路由 | 工具目录 `GET /api/v1/admin/tools` |

> 注：`/admin/hr`、`/admin/quality-management`、`/dashboard`、`/operation` 等初判为 A，
> 经复核 BFF 同域已有后端（如 `quality:*`、`ops:view`、`dept/cockpit` 等），已归入 B 类。

---

## 3. B 类（BFF 同域存在，共 276 条 —— 不改）

这些页面的朴素探测路径 404，是因为前端实际调用的 BFF 路径与「`/api/v1` + 路由名」猜测不一致
（例如 `/emr-nlp-entity` 实际走 `emrNlp*V13` 系列、`/operation/drg` 实际走 DRG/DIP 聚合接口）。
BFF 路由表中已有同域后端，**不缺接口、无需补**。

代表性分组（完整清单见 `reports/e2e-404-classification.json` 的 `B` 数组）：

- **/admin/\* 管理驾驶舱展示页（约 45 条）**：`/admin/acceptance`、`/admin/security`、`/admin/devops`、
  `/admin/llm`、`/admin/multi-agent`、`/admin/sre` 等——院务/信息化展示页，数据多由对应聚合接口提供。
- **EMR 文书质控域（约 70 条）**：`/emr-*`、`/emr/qc-*`、`/emr/nlp-*`、`/emr/template-*`、`/emr/level5` 等——
  对应 `emrQc*`、`emrNlp*V13`、`terminal-qc` 等聚合路由。
- **临床业务域**：`/emr`、`/ward`、`/outpatient`、`/emergency`、`/surgery`、`/transfusion`、`/vte`、
  `/pharmacy`、`/lis`、`/ris`、`/nursing/*`、`/specialty/*`、`/quality`、`/operation/*` 等。
- **系统管理域**：`/system/users`、`/system/roles`、`/system/permissions`、`/system/audit-logs`、
  `/system/login-logs`、`/system/dict` 等——对应 `admin/users`、`admin/audit-logs` 等路由。

---

## 4. C 类（纯静态/登录/壳页面，共 56 条 —— 无需 BFF）

不承载业务数据、或走 WebSocket/Agent 引擎而非列表 REST 的页面：

- **认证/账户壳**：`/login`、`/login-legacy`、`/forgot-password`、`/m`、`/m/login`、`/me`、`/profile`
- **错误/静态页**：`/403`、`/about`、`/features`、`/feedback`、`/scenarios`、`/rollback`、`/sessions`、`/demo`、`/data`、`/architecture`
- **Agent/对话 UI（走 Agent 引擎/WebSocket）**：`/agent`、`/agent-*`、`/medmuse`、`/chat`、
  `/personal-agent/*`、`/digital-companion`、`/mobile-health`、`/voice-medical`、`/telemedicine`
- **低代码/工作台壳**：`/builder/*`、`/skills/*`、`/workflow`、`/workflow-monitor`、`/form-engine`、
  `/graph/visualizer`、`/quick-actions`
- **学习/复盘展示页**：`/case-lesson`、`/failure-postmortem`、`/experience-versions`、
  `/learning-flywheel`、`/feedback-loop`、`/finetune-loop`、`/federated-learning`、`/smart-healthcare`、`/hl7-integration`

> 个别边界项（如 `/medmuse/dept-cockpit` 实际对应 `/api/v1/dept/cockpit`）按模式归入 C，
> 影响极小；若后续逐接口审计可上调为 B。

---

## 5. 结论

- 335 条 404 中，**真正缺 BFF 的仅 A 类 3 条**（`/escalation`、`/system/organization`、`/system/tools`），
  可作为下一批补接口的优先候选；
- **276 条（82%）是启发式探测路径猜错**，页面实际有后端，无需改动；
- **56 条（17%）是静态/登录/壳页面**，本就不需要 BFF；
- 另需业务代理跟进 e2e-smoke 报出的 **10 个 500**（与 404 无关）。

---

*Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.*
*v5.0试点扩展（M184角色验证）*
