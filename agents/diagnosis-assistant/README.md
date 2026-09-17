# 智能诊断辅助智能体（diagnosis-assistant）

> 健澜科技杠OS · 十大刚需智能体之一
> 拓宽诊断思路、堵住漏诊风险、第一时间拦住急危重。

## 价值

汇聚患者完整资料，**并行**运行 CDS 诊断建议与权威指南检索，综合给出鉴别诊断、补充检查与治疗方向；对危急值与红旗症状从严识别、强制人工确认。

## 工作流

```
开始
 → 既往史 / 检验 / 影像（影像失败不阻断）
 → parallel：CDS诊断建议 ‖ 指南与鉴别诊断 RAG
 → 危急值识别(critical_value_alert)
 → 大模型综合鉴别诊断(opus，JSON)
 → 是否急危重？
     ├─ 是 → 危急值人工确认处置(human，10分钟超时) → urgency=emergency
     └─ 否 → urgency=routine
结束（输出鉴别诊断、建议检查、治疗方向、红旗症状）
```

## 输出

- `analysis.differentialDiagnosis`：鉴别诊断（诊断/可能性/依据）
- `analysis.recommendedExams`：建议补充检查
- `analysis.treatmentDirection`：治疗方向
- `analysis.redFlags` / `isEmergency`：红旗症状与急危重判定
- `criticalAlerts`：危急值结果
- `urgency` / `acknowledged`：急诊确认状态

## 安全边界

- AI **只辅助、不确诊**，最终诊断与处方由执业医师决定；
- 急危重判定遵循"宁可误报、不可漏报"；
- 危急值提醒必须人工确认，全程审计留痕。
