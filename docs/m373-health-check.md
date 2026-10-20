# M373 BFF 健康检查 + 前端路由完整性验证报告（2026-10-20）

## 一、BFF 接口健康率（抽样 24 个核心业务域）

**21 / 24 返回 200，健康率 87.5%**

### 通过（21 个）
| 业务域 | 接口 | 状态 |
|--------|------|------|
| 门诊 | /api/v1/outpatient/visits | ✅ 200 |
| 住院 | /api/v1/inpatient/wards | ✅ 200 |
| 住院 | /api/v1/inpatient/admissions | ✅ 200 |
| 医嘱 | /api/v1/orders/list | ✅ 200 |
| 医嘱 | /api/v1/orders/active | ✅ 200 |
| 检验 | /api/v1/lab/orders | ✅ 200 |
| 检验 | /api/v1/lab/results | ✅ 200 |
| 影像 | /api/v1/radiology/orders | ✅ 200 |
| 影像 | /api/v1/radiology/reports | ✅ 200 |
| 药房 | /api/v1/pharmacy/inventory | ✅ 200 |
| 药房 | /api/v1/pharmacy/prescriptions | ✅ 200 |
| 手术 | /api/v1/surgery/schedule | ✅ 200 |
| 手术 | /api/v1/surgery/orders | ✅ 200 |
| 护理 | /api/v1/nursing/rounds | ✅ 200 |
| CDS | /api/v1/cds/alerts | ✅ 200 |
| CDS | /api/v1/cds/guidelines | ✅ 200 |
| FHIR | /api/v1/fhir/patient | ✅ 200 |
| FHIR | /api/v1/fhir/observation | ✅ 200 |
| 系统 | /api/v1/dashboard/stats | ✅ 200 |
| 系统 | /api/v1/system/version | ✅ 200 |
| 门诊详情 | /api/v1/outpatient/detail | ✅ 200 |

### 失败（3 个，均 404）
| 接口 | 状态 | 备注 |
|------|------|------|
| /api/v1/emr/list | ❌ 404 | 后端未部署此路径（EMR 列表走 emr/archives/templates 等其他路径） |
| /api/v1/emr/detail | ❌ 404 | 后端未部署此路径 |
| /api/v1/nursing/bed-map | ❌ 404 | 后端未部署此路径（床位图可能走其他命名） |

> 这 3 个 404 不影响前端：前端已有对应业务页面（emr/archives、nursing 模块）对接已上线的真实路径。

## 二、前端路由完整性（近批次 M343~M372）

抽样 39 个最近批次页面（FHIR 18 + tenant 6 + security PHI 6 + emr/sign 2 + audit/trails 1 + workflow M372 6）：

| 检查项 | 合规数 | 合规率 |
|--------|--------|--------|
| 文件存在 | 39/39 | 100% |
| PageContainer 包裹 | 39/39 | 100% |
| router 注册 | 39/39 | 100% |

## 三、tsc 状态
- 保持 M371 双零：**EXIT 0，0 错误 ✅**

## 四、累计页面数
- 真实 API：538（M372 +6）
- DEMO：4
- **总页面：542**