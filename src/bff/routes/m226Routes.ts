/**
 * 健澜科技 jlmedaios - M226 人事绩效物价深度 + 合规安全深度
 *
 * 绩效考核/薪资统计/岗位管理 + 收费项目详情/打包收费 + 合规记录/隐私保护/安全事件
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、人事绩效深度 ==================== */

/** GET /api/v1/hr/performance - 员工绩效考核 */
async function handleHrPerformance(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const performance = [
    { id: 'PER-001', name: '李主任', dept: '心内科', year: 2025, grade: '优秀', score: 92, reward: '年度优秀医生，奖金 2 万' },
    { id: 'PER-002', name: '李医生', dept: '心内科', year: 2025, grade: '合格', score: 82, reward: '无' },
    { id: 'PER-003', name: '王护士', dept: '心内科', year: 2025, grade: '优秀', score: 90, reward: '年度优秀护士，奖金 1.5 万' },
    { id: 'PER-004', name: '张药师', dept: '药剂科', year: 2025, grade: '基本合格', score: 72, reward: '需改进，扣发绩效 5%' },
    { id: 'PER-005', name: '陈医生', dept: '呼吸科', year: 2025, grade: '合格', score: 85, reward: '无' },
  ];

  return json(ok({ performance, totalCount: performance.length }));
}

/** GET /api/v1/hr/salary - 薪资统计 */
async function handleHrSalary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const salary = [
    { id: 'SAL-001', dept: '心内科', totalPayable: 85.5, totalPaid: 68.2, tax: 8.5, socialInsurance: 5.8, housingFund: 3.0, avgSalary: 1.52 },
    { id: 'SAL-002', dept: '呼吸科', totalPayable: 52.3, totalPaid: 42.1, tax: 4.2, socialInsurance: 3.8, housingFund: 2.2, avgSalary: 1.45 },
    { id: 'SAL-003', dept: '普外科', totalPayable: 78.6, totalPaid: 62.5, tax: 7.8, socialInsurance: 5.2, housingFund: 3.1, avgSalary: 1.57 },
    { id: 'SAL-004', dept: '妇产科', totalPayable: 65.2, totalPaid: 52.8, tax: 5.5, socialInsurance: 4.5, housingFund: 2.4, avgSalary: 1.51 },
    { id: 'SAL-005', dept: '急诊科', totalPayable: 48.5, totalPaid: 39.2, tax: 3.8, socialInsurance: 3.2, housingFund: 2.3, avgSalary: 1.38 },
  ];

  return json(ok({ salary, totalCount: salary.length }));
}

/** GET /api/v1/hr/positions - 岗位管理 */
async function handleHrPositions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const positions = [
    { id: 'POS-001', name: '主任医师', authorized: 20, occupied: 18, vacant: 2, description: '全面负责科室医疗、教学、科研工作' },
    { id: 'POS-002', name: '副主任医师', authorized: 40, occupied: 35, vacant: 5, description: '协助主任开展医疗工作，负责亚专业' },
    { id: 'POS-003', name: '主治医师', authorized: 80, occupied: 72, vacant: 8, description: '独立诊疗患者，带教住院医师' },
    { id: 'POS-004', name: '住院医师', authorized: 120, occupied: 115, vacant: 5, description: '管床医师，执行日常诊疗工作' },
    { id: 'POS-005', name: '主管护师', authorized: 60, occupied: 55, vacant: 5, description: '负责护理管理，指导护士工作' },
  ];

  return json(ok({ positions, totalCount: positions.length }));
}

/* ==================== 二、物价深度 ==================== */

/** GET /api/v1/pricing/details - 收费项目详情 */
async function handlePricingDetails(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    itemName: '血常规检查（五分类）',
    itemCode: 'PRC-250100003',
    price: 25.00,
    insuranceCategory: '甲类',
    unit: '次',
    dept: '检验科',
    priceBasis: '省指导价',
  }));
}

/** GET /api/v1/pricing/packages - 打包收费 */
async function handlePricingPackages(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const packages = [
    { id: 'PKG-001', name: '剖宫产手术包', items: ['手术费', '麻醉费', '材料费', '护理费', '床位费（5 天）'], packagePrice: 8500.00, itemTotal: 9200.00, discount: 700.00 },
    { id: 'PKG-002', name: '腹腔镜胆囊切除包', items: ['手术费', '麻醉费', '材料费', '护理费', '床位费（3 天）'], packagePrice: 12500.00, itemTotal: 13800.00, discount: 1300.00 },
    { id: 'PKG-003', name: '白内障手术包', items: ['手术费', '人工晶体费', '检查费', '护理费'], packagePrice: 4500.00, itemTotal: 4900.00, discount: 400.00 },
  ];

  return json(ok({ packages, totalCount: packages.length }));
}

/* ==================== 三、合规安全深度 ==================== */

/** GET /api/v1/compliance/records - 合规记录 */
async function handleComplianceRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const records = [
    { id: 'CMP-001', type: '医保检查', agency: '市医保局', date: '2026-09-15', issues: '部分病历书写不规范，医保结算依据不充分', rectification: '整改中', result: '限期整改' },
    { id: 'CMP-002', type: '卫健委检查', agency: '市卫健委', date: '2026-08-20', issues: '院感防控措施需加强', rectification: '已整改', result: '通过' },
    { id: 'CMP-003', type: '疾控检查', agency: '区疾控中心', date: '2026-08-10', issues: '传染病上报及时率需提高', rectification: '已整改', result: '通过' },
    { id: 'CMP-004', type: '审计检查', agency: '省审计厅', date: '2026-07-15', issues: '部分采购流程需完善', rectification: '已整改', result: '通过' },
    { id: 'CMP-005', type: '医保检查', agency: '市医保局', date: '2026-06-01', issues: '无重大问题', rectification: '已整改', result: '优秀' },
  ];

  return json(ok({ records, totalCount: records.length }));
}

/** GET /api/v1/security/patients - 患者隐私保护 */
async function handleSecurityPatients(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  return json(ok({
    maskingRules: ['姓名（显示姓+*）', '身份证（中间 8 位脱敏）', '手机号（中间 4 位脱敏）', '地址（仅显示到区/街道）'],
    accessLog: { todayAccess: 1520, sensitiveFieldAccess: 285 },
    exportAudit: { todayExports: 8, exporters: ['信息科-赵工', '医务处-王处长'], contents: ['科研队列导出（脱敏后）', '医保结算报表'] },
    permissions: {
      doctor: '查看本科室患者基本信息+诊疗信息',
      nurse: '查看分管患者护理信息+生命体征',
      pharmacist: '查看患者用药信息',
      admin: '系统管理权限（无诊疗数据）',
    },
  }));
}

/** GET /api/v1/security/incidents - 安全事件 */
async function handleSecurityIncidents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const incidents = [
    { id: 'INC-001', type: '数据泄露', time: '2026-10-15 14:00', scope: '3 名患者信息被违规导出', action: '封禁涉事账号，启动内部调查，上报卫健委', status: '调查中' },
    { id: 'INC-002', type: '病毒感染', time: '2026-10-10 09:00', scope: '门诊工作站 5 台电脑感染病毒', action: '断网杀毒，重装系统，恢复数据', status: '已处理' },
    { id: 'INC-003', type: '权限滥用', time: '2026-10-05 16:00', scope: '1 名医生违规查询非本科室患者', action: '约谈当事人，扣发当月绩效', status: '已处理' },
  ];

  return json(ok({ incidents, totalCount: incidents.length }));
}

export const m226Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/hr/performance', handle: handleHrPerformance, auth: true },
  { method: 'GET', path: '/api/v1/hr/salary', handle: handleHrSalary, auth: true },
  { method: 'GET', path: '/api/v1/hr/positions', handle: handleHrPositions, auth: true },
  { method: 'GET', path: '/api/v1/pricing/details', handle: handlePricingDetails, auth: true },
  { method: 'GET', path: '/api/v1/pricing/packages', handle: handlePricingPackages, auth: true },
  { method: 'GET', path: '/api/v1/compliance/records', handle: handleComplianceRecords, auth: true },
  { method: 'GET', path: '/api/v1/security/patients', handle: handleSecurityPatients, auth: true },
  { method: 'GET', path: '/api/v1/security/incidents', handle: handleSecurityIncidents, auth: true },
];
