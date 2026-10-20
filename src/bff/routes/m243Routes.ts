/**
 * 健澜科技 jlmedaios - M243 合规差距继续补强（病历防篡改与患者权利）
 *
 * 电子签名验证/病历水印 + 患者授权/数据最小化/匿名化/删除请求
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病历防篡改 ==================== */

/** GET /api/v1/emr/signature - 电子签名验证 */
async function handleEmrSignature(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const result = {
    signatureId: 'SIG-2026-00451',
    mrn: 'EMR-MRN-100451',
    signer: '赵医生（主治）',
    certInfo: '省卫健委 CA / 序列号 1234567890 / RSA-2048',
    timestamp: '2026-10-20 11:00:23',
    hash: 'sha256:9f8e7d6c5b4a39281706f5e4d3c2b1a0987654321fedcba09876543210fedcba',
    verifyStatus: '有效',
  };

  return json(ok(result));
}

/** GET /api/v1/emr/watermark - 病历水印配置 */
async function handleEmrWatermark(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const config = {
    content: '患者ID(P-MRN-100451) + 时间戳(2026-10-20 11:00:23) + 操作人(赵医生)',
    position: '全屏平铺',
    opacity: 0.12,
    applicableRoles: ['doctor', 'nurse', 'admin'],
  };

  return json(ok(config));
}

/* ==================== 二、患者权利与数据最小化 ==================== */

/** GET /api/v1/security/consent - 患者授权管理 */
async function handleSecurityConsent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const consents = [
    { id: 'CST-001', patient: '张***', item: '院内数据共享', grantTime: '2026-01-10 09:00', validUntil: '2027-01-10', status: '已授权' },
    { id: 'CST-002', patient: '李***', item: '科研使用（去标识化）', grantTime: '2026-03-15 14:00', validUntil: '2028-03-15', status: '已授权' },
    { id: 'CST-003', patient: '王***', item: '第三方披露（商保理赔）', grantTime: '2025-06-01 10:00', validUntil: '2026-06-01', status: '已过期' },
    { id: 'CST-004', patient: '赵***', item: '科研使用（去标识化）', grantTime: '2026-05-20 16:00', validUntil: '2029-05-20', status: '已撤销（患者主动）' },
  ];

  return json(ok({ consents, totalCount: consents.length }));
}

/** GET /api/v1/security/minimize - 数据最小化 */
async function handleSecurityMinimize(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const fields = [
    { field: '身份证号', sensitivity: '高', maskRule: '仅前6后4，中间掩码', scenario: '一般查询/统计' },
    { field: '手机号', sensitivity: '高', maskRule: '前3后4，中间掩码', scenario: '一般查询' },
    { field: '家庭住址', sensitivity: '中', maskRule: '保留到区/县，详细掩码', scenario: '报表导出' },
    { field: '过敏史', sensitivity: '中', maskRule: '按角色脱敏（医护可见/统计仅类别）', scenario: '跨科室共享' },
    { field: '就诊卡号', sensitivity: '低', maskRule: '明文（业务必需）', scenario: '全场景' },
  ];

  return json(ok({ fields, totalCount: fields.length }));
}

/** GET /api/v1/security/anonymization - 数据匿名化 */
async function handleSecurityAnonymization(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const results = [
    { dataType: '门诊数据集（10万条）', method: 'k-匿名（k=10）+ l-多样性（l=3）', quality: '信息损失率 8.2%', usability: '统计/科研可用，不可还原个体' },
    { dataType: '住院数据集（5万条）', method: 't-closeness（t=0.2）', quality: '信息损失率 11.5%', usability: '科研建模可用' },
  ];

  return json(ok({ results, totalCount: results.length }));
}

/** GET /api/v1/security/deletion - 数据删除请求 */
async function handleSecurityDeletion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const requests = [
    { id: 'DEL-001', patient: '王***', dataType: '诊疗记录（2024-2025）', reason: '患者撤回授权', approval: '已审批（医务科）', execution: '已删除（备份归档中留存 90 天后销毁）' },
    { id: 'DEL-002', patient: '赵***', dataType: '检验结果全量', reason: '患者行使删除权', approval: '审批中', execution: '待处理' },
    { id: 'DEL-003', patient: '张***', dataType: '影像资料', reason: '数据错误需更正', approval: '已拒绝（涉病历法定留存期）', execution: '已拒绝' },
  ];

  return json(ok({ requests, totalCount: requests.length }));
}

export const m243Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/signature', handle: handleEmrSignature, auth: true },
  { method: 'GET', path: '/api/v1/emr/watermark', handle: handleEmrWatermark, auth: true },
  { method: 'GET', path: '/api/v1/security/consent', handle: handleSecurityConsent, auth: true },
  { method: 'GET', path: '/api/v1/security/minimize', handle: handleSecurityMinimize, auth: true },
  { method: 'GET', path: '/api/v1/security/anonymization', handle: handleSecurityAnonymization, auth: true },
  { method: 'GET', path: '/api/v1/security/deletion', handle: handleSecurityDeletion, auth: true },
];
