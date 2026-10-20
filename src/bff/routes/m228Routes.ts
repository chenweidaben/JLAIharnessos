/**
 * 健澜科技 jlmedaios - M228 肿瘤慢病康复深度
 *
 * 肿瘤患者/化疗/放疗 + 糖尿病/高血压 + 康复计划/评估
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、肿瘤管理 ==================== */

/** GET /api/v1/oncology/patients - 肿瘤患者 */
async function handleOncologyPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patients = [
    { id: 'ONC-001', name: '张演示', diagnosis: '肺癌（腺癌）', stage: 'III 期', pathology: '中分化腺癌', treatment: '化疗+免疫治疗', status: '治疗中' },
    { id: 'ONC-002', name: '李患者', diagnosis: '乳腺癌', stage: 'II 期', pathology: '浸润性导管癌', treatment: '手术+化疗', status: '治疗中' },
    { id: 'ONC-003', name: '王先生', diagnosis: '胃癌', stage: 'IV 期', pathology: '低分化腺癌', treatment: '姑息化疗', status: '随访中' },
    { id: 'ONC-004', name: '赵女士', diagnosis: '结肠癌', stage: 'I 期', pathology: '高分化腺癌', treatment: '手术切除', status: '已出院' },
    { id: 'ONC-005', name: '刘大爷', diagnosis: '肝癌', stage: 'III 期', pathology: '肝细胞癌', treatment: '介入治疗', status: '治疗中' },
  ];

  return json(ok({ patients, totalCount: patients.length }));
}

/** GET /api/v1/oncology/chemo - 化疗记录 */
async function handleOncologyChemo(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const chemo = [
    { id: 'CHE-001', patient: '张演示', regimen: 'AP方案（培美曲塞+顺铂）', cycle: '第 3 周期', drugs: '培美曲塞 500mg/m² + 顺铂 75mg/m²', sideEffects: '恶心呕吐（II 度）', efficacy: 'PR（部分缓解）' },
    { id: 'CHE-002', patient: '李患者', regimen: 'TC方案（紫杉醇+卡铂）', cycle: '第 2 周期', drugs: '紫杉醇 175mg/m² + 卡铂 AUC=5', sideEffects: '脱发（III 度）+ 骨髓抑制（II 度）', efficacy: 'PR（部分缓解）' },
    { id: 'CHE-003', patient: '王先生', regimen: 'FOLFOX方案', cycle: '第 4 周期', drugs: '奥沙利铂 85mg/m² + 亚叶酸钙 400mg/m² + 5-FU 400mg/m²', sideEffects: '手足综合征（I 度）', efficacy: 'SD（稳定）' },
    { id: 'CHE-004', patient: '刘大爷', regimen: 'TACE（肝动脉栓塞化疗）', cycle: '第 2 次', drugs: '表阿霉素 50mg + 碘化油 10ml', sideEffects: '发热（I 度）', efficacy: 'SD（稳定）' },
    { id: 'CHE-005', patient: '陈患者', regimen: 'GP方案（吉西他滨+顺铂）', cycle: '第 1 周期', drugs: '吉西他滨 1000mg/m² + 顺铂 75mg/m²', sideEffects: '骨髓抑制（I 度）', efficacy: '待评价' },
  ];

  return json(ok({ chemo, totalCount: chemo.length }));
}

/** GET /api/v1/oncology/radiation - 放疗记录 */
async function handleOncologyRadiation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const radiation = [
    { id: 'RAD-001', patient: '张演示', site: '右肺原发灶+纵隔淋巴结', totalDose: 60.0, fractions: 30, device: '直线加速器（VMAT）', efficacy: 'PR（部分缓解）' },
    { id: 'RAD-002', patient: '李患者', site: '左乳术后瘤床+区域淋巴结', totalDose: 50.0, fractions: 25, device: '直线加速器（IMRT）', efficacy: 'CR（完全缓解）' },
    { id: 'RAD-003', patient: '刘大爷', site: '肝右叶病灶', totalDose: 45.0, fractions: 15, device: '伽马刀', efficacy: 'SD（稳定）' },
  ];

  return json(ok({ radiation, totalCount: radiation.length }));
}

/* ==================== 二、慢病管理 ==================== */

/** GET /api/v1/chronic/diabetes - 糖尿病管理 */
async function handleChronicDiabetes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const diabetes = [
    { id: 'DIA-001', patient: '张演示', hba1c: 7.2, fastingGlucose: 7.5, medication: '二甲双胍 0.5g tid', complications: '糖尿病视网膜病变（轻度）', followUp: '2026-10-15' },
    { id: 'DIA-002', patient: '李患者', hba1c: 8.5, fastingGlucose: 9.2, medication: '胰岛素（门冬 30R）早晚皮下注射', complications: '糖尿病肾病（III 期）', followUp: '2026-10-10' },
    { id: 'DIA-003', patient: '王先生', hba1c: 6.8, fastingGlucose: 6.5, medication: '二甲双胍 0.5g bid', complications: '无', followUp: '2026-10-18' },
    { id: 'DIA-004', patient: '赵女士', hba1c: 9.5, fastingGlucose: 11.0, medication: '胰岛素泵持续皮下输注', complications: '糖尿病周围神经病变', followUp: '2026-10-05' },
    { id: 'DIA-005', patient: '刘大爷', hba1c: 7.8, fastingGlucose: 8.0, medication: '格列美脲 2mg qd + 二甲双胍 0.5g bid', complications: '无', followUp: '2026-10-12' },
  ];

  return json(ok({ diabetes, totalCount: diabetes.length }));
}

/** GET /api/v1/chronic/hypertension - 高血压管理 */
async function handleChronicHypertension(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const hypertension = [
    { id: 'HYP-001', patient: '张演示', systolic: 145, diastolic: 92, medication: '氨氯地平 5mg qd', compliance: '好', targetOrganDamage: '左心室肥厚（轻度）', followUp: '2026-10-15' },
    { id: 'HYP-002', patient: '李患者', systolic: 165, diastolic: 100, medication: '缬沙坦 80mg qd + 氨氯地平 5mg qd', compliance: '一般', targetOrganDamage: '蛋白尿（+）', followUp: '2026-10-10' },
    { id: 'HYP-003', patient: '王先生', systolic: 135, diastolic: 85, medication: '生活方式干预（限盐运动）', compliance: '好', targetOrganDamage: '无', followUp: '2026-10-18' },
    { id: 'HYP-004', patient: '赵女士', systolic: 175, diastolic: 105, medication: '缬沙坦 160mg qd + 氢氯噻嗪 25mg qd', compliance: '差', targetOrganDamage: '左心室肥厚（中度）', followUp: '2026-10-05' },
    { id: 'HYP-005', patient: '刘大爷', systolic: 140, diastolic: 90, medication: '氨氯地平 5mg qd', compliance: '好', targetOrganDamage: '无', followUp: '2026-10-12' },
  ];

  return json(ok({ hypertension, totalCount: hypertension.length }));
}

/* ==================== 三、康复管理 ==================== */

/** GET /api/v1/rehab/plans - 康复计划 */
async function handleRehabPlans(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const plans = [
    { id: 'REH-001', patient: '张演示', diagnosis: '脑卒中（右侧偏瘫）', goal: '恢复步行能力，提高日常生活自理能力', therapist: '王治疗师', items: '运动疗法（PT）+ 作业疗法（OT）', progress: '已完成 15/20 次' },
    { id: 'REH-002', patient: '李患者', diagnosis: '股骨骨折术后', goal: '恢复下肢肌力，改善关节活动度', therapist: '李治疗师', items: '运动疗法（PT）+ 物理因子治疗', progress: '已完成 8/12 次' },
    { id: 'REH-003', patient: '王先生', diagnosis: '全髋关节置换术后', goal: '恢复髋关节功能，独立步行', therapist: '张治疗师', items: '运动疗法（PT）', progress: '已完成 10/15 次' },
    { id: 'REH-004', patient: '赵女士', diagnosis: '脊髓损伤（C6 水平）', goal: '提高上肢功能，使用辅助器具', therapist: '赵治疗师', items: '运动疗法（PT）+ 作业疗法（OT）+ 言语治疗', progress: '已完成 20/30 次' },
    { id: 'REH-005', patient: '刘大爷', diagnosis: '帕金森病', goal: '改善平衡功能，提高步行稳定性', therapist: '孙治疗师', items: '运动疗法（PT）', progress: '已完成 5/10 次' },
  ];

  return json(ok({ plans, totalCount: plans.length }));
}

/** GET /api/v1/rehab/evaluations - 康复评估 */
async function handleRehabEvaluations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const evaluations = [
    { id: 'EVA-001', patient: '张演示', scale: 'Fugl-Meyer 运动功能评分', score: 65, trend: '进步（上周 58）', suggestion: '继续加强上肢功能训练' },
    { id: 'EVA-002', patient: '李患者', scale: 'Barthel 指数（日常生活能力）', score: 80, trend: '进步（上周 65）', suggestion: '增加步行训练强度' },
    { id: 'EVA-003', patient: '赵女士', scale: 'FIM（功能独立性评定）', score: 95, trend: '稳定（上周 93）', suggestion: '继续维持上肢功能训练' },
  ];

  return json(ok({ evaluations, totalCount: evaluations.length }));
}

export const m228Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/oncology/patients', handle: handleOncologyPatients, auth: true },
  { method: 'GET', path: '/api/v1/oncology/chemo', handle: handleOncologyChemo, auth: true },
  { method: 'GET', path: '/api/v1/oncology/radiation', handle: handleOncologyRadiation, auth: true },
  { method: 'GET', path: '/api/v1/chronic/diabetes', handle: handleChronicDiabetes, auth: true },
  { method: 'GET', path: '/api/v1/chronic/hypertension', handle: handleChronicHypertension, auth: true },
  { method: 'GET', path: '/api/v1/rehab/plans', handle: handleRehabPlans, auth: true },
  { method: 'GET', path: '/api/v1/rehab/evaluations', handle: handleRehabEvaluations, auth: true },
];
