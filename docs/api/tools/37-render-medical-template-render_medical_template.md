# render_medical_template — 渲染病历模板

> 所属分类：**电子病历** ｜ 工具名：`render_medical_template` ｜ 风险等级：**LOW**（低（只读/查询类））

## 工具描述

按 `templateId` 取病历模板，把正文中的 `[占位符]` 按 `data` 键值对填充，输出可直接作为病历草稿的正文。与 `get_medical_template` 配套使用：先取模板，再渲染。未提供值的占位符保留原 `[占位符]` 待医生补填。

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `low` |
| 需要登录认证 | 是 |
| 需要用户确认 | 否 |
| 需要双重确认 | 否（由风险等级自动决定，high 自动启用双重确认） |
| 所需权限 | `emr:read` |
| 适用角色 | 后端未声明硬编码角色（按权限码推导） |
| 是否只读 | 是 |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| templateId | string | 是 | 模板ID，如 `TPL-AD-001` |
| data | object&lt;string, string&gt; | 否 | 占位符键值对；key 为模板正文中 `[ ]` 内的中文占位名（不带方括号），value 为填充值，默认 `{}`。例：`{ "主诉": "反复胸痛3天", "姓名": "张**" }` |

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| templateId | string | 模板ID |
| renderedContent | string | 渲染后草稿正文 |
| filledPlaceholders[] | array&lt;string&gt; | 已填充的占位符名 |
| missingPlaceholders[] | array&lt;string&gt; | 未填充、仍保留 `[ ]` 的占位符名 |

> 统一返回包装：`{ "success": boolean, "data": ... , "error": { code, message, details? } }`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
| TEMPLATE_NOT_FOUND | 模板ID 不存在 |
| PERMISSION_DENIED | 缺少 emr:read 权限 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{
  "name": "render_medical_template",
  "input": {
    "templateId": "TPL-AD-001",
    "data": { "主诉": "反复胸痛3天", "姓名": "张**" }
  }
}
```

### 成功返回示例

```json
{
  "success": true,
  "data": {
    "templateId": "TPL-AD-001",
    "renderedContent": "主诉：反复胸痛3天\n姓名：张**\n[现病史]",
    "filledPlaceholders": ["主诉", "姓名"],
    "missingPlaceholders": ["现病史"]
  }
}
```

### 失败返回示例

```json
{
  "success": false,
  "error": { "code": "TEMPLATE_NOT_FOUND", "message": "模板 TPL-XX-000 不存在" }
}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：电子病历*
