/**
 * 健澜科技 jlmedaios - M347 P0 合规改造：电子签名 + 审计追踪
 *
 * 签名验证/签名模板 + 审计追踪（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/sign-verify - 签名验证 5 条 */
async function handleEmrSignVerify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ESV-001', signId: 'SIGN-2026-000001', signer: '李***（心内科主治医师，执业证书编号：110330106000123）', verifyResult: '验证通过（签名有效，证书未过期，未被篡改）', time: '2026-10-20 09:30:00（签名时间）', certificate: 'CFCA 电子认证证书（有效期：2025-01-01 至 2027-01-01）' },
    { id: 'ESV-002', signId: 'SIGN-2026-000002', signer: '王***（普外科副主任医师，执业证书编号：110330106000456）', verifyResult: '验证通过（签名有效，证书未过期，未被篡改）', time: '2026-10-20 10:00:00（签名时间）', certificate: 'CFCA 电子认证证书（有效期：2025-03-15 至 2027-03-15）' },
    { id: 'ESV-003', signId: 'SIGN-2026-000003', signer: '赵***（骨科主任医师，执业证书编号：110330106000789）', verifyResult: '验证通过（签名有效，证书未过期，未被篡改）', time: '2026-10-20 10:30:00（签名时间）', certificate: 'CFCA 电子认证证书（有效期：2024-06-01 至 2026-06-01，已过期，需重新申请）' },
    { id: 'ESV-004', signId: 'SIGN-2026-000004', signer: '周***（普外科副主任医师，执业证书编号：110330106000234）', verifyResult: '验证通过（签名有效，证书未过期，未被篡改）', time: '2026-10-20 11:00:00（签名时间）', certificate: 'CFCA 电子认证证书（有效期：2025-05-20 至 2027-05-20）' },
    { id: 'ESV-005', signId: 'SIGN-2026-000005', signer: '郑***（胸外科主任医师，执业证书编号：110330106000567）', verifyResult: '验证失败（签名无效，病历内容已被篡改）', time: '2026-10-20 14:00:00（签名时间）', certificate: 'CFCA 电子认证证书（有效期：2025-08-10 至 2027-08-10）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/sign-templates - 签名模板 5 条 */
async function handleEmrSignTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EST-001', templateName: '病历书写签名模板', type: '病历签名（住院病历、门诊病历）', content: '本人确认已如实书写本病历内容，对病历的真实性、完整性负责', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'EST-002', templateName: '处方审核签名模板', type: '处方签名（门诊处方、住院处方）', content: '本人确认已审核本处方，处方用药合理，符合诊疗规范', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'EST-003', templateName: '手术知情同意书签名模板', type: '知情同意书签名（手术、麻醉、特殊检查）', content: '本人确认已向患者（或患者家属）详细告知本手术（或检查）的目的、风险、替代方案，患者（或患者家属）已充分理解并同意', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'EST-004', templateName: '出院小结签名模板', type: '出院文书签名（出院小结、诊断证明）', content: '本人确认本出院小结内容真实、完整，患者已达到出院标准', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'EST-005', templateName: '会诊意见签名模板', type: '会诊文书签名（院内会诊、院外会诊）', content: '本人确认本会诊意见基于患者病情和检查结果提出，仅供参考', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/trails - 审计追踪 5 条 */
async function handleAuditTrails(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AT-001', trailId: 'TRAIL-2026-10-20-000001', user: '李***（心内科主治医师）', operation: '查看了患者张***的住院病历（住院号：ZY-2026-000123）', resource: '住院病历（medical-records）', time: '2026-10-20 09:00:00' },
    { id: 'AT-002', trailId: 'TRAIL-2026-10-20-000002', user: '李***（心内科主治医师）', operation: '修改了患者张***的住院病历（修改了"既往史"部分，新增"高血压病史 10 年"）', resource: '住院病历（medical-records）', time: '2026-10-20 09:15:00' },
    { id: 'AT-003', trailId: 'TRAIL-2026-10-20-000003', user: '王***（主管药师）', operation: '审核了患者王***的门诊处方（处方号：RX-2026-OP-000002）', resource: '处方（prescriptions）', time: '2026-10-20 10:00:00' },
    { id: 'AT-004', trailId: 'TRAIL-2026-10-20-000004', user: '赵***（骨科主任医师）', operation: '导出了患者刘***的手术记录（住院号：ZY-2026-000456）', resource: '手术记录（surgery-records）', time: '2026-10-20 11:00:00' },
    { id: 'AT-005', trailId: 'TRAIL-2026-10-20-000005', user: '周***（普外科副主任医师）', operation: '签署了患者孙***的出院小结（住院号：ZY-2026-000789）', resource: '出院小结（discharge-summary）', time: '2026-10-20 14:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m347Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/sign-verify', handle: handleEmrSignVerify, auth: true },
  { method: 'GET', path: '/api/v1/emr/sign-templates', handle: handleEmrSignTemplates, auth: true },
  { method: 'GET', path: '/api/v1/audit/trails', handle: handleAuditTrails, auth: true },
];
