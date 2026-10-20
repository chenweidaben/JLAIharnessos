/**
 * 健澜科技 jlmedaios - M324（新）合规审计深度域
 *
 * 审计日志详情/审计导出/审计异常/审计白名单/审计报告/合规评分
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/audit-detail - 审计日志详情 5 条 */
async function handleSecurityAuditDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAD-001', logId: 'AUDIT-20261020-000001', user: 'admin（系统管理员）', action: '登录（成功）', resource: '/api/v1/auth/login', time: '2026-10-20 08:00:15' },
    { id: 'SAD-002', logId: 'AUDIT-20261020-000002', user: 'lilu（李***医生）', action: '病历读取（EMR-2026-001234）', resource: '/api/v1/emr/record/BL-2026-001234', time: '2026-10-20 09:15:30' },
    { id: 'SAD-003', logId: 'AUDIT-20261020-000003', user: 'wangwu（王***护士）', action: '医嘱执行（ORD-2026-005678）', resource: '/api/v1/order/execute', time: '2026-10-20 10:30:45' },
    { id: 'SAD-004', logId: 'AUDIT-20261020-000004', user: 'zhaoliu（赵***药师）', action: '处方审核（RX-2026-009012）', resource: '/api/v1/pharmacy/review', time: '2026-10-20 11:00:20' },
    { id: 'SAD-005', logId: 'AUDIT-20261020-000005', user: 'unknown（未登录用户）', action: '登录（失败 3 次）', resource: '/api/v1/auth/login', time: '2026-10-20 11:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/audit-export - 审计导出 5 条 */
async function handleSecurityAuditExport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAE-001', exportId: 'EXP-20261020-001', range: '2026-10-01 至 2026-10-20（近 20 天）', format: 'JSON + CSV', exporter: '信息科 陈***', time: '2026-10-20 14:00' },
    { id: 'SAE-002', exportId: 'EXP-20261015-002', range: '2026-09-01 至 2026-09-30（9 月全月）', format: 'PDF', exporter: '医务科 李***', time: '2026-10-15 10:30' },
    { id: 'SAE-003', exportId: 'EXP-20261010-003', range: '2026-01-01 至 2026-09-30（前三季度）', format: 'Excel', exporter: '质控科 王***', time: '2026-10-10 16:00' },
    { id: 'SAE-004', exportId: 'EXP-20261005-004', range: '2026-10-01 至 2026-10-05（国庆假期）', format: 'JSON', exporter: '信息科 赵***', time: '2026-10-05 09:00' },
    { id: 'SAE-005', exportId: 'EXP-20260930-005', range: '2026-09-25 至 2026-09-30（月末审计）', format: 'CSV', exporter: '审计科 孙***', time: '2026-09-30 17:30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/audit-anomaly - 审计异常 5 条 */
async function handleSecurityAuditAnomaly(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAA-001', anomalyId: 'ANOM-20261020-001', type: '异常登录', description: '同一账号 10 分钟内从 3 个不同 IP 登录（杭州/上海/北京）', riskLevel: '高（可能账号被盗）', status: '已冻结账号，待人工核实' },
    { id: 'SAA-002', anomalyId: 'ANOM-20261020-002', type: '批量数据导出', description: '某用户 1 小时内导出 5,000 条患者数据（远超日常 200 条）', riskLevel: '高（可能数据泄露）', status: '已暂停导出，待安全科审查' },
    { id: 'SAA-003', anomalyId: 'ANOM-20261019-003', type: '非工作时间操作', description: '凌晨 2:00-4:00 有医生登录并修改 15 份病历', riskLevel: '中（可能违规修改）', status: '已记录，待医务科核查' },
    { id: 'SAA-004', anomalyId: 'ANOM-20261019-004', type: '越权访问', description: '某护士试图访问心内科病历（其所属科室为普外科）', riskLevel: '中（可能越权）', status: '已拒绝访问，已通知科室主任' },
    { id: 'SAA-005', anomalyId: 'ANOM-20261018-005', type: '密码暴力破解', description: '某账号连续 20 次登录失败（密码错误）', riskLevel: '低（已自动锁定 30 分钟）', status: '已自动处理' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/audit-whitelist - 审计白名单 5 条 */
async function handleSecurityAuditWhitelist(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAW-001', ruleName: '系统自动任务白名单', type: '系统操作', matchCondition: '用户=system / 操作=数据同步、备份、日志清理', effectiveTime: '2026-01-01 起长期有效', status: '执行中' },
    { id: 'SAW-002', ruleName: '运维排障白名单', type: '运维操作', matchCondition: '用户=运维团队 / 时间段=每月最后一个周日 02:00-04:00', effectiveTime: '2026-01-01 起长期有效', status: '执行中' },
    { id: 'SAW-003', ruleName: '数据迁移白名单', type: '批量操作', matchCondition: 'IP=10.0.1.100（数据迁移服务器）/ 操作=批量导入导出', effectiveTime: '2026-10-01 至 2026-12-31（数据迁移期）', status: '执行中' },
    { id: 'SAW-004', ruleName: '院内会诊白名单', type: '跨科室访问', matchCondition: '操作=病历查看 / 科室=会诊申请科室', effectiveTime: '2026-01-01 起长期有效', status: '执行中' },
    { id: 'SAW-005', ruleName: '科研脱敏白名单', type: '数据导出', matchCondition: '操作=科研数据导出 / 已脱敏（姓名/ID 替换）', effectiveTime: '2026-01-01 起长期有效', status: '执行中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/audit-report - 审计报告 5 条 */
async function handleSecurityAuditReport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAR-001', reportName: '2026 年 9 月安全审计月报', period: '2026-09-01 至 2026-09-30', auditItems: '登录安全 / 数据访问 / 病历修改 / 权限管理', findings: '异常登录 3 次，批量导出 1 次，越权访问 2 次', suggestions: '加强账号安全（双因素认证）+ 限制批量导出阈值' },
    { id: 'SAR-002', reportName: '2026 年三季度合规审计报告', period: '2026-07-01 至 2026-09-30', auditItems: '等保 2.0 三级 / 数据安全法 / 个人信息保护法', findings: '整体合规率 97%，待改进项 3 个（日志留存不足 6 个月、加密算法未升级、权限定期复核未执行）', suggestions: '12 月前完成日志留存 6 个月升级 + 加密算法迁移至 SM4 + 每季度权限复核' },
    { id: 'SAR-003', reportName: '2026 年国庆假期安全审计专项报告', period: '2026-10-01 至 2026-10-07', auditItems: '假期值班登录 / 远程访问 / 应急响应', findings: '假期整体安全，无重大异常事件', suggestions: '保持现有假期值班机制' },
    { id: 'SAR-004', reportName: '2026 年上半年 HIPAA 合规对标报告', period: '2026-01-01 至 2026-06-30', auditItems: 'HIPAA Privacy Rule / Security Rule / Breach Notification Rule', findings: '对标达成率 85%，差距：员工培训覆盖率不足（90% vs 要求 100%）', suggestions: '年底前完成全员安全培训' },
    { id: 'SAR-005', reportName: '2026 年 10 月第 3 周安全周报', period: '2026-10-13 至 2026-10-19', auditItems: '日常安全监控', findings: '本周无重大安全事件，异常登录 1 次（已自动处理）', suggestions: '继续保持' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/compliance-score - 合规评分 5 条 */
async function handleSecurityComplianceScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SCS-001', dimension: '等保 2.0 三级合规', score: '92 分', maxScore: '100 分', rate: '92%', trend: '↑ 较上季度提升 3 分' },
    { id: 'SCS-002', dimension: '数据安全法合规', score: '88 分', maxScore: '100 分', rate: '88%', trend: '→ 与上季度持平' },
    { id: 'SCS-003', dimension: '个人信息保护法合规', score: '85 分', maxScore: '100 分', rate: '85%', trend: '↑ 较上季度提升 2 分' },
    { id: 'SCS-004', dimension: '电子病历评级（五级）', score: '80 分', maxScore: '100 分', rate: '80%', trend: '→ 与上季度持平' },
    { id: 'SCS-005', dimension: '互联互通成熟度（四甲）', score: '85 分', maxScore: '100 分', rate: '85%', trend: '↑ 较上季度提升 5 分' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m324NewRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/audit-detail', handle: handleSecurityAuditDetail, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-export', handle: handleSecurityAuditExport, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-anomaly', handle: handleSecurityAuditAnomaly, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-whitelist', handle: handleSecurityAuditWhitelist, auth: true },
  { method: 'GET', path: '/api/v1/security/audit-report', handle: handleSecurityAuditReport, auth: true },
  { method: 'GET', path: '/api/v1/security/compliance-score', handle: handleSecurityComplianceScore, auth: true },
];
