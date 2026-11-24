# get_drug_info — 查询药品信息

> 所属分类：**处方药品** ｜ 工具名：`get_drug_info` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

按药品名称/编码查询药品字典，含适应症、用法用量、禁忌、相互作用等。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `drug:read` |
| 适用角色 | doctor, pharmacist, nurse |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| drugName | string | 是 | 药品通用名（支持模糊匹配，如"阿司匹林""二甲双胍"） |
| infoType | enum(all/indication/dosage/adverse/contraindication/precaution/interaction) | 否 | 查询信息类型：all全部 / indication适应症 / dosage用法用量 / adverse不良反应 / contraindication禁忌 / precaution注意事项 / interaction相互作用，默认 all |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| drugName | string | 匹配到的药品通用名（返回为单对象，非数组；其余字段按 infoType 裁剪：分类/剂型/规格/医保类别/匹配方式/免责声明及说明书条目） |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| PERMISSION_DENIED | 缺少 drug:read 权限 |
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "get_drug_info",
  "input": {
  "drugName": "阿司匹林",
  "infoType": "all"
}
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": { "tool": "get_drug_info", "status": "ok" }
}
```

### 失败返回示例

```json
{
  "success": false,
  "error": { "code": "PERMISSION_DENIED", "message": "缺少所需权限" }
}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：处方药品*
