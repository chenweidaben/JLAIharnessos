/**
 * 健澜科技 jlmedaios - M346 P0 合规改造：PHI 脱敏 + 数据加密
 *
 * 脱敏规则/脱敏日志 + 加密密钥/加密状态 + 数据分类/数据保留策略（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/masking-rules - 脱敏规则 5 条 */
async function handleMaskingRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'MR-001', ruleName: '患者姓名脱敏规则', field: 'patient.name（患者姓名）', maskingMethod: '部分掩码（显示前 1 字 + ***，如 "张***"）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'MR-002', ruleName: '患者身份证号脱敏规则', field: 'patient.idCard（患者身份证号）', maskingMethod: '完全掩码（显示前 6 位 + ********** + 后 4 位，如 "330106**********1234"）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'MR-003', ruleName: '患者手机号脱敏规则', field: 'patient.phone（患者手机号）', maskingMethod: '部分掩码（显示前 3 位 + **** + 后 4 位，如 "138****1234"）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'MR-004', ruleName: '患者住址脱敏规则', field: 'patient.address（患者住址）', maskingMethod: '部分掩码（显示区/县 + ***，如 "杭州市西湖区***"）', status: '启用中', updateTime: '2023-01-01（最近更新：2025-01-01）' },
    { id: 'MR-005', ruleName: '患者病历号脱敏规则', field: 'medicalRecord.no（病历号）', maskingMethod: '不脱敏（病历号为内部标识符，不包含 PHI 信息）', status: '启用中', updateTime: '2023-01-01' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/masking-logs - 脱敏日志 5 条 */
async function handleMaskingLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ML-001', logId: 'MASK-LOG-2026-10-20-000001', user: '李***（心内科主治医师）', field: 'patient.name（患者姓名）', maskingMethod: '部分掩码（显示前 1 字 + ***）', time: '2026-10-20 09:00:00（查看患者张***的病历时）' },
    { id: 'ML-002', logId: 'MASK-LOG-2026-10-20-000002', user: '王***（主管药师）', field: 'patient.idCard（患者身份证号）', maskingMethod: '完全掩码（显示前 6 位 + ********** + 后 4 位）', time: '2026-10-20 10:00:00（审核患者王***的处方时）' },
    { id: 'ML-003', logId: 'MASK-LOG-2026-10-20-000003', user: '赵***（骨科主任医师）', field: 'patient.phone（患者手机号）', maskingMethod: '部分掩码（显示前 3 位 + **** + 后 4 位）', time: '2026-10-20 11:00:00（查看患者刘***的随访记录时）' },
    { id: 'ML-004', logId: 'MASK-LOG-2026-10-20-000004', user: '周***（普外科副主任医师）', field: 'patient.address（患者住址）', maskingMethod: '部分掩码（显示区/县 + ***）', time: '2026-10-20 14:00:00（查看患者孙***的出院指导时）' },
    { id: 'ML-005', logId: 'MASK-LOG-2026-10-20-000005', user: '郑***（胸外科主任医师）', field: 'patient.name（患者姓名）', maskingMethod: '部分掩码（显示前 1 字 + ***）', time: '2026-10-20 15:00:00（查看患者吴***的手术记录时）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/encryption-keys - 加密密钥 5 条 */
async function handleEncryptionKeys(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EK-001', keyId: 'KEY-2023-001', type: '数据加密密钥（DEK）', algorithm: 'AES-256（对称加密算法）', status: '启用中', updateTime: '2023-01-01（最近轮换：2025-07-01）' },
    { id: 'EK-002', keyId: 'KEY-2023-002', type: '密钥加密密钥（KEK）', algorithm: 'RSA-4096（非对称加密算法）', status: '启用中', updateTime: '2023-01-01（最近轮换：2025-07-01）' },
    { id: 'EK-003', keyId: 'KEY-2024-001', type: '数据加密密钥（DEK）', algorithm: 'AES-256（对称加密算法）', status: '备用（待轮换）', updateTime: '2024-01-01（已生成，待 2026-07-01 轮换）' },
    { id: 'EK-004', keyId: 'KEY-2024-002', type: '密钥加密密钥（KEK）', algorithm: 'RSA-4096（非对称加密算法）', status: '备用（待轮换）', updateTime: '2024-01-01（已生成，待 2026-07-01 轮换）' },
    { id: 'EK-005', keyId: 'KEY-2022-001', type: '数据加密密钥（DEK）', algorithm: 'AES-256（对称加密算法）', status: '已归档（已停用，保留用于解密历史数据）', updateTime: '2022-01-01（已轮换：2025-07-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/encryption-status - 加密状态 5 条 */
async function handleEncryptionStatus(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ES-001', resourceName: '病历数据（medical-records）', encryptionAlgorithm: 'AES-256（静态加密）', status: '已加密（所有病历数据均已加密存储）', lastCheck: '2026-10-15（每周五自动检查）', owner: '李***（信息科安全管理员）' },
    { id: 'ES-002', resourceName: '处方数据（prescriptions）', encryptionAlgorithm: 'AES-256（静态加密）', status: '已加密（所有处方数据均已加密存储）', lastCheck: '2026-10-15（每周五自动检查）', owner: '李***（信息科安全管理员）' },
    { id: 'ES-003', resourceName: '检验数据（lab）', encryptionAlgorithm: 'AES-256（静态加密）', status: '已加密（所有检验数据均已加密存储）', lastCheck: '2026-10-15（每周五自动检查）', owner: '李***（信息科安全管理员）' },
    { id: 'ES-004', resourceName: '影像数据（radiology）', encryptionAlgorithm: 'AES-256（静态加密）', status: '已加密（所有影像数据均已加密存储）', lastCheck: '2026-10-15（每周五自动检查）', owner: '李***（信息科安全管理员）' },
    { id: 'ES-005', resourceName: '用户数据（users）', encryptionAlgorithm: 'AES-256（静态加密）', status: '已加密（所有用户数据均已加密存储，密码使用 bcrypt 哈希）', lastCheck: '2026-10-15（每周五自动检查）', owner: '李***（信息科安全管理员）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/data-classification - 数据分类 5 条 */
async function handleDataClassification(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DC-001', classificationName: '公开数据（Public）', level: 'L1（最低级别，可公开访问）', fieldCount: '10 个字段（如：科室名称、医生姓名、医院简介）', policy: '无需加密、无需脱敏、可公开访问', status: '启用中' },
    { id: 'DC-002', classificationName: '内部数据（Internal）', level: 'L2（内部级别，仅限员工访问）', fieldCount: '20 个字段（如：员工信息、科室统计、系统配置）', policy: '静态加密、无需脱敏、仅限内部员工访问', status: '启用中' },
    { id: 'DC-003', classificationName: '敏感数据（Sensitive）', level: 'L3（敏感级别，需脱敏 + 加密）', fieldCount: '30 个字段（如：患者姓名、病历号、诊断结果）', policy: '静态加密 + 动态脱敏、仅限授权用户访问', status: '启用中' },
    { id: 'DC-004', classificationName: '高度敏感数据（Highly Sensitive）', level: 'L4（最高级别，需严格脱敏 + 加密 + 审计）', fieldCount: '15 个字段（如：患者身份证号、手机号、住址、银行卡号）', policy: '静态加密 + 动态脱敏 + 完整审计日志、仅限高度授权用户访问', status: '启用中' },
    { id: 'DC-005', classificationName: 'PHI 数据（Protected Health Information）', level: 'L4（最高级别，受 HIPAA/个人信息保护法保护）', fieldCount: '25 个字段（所有包含患者身份或健康信息的字段）', policy: '静态加密 + 动态脱敏 + 完整审计日志 + 严格访问控制', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/data-retention - 数据保留策略 5 条 */
async function handleDataRetention(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DR-001', policyName: '住院病历保留策略', dataType: '住院病历（medical-records）', retentionPeriod: '30 年（根据《医疗机构病历管理规定》）', disposalMethod: '到期后自动销毁（不可逆删除）', status: '启用中' },
    { id: 'DR-002', policyName: '门诊病历保留策略', dataType: '门诊病历（outpatient-records）', retentionPeriod: '15 年（根据《医疗机构病历管理规定》）', disposalMethod: '到期后自动销毁（不可逆删除）', status: '启用中' },
    { id: 'DR-003', policyName: '检验报告保留策略', dataType: '检验报告（lab-reports）', retentionPeriod: '10 年（根据《医疗机构临床实验室管理办法》）', disposalMethod: '到期后自动销毁（不可逆删除）', status: '启用中' },
    { id: 'DR-004', policyName: '影像报告保留策略', dataType: '影像报告（radiology-reports）', retentionPeriod: '15 年（根据《医疗机构医学影像管理规定》）', disposalMethod: '到期后自动销毁（不可逆删除）', status: '启用中' },
    { id: 'DR-005', policyName: '操作日志保留策略', dataType: '操作日志（audit-logs）', retentionPeriod: '5 年（根据《网络安全法》）', disposalMethod: '到期后自动归档（压缩存储 3 年后销毁）', status: '启用中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m346Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/masking-rules', handle: handleMaskingRules, auth: true },
  { method: 'GET', path: '/api/v1/security/masking-logs', handle: handleMaskingLogs, auth: true },
  { method: 'GET', path: '/api/v1/security/encryption-keys', handle: handleEncryptionKeys, auth: true },
  { method: 'GET', path: '/api/v1/security/encryption-status', handle: handleEncryptionStatus, auth: true },
  { method: 'GET', path: '/api/v1/security/data-classification', handle: handleDataClassification, auth: true },
  { method: 'GET', path: '/api/v1/security/data-retention', handle: handleDataRetention, auth: true },
];
