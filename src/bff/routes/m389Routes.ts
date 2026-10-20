/**
 * 健澜科技 jlmedaios - M389 P1 业务扩展：电子签名审计追踪深度打磨
 *
 * 签名列表/签名验证/签名模板（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/signatures/list - 签名列表 5 条 */
async function handleSignaturesList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SL-001', signatureId: 'SIG-2026-1001', signer: '内科医生张***（主治医师）', file: '入院记录（患者：李***）', time: '2026-10-20 09:00:00（签名时间）', status: '已签名（签名有效，文件未被篡改）' },
    { id: 'SL-002', signatureId: 'SIG-2026-1002', signer: '外科医生李***（副主任医师）', file: '手术记录（患者：王***）', time: '2026-10-20 10:00:00（签名时间）', status: '已签名（签名有效，文件未被篡改）' },
    { id: 'SL-003', signatureId: 'SIG-2026-1003', signer: '护士王***（主管护师）', file: '护理记录（患者：刘***）', time: '2026-10-20 11:00:00（签名时间）', status: '已签名（签名有效，文件未被篡改）' },
    { id: 'SL-004', signatureId: 'SIG-2026-1004', signer: '药师赵***（主管药师）', file: '处方审核记录（患者：陈***）', time: '2026-10-20 14:00:00（签名时间）', status: '已签名（签名有效，文件未被篡改）' },
    { id: 'SL-005', signatureId: 'SIG-2026-1005', signer: '医技人员孙***（检验科技师）', file: '检验报告（患者：杨***）', time: '2026-10-20 15:00:00（签名时间）', status: '已签名（签名有效，文件未被篡改）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/signatures/verify - 签名验证 5 条 */
async function handleSignaturesVerify(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SV-001', signatureId: 'SIG-2026-1001', file: '入院记录（患者：李***）', verifyResult: '验证通过（签名有效，文件未被篡改）', time: '2026-10-20 09:30:00（验证时间）', status: '验证通过（签名有效）' },
    { id: 'SV-002', signatureId: 'SIG-2026-1002', file: '手术记录（患者：王***）', verifyResult: '验证通过（签名有效，文件未被篡改）', time: '2026-10-20 10:30:00（验证时间）', status: '验证通过（签名有效）' },
    { id: 'SV-003', signatureId: 'SIG-2026-1003', file: '护理记录（患者：刘***）', verifyResult: '验证通过（签名有效，文件未被篡改）', time: '2026-10-20 11:30:00（验证时间）', status: '验证通过（签名有效）' },
    { id: 'SV-004', signatureId: 'SIG-2026-1004', file: '处方审核记录（患者：陈***）', verifyResult: '验证通过（签名有效，文件未被篡改）', time: '2026-10-20 14:30:00（验证时间）', status: '验证通过（签名有效）' },
    { id: 'SV-005', signatureId: 'SIG-2026-1005', file: '检验报告（患者：杨***）', verifyResult: '验证通过（签名有效，文件未被篡改）', time: '2026-10-20 15:30:00（验证时间）', status: '验证通过（签名有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/signatures/templates - 签名模板 5 条 */
async function handleSignaturesTemplates(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ST-001', templateName: '医生签名模板（标准版）', type: '手写签名（电子）', style: '黑色钢笔字体，大小适中', status: '已启用（当前使用）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'ST-002', templateName: '护士签名模板（标准版）', type: '手写签名（电子）', style: '黑色钢笔字体，大小适中', status: '已启用（当前使用）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'ST-003', templateName: '药师签名模板（标准版）', type: '手写签名（电子）', style: '黑色钢笔字体，大小适中', status: '已启用（当前使用）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'ST-004', templateName: '医技人员签名模板（标准版）', type: '手写签名（电子）', style: '黑色钢笔字体，大小适中', status: '已启用（当前使用）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'ST-005', templateName: '科室主任签名模板（标准版）', type: '手写签名（电子）', style: '黑色钢笔字体，大小适中', status: '已启用（当前使用）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m389Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/signatures/list', handle: handleSignaturesList, auth: true },
  { method: 'GET', path: '/api/v1/signatures/verify', handle: handleSignaturesVerify, auth: true },
  { method: 'GET', path: '/api/v1/signatures/templates', handle: handleSignaturesTemplates, auth: true },
];
