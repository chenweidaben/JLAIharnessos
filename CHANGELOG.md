# 变更日志（CHANGELOG）

本文件记录健澜科技数智医院智能体的版本变更。
格式遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

---

## [Unreleased]

### 新增
- 前端离线状态指示器（`useOnlineStatus` + `OfflineIndicator`）：断网顶部红色横幅，恢复后自动提示。
- HTTP 请求超时可配置：默认 30s，支持 `VITE_API_TIMEOUT_MS` 覆盖。
- HTTP 请求指数退避重试：仅幂等 GET，5xx/网络错误/超时，最多 2 次，离线不重试。
- BFF 内置 Prometheus 指标端点 `/metrics`（零依赖，可选 `METRICS_TOKEN`）：HTTP RED、WebSocket、
  智能体/工具/CDS/人工任务指标（`gangos_` 前缀），并支持 SIGTERM/SIGINT 优雅停机。
- 预置 Prometheus 告警规则 9 条（`deploy/prometheus/rules/gangos.yml`）与 Grafana 平台总览大盘
  （19 面板，自动装配），docker-compose 已挂载。
- k6 压测脚本（冒烟/常规/压力，`scripts/perf/k6/`）。
- TOTP 多因素认证（RFC 6238，±1 步时钟容忍、重放保护、一次性备份码），BFF 5 个 `/auth/mfa/*` 接口。
- PostgreSQL 备份/恢复脚本（`deploy/postgres/backup.sh`、`restore.sh`，含校验与保留期）。
- 《生产上线验收清单》《容灾与恢复演练手册》。

### 变更
- 演示危急值假告警改为仅非生产环境推送，生产环境不再制造假告警。

### 修复
- BFF 认证中间件修复"任意非空 token 即 admin"的 P0 漏洞：JWT 验签失败一律拒绝，演示 token 仅非生产环境可用。
- BFF 500 错误不再向客户端泄露堆栈/SQL/文件路径，统一返回通用文案 + traceId。
- 修复指标 Histogram 桶计数被重复累加的问题。

---

## [0.1.0] - 2026-09-16

### 概述
首个可交付版本，完成第四阶段全量验证（编译、测试、代码质量、功能、交互一致性、安全性能、异常边界、文档交付）。

### 新增
- **核心引擎**：MedicalAgentLoop、QueryEngine、LLMClient、SystemPromptBuilder、上下文压缩与 Token 预算管理。
- **工具框架**：buildMedicalTool、ToolRegistry、ToolExecutor、ToolRiskManager（三级风险确认）。
- **36 个医疗专用工具**：患者管理、电子病历、医嘱处方、检验检查、CDS、质控、患者服务、运营、系统集成。
- **多智能体协作**：AgentRegistry、CollaborationEngine、ConsultationManager、IntentClassifier、SuperScheduler。
- **8 类科室子代理**：内科、外科、儿科、妇产科、急诊科、ICU、手术室、医技科。
- **BFF 层**：Bun.serve，REST `/api/v1` + WebSocket `/ws/chat`，统一响应信封、traceId、限流、CSRF、安全头。
- **安全合规**：JWT HMAC-SHA256 验签（时序安全比较）、RBAC+ABAC、四级数据分级、数据脱敏、审计日志、Prompt 注入防护、输入验证（SQL/命令/XSS/路径遍历）、加密服务、密钥管理。
- **监控可观测**：ErrorMonitor（全局兜底+错误聚合+指纹）、HealthChecker（三态健康检查）、PerformanceMonitor、结构化日志。
- **前端**：React 19 + TypeScript + Vite + AntD5，206 源文件，覆盖门诊/住院/急诊/手术/质控/运营/系统管理等场景。
- **文档体系**：110+ 份文档，含 API（36 工具+11 服务+7 适配器）、部署（4）、运维（5）、用户手册（5 角色）、ADR（16）、工程化（8）。

### 安全
- 等保三级合规：安全响应头（CSP/X-Frame-Options/HSTS 等）、限流、CSRF 双重提交、输入验证、输出编码。
- JWT 验签失败拒绝伪造 Token；生产环境禁用演示 Token。
- 患者数据脱敏展示；审计日志防篡改（LogIntegrity）。

### 测试
- 后端 898 个测试用例（单元/集成/E2E）。
- 前端组件与交互测试。
- 异常边界测试覆盖：网络/服务/数据/并发/权限/浏览器六类异常场景。

### 已知限制
- WebSocket 演示态以模拟流式推送为主，真实 LLM 流式对接待生产环境联调。
- 多标签页登录状态实时同步（storage 事件广播）列入后续迭代。
- 大文件分片上传、长列表虚拟滚动按场景逐步落地。

---

## 版本说明

- **主版本（MAJOR）**：不兼容的 API/架构变更
- **次版本（MINOR）**：向下兼容的功能新增
- **修订号（PATCH）**：向下兼容的问题修复

升级指南见 [部署文档](docs/deployment/02-部署步骤.md) 与 [运维手册](docs/operations/05-日常运维手册.md)。

Copyright (c) 2026 杭州健澜科技有限公司
