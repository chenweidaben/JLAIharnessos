/**
 * 健澜科技 jlmedaios - M388 P1 业务扩展：PHI脱敏数据加密深度打磨
 *
 * PHI脱敏规则/数据加密/数据解密/PHI审计/隐私策略/知情同意
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/phi/masking - PHI脱敏规则 5 条 */
async function handlePhiMasking(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PM-001', ruleName: '姓名脱敏规则', field: '患者姓名', maskingMethod: '保留姓氏，名字用 * 替代（如张***）', applicableScenario: '对外展示（如互联网医院、患者端 APP）', status: '已启用（当前有效）' },
    { id: 'PM-002', ruleName: '身份证号脱敏规则', field: '身份证号', maskingMethod: '保留前 6 位和后 4 位，中间用 * 替代（如 330106********1234）', applicableScenario: '对外展示（如互联网医院、患者端 APP）', status: '已启用（当前有效）' },
    { id: 'PM-003', ruleName: '手机号脱敏规则', field: '手机号', maskingMethod: '保留前 3 位和后 4 位，中间用 * 替代（如 138****5678）', applicableScenario: '对外展示（如互联网医院、患者端 APP）', status: '已启用（当前有效）' },
    { id: 'PM-004', ruleName: '地址脱敏规则', field: '家庭住址', maskingMethod: '保留区/县，详细地址用 * 替代（如杭州市西湖区****）', applicableScenario: '对外展示（如互联网医院、患者端 APP）', status: '已启用（当前有效）' },
    { id: 'PM-005', ruleName: '病历号脱敏规则', field: '病历号', maskingMethod: '全部用 * 替代（如 ******）', applicableScenario: '对外展示（如科研数据共享）', status: '已启用（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/phi/encryption - 数据加密 5 条 */
async function handlePhiEncryption(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PE-001', fieldName: '身份证号', algorithm: 'AES-256-CBC（对称加密算法）', key: '加密密钥存储于 KMS（密钥管理服务），每 90 天自动轮换', status: '已启用（当前有效）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'PE-002', fieldName: '手机号', algorithm: 'AES-256-CBC（对称加密算法）', key: '加密密钥存储于 KMS（密钥管理服务），每 90 天自动轮换', status: '已启用（当前有效）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'PE-003', fieldName: '家庭住址', algorithm: 'AES-256-CBC（对称加密算法）', key: '加密密钥存储于 KMS（密钥管理服务），每 90 天自动轮换', status: '已启用（当前有效）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'PE-004', fieldName: '病史描述（自由文本）', algorithm: 'RSA-2048（非对称加密算法）', key: '加密公钥存储于系统，解密私钥存储于 KMS（密钥管理服务）', status: '已启用（当前有效）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
    { id: 'PE-005', fieldName: '检查报告（PDF 文件）', algorithm: 'AES-256-GCM（对称加密算法）', key: '加密密钥存储于 KMS（密钥管理服务），每 90 天自动轮换', status: '已启用（当前有效）', updateTime: '2026-01-01 00:00:00（最近更新时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/phi/decryption - 数据解密 5 条 */
async function handlePhiDecryption(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PD-001', fieldName: '身份证号', algorithm: 'AES-256-CBC（对称解密算法）', key: '解密密钥存储于 KMS（密钥管理服务），需经审批后才能使用', status: '已启用（当前有效）', time: '2026-10-20 09:00:00（最近解密时间）' },
    { id: 'PD-002', fieldName: '手机号', algorithm: 'AES-256-CBC（对称解密算法）', key: '解密密钥存储于 KMS（密钥管理服务），需经审批后才能使用', status: '已启用（当前有效）', time: '2026-10-20 10:00:00（最近解密时间）' },
    { id: 'PD-003', fieldName: '家庭住址', algorithm: 'AES-256-CBC（对称解密算法）', key: '解密密钥存储于 KMS（密钥管理服务），需经审批后才能使用', status: '已启用（当前有效）', time: '2026-10-20 11:00:00（最近解密时间）' },
    { id: 'PD-004', fieldName: '病史描述（自由文本）', algorithm: 'RSA-2048（非对称解密算法）', key: '解密私钥存储于 KMS（密钥管理服务），需经审批后才能使用', status: '已启用（当前有效）', time: '2026-10-20 14:00:00（最近解密时间）' },
    { id: 'PD-005', fieldName: '检查报告（PDF 文件）', algorithm: 'AES-256-GCM（对称解密算法）', key: '解密密钥存储于 KMS（密钥管理服务），需经审批后才能使用', status: '已启用（当前有效）', time: '2026-10-20 15:00:00（最近解密时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/phi/audit - PHI审计 5 条 */
async function handlePhiAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PA-001', auditId: 'AUD-2026-1001', user: '内科医生张***（查询患者病历）', operation: '查询（SELECT）', field: '患者姓名 + 身份证号 + 病史描述', time: '2026-10-20 09:00:00（操作时间）' },
    { id: 'PA-002', auditId: 'AUD-2026-1002', user: '外科医生李***（导出患者病历）', operation: '导出（EXPORT）', field: '患者姓名 + 手机号 + 检查报告', time: '2026-10-20 10:00:00（操作时间）' },
    { id: 'PA-003', auditId: 'AUD-2026-1003', user: '科研人员王***（查询科研数据）', operation: '查询（SELECT）', field: '脱敏后的患者数据（姓名已脱敏 + 身份证号已加密）', time: '2026-10-20 11:00:00（操作时间）' },
    { id: 'PA-004', auditId: 'AUD-2026-1004', user: '系统管理员刘***（配置 PHI 脱敏规则）', operation: '配置（UPDATE）', field: 'PHI 脱敏规则配置表', time: '2026-10-20 14:00:00（操作时间）' },
    { id: 'PA-005', auditId: 'AUD-2026-1005', user: '财务科职员陈***（查询患者费用信息）', operation: '查询（SELECT）', field: '患者姓名 + 费用明细（不含身份证号、手机号等敏感信息）', time: '2026-10-20 15:00:00（操作时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/phi/policies - 隐私策略 5 条 */
async function handlePhiPolicies(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PP-001', policyName: '患者隐私保护政策（2026 版）', version: 'v2.0（2026-01-01 发布）', content: '本政策旨在保护患者的个人隐私和医疗数据安全，明确医院在收集、使用、存储、共享患者数据时应遵循的原则和规范', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'PP-002', policyName: '医疗数据分类分级管理办法（2026 版）', version: 'v1.5（2026-01-01 发布）', content: '本办法将医疗数据分为公开数据、内部数据、敏感数据、核心数据四个等级，明确不同等级数据的管理要求和保护措施', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'PP-003', policyName: '医疗数据安全事件应急预案（2026 版）', version: 'v1.0（2026-01-01 发布）', content: '本预案明确医疗数据安全事件的分级、应急响应流程、处置措施、报告要求等内容', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'PP-004', policyName: '科研数据共享管理办法（2026 版）', version: 'v1.2（2026-01-01 发布）', content: '本办法明确科研数据共享的申请流程、审批要求、数据脱敏要求、安全保护措施等内容', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'PP-005', policyName: '员工保密协议（2026 版）', version: 'v1.0（2026-01-01 发布）', content: '本协议明确员工在医院工作期间及离职后应遵守的保密义务，包括不得泄露患者隐私、不得泄露医疗数据、不得泄露商业秘密等内容', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/phi/consent - 知情同意 5 条 */
async function handlePhiConsent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PC-001', patientName: '张***（55 岁男性）', consentItem: '同意医院收集和使用其个人医疗数据用于诊疗目的', time: '2026-10-01 09:00:00（签署时间）', method: '电子签名（在医院 HIS 系统中签署）', status: '已同意（当前有效）' },
    { id: 'PC-002', patientName: '李***（60 岁女性）', consentItem: '同意医院将其个人医疗数据用于科研目的（脱敏后）', time: '2026-10-02 10:00:00（签署时间）', method: '电子签名（在医院 HIS 系统中签署）', status: '已同意（当前有效）' },
    { id: 'PC-003', patientName: '王***（65 岁男性）', consentItem: '同意医院将其个人医疗数据用于医保结算', time: '2026-10-03 11:00:00（签署时间）', method: '纸质签名（在门诊收费处签署）', status: '已同意（当前有效）' },
    { id: 'PC-004', patientName: '刘***（70 岁女性）', consentItem: '同意医院将其个人医疗数据用于互联网医院在线问诊', time: '2026-10-04 14:00:00（签署时间）', method: '电子签名（在互联网医院 APP 中签署）', status: '已同意（当前有效）' },
    { id: 'PC-005', patientName: '陈***（50 岁男性）', consentItem: '同意医院将其个人医疗数据用于双向转诊（基层医院向上级医院转诊）', time: '2026-10-05 15:00:00（签署时间）', method: '纸质签名（在基层医院签署）', status: '已同意（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m388Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/phi/masking', handle: handlePhiMasking, auth: true },
  { method: 'GET', path: '/api/v1/phi/encryption', handle: handlePhiEncryption, auth: true },
  { method: 'GET', path: '/api/v1/phi/decryption', handle: handlePhiDecryption, auth: true },
  { method: 'GET', path: '/api/v1/phi/audit', handle: handlePhiAudit, auth: true },
  { method: 'GET', path: '/api/v1/phi/policies', handle: handlePhiPolicies, auth: true },
  { method: 'GET', path: '/api/v1/phi/consent', handle: handlePhiConsent, auth: true },
];
