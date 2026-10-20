/**
 * 健澜科技 jlmedaios - M244 合规差距继续补强（病历闭环与数据治理）
 *
 * 病历锁定历史/修订记录 + 授权日志/数据流向/DPIA/合规认证
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病历闭环 ==================== */

/** GET /api/v1/emr/lock-history - 病历锁定历史 5 条 */
async function handleEmrLockHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const history = [
    { id: 'LKH-001', mrn: 'EMR-MRN-100451', lockedBy: '赵医生', lockTime: '2026-10-20 11:00', unlockedBy: '赵医生', unlockTime: '2026-10-20 11:30', reason: '出院小结定稿' },
    { id: 'LKH-002', mrn: 'EMR-MRN-100452', lockedBy: '王医生', lockTime: '2026-10-19 16:00', unlockedBy: '—', unlockTime: '—', reason: '等待上级医师查房（锁定中）' },
    { id: 'LKH-003', mrn: 'EMR-MRN-100453', lockedBy: '李医生', lockTime: '2026-10-18 09:00', unlockedBy: '医务科', unlockTime: '2026-10-18 14:00', reason: '医疗纠纷病历封存' },
    { id: 'LKH-004', mrn: 'EMR-MRN-100454', lockedBy: '系统（自动）', lockTime: '2026-10-17 23:59', unlockedBy: '—', unlockTime: '—', reason: '24h 未完成病历自动锁定' },
    { id: 'LKH-005', mrn: 'EMR-MRN-100455', lockedBy: '张医生', lockTime: '2026-10-16 10:00', unlockedBy: '张医生', unlockTime: '2026-10-16 10:20', reason: '临时核对后解锁' },
  ];

  return json(ok({ history, totalCount: history.length }));
}

/** GET /api/v1/emr/revision - 病历修订记录 3 条 */
async function handleEmrRevision(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const revisions = [
    { id: 'REV-001', mrn: 'EMR-MRN-100451', version: 'v1.2', reviser: '赵医生', content: '补充现病史第 3 段（发病诱因）', approval: '已通过（主任医师 王主任）' },
    { id: 'REV-002', mrn: 'EMR-MRN-100452', version: 'v0.9', reviser: '王医生', content: '修改诊断（肺炎→社区获得性肺炎）', approval: '待审批' },
    { id: 'REV-003', mrn: 'EMR-MRN-100453', version: 'v2.0', reviser: '李医生', content: '删除错误用药记录并重新填写', approval: '已拒绝（超出修订时限）' },
  ];

  return json(ok({ revisions, totalCount: revisions.length }));
}

/* ==================== 二、数据治理 ==================== */

/** GET /api/v1/security/consent-log - 患者授权日志 5 条 */
async function handleSecurityConsentLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'CSL-001', patient: '张***', item: '院内数据共享', grantTime: '2026-01-10 09:00', revokeTime: '—', ip: '10.20.3.11' },
    { id: 'CSL-002', patient: '李***', item: '科研使用（去标识化）', grantTime: '2026-03-15 14:00', revokeTime: '—', ip: '10.20.3.45' },
    { id: 'CSL-003', patient: '赵***', item: '科研使用（去标识化）', grantTime: '2026-05-20 16:00', revokeTime: '2026-08-01 10:00', ip: '10.20.4.20' },
    { id: 'CSL-004', patient: '王***', item: '第三方披露（商保理赔）', grantTime: '2025-06-01 10:00', revokeTime: '—', ip: '10.20.3.50' },
    { id: 'CSL-005', patient: '陈***', item: '院内数据共享', grantTime: '2026-09-10 08:30', revokeTime: '—', ip: '10.20.5.12' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

/** GET /api/v1/security/data-flow - 数据流向图 */
async function handleSecurityDataFlow(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const flows = [
    { id: 'DFL-001', dataType: '门诊诊疗数据', source: 'HIS', target: 'CDSS 临床辅助决策', masked: '是（脱敏后）', approval: '已审批' },
    { id: 'DFL-002', dataType: '检验结果', source: 'LIS', target: '科研平台（去标识化）', masked: '是（k-匿名）', approval: '已审批' },
    { id: 'DFL-003', dataType: '影像 DICOM', source: 'PACS', target: '第三方影像云', masked: '否（病历号水印）', approval: '待审批' },
    { id: 'DFL-004', dataType: '费用数据', source: '收费系统', target: 'BI 报表平台', masked: '是（聚合）', approval: '已审批' },
  ];

  return json(ok({ flows, totalCount: flows.length }));
}

/** GET /api/v1/security/dpi - DPIA 数据保护影响评估 */
async function handleSecurityDpi(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const assessments = [
    { id: 'DPI-001', project: 'AI 辅助诊断（影像）', riskLevel: '高', mitigation: '去标识化 + 访问审计 + 模型不落地 PHI', status: '已完成' },
    { id: 'DPI-002', project: '患者数据科研共享', riskLevel: '中', mitigation: 'k-匿名 + 合同约束 + 审批流', status: '已完成' },
    { id: 'DPI-003', project: '互联网医院在线问诊', riskLevel: '中', mitigation: '端到端加密 + 日志留存 6 年', status: '评估中' },
    { id: 'DPI-004', project: '商保理赔数据直连', riskLevel: '高', mitigation: '最小化 + 患者单独授权 + 沙箱', status: '待评估' },
  ];

  return json(ok({ assessments, totalCount: assessments.length }));
}

/** GET /api/v1/security/audit-cert - 合规认证 */
async function handleSecurityAuditCert(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const certs = [
    { id: 'CERT-001', standard: 'ISO 27001 信息安全管理体系', issuer: '中国信息安全认证中心', validity: '2025-03-01 ~ 2028-03-01', status: '有效' },
    { id: 'CERT-002', standard: '等保三级（非医疗机构侧）', issuer: '公安部授权测评机构', validity: '2025-06-01 ~ 2028-06-01', status: '有效' },
    { id: 'CERT-003', standard: '互联互通四甲', issuer: '国家卫健委统计信息中心', validity: '2024-09-01 ~ 2027-09-01', status: '有效' },
    { id: 'CERT-004', standard: 'HIPAA（对标评估）', issuer: '第三方咨询机构', validity: '2023-01-01 ~ 2025-01-01', status: '已过期（待重新评估）' },
  ];

  return json(ok({ certs, totalCount: certs.length }));
}

export const m244Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/lock-history', handle: handleEmrLockHistory, auth: true },
  { method: 'GET', path: '/api/v1/emr/revision', handle: handleEmrRevision, auth: true },
  { method: 'GET', path: '/api/v1/security/consent-log', handle: handleSecurityConsentLog, auth: true },
  { method: 'GET', path: '/api/v1/security/data-flow', handle: handleSecurityDataFlow, auth: true },
  { method: 'GET', path: '/api/v1/security/dpi', handle: handleSecurityDpi, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-cert', handle: handleSecurityAuditCert, auth: true },
];
