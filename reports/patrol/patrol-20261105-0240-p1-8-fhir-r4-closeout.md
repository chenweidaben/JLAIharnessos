# P1-8 FHIR R4 资源扩展 P1 收官 简报（02:40 轮）

## commit
- ad5eecb4 feat(fhir-r4): 4→24 类资源统一 CRUD 网关
- e2c7fe0e docs: 台账回写

## 现有 4 类勘察
/api/fhir/* 是 4 类 GET 只读桩，未动。新建 /fhir/r4/* 独立 CRUD 网关。

## 24 类资源
原 4：Patient/Encounter/Observation/MedicationRequest
新 20：Condition/Procedure/DocumentReference/Coverage/ExplanationOfBenefit/AllergyIntolerance/AdverseEvent/CarePlan/EpisodeOfCare/Flag/List/RelatedPerson/Practitioner/PractitionerRole/Location/Organization/DiagnosticReport/ServiceRequest/MedicationDispense/MedicationAdministration

## 门禁（我本人复跑）
- 单测：36 pass / 0 fail / 115 expect
- E2E：29 pass / 0 fail / 152 expect（重启 BFF 清库存后独立复跑）
- 双 tsc 双零
- 品牌 16 词 0 命中

## 关键校验
不支持 resourceType 404 OperationOutcome；缺 resourceType 400；id 冲突 409；PUT 不存在 id 404；patient 角色访问他人资源 403；管理类资源不强制 patientId

## BFF pid
多轮重启后本人复跑重启；六端点全 200；5173 未动

## P1 全切片完成
P1-1 三级检诊 / P1-2 体温单医嘱单 / P1-3 手术麻醉 / P1-4 输血 / P1-5 ICU / P1-6 院前管家 / P1-7 机读核对 / P1-8 FHIR 24 类