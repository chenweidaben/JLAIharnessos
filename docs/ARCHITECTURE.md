# 健澜AI原生医院操作系统OS — 技术架构白皮书

## 产品定位

**健澜AI原生医院操作系统OS**——不是 HIS，是医院的操作系统。

不是又一个挂号收费系统，不是电子病历的翻新，不是医院信息科的工具集。
是医院的"AI 大脑"——每一次挂号、每一张处方、每一次检查、每一笔收费，都成为 AI 的学习样本。医生越用越准，系统越用越聪明。

## 三层架构图

```
┌─────────────────────────────────────────┐
│  TS BFF (8080)  体验层：前端聚合/鉴权/缓存  │
├─────────────────────────────────────────┤
│  Python AI 层 (8000)  智能引擎：vLLM 本地推理 │
├─────────────────────────────────────────┤
│  Java 模块化单体 (9090)  交易引擎：45 个业务模块 │
├─────────────────────────────────────────┤
│  PostgreSQL (5432) + Redis (6379)      │
└─────────────────────────────────────────┘
```

## 为什么不是微服务

专家论证结论：模块化单体内聚，第 3 个模块需独立扩缩时才引入 Spring Cloud；当前 45 模块单体内聚开发效率最高。

**选型依据**：

| 维度 | 模块化单体 | 微服务 |
|---|---|---|
| 开发效率 | 高（单仓库/单进程/热部署） | 低（多仓库/多进程/链路追踪） |
| 部署复杂度 | 低（1 个 jar） | 高（N 个服务+注册中心+配置中心） |
| 数据库事务 | 本地 ACID | 分布式事务（最终一致性） |
| 扩缩容粒度 | 整体 | 按服务独立扩缩 |
| 适用阶段 | 0→1，业务快速迭代 | 1→N，多团队并行 |

**当前阶段判断**：45 个业务模块单体内聚开发效率最高；远期第 3 个核心模块（如 AI 推理）需独立扩缩时，再拆分微服务（Spring Cloud 骨架已预留）。

## 核心设计原则

### 1. append-only 病历 + 哈希链 + CA 签章
- 病历一旦生成不可修改，只能追加 review 记录
- SHA-256 区块链式链接（prevHash → appendHash）
- CA 电子签章 + TSA 时间戳，法律效力

### 2. AI 本地推理（vLLM，数据不出院）
- 统一走本地 vLLM `http://vllm:8000/v1`
- 禁止 OpenAI / Claude / Gemini / Cohere 任何境外大模型
- 8 秒超时自动降级 mock，不阻塞业务

### 3. 国密全链路（SM2/SM3/SM4，生产接 HSM）
- 数据加密 SM4（mock base64，生产接 HSM 加密机）
- 哈希 SM3（mock SHA-256，生产用真 SM3）
- 签名 SM2（预留）

### 4. FHIR R4 互联互通四甲
- FHIR R4 资源接收/查询（Patient/Observation/Condition）
- 当前 mock 存储，生产接 HAPI FHIR Server

## 技术栈

| 层 | 技术 | 版本 |
|---|---|---|
| 核心交易 | Spring Boot | 3.5.3 |
| JDK | OpenJDK | 21 |
| 模块化 | Spring Modulith | 1.3.0 |
| ORM | Spring Data JPA | - |
| 智能引擎 | FastAPI | 0.115+ |
| 数据校验 | Pydantic | v2 |
| 推理引擎 | vLLM | - |
| 数据库 | PostgreSQL | 16 |
| 缓存 | Redis | 7 |
| 体验层 | Bun + TypeScript | - |

## 模块全景图（45 个业务模块）

| 业务域 | 模块数 | 模块列表 |
|---|---|---|
| **核心交易** | 9 | reg / charge / orders / pharmacy / empi / ward / lis / nursing / discharge |
| **诊疗沉淀** | 1 | encounter |
| **临床闭环** | 6 | surgery / transfusion / antibiotic / emr / critical / followup |
| **临床场景** | 6 | nursing_record / clinical_pathway / insurance / nutrition / pharmacy_service / appointment |
| **运营管理** | 5 | quality / admin / opdashboard / teaching / performance |
| **患者服务** | 2 | patient_portal / radiology_report |
| **安全合规** | 4 | audit / security / fhir / openapi |
| **医院运营** | 6 | mobile_rounds / material / equipment / medical_record / research_data / infection_control |
| **行政办公** | 3 | complaint / consultation / emergency |
| **随访计划** | 1 | followup_plan |
| **工程化** | 2 | monitoring / config |

---

**Copyright © 2026 杭州健澜科技有限公司**
