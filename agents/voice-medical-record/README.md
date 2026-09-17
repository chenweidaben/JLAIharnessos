# 语音电子病历智能体（voice-medical-record）

> 健澜科技杠OS · 十大刚需智能体之一
> 医生开口就能写病历，查房、门诊边走边记。

## 解决的痛点

医生双手被诊疗占用、病历录入耗时。通过**语音口述 → ASR 转写 → 医疗术语规范化 → 结构化病历**，让医生在查房、门诊中自然口述即可成稿。

## 关键安全设计

语音识别最大的风险是**剂量/频次误识别**（如"15mg"听成"50mg"）。本智能体：

- 检测所有「数字 + 用药单位」与频次表达，**只标记、不臆改数字**；
- 强制医生在人工节点**逐项核对用药信息并电子签名**；
- 低置信片段自动进入待确认清单；
- 支持科室医疗热词（药品名、术式、医生姓名）提升识别率。

## 工作流

```
开始
 → 语音转写与规范化(transcribe_voice：去填充词/术语纠正/剂量检测)
 → 临床知识检索(RAG)
 → 生成结构化病历(LLM，用药信息原样保留并标记待核对)
 → 医生核对与电子签名(human)
 → 病历质控(medical_record_quality_check)
 → 通过？ ├ 是 → 归档(sync_to_his) → completed
         └ 否 → 退回修改(needs_revision)
结束
```

## ASR 供应商

平台内置 `MockAsrProvider`（离线演示/测试）。生产对接讯飞、阿里云、腾讯云、Azure 等，只需实现 `AsrProvider` 接口，密钥由部署方配置，**不内置任何密钥**。

## 输入 / 输出

- 输入：`audioRef`（录音引用）、`patientId`、`department`、`hotwords`
- 输出：`status`、`recordId`、`transcript`、`medicationMentions`、`draft`
