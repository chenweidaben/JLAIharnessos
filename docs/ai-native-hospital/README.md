# AI 原生医院一体化平台 · 文档索引 / AI-Native Hospital Platform · Index

> 杭州健澜科技 · jlmedaios 数智医院工业级智能体操作系统
> Jianlan Technology (Hangzhou) · jlmedaios Industrial-Grade Agent OS for Smart Hospitals

本目录承载 jlmedaios 阶段 1 的开源调研与顶层设计成果，面向医院信息科、全球开发者与贡献者。
This directory holds Phase-1 open-source research and top-level design for hospital IT, developers, and contributors.

## 文档 / Documents

| # | 中文 (Chinese) | English |
|---|---|---|
| 0 | [开源 HIS/EMR 调研报告（中文）](./00-open-source-research.zh-CN.md) | [Open-Source HIS/EMR Research (EN)](./00-open-source-research.en.md) |
| 1 | [面向 AI 原生医院的一体化平台顶层设计（中文）](./01-top-level-design.zh-CN.md) | [Top-Level Design for an AI-Native Integrated Hospital Platform (EN)](./01-top-level-design.en.md) |
| 2 | [Strangler 渐进重构路线图（中文）](./02-strangler-roadmap.zh-CN.md) | [Strangler Incremental Refactoring Roadmap (EN)](./02-strangler-roadmap.en.md) |

## 阅读建议 / How to Read

1. 先读 **00 调研报告**：覆盖 OpenMRS、Bahmni、OpenEMR、HospitalRun、GNU Health、Open Hospital、Medplum、Aidbox、HAPI FHIR、EHRbase、LinuxForHealth/IPF，以及服务网格/Kafka/可观测性/多租户四类云原生范式与许可证边界；
   Start with **00 Research** — OpenMRS, Bahmni, OpenEMR, HospitalRun, GNU Health, Open Hospital, Medplum, Aidbox, HAPI FHIR, EHRbase, LinuxForHealth/IPF, plus service mesh/Kafka/observability/multi-tenancy and license boundaries.
2. 再读 **01 顶层设计**：六层架构、HIS+EMR 一体化微服务、AI 原生中台、双标准、数据平台、安全合规；
   Then **01 Top-Level Design** — six layers, unified HIS+EMR microservices, AI-native middle platform, dual standards, data platform, security.
3. 最后读 **02 路线图**：M0–M6 里程碑、迁移手法、验收门（DoD）与回滚。
   Finally **02 Roadmap** — milestones M0–M6, migration steps, DoD, rollback.

## 核心立场 / Core Stance

- **AI 始终辅助、医师复核签名**；AI 不自主诊疗。
  AI is always assistive; clinicians review and sign; no autonomous diagnosis.
- **真实系统**：数据真落 PostgreSQL、真实 LLM 闭环；连不上明确报错，演示仅在 `DEMO_MODE` 下水印。
  Real system: data truly in PostgreSQL, real LLM loop; failures are explicit; demos are watermarked under `DEMO_MODE`.
- **开放生态**：FHIR/openEHR 双标准、开源 GitHub + GitCode，目标"医疗 AI 的安卓"。
  Open ecosystem: FHIR/openEHR, open on GitHub + GitCode; the "Android of medical AI."

---

Copyright (c) 2026 杭州健澜科技有限公司 / Hangzhou Jianlan Technology Co., Ltd.
