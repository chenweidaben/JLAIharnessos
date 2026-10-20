/**
 * 健澜科技 jlmedaios - M358 P0 合规改造：安全合规深度打磨
 *
 * 安全策略/策略详情/安全漏洞/安全补丁（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/policy - 安全策略 5 条 */
async function handleSecurityPolicy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SP-001', policyName: '患者隐私数据保护策略', type: '数据安全策略（PHI 保护）', content: '所有患者隐私数据（姓名、身份证号、联系方式等）均需脱敏存储、加密传输，符合《个人信息保护法》要求', status: '生效中', updateTime: '2026-01-01（最近更新：2026-06-01）' },
    { id: 'SP-002', policyName: '系统访问控制策略', type: '访问安全策略（权限控制）', content: '所有系统均需实现基于角色的访问控制（RBAC），最小权限原则，定期权限审计', status: '生效中', updateTime: '2026-01-01（最近更新：2026-06-01）' },
    { id: 'SP-003', policyName: '审计日志管理策略', type: '审计安全策略（日志管理）', content: '所有系统操作均需记录审计日志（操作人、操作时间、操作内容），日志保留期限 ≥ 3 年', status: '生效中', updateTime: '2026-01-01（最近更新：2026-06-01）' },
    { id: 'SP-004', policyName: '数据加密存储策略', type: '数据安全策略（数据加密）', content: '所有敏感数据（患者隐私数据、病历数据等）均需加密存储（AES-256 算法）', status: '生效中', updateTime: '2026-01-01（最近更新：2026-06-01）' },
    { id: 'SP-005', policyName: '安全事件响应策略', type: '安全事件策略（应急响应）', content: '发生安全事件时，需在 24 小时内启动应急响应流程，通知相关部门，采取补救措施', status: '生效中', updateTime: '2026-01-01（最近更新：2026-06-01）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/policy-detail - 策略详情 5 条 */
async function handleSecurityPolicyDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPD-001', policyName: '患者隐私数据保护策略', clause: '第 3.2 条：患者隐私数据脱敏要求', requirement: '所有患者姓名需脱敏为"张***"、"李***"等形式，身份证号需脱敏为"3301**********1234"等形式', responsible: '数据部门（数据脱敏模块负责人）', status: '已落实' },
    { id: 'SPD-002', policyName: '系统访问控制策略', clause: '第 5.1 条：基于角色的访问控制（RBAC）要求', requirement: '所有系统均需实现基于角色的访问控制，每个用户只能访问其角色允许的资源', responsible: '安全部门（访问控制模块负责人）', status: '已落实' },
    { id: 'SPD-003', policyName: '审计日志管理策略', clause: '第 7.2 条：审计日志保留期限要求', requirement: '所有审计日志需保留 ≥ 3 年，符合《网络安全法》要求', responsible: '安全部门（审计日志模块负责人）', status: '已落实' },
    { id: 'SPD-004', policyName: '数据加密存储策略', clause: '第 4.1 条：敏感数据加密算法要求', requirement: '所有敏感数据需使用 AES-256 算法加密存储', responsible: '技术部门（数据加密模块负责人）', status: '已落实' },
    { id: 'SPD-005', policyName: '安全事件响应策略', clause: '第 8.1 条：安全事件响应时间要求', requirement: '发生安全事件时，需在 24 小时内启动应急响应流程', responsible: '安全部门（应急响应模块负责人）', status: '已落实' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/vulnerabilities - 安全漏洞 5 条 */
async function handleSecurityVulnerabilities(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SV-001', vulnerabilityName: 'SQL 注入漏洞（病历查询模块）', level: '高危（CVSS 评分 9.0/10.0）', description: '病历查询模块存在 SQL 注入漏洞，攻击者可通过构造恶意 SQL 语句获取数据库敏感数据', impact: '可导致患者隐私数据泄露、数据库被篡改、数据库被删除', status: '已修复（已于 2026-10-15 修复）' },
    { id: 'SV-002', vulnerabilityName: 'XSS 跨站脚本漏洞（患者登录页面）', level: '中危（CVSS 评分 6.5/10.0）', description: '患者登录页面存在 XSS 漏洞，攻击者可通过注入恶意脚本窃取用户 Cookie', impact: '可导致患者账号被盗、会话劫持', status: '已修复（已于 2026-10-10 修复）' },
    { id: 'SV-003', vulnerabilityName: '越权访问漏洞（处方审核模块）', level: '高危（CVSS 评分 8.5/10.0）', description: '处方审核模块存在越权访问漏洞，普通药师可审核其他科室的处方', impact: '可导致处方被错误审核、医疗事故', status: '已修复（已于 2026-10-20 修复）' },
    { id: 'SV-004', vulnerabilityName: '敏感数据明文传输漏洞（登录接口）', level: '中危（CVSS 评分 5.5/10.0）', description: '登录接口存在敏感数据明文传输漏洞，用户名和密码在网络中明文传输', impact: '可导致用户密码被窃取、账号被盗', status: '已修复（已于 2026-09-30 修复，已启用 HTTPS）' },
    { id: 'SV-005', vulnerabilityName: '会话固定漏洞（患者端系统）', level: '低危（CVSS 评分 3.5/10.0）', description: '患者端系统存在会话固定漏洞，攻击者可通过固定会话 ID 劫持用户会话', impact: '可导致患者账号被盗', status: '已修复（已于 2026-10-05 修复）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/patches - 安全补丁 5 条 */
async function handleSecurityPatches(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SP-001', patchName: '病历查询模块 SQL 注入漏洞补丁', version: 'v1.2.3（2026-10-15 发布）', fixContent: '修复病历查询模块 SQL 注入漏洞，使用参数化查询替代字符串拼接', publishTime: '2026-10-15', status: '已部署（已在生产环境部署）' },
    { id: 'SP-002', patchName: '患者登录页面 XSS 漏洞补丁', version: 'v1.2.4（2026-10-10 发布）', fixContent: '修复患者登录页面 XSS 漏洞，对用户输入进行 HTML 转义', publishTime: '2026-10-10', status: '已部署（已在生产环境部署）' },
    { id: 'SP-003', patchName: '处方审核模块越权访问漏洞补丁', version: 'v1.2.5（2026-10-20 发布）', fixContent: '修复处方审核模块越权访问漏洞，增加科室权限校验', publishTime: '2026-10-20', status: '已部署（已在生产环境部署）' },
    { id: 'SP-004', patchName: '登录接口敏感数据明文传输漏洞补丁', version: 'v1.2.1（2026-09-30 发布）', fixContent: '修复登录接口敏感数据明文传输漏洞，启用 HTTPS 加密传输', publishTime: '2026-09-30', status: '已部署（已在生产环境部署）' },
    { id: 'SP-005', patchName: '患者端系统会话固定漏洞补丁', version: 'v1.2.2（2026-10-05 发布）', fixContent: '修复患者端系统会话固定漏洞，每次登录生成新的会话 ID', publishTime: '2026-10-05', status: '已部署（已在生产环境部署）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m358Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/policy', handle: handleSecurityPolicy, auth: true },
  { method: 'GET', path: '/api/v1/security/policy-detail', handle: handleSecurityPolicyDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/vulnerabilities', handle: handleSecurityVulnerabilities, auth: true },
  { method: 'GET', path: '/api/v1/security/patches', handle: handleSecurityPatches, auth: true },
];
