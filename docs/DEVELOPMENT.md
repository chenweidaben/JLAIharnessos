# 健澜AI原生医院操作系统OS — 开发指南

## 环境要求

| 工具 | 版本 | 说明 |
|---|---|---|
| JDK | 21 | 核心交易层 |
| Python | 3.11 | AI 智能层 |
| Node.js | 20 | BFF 聚合层 |
| Docker | 24+ | 容器化部署 |
| Bun | 1.3+ | BFF 运行时 |

## 本地启动步骤

```bash
# 一键启动全栈（postgres + redis + monolith + ai-service）
make up

# 访问各服务
# Java 核心交易：http://localhost:9090/actuator/health
# Python AI 服务：http://localhost:8000/ai/health
# TS BFF 聚合层：http://localhost:8080
```

## 代码规范

### Java 命名规范

- 类名：大驼峰法（`PatientController` / `EncounterService`）
- 方法名/变量名：小驼峰法（`listByPatient` / `patientId`）
- 常量：全大写下划线（`MAX_RETRY_COUNT`）
- 包名：全小写（`com.jlmedaios.monolith.encounter`）

### 包结构

```
com.jlmedaios.monolith.<module>/
├── entity/          # JPA 实体
├── repository/     # Spring Data JPA
├── service/        # 业务逻辑
└── controller/     # REST API
```

### RESTful API 规范

| 操作 | HTTP 方法 | 路径示例 |
|---|---|---|
| 查询列表 | GET | `/api/encounter/patient/{patientId}` |
| 查询单个 | GET | `/api/encounter/{id}` |
| 创建 | POST | `/api/encounter/create` |
| 更新 | PUT | `/api/encounter/{id}/close` |
| 删除 | DELETE | （禁用，用状态流转替代） |

### 错误码规范

| HTTP 状态码 | 含义 | 使用场景 |
|---|---|---|
| 200 | 成功 | 正常返回 |
| 400 | 参数错误 | 请求参数校验失败 |
| 401 | 未授权 | 未登录或 token 失效 |
| 403 | 禁止 | 无权限访问 |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 内部异常 |

## Git 规范

### 分支策略

| 分支 | 用途 | 保护规则 |
|---|---|---|
| `master` | 生产环境 | 禁止直接 push，必须 PR + review |
| `develop` | 开发环境 | 必须 PR + CI 通过 |
| `feature/*` | 功能开发 | 从 develop 切出，合并回 develop |
| `hotfix/*` | 紧急修复 | 从 master 切出，合并回 master + develop |

### Commit Message 规范

| 前缀 | 用途 | 示例 |
|---|---|---|
| `feat:` | 新功能 | `feat: 新增手术排班模块` |
| `fix:` | 修复缺陷 | `fix: 修复挂号重复提交问题` |
| `docs:` | 文档更新 | `docs: 更新 README 快速启动` |
| `refactor:` | 重构 | `refactor: 抽取公共校验逻辑` |
| `test:` | 测试相关 | `test: 补充手术排班单元测试` |
| `chore:` | 构建/工具 | `chore: 升级 Spring Boot 3.5.3` |

### Code Review 要求

- 至少 1 人 review 通过
- CI 流水线全绿（编译 + 测试 + 代码规范）
- 核心业务模块（挂号/收费/医嘱）需 2 人 review

## 测试规范

| 测试类型 | 覆盖率要求 | 说明 |
|---|---|---|
| 单元测试 | ≥80% | Service 层核心逻辑 |
| 集成测试 | 核心流程覆盖 | 关键业务链路（挂号→收费→发药） |
| E2E 测试 | 关键场景 | 用户核心操作路径 |

## 调试技巧

### IDEA 调试配置

```yaml
# Spring Boot 启动配置
VM Options: -Xms512m -Xmx2g -Dspring.profiles.active=dev
Program Arguments: --server.port=9090
Environment: SPRING_PROFILES_ACTIVE=dev
```

### Postman Collection

- 导入 `docs/postman/jlmedaios-os-api.json`
- 环境变量：`baseUrl` = `http://localhost:9090`

### vLLM Mock 模式

```bash
# 开发环境设置环境变量，自动降级 mock
export LOCAL_VLLM_URL=http://localhost:8000/v1
# vLLM 未启动时，所有 AI 请求自动返回 mock 数据
```

---

**Copyright © 2026 杭州健澜科技有限公司**
