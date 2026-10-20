# Python AI Router 安全审查报告

**审查日期**：2026-10-19
**审查范围**：`services-python/app/api/` 下所有 router 文件
**审查人**：健澜科技架构审计

---

## 1. 审查范围

| 指标 | 数值 |
|---|---|
| Router 文件总数 | 84 个 |
| 中间件位置 | `app/main.py`（全局中间件） |
| 核心鉴权模块 | `app/core/api_key_auth.py` |

---

## 2. API Key 覆盖率

### 现状
- **全局中间件模式**：`main.py` 注册 `api_key_middleware`，所有请求先经过 Bearer Token 校验
- **API_KEYS 字典**：硬编码在 `api_key_auth.py` 中，包含客户端名称 + 限流配置
- **限流机制**：基于内存的滑动窗口（60 秒窗口）

### 覆盖率
| 层级 | 覆盖率 | 说明 |
|---|---|---|
| 全局中间件 | 100% | 所有路由均经过 api_key_middleware |
| 路由级依赖注入 | 未使用 | 无单独 `Depends(api_key_auth)` |

**结论**：API Key 覆盖率 100%，无裸奔端点。

---

## 3. SQL 注入风险

### 扫描结果
- **ORM 使用**：FastAPI router 主要调用 Python 业务逻辑函数，不直接执行 SQL
- **raw SQL 拼接**：未发现 `execute()` 或 `text()` 拼接用户输入
- **数据库交互**：通过上层服务层封装，router 层无 SQL 操作

**结论**：SQL 注入风险低，无明显风险点。

---

## 4. 未鉴权接口

### 扫描结果
- 所有 router 均通过全局 `api_key_middleware` 鉴权
- 无 `@router.get` 绕过中间件的情况
- CORS 配置在 `main.py` 中统一处理

**结论**：无未鉴权接口。

---

## 5. PHI 脱敏现状

### 现状
- Router 层返回数据为 AI 分析结果（糖网分期、听力损失等级、口腔诊断）
- 原始 PHI（患者姓名、身份证号）由调用方传入，不存储在 Python 端
- 无 PHI 落库操作

**结论**：PHI 脱敏风险低，Python 端不存储 PHI。

---

## 6. 风险点清单

| 风险等级 | 描述 | 建议 |
|---|---|---|
| P2 | API_KEYS 硬编码在代码中 | 生产环境应迁移到环境变量或密钥管理服务 |
| P2 | 限流为内存实现，多实例部署失效 | 生产环境应迁移到 Redis 分布式限流 |
| P3 | 无请求日志审计 | 建议加 access log + 审计中间件 |

---

## 7. 总结

Python AI 层整体安全状况良好：
- 全局 API Key 中间件 100% 覆盖
- 无 SQL 注入风险
- 无未鉴权端点
- 无 PHI 存储风险

**主要改进点**：API Key 硬编码 → 环境变量；内存限流 → Redis 分布式限流。
