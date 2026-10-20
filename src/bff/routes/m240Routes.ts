/**
 * 健澜科技 jlmedaios - M240 合规差距继续补强
 *
 * 病历锁定/电子签名 + 租户切换 + 导出审计/保留策略/泄露事件
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病历锁定 / 电子签名 ==================== */

/** GET /api/v1/emr/lock - 病历锁定 */
async function handleEmrLock(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const locks = [
    { id: 'LCK-001', recordNo: 'EMR-MRN-100451', locker: '赵医生', lockTime: '2026-10-20 11:00', unlockTime: null, status: '锁定中' },
    { id: 'LCK-002', recordNo: 'EMR-MRN-100235', locker: '陈维（管理员）', lockTime: '2026-10-19 16:00', unlockTime: '2026-10-20 09:00', status: '已解锁' },
  ];

  return json(ok({ locks, totalCount: locks.length }));
}

/** GET /api/v1/emr/sign - 病历电子签名 */
async function handleEmrSign(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const signs = [
    { id: 'SGN-001', recordNo: 'EMR-MRN-100451', signer: '赵医生', signTime: '2026-10-20 11:05', certSerial: 'SN-2026-DEMO-0001', hash: 'sha256:9f8e7d6c5b4a39281706' },
    { id: 'SGN-002', recordNo: 'EMR-MRN-100235', signer: '李医生', signTime: '2026-10-19 16:10', certSerial: 'SN-2026-DEMO-0002', hash: 'sha256:1a2b3c4d5e6f708192a3' },
  ];

  return json(ok({ signs, totalCount: signs.length }));
}

/* ==================== 二、租户切换 ==================== */

/** GET /api/v1/tenants/switch - 租户切换 */
async function handleTenantsSwitch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const result = {
    currentTenant: { id: 'TNT-001', name: '总院（主院区）' },
    switchableTenants: [
      { id: 'TNT-001', name: '总院（主院区）' },
      { id: 'TNT-002', name: '分院（城东）' },
      { id: 'TNT-003', name: '国际医疗中心' },
    ],
    auditRecords: [
      { time: '2026-10-20 08:00', fromTenant: 'TNT-002', toTenant: 'TNT-001', operator: '陈维', result: '允许' },
      { time: '2026-10-18 14:30', fromTenant: 'TNT-001', toTenant: 'TNT-004', operator: '陈维', result: '拒绝（目标租户暂停）' },
    ],
  };

  return json(ok(result));
}

/* ==================== 三、安全：导出审计 / 保留策略 / 泄露事件 ==================== */

/** GET /api/v1/security/export-audit - 数据导出审计 */
async function handleSecurityExportAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const exports = [
    { id: 'EXP-001', exporter: '王护士', scope: '检验结果批量导出（30 条，TNT-001）', time: '2026-10-20 09:40', approver: '待审批', status: '待审批' },
    { id: 'EXP-002', exporter: '李医生', scope: '科研队列病历导出（120 条）', time: '2026-10-19 15:00', approver: '医务部-郑主任', status: '已导出' },
    { id: 'EXP-003', exporter: '第三方审计', scope: '脱敏后审计数据导出（500 条）', time: '2026-10-18 10:00', approver: '信息安全部-周工', status: '已审批' },
    { id: 'EXP-004', exporter: '实习生', scope: '全量患者通讯录导出', time: '2026-10-17 11:20', approver: '—', status: '已拒绝' },
  ];

  return json(ok({ exports, totalCount: exports.length }));
}

/** GET /api/v1/security/retention - 数据保留策略 */
async function handleSecurityRetention(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const policies = [
    { dataType: '病历', retentionYears: 30, archive: '满 15 年转冷存储（OSS）', destroy: '满 30 年经审批后匿名化销毁' },
    { dataType: '影像', retentionYears: 15, archive: '满 5 年压缩归档', destroy: '满 15 年销毁' },
    { dataType: '检验', retentionYears: 15, archive: '满 5 年归档', destroy: '满 15 年销毁' },
    { dataType: '审计日志', retentionYears: 6, archive: '满 1 年冷存储（WORM）', destroy: '满 6 年哈希链校验后销毁' },
  ];

  return json(ok({ policies, totalCount: policies.length }));
}

/** GET /api/v1/security/breach - 数据泄露事件 */
async function handleSecurityBreach(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const events = [
    { id: 'BRC-001', type: '泄露', scope: '某门诊检验报告误发（3 条）', foundTime: '2026-10-18 09:00', action: '撤回 + 通知患者 + 责任人培训', status: '已处理' },
    { id: 'BRC-002', type: '篡改', scope: '病历版本被尝试回滚', foundTime: '2026-10-19 22:00', action: '版本链校验拦截 + 锁定账号', status: '调查中' },
    { id: 'BRC-003', type: '丢失', scope: '无（未发生真实丢失）', foundTime: '—', action: '无', status: '已关闭' },
  ];

  return json(ok({ events, totalCount: events.length }));
}

export const m240Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/lock', handle: handleEmrLock, auth: true },
  { method: 'GET', path: '/api/v1/emr/sign', handle: handleEmrSign, auth: true },
  { method: 'GET', path: '/api/v1/tenants/switch', handle: handleTenantsSwitch, auth: true },
  { method: 'GET', path: '/api/v1/security/export-audit', handle: handleSecurityExportAudit, auth: true },
  { method: 'GET', path: '/api/v1/security/retention', handle: handleSecurityRetention, auth: true },
  { method: 'GET', path: '/api/v1/security/breach', handle: handleSecurityBreach, auth: true },
];
