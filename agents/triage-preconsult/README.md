# 智能导诊预问诊智能体（triage-preconsult）

> 健澜科技杠OS · 十大刚需智能体之一
> 患者"挂对科、少等待"，医生"未见面、先知情"。

## 价值

就诊前用自然语言对话完成预问诊，结构化采集病情、推荐科室与分诊级别，识别急危重并引导急诊/绿色通道；生成预问诊摘要随单推送给接诊医生。

## 工作流

```
开始
 → 结构化预问诊采集(LLM：主诉/现病史/伴随症状/追问/急症标志)
 → 科室-症状映射 RAG
 → 确定首选/备选科室与分诊级别(LLM)
 → 是否急诊？
     ├ 是 → 导诊护士确认 + 绿色通道(human) → route=emergency
     └ 否 → 预约挂号(appointment_registration，失败不阻断) → route=routine
结束（输出分诊结论与预问诊摘要）
```

## 输入 / 输出

- 输入：`complaint`（患者自述）、`demographics`（年龄/性别）、`patientId`
- 输出：`triage.primaryDepartment`、`triageLevel`（急诊/加急/普通）、`isEmergency`、`preConsultSummary`、`intake.followUpQuestions`、`appointment`

## 安全

- 急症识别"宁可误报、不可漏报"，触发人工引导绿色通道；
- 不做诊断，科室映射可由医院在知识库自助配置；
- 预约失败不阻断导诊结论。
