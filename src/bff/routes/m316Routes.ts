/**
 * 健澜科技 jlmedaios - M316 医保域
 *
 * 医保结算/医保明细/医保账户/医保规则/医保拒付/医保审核
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/insurance/settlement - 医保结算 5 条 */
async function handleInsuranceSettlement(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IS-001', settleNo: 'JS-20261020-001', patient: '王***', totalCost: '8,500.00 元', insurancePay: '6,800.00 元', selfPay: '1,700.00 元' },
    { id: 'IS-002', settleNo: 'JS-20261020-002', patient: '李***', totalCost: '12,000.00 元', insurancePay: '9,600.00 元', selfPay: '2,400.00 元' },
    { id: 'IS-003', settleNo: 'JS-20261019-003', patient: '张***', totalCost: '5,200.00 元', insurancePay: '4,160.00 元', selfPay: '1,040.00 元' },
    { id: 'IS-004', settleNo: 'JS-20261019-004', patient: '赵***', totalCost: '3,800.00 元', insurancePay: '2,660.00 元', selfPay: '1,140.00 元' },
    { id: 'IS-005', settleNo: 'JS-20261018-005', patient: '孙***', totalCost: '15,000.00 元', insurancePay: '12,000.00 元', selfPay: '3,000.00 元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/details - 医保明细 5 条 */
async function handleInsuranceDetails(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ID-001', settleNo: 'JS-20261020-001', item: '冠状动脉造影术', cost: '3,500.00 元', ratio: '统筹 80%', reimbursement: '2,800.00 元' },
    { id: 'ID-002', settleNo: 'JS-20261020-001', item: '阿司匹林肠溶片（100mg×30片）', cost: '25.00 元', ratio: '个人账户支付', reimbursement: '0.00 元（个人账户扣款）' },
    { id: 'ID-003', settleNo: 'JS-20261020-002', item: '人工髋关节置换术', cost: '8,000.00 元', ratio: '统筹 70%', reimbursement: '5,600.00 元' },
    { id: 'ID-004', settleNo: 'JS-20261019-003', item: '胸部 CT 平扫', cost: '320.00 元', ratio: '统筹 75%', reimbursement: '240.00 元' },
    { id: 'ID-005', settleNo: 'JS-20261018-005', item: '腹腔镜胆囊切除术', cost: '10,000.00 元', ratio: '统筹 80%', reimbursement: '8,000.00 元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/accounts - 医保账户 5 条 */
async function handleInsuranceAccounts(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IA-001', patient: '王***', personalAccount: '个人账户余额 1,250.00 元', poolingAccount: '本年度统筹已用 6,800.00 元/年度封顶 150,000.00 元', balance: '个人账户 1,250.00 元', status: '正常参保' },
    { id: 'IA-002', patient: '李***', personalAccount: '个人账户余额 850.00 元', poolingAccount: '本年度统筹已用 9,600.00 元/年度封顶 150,000.00 元', balance: '个人账户 850.00 元', status: '正常参保' },
    { id: 'IA-003', patient: '张***', personalAccount: '个人账户余额 2,300.00 元', poolingAccount: '本年度统筹已用 4,160.00 元/年度封顶 150,000.00 元', balance: '个人账户 2,300.00 元', status: '正常参保' },
    { id: 'IA-004', patient: '赵***', personalAccount: '个人账户余额 560.00 元', poolingAccount: '本年度统筹已用 2,660.00 元/年度封顶 150,000.00 元', balance: '个人账户 560.00 元', status: '正常参保' },
    { id: 'IA-005', patient: '孙***', personalAccount: '个人账户余额 3,100.00 元', poolingAccount: '本年度统筹已用 12,000.00 元/年度封顶 150,000.00 元', balance: '个人账户 3,100.00 元', status: '正常参保（退休人员）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/rules - 医保规则 5 条 */
async function handleInsuranceRules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IR-001', ruleName: '住院起付线规则', type: '统筹基金起付标准', content: '三级医院起付线 800 元，二级医院 500 元，一级医院 300 元', effectiveDate: '2026-01-01', status: '执行中' },
    { id: 'IR-002', ruleName: '门诊统筹报销比例', type: '门诊统筹', content: '在职职工门诊统筹报销 70%，退休人员报销 75%', effectiveDate: '2026-01-01', status: '执行中' },
    { id: 'IR-003', ruleName: '乙类药品自付比例', type: '药品分类', content: '乙类药品个人先自付 10%，剩余部分按统筹比例报销', effectiveDate: '2026-01-01', status: '执行中' },
    { id: 'IR-004', ruleName: '年度统筹封顶线', type: '统筹基金最高支付限额', content: '在职职工年度统筹封顶 150,000 元，退休人员 180,000 元', effectiveDate: '2026-01-01', status: '执行中' },
    { id: 'IR-005', ruleName: 'DRG 付费分组规则', type: 'DRG 付费', content: '按疾病诊断相关分组（DRG）付费，共分 26 个 MDC 组', effectiveDate: '2026-07-01', status: '试点执行中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/rejection - 医保拒付 5 条 */
async function handleInsuranceRejection(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IRE-001', rejectionNo: 'JF-20261018-001', reason: '超适应症用药（阿托伐他汀用于非高危人群）', amount: '150.00 元', time: '2026-10-18', handling: '已申诉，附指南依据，待医保局复核' },
    { id: 'IRE-002', rejectionNo: 'JF-20261017-002', reason: '检查项目重复收费（同一天 CT 平扫+增强重复计费）', amount: '320.00 元', time: '2026-10-17', handling: '已确认重复收费，已退款并整改' },
    { id: 'IRE-003', rejectionNo: 'JF-20261016-003', reason: '病历书写不规范（现病史描述不完整，无法支持诊断）', amount: '2,000.00 元', time: '2026-10-16', handling: '已补充病历，重新提交审核' },
    { id: 'IRE-004', rejectionNo: 'JF-20261015-004', reason: '超医保限定支付范围（营养类药品无对应诊断）', amount: '580.00 元', time: '2026-10-15', handling: '已申诉，附临床营养评估单，待复核' },
    { id: 'IRE-005', rejectionNo: 'JF-20261014-005', reason: '医保目录外药品按目录内申报（维C 泡腾片）', amount: '45.00 元', time: '2026-10-14', handling: '已确认违规，已退款并培训收费员' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/audit - 医保审核 5 条 */
async function handleInsuranceAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAU-001', auditNo: 'SH-20261020-001', item: '住院病历抽查（心内科 10 份）', result: '9 份合规，1 份超适应症用药（拒付 150 元）', auditor: '医保办 王***', time: '2026-10-20' },
    { id: 'IAU-002', auditNo: 'SH-20261019-002', item: '门诊处方抽查（呼吸内科 50 张）', result: '48 张合规，2 张抗菌药物使用无指征（拒付 280 元）', auditor: '医保办 李***', time: '2026-10-19' },
    { id: 'IAU-003', auditNo: 'SH-20261018-003', item: 'DRG 分组合理性审核（外科 20 份）', result: '18 份分组正确，2 份分组偏低（需调整）', auditor: '医保办 张***', time: '2026-10-18' },
    { id: 'IAU-004', auditNo: 'SH-20261017-004', item: '高值耗材使用审核（骨科 15 份）', result: '14 份合规，1 份耗材品牌与招标目录不符（拒付 3,500 元）', auditor: '医保办 王***', time: '2026-10-17' },
    { id: 'IAU-005', auditNo: 'SH-20261016-005', item: '医保费用异常增长监控（全院月度）', result: '本月医保费用同比增长 5.2%（在合理范围内）', auditor: '医保办 陈***主任', time: '2026-10-16' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m316Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/settlement', handle: handleInsuranceSettlement, auth: true },
  { method: 'GET', path: '/api/v1/insurance/details', handle: handleInsuranceDetails, auth: true },
  { method: 'GET', path: '/api/v1/insurance/accounts', handle: handleInsuranceAccounts, auth: true },
  { method: 'GET', path: '/api/v1/insurance/rules', handle: handleInsuranceRules, auth: true },
  { method: 'GET', path: '/api/v1/insurance/rejection', handle: handleInsuranceRejection, auth: true },
  { method: 'GET', path: '/api/v1/insurance/audit', handle: handleInsuranceAudit, auth: true },
];
