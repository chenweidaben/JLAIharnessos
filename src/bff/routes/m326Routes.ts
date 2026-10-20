/**
 * 健澜科技 jlmedaios - M326 多租户+系统管理域
 *
 * 租户概览/配额/计费 + 系统配置/功能开关/数据字典
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/tenants/overview - 租户概览 5 条 */
async function handleTenantsOverview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TO-001', tenantName: '健澜科技附属医院（主租户）', domain: 'jlmedaios.jianlan.com', plan: '企业版（旗舰）', userCount: '1,250 人', status: '正常' },
    { id: 'TO-002', tenantName: '杭州余杭区第一人民医院', domain: 'yuhang.jianlan.com', plan: '企业版（高级）', userCount: '680 人', status: '正常' },
    { id: 'TO-003', tenantName: '宁波海曙区社区卫生服务中心', domain: 'haishu.jianlan.com', plan: '专业版（基础）', userCount: '120 人', status: '正常' },
    { id: 'TO-004', tenantName: '温州鹿城区第二人民医院', domain: 'lucheng.jianlan.com', plan: '企业版（高级）', userCount: '450 人', status: '试用（30 天）' },
    { id: 'TO-005', tenantName: '绍兴越城区康复医院', domain: 'yuecheng.jianlan.com', plan: '专业版（基础）', userCount: '85 人', status: '正常' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/quota - 租户配额 5 条 */
async function handleTenantsQuota(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TQ-001', tenantName: '健澜科技附属医院（主租户）', resourceType: '存储空间', used: '2.5 TB', limit: '5 TB', rate: '50%' },
    { id: 'TQ-002', tenantName: '健澜科技附属医院（主租户）', resourceType: 'API 调用量（日）', used: '50 万次', limit: '100 万次', rate: '50%' },
    { id: 'TQ-003', tenantName: '杭州余杭区第一人民医院', resourceType: '存储空间', used: '1.8 TB', limit: '3 TB', rate: '60%' },
    { id: 'TQ-004', tenantName: '杭州余杭区第一人民医院', resourceType: '用户数', used: '680 人', limit: '1,000 人', rate: '68%' },
    { id: 'TQ-005', tenantName: '宁波海曙区社区卫生服务中心', resourceType: '存储空间', used: '200 GB', limit: '500 GB', rate: '40%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/billing - 租户计费 5 条 */
async function handleTenantsBilling(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TB-001', tenantName: '健澜科技附属医院（主租户）', billingCycle: '2026 年 10 月（月度）', cost: '120,000.00 元/月', status: '已支付', expireTime: '2026-10-31' },
    { id: 'TB-002', tenantName: '杭州余杭区第一人民医院', billingCycle: '2026 年 10 月（月度）', cost: '60,000.00 元/月', status: '已支付', expireTime: '2026-10-31' },
    { id: 'TB-003', tenantName: '宁波海曙区社区卫生服务中心', billingCycle: '2026 年 10 月（月度）', cost: '15,000.00 元/月', status: '已支付', expireTime: '2026-10-31' },
    { id: 'TB-004', tenantName: '温州鹿城区第二人民医院', billingCycle: '2026 年 10 月（试用期）', cost: '0.00 元（免费试用）', status: '试用中', expireTime: '2026-11-15（试用 30 天）' },
    { id: 'TB-005', tenantName: '绍兴越城区康复医院', billingCycle: '2026 年 10 月（月度）', cost: '12,000.00 元/月', status: '待支付', expireTime: '2026-10-25（5 日内需支付）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/config - 系统配置 5 条 */
async function handleSystemConfig(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SC-001', configKey: 'system.name', value: '健澜科技 jlmedaios', type: 'string', description: '系统名称（显示在登录页和顶部导航）', updateTime: '2026-01-01 00:00:00' },
    { id: 'SC-002', configKey: 'system.version', value: 'v3.0.0（2026-10 版）', type: 'string', description: '当前系统版本号', updateTime: '2026-10-01 00:00:00' },
    { id: 'SC-003', configKey: 'session.timeout', value: '30（分钟）', type: 'number', description: '会话超时时间（分钟），超时后需重新登录', updateTime: '2026-06-15 10:30:00' },
    { id: 'SC-004', configKey: 'password.min-length', value: '8（位）', type: 'number', description: '密码最小长度要求', updateTime: '2026-01-01 00:00:00' },
    { id: 'SC-005', configKey: 'upload.max-size', value: '50（MB）', type: 'number', description: '文件上传最大限制（MB）', updateTime: '2026-03-20 14:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/feature-flags - 功能开关 5 条 */
async function handleSystemFeatureFlags(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SFF-001', flagName: 'ai-cds-enabled（AI 临床决策支持）', status: '开启', description: '启用 AI 辅助诊断/用药建议/危急值预警', scope: '全院（所有科室）', updateTime: '2026-09-01 00:00:00' },
    { id: 'SFF-002', flagName: 'fhir-hub-enabled（FHIR 集成网关）', status: '开启', description: '启用 FHIR R4 资源网关，支持外部系统对接', scope: '全院（所有租户）', updateTime: '2026-08-15 00:00:00' },
    { id: 'SFF-003', flagName: 'telemed-enabled（远程医疗）', status: '关闭', description: '启用远程会诊/远程门诊功能（当前未采购）', scope: '全院（所有科室）', updateTime: '2026-01-01 00:00:00' },
    { id: 'SFF-004', flagName: 'mobile-nursing-enabled（移动护理）', status: '开启', description: '启用移动护士站（PDA 扫码执行医嘱）', scope: '心内科+呼吸内科+普外科（试点科室）', updateTime: '2026-10-01 00:00:00' },
    { id: 'SFF-005', flagName: 'blockchain-audit-enabled（区块链存证）', status: '关闭', description: '启用病历区块链存证（试点项目，待上线）', scope: '全院（所有科室）', updateTime: '2026-01-01 00:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/system/dict - 数据字典 5 条 */
async function handleSystemDict(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SD-001', dictName: '性别', code: 'gender', value: '男 / 女 / 未知', sort: 1, status: '启用' },
    { id: 'SD-002', dictName: '科室分类', code: 'dept-category', value: '内科 / 外科 / 妇产科 / 儿科 / 急诊科 / 医技科室 / 行政科室', sort: 2, status: '启用' },
    { id: 'SD-003', dictName: '患者类型', code: 'patient-type', value: '门诊 / 住院 / 急诊 / 体检', sort: 3, status: '启用' },
    { id: 'SD-004', dictName: '医嘱类型', code: 'order-type', value: '长期医嘱 / 临时医嘱 / 备用医嘱', sort: 4, status: '启用' },
    { id: 'SD-005', dictName: '药品分类', code: 'drug-category', value: '西药 / 中成药 / 中药饮片 / 生物制品 / 麻醉药品 / 精神药品', sort: 5, status: '启用' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m326Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tenants/overview', handle: handleTenantsOverview, auth: true },
  { method: 'GET', path: '/api/v1/tenants/quota', handle: handleTenantsQuota, auth: true },
  { method: 'GET', path: '/api/v1/tenants/billing', handle: handleTenantsBilling, auth: true },
  { method: 'GET', path: '/api/v1/system/config', handle: handleSystemConfig, auth: true },
  { method: 'GET', path: '/api/v1/system/feature-flags', handle: handleSystemFeatureFlags, auth: true },
  { method: 'GET', path: '/api/v1/system/dict', handle: handleSystemDict, auth: true },
];
