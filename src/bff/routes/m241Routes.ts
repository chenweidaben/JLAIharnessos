/**
 * 健澜科技 jlmedaios - M241 合规差距继续补强（身份与安全运营）
 *
 * 会话管理/权限校验/登录日志 + 漏洞扫描/数据备份/容灾演练
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、身份与权限 ==================== */

/** GET /api/v1/auth/session - 会话管理 */
async function handleAuthSession(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const session = {
    current: { user: '陈维（演示用户）', sessionId: 'sess-demo-0001', loginTime: '2026-10-20 08:00' },
    expireAt: '2026-10-20 10:00',
    refreshToken: { status: '有效', rotated: true, nextRotatesAt: '2026-10-20 09:30' },
    device: { ua: 'Chrome/128 (Windows)', ip: '10.20.3.11', location: '院内办公网' },
  };

  return json(ok(session));
}

/** GET /api/v1/auth/permissions - 权限校验 */
async function handleAuthPermissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const result = {
    user: '陈维（演示用户）',
    roles: ['admin'],
    permissionCodes: ['*'],
    menuCount: 86,
    buttonPermissionCount: 342,
    reportGroups: ['report:clinical:read', 'report:admin:read', 'report:finance:read', 'report:quality:read'],
  };

  return json(ok(result));
}

/** GET /api/v1/auth/audit - 登录日志 5 条 */
async function handleAuthAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'LGN-001', user: '陈维', ip: '10.20.3.11', device: 'Chrome/Windows', time: '2026-10-20 08:00', result: '成功' },
    { id: 'LGN-002', user: '赵医生', ip: '10.20.3.45', device: 'Edge/Windows', time: '2026-10-20 08:10', result: '成功' },
    { id: 'LGN-003', user: 'unknown', ip: '203.0.113.9', device: 'curl/8.0', time: '2026-10-20 08:20', result: '失败（密码错误 5 次已锁定）' },
    { id: 'LGN-004', user: '王护士', ip: '10.20.4.20', device: 'H5/Android', time: '2026-10-20 08:35', result: '成功' },
    { id: 'LGN-005', user: '李医生', ip: '10.20.3.50', device: 'Chrome/macOS', time: '2026-10-20 09:00', result: '成功' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

/* ==================== 二、安全运营 ==================== */

/** GET /api/v1/security/vulnerability - 漏洞扫描 5 条 */
async function handleSecurityVulnerability(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const vulns = [
    { id: 'VUL-001', name: 'Spring Framework RCE', severity: '高危', cve: 'CVE-2022-22965', status: '已修复', fixTime: '2026-10-12' },
    { id: 'VUL-002', name: 'OpenSSL 缓冲区溢出', severity: '高危', cve: 'CVE-2023-3817', status: '修复中', fixTime: null },
    { id: 'VUL-003', name: 'Nginx 轻量请求漏洞', severity: '中危', cve: 'CVE-2023-44487', status: '已修复', fixTime: '2026-10-10' },
    { id: 'VUL-004', name: '依赖包 XSS（前端）', severity: '中危', cve: 'N/A', status: '待修复', fixTime: null },
    { id: 'VUL-005', name: '日志组件敏感信息明文', severity: '低危', cve: 'N/A', status: '待修复', fixTime: null },
  ];

  return json(ok({ vulns, totalCount: vulns.length }));
}

/** GET /api/v1/security/backup - 数据备份 */
async function handleSecurityBackup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const backups = [
    { id: 'BAK-001', time: '2026-10-20 02:00', type: '全量', size: '48.6 GB', status: '成功', verify: '校验通过（MD5 一致）' },
    { id: 'BAK-002', time: '2026-10-20 06:00', type: '增量', size: '1.2 GB', status: '成功', verify: '校验通过' },
    { id: 'BAK-003', time: '2026-10-19 06:00', type: '增量', size: '1.0 GB', status: '失败', verify: '校验失败（网络中断，已重试成功）' },
  ];

  return json(ok({ backups, totalCount: backups.length }));
}

/** GET /api/v1/security/dr - 容灾演练 */
async function handleSecurityDr(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const drills = [
    { id: 'DR-001', time: '2026-10-15 14:00', scope: '核心业务（HIS/EMR）切换至同城灾备', rto: '8 分钟', rpo: '< 5 分钟', result: '通过' },
    { id: 'DR-002', time: '2026-07-20 14:00', scope: '数据库主备切换', rto: '3 分钟', rpo: '0（同步复制）', result: '通过' },
    { id: 'DR-003', time: '2026-04-10 09:00', scope: '全站断电模拟', rto: '25 分钟', rpo: '< 10 分钟', result: '不通过（DNS 切换超时）' },
  ];

  return json(ok({ drills, totalCount: drills.length }));
}

export const m241Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/auth/session', handle: handleAuthSession, auth: true },
  { method: 'GET', path: '/api/v1/auth/permissions', handle: handleAuthPermissions, auth: true },
  { method: 'GET', path: '/api/v1/auth/audit', handle: handleAuthAudit, auth: true },
  { method: 'GET', path: '/api/v1/security/vulnerability', handle: handleSecurityVulnerability, auth: true },
  { method: 'GET', path: '/api/v1/security/backup', handle: handleSecurityBackup, auth: true },
  { method: 'GET', path: '/api/v1/security/dr', handle: handleSecurityDr, auth: true },
];
