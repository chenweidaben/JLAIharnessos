# 检验检查报告智能解读（lab-imaging-interpreter）

> 健澜科技杠OS · 十大刚需智能体之一
> 异常项一眼看清，危急值一次不漏。

## 价值

并行获取检验与影像报告，自动标注异常、解读临床意义、给出复查与就诊建议；医生看专业版、患者看通俗版；危急值强制提醒并人工确认。

## 工作流

```
开始
 → parallel：检验结果(get_lab_result) ‖ 影像报告(get_image_report)
 → 危急值识别(critical_value_alert)
 → 检验参考与指南 RAG
 → 大模型生成解读(异常项/影像摘要/建议/患者版/危急判定)
 → 含危急值？ ├ 是 → 人工确认处置(urgency=critical)
             └ 否 → urgency=normal
结束
```

## 输入 / 输出

- 输入：`patientId`、`days`（报告时间窗）、`focus`（关注主题）、`audience`（doctor/patient）
- 输出：`interpretation.abnormalFindings`（异常项：数值/参考范围/方向/意义）、`imagingSummary`、`recommendations`、`patientFriendlySummary`、`isCritical`、`urgency`

## 安全

- 不改动检测值、不做确定诊断；
- 危急值从严判定并强制人工确认与通知；
- 患者版避免引起恐慌的表述，明确就医指征。
