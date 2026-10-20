/**
 * 健澜科技 jlmedaios - M236 合规与安全深度
 *
 * 合规审计日志/合规报告 + 数据脱敏配置
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、合规审计 ==================== */

/** GET /api/v1/compliance/audit - 合规审计日志 5 条 */
async function handleComplianceAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const logs = [
    { id: 'AUD-001', operator: '陈维（管理员）', actionType: '病历调阅', target: '住院病历 MRN-100451（王先生）', result: '通过', time: '2026-10-20 08:15' },
    { id: 'AUD-002', operator: '李医生', actionType: '处方开具', target: '门诊处方 OPD20261020001', result: '通过', time: '2026-10-20 09:05' },
    { id: 'AUD-003', operator: '王护士', actionType: '敏感数据导出', target: '检验结果批量导出（30 条）', result: '拒绝（需审批）', time: '2026-10-20 09:40' },
    { id: 'AUD-004', operator: '系统（自动）', actionType: '权限变更', target: '角色「实习医生」权限回收', result: '通过', time: '2026-10-20 10:00' },
    { id: 'AUD-005', operator: '赵医生', actionType: '跨科会诊调阅', target: '病历 MRN-100235（张演示）', result: '通过', time: '2026-10-20 10:30' },
  ];

  return json(ok({ logs, totalCount: logs.length }));
}

/** GET /api/v1/compliance/reports - 合规报告 3 条 */
async function handleComplianceReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const reports = [
    { id: 'CR-001', name: '等保三级年度合规自查报告', type: '等级保护测评', date: '2026-10-15', author: '信息安全部-周工', status: '已归档' },
    { id: 'CR-002', name: '医疗数据出境合规评估报告', type: '数据安全评估', date: '2026-10-18', author: '法务合规部-吴法务', status: '审核中' },
    { id: 'CR-003', name: '互联网医院执业合规季报', type: '行业监管报告', date: '2026-10-20', author: '医务部-郑主任', status: '待提交' },
  ];

  return json(ok({ reports, totalCount: reports.length }));
}

/* ==================== 二、数据脱敏配置 ==================== */

/** GET /api/v1/security/data-mask - 数据脱敏配置 */
async function handleSecurityDataMask(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const config = {
    enabled: true,
    effectiveAt: '2026-01-01',
    rules: [
      { field: '姓名', method: '部分掩码', pattern: '张*示', applicableRoles: ['访客', '第三方审计'] },
      { field: '身份证号', method: '部分掩码', pattern: '3301**********1234', applicableRoles: ['访客', '第三方审计', '实习医生'] },
      { field: '手机号', method: '部分掩码', pattern: '138****5678', applicableRoles: ['访客', '第三方审计'] },
      { field: '家庭住址', method: '全掩码', pattern: '********', applicableRoles: ['访客'] },
    ],
    hashFields: ['医保卡号', '生物识别标识'],
    note: '医生/护士/管理员角色默认不脱敏；规则随角色权限动态生效。',
  };

  return json(ok(config));
}

export const m236Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/compliance/audit', handle: handleComplianceAudit, auth: true },
  { method: 'GET', path: '/api/v1/compliance/reports', handle: handleComplianceReports, auth: true },
  { method: 'GET', path: '/api/v1/security/data-mask', handle: handleSecurityDataMask, auth: true },
];
