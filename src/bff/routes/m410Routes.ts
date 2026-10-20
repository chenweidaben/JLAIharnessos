/**
 * 健澜科技 jlmedaios - M410 P1 业务扩展：PHI脱敏数据加密深度打磨（详情版）
 *
 * PHI脱敏详情/数据加密详情/审计日志详情/访问控制详情/数据留存详情/合规管理详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/phi-masking-detail - PHI脱敏详情 5 条 */
async function handlePhiMaskingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PMD-001', ruleName: 'Rule-001：患者姓名脱敏', field: '字段：患者姓名（patient_name）', maskingMethod: '脱敏方式：保留姓氏，名字用 * 替换（如：张**、李**）', example: '示例：张***（原：张三）；李***（原：李四）；王***（原：王五）', status: '状态：启用中（覆盖所有患者姓名字段）' },
    { id: 'PMD-002', ruleName: 'Rule-002：身份证号脱敏', field: '字段：身份证号（id_card）', maskingMethod: '脱敏方式：保留前 6 位和后 4 位，中间用 * 替换（如：33010*********1234）', example: '示例：33010*********1234（原：330106199001011234）', status: '状态：启用中（覆盖所有身份证号字段）' },
    { id: 'PMD-003', ruleName: 'Rule-003：手机号脱敏', field: '字段：手机号（phone）', maskingMethod: '脱敏方式：保留前 3 位和后 4 位，中间用 * 替换（如：138****5678）', example: '示例：138****5678（原：13812345678）', status: '状态：启用中（覆盖所有手机号字段）' },
    { id: 'PMD-004', ruleName: 'Rule-004：家庭住址脱敏', field: '字段：家庭住址（address）', maskingMethod: '脱敏方式：保留省市区，详细地址用 * 替换（如：浙江省杭州市上城区****）', example: '示例：浙江省杭州市上城区****（原：浙江省杭州市上城区***路 1 号 101 室）', status: '状态：启用中（覆盖所有家庭住址字段）' },
    { id: 'PMD-005', ruleName: 'Rule-005：银行卡号脱敏', field: '字段：银行卡号（bank_card）', maskingMethod: '脱敏方式：保留前 4 位和后 4 位，中间用 * 替换（如：6222 **** **** 1234）', example: '示例：6222 **** **** 1234（原：6222021234567890123）', status: '状态：启用中（覆盖所有银行卡号字段）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/data-encryption-detail - 数据加密详情 5 条 */
async function handleDataEncryptionDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DED-001', fieldName: '字段：病历正文（emr_content）', algorithm: '算法：AES-256-GCM（对称加密，带认证标签）', keyLength: '密钥长度：256 位（32 字节）', status: '状态：已加密（所有病历正文均已加密存储）', updateTime: '更新时间：2025-01-01（系统上线时启用，2026-01-01 密钥轮换一次）' },
    { id: 'DED-002', fieldName: '字段：身份证号（id_card）', algorithm: '算法：AES-256-GCM（对称加密，带认证标签）', keyLength: '密钥长度：256 位（32 字节）', status: '状态：已加密（所有身份证号均已加密存储）', updateTime: '更新时间：2025-01-01（系统上线时启用，2026-01-01 密钥轮换一次）' },
    { id: 'DED-003', fieldName: '字段：手机号（phone）', algorithm: '算法：AES-256-GCM（对称加密，带认证标签）', keyLength: '密钥长度：256 位（32 字节）', status: '状态：已加密（所有手机号均已加密存储）', updateTime: '更新时间：2025-01-01（系统上线时启用，2026-01-01 密钥轮换一次）' },
    { id: 'DED-004', fieldName: '字段：医保卡号（insurance_card）', algorithm: '算法：AES-256-GCM（对称加密，带认证标签）', keyLength: '密钥长度：256 位（32 字节）', status: '状态：已加密（所有医保卡号均已加密存储）', updateTime: '更新时间：2025-01-01（系统上线时启用，2026-01-01 密钥轮换一次）' },
    { id: 'DED-005', fieldName: '字段：用户密码（password_hash）', algorithm: '算法：bcrypt（单向哈希，带盐值）', keyLength: '密钥长度：128 位（盐值 16 字节，哈希值 128 位）', status: '状态：已加密（所有用户密码均已哈希存储，不可逆）', updateTime: '更新时间：2025-01-01（系统上线时启用，未修改）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/audit-logs-detail - 审计日志详情 5 条 */
async function handleAuditLogsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ALD-001', logNo: 'AUD-2026-001（数据访问审计）', user: '用户：医生王***（心内科主治医师）', operation: '操作：访问患者张***的病历（EMR-2026-001）', data: '数据：访问字段（患者姓名、主诉、现病史、诊断、处方）；访问结果：成功（有访问权限）', time: '时间：2026-10-20 09:30:00（工作时间内访问）' },
    { id: 'ALD-002', logNo: 'AUD-2026-002（数据导出审计）', user: '用户：质控医生赵***（质控科副主任医师）', operation: '操作：导出 10 份病历（EMR-2026-001 至 EMR-2026-010）', data: '数据：导出字段（患者姓名、诊断、处方、检查结果）；导出格式：PDF；导出目的：病历质控检查', time: '时间：2026-10-20 10:30:00（工作时间内导出）' },
    { id: 'ALD-003', logNo: 'AUD-2026-003（越权访问审计）', user: '用户：医生李***（普外科副主任医师）', operation: '操作：尝试访问患者张***的病历（EMR-2026-001，心内科患者）', data: '数据：访问字段（患者姓名、主诉、诊断）；访问结果：被拦截（无访问权限，普外科医生不能访问心内科患者病历）', time: '时间：2026-10-20 11:00:00（工作时间内尝试越权访问）' },
    { id: 'ALD-004', logNo: 'AUD-2026-004（数据修改审计）', user: '用户：医生王***（心内科主治医师）', operation: '操作：修改患者张***的病历（EMR-2026-001，出院诊断）', data: '数据：修改字段（出院诊断：冠心病 → 冠心病（急性心肌梗死））；修改原因：补充诊断细节', time: '时间：2026-10-20 14:00:00（工作时间内修改）' },
    { id: 'ALD-005', logNo: 'AUD-2026-005（登录审计）', user: '用户：admin（系统超级管理员）', operation: '操作：登录系统（跨租户巡检）', data: '数据：登录 IP（192.168.1.100，院内办公网）；登录时间（2026-10-20 08:00:00）；登录结果：成功（密码验证通过）', time: '时间：2026-10-20 08:00:00（工作时间内登录）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/access-control-detail - 访问控制详情 5 条 */
async function handleAccessControlDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ACD-001', role: '角色：医生（doctor）', permissions: '权限：1. 查看本科室患者病历；2. 开具处方；3. 开具检查/检验申请；4. 填写病程记录', resources: '资源：1. 本科室患者病历（只读）；2. 处方系统（读写）；3. 检查/检验申请系统（读写）；4. 病程记录系统（读写）', policy: '策略：RBAC（基于角色的访问控制）；数据范围：仅限本科室患者；操作限制：不能查看其他科室患者病历', status: '状态：启用中' },
    { id: 'ACD-002', role: '角色：护士（nurse）', permissions: '权限：1. 查看本科室患者病历（只读）；2. 执行医嘱；3. 填写护理记录；4. 录入生命体征', resources: '资源：1. 本科室患者病历（只读）；2. 医嘱执行系统（读写）；3. 护理记录系统（读写）；4. 生命体征录入系统（读写）', policy: '策略：RBAC（基于角色的访问控制）；数据范围：仅限本科室患者；操作限制：不能开具处方、不能修改诊断', status: '状态：启用中' },
    { id: 'ACD-003', role: '角色：科室主任（department_head）', permissions: '权限：1. 查看本科室所有患者病历；2. 审核手术申请；3. 审核科室用药；4. 查看科室统计报表', resources: '资源：1. 本科室患者病历（读写）；2. 手术审批系统（读写）；3. 科室用药审核系统（读写）；4. 科室统计报表系统（只读）', policy: '策略：RBAC（基于角色的访问控制）；数据范围：仅限本科室；操作限制：不能查看其他科室患者病历', status: '状态：启用中' },
    { id: 'ACD-004', role: '角色：医保审核员（insurance_auditor）', permissions: '权限：1. 查看医保申报明细；2. 审核医保申报；3. 退回不合理申报；4. 查看医保统计报表', resources: '资源：1. 医保申报系统（读写）；2. 医保统计报表系统（只读）', policy: '策略：RBAC（基于角色的访问控制）；数据范围：所有医保申报数据；操作限制：不能修改病历、不能开具处方', status: '状态：启用中' },
    { id: 'ACD-005', role: '角色：系统管理员（system_admin）', permissions: '权限：1. 系统配置管理；2. 用户管理；3. 角色权限管理；4. 查看系统日志', resources: '资源：1. 系统配置系统（读写）；2. 用户管理系统（读写）；3. 角色权限系统（读写）；4. 系统日志系统（只读）', policy: '策略：RBAC（基于角色的访问控制）；数据范围：系统管理数据；操作限制：不能修改患者病历、不能开具处方', status: '状态：启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/data-retention-detail - 数据留存详情 5 条 */
async function handleDataRetentionDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RRD-001', dataType: '数据类型：门诊病历', retentionPeriod: '留存期限：15 年（自患者最后一次门诊之日起计算）', destructionRules: '销毁规则：超过 15 年的门诊病历，自动归档至冷存储（不删除）；超过 30 年的门诊病历，经审批后可物理销毁', status: '状态：执行中（符合《医疗机构病历管理规定》要求）', description: '说明：依据《医疗机构病历管理规定》（卫医政发〔2013〕31 号），门诊病历留存不得少于 15 年' },
    { id: 'RRD-002', dataType: '数据类型：住院病历', retentionPeriod: '留存期限：30 年（自患者最后一次住院之日起计算）', destructionRules: '销毁规则：超过 30 年的住院病历，经审批后可物理销毁（需保留患者基本信息索引）', status: '状态：执行中（符合《医疗机构病历管理规定》要求）', description: '说明：依据《医疗机构病历管理规定》（卫医政发〔2013〕31 号），住院病历留存不得少于 30 年' },
    { id: 'RRD-003', dataType: '数据类型：检验报告', retentionPeriod: '留存期限：15 年（自报告出具之日起计算）', destructionRules: '销毁规则：超过 15 年的检验报告，自动归档至冷存储（不删除）；超过 30 年的检验报告，经审批后可物理销毁', status: '状态：执行中（符合《医疗机构病历管理规定》要求）', description: '说明：检验报告属于病历的组成部分，留存期限与门诊病历一致' },
    { id: 'RRD-004', dataType: '数据类型：影像报告', retentionPeriod: '留存期限：15 年（自报告出具之日起计算）', destructionRules: '销毁规则：超过 15 年的影像报告，自动归档至冷存储（不删除）；超过 30 年的影像报告，经审批后可物理销毁', status: '状态：执行中（符合《医疗机构病历管理规定》要求）', description: '说明：影像报告属于病历的组成部分，留存期限与门诊病历一致' },
    { id: 'RRD-005', dataType: '数据类型：系统操作日志', retentionPeriod: '留存期限：180 天（自日志产生之日起计算）', destructionRules: '销毁规则：超过 180 天的系统操作日志，自动归档至冷存储；超过 1 年的系统操作日志，经审批后可物理销毁', status: '状态：执行中（符合等保 2.0 三级要求）', description: '说明：依据《网络安全等级保护基本要求》（GB/T 22239-2019），系统操作日志留存不得少于 6 个月（180 天）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/compliance-detail - 合规管理详情 5 条 */
async function handleComplianceDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CMD-001', complianceItem: '合规项：数据脱敏（PHI Masking）', standard: '标准：《个人信息保护法》（2021 年）第 51 条；《网络安全法》（2017 年）第 42 条', status: '状态：合规（已对患者姓名、身份证号、手机号等敏感字段进行脱敏）', rectification: '整改：无需整改（已符合合规要求）', time: '时间：2026-10-01（合规审计通过）' },
    { id: 'CMD-002', complianceItem: '合规项：数据加密（Data Encryption）', standard: '标准：《个人信息保护法》（2021 年）第 51 条；《网络安全法》（2017 年）第 42 条', status: '状态：合规（已对病历正文、身份证号、手机号等敏感字段进行 AES-256 加密）', rectification: '整改：无需整改（已符合合规要求）', time: '时间：2026-10-01（合规审计通过）' },
    { id: 'CMD-003', complianceItem: '合规项：访问控制（Access Control）', standard: '标准：《网络安全等级保护基本要求》（GB/T 22239-2019）第三级；《医疗机构病历管理规定》（2013 年）', status: '状态：合规（已实施 RBAC 访问控制，按科室/角色限制数据访问范围）', rectification: '整改：无需整改（已符合合规要求）', time: '时间：2026-10-01（合规审计通过）' },
    { id: 'CMD-004', complianceItem: '合规项：审计日志（Audit Logs）', standard: '标准：《网络安全等级保护基本要求》（GB/T 22239-2019）第三级；《个人信息保护法》（2021 年）第 55 条', status: '状态：合规（已记录数据访问、数据导出、数据修改等审计日志，留存 180 天）', rectification: '整改：无需整改（已符合合规要求）', time: '时间：2026-10-01（合规审计通过）' },
    { id: 'CMD-005', complianceItem: '合规项：数据留存（Data Retention）', standard: '标准：《医疗机构病历管理规定》（2013 年）；《网络安全等级保护基本要求》（GB/T 22239-2019）第三级', status: '状态：合规（门诊病历留存 15 年、住院病历留存 30 年、系统日志留存 180 天）', rectification: '整改：无需整改（已符合合规要求）', time: '时间：2026-10-01（合规审计通过）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m410Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/phi-masking-detail', handle: handlePhiMaskingDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/data-encryption-detail', handle: handleDataEncryptionDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-logs-detail', handle: handleAuditLogsDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/access-control-detail', handle: handleAccessControlDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/data-retention-detail', handle: handleDataRetentionDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/compliance-detail', handle: handleComplianceDetail, auth: true },
];
