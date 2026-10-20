/**
 * 健澜科技 jlmedaios - M285 安全合规域补充
 *
 * 角色管理/权限列表/审计日志/合规评分/安全态势/租户列表
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/auth/roles - 角色列表 5 条 */
async function handleAuthRoles(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const roles = [
    { id: 'R-001', name: '主任医师', permissions: ['病历读写', '医嘱开立', '处方权'], userCount: 45, status: '启用' },
    { id: 'R-002', name: '主治医师', permissions: ['病历读写', '医嘱开立'], userCount: 120, status: '启用' },
    { id: 'R-003', name: '住院医师', permissions: ['病历读写'], userCount: 200, status: '启用' },
    { id: 'R-004', name: '护士长', permissions: ['护理记录', '排班管理'], userCount: 30, status: '启用' },
    { id: 'R-005', name: '系统管理员', permissions: ['全部权限'], userCount: 5, status: '启用' },
  ];
  return json(ok({ roles, totalCount: roles.length }));
}

/** GET /api/v1/auth/permissions - 权限列表 5 条 */
async function handleAuthPermissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const perms = [
    { id: 'P-001', name: '病历读写', module: 'EMR', description: '电子病历读写权限', riskLevel: '高' },
    { id: 'P-002', name: '医嘱开立', module: 'Order', description: '医嘱开立与执行权限', riskLevel: '高' },
    { id: 'P-003', name: '处方权', module: 'Pharmacy', description: '处方开具与审核权限', riskLevel: '高' },
    { id: 'P-004', name: '护理记录', module: 'Nursing', description: '护理记录读写权限', riskLevel: '中' },
    { id: 'P-005', name: '数据导出', module: 'Analytics', description: '报表导出权限', riskLevel: '中' },
  ];
  return json(ok({ permissions: perms, totalCount: perms.length }));
}

/** GET /api/v1/audit/logs - 审计日志列表 5 条 */
async function handleAuditLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const logs = [
    { id: 'AL-001', user: '李***', action: '登录系统', resource: '—', time: '2026-10-20 08:00:15', ip: '10.0.1.100', result: '成功' },
    { id: 'AL-002', user: '赵***', action: '查看患者病历', resource: 'EMR-2026-101', time: '2026-10-20 09:15:30', ip: '10.0.1.101', result: '成功' },
    { id: 'AL-003', user: '陈***', action: '修改医嘱', resource: 'ORD-20261020-001', time: '2026-10-20 10:20:45', ip: '10.0.1.102', result: '成功' },
    { id: 'AL-004', user: '王***', action: '导出报表', resource: 'dashboard-stats', time: '2026-10-20 11:00:00', ip: '10.0.1.103', result: '成功' },
    { id: 'AL-005', user: '未知用户', action: '尝试登录（失败）', resource: '—', time: '2026-10-20 11:30:20', ip: '203.0.113.50', result: '失败（密码错误）' },
  ];
  return json(ok({ logs, totalCount: logs.length, todayCount: 1560 }));
}

/** GET /api/v1/compliance/score - 合规评分 */
async function handleComplianceScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    totalScore: 92.5,
    grade: 'A',
    dimensions: [
      { name: 'JWT 认证覆盖率', score: 98, target: 95 },
      { name: '审计日志覆盖率', score: 95, target: 90 },
      { name: '病历版本管理覆盖率', score: 96, target: 90 },
      { name: 'PHI 脱敏覆盖率', score: 88, target: 90 },
      { name: '多租户隔离覆盖率', score: 90, target: 85 },
      { name: 'DEMO_MODE 短路覆盖率', score: 98, target: 95 },
    ],
    lastAuditDate: '2026-10-15',
    nextAuditDate: '2027-01-15',
  }));
}

/** GET /api/v1/security/dashboard - 安全态势看板 */
async function handleSecurityDashboard(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({
    threatLevel: '低',
    activeThreats: 0,
    blockedRequests24h: 12,
    loginAttempts24h: 1560,
    failedLogins24h: 8,
    anomalies: [
      { type: '异地登录', count: 2, severity: '中' },
      { type: '异常高频访问', count: 1, severity: '低' },
      { type: '敏感数据批量导出', count: 0, severity: '高' },
    ],
  }));
}

/** GET /api/v1/tenants/list - 租户列表 5 条 */
async function handleTenantsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const tenants = [
    { id: 'T-001', name: '杭州健澜科技总院', hospitalCode: 'H33010001', status: 'active', userCount: 1200, patientCount: 85000 },
    { id: 'T-002', name: '健澜科技余杭分院', hospitalCode: 'H33010002', status: 'active', userCount: 450, patientCount: 32000 },
    { id: 'T-003', name: '健澜科技临安分院', hospitalCode: 'H33010003', status: 'active', userCount: 280, patientCount: 18000 },
    { id: 'T-004', name: '健澜科技宁波分院', hospitalCode: 'H33020001', status: 'trial', userCount: 50, patientCount: 2000 },
    { id: 'T-005', name: '健澜科技温州分院', hospitalCode: 'H33030001', status: 'suspended', userCount: 0, patientCount: 0 },
  ];
  return json(ok({ tenants, totalCount: tenants.length }));
}

export const m285Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/auth/roles', handle: handleAuthRoles, auth: true },
  { method: 'GET', path: '/api/v1/auth/permissions', handle: handleAuthPermissions, auth: true },
  { method: 'GET', path: '/api/v1/audit/logs', handle: handleAuditLogs, auth: true },
  { method: 'GET', path: '/api/v1/compliance/score', handle: handleComplianceScore, auth: true },
  { method: 'GET', path: '/api/v1/security/dashboard', handle: handleSecurityDashboard, auth: true },
  { method: 'GET', path: '/api/v1/tenants/list', handle: handleTenantsList, auth: true },
];
