# 健澜科技 jlmedaios 部署文档

**版本**：0.1.0
**最后更新**：2026-10-19

---

## 1. 系统架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Vite 前端   │────▶│   BFF 层    │────▶│  Java 后端  │
│  :5173      │     │   :8080     │     │   :9090     │
└─────────────┘     └──────┬──────┘     └──────┬──────┘
                           │                    │
                           ▼                    ▼
                    ┌─────────────┐     ┌─────────────┐
                    │  Python AI   │     │ PostgreSQL  │
                    │   :8000     │     │   :5433     │
                    └─────────────┘     └─────────────┘
```

---

## 2. 端口分配表

| 服务 | 端口 | 状态 |
|---|---|---|
| Vite 前端 | 5173 | ✅ 运行中 |
| BFF (Bun) | 8080 | ✅ 运行中 |
| Java monolith | 9090 | 待启动 |
| Python AI (FastAPI) | 8000 | 待启动 |
| PostgreSQL | 5433 | ✅ 运行中 |
| Redis | 6379 | 骨架配置 |

---

## 3. 测试账号清单

| 账号 | 密码 | 角色 | 科室 | 权限 |
|---|---|---|---|---|
| doctor_li | 123456 | 医生 | 心血管内科 | 临床全模块 |
| nurse_wang | 123456 | 护士 | 综合内科 | 护理模块 |
| pharmacist_zhang | 123456 | 药师 | 药房 | 药房模块 |
| patient_test | 123456 | 患者 | - | 仅个人信息 |
| admin | 123456 | 管理员 | - | 全部权限（`*`） |

---

## 4. 启动命令

### PostgreSQL
```powershell
# 建库
psql -h localhost -p 5433 -U postgres -c "CREATE DATABASE jlmedaios;"
```

### Java monolith
```powershell
cd services-java/jlmedaios-monolith
mvn spring-boot:run
```

### Python AI
```powershell
cd services-python
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### BFF
```powershell
bun run src/bff/server.ts
```

### Vite 前端
```powershell
cd web
npm run dev
```

---

## 5. 数据库表清单

| 表名 | 来源 | 说明 |
|---|---|---|
| empi_patient | V1 | 患者主索引 |
| orders | V1 | 医嘱 |
| encounter_record | V1 | 就诊记录 |
| lis_request | V1 | 检验申请 |
| improvement_tasks | V3 | 改进任务 |
| inpatient_cost_monitor | V3 | 在院费用监控 |
| payment_selection | V3 | 病组选择 |
| renewal_flow | V3 | 续方流转 |
| schedule_slots | V3 | 排班槽位 |
| settlement_analytics | V3 | 结算分析 |
| settlement_drilldown | V3 | 结算钻取 |
| settlement_report | V3 | 结算报表 |
| surgery_schedule | V3 | 手术排程 |
| tube_care | V3 | 管路护理 |
| dashboard_stats | V3 | 驾驶舱统计 |

**总计**：15 张表，53 个索引。

---

## 6. 常见问题排查

| 问题 | 排查方向 |
|---|---|
| 500 错误 | 检查表是否建、Flyway 是否执行 |
| 401 错误 | 检查 JWT secret 是否双端一致 |
| 403 错误 | 检查当前账号权限码是否匹配路由要求 |
| 跨域问题 | 检查 Vite proxy 配置 |
| Redis 连接失败 | 检查 6379 端口是否监听 |

---

## 7. 验收状态

| 项目 | 状态 |
|---|---|
| 根目录 tsc | ✅ 0 错误 |
| web 目录 tsc | ✅ 0 错误 |
| BFF 8080 | ✅ 运行中 |
| Vite 5173 | ✅ 运行中 |
| PostgreSQL 5433 | ✅ 运行中 |
| 登录接口 | ✅ 200 OK |
| dashboard/stats | ✅ 401（鉴权生效） |
| 14 个核心接口 e2e | ✅ 14/14 通过 |
