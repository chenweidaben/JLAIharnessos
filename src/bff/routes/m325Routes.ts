/**
 * 健澜科技 jlmedaios - M325 安全域扩展
 *
 * 补建审计日志列表 + 用户会话/登录历史/权限矩阵/角色映射/数据访问日志/隐私报告
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/audit-logs - 审计日志列表 5 条（补创建） */
async function handleSecurityAuditLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAL-001', logId: 'AUDIT-20261020-000001', user: 'admin（系统管理员）', action: '登录（成功）', resource: '/api/v1/auth/login', time: '2026-10-20 08:00:15' },
    { id: 'SAL-002', logId: 'AUDIT-20261020-000002', user: 'lilu（李***医生）', action: '病历读取（EMR-2026-001234）', resource: '/api/v1/emr/record/BL-2026-001234', time: '2026-10-20 09:15:30' },
    { id: 'SAL-003', logId: 'AUDIT-20261020-000003', user: 'wangwu（王***护士）', action: '医嘱执行（ORD-2026-005678）', resource: '/api/v1/order/execute', time: '2026-10-20 10:30:45' },
    { id: 'SAL-004', logId: 'AUDIT-20261020-000004', user: 'zhaoliu（赵***药师）', action: '处方审核（RX-2026-009012）', resource: '/api/v1/pharmacy/review', time: '2026-10-20 11:00:20' },
    { id: 'SAL-005', logId: 'AUDIT-20261020-000005', user: 'unknown（未登录用户）', action: '登录（失败 3 次）', resource: '/api/v1/auth/login', time: '2026-10-20 11:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/user-sessions - 用户会话 5 条 */
async function handleSecurityUserSessions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SUS-001', sessionId: 'SESS-20261020-001', user: 'admin（系统管理员）', loginTime: '2026-10-20 08:00:15', lastActive: '2026-10-20 11:30:00（当前）', status: '在线' },
    { id: 'SUS-002', sessionId: 'SESS-20261020-002', user: 'lilu（李***医生）', loginTime: '2026-10-20 08:30:00', lastActive: '2026-10-20 11:20:00（10 分钟前）', status: '在线' },
    { id: 'SUS-003', sessionId: 'SESS-20261020-003', user: 'wangwu（王***护士）', loginTime: '2026-10-20 07:45:00', lastActive: '2026-10-20 11:15:00（15 分钟前）', status: '在线' },
    { id: 'SUS-004', sessionId: 'SESS-20261019-004', user: 'zhaoliu（赵***药师）', loginTime: '2026-10-19 14:00:00', lastActive: '2026-10-19 17:30:00（已超时退出）', status: '已过期' },
    { id: 'SUS-005', sessionId: 'SESS-20261020-005', user: 'sunqi（孙***医生）', loginTime: '2026-10-20 09:00:00', lastActive: '2026-10-20 10:00:00（已主动退出）', status: '已注销' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/login-history - 登录历史 5 条 */
async function handleSecurityLoginHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SLH-001', user: 'admin（系统管理员）', loginTime: '2026-10-20 08:00:15', ip: '10.0.1.100（院内办公网）', device: 'Chrome 120 / Windows 11', status: '成功' },
    { id: 'SLH-002', user: 'lilu（李***医生）', loginTime: '2026-10-20 08:30:00', ip: '10.0.2.25（医生工作站）', device: 'Edge 120 / Windows 10', status: '成功' },
    { id: 'SLH-003', user: 'wangwu（王***护士）', loginTime: '2026-10-20 07:45:00', ip: '10.0.3.50（护士站终端）', device: 'Firefox 119 / Windows 10', status: '成功' },
    { id: 'SLH-004', user: 'unknown（未登录用户）', loginTime: '2026-10-20 11:30:00', ip: '203.0.113.45（公网）', device: 'Chrome 120 / MacOS', status: '失败（密码错误 3 次）' },
    { id: 'SLH-005', user: 'sunqi（孙***医生）', loginTime: '2026-10-20 09:00:00', ip: '10.0.2.30（医生工作站）', device: 'Chrome 120 / Windows 10', status: '成功' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/permission-matrix - 权限矩阵 5 条 */
async function handleSecurityPermissionMatrix(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPM-001', role: '医生（主治医师）', resource: 'EMR 病历', operation: '读取/创建/修改', allow: '允许（本科室患者）', deny: '禁止（外科室患者需会诊申请）' },
    { id: 'SPM-002', role: '护士（主管护师）', resource: '医嘱系统', operation: '执行/查看', allow: '允许（本科室医嘱）', deny: '禁止（修改医嘱，仅医生可修改）' },
    { id: 'SPM-003', role: '药师（主管药师）', resource: '处方系统', operation: '审核/调配/发药', allow: '允许（全院处方）', deny: '禁止（修改处方，仅医生可修改）' },
    { id: 'SPM-004', role: '行政（医务科）', resource: '病历质量统计', operation: '读取/导出', allow: '允许（全院病历质量数据）', deny: '禁止（修改病历内容）' },
    { id: 'SPM-005', role: '系统管理员', resource: '系统配置', operation: '全部', allow: '允许（系统配置/用户管理/权限管理）', deny: '禁止（直接访问患者病历数据）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/role-mapping - 角色映射 5 条 */
async function handleSecurityRoleMapping(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRM-001', user: 'lilu（李***）', role: '心内科主治医师', department: '心内科', effectiveTime: '2024-03-15 起长期有效', status: '在职' },
    { id: 'SRM-002', user: 'wangwu（王***）', role: '心内科主管护师', department: '心内科', effectiveTime: '2023-07-01 起长期有效', status: '在职' },
    { id: 'SRM-003', user: 'zhaoliu（赵***）', role: '药学部主管药师', department: '药学部', effectiveTime: '2022-09-01 起长期有效', status: '在职' },
    { id: 'SRM-004', user: 'chenqi（陈***）', role: '医务科科长', department: '医务科', effectiveTime: '2021-01-01 起长期有效', status: '在职' },
    { id: 'SRM-005', user: 'admin（系统管理员）', role: '信息科系统管理员', department: '信息科', effectiveTime: '2020-06-01 起长期有效', status: '在职' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/data-access-log - 数据访问日志 5 条 */
async function handleSecurityDataAccessLog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SDA-001', user: 'lilu（李***医生）', dataType: 'EMR 病历（BL-2026-001234）', operation: '读取', time: '2026-10-20 09:15:30', source: '医生工作站（10.0.2.25）' },
    { id: 'SDA-002', user: 'wangwu（王***护士）', dataType: '医嘱（ORD-2026-005678）', operation: '执行', time: '2026-10-20 10:30:45', source: '护士站终端（10.0.3.50）' },
    { id: 'SDA-003', user: 'zhaoliu（赵***药师）', dataType: '处方（RX-2026-009012）', operation: '审核', time: '2026-10-20 11:00:20', source: '药房工作站（10.0.4.10）' },
    { id: 'SDA-004', user: 'chenqi（陈***医务科）', dataType: '病历质量统计（全院 9 月数据）', operation: '导出', time: '2026-10-19 16:00:00', source: '行政办公网（10.0.5.20）' },
    { id: 'SDA-005', user: 'unknown（未登录用户）', dataType: '登录接口', operation: '尝试访问（失败）', time: '2026-10-20 11:30:00', source: '公网（203.0.113.45）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-report - 隐私报告 5 条 */
async function handleSecurityPrivacyReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPR-001', reportName: '2026 年 9 月隐私保护月报', period: '2026-09-01 至 2026-09-30', privacyItems: '患者信息采集 / 存储 / 使用 / 共享 / 销毁', findings: '整体合规，待改进项 1 个（患者隐私政策弹窗覆盖率 95%，目标 100%）', suggestions: '10 月底前完成隐私政策弹窗全覆盖' },
    { id: 'SPR-002', reportName: '2026 年三季度个人信息保护法对标报告', period: '2026-07-01 至 2026-09-30', privacyItems: '知情同意 / 最小必要 / 数据安全 / 用户权利', findings: '对标达成率 90%，差距：用户权利响应时间（平均 7 天，目标 15 天内达标）', suggestions: '保持现有响应机制，持续优化' },
    { id: 'SPR-003', reportName: '2026 年国庆假期隐私保护专项报告', period: '2026-10-01 至 2026-10-07', privacyItems: '假期数据访问 / 远程访问 / 应急响应', findings: '假期无隐私泄露事件，远程访问均通过 VPN 加密', suggestions: '保持现有远程访问安全机制' },
    { id: 'SPR-004', reportName: '2026 年上半年 HIPAA Privacy Rule 对标报告', period: '2026-01-01 至 2026-06-30', privacyItems: 'Privacy Rule / Security Rule / Breach Notification', findings: '对标达成率 85%，差距：员工隐私培训覆盖率（90% vs 要求 100%）', suggestions: '年底前完成全员隐私培训' },
    { id: 'SPR-005', reportName: '2026 年 10 月第 3 周隐私周报', period: '2026-10-13 至 2026-10-19', privacyItems: '日常隐私监控', findings: '本周无隐私安全事件，数据访问均符合最小必要原则', suggestions: '继续保持' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m325Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/audit-logs', handle: handleSecurityAuditLogs, auth: true },
  { method: 'GET', path: '/api/v1/security/user-sessions', handle: handleSecurityUserSessions, auth: true },
  { method: 'GET', path: '/api/v1/security/login-history', handle: handleSecurityLoginHistory, auth: true },
  { method: 'GET', path: '/api/v1/security/permission-matrix', handle: handleSecurityPermissionMatrix, auth: true },
  { method: 'GET', path: '/api/v1/security/role-mapping', handle: handleSecurityRoleMapping, auth: true },
  { method: 'GET', path: '/api/v1/security/data-access-log', handle: handleSecurityDataAccessLog, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-report', handle: handleSecurityPrivacyReport, auth: true },
];
