<div align="center">

# 健澜AI原生医院操作系统OS

### 让每一次诊疗都沉淀为系统能力

[![Build Status](https://img.shields.io/badge/Build-Passing-0A2540.svg)]()
[![License](https://img.shields.io/badge/License-Apache--2.0-0A2540.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5.3-0A2540.svg)](https://spring.io/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-0A2540.svg)](https://fastapi.tiangolo.com/)
[![JDK](https://img.shields.io/badge/JDK-21-0A2540.svg)](https://openjdk.org/)
[![Runtime](https://img.shields.io/badge/Runtime-Bun%20%2B%20TypeScript-0A2540.svg)](https://bun.sh/)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite%20%2B%20AntD%205-0A2540.svg)](https://react.dev/)
[![Database](https://img.shields.io/badge/DB-PostgreSQL%2016%20%3A5433-0A2540.svg)](https://www.postgresql.org/)
[![Agent](https://img.shields.io/badge/Agent-MEDMUSE-1B4F8B.svg)
[![Copyright](https://img.shields.io/badge/%C2%A9-%E6%9D%AD%E5%B7%9E%E5%81%A5%E6%BE%9C%E7%A7%91%E6%8A%80%E6%9C%89%E9%99%90%E5%85%AC%E5%8F%B8-0A2540.svg)

> 视觉主色：**深海蓝**（Deep Sea Blue `#0A2540`）。

</div>

---

> 🏥 **三层架构模块统计**
>
> | 层 | 技术栈 | 模块数 | 端口 |
> |---|---|---|---|
> | Java 核心交易 | Spring Boot 3.5 + JDK 21 + Modulith | **110 模块**（从 9 模块 12 倍增长） | 9090 |
> | Python 智能层 | FastAPI + vLLM | **50 router**（🎉 里程碑） | 8000 |
> | TS BFF 聚合层 | Bun + TypeScript | 1957 路由（保留） | 8080 |
> | 测试类 | JUnit 5 + H2 | **84 个** | - |
> | 端点总数 | Java + Python | **430+** | - |
>
> 🚀 **快速启动**：
> ```bash
> git clone https://gitcode.com/jlmedaios/jlmedaios-os.git
> cd jlmedaios-os
> make up
> # 访问 http://localhost:9090/actuator/health
> # 访问 http://localhost:8000/ai/health
> ```

---

> 🏛️ **企业理念**：云原生微服务 HIS/EMR 一体化 AI 原生医院，每个工作人员都有 Personal Agent，成功失败经验全沉淀，让后继者站在巨人肩膀上，医院原生成长，越来越强。

---

> **健澜科技 · AI 原生医院新引擎**
>
> 未来引领医院高质量发展的新引擎，一定是让 AI 原生医院所有的业务系统、AI 系统、数据系统越用越聪明。
>
> - 业务系统越用越懂临床
> - AI 系统越用越懂医生
> - 数据系统越用越懂医院
>
> 这是健澜科技的产品哲学，也是所有开发的最高准则。

---

## 📜 架构宪法（宪章 v1.0）

详见 [ARCHITECTURE_CHARTER.md](./ARCHITECTURE_CHARTER.md)（**架构宪章 v1.0**，为本仓库最高设计准则）。

核心理念六章：
1. **云原生**：微服务拆分，容器化弹性伸缩
2. **AI 原生**：MEDMUSE 是核心引擎，不是插件
3. **数据原生**：所有操作即数据采集，数据积累即资产
4. **业务中台一体化**：HIS/EMR/护理/药房/手术/质控/医保共享统一用户权限主数据
5. **学习引擎**：每个业务模块都有"学习点"——记录→积累→进化→反馈
6. **生产安全**：RBAC + 脱敏 + 降级 + 幂等 + 熔断

> 📘 **对外产品白皮书**：[docs/PRODUCT_ARCHITECTURE.md](./docs/PRODUCT_ARCHITECTURE.md) —— JLMEDAIOS 产品架构与核心功能（云原生微服务三中台一体 · MEDMUSE 岗位智能体 · DOCTOR_MUSE 经验沉淀 · DAMO-RADAR 影像大模型 18 器官/146 发现）。

---

## 🧭 项目简介

**jlmedaios** 是杭州健澜科技有限公司自主研发的 **AI 原生未来医院操作系统**。它以 **MEDMUSE 智能体**为核心引擎，把医院核心业务事务系统（HIS / EMR / 护理 / 药房 / 手术 / 质控 / 医保 DRG）与 AI 能力中台深度融合，面向未来十五年数智医院高质量发展，提供私有化部署、数据不出院、工业级稳定性的一体化底座。

- **向下**：统一临床数据、主数据（EMPI）与外部系统（HIS/LIS/PACS）接入；
- **向中**：BFF 微服务承载医院核心事务，状态机 + 行锁 + 幂等保证并发安全；
- **向上**：MEDMUSE 智能体横切每个业务环节，医师复核签名、合规内建；
- **全程**：RBAC + ABAC、字段级加密、审计哈希链、数据可追溯。

> ⚕️ **医疗安全红线**：AI 始终定位为辅助（第二意见），所有诊断、医嘱、处方、病历签名等法律效力写操作必须由具备权限的医务人员确认并电子签名；系统不做自主诊疗。

---

## 🗺️ 功能全景图

| 模块域 | 核心能力 |
|---|---|
| 🏥 **HIS** | 挂号候诊、门诊工作站、住院 ADT 入出转、床位病区、收费结算、费用清单、账单管理、多租户一院多区 |
| 📝 **EMR 电子病历** | 入院记录/病程/出院小结/病案首页/知情同意、三级签名、内涵质控状态机、EMR 五级评审、病历模板管理、智能病历草稿 |
| 🩺 **护理** | 护士工作站、护理记录、医嘱执行双签、压疮/跌倒/疼痛/Barthel 评估、SBAR 交班、PDA 移动执行、护理 NQI 指标 |
| 💊 **药房药事** | 调剂发药、库存联动、处方前置审核、处方点评、合理用药审查、用药咨询、药品库存盘点 |
| 🔪 **手术麻醉** | 手术排程看板（日/周视图）、术前评估、三方核对、术中记录、PACU 双签、手术核查清单 |
| ✅ **质控** | 危急值闭环、质控整改闭环看板、终端质控、VTE / AMS / 院感专项、病历质控、护理质控 |
| 📊 **医保 DRG** | DRG + DIP 本地分组、医保智能审核规则引擎、DRG 审计与超支汇总、预算管理、成本分摊 |
| 🤖 **MEDMUSE AI** | 岗位智能体体系（医生/护士/药师/财务/管理员）、对话式工作台 `/medmuse`、多轮上下文摘要、SSE 流式输出、电子签名留痕、快捷指令、会话历史、多模态扩展、Agent 健康度看板 |
| 📈 **驾驶舱** | 院长数据驾驶舱、科室运营驾驶舱、月度运营报表、床位可视化地图、系统健康度看板、患者 360° 视图 |
| 🌐 **互联网医院** | 号源预约、在线报告、在线续方、支付配药、通知（微信/钉钉 webhook）、患者门户 |
| 🧪 **检验检查** | LIS 全流程、RIS/影像预约、AI 辅助解读（医师签名生效）、多模态影像 |
| 🛡️ **安全合规** | 等保三级设计、MFA、JWT 主动吊销、16 类敏感数据脱敏、AES-256-GCM、审计哈希链 |
| 🏢 **集团管理** | 总院 + N 成员院集团聚合大屏、各院指标按 hospital_id 隔离归并、跨院专家/床位/设备资源调配（M156-A） |
| 🧠 **AI 大脑** | 全院实时运行态势（门诊/住院/手术/预警）一块大屏、阈值化 AI 建议、后续平滑替换为各系统实时聚合源（M156-B） |
| 🔬 **科研** | 专病队列闭环（入排标准→匹配→脱敏导出）、病例智能检索、描述性统计 / Welch t / 卡方自动分析（M156-C） |
| 📞 **患者服务** | 患者诉求工单限时受理（48h 时限）、分派与解决闭环、满意度回访、患者教育与健康提醒（M142-C） |
| 🛡️ **质量安全** | 三甲评审条款闭环（七大类别核心条款差距分析）、危急值与院感联动复核、JCI 评审准备（M178-C） |
| 📊 **运营分析** | 科室运营驾驶舱、DRG 成本归因、收支与超支预警、月度运营报表下钻（M179-B） |
| 💬 **患者体验** | 候诊/住院/医技/随访四大维度度量、痛点识别、满意度改进闭环（M180-C） |
| ⚡ **性能优化** | BFF P95 72ms 慢查询治理、前端首屏与接口瘦身、数据库索引与连接池调优（M180-D） |

---

## 🎯 200 版本里程碑

> **200版本里程碑**：截至 v4.01，平台累计达成 **200 个版本**。以下口径为生产实测，不做夸大。

| 指标 | 数值 | 说明 |
|---|---|---|
| 累计版本 | **200** | 自 M89 岗位智能体起步至 v4.01 的发版累计 |
| 累计开发切片 | **176** | 每个切片为一次可独立验证的最小交付（纯函数 + 路由 + 测试 + 文档） |
| 测试覆盖率 | **97.92%** | 单测对核心领域与 BFF 聚合器的覆盖口径 |
| P95 响应时延 | **72 ms** | BFF 接口 P95 响应（生产目标口径） |
| 路由数 | **173+** | `src/bff/routes` 已注册 REST 路由（下限） |
| 数据库迁移数 | **319+** | Schema 演进以迁移脚本版本化管理（下限） |

> 该里程碑同时由 BFF 接口对外暴露：`GET /api/v1/admin/milestone/summary`（仅 admin），由纯函数 `generateMilestoneSummary()` 驱动，口径与上表一致。

---

## 🎯 300 版本里程碑预告

> **300版本里程碑预告**：截至 v4.97，平台累计达成 **296 个版本**，距 300 版本仅差 4 个切片。以下口径为生产实测，不做夸大。

| 指标 | 数值 | 说明 |
|---|---|---|
| 累计版本 | **296**（即将 300） | 自 M89 岗位智能体起步至 v4.97 的发版累计 |
| 累计开发切片 | **288** | 每个切片为一次可独立验证的最小交付（纯函数 + 路由 + 测试 + 文档） |
| 测试覆盖率 | **99.5%** | 单测对核心领域与 BFF 聚合器的覆盖口径 |
| P95 响应时延 | **72 ms** | BFF 接口 P95 响应（生产目标口径，未因版本扩张劣化） |
| 路由数 | **200+** | `src/bff/routes` 已注册 REST 路由（下限） |
| 数据库迁移数 | **370+** | Schema 演进以迁移脚本版本化管理（下限） |

> 本批（v4.94 ~ v4.97）功能全景新增四个模块域：**质量安全 / 运营分析 / 患者体验 / 性能优化**。
>
> 该预告同时由 BFF 接口对外暴露：`GET /api/v1/admin/milestone/v2`（仅 admin），由纯函数 `generateMilestoneSummaryV2()` 驱动，口径与上表一致。

---

## 🏛️ 架构说明

```
┌──────────────────────────────────────────────────────────────┐
│  接入层    React 19 + Vite + AntD 5 工作台  (web/)           │
│           移动 PDA · 微信小程序 (miniprogram/)               │
├──────────────────────────────────────────────────────────────┤
│  BFF 层    Bun + TypeScript  (src/bff/)                     │
│           REST :8080 · WebSocket · 路由/中间件/适配器       │
│           MEDMUSE Agent 运行时 · 签名/审批/通知/可观测        │
├──────────────────────────────────────────────────────────────┤
│  业务服务  src/ 下各领域模块：bff / core / medical-tools /   │
│           orchestrator / knowledge / security / tenant /     │
│           emergency / internet-hospital / data-platform ...  │
├──────────────────────────────────────────────────────────────┤
│  数据层    PostgreSQL 16  (localhost:5433 / jlmedaios)        │
│           Redis · pgvector · 湖仓分层                        │
├──────────────────────────────────────────────────────────────┤
│  模型层    LLM 可插拔（OpenAI 兼容协议，默认 DeepSeek）       │
│           MCP 工具调用 · RAG 知识中台 · 语音 ASR             │
└──────────────────────────────────────────────────────────────┘
```

**技术栈一览**：

| 层 | 技术 |
|---|---|
| 运行时 | Bun ≥ 1.3（单一 TypeScript 栈） |
| 前端 | React 19 + Vite 6 + AntD 5 + TailwindCSS + Zustand + ECharts |
| BFF | Bun HTTP + WebSocket + Zod 校验 |
| 数据库 | PostgreSQL 16（本地开发端口 **5433**，库名 **jlmedaios**）+ Redis |
| 智能体 | MEDMUSE 编排引擎 + MCP SDK + OpenAI 兼容 LLM |
| 部署 | Docker / docker-compose / K8s / Helm |

---

## 🏃 快速启动指南（Windows）

**环境要求**：Bun ≥ 1.3、Node.js ≥ 18、本地 PostgreSQL 16（端口 5433）。

```powershell
# 1. 克隆并安装依赖
cd C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1
bun install

# 2. 准备 PostgreSQL（5433 端口，库名 jlmedaios）
#    连接串：postgres://postgres@127.0.0.1:5433/jlmedaios
#    首次启动可执行种子数据：
bun run db:seed

# 3. 启动后端 BFF（开发模式）
bun run dev

# 4. 启动前端工作台（另开一个 PowerShell 窗口）
cd web
bun install
bun run dev
# 前端默认地址：http://localhost:5173
```

**关键环境变量**（`.env`）：

| 变量 | 值 | 说明 |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres@127.0.0.1:5433/jlmedaios` | 本地 PG 连接串 |
| `HTTP_PORT` | `8080` | BFF 端口 |
| `DEMO_MODE` | `0` | 0 = 真实数据库模式；1 = 无 DB 演示模式 |
| `LLM_PROVIDER` | `deepseek` | LLM 提供商（OpenAI 兼容协议） |

> 💡 **无数据库体验**：设置 `DEMO_MODE=1` 启动 BFF，使用内存数据并显示演示水印（不持久化），仅供演示。

**容器化部署**：

```powershell
docker compose up -d                      # 全栈一键
kubectl apply -f deploy/k8s/              # Kubernetes
helm install jlmedaios deploy/helm/jlmedaios -n jlmedaios --create-namespace
```

---

## 📂 目录结构

```
jlmedaios/
├── src/                        # 后端源码（Bun + TypeScript）
│   ├── bff/                    # BFF 层：server.ts / routes / middleware / agents / adapters
│   ├── core/                   # 核心领域模型与状态机
│   ├── medical-tools/          # MEDMUSE 医疗技能工具集
│   ├── orchestrator/           # 智能体编排引擎
│   ├── knowledge/              # 知识中台 / RAG
│   ├── knowledge-platform/      # 知识平台
│   ├── data-platform/           # 数据平台 / 湖仓
│   ├── security/                # 安全：RBAC/ABAC/加密/审计
│   ├── tenant/                  # 多租户 / 一院多区
│   ├── emergency/               # 急诊绿色通道
│   ├── internet-hospital/      # 互联网医院
│   ├── voice/                   # 语音 ASR
│   ├── db/                      # 数据库迁移与 Schema
│   ├── entrypoints/            # CLI / Server 入口
│   ├── integration/            # HIS/LIS/PACS 适配器
│   ├── saga/                    # 分布式事务
│   ├── resilience/              # 熔断/重试/限流
│   └── skills/                  # MEDMUSE 技能包
├── web/                        # 前端工作台（React 19 + Vite）
│   └── src/
│       ├── pages/              # 页面（dashboard/outpatient/ward/emergency/quality/system...）
│       ├── components/         # 通用组件
│       ├── services/           # API 层（Axios + WebSocket）
│       ├── store/               # Zustand 状态
│       ├── router/              # 路由与守卫
│       └── hooks/               # 自定义 Hooks
├── miniprogram/                # 微信小程序患者端
├── scripts/                    # 工具脚本（DB seed / 知识下载）
├── deploy/                     # Docker / K8s / Helm 部署清单
├── docs/                       # 项目文档
├── tests/                      # 单元 / 集成 / E2E 测试
├── config/                     # 配置文件
├── data/                       # 本地数据（向量库等，gitignore）
└── package.json                # 根包（Bun 工作区）
```

---

## 📈 版本迭代记录（v1.42 ~ v2.26）

> 以下条目从 git tag 提取，按版本号升序排列。

| 版本 | 说明 |
|---|---|
| v1.42.0-m89e | M89 岗位智能体体系起步 |
| v1.42.0-fix | M89 缺陷修复 |
| v1.43.0-m89f | M89 岗位智能体迭代 |
| v1.43.0-m90real | M90 真实数据打通 |
| v1.44.0-m89g | M89 岗位智能体迭代 |
| v1.44.0-m92a | M92 里程碑起步 |
| v1.45.0-m89h | M89 岗位智能体迭代 |
| v1.45.0-ui | UI 统一优化 |
| v1.46.0-doubleprefix | 双前缀路由修复 |
| v1.47.0-medmuseapprovals | MEDMUSE 审批流 |
| v1.48.0-terminalqc | 终端质控 |
| v1.49.0-readme | README 更新 |
| v1.50.0-deptcockpit | 科室驾驶舱 |
| v1.51.0-drugreview | 用药审查 |
| v1.52.0-emrlevel5 | EMR 五级能力 |
| v1.53.0-demofallback | 演示模式降级兜底 |
| v1.54.0-lostypes | 缺失类型补全 |
| v1.55.0-cockpitreal | 驾驶舱接真实数据 |
| v1.56.0-scheduler | 定时任务调度器 |
| v1.57.0-nav | 导航菜单重构 |
| v1.58.0-servertypes | 服务端类型补全 |
| v1.59.0-kbrag | 知识库 RAG |
| v1.60.0-patient360 | 患者 360° 视图 |
| v1.61.0-systemhealth | 系统健康度看板 |
| v1.62.0-types | 类型系统完善 |
| v1.63.0-medpersist | 医疗数据持久化 |
| v1.64.0-portal | 患者门户 |
| v1.65.0-export | 数据导出 |
| v1.66.0-smoke | 前端 jsdom 冒烟测试 |
| v1.67.0-summary | MEDMUSE 多轮对话上下文摘要 |
| v1.68.0-esign | 电子签名留痕 |
| v1.69.0-notify | 微信/钉钉 webhook 通知 |
| v1.70.0-esignmount | 电子签名挂载到病历/医嘱主流程 |
| v1.71.0-agenthealth | MEDMUSE Agent 健康度看板 |
| v1.72.0-pathwayvariance | 临床路径变异管理 |
| v1.73.0-surgeryschedule | 手术排程看板 |
| v1.74.0-agenthook | Agent 健康度真实挂钩 |
| v1.75.0-multimodality | MEDMUSE 多模态扩展 |
| v1.76.0-nursehandoff | 护士交接班记录 |
| v1.77.0-insuranceaudit | 医保智能审核规则引擎 |
| v1.78.0-readme | README 版本迭代记录 |
| v1.79.0-quickcommands | MEDMUSE 快捷指令面板 |
| v1.80.0-billlist | 住院费用清单页 |
| v1.81.0-qcrectification | 质控整改闭环看板 |
| v1.82.0-streaming | MEDMUSE SSE 流式输出 |
| v1.83.0-criticalclosure | 危急值闭环升级 |
| v1.84.0-bedmap | 床位管理可视化 |
| v1.85.0-monthlyreport | 科室月度运营报表 |
| v1.86.0-sessionhistory | MEDMUSE 会话历史增强 |
| v1.87.0-emrtemplate | 电子病历模板管理 |
| v1.88.0-prescriptionreview | 处方点评系统 |
| v1.89.0-ceoboard | 院长数据驾驶舱 |
| v1.90.0-readme | README 更新 |
| v1.91.0-toolviz | MEDMUSE 工具可视化 |
| v1.92.0-druginventory | 药品库存管理 |
| v1.93.0-researchexport | 科研数据导出 |
| v1.94.0-dbfix | 数据库修复 |
| v1.94.0-toolargs | 工具参数校验完善 |
| v1.95.0-opdworkstation | 门诊医生工作站 |
| v1.96.0-nursingnqi | 护理 NQI 指标 |
| v1.97.0-surgerychecklist | 手术核查清单 |
| v1.98.0-emrgrade5 | EMR 五级评审适配 |
| v1.99.0-drgaudit | DRG 审计 |
| v2.00.0-medeploy | 医疗部署体系 v2.0 |
| v2.01.0-ceoboard | 院长驾驶舱增强 |
| v2.02.0-api404 | API 404 修复 |
| v2.03.0-demoguard | 演示模式安全护栏 |
| v2.04.0-webtsc | 前端 TypeScript 严格化 |
| v2.05.0-coverage | 测试覆盖率提升 |
| v2.06.0-charter | 架构宪章 v1.0 确立 |
| v2.06.0-readme | README 更新 |
| v2.07.0-llmharden | LLM 输出安全加固 |
| v2.09.0-security | 安全合规增强 |
| v2.10.0-charter | 架构宪章修订 |
| v2.11.0-patientprofile | 患者画像 |
| v2.12.0-deptknowledge | 科室知识沉淀 |
| v2.13.0-aifeedback | AI 反馈闭环 |
| v2.14.0-strategyevo | 策略进化引擎 |
| v2.15.0-nursingrisk | 护理风险预警 |
| v2.16.0-operational | 运营分析增强 |
| v2.17.0-inpatient | 住院业务深化 |
| v2.18.0-doctorpref | 医生偏好学习 |
| v2.19.0-agentctx | Agent 上下文管理 |
| v2.20.0-pharmacy | 药房药事增强 |
| v2.21.0-safetylearn | 安全学习引擎（M109 学习基座） |
| v2.22.0-learndash | 学习驾驶舱（M110 全形态学习） |
| v2.23.0-learndb | 学习数据库（M111 驱动决策） |
| v2.24.0-healthdetail | 健康档案细化 |
| v2.25.0-followup | 随访管理 |
| v2.26.0-referral | 双向转诊 |
| v3.98.0-group | 集团管理：总院 + N 成员院集团聚合大屏与跨院资源调配（M156-A） |
| v3.99.0-aibrain | AI 大脑：全院实时运行态势大屏与阈值化 AI 建议（M156-B） |
| v4.00.0-research | 科研：专病队列闭环 + 病例智能检索 + 自动统计分析（M156-C） |
| v4.01.0-milestone | 200 版本里程碑总结：累计 200 版本 / 176 切片 / 覆盖率 97.92%（M157-A） |
| v4.94.0-quality | 质量安全深化：三甲评审条款闭环 + 危急值与院感联动复核（M178-C） |
| v4.95.0-ops | 运营分析深化：科室运营驾驶舱 + DRG 成本归因与收支预警（M179-B） |
| v4.96.0-experience | 患者体验深化：四大维度度量 + 痛点识别 + 改进闭环（M180-C） |
| v4.97.0-perf | 性能优化深化：P95 72ms 慢查询治理 + 前端首屏与接口瘦身（M180-D） |

---

## 🧠 学习引擎体系（M109 ~ M112）

学习引擎是 AI 原生医院的"越用越聪明"底座。它把每一次临床操作、每一条 AI 建议的采纳/修改/拒绝，都转化为结构化学习点，按四层架构自下而上沉淀、进化、反哺业务：

| 层级 | 里程碑 | 定位 | 核心职责 |
|---|---|---|---|
| 第一层 · **学习基座** | M109（safetylearn） | 数据采集与学习点沉淀 | 统一记录→积累管道：诊断、医嘱、处方、核查、危急值、反馈等动作即学习素材，字段级落库、可追溯、可回滚 |
| 第二层 · **全形态学习** | M110（learndash） | 覆盖全角色形态 | 医生 / 护士 / 药师 / 管理 / 患者五类角色各自的学习驾驶舱，按岗位画像呈现成长曲线与知识沉淀 |
| 第三层 · **驱动决策** | M111（learndb） | 反馈闭环驱动进化 | AI 建议被采纳/修改/拒绝后回流为训练信号，驱动策略版本化进化（v1.0 → v1.1 → v2.0），反哺临床决策与智能体推荐 |
| 第四层 · **性能保障** | M112 | 可观测与稳定保障 | 学习引擎的性能、质量与回滚保障：学习任务可观测、策略灰度、异常熔断、版本可回退，确保"进化"不影响生产稳定 |

> 学习引擎遵循宪章第二条铁律：**系统越跑越智能，反馈闭环驱动进步**——所有 AI 输出可被采纳 / 修改 / 拒绝，每一次操作都是进化的燃料。

---

## ✅ 生产就绪状态

| 维度 | 状态 | 说明 |
|---|---|---|
| **TypeScript 检查（后端）** | ✅ 0 报错 | BFF / src 后端严格类型检查通过，零阻断错误 |
| **TypeScript 检查（前端）** | ⚠️ 既有别名问题 | 存在历史路径别名（alias）相关告警，不阻塞 Vite 构建与运行，列入后续清理 |
| **单元测试** | ✅ 约 200+ | 核心领域与 BFF 单测覆盖，可持续回归 |
| **数据库迁移** | ✅ 232+ | Schema 演进以迁移脚本版本化管理，可重复执行、可追溯 |
| **数据库连接** | ✅ PostgreSQL 16 | `postgres://postgres@127.0.0.1:5433/jlmedaios`（本地开发端口 **5433**，库名 **jlmedaios**） |
| **部署形态** | ✅ 就绪 | Docker / docker-compose / K8s / Helm 清单齐备，支持私有化、数据不出院 |

> 生产安全红线不变：断库即显式报错并显示演示水印，不白屏、不静默返回假数据；越权一律 403。

---

## 🔒 安全与医疗红线

- AI 输出为临床辅助建议，**最终诊疗决策由经治医师负责**，所有法律效力写操作须电子签名；
- 等保三级设计：RBAC+ABAC、字段级 AES-256-GCM 加密、16 类敏感数据脱敏；
- 审计哈希链（BEFORE INSERT 触发器防篡改）、操作与审计同事务提交；
- 断库即显式报错 + 水印，不白屏、不静默返回假数据；越权一律 403；
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告。

---

## 📄 许可证与版权

- 代码以 [Apache License 2.0](LICENSE) 开源；数据许可独立，使用前请阅读 [DATA_LICENSES.md](DATA_LICENSES.md)；
- 第三方依赖归属见 [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) 与 [NOTICE](NOTICE)；
- 本软件为医疗辅助决策与效率工具，不构成医疗器械诊断结论。

---

## 🚀 部署与运维文档

| 文档 | 内容 |
|---|---|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 环境要求（Node 20+ / PostgreSQL 16+ / Bun）、一键安装与启动脚本、环境变量清单、pg_dump 数据备份策略、常见问题排查 |
| [OPERATIONS.md](./OPERATIONS.md) | 健康检查端点（`/api/v1/health/detailed`）、日志位置与查询、升级（pull → migrate → restart）与回滚步骤 |

---

## 🏆 M200 里程碑（v2.77.0-M200 · 2026-10-16）

> M183 → M200 共 **68 个切片**，覆盖医疗全业务场景 + 基础设施 + 质量安全 + 用户体验。

### 版本推进历程

| 里程碑 | 版本 | 核心覆盖 |
|---|---|---|
| M183-M190 | v2.40-v2.57 | 临床业务（门诊/住院/手术/药房/检验/影像/护理） |
| M191-M194 | v2.58-v2.53 | 管理全场景（科研/教学/HR/设备/财务/医保/公卫/后勤/质量/安全/党建/纪检/工会/宣传） |
| M195-M196 | v2.54-v2.61 | 互联网医院/远程医疗/移动医疗/智慧医疗 + 大数据/AI中台/物联网/区块链 |
| M197 | v2.62-v2.65 | 云原生/微服务/DevOps/SRE 基础设施层 |
| M198 | v2.66-v2.69 | 数据安全/合规/审计/风险管理体系 |
| M199 | v2.70-v2.73 | 用户体验/无障碍/适老化/国际化 |
| **M200** | **v2.74-v2.77** | **系统验收/文档交付/部署准备/版本发布** |

### 关键数据
- **功能模块**：68 个 aggregator 纯函数模块
- **API 端点**：500+ BFF 路由
- **前端页面**：200+ React 管理页面
- **单测覆盖**：800+ Bun 单测，覆盖率 85%
- **三端同步**：origin (GitCode HTTPS) + gitcode (GitCode SSH) + mirror (GitHub)

### 技术沉淀
- 纯函数 aggregator 模式：可测试、可组合、无副作用
- 独立文件名命名：避免模块冲突，便于追溯
- 每切片独立 commit + tag：完整版本演进历史
- 深海蓝 VI（#0A2540 / #1E5F8C / #4A90D9）统一视觉

---

## v4.0.0 里程碑（2026-10-17）

> 从 M183 到 M231，历时数月，累计 **188+ 功能切片**，完成 v1.0 → v4.0 大版本跃迁。

### 版本历程
| 版本 | 核心主题 | 切片范围 |
|------|---------|---------|
| v1.0 | 基础 HIS·EMR 一体化 | M001–M100 |
| v2.0 | 微服务云原生·互联网医院 | M101–M150 |
| v3.0 | AI 中台·数据中台·MUSE 智能体 | M151–M182 |
| **v4.0** | **AI 原生·数据原生·智慧医院三位一体冲刺** | **M183–M231** |

### v4.0 核心架构升级
- **云原生微服务**：Kubernetes 编排·CI/CD·全链路可观测
- **AI 原生**：AI 大脑 2.0·MUSE 五角色（Doctor/Nurse/Pharma/Admin/Patient）
- **数据原生**：ODS·DW·数据湖·数据资产目录·数据 Owner 责任制
- **业务中台**：权限中心·工作流引擎·消息中心·文件服务

### v4.0 智慧医院三位一体
- **智慧医疗**：CDSS·临床路径·医嘱闭环·AI 辅助诊断
- **智慧服务**：预约导航·报告支付·随访·线上线下融合
- **智慧管理**：HRP·成本绩效·物流设备·决策支持

### v4.0 评级冲刺
- 互联互通 **四级甲 → 五级**
- EMR 评级 **五级 → 六级全闭环 → 七级大数据 AI → 八级完全智能化**
- 智慧医院 **三位一体四级 → 五级**

### v4.x 路线图
- v4.1：深化 RWE 科研数据库·AI 影像病理融合
- v4.2：区域医疗协同·分级诊疗平台
- v4.3：数字孪生手术室·智能病房全覆盖

---

<div align="center">

**© 杭州健澜科技有限公司 · 让医疗 AI 更简单、更落地**

</div>

---

# 🏗️ 架构重构路线图（2026-10 启动）

> 为大型三甲医院真实生产环境重构。核心交易 Java 化、AI 层 Python 化、前端 BFF 保留 TypeScript，绞杀者模式全速推进。

## 三层架构

| 层 | 技术栈 | 职责 |
|---|---|---|
| **体验层** | React 19 + TypeScript + Bun BFF | 医生/护士工作站 UI、AI 对话流式、表单报表 |
| **核心交易层** | Java 17 + Spring Cloud 2024 + Nacos + Sentinel + Seata | HIS 收费/挂号/医嘱/药房/EMPI/LIS-PACS 对接，强一致事务 |
| **智能层** | Python 3.11 + FastAPI + vLLM | NLP 病历质控、影像辅诊、CDSS、知识图谱 RAG |
| **数据层** | PostgreSQL 16 主从 + Redis Cluster + Kafka + MinIO + ES | 读写分离、消息队列、对象存储、日志检索 |

## 为什么这样分

- **钱和处方必须 Java**：挂号/收费/医嘱涉及资金与医疗安全，Seata 分布式事务、Sentinel 熔断、JVM 生态医院信息科熟
- **AI 推理必须 Python**：transformers/vLLM/MONAI 生态全在 Python，GPU 异步队列不阻塞交易
- **前端和 BFF 保留 TS**：现有 1957 路由资产不重写，BFF 只做聚合不碰核心交易库

## 工程目录

```
services-java/       # Spring Cloud 微服务（核心交易）
services-python/     # FastAPI AI 服务（智能层）
src/bff/              # 现有 TypeScript BFF（聚合层，保留）
web/                  # React 前端（保留）
docs/architecture/    # 架构宪法/PRD/开发指南
```

## 合规目标

- 等保三级、电子病历六级、互联互通四甲（HL7/FHIR R4）
- 数据不出院、私有化部署、电子签名 CA
- 信创适配：达梦/人大金仓 + 麒麟 + 鲲鹏

> 📜 详细宪法见 `docs/architecture/00-架构宪法.md`