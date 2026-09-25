# 开源 HIS/EMR 与云原生医疗平台调研报告（中文）

> 编制单位：杭州健澜科技
> 产品代号：**jlmedaios**（愿景：**医疗AI的安卓**）
> 文档定位：阶段 1「设计先行」开源对标调研，为 jlmedaios 的领域建模、架构选型与许可证策略提供事实依据。
> 调研方法：仅采信项目官网、官方文档、官方许可证页与可核验的公开资料；每条关键事实附来源 URL；无法核实者明确标注「未核实」，不臆造版本号、技术栈或许可证。
> 版本基线：阶段 0 三方基线 HEAD `aa95182`（master）。

## 目录

- [1. 调研范围与结论速览](#1-调研范围与结论速览)
- [2. 成熟 HIS/EMR 系统](#2-成熟-hisemr-系统)
  - [2.1 OpenMRS](#21-openmrs)
  - [2.2 Bahmni](#22-bahmni)
  - [2.3 OpenEMR](#23-openemr)
  - [2.4 HospitalRun](#24-hospitalrun)
  - [2.5 GNU Health](#25-gnu-health)
  - [2.6 Open Hospital](#26-open-hospital)
- [3. 云原生 / FHIR / openEHR 平台](#3-云原生--fhir--openehr-平台)
  - [3.1 Medplum](#31-medplum)
  - [3.2 Aidbox](#32-aidbox)
  - [3.3 HAPI FHIR](#33-hapi-fhir)
  - [3.4 EHRbase（openEHR）](#34-ehrbaseopenehr)
  - [3.5 LinuxForHealth / IPF](#35-linuxforhealth--ipf)
- [4. 云原生工程范式](#4-云原生工程范式)
  - [4.1 服务网格（Service Mesh）](#41-服务网格service-mesh)
  - [4.2 Kafka 事件流](#42-kafka-事件流)
  - [4.3 可观测性（Observability）](#43-可观测性observability)
  - [4.4 多租户（Multi-tenancy）](#44-多租户multi-tenancy)
- [5. 逐项对比总表](#5-逐项对比总表)
- [6. 许可证兼容性与传染性专题](#6-许可证兼容性与传染性专题)
- [7. 对 jlmedaios 的取舍建议](#7-对-jlmedaios-的取舍建议)
- [8. 未核实与存疑清单](#8-未核实与存疑清单)

---

## 1. 调研范围与结论速览

本次调研覆盖三类对象：

1. **成熟 HIS/EMR**：OpenMRS、Bahmni、OpenEMR、HospitalRun、GNU Health、Open Hospital；
2. **云原生 / FHIR / openEHR**：Medplum、Aidbox、HAPI FHIR、EHRbase、LinuxForHealth/IPF；
3. **云原生工程范式**：服务网格、Kafka 事件流、可观测性、多租户。

**一句话结论：**

- 成熟 HIS/EMR 多为 Java/PHP/Python 的单体或模块化单体，面向低资源地区与基层医疗，**许可证以 GPL 系（GPL/AGPL）强 copyleft 为主**，仅 OpenMRS（MPL-2.0）、HospitalRun（MIT）对商业闭源友好；
- 云原生 FHIR 阵营中，**Medplum（Apache-2.0，TypeScript）与 HAPI FHIR（Apache-2.0，Java）许可证最友好、工程范式最现代**，是 jlmedaios 的主要对标对象；**Aidbox 为闭源商业产品**（仅开发许可免费、禁止 PHI、≤5GB），只能对标设计、不能复用代码；
- openEHR 阵营 **EHRbase（Apache-2.0）** 是最成熟的开源 openEHR 临床数据仓库，可作为双轨标准中 openEHR 一侧的参照实现；
- 集成引擎 **IPF（Apache-2.0，基于 Apache Camel）** 适合作为 HL7 v2/CDA/FHIR 集成管道的范式参照；
- 云原生底座建议：**Istio（或 Linkerd）服务网格 + Kafka 事件流 + OpenTelemetry/Prometheus/Grafana 可观测性 +「共享库 + tenant_id 行级隔离、院区用 scope 子层级」的多租户模型**。

---

## 2. 成熟 HIS/EMR 系统

### 2.1 OpenMRS

| 维度 | 内容 |
|---|---|
| 项目定位 | 全球部署最广的开源医疗记录平台之一，起源于 2004 年（Partners In Health 与 Regenstrief Institute 合作），面向公共卫生项目、NGO 与多院区基层医疗；自我定位为「平台（platform）」而非开箱即用的完整 HIS。 |
| 架构形态 | 模块化单体（core + 可插拔 OMOD 模块）；核心为 Web 应用，配套 REST Web Services 模块；新一代前端 OpenMRS 3（O3）为无状态 SPA，状态全部落在后端。 |
| 技术栈 | Java 11+、Spring Framework、Hibernate ORM、Maven；数据库 MySQL 8+ 或 PostgreSQL；Liquibase 管理数据库变更；OMOD 为可部署插件；O3 前端基于 React（微前端 ESM + Import Map）。 |
| 许可证 | **MPL（Mozilla Public License）2.0**，文件级弱 copyleft；2013 年由 OpenMRS Public License 迁移至 MPL 2.0。 |
| 可借鉴资产 | ①「概念字典（Concept Dictionary）」领域模型——一切观察、诊断、项目皆抽象为 Concept，极强的术语中立性；②患者-就诊-观察（Patient–Encounter–Obs）核心模型；③模块化加载机制与模块生态；④O3 微前端装配与扩展点机制。 |
| 局限/不适用 | ①面向基层与公共卫生，**缺少中国大型三甲所需的住院医嘱闭环、收费、药事、医保 DRG/DIP 等模块**；②单体 + 同步调用，不直接满足一院多区高并发；③UI/工作流需大量本地化；④MPL 对修改的**原有 MPL 文件**有开源要求，需文件级合规管理。 |
| 来源 | 许可证迁移公告：https://openmrs.org/openmrs-licensing-moves-to-mplv2/ ；技术栈（Java/Spring/Hibernate/MySQL-PostgreSQL/OMOD/O3）：https://answers.openmrs.org/t/small-project-idea-to-make-openmrs-easier-for-ai-tools/47484 ；O3 文档：https://o3-docs.openmrs.org/en-US/docs/introduction ；核心仓库与下载：https://openmrs.org/download/ |

### 2.2 Bahmni

| 维度 | 内容 |
|---|---|
| 项目定位 | Thoughtworks 发起（2012 年）的开源 EMR + HIS（HMIS），面向低资源地区的区县医院；通过「编织（tapestry）」既有开源产品形成一体化方案；官网披露已在 50+ 国家、500+ 站点落地，约 2000 万+ 患者记录；被列为数字公共产品（DPG）。 |
| 架构形态 | **发行版/集成式架构**：把多个独立开源产品组合、增强并统一交付，含注册、临床、检验、影像、计费全链路；提供 Bahmni Lite（面向诊所/小医院）轻量发行版。 |
| 技术栈 | 组件化：OpenMRS（EMR/患者管理，Java）、OpenELIS（实验室 LIS，Java）、OpenERP/Odoo（库存/计费/财务，Python）、dcm4chee（DICOM/PACS，Java）、JasperReports（报表）；历史前端为 AngularJS，部署走 Docker/RPM；与 Snowstorm 术语服务器集成以支持 SNOMED CT。 |
| 许可证 | **多许可证组合（以官方 license 表为准）**：Bahmni Core **AGPL-3.0**；OpenMRS **MPL-2.0**；OpenELIS **AGPL-3.0**；Odoo Community 自 v9 起 **LGPL-3.0**（更早版本为 AGPL-3.0）；JasperReports Community **LGPL**；dcm4chee 为 MPL/GPL/LGPL 组合。 |
| 可借鉴资产 | ①「用最佳开源组件拼装一体化 HIS」的发行版方法论与集成边界划分；②临床-检验-影像-计费的端到端流程编排；③院内本地部署、不依赖互联网的部署形态；④与 Snowstorm（SNOMED CT）集成的术语方案。 |
| 局限/不适用 | ①**AGPL-3.0 强网络 copyleft**：以 SaaS/云方式提供服务须开源修改，对商业闭源不友好；②组件众多、运维与升级复杂；③面向低资源地区，不符中国三甲的住院/医保/电子病历分级评审要求；④AngularJS 历史前端技术栈陈旧。 |
| 来源 | 官方许可证表：https://www.bahmni.org/license ；组件与定位：https://www.bahmni.org/intro2 ；许可证 FAQ（云托管需开源）：https://www.bahmni.org/license-faq ；项目主页/仓库索引：https://bahmni.github.io/ |

### 2.3 OpenEMR

| 维度 | 内容 |
|---|---|
| 项目定位 | 自由开源的电子健康记录 + 诊所管理（practice management）应用，含 EHR、排班、电子计费、国际化与社区支持；OpenEMR 8.0.0 通过 ONC 认证；在北美基层诊所装机量大。 |
| 架构形态 | 经典 LAMP 风格 Web 单体；可跨 Windows/Linux/macOS 运行；社区亦提供 Kubernetes 部署方案。 |
| 技术栈 | PHP（8.2–8.5，推荐 8.4）；MariaDB/MySQL（MariaDB 10.6–11.8）；Web 服务器 Apache 或 nginx + PHP-FPM；ADOdb 数据库抽象；社区 K8s 方案使用 Redis 存会话。 |
| 许可证 | **GNU GPL（通用公共许可证）**；官方明确「Released under the GNU General Public License」。具体 GPL 版本号本次未逐字核到官方 LICENSE 原文（**标注：GPL 版本未核实**，不写死 v2/v3）。 |
| 可借鉴资产 | ①成熟的诊所业务闭环：排班、就诊、处方、计费、电子账单（HIPAA ASC X12 5010）、实验室对接；②临床决策规则引擎与 CMS 报表；③ONC 认证所要求的 C-CDA/CQM 实现；④多语言与国际化框架。 |
| 局限/不适用 | ①**GPL 强 copyleft，衍生作品须同样开源**，不能直接拷贝代码进 jlmedaios 闭源部分；②PHP 单体、技术栈与 jlmedaios（TypeScript/云原生）不一致；③面向北美门诊与计费，缺中国三甲住院/医保/评审能力。 |
| 来源 | 功能与 GPL：https://www.open-emr.org/wiki/index.php/OpenEMR_Features ；版本技术栈（PHP/MariaDB）：https://www.open-emr.org/wiki/index.php/Release_Features ；系统架构：https://www.open-emr.org/wiki/index.php/OpenEMR_System_Architecture ；Wiki 首页：https://www.open-emr.org/wiki/index.php/OpenEMR_Wiki_Home_Page |

### 2.4 HospitalRun

| 维度 | 内容 |
|---|---|
| 项目定位 | 面向发展中国家医院的开源 HIS，最大特点是**离线优先（offline-first）**：无网络可工作、网络恢复后同步；适合偏远诊所与灾害救援场景。 |
| 架构形态 | v2 为 **monorepo**，整合原 frontend/server/components 多仓库；离线优先、本地数据同步。 |
| 技术栈 | v2：**React（前端）+ Node.js（服务端）+ PouchDB/CouchDB（存储与同步）**；v1 历史前端为 Ember.js + PouchDB、后端 Node + CouchDB。 |
| 许可证 | **MIT**（v2 monorepo 官方声明「Released under the MIT license」，FAQ 亦明确 MIT）。注意：npm 上个别第三方/旧包（如 `@ehealth-ci/hospitalrun`）标注 GPL-3.0，那是第三方包而非官方 v2，引用时需区分。 |
| 可借鉴资产 | ①**离线优先架构与 PouchDB/CouchDB 同步机制**（多端冲突解决、断线续传）；②面向低资源、弱网环境的产品设计；③MIT 许可证，代码可自由复用。 |
| 局限/不适用 | ①项目经历 Ember→React 大重写，**部分旧功能在 v2 尚未补齐，开发节奏有波动**，投产前须逐功能核对；②面向小型诊所，不具备三甲住院/医保/高并发能力；③CouchDB 文档库与 jlmedaios 的关系型 + 湖仓路线不一致。 |
| 来源 | 官网：https://hospitalrun.io/ ；v2 monorepo（React/Node/PouchDB-CouchDB，MIT，可核验镜像）：https://gitee.com/mirrors_HospitalRun/hospitalrun ；FAQ（MIT、离线可用）：https://hospitalrun.io/faq ；技术选型历史（Ember/PouchDB、Node/CouchDB）：https://hospitalrun.io/blog/why-hospitalrun/ |

### 2.5 GNU Health

| 维度 | 内容 |
|---|---|
| 项目定位 | GNU Solidario（非营利 NGO）发起的自由软件项目，2011 年成为 GNU 官方软件包；提供 HMIS（医院管理）、EMR（电子病历）、HIS（卫生信息系统）与公共卫生/社会医学能力，含实验室管理（Occhiolino）、个人健康记录（MyGNUHealth）、生物信息与医学遗传、Thalamus 联邦健康网络。 |
| 架构形态 | 基于 **Tryton** 应用平台（ERP 式三层：客户端–trytond 服务端–数据库），模块化业务包；可嵌入式部署（含单板机）。 |
| 技术栈 | **Python + Tryton（trytond）框架 + PostgreSQL**；客户端含 GTK 原生客户端与 SAO Web 客户端；Thalamus 用于联邦网络；MyGNUHealth 为 PHR。 |
| 许可证 | **GPL-3.0-or-later**（官方 FAQ 与 PyPI 均明确 GPL v3 或更高版本）。 |
| 可借鉴资产 | ①极广的领域覆盖：社会医学、人口统计、住院、检验、公共卫生、遗传学；②Tryton 模块化业务建模与权限/工作流机制；③Thalamus 联邦健康网络与院内/院际互联思路；④在低成本/嵌入式硬件运行的经验。 |
| 局限/不适用 | ①**GPL-3.0 强 copyleft，衍生须开源**，不可直接取代码入闭源部分；②Tryton 生态在国内医疗行业普及度低、人才少；③面向公共卫生与基层，缺中国三甲收费/医保 DRG-DIP/评审能力；④非云原生、不直接支持高并发多实例水平扩展。 |
| 来源 | FAQ（GPL v3+、定位）：https://docs.gnuhealth.org/his/appendix/faq.html ；PyPI（GPL v3+）：https://pypi.org/project/gnuhealth/ ；组件与生态：https://gnuhealth.org/about-us.html ；功能域：https://docs.gnuhealth.org/his/features.html |

### 2.6 Open Hospital

| 维度 | 内容 |
|---|---|
| 项目定位 | 由 Informatici Senza Frontiere（无国界信息工程师，ISF）开发的自由开源 EHR/HIS，面向发展中国家医院与卫生中心；支持内外部就诊、住院、药品与物资仓库、检验结果、疫苗与出生记录，可在无互联网环境运行。 |
| 架构形态 | **Java 桌面应用**：支持 PORTABLE（单机便携）与 CLIENT（客户端/服务器网络，多用户连同一数据库）两种模式；较新版本开始提供 REST API 基础（认证、患者查询、住院管理，官方资料标注为 work-in-progress）。 |
| 技术栈 | Java（**Java Swing 桌面 UI**）；数据库 MariaDB/MySQL；自带 JRE；可离线运行。 |
| 许可证 | **GPL-3.0**（官网与 SourceForge 均明确 GPLv3）。 |
| 可借鉴资产 | ①「便携模式 + 客户端/服务器」双形态部署，适合快速落地与离线场景；②药品/物资仓库与疫苗、出生记录等基层实用模块；③业务流程与表单设计可作思想参考（代码不可直接拷入闭源）。 |
| 局限/不适用 | ①**桌面 Swing 架构，非 Web、非云原生**，无法支撑多院区高并发；②GPL-3.0 强 copyleft；③REST API 尚在建设，集成能力弱；④面向发展中国家基层，不符三甲场景。 |
| 来源 | 官网（GPLv3、定位）：https://www.open-hospital.org/ ；管理员手册 PDF（Java、PORTABLE/CLIENT 模式）：https://www.open-hospital.org/wp-content/uploads/2023/02/AdminManual.pdf ；SourceForge（Java Swing/MySQL/GPLv3）：https://sourceforge.net/projects/openhospital/ |

---

## 3. 云原生 / FHIR / openEHR 平台

### 3.1 Medplum

| 维度 | 内容 |
|---|---|
| 项目定位 | 开源医疗**开发者平台 /「无头 EHR（headless EHR）」**：以 FHIR 为核心，提供数据存储、API、认证与开发者工具，用于自建 EHR、患者门户与各类临床应用；提供 AWS 托管服务与 Apache-2.0 自托管软件；已取得 HITRUST e1 等合规认证。 |
| 架构形态 | 云原生、**FHIR-native**：FHIR R4 既是对外标准、也是内部数据模型；含数据存储、TypeScript SDK、React 临床组件库、Bots（自动化）、Subscriptions、托管术语服务；另提供 **Medplum Agent**（部署在防火墙内，经安全 HTTPS/WebSocket 桥接 HL7/MLLP、ASTM、DICOM 等低层协议）。 |
| 技术栈 | **TypeScript/Node.js 服务端 + PostgreSQL + Redis**；React 组件库；Vite 构建前端；自托管文档示例为 PostgreSQL 16、Redis、Node.js（服务端健康检查端口 8103）。 |
| 许可证 | **Apache License 2.0**（「most of the Medplum platform is released as open source software under the Apache 2.0 license」）；企业托管版为商业服务。 |
| 可借鉴资产 | ①**FHIR R4 全资源/搜索参数/REST/GraphQL/批量 Bundle/Subscriptions 的工程实现**；②TypeScript 类型化 SDK 与 React 临床组件；③Bots 事件驱动自动化（与 jlmedaios 的 Agent/tool 体系高度同构）；④Medplum Agent 用安全通道桥接院内 HL7/DICOM 的「院内 Agent + 云端」模式；⑤事件驱动集成服务。 |
| 局限/不适用 | ①以美国生态（HIPAA/ONC/OAuth2 SMART）为中心，**中国医保、电子病历分级评审、等保需自行补齐**；②FHIR R4 与国内 HL7 v2/院内既有系统对接仍需适配层；③部分高级能力在托管版，自托管需自行运维 Postgres/Redis/集群。 |
| 来源 | 开源声明（Apache-2.0）：https://www.medplum.com/open-source ；产品矩阵：https://www.medplum.com/products ；文档（无头 EHR）：https://www.medplum.com/docs ；自托管从零安装（Postgres16/Redis/Node/Vite）：https://www.medplum.com/docs/self-hosting/install-from-scratch ；Agent（HL7/MLLP/ASTM/DICOM）：https://www.medplum.com/docs/agent ；事件驱动集成：https://www.medplum.com/products/integration |

### 3.2 Aidbox

| 维度 | 内容 |
|---|---|
| 项目定位 | Health Samurai 出品的 **FHIR 服务器 + 数据库**，面向高负载医疗产品与集成；元数据（zen）驱动，多租户（Multibox），提供 REST/GraphQL/SQL API、Bulk Data、Subscriptions、OAuth2。 |
| 架构形态 | 云原生、FHIR-first（支持 R4/R5）；**整资源以 PostgreSQL 单行 JSONB 存储**，配合关系能力与索引；一切（端点、资源定义、Profile、访问策略）皆为可配置「资源」。 |
| 技术栈 | **JVM（Clojure）+ PostgreSQL（JSONB）**；Docker 容器交付；TypeScript/C#/Python SDK。 |
| 许可证 | **闭源/商业许可证（不是 OSI 开源）**：官方对比资料明确标注 Aidbox 为 **Closed Source**。许可类型：**Production license（付费，14 天试用后需联系厂商，可处理 PHI）** 与 **Development license（免费，但仅限开发/测试/演示、禁止加载 PHI、数据库 ≤5GB，超限将告警直至关停）**；另有 SaaS、教育许可；运行期需向 aidbox.app 校验 JWT 许可令牌（断网有宽限期）。 |
| 可借鉴资产 | ①**PostgreSQL + JSONB 存 FHIR 资源**的存储与索引设计；②元数据/zen 驱动、一切皆资源的平台化思路；③多租户 Multibox 与细粒度访问策略；④FHIR R4/R5 双版本与 Bulk Data/Subscriptions 的产品形态（**只对标设计，不可复用其闭源代码**）。 |
| 局限/不适用 | ①**闭源 + 商业许可、开发许可禁 PHI/限 5GB**，不能作为 jlmedaios 的开源底座，也不能拷贝代码；②Clojure 技术栈与团队 TypeScript 路线不匹配；③许可需联网校验，对内网/离线部署不友好。 |
| 来源 | 许可类型与支持：https://docs.aidbox.app/overview/licensing-and-support ；PostgreSQL+JSONB 数据库：https://www.health-samurai.io/docs/aidbox/database/overview ；闭源/JVM(Clojure) 对比：https://www.health-samurai.io/articles/de-de/performance-at-scale-baseline ；许可校验 FAQ：https://docs.aidbox.app/overview/faq |

### 3.3 HAPI FHIR

| 维度 | 内容 |
|---|---|
| 项目定位 | Smile Digital Health 出品、开源社区维护的 **Java 全量 FHIR 实现**（自称 20+ 年全球公共产品），是最流行、最完整的开源 Java FHIR 实现；商业版为 Smile CDR。 |
| 架构形态 | 两种服务器形态：**Plain Server**（自带存储、用框架对接自有数据）与 **JPA Server**（自带数据库模式与完整存取逻辑的开箱 FHIR 服务器）；含 MDM 模块、术语、订阅、批量数据等。 |
| 技术栈 | **Java；JPA Server 基于 Hibernate**；数据库支持 PostgreSQL 等多种关系库；模块化 Maven 构件（hapi-fhir-server、hapi-fhir-jpaserver-base 等）。 |
| 许可证 | **Apache License 2.0**（官网：business-friendly Apache Software License 2.0）。 |
| 可借鉴资产 | ①**最完整的 FHIR 规范实现**（资源、搜索、事务、术语、订阅、MDM、批量数据）可作为 FHIR 行为的「参考标准答案」；②JPA + Hibernate 的资源存储/索引架构；③拦截器（Interceptor）扩展机制；④MDM 主数据匹配/归并实现，可对标 jlmedaios 主数据治理。 |
| 局限/不适用 | ①Java 技术栈，与 jlmedaios 的 TypeScript BFF/前端不同语言（可独立部署为 FHIR 服务或仅作行为参照）；②JPA Server 自带模式与国内业务表结构不一致，落地需映射；③中国医保/评审/等保需另建。 |
| 来源 | 官网（Apache-2.0、定位）：https://hapifhir.io/ ；JPA 架构（Hibernate/DAO/数据库）：https://hapifhir.io/hapi-fhir/docs/server_jpa/architecture.html ；模块说明：https://hapifhir.io/hapi-fhir/docs/getting_started/modules.html ；公共服务器：https://hapi.fhir.org/about |

### 3.4 EHRbase（openEHR）

| 维度 | 内容 |
|---|---|
| 项目定位 | 开源的 **openEHR 临床数据仓库（CDR）后端**，面向临床应用系统与电子健康记录；通过官方 openEHR REST API 提供 EHR、Composition、Contribution、模板管理与 AQL 查询；被业界对比资料称为最成熟的全开源 openEHR CDR。 |
| 架构形态 | Spring Boot 应用；openEHR 模板/原型（archetype）驱动，数据按 openEHR 参考模型（RM）组织，支持 AQL 查询；可 Docker/K8s/裸机部署。 |
| 技术栈 | **Java、Spring Boot、jOOQ、PostgreSQL**（层级 RM 数据结合 JSONB 索引）；官方平台页列 Java 11、Postgres 11；构建于 **Archie**（Apache-2.0 的 openEHR ADL/RM Java 库）之上；近期对比资料称支持 PostgreSQL 16、openEHR RM 1.1.0。 |
| 许可证 | **Apache License 2.0**；其依赖的 Archie 同为 Apache-2.0。 |
| 可借鉴资产 | ①**openEHR 原型/模板驱动、「数据一次建模、终身可用」**的建模方法与 AQL 查询；②openEHR REST API 的开源实现，可作为双轨标准中 openEHR 一侧参照；③模板/原型治理与版本管理；④与 FHIR 互补的「纵向、可演进临床数据仓库」范式。 |
| 局限/不适用 | ①openEHR 学习曲线陡、原型治理重，**不适合直接承载高频事务型 HIS 界面**（更适合作为临床数据仓库/CDR）；②Java 技术栈与 jlmedaios 主线不同；③国内 openEHR 人才与落地案例相对少；④具体最新版本号/维护方商业实体关系本次未完全核实（见存疑清单）。 |
| 来源 | openEHR 官方平台页（Java11/Postgres11/Spring Boot/jOOQ）：https://openehr.org/platform/ ；CDR 厂商对比（Apache-2.0、PostgreSQL16、RM1.1.0）：https://nirmitee.io/blog/openehr-cdr-vendor-comparison-2026/ ；自托管对比指南：https://www.pistack.xyz/posts/2026-06-04-self-hosted-medical-emr-ehr-openemr-openmrs-ehrbase-guide/ ；Archie 库（Apache-2.0）：https://openehr.org/libraries/ |

### 3.5 LinuxForHealth / IPF

| 维度 | 内容 |
|---|---|
| 项目定位 | **IPF（Open eHealth Integration Platform，开放电子健康集成平台）** 是 Apache Camel 路由/中介引擎的医疗扩展，提供医疗消息处理与系统互联的 DSL；起源于 Open eHealth Foundation（oehf），后纳入 IBM 主导的 **LinuxForHealth** 开源生态。LinuxForHealth 自我定位为「开源、分布式处理网络/操作系统」，连接本地、云与边缘设备到医疗事务系统；其下还包含由 IBM/Alvearie 开发的 **LinuxForHealth FHIR Server**（Java，JAX-RS/JDBC，基于 Open Liberty，支持 FHIR R4/4.3.0）。 |
| 架构形态 | IPF：基于 **Apache Camel** 的集成管道，用 Java/Groovy DSL 实现企业集成模式（EIP），支持 HL7 v2 DSL、CDA、FHIR；HL7 v2 能力底层复用 HAPI（HAPI HL7 库）。LinuxForHealth FHIR Server：模块化高性能 Java FHIR 服务器。 |
| 技术栈 | **Java + Groovy + Apache Camel（IPF）**；LinuxForHealth FHIR Server 为 Java/JAX-RS/JDBC/Open Liberty。 |
| 许可证 | **Apache License 2.0（IPF）**；Apache Camel 本身亦为 Apache-2.0；LinuxForHealth FHIR Server 为 Apache-2.0（IBM 开源）。 |
| 可借鉴资产 | ①**HL7 v2 消息处理/校验/ACK、CDA、FHIR 互转的集成管道范式**（对标 jlmedaios 的 HIS/EMR/LIS/PACS 对接层）；②Camel 350+ 连接器与 EIP 模式库；③IBM FHIR Server 的高性能模块化设计可作 FHIR 服务另一参照；④「院内低层协议 → 安全通道 → 平台」的集成拓扑。 |
| 局限/不适用 | ①Java/Groovy 技术栈与 jlmedaios 主线 TypeScript 不同（可独立部署为集成引擎，或仅借鉴拓扑）；②LinuxForHealth 整体生态在 IBM 战略调整后的活跃度需持续观察（**部分子项目当前维护状态未逐一核实**）；③通用 Camel 需较多工程投入才能达到医疗专用引擎（如 Mirth Connect）的开箱度。 |
| 来源 | IPF 概览（Apache-2.0、Camel、Java/Groovy）：https://project-awesome.org/r/oehf-ipf ；IPF 文档（HL7 v2 复用 HAPI）：https://oehf.github.io/ipf-docs/docs/hl7-groovy/ ；LinuxForHealth FHIR Server（Java/JAX-RS/JDBC）：https://faraproject.com/topics/fhir ；IBM 对 LinuxForHealth 定位：https://www.ibm.com/blog/author/tori-mccaffrey ；FHIR Server 学术资料（Alvearie、FHIR 4.3.0）：https://ceur-ws.org/Vol-4196/paper_14.pdf |

---

## 4. 云原生工程范式

### 4.1 服务网格（Service Mesh）

主流落地选型为 **Istio** 与 **Linkerd**（另有基于 eBPF 的 Cilium 作为无 Sidecar 选项）：

| 维度 | Istio | Linkerd |
|---|---|---|
| 数据面 | Envoy（C++）Sidecar；提供 **Ambient 无 Sidecar 模式**（节点级 Rust ztunnel 处理 mTLS/L4，按需部署 waypoint 处理 L7，HBONE 隧道） | 自研 Rust linkerd2-proxy 微代理（每 Pod） |
| 流量管理 | 强：金丝雀、故障注入、流量镜像、重试、熔断、VirtualService/DestinationRule | 基础：重试、超时、流量拆分 |
| mTLS | 自动（滚动期默认 PERMISSIVE，全网格后可切 STRICT） | 自动、零配置 |
| 可观测性 | Envoy 丰富指标，集成 Prometheus/Grafana/Jaeger/Kiali | 内置黄金指标与 `linkerd viz` 仪表盘 |
| 复杂度/开销 | 较高、功能最全 | 低、轻量、观点化（opinionated）、上手快 |

**医疗场景适配建议：**

- 门诊高峰、一院多区需要**细粒度 L7 路由、熔断、重试、金丝雀与多集群联邦**时选 **Istio**；团队若希望低运维成本、仅需自动 mTLS + 黄金指标，可选 **Linkerd**；
- **mTLS 滚动必须先 PERMISSIVE 后 STRICT**，避免未接入 Sidecar 的院内旧系统（HIS/LIS/PACS 网关）被直接切断；
- 服务网格负责**服务间加密与策略**，但**不能替代医疗业务级权限（RBAC+ABAC）与电子签名/责任认定**；
- 对 HIS/EMR/LIS/PACS 等通过院内部署 Agent 接入的流量，建议在网关处统一纳入网格或显式列入策略白名单。

来源：Istio vs Linkerd（特性/mTLS 滚动）：https://kubernetes.ae/istio-vs-linkerd/ ；2026 服务网格务实分析（Istio/Ambient）：https://pdpspectra.com/blog/microservices-mesh-istio-2026/ ；Ambient vs Linkerd（ztunnel/waypoint/HBONE）：https://www.buoyant.io/articles/linkerd-vs-istio-ambient-mode-an-operators-architecture-comparison-for-2026 ；网格对比（含 Cilium/eBPF）：https://calmops.com/devops/service-mesh-comparison-istio-linkerd-cilium/

### 4.2 Kafka 事件流

- **核心能力**：分布式、持久化、分区有序的事件日志；生产者/消费者解耦；副本高可用；支持**幂等生产者（`enable.idempotence=true`）与事务 API，提供集群内恰好一次（exactly-once）语义**；可回放（replay）；跨系统边界仍需应用级幂等。
- **医疗落地**：作为**统一临床事件骨干**，承载 ADT/挂号、医嘱状态、检验结果、检查报告、危急值、计费等事件；用 Kafka Streams/Flink 做实时处理（如危急值实时告警管道）；事件按业务键（如 encounterId/patientId）分区以保序与并行。
- **对 jlmedaios 的关键意义**：现有 `src/core/events/AgentEventBus.ts` 与 `src/bff/alertBus.ts` 均为**进程内内存总线**，多实例水平扩展时无法跨进程投递；Kafka（或其托管/轻量替代，如 Redpanda）是替换内存总线、支撑一院多区多实例的明确方向（替换路径见《Strangler 渐进重构路线图》）。
- 医疗注意事项：事件含 PHI，需**传输加密、访问控制、按租户/院区隔离主题或分区、留存与审计**；危急值等强责任事件须有「投递确认 + 人工确认签收」闭环，不能只靠 at-most-once 推送。

来源：Kafka 官方介绍（解耦、exactly-once、持久化）：https://kafka.apache.org/intro/ ；Kafka + FHIR 医疗实时管道（ADT/检验/危急值、Kafka Streams）：https://nirmitee.io/blog/streaming-healthcare-data-kafka-fhir-real-time-adt-labs-alerts/ ；EOS/幂等/事务：https://savitojs.github.io/k8s-learn-by-doing/labs/real-world/event-driven-kafka-deep-dive/

### 4.3 可观测性（Observability）

- **事实标准**：**OpenTelemetry（OTel）统一采集 Traces/Metrics/Logs（OTLP）+ Prometheus 指标与告警 + Grafana 可视化**；日志常用 Loki/Fluent Bit，追踪常用 Tempo/Jaeger；大规模 Prometheus 用 Thanos/Mimir/VictoriaMetrics 做长期留存、高可用与跨集群查询。
- **K8s 落地**：推荐用 **OpenTelemetry Operator** 与自动注入（auto-instrumentation），Collector 做集中网关；分层观测控制面、数据面、应用面。
- **医疗/AI 适配**：除 RED/黄金指标（延迟、流量、错误、饱和度）外，需补充：①**LLM/Agent 专项可观测**——首 token 延迟、token 用量与成本、工具调用成功率、RAG 命中、Agent 步骤轨迹；②**业务闭环指标**——医嘱执行闭环率、处方审核时长、危急值签收时长、挂号到就诊时延；③审计与追踪关联，便于责任追溯。
- 原则：**告警先于用户发现**；SLO 驱动；日志中禁止落明文 PHI 与密钥（脱敏后入日志）。

来源：OTel K8s 托管蓝图（Operator/Instrumentation）：https://opentelemetry.io/docs/guidance/blueprints/managed-telemetry-platforms-for-k8s-workloads/ ；CNCF 可观测性（指标到价值）：https://www.cncf.io/blog/2026/08/31/observability-in-kubernetes-from-metrics-to-meaning/ ；Grafana AI/Agent 零代码可观测：https://grafana.com/blog/ai-observability-zero-code/

### 4.4 多租户（Multi-tenancy）

主流三种隔离模型：

| 模型 | 形态 | 隔离强度 | 成本/运维 | 适用 |
|---|---|---|---|---|
| 数据库/实例 per 租户 | 每租户独立库/独立部署（K8s 常用独立 Namespace） | 最高 | 高 | 强合规/超大客户 |
| 共享库、Schema per 租户（Bridge） | 同库不同 schema（PG 用 `SET search_path`） | 中 | 中 | 几十~几百租户 |
| 共享库共享表、`tenant_id` 行级隔离 | 同库同表，租户鉴别列 + 应用/RLS 过滤 | 低（逻辑隔离） | 最低 | 海量中小租户 |

**医疗场景适配建议（一院多区）：**

- 医疗数据强隔离与合规要求高，建议**混合模型**：默认「**共享库 + `tenant_id` 行级隔离 + PostgreSQL RLS 强制 + 应用层 DataScopeGuard 双保险**」，对强隔离要求的医院集团提供「独立 schema 或独立库/独立 Namespace」升级路径；
- **「租户（医院/集团）→ 院区（campus）→ 科室」三级层次**：院区作为租户内的 scope 子层级（campus_id），而非独立租户，兼顾一院多区统一视图与数据归属；
- K8s 上可按租户分层：基础层共享应用、标准层每租户独立 Namespace 实现网络/资源隔离；
- 连接池、备份恢复、跨租户统计（须显式授权）需在数据访问层统一处理，杜绝跨租户泄漏。

来源：多租户三种模型：https://calmops.com/software-engineering/multi-tenant-saas-architecture/ ；K8s 多租户（schema/行级、分层 Namespace）：https://blog.4geeks.io/how-to-architect-multi-tenant-saas-application-on-kubernetes/ ；Azure AKS 多租户（基础/标准分层、存储隔离）：https://learn.microsoft.com/zh-cn/azure/architecture/guide/multitenant/service/aks

---

## 5. 逐项对比总表

### 5.1 成熟 HIS/EMR

| 项目 | 定位 | 架构形态 | 技术栈 | 许可证 | 对商业闭源友好度 |
|---|---|---|---|---|---|
| OpenMRS | 医疗记录平台 | 模块化单体 + OMOD；O3 SPA | Java/Spring/Hibernate，MySQL/PG，Liquibase，React(O3) | **MPL-2.0** | 中（文件级 copyleft，改原有文件须开源） |
| Bahmni | 一体化 EMR+HIS 发行版 | 多组件集成 | OpenMRS/OpenELIS/Odoo/dcm4chee/Jasper | **AGPL-3.0（Core）+ 多许可证** | 低（AGPL 网络 copyleft） |
| OpenEMR | EHR + 诊所管理 | Web 单体 | PHP 8.2–8.5，MariaDB/MySQL | **GPL（版本未核实）** | 低（GPL copyleft） |
| HospitalRun | 离线优先 HIS | monorepo，离线同步 | React/Node/PouchDB-CouchDB | **MIT** | 高 |
| GNU Health | HMIS/EMR/HIS + 公共卫生 | Tryton 三层 | Python/Tryton/PostgreSQL | **GPL-3.0-or-later** | 低（GPL copyleft） |
| Open Hospital | 基层 EHR/HIS | Java 桌面（便携/C-S） | Java Swing，MariaDB/MySQL | **GPL-3.0** | 低（GPL copyleft） |

### 5.2 云原生 / FHIR / openEHR

| 项目 | 定位 | 架构形态 | 技术栈 | 许可证 | 可复用度 |
|---|---|---|---|---|---|
| Medplum | 无头 EHR/开发者平台 | FHIR-native 云原生，Agent 桥接 | TypeScript/Node，PostgreSQL，Redis，React | **Apache-2.0** | 高（同语言、同范式） |
| Aidbox | FHIR 服务器+库 | 元数据驱动、多租户 | JVM(Clojure)，PostgreSQL JSONB | **闭源/商业（开发许可免费、禁 PHI、≤5GB）** | 仅设计参考 |
| HAPI FHIR | 全量 Java FHIR 实现 | Plain/JPA Server | Java，Hibernate，多库（PG） | **Apache-2.0** | 高（FHIR 行为标准） |
| EHRbase | openEHR CDR | 原型/模板驱动 | Java/Spring Boot/jOOQ，PostgreSQL | **Apache-2.0** | 中高（openEHR 参照） |
| LinuxForHealth/IPF | 集成平台/FHIR 服务器 | Camel 管道 | Java/Groovy，Apache Camel | **Apache-2.0** | 中高（集成管道参照） |

### 5.3 云原生工程范式选型

| 范式 | 主流选型 | 对 jlmedaios 的建议 |
|---|---|---|
| 服务网格 | Istio / Linkerd / Cilium | 需 L7/多集群选 Istio；求简选 Linkerd；mTLS 先 PERMISSIVE 后 STRICT |
| 事件流 | Apache Kafka（+ Streams/Flink，可兼容 Redpanda） | 替换进程内内存总线，按租户/院区隔离，危急值须签收闭环 |
| 可观测性 | OpenTelemetry + Prometheus + Grafana（Loki/Tempo） | OTel Operator 自动注入；补 LLM/Agent 与业务闭环指标 |
| 多租户 | 行级隔离 / Schema per 租户 / 库 per 租户 | 默认行级 + RLS + DataScopeGuard，院区作 scope；强隔离可升级独立 schema/库 |

---

## 6. 许可证兼容性与传染性专题

> 以下为面向工程与合规的一般性分析，不构成法律意见；正式开源前由法务终审。

- **MIT / Apache-2.0（宽松许可）**：可商用、可闭源、可修改；Apache-2.0 含专利授权与 NOTICE 要求。**与 jlmedaios 开源（Apache-2.0 路线）完全兼容**。代表：HospitalRun（MIT）、Medplum/HAPI FHIR/EHRbase/IPF（Apache-2.0）。
- **MPL-2.0（文件级弱 copyleft）**：copyleft 仅作用于**被修改的原有 MPL 许可文件**，新增文件与不修改的集成可保持自有许可；与 Apache-2.0 兼容、可同库共存，但须**文件级标识与合规管理**。代表：OpenMRS。
- **GPL-3.0 / GPL（强 copyleft）**：分发的**衍生整体须以 GPL 开源**；不能把 GPL 代码拷入 jlmedaios 闭源部分。代表：GNU Health、Open Hospital、OpenEMR。
- **AGPL-3.0（强网络 copyleft）**：在 GPL 基础上，**通过网络向用户提供服务（SaaS/云）即触发开源义务**；对云化商业产品约束最强。代表：Bahmni Core、OpenELIS。
- **CC BY-NC-SA 4.0（非商业、相同方式共享）**：jlmedaios 的 DAMO-RADAR 影像**权重**即此许可——**禁止商业使用、衍生须同样许可**，故 RADAR 只能定位为非商业第二阅片辅助，权重不入库、由部署方自行下载，且不得与商业闭环混用。
- **闭源商业**：Aidbox 不能作为开源底座、不能复用代码，仅可对标设计。

**对我方开源的总体兼容性结论：**

1. jlmedaios 自身代码以 **Apache-2.0** 开源最稳妥——可自由吸收 MIT/Apache 生态（Medplum、HAPI、EHRbase、IPF、HospitalRun 的资产）；
2. **严禁**直接拷入 GPL/AGPL 项目（GNU Health、Open Hospital、OpenEMR、Bahmni Core、OpenELIS）的代码；可借鉴其**领域思想与流程**（思想不受版权保护，但应做洁净室式独立实现并标注来源）；
3. 若复用 OpenMRS（MPL-2.0）代码，须保持对应文件 MPL 并按文件管理修改；
4. RADAR 权重（CC BY-NC-SA）与开源主仓库物理隔离、单独声明，避免污染主许可；
5. 建立 **THIRD_PARTY_LICENSES / NOTICE / DATA_LICENSES** 台账，所有第三方依赖与数据资产来源、许可证可追溯。

---

## 7. 对 jlmedaios 的取舍建议

**直接对标工程范式（同语言/同范式，优先）：**

- **Medplum**：FHIR-native 平台、TypeScript SDK、React 组件、Bots 自动化、Agent 桥接院内 HL7/DICOM——与 jlmedaios 的 BFF + 19 工具 + Agent 编排路线最契合，作为**头号对标**；
- **HAPI FHIR**：作为 FHIR 行为正确性的「标准答案」与 MDM 参照；
- **EHRbase**：作为 openEHR CDR 与 AQL 的参照实现，支撑「FHIR + openEHR 双轨」；
- **IPF/Apache Camel**：作为 HIS/EMR/LIS/PACS 集成管道与 HL7 v2/CDA/FHIR 互转的拓扑参照。

**借鉴领域思想、不拷代码：**

- OpenMRS 的**概念字典**与 Patient–Encounter–Obs 模型（若取代码须守 MPL）；
- GNU Health 的社会医学/检验/联邦广度、Bahmni 的发行版集成边界、OpenEMR 的诊所闭环与计费、Open Hospital 的离线便携部署、HospitalRun 的离线优先同步（MIT 可复用）。

**明确不采用：**

- 不以任何 GPL/AGPL 项目作为 jlmedaios 的代码底座；
- 不以闭源 Aidbox 为底座（仅设计参考）；
- 不让 CC BY-NC-SA 的 RADAR 权重进入商业闭环或主仓库。

**落地次序原则：** 先 FHIR（事务/接口层，对标 Medplum/HAPI），后 openEHR（临床数据仓库/纵向沉淀，对标 EHRbase）；集成层用 Camel/IPF 范式；底座随 K8s 逐步引入网格、Kafka、OTel 与多租户 RLS。每个里程碑保持可运行、可验收、可回滚（详见路线图）。

---

## 8. 未核实与存疑清单

1. **OpenEMR 的 GPL 具体版本号**（GPL-2.0/3.0 或二者皆可）本次未逐字核到官方 LICENSE 原文，标注「版本未核实」；
2. **EHRbase 当前最新版本号、维护方商业实体（vitagroup 等）与企业版关系**未完全核实；官方平台页技术栈为 Java 11/Postgres 11，第三方对比资料称已支持 PostgreSQL 16/RM 1.1.0，二者时间点不同；
3. **LinuxForHealth 各子项目（含 IPF、FHIR Server）在 IBM 战略调整后的当前活跃度与最新版本**未逐一核实；
4. GNU Health、Bahmni、Open Hospital、HospitalRun 的**具体最新发布版本号**未在本轮逐一核到官方 release 页，故正文不写死版本；
5. GitHub 仓库页面因 robots.txt 限制无法自动抓取，仓库事实以官网/官方文档/可核验镜像为准；
6. 各项目许可证的**次级依赖（transitive dependencies）许可证**未做全量 SBOM 级核查，正式商用前需做依赖级许可证扫描；
7. 旧稿曾称「EHRbase 支撑西班牙加泰罗尼亚约 750 万居民」，该说法未能在官方来源核实（加泰罗尼亚 HC3 使用 openEHR，但是否由 EHRbase 承载未核实），本稿不采信、改为存疑。

> 本报告遵循「宁慢勿错、无证不立」原则：凡未核实项均显式标注，不以记忆或印象替代来源。后续联调/法务阶段对存疑项逐项闭环。
