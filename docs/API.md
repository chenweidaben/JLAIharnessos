# 健澜AI原生医院操作系统OS — API 接口文档

## 认证方式

所有接口需通过以下方式认证：

```http
Authorization: Bearer <access_token>
X-API-Key: <api_key>
```

- **Bearer Token**：用户登录后获取，有效期 2 小时
- **API Key**：服务间调用使用，长期有效，需妥善保管

## 通用响应格式

```json
{
  "code": 20001,
  "message": "成功",
  "data": { ... },
  "timestamp": "2026-10-19T10:30:00+08:00"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| code | int | 业务状态码，20001 为成功 |
| message | string | 提示信息 |
| data | object | 业务数据 |
| timestamp | string | 服务器时间（ISO 8601） |

## 错误码规范

| 错误码 | HTTP 状态 | 说明 |
|---|---|---|
| 20001 | 200 | 成功 |
| 40001 | 400 | 参数错误 |
| 40101 | 401 | 未认证 |
| 40301 | 403 | 无权限 |
| 40401 | 404 | 资源不存在 |
| 50001 | 500 | 服务器错误 |
| 50301 | 503 | 服务不可用 |

## 按模块列出端点

### 核心交易

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/register` | 挂号 |
| GET | `/api/reg/patient/{patientId}` | 患者挂号记录 |
| POST | `/api/charge` | 收费 |
| POST | `/api/refund/apply` | 退费申请 |
| PUT | `/api/refund/{id}/approve` | 退费审批 |
| POST | `/api/orders/create` | 开具医嘱 |
| POST | `/api/pharmacy/restock` | 药品入库 |
| GET | `/api/pharmacy/inventory` | 药品库存 |
| GET | `/api/pharmacy/low-stock` | 低库存预警 |
| GET | `/api/pharmacy/expiring` | 近效期预警 |
| POST | `/api/discharge` | 出院结算 |

### 临床闭环

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/surgery/schedule` | 手术排班 |
| GET | `/api/operation/today` | 今日手术 |
| PUT | `/api/operation/{id}/start` | 手术开始 |
| PUT | `/api/operation/{id}/finish` | 手术完成 |
| POST | `/api/blood-bank/order` | 输血申请 |
| PUT | `/api/blood-bank/{id}/issue` | 发血 |
| GET | `/api/blood-bank/inventory` | 血库库存 |
| POST | `/api/emergency/register` | 急诊登记 |
| PUT | `/api/emergency/{id}/triage` | 急诊分诊 |
| PUT | `/api/emergency/{id}/depart` | 急诊离院 |
| GET | `/api/emergency/ongoing` | 急诊中列表 |
| POST | `/api/consultation/request` | 会诊申请 |
| PUT | `/api/consultation/{id}/accept` | 会诊接诊 |
| PUT | `/api/consultation/{id}/complete` | 会诊完成 |
| POST | `/api/followup-plan/create` | 随访计划创建 |
| PUT | `/api/followup-plan/{id}/execute` | 随访执行 |
| GET | `/api/followup-plan/due` | 今日待执行 |

### 运营管理

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/analytics/dept/{deptCode}/summary` | 科室运营汇总 |
| GET | `/api/analytics/hospital/overview` | 全院概览 |
| GET | `/api/analytics/compare` | 科室对比 |
| GET | `/api/bed/ward/{wardCode}` | 病区床位 |
| PUT | `/api/bed/{bedNo}/occupy` | 占用床位 |
| PUT | `/api/bed/{bedNo}/release` | 释放床位 |
| GET | `/api/bed/available` | 可用床位 |
| GET | `/api/audit/logs` | 审计日志 |
| GET | `/api/monitoring/dashboard` | 运营仪表盘 |

### 安全合规

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/security/permissions` | 权限列表 |
| GET | `/api/fhir/patient/{id}` | FHIR 患者资源 |
| GET | `/api/openapi/docs` | OpenAPI 文档 |
| GET | `/api/error-code/{code}` | 错误码查询 |

### 患者服务

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/patient-portal/{id}` | 患者门户 |
| POST | `/api/radiology/report` | 放射报告 |
| PUT | `/api/radiology/report/{id}/sign` | 放射报告签名 |
| GET | `/api/radiology/report/patient/{patientId}` | 患者放射报告 |
| POST | `/api/physical-exam/order` | 体检下单 |
| PUT | `/api/physical-exam/{id}/complete` | 体检完成 |
| GET | `/api/physical-exam/today` | 今日体检 |
| POST | `/api/archive/store` | 病案入库 |
| PUT | `/api/archive/{id}/borrow` | 病案借阅 |
| PUT | `/api/archive/{id}/return` | 病案归还 |
| GET | `/api/archive/overdue` | 超期未还 |
| GET | `/api/education/materials` | 教育材料 |
| POST | `/api/education/deliver` | 推送教育材料 |
| GET | `/api/education/patient/{patientId}` | 患者教育记录 |

### 互联网医院

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/online/consultation/create` | 在线咨询 |
| PUT | `/api/online/consultation/{id}/accept` | 医生接诊 |
| PUT | `/api/online/consultation/{id}/finish` | 结束咨询 |
| GET | `/api/online/consultation/pending` | 待接诊 |
| POST | `/api/prescription/delivery/create` | 处方配送 |
| PUT | `/api/prescription/delivery/{id}/dispatch` | 配药发货 |
| PUT | `/api/prescription/delivery/{id}/sign` | 签收 |
| GET | `/api/prescription/delivery/pending` | 待配药 |

### 质量控制

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/review/indicators` | 评审指标列表 |
| GET | `/api/review/category/{category}` | 按类别查询 |
| PUT | `/api/review/indicator/{code}/update` | 更新指标 |
| POST | `/api/incident/report` | 不良事件上报 |
| PUT | `/api/incident/{id}/investigate` | 开始调查 |
| PUT | `/api/incident/{id}/close` | 结案 |
| GET | `/api/incident/pending` | 待处理 |
| POST | `/api/drug/interaction/check` | 药品相互作用检查 |
| GET | `/api/drug/interaction/rules` | 规则列表 |
| GET | `/api/drug/interaction/log` | 检查日志 |

## 分页参数规范

```http
GET /api/xxx?page=0&size=20&sort=createdAt,desc
```

| 参数 | 默认 | 说明 |
|---|---|---|
| page | 0 | 页码，从 0 开始 |
| size | 20 | 每页条数，最大 100 |
| sort | createdAt,desc | 排序字段，格式：字段名,asc/desc |

## 时间格式规范

所有时间字段使用 ISO 8601 格式：

```
2026-10-19T10:30:00+08:00
```

- 日期：`2026-10-19`
- 日期时间：`2026-10-19T10:30:00`
- 带时区：`2026-10-19T10:30:00+08:00`

---

**Copyright © 2026 杭州健澜科技有限公司**
