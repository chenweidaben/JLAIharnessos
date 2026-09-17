# 智能编码与 DRG/DIP 分组智能体（medical-coder）

> 健澜科技杠OS · 十大刚需智能体之一
> 编码员从"翻字典"变为"做审核"，又快又合规。

## 价值

自动从出院病历推荐 ICD-10 诊断编码、ICD-9-CM-3 手术编码，预测 DRG/DIP 分组，识别歧义编码与**高套分值（upcoding）**风险；低置信与高风险编码强制人工确认，兼顾效率与医保合规。

## 工作流

```
开始
 → 获取出院病历(get_medical_record)
 → ICD 术语库 RAG 检索候选
 → 大模型推荐诊断/手术编码(主要诊断标注 + 置信度 + 歧义)
 → DRG/DIP 分组分析(drg_dip_analysis，含高套风险)
 → 需要人工？(歧义/低置信/高套风险)
     ├ 是 → 病案编码员审核确认(human) → status=reviewed
     └ 否 → status=auto_suggested
结束
```

## 输出

- `diagnosisCodes` / `procedureCodes`：编码、名称、是否主要、置信度
- `ambiguous`：歧义点
- `drg`：DRG/DIP 分组、权重/分值、费用与高套风险标志
- `review`：编码员最终确认结果

## 合规红线

- 不虚构诊断/操作凑分组；
- 主要诊断选择遵循医保与病案首页规范；
- 高套风险、CC/MCC 误标从严识别并人工复核。
