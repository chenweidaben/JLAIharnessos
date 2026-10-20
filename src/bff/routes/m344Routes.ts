/**
 * 健澜科技 jlmedaios - M344 P0 合规改造：事件总线 + 审计日志
 *
 * 死信队列/事件重试 + 审计报告（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/events/dead-letter - 死信队列 5 条 */
async function handleEventsDeadLetter(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EDL-001', eventId: 'EVT-2026-10-20-000001', type: '病历提交事件（medical.record.submitted）', failReason: '数据库连接超时（connection timeout，30 秒未响应）', retryCount: '已重试 3 次（均失败）', time: '2026-10-20 09:30:00（首次失败时间）' },
    { id: 'EDL-002', eventId: 'EVT-2026-10-20-000002', type: '处方审核事件（prescription.audited）', failReason: '下游服务（药房系统）返回 500 错误（internal server error）', retryCount: '已重试 3 次（均失败）', time: '2026-10-20 10:00:00（首次失败时间）' },
    { id: 'EDL-003', eventId: 'EVT-2026-10-20-000003', type: '出院结算事件（billing.settled）', failReason: '消息格式错误（缺少必填字段：patientId）', retryCount: '已重试 1 次（格式错误，无需重试）', time: '2026-10-20 11:00:00（首次失败时间）' },
    { id: 'EDL-004', eventId: 'EVT-2026-10-20-000004', type: '检验结果推送事件（lab.result.pushed）', failReason: '下游服务（LIS 系统）返回 404 错误（endpoint not found）', retryCount: '已重试 3 次（均失败）', time: '2026-10-20 14:00:00（首次失败时间）' },
    { id: 'EDL-005', eventId: 'EVT-2026-10-20-000005', type: '影像报告推送事件（imaging.report.pushed）', failReason: '网络超时（network timeout，10 秒未响应）', retryCount: '已重试 2 次（第 2 次成功，无需进入死信队列）', time: '2026-10-20 15:00:00（首次失败时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/events/retry - 事件重试 5 条 */
async function handleEventsRetry(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ER-001', eventId: 'EVT-2026-10-20-000006', type: '病历提交事件（medical.record.submitted）', retryCount: '已重试 2 次（第 1 次失败，第 2 次成功）', status: '已成功（第 2 次重试成功，消息已投递到下游服务）', lastRetryTime: '2026-10-20 09:35:00（第 2 次重试时间）' },
    { id: 'ER-002', eventId: 'EVT-2026-10-20-000007', type: '处方审核事件（prescription.audited）', retryCount: '已重试 1 次（第 1 次成功，无需重试）', status: '已成功（第 1 次重试成功，消息已投递到下游服务）', lastRetryTime: '2026-10-20 10:05:00（第 1 次重试时间）' },
    { id: 'ER-003', eventId: 'EVT-2026-10-20-000008', type: '出院结算事件（billing.settled）', retryCount: '已重试 0 次（首次发送成功，无需重试）', status: '已成功（首次发送成功，消息已投递到下游服务）', lastRetryTime: '2026-10-20 11:00:00（首次发送时间）' },
    { id: 'ER-004', eventId: 'EVT-2026-10-20-000009', type: '检验结果推送事件（lab.result.pushed）', retryCount: '已重试 3 次（均失败，已进入死信队列）', status: '已失败（已进入死信队列，等待人工处理）', lastRetryTime: '2026-10-20 14:10:00（第 3 次重试时间）' },
    { id: 'ER-005', eventId: 'EVT-2026-10-20-000010', type: '影像报告推送事件（imaging.report.pushed）', retryCount: '已重试 1 次（第 1 次失败，第 2 次成功）', status: '已成功（第 2 次重试成功，消息已投递到下游服务）', lastRetryTime: '2026-10-20 15:05:00（第 2 次重试时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/reports - 审计报告 5 条 */
async function handleAuditReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AR-001', reportName: '2026 年 10 月第 3 周系统安全审计报告', period: '2026-10-14 至 2026-10-20', auditItems: '用户登录日志（5,000+ 条）、操作日志（10,000+ 条）、权限变更记录（50+ 条）', findings: '发现 2 个安全隐患：① 有 3 个用户密码强度不足（长度 < 8 位）；② 有 1 个用户在非工作时间（凌晨 2 点）登录系统', suggestions: '① 建议强制所有用户修改密码（要求长度 ≥ 8 位，包含字母 + 数字 + 特殊字符）；② 建议对非工作时间登录的用户进行二次身份验证（短信验证码）' },
    { id: 'AR-002', reportName: '2026 年 10 月第 2 周数据合规审计报告', period: '2026-10-07 至 2026-10-13', auditItems: '患者数据访问日志（8,000+ 条）、数据导出记录（100+ 条）、数据删除记录（20+ 条）', findings: '发现 1 个合规隐患：有 1 个医生导出了 500+ 患者数据（超出常规工作量）', suggestions: '建议对该医生的数据导出行为进行调查（确认是否为正常工作需要，是否存在数据泄露风险）' },
    { id: 'AR-003', reportName: '2026 年 10 月第 1 周操作审计报告', period: '2026-10-01 至 2026-10-06', auditItems: '病历修改日志（2,000+ 条）、处方修改日志（500+ 条）、医嘱修改日志（300+ 条）', findings: '未发现重大操作违规：所有病历修改均有修改原因说明，所有处方修改均有药师审核记录', suggestions: '建议继续保持当前的操作规范（定期审计，确保所有操作可追溯）' },
    { id: 'AR-004', reportName: '2026 年 9 月月度系统安全审计报告', period: '2026-09-01 至 2026-09-30', auditItems: '用户登录日志（20,000+ 条）、操作日志（50,000+ 条）、权限变更记录（200+ 条）', findings: '发现 3 个安全隐患：① 有 5 个用户密码强度不足；② 有 2 个用户在非工作时间登录系统；③ 有 1 个用户账号被多次尝试登录（疑似暴力破解）', suggestions: '① 建议强制所有用户修改密码；② 建议对非工作时间登录的用户进行二次身份验证；③ 建议对疑似暴力破解的账号进行临时锁定（24 小时后自动解锁）' },
    { id: 'AR-005', reportName: '2026 年 9 月月度数据合规审计报告', period: '2026-09-01 至 2026-09-30', auditItems: '患者数据访问日志（30,000+ 条）、数据导出记录（500+ 条）、数据删除记录（50+ 条）', findings: '发现 2 个合规隐患：① 有 2 个医生导出了 1,000+ 患者数据（超出常规工作量）；② 有 1 个护士删除了 100+ 条患者数据（超出常规工作量）', suggestions: '① 建议对这 2 个医生的数据导出行为进行调查；② 建议对该护士的数据删除行为进行调查（确认是否为正常工作需要）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m344Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/events/dead-letter', handle: handleEventsDeadLetter, auth: true },
  { method: 'GET', path: '/api/v1/events/retry', handle: handleEventsRetry, auth: true },
  { method: 'GET', path: '/api/v1/audit/reports', handle: handleAuditReports, auth: true },
];
