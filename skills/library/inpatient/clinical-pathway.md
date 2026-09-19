---
id: inpatient-clinical-pathway
name: 临床路径管理
version: 1.0.0
category: 住院
summary: 按病种临床路径推荐标准化诊疗步骤，自动识别变异并提示处理。
description: 入径患者自动匹配临床路径，推荐检查/用药/出院时点，记录变异。
icon: NodeIndexOutlined
triggers:
  phrases: [临床路径, 入径]
roles: [R05, R04, R03]
requiredTools:
  - treatment_plan_suggestion
  - search_medical_knowledge
requiredAgents: [diagnosis-assistant]
requiredKnowledge: [clinical-pathway-library]
requiredCdsRules: []
riskLevel: low
permissions: [emr:read:department]
steps:
  - id: match
    kind: tool
    name: 匹配临床路径
    tool: treatment_plan_suggestion
    input: { patientId: '{{patientId}}' }
  - id: guide
    kind: knowledge
    name: 调阅路径知识库
    knowledgeRefs: [clinical-pathway-library]
---

# 临床路径管理
1. 按诊断匹配路径。
2. 推荐当日标准诊疗项目，识别变异。
