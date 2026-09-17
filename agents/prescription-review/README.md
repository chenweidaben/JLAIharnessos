# 智能处方审核智能体（prescription-review）

> 健澜科技杠OS · 十大刚需智能体之一
> 处方前置审核，把用药差错拦在发生之前。

## 价值

处方开具后**自动前置审核**：相互作用、配伍禁忌、剂量疗程、过敏史、特殊人群、适应症六维核查，按 `pass / warn / reject` 分级；严重风险拦截并强制药师复核。

## 工作流

```
开始
 → 获取待审处方(get_prescription_list) + 病史/过敏史(get_patient_history)
 → parallel：规则审核(prescription_audit) ‖ 相互作用(drug_interaction_check) ‖ 说明书RAG
 → 大模型综合裁决(分级 + 问题清单 + 用药交代)
 → 风险路由：
     reject/warn → 药师人工复核(human，决策通过/退回/修改)
     pass        → 自动通过
结束
```

## 输出

- `finalDecision`：`auto_passed` 或药师决定
- `riskLevel`：pass / warn / reject
- `adjudication.problems`：问题清单（严重度/类型/药品/说明/建议）
- `adjudication.counsel`：发药交代
- `ruleAudit` / `interactions`：规则引擎与相互作用原始结果

## 安全合规

- 高风险智能体（riskLevel=high），严重问题**默认拦截**；
- 药师复核全程审计，双复核可按医院制度配置；
- AI 不直接修改处方，只输出审核意见。
