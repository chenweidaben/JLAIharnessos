# P3-2 智能预问诊+智慧导诊 简报（09:30 轮）

## commit
- fe099c74 feat(triage): 预问诊问卷+16 条 SymptomRule 导诊
- 982242ff docs: 台账回写

## 新增路由
POST /api/v1/smart-triage/questionnaires
GET  .../questionnaires/:id
POST .../questionnaires/:id/submit
POST .../questionnaires/:id/review
GET  .../questionnaires?patientId=
POST /api/v1/smart-triage/triage
GET  /api/v1/smart-triage/symptoms

## SymptomRule 16 条
红旗 4：chest-pain/dyspnea/consciousness-disorder/heavy-bleeding
普通 12：fever/cough/headache/abdominal-pain/diarrhea/dizziness/rash/joint-pain/back-pain/ankle-swelling/palpitation/vision-blur

## 门禁（本人复跑）
- 根 tsc：exit 0 / 0 字节
- web tsc：exit 0 / 0 字节
- 单测：16 pass / 0 fail / 25 expect
- E2E：13 pass / 0 fail / 22 expect（重启 BFF 清库存后独立复跑）
- 品牌 17 词 Ordinal 0 命中

## 关键校验
doctor 创建问卷 403；patient 看别人 403；submit 自动生成 aiSummary；重复 submit 409；review 未 submit 409；symptomTags 空 400；胸痛 emergency=true 首推急诊+cardiology；cough 首推呼吸；多症状聚合 top3；无匹配兜底全科

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## 未覆盖
规则表接真实 LLM、NLP 解析自由文本、医生端智能辅助写病历、科室号源实时联动、症状严重度自评 UI