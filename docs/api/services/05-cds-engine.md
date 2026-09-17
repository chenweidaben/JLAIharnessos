# CDS 引擎 API

> 对应源码：`src/knowledge/cds/CDSEngine.ts`、`RuleEvaluator.ts`、`ActionExecutor.ts`、`rules/`

## 概述

临床决策支持（CDS）引擎基于规则库（诊断规则、检验规则、药品规则）对诊疗行为进行实时校验与提醒，覆盖药物相互作用、禁忌症、过敏、剂量异常、危急值等场景。

## 核心类

### CDSEngine

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `evaluate(input, context)` | `CDSResult` | 对一次诊疗行为执行全部规则评估 |
| `loadRules(pack)` | `void` | 加载规则包 |
| `getRules(category)` | `Rule[]` | 按类别列出规则 |

### RuleEvaluator

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `eval(rule, facts)` | `RuleHit \| null` | 评估单条规则是否命中 |

### ActionExecutor

| 成员 | 类型 | 说明 |
| --- | --- | --- |
| `execute(hit)` | `Action[]` | 执行命中后的动作（阻断/警告/提示） |

## CDSResult

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `level` | `enum` | info/warning/block |
| `hits[]` | `array` | 命中规则（规则名/理由/依据） |
| `actions[]` | `array` | 建议动作 |
| `sourceRules` | `array` | 引用的规则ID |

## 规则分类

| 规则集 | 文件 | 覆盖场景 |
| --- | --- | --- |
| 诊断规则 | `rules/diagnosisRules.ts` | 诊断鉴别、漏诊提醒 |
| 检验规则 | `rules/labRules.ts` | 危急值、结果异常提醒 |
| 药品规则 | `rules/drugRules.ts` | 相互作用、禁忌、过敏、剂量 |

## 调用示例

```typescript
const cds = new CDSEngine(ruleIndex, actionExecutor);
const result = await cds.evaluate({ orderContent: "阿司匹林100mg qd", patientId: "P001" }, ctx);
if (result.level === "block") console.warn(result.hits);
```

## 错误码

| 错误码 | 含义 |
| --- | --- |
| `RULE_NOT_LOADED` | 规则包未加载 |
| `EVAL_TIMEOUT` | 规则评估超时 |

---

*健澜科技数智医院智能体 · 服务 API*
