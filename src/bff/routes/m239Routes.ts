/**
 * 健澜科技 jlmedaios - M239 合规差距补强
 *
 * 病历 append-only（版本历史/审计追踪）+ 多租户隔离（列表/配置）
 * + PHI 脱敏（脱敏规则/数据访问日志）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病历 append-only 补强 ==================== */

/** GET /api/v1/emr/versions - 病历版本历史 5 条 */
async function handleEmrVersions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const versions = [
    { id: 'VER-001', recordNo: 'EMR-MRN-100451', version: 'v1.0', editor: '赵医生', editTime: '2026-10-15 10:00', reason: '首次入院记录', diffSummary: '新建入院记录全文' },
    { id: 'VER-002', recordNo: 'EMR-MRN-100451', version: 'v1.1', editor: '赵医生', editTime: '2026-10-16 09:30', reason: '补充现病史', diffSummary: '现病史段落 +120 字' },
    { id: 'VER-003', recordNo: 'EMR-MRN-100451', version: 'v1.2', editor: '李医生', editTime: '2026-10-17 14:20', reason: '上级医师查房记录', diffSummary: '诊疗计划段落 +1 条，诊断未变' },
    { id: 'VER-004', recordNo: 'EMR-MRN-100451', version: 'v1.3', editor: '赵医生', editTime: '2026-10-19 08:00', reason: '更新检验结果引用', diffSummary: '实验室检查段落替换（CRP 12→6）' },
    { id: 'VER-005', recordNo: 'EMR-MRN-100451', version: 'v2.0', editor: '赵医生', editTime: '2026-10-20 11:00', reason: '出院小结定稿', diffSummary: '新增出院小结段落，正文 append 不覆盖' },
  ];

  return json(ok({ versions, totalCount: versions.length }));
}

/** GET /api/v1/emr/audit-trail - 病历审计追踪 3 条 */
async function handleEmrAuditTrail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const trails = [
    { id: 'TRL-001', recordNo: 'EMR-MRN-100451', action: '查看', operator: '陈维（管理员）', time: '2026-10-20 08:15', ip: '10.20.3.11' },
    { id: 'TRL-002', recordNo: 'EMR-MRN-100451', action: '修改', operator: '赵医生', time: '2026-10-20 11:00', ip: '10.20.3.45' },
    { id: 'TRL-003', recordNo: 'EMR-MRN-100235', action: '导出', operator: '王护士', time: '2026-10-20 09:40', ip: '10.20.4.20' },
  ];

  return json(ok({ trails, totalCount: trails.length }));
}

/* ==================== 二、多租户隔离补强 ==================== */

/** GET /api/v1/tenants/list - 租户列表 5 个 */
async function handleTenantsList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const tenants = [
    { id: 'TNT-001', name: '总院（主院区）', campus: '滨江院区', status: '正常', apiCount: 180 },
    { id: 'TNT-002', name: '分院（城东）', campus: '城东院区', status: '正常', apiCount: 120 },
    { id: 'TNT-003', name: '国际医疗中心', campus: '城西院区', status: '正常', apiCount: 86 },
    { id: 'TNT-004', name: '城北门诊部', campus: '城北院区', status: '暂停', apiCount: 42 },
    { id: 'TNT-005', name: '已注销试点院区', campus: '老院区', status: '注销', apiCount: 0 },
  ];

  return json(ok({ tenants, totalCount: tenants.length }));
}

/** GET /api/v1/tenants/config - 租户配置 */
async function handleTenantsConfig(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const config = {
    tenantId: 'TNT-001',
    isolationStrategy: '独立数据库（per-tenant DB）',
    isolationOptions: ['共享库隔离（row-level）', '独立 Schema', '独立数据库（当前）'],
    cacheStrategy: '按租户前缀隔离 Redis Key（tenant:{id}:*）',
    rateLimit: { requestsPerMin: 6000, concurrentConn: 200, burst: 300 },
    crossTenantAccess: '禁止（需管理员显式授权并留痕）',
  };

  return json(ok(config));
}

/* ==================== 三、PHI 脱敏补强 ==================== */

/** GET /api/v1/security/mask-rules - 脱敏规则 5 条 */
async function handleSecurityMaskRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rules = [
    { field: '姓名', method: '部分掩码', example: '张*示', applicableRoles: ['访客', '第三方审计'] },
    { field: '身份证号', method: '部分掩码', example: '3301**********1234', applicableRoles: ['访客', '第三方审计', '实习医生'] },
    { field: '手机号', method: '部分掩码', example: '138****5678', applicableRoles: ['访客', '第三方审计'] },
    { field: '家庭住址', method: '全掩码', example: '********', applicableRoles: ['访客'] },
    { field: '病历号', method: '哈希', example: 'sha256:a1b2c3...', applicableRoles: ['跨院统计匿名化'] },
  ];

  return json(ok({ rules, totalCount: rules.length }));
}

/** GET /api/v1/security/access-logs - 数据访问日志 5 条 */
async function handleSecurityAccessLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'LOG-001', user: '赵医生', role: '主治医生', data: '住院病历 EMR-MRN-100451', time: '2026-10-20 11:00', ip: '10.20.3.45' },
    { id: 'LOG-002', user: '陈维', role: '管理员', data: '全院审计日志检索', time: '2026-10-20 08:15', ip: '10.20.3.11' },
    { id: 'LOG-003', user: '王护士', role: '护士', data: '检验结果批量导出（30 条）', time: '2026-10-20 09:40', ip: '10.20.4.20' },
    { id: 'LOG-004', user: '李医生', role: '主治医生', data: '门诊处方 OPD20261020001', time: '2026-10-20 09:05', ip: '10.20.3.50' },
    { id: 'LOG-005', user: '系统（自动）', role: 'system', data: '缓存预热 tenant:TNT-001', time: '2026-10-20 06:00', ip: '127.0.0.1' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

export const m239Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/versions', handle: handleEmrVersions, auth: true },
  { method: 'GET', path: '/api/v1/emr/audit-trail', handle: handleEmrAuditTrail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/list', handle: handleTenantsList, auth: true },
  { method: 'GET', path: '/api/v1/tenants/config', handle: handleTenantsConfig, auth: true },
  { method: 'GET', path: '/api/v1/security/mask-rules', handle: handleSecurityMaskRules, auth: true },
  { method: 'GET', path: '/api/v1/security/access-logs', handle: handleSecurityAccessLogs, auth: true },
];
