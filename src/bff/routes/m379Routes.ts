/**
 * 健澜科技 jlmedaios - M379 P1 业务扩展：手术麻醉深度打磨
 *
 * 手术同意书/麻醉评估/麻醉复苏（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/surgery/consent - 手术同意书 5 条 */
async function handleSurgeryConsent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SC-001', patientName: '张***（55 岁男性，胆囊结石患者）', surgeryName: '腹腔镜胆囊切除术', signTime: '2026-10-15 09:00:00（签署时间）', doctor: '普外科主任医师李***', status: '已签署（患者本人签署，已告知手术风险及替代方案）' },
    { id: 'SC-002', patientName: '李***（60 岁女性，子宫肌瘤患者）', surgeryName: '腹腔镜子宫肌瘤切除术', signTime: '2026-10-16 10:00:00（签署时间）', doctor: '妇科副主任医师赵***', status: '已签署（患者本人签署，已告知手术风险及替代方案）' },
    { id: 'SC-003', patientName: '王***（65 岁男性，腹股沟疝患者）', surgeryName: '腹股沟疝修补术（无张力修补）', signTime: '2026-10-17 14:00:00（签署时间）', doctor: '普外科主治医师孙***', status: '已签署（患者本人签署，已告知手术风险及替代方案）' },
    { id: 'SC-004', patientName: '刘***（70 岁女性，膝关节骨关节炎患者）', surgeryName: '全膝关节置换术', signTime: '2026-10-18 11:00:00（签署时间）', doctor: '骨科主任医师周***', status: '已签署（患者本人签署，已告知手术风险及替代方案）' },
    { id: 'SC-005', patientName: '陈***（50 岁男性，甲状腺结节患者）', surgeryName: '甲状腺右叶切除术', signTime: '2026-10-19 15:00:00（签署时间）', doctor: '甲状腺外科主治医师吴***', status: '已签署（患者本人签署，已告知手术风险及替代方案）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/assessment - 麻醉评估 5 条 */
async function handleAnesthesiaAssessment(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AA-001', patientName: '张***（55 岁男性，胆囊结石患者）', assessmentItem: 'ASA 分级评估（美国麻醉医师协会分级）', result: 'ASA II 级（轻度系统性疾病，功能代偿健全）', level: 'II 级（可耐受常规麻醉）', anesthesiologist: '麻醉科主治医师李***' },
    { id: 'AA-002', patientName: '李***（60 岁女性，子宫肌瘤患者）', assessmentItem: 'ASA 分级评估 + 气道评估', result: 'ASA II 级（轻度系统性疾病，功能代偿健全）+ 气道评估正常（Mallampati I 级）', level: 'II 级（可耐受常规麻醉）', anesthesiologist: '麻醉科副主任医师赵***' },
    { id: 'AA-003', patientName: '王***（65 岁男性，腹股沟疝患者）', assessmentItem: 'ASA 分级评估 + 心血管评估', result: 'ASA III 级（严重系统性疾病，功能受限）+ 心电图正常（窦性心律，无心肌缺血表现）', level: 'III 级（麻醉风险较高，需谨慎）', anesthesiologist: '麻醉科主治医师孙***' },
    { id: 'AA-004', patientName: '刘***（70 岁女性，膝关节骨关节炎患者）', assessmentItem: 'ASA 分级评估 + 肺功能评估', result: 'ASA III 级（严重系统性疾病，功能受限）+ 肺功能正常（FEV1 占预计值 85%）', level: 'III 级（麻醉风险较高，需谨慎）', anesthesiologist: '麻醉科副主任医师周***' },
    { id: 'AA-005', patientName: '陈***（50 岁男性，甲状腺结节患者）', assessmentItem: 'ASA 分级评估 + 甲状腺功能评估', result: 'ASA I 级（正常健康患者）+ 甲状腺功能正常（TSH 1.5 mIU/L）', level: 'I 级（可耐受常规麻醉）', anesthesiologist: '麻醉科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/anesthesia/recovery - 麻醉复苏 5 条 */
async function handleAnesthesiaRecovery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AR-001', patientName: '张***（55 岁男性，腹腔镜胆囊切除术后）', recoveryTime: '2026-10-15 11:00:00（复苏开始时间）', score: 'Aldrete 评分 10 分（满分 10 分）', status: '复苏良好（可返回病房）', anesthesiologist: '麻醉科主治医师李***' },
    { id: 'AR-002', patientName: '李***（60 岁女性，腹腔镜子宫肌瘤切除术后）', recoveryTime: '2026-10-16 12:00:00（复苏开始时间）', score: 'Aldrete 评分 9 分（满分 10 分）', status: '复苏良好（可返回病房）', anesthesiologist: '麻醉科副主任医师赵***' },
    { id: 'AR-003', patientName: '王***（65 岁男性，腹股沟疝修补术后）', recoveryTime: '2026-10-17 16:00:00（复苏开始时间）', score: 'Aldrete 评分 8 分（满分 10 分）', status: '复苏良好（可返回病房）', anesthesiologist: '麻醉科主治医师孙***' },
    { id: 'AR-004', patientName: '刘***（70 岁女性，全膝关节置换术后）', recoveryTime: '2026-10-18 13:00:00（复苏开始时间）', score: 'Aldrete 评分 7 分（满分 10 分）', status: '复苏良好（可返回病房）', anesthesiologist: '麻醉科副主任医师周***' },
    { id: 'AR-005', patientName: '陈***（50 岁男性，甲状腺右叶切除术后）', recoveryTime: '2026-10-19 17:00:00（复苏开始时间）', score: 'Aldrete 评分 10 分（满分 10 分）', status: '复苏良好（可返回病房）', anesthesiologist: '麻醉科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m379Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/surgery/consent', handle: handleSurgeryConsent, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/assessment', handle: handleAnesthesiaAssessment, auth: true },
  { method: 'GET', path: '/api/v1/anesthesia/recovery', handle: handleAnesthesiaRecovery, auth: true },
];
