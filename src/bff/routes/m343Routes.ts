/**
 * 健澜科技 jlmedaios - M343 系统管理 + 配置域
 *
 * 角色/权限（补缺失）+ 系统配置/日志/版本（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/roles - 角色管理 5 条（补创建） */
async function handleSecurityRoles(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SR-001', roleName: '系统管理员', description: '拥有系统全部权限（用户管理、角色管理、权限管理、系统配置、日志查看）', userCount: '3 人（本院信息科 2 人 + 厂商 1 人）', status: '启用中', createTime: '2021-01-01（系统上线时创建）' },
    { id: 'SR-002', roleName: '科室主任', description: '拥有本科室全部权限（病历审核、处方审核、出院审核、科室统计）', userCount: '25 人（全院各科室主任）', status: '启用中', createTime: '2021-01-01（系统上线时创建）' },
    { id: 'SR-003', roleName: '主治医师', description: '拥有本科室诊疗权限（接诊、开医嘱、开处方、写病历）', userCount: '150 人（全院各科室主治医师）', status: '启用中', createTime: '2021-01-01（系统上线时创建）' },
    { id: 'SR-004', roleName: '住院医师', description: '拥有本科室基础诊疗权限（写病历、执行医嘱）', userCount: '300 人（全院各科室住院医师）', status: '启用中', createTime: '2021-01-01（系统上线时创建）' },
    { id: 'SR-005', roleName: '护士', description: '拥有护理权限（执行医嘱、写护理记录、护理评估）', userCount: '400 人（全院各科室护士）', status: '启用中', createTime: '2021-01-01（系统上线时创建）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/permissions - 权限管理 5 条（补创建） */
async function handleSecurityPermissions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SP-001', permissionName: '用户管理', type: '系统权限', resource: '用户模块', action: '增删改查（新增用户、修改用户、删除用户、查询用户）', status: '启用中' },
    { id: 'SP-002', permissionName: '角色管理', type: '系统权限', resource: '角色模块', action: '增删改查（新增角色、修改角色、删除角色、查询角色）', status: '启用中' },
    { id: 'SP-003', permissionName: '病历审核', type: '业务权限', resource: '病历模块', action: '审核病历（审核本科室病历、查看审核记录）', status: '启用中' },
    { id: 'SP-004', permissionName: '处方审核', type: '业务权限', resource: '处方模块', action: '审核处方（审核门诊处方、审核住院处方、查看审核记录）', status: '启用中' },
    { id: 'SP-005', permissionName: '系统配置', type: '系统权限', resource: '系统配置模块', action: '修改配置（修改系统参数、查看配置变更记录）', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/configs - 系统配置 5 条 */
async function handleSystemConfigs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SC-001', configKey: 'system.name', value: '健澜智慧医疗平台（jlmedaios）', type: '字符串', description: '系统名称（显示在登录页、浏览器标题栏）', updateTime: '2021-01-01（最近更新：2025-01-01）' },
    { id: 'SC-002', configKey: 'system.version', value: 'v3.2.0（2026-10-01 发布）', type: '字符串', description: '系统版本号（显示在关于页面）', updateTime: '2026-10-01' },
    { id: 'SC-003', configKey: 'demo.mode', value: '1（启用演示模式）', type: '布尔值', description: '是否启用演示模式（启用后所有接口返回 mock 数据，无需真实数据库）', updateTime: '2026-10-01' },
    { id: 'SC-004', configKey: 'auth.token.expire', value: '7200（秒，即 2 小时）', type: '整数', description: '用户登录 token 过期时间（超过此时间需重新登录）', updateTime: '2023-01-01（最近更新：2025-06-01）' },
    { id: 'SC-005', configKey: 'upload.max.size', value: '10485760（字节，即 10 MB）', type: '整数', description: '文件上传最大大小（超过此大小的文件将被拒绝）', updateTime: '2023-01-01（最近更新：2025-03-15）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/logs - 系统日志 5 条 */
async function handleSystemLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SL-001', logId: 'LOG-2026-10-20-000001', level: 'INFO（信息）', module: '用户认证模块', content: '用户 admin（系统管理员）登录成功（IP：192.168.1.100，时间：2026-10-20 08:00:00）', time: '2026-10-20 08:00:00' },
    { id: 'SL-002', logId: 'LOG-2026-10-20-000002', level: 'INFO（信息）', module: '病历模块', content: '用户 李***（心内科主治医师）提交了 1 份新病历（患者：张***，住院号：ZY-2026-000123）', time: '2026-10-20 09:30:00' },
    { id: 'SL-003', logId: 'LOG-2026-10-20-000003', level: 'WARN（警告）', module: '处方模块', content: '用户 王***（主管药师）审核处方时发现 1 张处方剂量偏大（处方号：RX-2026-OP-000003，患者：刘***）', time: '2026-10-20 10:00:00' },
    { id: 'SL-004', logId: 'LOG-2026-10-20-000004', level: 'ERROR（错误）', module: '数据库模块', content: '数据库连接失败（错误信息：connection refused，IP：127.0.0.1:5433，时间：2026-10-20 11:00:00）', time: '2026-10-20 11:00:00' },
    { id: 'SL-005', logId: 'LOG-2026-10-20-000005', level: 'INFO（信息）', module: '系统配置模块', content: '用户 admin（系统管理员）修改了系统配置 demo.mode 从 0 改为 1（启用演示模式）', time: '2026-10-20 14:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/version - 版本信息 5 条 */
async function handleSystemVersion(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SV-001', version: 'v3.2.0（当前版本）', publishTime: '2026-10-01', updateContent: '新增 FHIR R4 网关（18 个资源端点）、新增 CDS 临床决策支持模块（6 个端点）、新增工作流任务调度模块（5 个端点）', status: '现行有效', author: '健澜科技研发部' },
    { id: 'SV-002', version: 'v3.1.0', publishTime: '2026-07-01', updateContent: '新增患者 360 模块（6 个端点）、新增安全审计模块（13 个端点）、优化系统性能（QPS 提升 30%）', status: '已归档', author: '健澜科技研发部' },
    { id: 'SV-003', version: 'v3.0.0', publishTime: '2026-04-01', updateContent: '新增多租户模块（6 个端点）、新增 BI 数据可视化模块（5 个端点）、全面升级前端框架（Vue 2 → Vue 3）', status: '已归档', author: '健澜科技研发部' },
    { id: 'SV-004', version: 'v2.5.0', publishTime: '2025-10-01', updateContent: '新增互联网医院模块（3 个端点）、新增远程医疗模块（5 个端点）、优化移动端体验', status: '已归档', author: '健澜科技研发部' },
    { id: 'SV-005', version: 'v2.0.0', publishTime: '2025-01-01', updateContent: '系统全面重构（单体架构 → 微服务架构）、新增 100+ 业务端点、通过电子病历五级评审', status: '已归档', author: '健澜科技研发部' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m343Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/roles', handle: handleSecurityRoles, auth: true },
  { method: 'GET', path: '/api/v1/security/permissions', handle: handleSecurityPermissions, auth: true },
  { method: 'GET', path: '/api/v1/system/configs', handle: handleSystemConfigs, auth: true },
  { method: 'GET', path: '/api/v1/system/logs', handle: handleSystemLogs, auth: true },
  { method: 'GET', path: '/api/v1/system/version', handle: handleSystemVersion, auth: true },
];
