# get_drug_information — 药品说明书信息查询

> 所属分类：**临床决策支持** ｜ 工具名：`get_drug_information` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

按药品通用名查询药品说明书信息，按章节返回适应症、用法用量、禁忌、不良反应、药物相互作用、注意事项，支持按章节过滤。返回内容为说明书知识库数据，供临床用药参考。

> 注意：本工具（CDS 知识库，`get_drug_information`）与处方药品类的 `get_drug_info`（本院药品目录，`drug:read`）是两个不同工具，不可混用。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | 无（公开只读） |
| 适用角色 | 后端未声明硬编码角色（按权限码推导） |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| drugName | string | 是 | 药品通用名（如 阿司匹林、阿托伐他汀，非空） |
| infoType | enum(适应症/用法用量/禁忌/不良反应/相互作用/全部) | 否 | 查询的信息类型，默认 `全部`；选 `相互作用` 时仅返回药物相互作用章节 |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| drugName | string | 匹配到的药品通用名 |
| tradeName | string | 商品名（可选） |
| sections | object | 说明书章节：`适应症 / 用法用量 / 禁忌 / 不良反应 / 药物相互作用 / 注意事项`，按 `infoType` 裁剪 |
| found | boolean | 是否在药品知识库中命中 |
| note | string | 参考提示或未命中说明（可选） |
| queriedAt | string | 查询时间（ISO 8601） |

> 未命中时仍返回 `success: true`，`found=false`，`sections` 为空对象，`note` 列出已收录常用药品。
> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "get_drug_information",
  "input": {
    "drugName": "阿司匹林",
    "infoType": "全部"
  }
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": {
    "drugName": "阿司匹林",
    "tradeName": "拜阿司匹灵",
    "sections": {
      "适应症": "用于心脑血管疾病的抗血小板聚集治疗",
      "用法用量": "口服，每日一次，每次 100mg",
      "禁忌": "活动性出血、对本品过敏者禁用",
      "不良反应": "胃肠道不适、出血倾向",
      "药物相互作用": "与抗凝药联用增加出血风险",
      "注意事项": "用药期间监测出血倾向"
    },
    "found": true,
    "note": "说明书内容仅供临床参考，临床用药以最新版正式说明书及医嘱为准。",
    "queriedAt": "2026-11-25T04:10:00.000Z"
  }
}
```

### 未命中返回示例

```json
{
  "success": true,
  "data": {
    "drugName": "未知药品",
    "sections": {},
    "found": false,
    "note": "未在药品知识库中找到\"未知药品\"，请核对通用名。",
    "queriedAt": "2026-11-25T04:10:00.000Z"
  }
}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：临床决策支持*
