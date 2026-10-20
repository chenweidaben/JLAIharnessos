/**
 * 健澜科技 jlmedaios - M318 结算列表 + CDS 深度域
 *
 * 补建结算列表 + CDS 临床路径/诊断建议/治疗方案/剂量调整/危急值/影像提示
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/settlement/list - 结算列表 5 条（补建） */
async function handleSettlementList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SL-001', settleNo: 'JS-20261020-001', patient: '王***', department: '心内科', totalCost: '8,500.00 元', status: '已结算' },
    { id: 'SL-002', settleNo: 'JS-20261020-002', patient: '李***', department: '骨科', totalCost: '12,000.00 元', status: '已结算' },
    { id: 'SL-003', settleNo: 'JS-20261019-003', patient: '张***', department: '呼吸内科', totalCost: '5,200.00 元', status: '已结算' },
    { id: 'SL-004', settleNo: 'JS-20261019-004', patient: '赵***', department: '消化内科', totalCost: '3,800.00 元', status: '结算中（待医保审核）' },
    { id: 'SL-005', settleNo: 'JS-20261018-005', patient: '孙***', department: '普外科', totalCost: '15,000.00 元', status: '已结算' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/clinical-pathway - 临床路径 5 条 */
async function handleCdsClinicalPathway(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CP-001', pathwayName: '社区获得性肺炎临床路径', disease: '社区获得性肺炎（非重症）', stage: '第 3 天（抗感染治疗阶段）', standard: '住院 7-10 天，抗菌药物使用 7-10 天', completionRate: '60%（第 3/7-10 天）' },
    { id: 'CP-002', pathwayName: '急性 ST 段抬高型心肌梗死临床路径', disease: '急性 STEMI', stage: '第 1 天（急诊 PCI 术后）', standard: '住院 7-14 天，双联抗血小板治疗 12 个月', completionRate: '14%（第 1/7-14 天）' },
    { id: 'CP-003', pathwayName: '2 型糖尿病临床路径', disease: '2 型糖尿病（初发）', stage: '第 5 天（血糖调整阶段）', standard: '住院 10-14 天，血糖控制达标', completionRate: '43%（第 5/10-14 天）' },
    { id: 'CP-004', pathwayName: '腹腔镜胆囊切除术临床路径', disease: '胆囊结石伴慢性胆囊炎', stage: '第 2 天（术后恢复阶段）', standard: '住院 5-7 天，术后 3 天出院', completionRate: '40%（第 2/5-7 天）' },
    { id: 'CP-005', pathwayName: '脑梗死临床路径', disease: '急性脑梗死（溶栓后）', stage: '第 7 天（康复评估阶段）', standard: '住院 10-14 天，早期康复介入', completionRate: '58%（第 7/10-14 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/diagnosis-suggestion - 诊断建议 5 条 */
async function handleCdsDiagnosisSuggestion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DS-001', patient: '王***（男，65 岁）', symptoms: '胸痛 3 小时，心电图 V1-V4 ST 段抬高 0.3mV', suggestedDiagnosis: '急性前壁心肌梗死', basis: '症状+心电图+心肌酶升高（CK-MB 45 ng/ml）', confidence: '95%' },
    { id: 'DS-002', patient: '李***（女，58 岁）', symptoms: '咳嗽咳痰 5 天，发热 38.5℃，右肺中野湿啰音', suggestedDiagnosis: '社区获得性肺炎（右肺）', basis: '症状+体征+胸片提示右肺中野斑片影', confidence: '90%' },
    { id: 'DS-003', patient: '张***（男，72 岁）', symptoms: '多饮多尿 3 个月，体重下降 5kg，空腹血糖 9.8 mmol/L', suggestedDiagnosis: '2 型糖尿病', basis: '症状+血糖值+HbA1c 8.5%', confidence: '98%' },
    { id: 'DS-004', patient: '赵***（女，45 岁）', symptoms: '腹痛 6 小时，右上腹压痛，Murphy 征阳性，白细胞 12×10⁹/L', suggestedDiagnosis: '急性胆囊炎', basis: '体征+实验室检查+超声提示胆囊增大', confidence: '92%' },
    { id: 'DS-005', patient: '孙***（男，68 岁）', symptoms: '突发右侧肢体无力 2 小时，NIHSS 评分 8 分', suggestedDiagnosis: '急性脑梗死（左侧基底节区）', basis: '症状+体征+头颅 CT 排除出血', confidence: '88%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/treatment-plan - 治疗方案 5 条 */
async function handleCdsTreatmentPlan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TP-001', patient: '王***', diagnosis: '急性前壁心肌梗死', plan: '急诊 PCI + 双联抗血小板（阿司匹林+替格瑞洛）+ ACEI + β 受体阻滞剂', course: 'PCI 术后住院 7-14 天，长期药物治疗', expectedEffect: '血管再通，心肌再灌注，心功能恢复' },
    { id: 'TP-002', patient: '李***', diagnosis: '社区获得性肺炎', plan: '头孢呋辛 1.5g q8h 静滴 + 祛痰 + 雾化吸入', course: '抗感染 7-10 天', expectedEffect: '体温正常，肺部啰音消失，血常规恢复正常' },
    { id: 'TP-003', patient: '张***', diagnosis: '2 型糖尿病', plan: '二甲双胍 0.5g bid + 饮食控制 + 运动指导', course: '住院 10-14 天血糖调整，长期口服药', expectedEffect: '空腹血糖 <7.0 mmol/L，HbA1c <7%' },
    { id: 'TP-004', patient: '赵***', diagnosis: '急性胆囊炎', plan: '禁食+抗感染（头孢哌酮舒巴坦）+ 腹腔镜胆囊切除术', course: '术前抗感染 2-3 天，术后住院 5-7 天', expectedEffect: '腹痛缓解，炎症消退，手术切除胆囊' },
    { id: 'TP-005', patient: '孙***', diagnosis: '急性脑梗死', plan: 'rt-PA 静脉溶栓 + 抗血小板（阿司匹林）+ 他汀类 + 康复训练', course: '溶栓后住院 10-14 天，长期康复', expectedEffect: '神经功能改善，NIHSS 评分下降，生活自理能力恢复' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/drug-dose-adjust - 药物剂量调整 5 条 */
async function handleCdsDrugDoseAdjust(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DD-001', patient: '王***（男，65 岁，肌酐 180 μmol/L）', drug: '二甲双胍', originalDose: '0.5g bid（常规剂量）', adjustedDose: '0.25g bid（减量 50%）', reason: '肾功能不全（eGFR 35 ml/min），二甲双胍蓄积风险' },
    { id: 'DD-002', patient: '李***（女，58 岁，肝功能异常 ALT 85 U/L）', drug: '阿托伐他汀', originalDose: '20mg qn（常规剂量）', adjustedDose: '10mg qn（减量 50%）', reason: '肝功能异常，他汀类肝毒性风险' },
    { id: 'DD-003', patient: '张***（男，72 岁，体重 50kg）', drug: '华法林', originalDose: '3mg qn（常规剂量）', adjustedDose: '2mg qn（减量 33%）', reason: '老年+体重偏低，INR 已达 3.5（超治疗范围 2.0-3.0）' },
    { id: 'DD-004', patient: '赵***（女，45 岁，妊娠 28 周）', drug: '头孢呋辛', originalDose: '1.5g q8h（常规剂量）', adjustedDose: '1.5g q12h（减量 50%）', reason: '妊娠期药物代谢改变，肾功能生理性增强' },
    { id: 'DD-005', patient: '孙***（男，68 岁，体重 85kg）', drug: '普通肝素', originalDose: '5,000U 皮下注射 q12h（常规剂量）', adjustedDose: '7,500U 皮下注射 q12h（加量 50%）', reason: '肥胖患者肝素分布容积增大，常规剂量可能不足' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/lab-critical - 检验危急值 5 条 */
async function handleCdsLabCritical(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LC-001', patient: '王***', item: '血钾', result: '6.8 mmol/L', reference: '3.5-5.5 mmol/L', suggestion: '紧急处理：10% 葡萄糖酸钙 20ml 静推 + 胰岛素+葡萄糖静滴 + 降钾树脂口服' },
    { id: 'LC-002', patient: '李***', item: '血糖', result: '1.8 mmol/L', reference: '3.9-6.1 mmol/L', suggestion: '紧急处理：50% 葡萄糖 40ml 静推 + 持续血糖监测' },
    { id: 'LC-003', patient: '张***', item: '血红蛋白', result: '55 g/L', reference: '120-160 g/L（男）', suggestion: '紧急处理：立即输血（悬浮红细胞 2U）+ 查找出血原因' },
    { id: 'LC-004', patient: '赵***', item: 'INR', result: '5.5', reference: '0.8-1.2（未抗凝者）', suggestion: '紧急处理：停用华法林 + 维生素 K1 10mg 静推 + 监测 INR' },
    { id: 'LC-005', patient: '孙***', item: '血淀粉酶', result: '1,200 U/L', reference: '35-135 U/L', suggestion: '紧急处理：禁食+胃肠减压+生长抑素静滴+转 ICU' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cds/imaging-hint - 影像提示 5 条 */
async function handleCdsImagingHint(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IH-001', patient: '王***（男，65 岁）', bodyPart: '胸部 CT', hint: '左肺上叶尖后段可见 2.5cm 结节，边缘毛刺，分叶征', suggestion: '建议增强 CT 或 PET-CT 进一步评估，警惕肺癌', confidence: '85%' },
    { id: 'IH-002', patient: '李***（女，58 岁）', bodyPart: '腹部超声', hint: '胆囊增大，壁增厚 0.5cm，可见结石影', suggestion: '结合临床考虑急性胆囊炎，建议外科会诊', confidence: '90%' },
    { id: 'IH-003', patient: '张***（男，72 岁）', bodyPart: '头颅 MRI', hint: '左侧基底节区可见片状长 T1 长 T2 信号，DWI 高信号', suggestion: '符合急性脑梗死表现（左侧基底节区）', confidence: '95%' },
    { id: 'IH-004', patient: '赵***（女，45 岁）', bodyPart: '腹部 CT', hint: '阑尾增粗，直径 1.2cm，周围脂肪间隙模糊', suggestion: '符合急性阑尾炎表现，建议外科手术评估', confidence: '88%' },
    { id: 'IH-005', patient: '孙***（男，68 岁）', bodyPart: '冠脉造影', hint: '左前降支近段狭窄 90%，左回旋支狭窄 50%', suggestion: '建议 PCI 治疗左前降支病变，药物治疗左回旋支', confidence: '98%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m318Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/settlement/list', handle: handleSettlementList, auth: true },
  { method: 'GET', path: '/api/v1/cds/clinical-pathway', handle: handleCdsClinicalPathway, auth: true },
  { method: 'GET', path: '/api/v1/cds/diagnosis-suggestion', handle: handleCdsDiagnosisSuggestion, auth: true },
  { method: 'GET', path: '/api/v1/cds/treatment-plan', handle: handleCdsTreatmentPlan, auth: true },
  { method: 'GET', path: '/api/v1/cds/drug-dose-adjust', handle: handleCdsDrugDoseAdjust, auth: true },
  { method: 'GET', path: '/api/v1/cds/lab-critical', handle: handleCdsLabCritical, auth: true },
  { method: 'GET', path: '/api/v1/cds/imaging-hint', handle: handleCdsImagingHint, auth: true },
];
