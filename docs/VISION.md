# 健澜AI原生医院操作系统OS

## 产品定位

**健澜AI原生医院操作系统OS**——不是 HIS，是医院的操作系统。

不是又一个挂号收费系统，不是电子病历的翻新，不是医院信息科的工具集。
是医院的"AI 大脑"——每一次挂号、每一张处方、每一次检查、每一笔收费，都成为 AI 的学习样本。医生越用越准，系统越用越聪明。

## 三大核心

| 层 | 技术栈 | 端口 | 模块数 | 职责 |
|---|---|---|---|---|
| **交易引擎** | Java 21 + Spring Boot 3.5 + Modulith | 9090 | 28 模块 | 挂号/收费/医嘱/床位/EMR/质控/医保 |
| **智能引擎** | Python 3.11 + FastAPI + vLLM | 8000 | 13 router | NLP质控/CDSS/影像AI/预后预测/相似病例 |
| **体验层** | React 19 + TypeScript + Bun BFF | 8080 | 1957 路由（保留） | 医生/护士工作站 UI、AI 对话流式 |

## 设计哲学

### 1. append-only 病历 + 哈希链 + CA 签章
- 病历一旦生成不可修改，只能追加 review 记录
- SHA-256 区块链式链接（prevHash → appendHash）
- CA 电子签章，法律效力

### 2. AI 本地推理（vLLM，数据不出院）
- 统一走本地 vLLM `http://vllm:8000/v1`
- 禁止 OpenAI / Claude / Gemini / Cohere 任何境外大模型
- 8 秒超时自动降级 mock，不阻塞业务

### 3. 国密全链路（SM2/SM3/SM4，生产接 HSM）
- 数据加密 SM4（mock base64，生产接 HSM 加密机）
- 哈希 SM3（mock SHA-256，生产用真 SM3）
- 签名 SM2（预留）

### 4. FHIR 互联互通（四甲硬要求）
- FHIR R4 资源接收/查询（Patient/Observation/Condition）
- 当前 mock 存储，生产接 HAPI FHIR Server

## 愿景

**让每一次诊疗都沉淀为系统能力，越用越聪明。**

核心闭环：
```
诊疗发生 → 归档 encounter_record（append-only）
    → AI 学习反馈（采纳/修改/拒绝）
    → 下次就诊建议更准
    → 系统越用越聪明
```

## 技术路线图

| 里程碑 | 主题 | 核心模块 | 状态 |
|---|---|---|---|
| **M1** | 核心交易骨架 | reg/charge/orders/pharmacy/empi/ward/lis/nursing/discharge | ✅ 完成 |
| **M2** | 临床闭环 | surgery/transfusion/antibiotic/emr/critical/followup | ✅ 完成 |
| **M3** | 运营管理 + 互联互通 + 安全合规 | quality/admin/opdashboard/fhir/openapi/audit/security | ✅ **当前** |
| **M4** | AI 学习闭环 + 向量数据库 | ai_learning/ai_similar_cases + Milvus/Qdrant | 🔜 下一阶段 |
| **M5** | 微服务拆分 | Spring Cloud 骨架已有（14 个微服务模块） | 远期 |
| **M6** | 多院区 + 区域医疗协同 | 集团管理 + 区域医疗平台 | 远期 |

## 差异化

**不是传统厂商的 CS 架构补丁，是 AI 原生重写。**

| 维度 | 传统 HIS | 健澜AI原生OS |
|---|---|---|
| 架构 | CS 架构 + 补丁式升级 | 模块化单体起步，远期微服务 |
| AI | 外挂式 CDSS 插件 | AI 原生嵌入每个业务环节 |
| 数据 | 事后统计报表 | 实时沉淀学习闭环 |
| 病历 | 可修改 + 日志 | append-only + 哈希链 + CA 签章 |
| 部署 | 院内机房 + 维护成本 | 容器化 + 一键部署 + 信创适配 |
| 合规 | 等保二级 | 等保三级 + EMR 六级 + 互联互通四甲 |

## 合规红线

1. **病历 append-only**：不可篡改，只能追加 review 记录
2. **PHI 本地脱敏**：所有入参先过 mask_phi，不出院
3. **AI 本地推理**：vLLM 统一入口，禁止境外大模型
4. **国密全链路**：SM2/SM3/SM4，生产接 HSM
5. **达梦信创可替换**：PostgreSQL → 达梦，零代码切换
