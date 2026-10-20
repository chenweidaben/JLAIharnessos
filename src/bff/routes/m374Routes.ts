/**
 * 健澜科技 jlmedaios - M374 P1 业务扩展：肿瘤医学深度打磨
 *
 * 肿瘤筛查/肿瘤诊断/治疗方案/肿瘤随访（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/oncology/screening - 肿瘤筛查 5 条 */
async function handleOncologyScreening(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OS-001', patientName: '张***（55 岁男性，肺癌筛查）', screeningItem: '低剂量螺旋 CT（LDCT）', result: '右肺上叶结节 1.5cm（可疑恶性）', riskLevel: '中风险（需进一步检查）', doctor: '胸外科主治医师李***' },
    { id: 'OS-002', patientName: '李***（50 岁女性，乳腺癌筛查）', screeningItem: '乳腺超声 + 钼靶', result: '左乳外上象限结节 2.0cm（可疑恶性）', riskLevel: '中风险（需进一步检查）', doctor: '乳腺外科副主任医师赵***' },
    { id: 'OS-003', patientName: '王***（60 岁男性，结直肠癌筛查）', screeningItem: '肠镜检查', result: '乙状结肠息肉 1.0cm（病理提示管状腺瘤，低级别上皮内瘤变）', riskLevel: '低风险（良性息肉，已切除）', doctor: '消化内科主治医师孙***' },
    { id: 'OS-004', patientName: '刘***（65 岁男性，胃癌筛查）', screeningItem: '胃镜检查', result: '胃窦部溃疡 1.5cm（病理提示慢性萎缩性胃炎，伴肠化生）', riskLevel: '中风险（需定期复查胃镜）', doctor: '消化内科副主任医师周***' },
    { id: 'OS-005', patientName: '陈***（45 岁女性，宫颈癌筛查）', screeningItem: 'TCT + HPV 检测', result: 'TCT 正常（未见上皮内病变或恶性细胞）、HPV 阴性', riskLevel: '低风险（正常）', doctor: '妇科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/diagnosis - 肿瘤诊断 5 条 */
async function handleOncologyDiagnosis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OD-001', patientName: '张***（55 岁男性）', disease: '右肺腺癌（非小细胞肺癌）', stage: 'ⅡA 期（T2N0M0）', diagnosisBasis: '胸部 CT 提示右肺上叶结节 3.0cm、支气管镜活检病理提示腺癌、未见淋巴结转移', doctor: '胸外科主任医师李***' },
    { id: 'OD-002', patientName: '李***（50 岁女性）', disease: '左乳浸润性导管癌', stage: 'ⅡB 期（T2N1M0）', diagnosisBasis: '乳腺超声提示左乳结节 2.5cm、乳腺钼靶提示恶性钙化、穿刺活检病理提示浸润性导管癌、腋窝淋巴结转移 1/10', doctor: '乳腺外科主任医师赵***' },
    { id: 'OD-003', patientName: '王***（60 岁男性）', disease: '乙状结肠癌', stage: 'ⅢB 期（T3N1M0）', diagnosisBasis: '肠镜提示乙状结肠肿物 3.0cm、活检病理提示腺癌、CT 提示肠壁增厚、肠系膜淋巴结转移 2/12', doctor: '普外科主任医师孙***' },
    { id: 'OD-004', patientName: '刘***（65 岁男性）', disease: '胃窦部腺癌', stage: 'ⅢA 期（T3N2M0）', diagnosisBasis: '胃镜提示胃窦部溃疡型肿物 4.0cm、活检病理提示腺癌、CT 提示胃壁增厚、腹腔淋巴结转移 3/15', doctor: '消化内科主任医师周***' },
    { id: 'OD-005', patientName: '陈***（45 岁女性）', disease: '甲状腺乳头状癌', stage: 'Ⅰ期（T1N0M0）', diagnosisBasis: '甲状腺超声提示右叶结节 1.0cm（可疑恶性）、穿刺活检病理提示乳头状癌、未见淋巴结转移', doctor: '甲状腺外科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/treatment-plan - 治疗方案 5 条 */
async function handleOncologyTreatmentPlan(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OTP-001', patientName: '张***（55 岁男性，右肺腺癌 ⅡA 期）', planName: '手术 + 辅助化疗（肺叶切除术 + 顺铂 + 培美曲塞化疗 4 周期）', treatmentCycle: '手术 1 次（2026-11-01）+ 化疗 4 周期（每 3 周 1 周期，共 12 周）', doctor: '胸外科主任医师李***', status: '已制定（待执行）' },
    { id: 'OTP-002', patientName: '李***（50 岁女性，左乳浸润性导管癌 ⅡB 期）', planName: '手术 + 辅助化疗 + 放疗（乳腺癌改良根治术 + AC-T 方案化疗 4 周期 + 放疗 25 次）', treatmentCycle: '手术 1 次（2026-11-15）+ 化疗 4 周期（每 3 周 1 周期，共 12 周）+ 放疗 25 次（每周 5 次，共 5 周）', doctor: '乳腺外科主任医师赵***', status: '已制定（待执行）' },
    { id: 'OTP-003', patientName: '王***（60 岁男性，乙状结肠癌 ⅢB 期）', planName: '手术 + 辅助化疗（结肠癌根治术 + 奥沙利铂 + 卡培他滨化疗 8 周期）', treatmentCycle: '手术 1 次（2026-11-10）+ 化疗 8 周期（每 2 周 1 周期，共 16 周）', doctor: '普外科主任医师孙***', status: '已制定（待执行）' },
    { id: 'OTP-004', patientName: '刘***（65 岁男性，胃窦部腺癌 ⅢA 期）', planName: '新辅助化疗 + 手术 + 辅助化疗（SOX 方案化疗 2 周期 + 胃癌根治术 + SOX 方案化疗 4 周期）', treatmentCycle: '新辅助化疗 2 周期（每 3 周 1 周期，共 6 周）+ 手术 1 次（2026-12-01）+ 辅助化疗 4 周期（每 3 周 1 周期，共 12 周）', doctor: '消化内科主任医师周***', status: '已制定（待执行）' },
    { id: 'OTP-005', patientName: '陈***（45 岁女性，甲状腺乳头状癌 Ⅰ期）', planName: '手术（甲状腺右叶切除术 + 中央区淋巴结清扫）', treatmentCycle: '手术 1 次（2026-11-20）', doctor: '甲状腺外科主治医师吴***', status: '已制定（待执行）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/oncology/followup - 肿瘤随访 5 条 */
async function handleOncologyFollowup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OF-001', patientName: '张***（55 岁男性，右肺腺癌术后 3 个月）', followupTime: '2026-10-20（术后 3 个月随访）', metric: '胸部 CT（未见复发转移）、肿瘤标志物 CEA（3.5 ng/mL，正常）', result: '恢复良好，未见复发转移，继续定期随访', doctor: '胸外科主任医师李***' },
    { id: 'OF-002', patientName: '李***（50 岁女性，左乳癌术后 6 个月）', followupTime: '2026-10-20（术后 6 个月随访）', metric: '乳腺超声（未见复发）、肿瘤标志物 CA153（25 U/mL，正常）、妇科超声（正常）', result: '恢复良好，未见复发转移，继续定期随访', doctor: '乳腺外科主任医师赵***' },
    { id: 'OF-003', patientName: '王***（60 岁男性，乙状结肠癌术后 12 个月）', followupTime: '2026-10-20（术后 12 个月随访）', metric: '肠镜（未见复发）、肿瘤标志物 CEA（2.8 ng/mL，正常）、腹部 CT（未见转移）', result: '恢复良好，未见复发转移，继续定期随访', doctor: '普外科主任医师孙***' },
    { id: 'OF-004', patientName: '刘***（65 岁男性，胃癌术后 18 个月）', followupTime: '2026-10-20（术后 18 个月随访）', metric: '胃镜（未见复发）、肿瘤标志物 CEA（3.2 ng/mL，正常）、腹部 CT（未见转移）', result: '恢复良好，未见复发转移，继续定期随访', doctor: '消化内科主任医师周***' },
    { id: 'OF-005', patientName: '陈***（45 岁女性，甲状腺癌术后 24 个月）', followupTime: '2026-10-20（术后 24 个月随访）', metric: '甲状腺超声（未见复发）、甲状腺功能（TSH 0.5 mIU/L，正常）、肿瘤标志物 TG（0.5 ng/mL，正常）', result: '恢复良好，未见复发转移，继续定期随访', doctor: '甲状腺外科主治医师吴***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m374Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/oncology/screening', handle: handleOncologyScreening, auth: true },
  { method: 'GET', path: '/api/v1/oncology/diagnosis', handle: handleOncologyDiagnosis, auth: true },
  { method: 'GET', path: '/api/v1/oncology/treatment-plan', handle: handleOncologyTreatmentPlan, auth: true },
  { method: 'GET', path: '/api/v1/oncology/followup', handle: handleOncologyFollowup, auth: true },
];
