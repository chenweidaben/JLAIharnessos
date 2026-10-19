# 健澜AI原生医院操作系统OS — 合规与安全清单

## 等保三级要求对应表

| 等保三级控制项 | 本系统实现 | 状态 |
|---|---|---|
| 安全物理环境 | 机房托管（阿里云/腾讯云三级等保机房） | ✅ |
| 安全通信网络 | TLS 1.3 + SM2 国密隧道 | ✅ |
| 安全区域边界 | WAF + 入侵检测 + 端口白名单 | ✅ |
| 安全计算环境 | 最小权限 RBAC + 审计日志 | ✅ |
| 安全管理中心 | 统一监控 + 集中审计 | ✅ |
| 身份鉴别 | 多因素认证（密码+短信/U盾） | ✅ |
| 访问控制 | 字段级权限 + @Sensitive 脱敏 | ✅ |
| 安全审计 | 全量操作日志 + 保留≥180天 | ✅ |
| 数据完整性 | 病历哈希链 + SHA-256 | ✅ |
| 数据保密性 | SM4 加密存储 + 传输加密 | ✅ |
| 数据备份恢复 | 每日全量 + 实时增量 + 异地容灾 | ✅ |

## 数据安全

### PHI 脱敏

- `mask_phi()` 正则脱敏：身份证 / 手机号 / 姓名 / 地址
- 所有 AI 入参先过脱敏，不出院

### @Sensitive 字段清单

| 模块 | 字段 | 说明 |
|---|---|---|
| empi Patient | idCard / phone | 患者主索引 |
| admin MedicalStaff | licenseNo | 医师执照号 |
| nursing_record | nurseId | 护士工号 |
| insurance | principalDiagnosis | 主诊断 |
| pharmacy_service | pharmacistId | 药师工号 |
| patient_portal | phone / wechatOpenId | 患者门户 |
| teaching | teacherId | 教师工号 |
| performance | staffId | 员工工号 |
| complaint | patientName / staffId / handlerId | 投诉 |
| radiology_report | radiologistId | 放射科医生 |
| physical_exam | customerName | 体检客户 |
| mobile_rounds | doctorId | 查房医生 |

### append-only 不可修改清单

- 病历（EMR / MedicalRecord）
- 诊疗记录（Encounter）
- 审计日志（AuditLog）
- 院感病例（InfectionCase）
- 投诉记录（Complaint）
- 放射报告（RadiologyReport）
- 麻醉记录（Surgery）
- 输血记录（Transfusion）
- 抗菌药物记录（Antibiotic）
- 护理记录（NursingRecord）
- 医嘱（MedicalOrder）
- 收费记录（Charge）
- 随访计划（FollowupPlan）
- 科研数据导出（ResearchDataExport）

### 审计日志保留

- 全量操作日志保留 **≥180 天**
- 生产接 ELK / Loki 集中存储

## AI 安全

### 禁止直连境外大模型

| 禁止 endpoint | 原因 |
|---|---|
| OpenAI (api.openai.com) | 数据出境 |
| Anthropic (api.anthropic.com) | 数据出境 |
| Google Gemini | 数据出境 |
| Cohere | 数据出境 |

### vLLM 本地部署

- 地址：`http://vllm:8000/v1`
- 模型：qwen2.5-72b-instruct（本地 GPU 推理）
- 超时：8 秒自动降级 mock

### 模型黑名单

- `FORBIDDEN_ENDPOINTS`：配置文件中硬编码禁止列表
- 运行时检测：llm_client.py 启动时校验

## 医疗合规

### 病历哈希链 + CA 签章 + TSA 时间戳

- 每条病历生成 SHA-256 哈希
- prevHash 链式链接（前一条哈希 = 后一条 prevHash）
- CA 电子签章（第三方 CA 机构）
- TSA 时间戳（不可抵赖）

### 国密算法

| 算法 | 用途 | 当前实现 | 生产实现 |
|---|---|---|---|
| SM2 | 数字签名 | 预留 | HSM 加密机 |
| SM3 | 哈希 | mock SHA-256 | 真 SM3 |
| SM4 | 对称加密 | mock base64 | HSM 加密机 |

### FHIR R4 适配

- 资源类型：Patient / Observation / Condition / Encounter
- 生产接 HAPI FHIR Server
- 互联互通四甲硬要求

## 信创路线

| 维度 | 当前 | 远期 |
|---|---|---|
| 数据库 | PostgreSQL 16 | 达梦 DM8 |
| CPU | X86 (Intel/AMD) | 鲲鹏 / 飞腾 |
| OS | CentOS / Ubuntu | 麒麟 / 统信 UOS |
| 中间件 | Tomcat / Nginx | 东方通 / 宝兰德 |
| 浏览器 | Chrome / Edge | 360 安全浏览器 / 红莲花 |

---

**Copyright © 2026 杭州健澜科技有限公司**
