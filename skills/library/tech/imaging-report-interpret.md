---
id: tech-imaging-report-interpret
name: 影像报告智能解读与调阅
version: 1.0.0
category: 医技
summary: 调取影像检查报告与 DICOM，AI 标注关键所见，辅助诊断。
description: 影像科技师/医师调阅报告与原始影像，AI 辅助描述。
icon: CameraOutlined
triggers:
  phrases: [影像报告, 看片子]
roles: [R10, R05, R04]
requiredTools:
  - get_image_report
  - view_dicom
requiredAgents: [lab-imaging-interpreter]
requiredKnowledge: [imaging-report-template]
requiredCdsRules: []
riskLevel: low
permissions: [imaging:read:assigned]
steps:
  - id: report
    kind: tool
    name: 读取影像报告
    tool: get_image_report
    input: { patientId: '{{patientId}}' }
  - id: dicom
    kind: tool
    name: 调阅 DICOM
    tool: view_dicom
    input: { studyId: '{{studyId}}' }
---

# 影像报告智能解读
1. 读取报告。
2. 调阅 DICOM 并 AI 辅助描述。
