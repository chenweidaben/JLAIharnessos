/**
 * 健澜科技 jlmedaios - M312 肿瘤域
 *
 * 肿瘤患者/抗肿瘤治疗/化疗方案/放疗方案/肿瘤监测/癌痛管理
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/oncology/patients - 肿瘤患者 5 条 */
async function handleOncologyPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OP-001', patient: '王***（男，62 岁）', disease: '肺腺癌（周围型）', stage: 'IIIA 期', treatmentPlan: '手术+辅助化疗（GP 方案）', status: '术后第 2 周期化疗中' },
    { id: 'OP-002', patient: '李***（女，55 岁）', disease: '乳腺癌（浸润性导管癌）', stage: 'IIB 期', treatmentPlan: '手术+内分泌治疗（来曲唑）', status: '术后内分泌治疗中' },
    { id: 'OP-003', patient: '张***（男，68 岁）', disease: '结直肠癌（腺癌）', stage: 'IV 期（肝转移）', treatmentPlan: '姑息化疗（FOLFOX 方案）+靶向（西妥昔单抗）', status: '第 4 周期化疗中' },
    { id: 'OP-004', patient: '赵***（女，48 岁）', disease: '胃癌（印戒细胞癌）', stage: 'III 期', treatmentPlan: '手术+术后辅助化疗（SOX 方案）', status: '术后第 1 周期化疗中' },
    { id: 'OP-005', patient: '孙***（男，70 岁）', disease: '前列腺癌（腺癌）', stage: 'T3N1M0', treatmentPlan: '内分泌治疗（比卡鲁胺+戈舍瑞林）', status: '内分泌治疗中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/treatments - 抗肿瘤治疗 5 条 */
async function handleOncologyTreatments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OT-001', patient: '王***（肺腺癌 IIIA 期）', treatmentType: '辅助化疗（GP 方案）', course: '第 2 周期/共 4 周期', efficacy: '病情稳定（SD），肿瘤标志物下降', doctor: '肿瘤科 李***主任医师' },
    { id: 'OT-002', patient: '李***（乳腺癌 IIB 期）', treatmentType: '内分泌治疗（来曲唑）', course: '第 6 个月/共 5 年', efficacy: '病情稳定（SD），骨密度正常', doctor: '乳腺外科 陈***副主任医师' },
    { id: 'OT-003', patient: '张***（结直肠癌 IV 期）', treatmentType: '姑息化疗+靶向（FOLFOX+西妥昔单抗）', course: '第 4 周期/共 8 周期', efficacy: '部分缓解（PR），肝转移灶缩小 30%', doctor: '肿瘤科 王***主任医师' },
    { id: 'OT-004', patient: '赵***（胃癌 III 期）', treatmentType: '术后辅助化疗（SOX 方案）', course: '第 1 周期/共 6 周期', efficacy: '刚启动，待评估', doctor: '胃肠外科 刘***副主任医师' },
    { id: 'OT-005', patient: '孙***（前列腺癌 T3N1M0）', treatmentType: '内分泌治疗（比卡鲁胺+戈舍瑞林）', course: '第 12 个月/长期', efficacy: '病情稳定（SD），PSA 降至 0.5ng/ml', doctor: '泌尿外科 张***主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/chemotherapy - 化疗方案 5 条 */
async function handleOncologyChemotherapy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OC-001', regimenName: 'GP 方案（非小细胞肺癌）', drugs: '吉西他滨+顺铂', dosage: '吉西他滨 1000mg/m² d1,d8 + 顺铂 75mg/m² d1', cycle: '每 21 天为 1 周期', indication: '晚期/术后辅助非小细胞肺癌' },
    { id: 'OC-002', regimenName: 'FOLFOX 方案（结直肠癌）', drugs: '奥沙利铂+亚叶酸钙+5-FU', dosage: '奥沙利铂 85mg/m² d1 + 亚叶酸钙 400mg/m² d1 + 5-FU 400mg/m² d1 + 2400mg/m² 46h', cycle: '每 14 天为 1 周期', indication: '晚期/术后辅助结直肠癌' },
    { id: 'OC-003', regimenName: 'SOX 方案（胃癌）', drugs: '奥沙利铂+S-1', dosage: '奥沙利铂 130mg/m² d1 + S-1 40mg/m² bid d1-d14', cycle: '每 21 天为 1 周期', indication: '晚期/术后辅助胃癌' },
    { id: 'OC-004', regimenName: 'AC-T 方案（乳腺癌）', drugs: '多柔比星+环磷酰胺→紫杉醇', dosage: '多柔比星 60mg/m² d1 + 环磷酰胺 600mg/m² d1 × 4 周期 → 紫杉醇 175mg/m² d1 × 4 周期', cycle: '每 21 天为 1 周期', indication: '术后辅助乳腺癌（淋巴结阳性）' },
    { id: 'OC-005', regimenName: 'TP 方案（卵巢癌）', drugs: '紫杉醇+卡铂', dosage: '紫杉醇 175mg/m² d1 + 卡铂 AUC 5 d1', cycle: '每 21 天为 1 周期', indication: '晚期卵巢癌一线化疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/radiotherapy - 放疗方案 5 条 */
async function handleOncologyRadiotherapy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OR-001', planName: '肺癌术后辅助放疗（三维适形）', dose: '50 Gy/25 次', fractions: '25 次（每周 5 次）', site: '原发灶瘤床+纵隔淋巴结引流区', indication: '非小细胞肺癌 IIIA 期术后辅助' },
    { id: 'OR-002', planName: '乳腺癌术后放疗（调强放疗 IMRT）', dose: '50 Gy/25 次 + 瘤床加量 10 Gy/5 次', fractions: '30 次', site: '患侧胸壁+锁骨上淋巴结引流区', indication: '乳腺癌 IIB 期术后辅助' },
    { id: 'OR-003', planName: '直肠癌新辅助放疗（短程放疗）', dose: '25 Gy/5 次', fractions: '5 次（1 周内完成）', site: '直肠原发灶+盆腔淋巴结引流区', indication: '局部进展期直肠癌新辅助治疗' },
    { id: 'OR-004', planName: '脑转移瘤立体定向放疗（SRS）', dose: '20 Gy/1 次', fractions: '1 次', site: '单个脑转移灶（直径 <3cm）', indication: '肺癌单发脑转移（KPS≥70）' },
    { id: 'OR-005', planName: '前列腺癌根治性放疗（调强放疗 IMRT）', dose: '78 Gy/39 次', fractions: '39 次（每周 5 次）', site: '前列腺+精囊+盆腔淋巴结引流区', indication: '前列腺癌 T3N1M0 根治性放疗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/monitor - 肿瘤监测 5 条 */
async function handleOncologyMonitor(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OM-001', patient: '王***（肺腺癌）', indicator: 'CEA（癌胚抗原）', result: '8.5 ng/ml', reference: '<5 ng/ml（轻度升高，较前下降）', time: '2026-10-18' },
    { id: 'OM-002', patient: '李***（乳腺癌）', indicator: 'CA15-3（糖类抗原 15-3）', result: '22 U/ml', reference: '<25 U/ml（正常范围）', time: '2026-10-15' },
    { id: 'OM-003', patient: '张***（结直肠癌）', indicator: 'CEA（癌胚抗原）', result: '15.2 ng/ml', reference: '<5 ng/ml（较前下降 30%）', time: '2026-10-16' },
    { id: 'OM-004', patient: '赵***（胃癌）', indicator: 'CA72-4（糖类抗原 72-4）', result: '12.5 U/ml', reference: '<6.9 U/ml（轻度升高）', time: '2026-10-17' },
    { id: 'OM-005', patient: '孙***（前列腺癌）', indicator: 'PSA（前列腺特异性抗原）', result: '0.5 ng/ml', reference: '<4 ng/ml（控制良好）', time: '2026-10-10' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/pain - 癌痛管理 5 条 */
async function handleOncologyPain(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OP-001', patient: '王***（肺腺癌骨转移）', painScore: 'NRS 6 分（中度疼痛）', medication: '奥施康定（羟考酮缓释片）10mg q12h + 即释吗啡 5mg prn', effect: '疼痛降至 NRS 2 分，控制良好', doctor: '疼痛科 周***主治医师' },
    { id: 'OP-002', patient: '李***（乳腺癌骨转移）', painScore: 'NRS 4 分（轻度疼痛）', medication: '塞来昔布 200mg bid + 加巴喷丁 300mg tid', effect: '疼痛降至 NRS 1 分，控制良好', doctor: '疼痛科 周***主治医师' },
    { id: 'OP-003', patient: '张***（结直肠癌肝转移）', painScore: 'NRS 7 分（中重度疼痛）', medication: '奥施康定 20mg q12h + 加巴喷丁 300mg tid + 即释吗啡 10mg prn', effect: '疼痛降至 NRS 3 分，仍需调整剂量', doctor: '疼痛科 吴***副主任医师' },
    { id: 'OP-004', patient: '赵***（胃癌腹膜转移）', painScore: 'NRS 5 分（中度疼痛）', medication: '奥施康定 10mg q12h + 阿米替林 25mg qn', effect: '疼痛降至 NRS 2 分，控制良好', doctor: '疼痛科 周***主治医师' },
    { id: 'OP-005', patient: '孙***（前列腺癌骨转移）', painScore: 'NRS 3 分（轻度疼痛）', medication: '塞来昔布 200mg bid', effect: '疼痛降至 NRS 1 分，控制良好', doctor: '疼痛科 郑***主治医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m312Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/oncology/patients', handle: handleOncologyPatients, auth: true },
  { method: 'GET', path: '/api/v1/oncology/treatments', handle: handleOncologyTreatments, auth: true },
  { method: 'GET', path: '/api/v1/oncology/chemotherapy', handle: handleOncologyChemotherapy, auth: true },
  { method: 'GET', path: '/api/v1/oncology/radiotherapy', handle: handleOncologyRadiotherapy, auth: true },
  { method: 'GET', path: '/api/v1/oncology/monitor', handle: handleOncologyMonitor, auth: true },
  { method: 'GET', path: '/api/v1/oncology/pain', handle: handleOncologyPain, auth: true },
];
