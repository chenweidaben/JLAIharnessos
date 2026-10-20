/**
 * 健澜科技 jlmedaios - M246 合规差距继续补强（质控明细与安全运营）
 *
 * 病历缺陷明细/质控统计 + 租户配额 + CVE 情报/WAF/SIEM
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、病历质控明细 ==================== */

/** GET /api/v1/emr/quality-defects - 病历缺陷明细 5 条 */
async function handleEmrQualityDefects(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const defects = [
    { id: 'QDF-001', mrn: 'EMR-MRN-100451', type: '现病史不完整', penalty: 2, rectifier: '赵医生', status: '已整改' },
    { id: 'QDF-002', mrn: 'EMR-MRN-100452', type: '入院记录超时（24h+2h）', penalty: 5, rectifier: '王医生', status: '整改中' },
    { id: 'QDF-003', mrn: 'EMR-MRN-100453', type: '诊断与用药不一致', penalty: 4, rectifier: '李医生', status: '待整改' },
    { id: 'QDF-004', mrn: 'EMR-MRN-100454', type: '手术记录缺签名', penalty: 3, rectifier: '张医生', status: '已整改' },
    { id: 'QDF-005', mrn: 'EMR-MRN-100455', type: '过敏史未填写', penalty: 2, rectifier: '陈医生', status: '待整改' },
  ];

  return json(ok({ defects, totalCount: defects.length }));
}

/** GET /api/v1/emr/quality-stats - 质控统计 */
async function handleEmrQualityStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const stats = [
    { department: '心内科', gradeA: '98.1%', gradeB: '1.8%', gradeC: '0.1%', defects: 12, rank: 1 },
    { department: '呼吸内科', gradeA: '97.3%', gradeB: '2.5%', gradeC: '0.2%', defects: 18, rank: 2 },
    { department: '普外科', gradeA: '96.5%', gradeB: '3.2%', gradeC: '0.3%', defects: 25, rank: 3 },
    { department: '骨科', gradeA: '95.8%', gradeB: '3.8%', gradeC: '0.4%', defects: 31, rank: 4 },
    { department: '急诊科', gradeA: '93.2%', gradeB: '5.8%', gradeC: '1.0%', defects: 48, rank: 5 },
  ];

  return json(ok({ stats, totalCount: stats.length }));
}

/* ==================== 二、租户配额 ==================== */

/** GET /api/v1/tenants/quota - 租户配额 */
async function handleTenantsQuota(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const quotas = [
    { tenantId: 'TNT-001', apiPerDay: '5,000,000 次', storageGB: 500, concurrent: 500, used: { apiUsed: '3,200,000 次（64%）', storageUsed: 287, concurrentPeak: 312 } },
    { tenantId: 'TNT-002', apiPerDay: '1,500,000 次', storageGB: 200, concurrent: 200, used: { apiUsed: '890,000 次（59%）', storageUsed: 112, concurrentPeak: 138 } },
    { tenantId: 'TNT-003', apiPerDay: '500,000 次', storageGB: 100, concurrent: 100, used: { apiUsed: '210,000 次（42%）', storageUsed: 45, concurrentPeak: 52 } },
  ];

  return json(ok({ quotas, totalCount: quotas.length }));
}

/* ==================== 三、安全运营情报 ==================== */

/** GET /api/v1/security/cve-feed - CVE 漏洞情报 5 条 */
async function handleSecurityCveFeed(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const cves = [
    { id: 'CVE-2026-1001', code: 'CVE-2026-1001', severity: '高危', product: 'Spring Framework 6.1.x', status: '已升级到 6.1.14', fix: '升级至 6.1.14 或更高版本' },
    { id: 'CVE-2026-1002', code: 'CVE-2026-1002', severity: '高危', product: 'Nginx 1.25.x', status: '已升级到 1.25.5', fix: '升级至 1.25.5' },
    { id: 'CVE-2026-1003', code: 'CVE-2026-1003', severity: '中危', product: 'OpenSSL 3.0.x', status: '待升级', fix: '升级至 3.0.14（计划本周末）' },
    { id: 'CVE-2026-1004', code: 'CVE-2026-1004', severity: '中危', product: 'React 18.x（前端）', status: '已修复', fix: '补丁已合并' },
    { id: 'CVE-2026-1005', code: 'CVE-2026-1005', severity: '低危', product: 'Log4j 2.x', status: '不受影响（已禁用 JNDI）', fix: '无需修复，已缓解' },
  ];

  return json(ok({ cves, totalCount: cves.length }));
}

/** GET /api/v1/security/waf - WAF 防护统计 */
async function handleSecurityWaf(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const waf = {
    today: { sqlInjection: { blocked: 128, passed: 3 }, xss: { blocked: 86, passed: 1 }, csrf: { blocked: 42, passed: 0 }, crawler: { blocked: 2340, passed: 56 } },
    ruleCount: 486,
    status: '运行中（正常）',
    lastBlockTime: '2026-10-20 20:58:12',
  };

  return json(ok(waf));
}

/** GET /api/v1/security/siem - SIEM 告警 5 条 */
async function handleSecuritySiem(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const alerts = [
    { id: 'ALR-001', name: '异常登录（暴力破解）', severity: '高危', srcIp: '203.0.113.9', target: '/api/v1/auth/login', status: '已关闭（已拉黑）' },
    { id: 'ALR-002', name: 'SQL 注入尝试', severity: '高危', srcIp: '198.51.100.22', target: '/api/v1/patient/list', status: '已关闭（WAF 拦截）' },
    { id: 'ALR-003', name: '越权数据访问', severity: '中危', srcIp: '10.20.3.45', target: '/api/v1/emr/detail', status: '处理中（已通知审计）' },
    { id: 'ALR-004', name: '敏感字段批量导出', severity: '中危', srcIp: '10.20.4.20', target: '/api/v1/report/export', status: '待处理' },
    { id: 'ALR-005', name: '证书即将过期', severity: '低危', srcIp: '—', target: 'TLS 证书', status: '已关闭（已续期）' },
  ];

  return json(ok({ alerts, totalCount: alerts.length }));
}

export const m246Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/quality-defects', handle: handleEmrQualityDefects, auth: true },
  { method: 'GET', path: '/api/v1/emr/quality-stats', handle: handleEmrQualityStats, auth: true },
  { method: 'GET', path: '/api/v1/tenants/quota', handle: handleTenantsQuota, auth: true },
  { method: 'GET', path: '/api/v1/security/cve-feed', handle: handleSecurityCveFeed, auth: true },
  { method: 'GET', path: '/api/v1/security/waf', handle: handleSecurityWaf, auth: true },
  { method: 'GET', path: '/api/v1/security/siem', handle: handleSecuritySiem, auth: true },
];
