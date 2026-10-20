/**
 * 健澜科技 jlmedaios - M345 P0 合规改造：多租户 + 数据隔离
 *
 * 租户列表/配置/数据隔离策略/配额/用量/日志（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/tenant/list - 租户列表 5 条 */
async function handleTenantList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TL-001', tenantName: '健澜科技本部', domain: 'jlmed.jianlan.com', plan: '企业版（无限用户、无限存储、专属支持）', userCount: '50 人（本部员工）', status: '启用中' },
    { id: 'TL-002', tenantName: '浙一医院', domain: 'zheyi.jianlan.com', plan: '旗舰版（1000 用户、1TB 存储、标准支持）', userCount: '800 人（浙一医院医护人员）', status: '启用中' },
    { id: 'TL-003', tenantName: '浙二医院', domain: 'zheer.jianlan.com', plan: '旗舰版（1000 用户、1TB 存储、标准支持）', userCount: '700 人（浙二医院医护人员）', status: '启用中' },
    { id: 'TL-004', tenantName: '邵逸夫医院', domain: 'shaoyifu.jianlan.com', plan: '专业版（500 用户、500GB 存储、社区支持）', userCount: '300 人（邵逸夫医院医护人员）', status: '启用中' },
    { id: 'TL-005', tenantName: '余杭区第一人民医院', domain: 'yuhang.jianlan.com', plan: '基础版（100 用户、100GB 存储、社区支持）', userCount: '50 人（余杭一院医护人员）', status: '试用中（试用期 30 天，剩余 15 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenant/config - 租户配置 5 条 */
async function handleTenantConfig(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TC-001', configKey: 'tenant.name', value: '浙一医院（浙江大学医学院附属第一医院）', type: '字符串', description: '租户名称（显示在登录页、系统标题栏）', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'TC-002', configKey: 'tenant.logo', value: 'https://jlmed.jianlan.com/assets/logos/zheyi-logo.png', type: 'URL', description: '租户 Logo（显示在登录页、系统标题栏）', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'TC-003', configKey: 'tenant.data.isolation.level', value: '严格隔离（每个租户独立数据库）', type: '字符串', description: '数据隔离级别（严格隔离 / 共享隔离 / 混合隔离）', updateTime: '2023-01-01' },
    { id: 'TC-004', configKey: 'tenant.user.max', value: '1000（用户数上限）', type: '整数', description: '租户用户数上限（超过此上限需升级套餐）', updateTime: '2023-01-01（最近更新：2025-06-01）' },
    { id: 'TC-005', configKey: 'tenant.storage.max', value: '1073741824000（字节，即 1 TB）', type: '整数', description: '租户存储上限（超过此上限需升级套餐）', updateTime: '2023-01-01（最近更新：2025-06-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenant/data-isolation - 数据隔离策略 5 条 */
async function handleTenantDataIsolation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TDI-001', policyName: '病历数据隔离策略', isolationLevel: '严格隔离（每个租户独立数据库）', resource: '病历模块（medical-records）', rule: '每个租户的病历数据存储在独立的数据库实例中，不同租户之间的数据完全隔离（无法跨租户访问）', status: '启用中' },
    { id: 'TDI-002', policyName: '处方数据隔离策略', isolationLevel: '严格隔离（每个租户独立数据库）', resource: '处方模块（prescriptions）', rule: '每个租户的处方数据存储在独立的数据库实例中，不同租户之间的数据完全隔离（无法跨租户访问）', status: '启用中' },
    { id: 'TDI-003', policyName: '检验数据隔离策略', isolationLevel: '严格隔离（每个租户独立数据库）', resource: '检验模块（lab）', rule: '每个租户的检验数据存储在独立的数据库实例中，不同租户之间的数据完全隔离（无法跨租户访问）', status: '启用中' },
    { id: 'TDI-004', policyName: '影像数据隔离策略', isolationLevel: '严格隔离（每个租户独立存储）', resource: '影像模块（radiology）', rule: '每个租户的影像数据（CT、MRI、X 线等）存储在独立的存储桶中，不同租户之间的数据完全隔离（无法跨租户访问）', status: '启用中' },
    { id: 'TDI-005', policyName: '用户数据隔离策略', isolationLevel: '共享隔离（共享数据库，通过 tenantId 字段隔离）', resource: '用户模块（users）', rule: '所有租户的用户数据存储在同一个数据库实例中，但每条用户数据都包含 tenantId 字段，系统通过 tenantId 字段进行数据隔离（不同租户只能访问自己的用户数据）', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenant/quota - 租户配额 5 条 */
async function handleTenantQuota(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TQ-001', tenantName: '浙一医院', resourceType: '用户数', used: '800 人', limit: '1000 人', usageRate: '80%（已使用 80% 配额）' },
    { id: 'TQ-002', tenantName: '浙一医院', resourceType: '存储空间', used: '700 GB', limit: '1024 GB（1 TB）', usageRate: '68%（已使用 68% 配额）' },
    { id: 'TQ-003', tenantName: '浙一医院', resourceType: 'API 调用次数（每日）', used: '50,000 次', limit: '100,000 次', usageRate: '50%（已使用 50% 配额）' },
    { id: 'TQ-004', tenantName: '浙二医院', resourceType: '用户数', used: '700 人', limit: '1000 人', usageRate: '70%（已使用 70% 配额）' },
    { id: 'TQ-005', tenantName: '浙二医院', resourceType: '存储空间', used: '600 GB', limit: '1024 GB（1 TB）', usageRate: '59%（已使用 59% 配额）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenant/usage - 租户用量 5 条 */
async function handleTenantUsage(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TU-001', tenantName: '浙一医院', resourceType: '用户数', usage: '800 人（本月新增 50 人）', time: '2026-10-20（本月统计）', trend: '上升（较上月增长 6.7%）' },
    { id: 'TU-002', tenantName: '浙一医院', resourceType: '存储空间', usage: '700 GB（本月新增 50 GB）', time: '2026-10-20（本月统计）', trend: '上升（较上月增长 7.7%）' },
    { id: 'TU-003', tenantName: '浙一医院', resourceType: 'API 调用次数（每日）', usage: '50,000 次（本月日均）', time: '2026-10-20（本月统计）', trend: '稳定（较上月增长 0%）' },
    { id: 'TU-004', tenantName: '浙二医院', resourceType: '用户数', usage: '700 人（本月新增 30 人）', time: '2026-10-20（本月统计）', trend: '上升（较上月增长 4.5%）' },
    { id: 'TU-005', tenantName: '浙二医院', resourceType: '存储空间', usage: '600 GB（本月新增 30 GB）', time: '2026-10-20（本月统计）', trend: '上升（较上月增长 5.3%）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenant/logs - 租户日志 5 条 */
async function handleTenantLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TL-001', tenantName: '浙一医院', operator: '张***（浙一医院信息科主任）', operation: '修改了租户配置（tenant.data.isolation.level 从 "共享隔离" 改为 "严格隔离"）', time: '2026-10-20 09:00:00', result: '成功（配置已生效）' },
    { id: 'TL-002', tenantName: '浙一医院', operator: '李***（浙一医院系统管理员）', operation: '新增了 10 个用户（心内科医生 5 人、护士 5 人）', time: '2026-10-20 10:00:00', result: '成功（10 个用户已创建）' },
    { id: 'TL-003', tenantName: '浙二医院', operator: '王***（浙二医院信息科主任）', operation: '导出了 1,000 条病历数据（2026 年 9 月住院病历）', time: '2026-10-20 11:00:00', result: '成功（数据已导出）' },
    { id: 'TL-004', tenantName: '邵逸夫医院', operator: '赵***（邵逸夫医院系统管理员）', operation: '修改了租户套餐（从 "专业版" 升级为 "旗舰版"）', time: '2026-10-20 14:00:00', result: '成功（套餐已升级，用户数上限从 500 人调整为 1000 人）' },
    { id: 'TL-005', tenantName: '余杭区第一人民医院', operator: '孙***（余杭一院信息科主任）', operation: '申请了试用延期（从 30 天延长至 60 天）', time: '2026-10-20 15:00:00', result: '待审批（已提交申请，等待健澜科技销售团队审批）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m345Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tenant/list', handle: handleTenantList, auth: true },
  { method: 'GET', path: '/api/v1/tenant/config', handle: handleTenantConfig, auth: true },
  { method: 'GET', path: '/api/v1/tenant/data-isolation', handle: handleTenantDataIsolation, auth: true },
  { method: 'GET', path: '/api/v1/tenant/quota', handle: handleTenantQuota, auth: true },
  { method: 'GET', path: '/api/v1/tenant/usage', handle: handleTenantUsage, auth: true },
  { method: 'GET', path: '/api/v1/tenant/logs', handle: handleTenantLogs, auth: true },
];
