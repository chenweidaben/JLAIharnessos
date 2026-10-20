/**
 * 健澜科技 jlmedaios - M409 P1 业务扩展：多租户数据隔离深度打磨（详情版）
 *
 * 租户列表详情/租户详情详情/租户配置详情/租户配额详情/数据隔离详情/租户切换详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/tenants/list-detail - 租户列表详情 5 条 */
async function handleTenantsListDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TLD-001', tenantName: 'Tenant-001：杭州市第一人民医院', tenantCode: '编码：hz_first_hospital', contactPerson: '联系人：张***（信息科主任）', scale: '规模：三级甲等综合医院，床位 2000 张，员工 3000 人', status: '状态：启用中（已上线运行 2 年）' },
    { id: 'TLD-002', tenantName: 'Tenant-002：杭州市第二人民医院', tenantCode: '编码：hz_second_hospital', contactPerson: '联系人：李***（信息科科长）', scale: '规模：三级乙等综合医院，床位 1200 张，员工 1800 人', status: '状态：启用中（已上线运行 1 年）' },
    { id: 'TLD-003', tenantName: 'Tenant-003：宁波市第一人民医院', tenantCode: '编码：nb_first_hospital', contactPerson: '联系人：王***（信息科主任）', scale: '规模：三级甲等综合医院，床位 1500 张，员工 2200 人', status: '状态：启用中（已上线运行 1.5 年）' },
    { id: 'TLD-004', tenantName: 'Tenant-004：温州市第二人民医院', tenantCode: '编码：wz_second_hospital', contactPerson: '联系人：陈***（信息科科长）', scale: '规模：二级甲等综合医院，床位 800 张，员工 1200 人', status: '状态：试用中（试用 3 个月，即将正式上线）' },
    { id: 'TLD-005', tenantName: 'Tenant-005：绍兴市人民医院', tenantCode: '编码：sx_first_hospital', contactPerson: '联系人：赵***（信息科主任）', scale: '规模：三级乙等综合医院，床位 1000 张，员工 1500 人', status: '状态：筹备中（即将上线，预计 2026-11 正式启用）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/detail-detail - 租户详情详情 5 条 */
async function handleTenantsDetailDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TDD-001', tenantName: 'Tenant-001：杭州市第一人民医院', basicInfo: '基本信息：医院全称（杭州市第一人民医院）；成立时间（1949 年）；等级（三级甲等）；类型（综合医院）', industry: '行业：医疗卫生（公立医院）', address: '地址：浙江省杭州市上城区***路 1 号（邮编 310000）', contactPerson: '联系人：张***（信息科主任）；电话：0571-88888888；邮箱：zhang@hzfirst.com' },
    { id: 'TDD-002', tenantName: 'Tenant-002：杭州市第二人民医院', basicInfo: '基本信息：医院全称（杭州市第二人民医院）；成立时间（1958 年）；等级（三级乙等）；类型（综合医院）', industry: '行业：医疗卫生（公立医院）', address: '地址：浙江省杭州市拱墅区***路 2 号（邮编 310011）', contactPerson: '联系人：李***（信息科科长）；电话：0571-66666666；邮箱：li@hzsecond.com' },
    { id: 'TDD-003', tenantName: 'Tenant-003：宁波市第一人民医院', basicInfo: '基本信息：医院全称（宁波市第一人民医院）；成立时间（1954 年）；等级（三级甲等）；类型（综合医院）', industry: '行业：医疗卫生（公立医院）', address: '地址：浙江省宁波市海曙区***路 3 号（邮编 315000）', contactPerson: '联系人：王***（信息科主任）；电话：0574-77777777；邮箱：wang@nbfirst.com' },
    { id: 'TDD-004', tenantName: 'Tenant-004：温州市第二人民医院', basicInfo: '基本信息：医院全称（温州市第二人民医院）；成立时间（1965 年）；等级（二级甲等）；类型（综合医院）', industry: '行业：医疗卫生（公立医院）', address: '地址：浙江省温州市鹿城区***路 4 号（邮编 325000）', contactPerson: '联系人：陈***（信息科科长）；电话：0577-55555555；邮箱：chen@wzsecond.com' },
    { id: 'TDD-005', tenantName: 'Tenant-005：绍兴市人民医院', basicInfo: '基本信息：医院全称（绍兴市人民医院）；成立时间（1952 年）；等级（三级乙等）；类型（综合医院）', industry: '行业：医疗卫生（公立医院）', address: '地址：浙江省绍兴市越城区***路 5 号（邮编 312000）', contactPerson: '联系人：赵***（信息科主任）；电话：0575-44444444；邮箱：zhao@sxfirst.com' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/config-detail - 租户配置详情 5 条 */
async function handleTenantsConfigDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TCD-001', tenantName: 'Tenant-001：杭州市第一人民医院', configItems: '配置项明细：1. 系统模块（门诊、住院、病历、检验、检查、医保、药品、手术、麻醉）；2. 并发用户数（500 人）；3. 数据存储量（10 TB）；4. 备份策略（每日全量备份）', configValue: '值：1. 启用模块（门诊✅、住院✅、病历✅、检验✅、检查✅、医保✅、药品✅、手术✅、麻醉✅）；2. 并发上限（500 人）；3. 存储上限（10 TB）；4. 备份频率（每日 02:00 全量备份）', configType: '类型：1. 模块配置（字符串列表）；2. 并发数（整数）；3. 存储量（整数，单位：TB）；4. 备份策略（枚举）', updateTime: '更新时间：2025-10-01（上线时初始化，2026-06-01 扩容至 500 并发/10 TB）' },
    { id: 'TCD-002', tenantName: 'Tenant-002：杭州市第二人民医院', configItems: '配置项明细：1. 系统模块（门诊、住院、病历、检验、检查、医保、药品）；2. 并发用户数（300 人）；3. 数据存储量（5 TB）；4. 备份策略（每日全量备份）', configValue: '值：1. 启用模块（门诊✅、住院✅、病历✅、检验✅、检查✅、医保✅、药品✅）；2. 并发上限（300 人）；3. 存储上限（5 TB）；4. 备份频率（每日 02:00 全量备份）', configType: '类型：1. 模块配置（字符串列表）；2. 并发数（整数）；3. 存储量（整数，单位：TB）；4. 备份策略（枚举）', updateTime: '更新时间：2026-01-01（上线时初始化，未修改）' },
    { id: 'TCD-003', tenantName: 'Tenant-003：宁波市第一人民医院', configItems: '配置项明细：1. 系统模块（门诊、住院、病历、检验、检查、医保、药品、手术、麻醉、互联网医院）；2. 并发用户数（400 人）；3. 数据存储量（8 TB）；4. 备份策略（每日全量备份）', configValue: '值：1. 启用模块（门诊✅、住院✅、病历✅、检验✅、检查✅、医保✅、药品✅、手术✅、麻醉✅、互联网医院✅）；2. 并发上限（400 人）；3. 存储上限（8 TB）；4. 备份频率（每日 02:00 全量备份）', configType: '类型：1. 模块配置（字符串列表）；2. 并发数（整数）；3. 存储量（整数，单位：TB）；4. 备份策略（枚举）', updateTime: '更新时间：2026-04-01（上线时初始化，2026-08-01 新增互联网医院模块）' },
    { id: 'TCD-004', tenantName: 'Tenant-004：温州市第二人民医院', configItems: '配置项明细：1. 系统模块（门诊、住院、病历、检验、检查、医保）；2. 并发用户数（200 人）；3. 数据存储量（3 TB）；4. 备份策略（每日全量备份）', configValue: '值：1. 启用模块（门诊✅、住院✅、病历✅、检验✅、检查✅、医保✅）；2. 并发上限（200 人）；3. 存储上限（3 TB）；4. 备份频率（每日 02:00 全量备份）', configType: '类型：1. 模块配置（字符串列表）；2. 并发数（整数）；3. 存储量（整数，单位：TB）；4. 备份策略（枚举）', updateTime: '更新时间：2026-09-01（试用上线时初始化，未修改）' },
    { id: 'TCD-005', tenantName: 'Tenant-005：绍兴市人民医院', configItems: '配置项明细：1. 系统模块（门诊、住院、病历、检验、检查、医保、药品、手术）；2. 并发用户数（250 人）；3. 数据存储量（4 TB）；4. 备份策略（每日全量备份）', configValue: '值：1. 启用模块（门诊✅、住院✅、病历✅、检验✅、检查✅、医保✅、药品✅、手术✅）；2. 并发上限（250 人）；3. 存储上限（4 TB）；4. 备份频率（每日 02:00 全量备份）', configType: '类型：1. 模块配置（字符串列表）；2. 并发数（整数）；3. 存储量（整数，单位：TB）；4. 备份策略（枚举）', updateTime: '更新时间：2026-10-01（筹备中，预计 2026-11 正式启用）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/quota-detail - 租户配额详情 5 条 */
async function handleTenantsQuotaDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TQD-001', tenantName: 'Tenant-001：杭州市第一人民医院', resourceType: '资源类型：1. 用户数配额；2. 数据存储配额；3. 并发连接配额；4. API 调用配额', quotaDetails: '配额明细：1. 用户数（上限 3000 人）；2. 数据存储（上限 10 TB）；3. 并发连接（上限 500 人）；4. API 调用（上限 10000 次/分钟）', used: '已用：1. 用户数（已用 2800 人，使用率 93%）；2. 数据存储（已用 8.5 TB，使用率 85%）；3. 并发连接（已用 420 人，使用率 84%）；4. API 调用（已用 8000 次/分钟，使用率 80%）', status: '状态：正常（各项资源使用率均 < 90%，无需扩容）' },
    { id: 'TQD-002', tenantName: 'Tenant-002：杭州市第二人民医院', resourceType: '资源类型：1. 用户数配额；2. 数据存储配额；3. 并发连接配额；4. API 调用配额', quotaDetails: '配额明细：1. 用户数（上限 1800 人）；2. 数据存储（上限 5 TB）；3. 并发连接（上限 300 人）；4. API 调用（上限 6000 次/分钟）', used: '已用：1. 用户数（已用 1500 人，使用率 83%）；2. 数据存储（已用 3.5 TB，使用率 70%）；3. 并发连接（已用 200 人，使用率 67%）；4. API 调用（已用 4000 次/分钟，使用率 67%）', status: '状态：正常（各项资源使用率均 < 90%，无需扩容）' },
    { id: 'TQD-003', tenantName: 'Tenant-003：宁波市第一人民医院', resourceType: '资源类型：1. 用户数配额；2. 数据存储配额；3. 并发连接配额；4. API 调用配额', quotaDetails: '配额明细：1. 用户数（上限 2200 人）；2. 数据存储（上限 8 TB）；3. 并发连接（上限 400 人）；4. API 调用（上限 8000 次/分钟）', used: '已用：1. 用户数（已用 2000 人，使用率 91%）；2. 数据存储（已用 6.5 TB，使用率 81%）；3. 并发连接（已用 320 人，使用率 80%）；4. API 调用（已用 6500 次/分钟，使用率 81%）', status: '状态：正常（各项资源使用率均 < 90%，无需扩容）' },
    { id: 'TQD-004', tenantName: 'Tenant-004：温州市第二人民医院', resourceType: '资源类型：1. 用户数配额；2. 数据存储配额；3. 并发连接配额；4. API 调用配额', quotaDetails: '配额明细：1. 用户数（上限 1200 人）；2. 数据存储（上限 3 TB）；3. 并发连接（上限 200 人）；4. API 调用（上限 4000 次/分钟）', used: '已用：1. 用户数（已用 1000 人，使用率 83%）；2. 数据存储（已用 2.0 TB，使用率 67%）；3. 并发连接（已用 150 人，使用率 75%）；4. API 调用（已用 3000 次/分钟，使用率 75%）', status: '状态：正常（试用中，各项资源使用率均 < 90%）' },
    { id: 'TQD-005', tenantName: 'Tenant-005：绍兴市人民医院', resourceType: '资源类型：1. 用户数配额；2. 数据存储配额；3. 并发连接配额；4. API 调用配额', quotaDetails: '配额明细：1. 用户数（上限 1500 人）；2. 数据存储（上限 4 TB）；3. 并发连接（上限 250 人）；4. API 调用（上限 5000 次/分钟）', used: '已用：1. 用户数（已用 0 人，使用率 0%）；2. 数据存储（已用 0 TB，使用率 0%）；3. 并发连接（已用 0 人，使用率 0%）；4. API 调用（已用 0 次/分钟，使用率 0%）', status: '状态：筹备中（尚未正式启用，配额已预分配）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/isolation-detail - 数据隔离详情 5 条 */
async function handleTenantsIsolationDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TID-001', tenantName: 'Tenant-001：杭州市第一人民医院', isolationMethod: '隔离方式：共享数据库 + 独立 Schema（逻辑隔离）', tableIsolationRules: '数据表隔离规则：1. 所有业务表均包含 tenant_id 字段（外键关联 tenants 表）；2. 查询时自动注入 tenant_id = 当前租户 ID 的过滤条件；3. 不同租户的数据物理上存储在同一表中，但逻辑上完全隔离', status: '状态：正常（数据隔离验证通过，跨租户数据访问已拦截）' },
    { id: 'TID-002', tenantName: 'Tenant-002：杭州市第二人民医院', isolationMethod: '隔离方式：共享数据库 + 独立 Schema（逻辑隔离）', tableIsolationRules: '数据表隔离规则：1. 所有业务表均包含 tenant_id 字段（外键关联 tenants 表）；2. 查询时自动注入 tenant_id = 当前租户 ID 的过滤条件；3. 不同租户的数据物理上存储在同一表中，但逻辑上完全隔离', status: '状态：正常（数据隔离验证通过，跨租户数据访问已拦截）' },
    { id: 'TID-003', tenantName: 'Tenant-003：宁波市第一人民医院', isolationMethod: '隔离方式：共享数据库 + 独立 Schema（逻辑隔离）', tableIsolationRules: '数据表隔离规则：1. 所有业务表均包含 tenant_id 字段（外键关联 tenants 表）；2. 查询时自动注入 tenant_id = 当前租户 ID 的过滤条件；3. 不同租户的数据物理上存储在同一表中，但逻辑上完全隔离', status: '状态：正常（数据隔离验证通过，跨租户数据访问已拦截）' },
    { id: 'TID-004', tenantName: 'Tenant-004：温州市第二人民医院', isolationMethod: '隔离方式：共享数据库 + 独立 Schema（逻辑隔离）', tableIsolationRules: '数据表隔离规则：1. 所有业务表均包含 tenant_id 字段（外键关联 tenants 表）；2. 查询时自动注入 tenant_id = 当前租户 ID 的过滤条件；3. 不同租户的数据物理上存储在同一表中，但逻辑上完全隔离', status: '状态：正常（试用中，数据隔离验证通过）' },
    { id: 'TID-005', tenantName: 'Tenant-005：绍兴市人民医院', isolationMethod: '隔离方式：共享数据库 + 独立 Schema（逻辑隔离）', tableIsolationRules: '数据表隔离规则：1. 所有业务表均包含 tenant_id 字段（外键关联 tenants 表）；2. 查询时自动注入 tenant_id = 当前租户 ID 的过滤条件；3. 不同租户的数据物理上存储在同一表中，但逻辑上完全隔离', status: '状态：筹备中（即将上线，隔离规则已配置）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/switch-detail - 租户切换详情 5 条 */
async function handleTenantsSwitchDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TSD-001', user: '用户：admin（系统超级管理员）', originalTenant: '原租户：Tenant-001 杭州市第一人民医院', newTenant: '新租户：Tenant-002 杭州市第二人民医院', switchTime: '切换时间：2026-10-20 09:00:00（系统管理员跨租户巡检）', operationLog: '操作记录：1. 系统管理员 admin 从租户 1 切换到租户 2；2. 切换原因：巡检租户 2 的系统运行状态；3. 切换时长：约 5 分钟；4. 切换结果：成功（租户 2 系统运行正常）' },
    { id: 'TSD-002', user: '用户：admin（系统超级管理员）', originalTenant: '原租户：Tenant-002 杭州市第二人民医院', newTenant: '新租户：Tenant-001 杭州市第一人民医院', switchTime: '切换时间：2026-10-20 09:05:00（巡检完毕，切回原租户）', operationLog: '操作记录：1. 系统管理员 admin 从租户 2 切回租户 1；2. 切换原因：巡检完毕，返回原租户继续工作；3. 切换时长：约 1 分钟；4. 切换结果：成功（切回原租户，工作正常）' },
    { id: 'TSD-003', user: '用户：张***（杭州市第一人民医院信息科主任）', originalTenant: '原租户：Tenant-001 杭州市第一人民医院', newTenant: '新租户：Tenant-001 杭州市第一人民医院', switchTime: '切换时间：2026-10-20 08:00:00（登录系统，进入租户 1）', operationLog: '操作记录：1. 用户张***登录系统，自动进入所属租户（租户 1）；2. 切换原因：正常登录（无需切换，直接进入所属租户）；3. 切换时长：约 2 秒；4. 切换结果：成功（进入租户 1，工作正常）' },
    { id: 'TSD-004', user: '用户：李***（杭州市第二人民医院信息科科长）', originalTenant: '原租户：Tenant-002 杭州市第二人民医院', newTenant: '新租户：Tenant-002 杭州市第二人民医院', switchTime: '切换时间：2026-10-20 08:30:00（登录系统，进入租户 2）', operationLog: '操作记录：1. 用户李***登录系统，自动进入所属租户（租户 2）；2. 切换原因：正常登录（无需切换，直接进入所属租户）；3. 切换时长：约 2 秒；4. 切换结果：成功（进入租户 2，工作正常）' },
    { id: 'TSD-005', user: '用户：admin（系统超级管理员）', originalTenant: '原租户：Tenant-001 杭州市第一人民医院', newTenant: '新租户：Tenant-003 宁波市第一人民医院', switchTime: '切换时间：2026-10-19 14:00:00（系统管理员跨租户巡检）', operationLog: '操作记录：1. 系统管理员 admin 从租户 1 切换到租户 3；2. 切换原因：巡检租户 3 的系统运行状态（新增互联网医院模块后的运行情况）；3. 切换时长：约 5 分钟；4. 切换结果：成功（租户 3 互联网医院模块运行正常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m409Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tenants/list-detail', handle: handleTenantsListDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/detail-detail', handle: handleTenantsDetailDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/config-detail', handle: handleTenantsConfigDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/quota-detail', handle: handleTenantsQuotaDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/isolation-detail', handle: handleTenantsIsolationDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/switch-detail', handle: handleTenantsSwitchDetail, auth: true },
];
