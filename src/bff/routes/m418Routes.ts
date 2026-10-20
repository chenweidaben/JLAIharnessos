/**
 * 健澜科技 jlmedaios - M418 P1 业务扩展：财务深度打磨（详情版）
 *
 * 账单管理详情/支付管理详情/退款管理详情/发票管理详情/预算管理详情/财务报表详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/finance/bills-detail - 账单管理详情 5 条 */
async function handleFinanceBillsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FBD-001', billNo: 'BILL-2026-001（门诊账单）', patient: '患者：张***（男，65 岁）', amount: '金额：350.00 元（心内科门诊：挂号费 25 元 + 心电图 50 元 + 心脏超声 275 元）', billType: '账单类型：门诊费用（OPD）', status: '状态：已结算（医保统筹支付 280 元，个人账户支付 70 元）' },
    { id: 'FBD-002', billNo: 'BILL-2026-002（住院账单）', patient: '患者：李***（女，58 岁）', amount: '金额：15200.00 元（神经内科住院：床位费 2000 元 + 检查费 5000 元 + 药品费 6000 元 + 治疗费 2200 元）', billType: '账单类型：住院费用（IPD）', status: '状态：已结算（医保统筹支付 12000 元，个人账户支付 3200 元）' },
    { id: 'FBD-003', billNo: 'BILL-2026-003（门诊账单）', patient: '患者：王***（男，72 岁）', amount: '金额：186.50 元（骨科门诊：挂号费 15 元 + 药品费 171.50 元）', billType: '账单类型：门诊费用（OPD）', status: '状态：已结算（个人账户支付 186.50 元）' },
    { id: 'FBD-004', billNo: 'BILL-2026-004（住院押金）', patient: '患者：陈***（男，45 岁）', amount: '金额：5000.00 元（普外科住院押金）', billType: '账单类型：住院押金（DEPOSIT）', status: '状态：已结算（出院时多退少补，实际住院费用 4800 元，退款 200 元）' },
    { id: 'FBD-005', billNo: 'BILL-2026-005（门诊账单）', patient: '患者：赵***（女，32 岁）', amount: '金额：120.00 元（妇产科门诊：挂号费 20 元 + 血常规 30 元 + 尿常规 25 元 + 肝功能 45 元）', billType: '账单类型：门诊费用（OPD）', status: '状态：已结算（医保统筹支付 96 元，个人账户支付 24 元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/payments-detail - 支付管理详情 5 条 */
async function handleFinancePaymentsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FPD-001', paymentNo: 'PAY-2026-001（门诊挂号费支付）', patient: '患者：张***（男，65 岁）', amount: '金额：25.00 元（心内科普通门诊挂号费）', method: '支付方式：微信支付（医保个人账户扣款）', time: '支付时间：2026-10-20 08:50:00' },
    { id: 'FPD-002', paymentNo: 'PAY-2026-002（住院费用支付）', patient: '患者：李***（女，58 岁）', amount: '金额：3200.00 元（住院自付部分）', method: '支付方式：银行卡支付（工行储蓄卡）', time: '支付时间：2026-10-19 10:00:00（出院结算时支付）' },
    { id: 'FPD-003', paymentNo: 'PAY-2026-003（门诊药费支付）', patient: '患者：王***（男，72 岁）', amount: '金额：171.50 元（阿托伐他汀钙片+碳酸钙 D3 片）', method: '支付方式：支付宝（医保个人账户扣款）', time: '支付时间：2026-10-20 14:30:00' },
    { id: 'FPD-004', paymentNo: 'PAY-2026-004（住院押金支付）', patient: '患者：陈***（男，45 岁）', amount: '金额：5000.00 元（住院押金）', method: '支付方式：微信支付（零钱通）', time: '支付时间：2026-10-18 16:00:00（入院时支付）' },
    { id: 'FPD-005', paymentNo: 'PAY-2026-005（门诊检查费支付）', patient: '患者：赵***（女，32 岁）', amount: '金额：70.00 元（血常规+尿常规+肝功能自付部分）', method: '支付方式：微信支付（医保个人账户扣款）', time: '支付时间：2026-10-20 08:40:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/refunds-detail - 退款管理详情 5 条 */
async function handleFinanceRefundsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FRD-001', refundNo: 'REF-2026-001（住院押金退款）', patient: '患者：陈***（男，45 岁）', amount: '金额：200.00 元（住院押金多退）', reason: '退款原因：出院结算时实际住院费用 4800 元，押金 5000 元，多退 200 元', status: '状态：已退款（退款时间：2026-10-19 11:00:00，原路退回微信零钱通）' },
    { id: 'FRD-002', refundNo: 'REF-2026-002（门诊检查退款）', patient: '患者：张***（男，65 岁）', amount: '金额：275.00 元（心脏超声检查退款）', reason: '退款原因：患者取消检查（医生建议先做心电图，后续再预约心脏超声）', status: '状态：已退款（退款时间：2026-10-20 09:30:00，原路退回微信支付）' },
    { id: 'FRD-003', refundNo: 'REF-2026-003（门诊药品退款）', patient: '患者：王***（男，72 岁）', amount: '金额：85.00 元（阿托伐他汀钙片退款）', reason: '退款原因：医生调整用药方案（停用阿托伐他汀钙片，改用瑞舒伐他汀钙片）', status: '状态：已退款（退款时间：2026-10-20 15:00:00，原路退回支付宝）' },
    { id: 'FRD-004', refundNo: 'REF-2026-004（住院费用退款）', patient: '患者：李***（女，58 岁）', amount: '金额：500.00 元（多收检查费退款）', reason: '退款原因：住院期间多收了一次头颅 MRI 检查费（已做过一次，重复收费）', status: '状态：已退款（退款时间：2026-10-19 14:00:00，原路退回工行储蓄卡）' },
    { id: 'FRD-005', refundNo: 'REF-2026-005（门诊挂号退款）', patient: '患者：赵***（女，32 岁）', amount: '金额：20.00 元（妇产科挂号费退款）', reason: '退款原因：患者取消预约（临时有事，改约下周）', status: '状态：已退款（退款时间：2026-10-20 08:30:00，原路退回微信支付）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/invoices-detail - 发票管理详情 5 条 */
async function handleFinanceInvoicesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FID-001', invoiceNo: 'INV-2026-001（门诊费用发票）', patient: '患者：张***（男，65 岁）', amount: '金额：350.00 元（心内科门诊费用）', invoiceType: '发票类型：医疗费用发票（门诊）', status: '状态：已开具（开票时间：2026-10-20 09:00:00，电子发票已发送至患者手机）' },
    { id: 'FID-002', invoiceNo: 'INV-2026-002（住院费用发票）', patient: '患者：李***（女，58 岁）', amount: '金额：15200.00 元（神经内科住院费用）', invoiceType: '发票类型：医疗费用发票（住院）', status: '状态：已开具（开票时间：2026-10-19 10:30:00，纸质发票已交付患者）' },
    { id: 'FID-003', invoiceNo: 'INV-2026-003（门诊费用发票）', patient: '患者：王***（男，72 岁）', amount: '金额：186.50 元（骨科门诊费用）', invoiceType: '发票类型：医疗费用发票（门诊）', status: '状态：已开具（开票时间：2026-10-20 14:30:00，电子发票已发送至患者手机）' },
    { id: 'FID-004', invoiceNo: 'INV-2026-004（住院费用发票）', patient: '患者：陈***（男，45 岁）', amount: '金额：4800.00 元（普外科住院费用）', invoiceType: '发票类型：医疗费用发票（住院）', status: '状态：已开具（开票时间：2026-10-19 11:30:00，电子发票已发送至患者手机）' },
    { id: 'FID-005', invoiceNo: 'INV-2026-005（门诊费用发票）', patient: '患者：赵***（女，32 岁）', amount: '金额：120.00 元（妇产科门诊费用）', invoiceType: '发票类型：医疗费用发票（门诊）', status: '状态：已开具（开票时间：2026-10-20 08:40:00，电子发票已发送至患者手机）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/budgets-detail - 预算管理详情 5 条 */
async function handleFinanceBudgetsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FBD-001', budgetItem: '预算项：人员经费（工资+奖金+社保）', dept: '部门：全院（人力资源部管理）', amount: '金额：42000 万元/年（月度预算 3500 万元）', executionRate: '执行率：83.3%（已执行 35000 万元，年度预算 42000 万元）', status: '状态：正常（执行进度符合预期，年度预算可控制）' },
    { id: 'FBD-002', budgetItem: '预算项：药品采购费', dept: '部门：全院（药剂科管理）', amount: '金额：12000 万元/年（月度预算 1000 万元）', executionRate: '执行率：80.0%（已执行 9600 万元，年度预算 12000 万元）', status: '状态：正常（执行进度符合预期，集采药品占比提升降低成本）' },
    { id: 'FBD-003', budgetItem: '预算项：卫生材料费', dept: '部门：全院（设备科管理）', amount: '金额：9600 万元/年（月度预算 800 万元）', executionRate: '执行率：83.3%（已执行 8000 万元，年度预算 9600 万元）', status: '状态：正常（执行进度符合预期，高值耗材集中采购降低成本）' },
    { id: 'FBD-004', budgetItem: '预算项：设备购置/维护费', dept: '部门：全院（设备科管理）', amount: '金额：6000 万元/年（月度预算 500 万元）', executionRate: '执行率：83.3%（已执行 5000 万元，年度预算 6000 万元）', status: '状态：正常（执行进度符合预期，新购 CT/MRI 等大型设备已到位）' },
    { id: 'FBD-005', budgetItem: '预算项：后勤保障费（水电气+物业）', dept: '部门：全院（后勤科管理）', amount: '金额：4800 万元/年（月度预算 400 万元）', executionRate: '执行率：83.3%（已执行 4000 万元，年度预算 4800 万元）', status: '状态：正常（执行进度符合预期，节能改造降低能耗成本）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/finance/reports-detail - 财务报表详情 5 条 */
async function handleFinanceReportsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FRP-001', reportName: 'Report-001：月度收入报表', period: '周期：2026 年 9 月', indicators: '指标：1. 总收入：8000 万元（医疗服务 4000 万 + 药品 1000 万 + 耗材 800 万 + 检查检验 1500 万 + 其他 700 万）；2. 同比：+12.0%；3. 环比：+5.0%', conclusion: '结论：收入持续增长，医疗服务收入占比 50%（结构优化中），药品收入占比 12.5%（零加成政策下占比下降）', time: '时间：2026-10-01（月度报表出具时间）' },
    { id: 'FRP-002', reportName: 'Report-002：月度支出报表', period: '周期：2026 年 9 月', indicators: '指标：1. 总支出：6500 万元（人员经费 3500 万 + 药品 1000 万 + 耗材 800 万 + 设备折旧 500 万 + 后勤 400 万 + 其他 300 万）；2. 同比：+10.0%；3. 环比：+3.0%', conclusion: '结论：支出增长可控，人员经费占比 53.8%（合理范围），药品耗材占比 27.7%（零加成政策下占比稳定）', time: '时间：2026-10-01（月度报表出具时间）' },
    { id: 'FRP-003', reportName: 'Report-003：季度利润报表', period: '周期：2026 年 Q3（7-9 月）', indicators: '指标：1. 总收入：23000 万元；2. 总支出：19000 万元；3. 利润：4000 万元；4. 利润率：17.4%', conclusion: '结论：利润率 17.4%（优于行业平均 15%），盈利能力稳定，可持续发展', time: '时间：2026-10-05（季度报表出具时间）' },
    { id: 'FRP-004', reportName: 'Report-004：年度预算执行报表', period: '周期：2026 年 1-9 月（年度预算执行进度）', indicators: '指标：1. 年度总收入预算：96000 万元；2. 已执行收入：72000 万元（执行率 75%）；3. 年度总支出预算：78000 万元；4. 已执行支出：58500 万元（执行率 75%）', conclusion: '结论：预算执行进度 75%（符合预期），收入支出均按计划执行，年度预算可控', time: '时间：2026-10-10（预算执行报表出具时间）' },
    { id: 'FRP-005', reportName: 'Report-005：医保结算报表', period: '周期：2026 年 9 月', indicators: '指标：1. 医保申报总额：5000 万元；2. 医保结算总额：4500 万元；3. 医保拒付率：3%（150 万元）；4. 医保患者满意度：88%', conclusion: '结论：医保拒付率 3%（优于行业平均 5%），医保结算及时，医保患者满意度稳定', time: '时间：2026-10-05（医保结算报表出具时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m418Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/finance/bills-detail', handle: handleFinanceBillsDetail, auth: true },
  { method: 'GET', path: '/api/v1/finance/payments-detail', handle: handleFinancePaymentsDetail, auth: true },
  { method: 'GET', path: '/api/v1/finance/refunds-detail', handle: handleFinanceRefundsDetail, auth: true },
  { method: 'GET', path: '/api/v1/finance/invoices-detail', handle: handleFinanceInvoicesDetail, auth: true },
  { method: 'GET', path: '/api/v1/finance/budgets-detail', handle: handleFinanceBudgetsDetail, auth: true },
  { method: 'GET', path: '/api/v1/finance/reports-detail', handle: handleFinanceReportsDetail, auth: true },
];
