---
id: voice-medical-record
name: 语音电子病历
version: 1.0.0
category: 门诊
summary: 医生口述转写为结构化病历草稿，医疗术语规范化，剂量/频次强制核对，医生签名后归档。
description: |
  面向查房/门诊场景的语音病历。ASR 以"文本接口抽象"方式接入：
  上层只拿到转写后的文本（当前为 Mock 实现，生产可替换为真实医疗 ASR 服务），
  随后由语音病历智能体做术语规范化与剂量核对，强制医生签名确认后归档。
icon: AudioOutlined
triggers:
  phrases:
    - 语音写病历
    - 口述病历
    - 语音病历
roles:
  - R05
  - R06
requiredTools:
  - generate_medical_record
  - get_medical_record
  - get_drug_information
requiredAgents:
  - voice-medical-record
requiredKnowledge:
  - medical-terminology-normalization
requiredCdsRules: []
riskLevel: medium
permissions:
  - emr:create:self
inputSchema:
  type: object
  properties:
    patientId: { type: string }
    asrText: { type: string }
    drugName: { type: string }
  required: [patientId, asrText]
outputSchema:
  type: object
  properties:
    draft: { type: string }
    signatureRequired: { type: boolean }
enabled: true
tenantScope: true
author: 健澜科技
tags: [语音, ASR, 病历, 标杆]
steps:
  - id: asr-normalize
    kind: agent
    name: 语音转写与术语规范化
    description: 输入为 ASR 文本（Mock/真实 ASR 统一为文本接口），做医学术语纠错与结构化
    agent: voice-medical-record
    input:
      patientId: '{{patientId}}'
      asrText: '{{asrText}}'
  - id: dose-check
    kind: tool
    name: 剂量频次核对
    tool: get_drug_information
    input:
      drugName: '{{drugName}}'
      infoType: 用法用量
  - id: sign
    kind: human_confirm
    name: 医生电子签名确认
    confirmMessage: 语音病历已转写并完成剂量核对，请医生电子签名确认归档
    confirmRoles: [R05, R06]
---

# 语音电子病历 · 工作流说明

## ASR 接口抽象
本技能不依赖真实 ASR 密钥。运行时 `asrText` 即为"ASR 输出文本"：
- 开发/演示：由前端 Mock 一段转写文本；
- 生产：接入院内医疗 ASR 服务，输出同样的文本字段即可，技能无需改动。

## 执行步骤
1. **转写与规范化**：`voice-medical-record` 智能体完成医疗术语纠错、结构化。
2. **剂量频次核对**：调用药品信息工具核对口述中的剂量/频次，异常在确认环节高亮。
3. **医生签名**：强制电子签名节点；未签名不归档。

## 安全与合规
- 语音含敏感信息，上传前脱敏；转写文本全程留痕。
- 中风险写操作：单级用户确认 + 电子签名；归档审计。
