# 开源 HIS / EMR 与云原生医疗平台调研报告（中文）

> 杭州健澜科技 · jlmedaios 数智医院工业级智能体操作系统
> 阶段 1 · 开源调研
> 调研日期：2026-09-25　调研方法：对各项目官网、官方文档、公开对比资料进行真实检索与交叉核对
> 版权所有（c）2026 杭州健澜科技有限公司

---

## 1. 调研目的与范围

为支撑 jlmedaios 从"门诊真实闭环"走向"未来 15 年 AI 原生医院一体化平台"，本报告系统调研全球具有代表性的开源医院信息系统（HIS）、电子病历（EMR/EHR）、云原生 FHIR / openEHR 平台，提炼可借鉴的**领域模型、架构模式、工程实践与可复用资产**，并明确**许可证兼容性**，避免侵权与重复造轮子。

调研覆盖三类共 9 个代表项目：

| 类别 | 项目 |
|---|---|
| 完整 HIS / EMR | Bahmni、OpenEMR、GNU Health |
| 模块化 EMR 平台 | OpenMRS 3（O3） |
| 云原生标准平台（FHIR / openEHR） | Medplum、HAPI FHIR、EHRbase（另及 Better/Ocean 对照） |

---

## 2. 项目逐项分析

### 2.1 Medplum —— FHIR 原生的"无头 EHR"（与我们技术栈最接近）

- **定位**：面向开发者的开源医疗平台，自称 "headless EHR"，用于快速构建定制 EHR、患者门户与临床应用。
- **技术栈**：TypeScript / Node，前后端同语言；提供 React 组件库与全类型 SDK。
- **许可证**：**Apache License 2.0**，可自托管，无厂商锁定。
- **核心能力**：
  - 完整 FHIR R4 数据存储与 API：全部资源、搜索参数、REST、**GraphQL**、托管术语（Terminology）、**时间感知搜索（AS-OF / 版本）**；
  - TS/JS SDK：鉴权、搜索、分页、Batch Bundle、Subscription 各为一个方法调用；
  - **Bots**（基于 JS/TS 的工作流自动化，类似云函数）、**Agent**（连接院内遗留系统的安全桥，HTTPS↔WSS 端到端加密）；
  - 访问策略（Access Policies）、合规：2026-06 取得 **HITRUST e1** 认证。
- **可借鉴点**：
  1. FHIR 原生存储 + 多协议（REST/GraphQL/Subscription）网关；
  2. Bots/Agent 的"自动化逻辑 + 遗留系统桥"分层，与我们的技能体系 / 集成适配器理念一致；
  3. 时间感知（版本化）搜索对电子病历"可追溯、可审计"至关重要。
- **局限**：以 FHIR 资源为中心，对中国三甲特有的医保 DRG-DIP 结算、HIS 收费/药房流程、电子病历评级等需本地化重建。
- 来源：<https://www.medplum.com>、<https://www.medplum.com/open-source>、<https://www.medplum.com/products>、<https://www.medplum.com/solutions/agent>

### 2.2 OpenMRS 3（O3）—— 微前端 EMR 框架

- **定位**：全球领先的开源 EMR，O3 是其新一代**模块化、可扩展前端框架**，面向诊疗点工作流与复杂临床记录。
- **技术栈**：前端微前端（Microfrontends，独立 npm 包 ESM，经 **Import Map + Webpack Module Federation** 按需加载）；后端 OpenMRS（Java）+ MariaDB；通过 **FHIR2 模块**与 REST 对外。
- **许可证**：**Mozilla Public License 2.0（MPL 2.0）**。
- **核心能力**：
  - 微前端 ESM 各自导出生命周期，运行时按 Import Map 装配，支持扩展点（Extension System）；
  - 运行于既有数据库之上，后端可独立演进；
  - 参考生产部署：Nginx 网关（SSL 终止/路由）+ SPA 静态容器 + OpenMRS 后端 + MariaDB + 可选 Certbot。
- **可借鉴点**：
  1. **微前端 + 模块联邦**的前端装配机制，适合大型医院多团队、多模块并行；
  2. 扩展点 / 插件化思想，与我们"让信息科自行装配智能体与页面"的目标契合；
  3. 网关—静态—后端—数据库的标准容器拓扑。
- **局限**：数据模型为 OpenMRS 自有（person/obs/encounter），中国场景需大量本地化；MPL 为文件级 copyleft，直接拷贝源文件需谨慎。
- 来源：<https://o3-docs.openmrs.org/en-US/docs/introduction>、<https://o3-docs.openmrs.org/en-US/docs/key-repositories>、<https://openmrs.org/download/>、<https://o3-docs.openmrs.org/en-US/docs/recipes/deploy-to-production>

### 2.3 Bahmni —— "组合式"完整 HIS + EMR（一体化范式最直接参照）

- **定位**：易用、完整的开源 HIS 与 EMR，2012 年起为低资源环境设计，已在从小诊所到大医院、多国场景落地。
- **架构（关键）**：并非从零自研，而是**编排/增强一组既有开源产品**：
  - **OpenMRS**：电子病历与患者管理；
  - **OpenERP / Odoo**：库存、计费、财务会计；
  - **OpenELIS**：实验室（LIS）管理；
  - **DICOM / PACS**：影像。
- **互操作**：经由底层 OpenMRS 原生支持 **FHIR**，对外暴露 REST 与 FHIR API；通过印度 **ABDM** 认证。
- **可借鉴点**：
  1. **"以标准平台为核、组合最佳开源组件"的一体化集成范式**，与 jlmedaios"医疗 AI 的安卓"生态定位高度一致；
  2. 明确划分 EMR / ERP(计费库存) / LIS / PACS 子系统并统一到一套医院流程；
  3. 标准 API（REST/FHIR）作为子系统间契约。
- **局限**：各子系统技术栈异构（Java/Python）、运维复杂度高；中国计费/医保/药房流程需替换 Odoo 部分并本地化。
- 来源：<https://www.bahmni.org/>、<https://bahmni.github.io/>、Bahmni Wiki（FHIR/ABDM）

### 2.4 EHRbase —— openEHR 原生临床数据仓库

- **定位**：面向临床应用与电子健康档案的开源后端，标准合规、面向关键业务。
- **技术栈**：Java，**PostgreSQL**；所有服务经**官方 openEHR REST API**（含 **AQL 原型查询语言**）。
- **许可证**：**Apache 2.0**；主要贡献者为德国 vitagroup、ADOC。
- **生产规模**：支撑西班牙**加泰罗尼亚约 750 万居民**级部署（openEHR CDR 大规模生产代表）。
- **可借鉴点**：
  1. openEHR **双模型（参考模型 + 原型/模板 Archetype/Template）**实现临床高保真、可演进建模——新增临床概念不改表结构；
  2. AQL 面向临床概念查询；PostgreSQL 为底座与我们一致；
  3. 大规模人口级生产验证。
- **局限**：仅临床数据仓库，无挂号/收费等 HIS 事务；openEHR 学习曲线陡，原型治理需专门流程。
- 来源：<https://openehr.org/platform/>、openEHR CDR 对比（nirmitee.io）、openEHR 服务器对比（SciSpace）

### 2.5 HAPI FHIR —— 部署最广的开源 FHIR 服务器

- **定位**：最广泛部署的开源 FHIR 服务器（Smile CDR 维护），可运行的 FHIR 资源服务器与参考实现。
- **技术栈**：Java（JVM），后端可插拔 **PostgreSQL / MySQL / Oracle / SQL Server，另有 MongoDB**；完善的资源校验、请求拦截器、`$export` 批量导出。
- **许可证**：开源（具体以仓库为准，需在引入前逐文件核对）。
- **可借鉴点**：FHIR 服务器的**校验管线、拦截器链、持久化抽象、术语与批量导出**工程实践。
- **局限**：JVM 体系，与我们 TS 主栈异构，宜作为独立标准服务或架构参照，不直接糅合。
- 来源：HAPI FHIR 对比（nirmitee.io）、worldmetrics FHIR 评测、HL7 开源实现清单

### 2.6 OpenEMR 与 GNU Health（全功能/公卫对照）

- **OpenEMR**：**GPL v2**，全功能诊所管理（计费、排班、ONC 认证、SMART on FHIR），实践管理最完整；GPL 强 copyleft，**不宜直接 vendor**，宜作独立系统或功能对标。
- **GNU Health**：聚焦**公共卫生、社会医学、遗传学**，含 ICU/手术模块，提供只读 FHIR API；适合公卫与专科参照。
- 来源：Self-Hosted EMR 对比（pistack.xyz）、Modern Open Source EMR（ottehr.com）

---

## 3. 横向对比总表

| 项目 | 类别 | 技术栈 | 许可证 | FHIR | openEHR | 实践管理(计费/库存) | 对 jlmedaios 主要价值 |
|---|---|---|---|---|---|---|---|
| **Medplum** | FHIR 平台 | TS/Node+React | **Apache 2.0** | 原生 R4 | — | 弱 | FHIR 网关、Bots/Agent、版本化搜索（同栈可深借鉴） |
| **OpenMRS O3** | EMR 框架 | Java+微前端 | **MPL 2.0** | FHIR2 模块 | 模块 | 社区模块 | 微前端/模块联邦、扩展点 |
| **Bahmni** | 完整 HIS+EMR | 组合(Java/Py) | 多（随组件） | 经 OpenMRS | — | **强（Odoo）** | 组合式一体化集成范式 |
| **EHRbase** | openEHR CDR | Java+PG | **Apache 2.0** | 桥接 | **原生** | 无 | openEHR 双模型、AQL、大规模生产 |
| **HAPI FHIR** | FHIR 服务器 | Java | 开源 | 原生 | — | 无 | FHIR 校验/拦截器/持久化工程 |
| **OpenEMR** | 全功能 EMR | PHP | **GPL v2** | SMART on FHIR | 有限 | **强** | 功能对标（不 vendor） |
| **GNU Health** | 公卫 EMR | Python | GPL | 只读 | — | 中 | 公卫/遗传/ICU 参照 |

---

## 4. 关键范式：FHIR 与 openEHR 是互补而非互斥

调研中多家平台与资料一致指出：

- **openEHR 擅长"高保真临床数据持久化"**：通过社区治理的原型（Archetype）/模板表达临床概念，双模型使数据结构可随医学发展演进、不破坏既有数据；
- **FHIR 擅长"基于 API 的数据交换与生态集成"**：资源粒度贴合 Web/移动，SMART on FHIR、订阅、批量数据等生态成熟；
- **二者互补，常见组合为"openEHR 存储 + FHIR 互操作"**（如 Medblocks 模式）。

**对 jlmedaios 的结论**：采用 **FHIR / openEHR 双轨映射**——对内以可演进的临床模型保证高保真与可追溯，对外以 FHIR API 融入区域平台与第三方生态；现阶段我们以 PostgreSQL 关系模型 + FHIR 对外为主，openEHR 作为高保真临床库的可选增强，通过映射层互通，而非一次性推倒。

来源：Medblocks《EHR Systems Explained》、Semantic Scholar《Comparison of OpenEHR and HL7 FHIR》、pistack 自托管对比

---

## 5. 许可证合规结论（引入前的硬边界）

| 许可证 | 代表项目 | 传染性 | 对 jlmedaios 的使用方式 |
|---|---|---|---|
| **Apache 2.0** | Medplum、EHRbase | 宽松（含专利授权） | **可参考、可 vendor**，保留 LICENSE/NOTICE 与版权头 |
| **MPL 2.0** | OpenMRS | 文件级 copyleft（修改的 MPL 文件须开源，不传染他人文件） | 可作独立服务/学习；若拷贝 MPL 文件需按文件开源，建议仅借鉴架构 |
| **GPL v2/v3** | OpenEMR、GNU Health | 强 copyleft（衍生整体须开源） | **不直接 vendor 进主代码库**；作为独立系统部署或纯功能对标 |
| **CC BY-NC-SA 4.0** | DAMO-RADAR 权重 | 非商业、相同方式共享 | 仅研究/非商业，临床商用需授权与医疗器械注册 |

**总原则**：jlmedaios 主仓库只纳入 Apache/MIT/BSD 类宽松代码与自研代码；MPL/GPL 组件以**独立微服务 / 独立进程**方式对接（接口解耦），并在文档与发行包中完整披露许可证清单（SBOM）。

---

## 6. 对 jlmedaios 的具体启示（落地到顶层设计）

1. **一体化而非单点**：借鉴 Bahmni，以 jlmedaios 智能体内核为底座，组合/对接 HIS（挂号/收费/药房）、EMR（病历文书）、LIS、PACS，形成统一医院流程，子系统以标准 API/事件解耦。
2. **AI 原生横切**：借鉴 Medplum Bots/Agent，把 Agent 编排、技能（Skills）、CDS、RAG 作为横切能力层，嵌入每个业务环节，但**写操作与诊断须医师复核签名**。
3. **前端可装配**：借鉴 OpenMRS O3 微前端/扩展点，让医院信息科能低代码装配页面与智能体（AI 病历、AI 质控、语音病历等刚需）。
4. **标准双轨**：FHIR 对外、可演进临床模型（向 openEHR 对齐）对内，保证 15 年可演进与互联互通。
5. **云原生与高并发**：网关 + 无状态服务 + PostgreSQL + 事件流 + 可观测性，配合熔断/限流/削峰，真实对应三甲高并发。
6. **合规内建**：等保 2.0 三级、审计哈希链、16 类脱敏、RBAC+ABAC、多租户一院多区从架构第一天就位。

> 本报告结论将直接用于配套文档：《面向 AI 原生医院的一体化平台顶层设计》与《Strangler 渐进重构路线图》。

---

## 7. 主要来源清单

- Medplum：<https://www.medplum.com>、<https://www.medplum.com/open-source>、<https://www.medplum.com/products>、<https://www.medplum.com/solutions/agent>、<https://www.medplum.com/blog/hitrust-e1-certification>
- OpenMRS O3：<https://o3-docs.openmrs.org/en-US/docs/introduction>、<https://o3-docs.openmrs.org/en-US/docs/key-repositories>、<https://openmrs.org/download/>、<https://o3-docs.openmrs.org/en-US/docs/recipes/deploy-to-production>
- Bahmni：<https://www.bahmni.org/>、<https://bahmni.github.io/>
- EHRbase / openEHR：<https://openehr.org/platform/>、<https://nirmitee.io/blog/openehr-cdr-vendor-comparison-2026/>、<https://scispace.com/pdf/comparison-of-openehr-open-source-servers-3gab0geblm.pdf>
- HAPI FHIR：<https://nirmitee.io/blog/fhir-data-store-compared-hapi-google-aws-healthlake-azure/>、<https://worldmetrics.org/best/fhir-software/>、<https://confluence.hl7.org/spaces/FHIR/pages/35718838/Open+Source+Implementations>
- 综合对比：<https://www.pistack.xyz/posts/2026-06-04-self-hosted-medical-emr-ehr-openemr-openmrs-ehrbase-guide/>、<https://www.ottehr.com/post/modern-open-source-emr-options>、<https://medblocks.com/blog/ehr-systems-explained>

> 注：以上信息来自公开网络检索，版本与许可证以各项目官方仓库当时状态为准；正式引入任何代码前将逐文件核对许可证并纳入 SBOM。
