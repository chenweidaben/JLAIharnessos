/**
 * 健澜科技 jlmedaios - M442 医保管理深度（insurance）
 *
 * 参保登记/医保结算/报销目录/DRG预分组/医保稽核
 * （accounts 个人账户已存在，此处不重复）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/insurance/enrollments - 参保登记（参保人/险种/参保地/有效期/状态）5 条 */
async function handleInsEnrollments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IEN-001', person: '参保人：张***（男，65 岁，退休职工）', insuranceType: '险种：城镇职工基本医疗保险（含个人账户）', region: '参保地：杭州市西湖区医保经办机构', validPeriod: '有效期：2026-01-01 至 2026-12-31（年度正常参保）', status: '状态：正常参保（可直接结算）' },
    { id: 'IEN-002', person: '参保人：李***（女，58 岁，灵活就业）', insuranceType: '险种：城乡居民基本医疗保险（2026 年度）', region: '参保地：杭州市余杭区', validPeriod: '有效期：2026-01-01 至 2026-12-31', status: '状态：正常参保' },
    { id: 'IEN-003', person: '参保人：王***（男，72 岁，退休）', insuranceType: '险种：城镇职工医保 + 长期护理保险', region: '参保地：杭州市拱墅区', validPeriod: '有效期：2026 年度（已缴费）', status: '状态：正常参保' },
    { id: 'IEN-004', person: '参保人：陈***（男，45 岁，在职）', insuranceType: '险种：城镇职工基本医疗保险（单位参保）', region: '参保地：杭州市滨江区', validPeriod: '有效期：2026-03 起（单位新增参保）', status: '状态：正常参保（等待期已满）' },
    { id: 'IEN-005', person: '参保人：赵***（女，32 岁，在职职工）', insuranceType: '险种：城镇职工医保 + 补充医疗（单位补充）', region: '参保地：杭州市上城区', validPeriod: '有效期：2026 年度', status: '状态：停保待处理（单位减员中，待复核）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/settlements - 医保结算（结算号/患者/总费用/报销额/自付）5 条 */
async function handleInsSettlements(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IST-001', settleNo: '结算号：SET-20261020-01（住院出院结算）', patient: '患者：张***（冠心病住院，职工医保）', totalFee: '总费用：18650.00 元', reimbursed: '报销额：13280.00 元（统筹 + 个人账户）', ownPay: '自付：5370.00 元（含起付线与自付比例）' },
    { id: 'IST-002', settleNo: '结算号：SET-20261020-02（门诊统筹）', patient: '患者：李***（糖尿病门诊复诊，居民医保）', totalFee: '总费用：326.50 元', reimbursed: '报销额：218.00 元', ownPay: '自付：108.50 元' },
    { id: 'IST-003', settleNo: '结算号：SET-20261019-03（住院结算）', patient: '患者：王***（膝关节置换住院，职工医保）', totalFee: '总费用：62400.00 元（含耗材）', reimbursed: '报销额：45100.00 元', ownPay: '自付：17300.00 元（自费耗材占比高）' },
    { id: 'IST-004', settleNo: '结算号：SET-20261019-04（门诊慢病）', patient: '患者：陈***（高血压慢病门诊，职工医保）', totalFee: '总费用：158.00 元', reimbursed: '报销额：126.00 元（慢病门诊政策）', ownPay: '自付：32.00 元' },
    { id: 'IST-005', settleNo: '结算号：SET-20261018-05（生育结算）', patient: '患者：赵***（顺产住院，职工医保 + 生育）', totalFee: '总费用：5800.00 元', reimbursed: '报销额：5400.00 元（生育津贴 + 统筹）', ownPay: '自付：400.00 元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/catalog - 报销目录（药品/诊疗项目/甲乙丙类/限价/报销比例）5 条 */
async function handleInsCatalog(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ICA-001', drug: '药品：阿托伐他汀钙片 20mg（国药准字 H 类）', category: '分类：甲类（国家医保目录全额纳入）', priceCap: '限价：不设个人先行自付上限', ratio: '报销比例：按统筹比例全额纳入报销基数', note: '备注：基层/住院按政策比例报销' },
    { id: 'ICA-002', drug: '诊疗项目：磁共振平扫（MRI）', category: '分类：乙类（个人先自付一定比例后纳入）', priceCap: '限价：杭州地区限定收费标准', ratio: '报销比例：先自付 10%，余下按统筹比例', note: '备注：需符合适应症指征' },
    { id: 'ICA-003', drug: '药品：进口靶向抗肿瘤药（协议期内谈判药）', category: '分类：乙类（谈判药，单独支付）', priceCap: '限价：国家谈判协议价', ratio: '报销比例：门诊特药按特药政策报销', note: '备注：需特药资格备案' },
    { id: 'ICA-004', drug: '诊疗项目：特需 VIP 病房床位（非普通床位）', category: '分类：丙类（自费，不纳入医保）', priceCap: '限价：市场自主定价', ratio: '报销比例：0%（完全自费）', note: '备注：普通病房床位甲类可报' },
    { id: 'ICA-005', drug: '药品：二甲双胍缓释片 0.5g', category: '分类：甲类（国家目录）', priceCap: '限价：不设先行自付', ratio: '报销比例：全额纳入报销基数', note: '备注：慢病门诊可报' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/drg-pregroup - DRG预分组（病案号/病组/预测权重/费用偏差/建议）5 条 */
async function handleInsDrgPregroup(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDR-001', mrNo: '病案号：MRN-2026-001188（冠心病）', drgGroup: '病组：FM3 冠状动脉支架植入（伴并发症）', weight: '预测权重：1.82（预测医保支付额测算）', costBias: '费用偏差：当前费用低于病组均值 8%（可控）', advice: '建议：规范填写主诊断/手术，避免低编高编' },
    { id: 'IDR-002', mrNo: '病案号：MRN-2026-004512（膝关节置换）', drgGroup: '病组：IC2 髋膝关节置换术（不伴并发症）', weight: '预测权重：2.45', costBias: '费用偏差：耗材费用高于病组均值 15%（需关注）', advice: '建议：加强耗材合理性审核，控制超支' },
    { id: 'IDR-003', mrNo: '病案号：MRN-2026-006671（急性阑尾炎）', drgGroup: '病组：GB2 阑尾切除术（不伴并发症）', weight: '预测权重：0.78', costBias: '费用偏差：费用与病组均值基本持平', advice: '建议：按路径诊疗，避免无效检查' },
    { id: 'IDR-004', mrNo: '病案号：MRN-2026-002340（2 型糖尿病）', drgGroup: '病组：仅内科保守治疗，无手术（非 DRG 外科组）', weight: '预测权重：按病种/按床日测算', costBias: '费用偏差：门诊/住院费用待测算', advice: '建议：完善并发症编码，提升分组准确性' },
    { id: 'IDR-005', mrNo: '病案号：MRN-2026-007820（顺产）', drgGroup: '病组：OC1 阴道分娩（不伴并发症）', weight: '预测权重：0.62', costBias: '费用偏差：低于病组均值，结余可控', advice: '建议：规范记录分娩结局与新生儿情况' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/audits - 医保稽核（单据号/疑点类型/金额/处理结果/稽核人）5 条 */
async function handleInsAudits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IAU-001', billNo: '单据号：AUD-20261020-01（住院结算单据）', doubt: '疑点类型：疑似分解住院（同一患者短期重复入院）', amount: '疑点金额：约 3200.00 元（待核）', result: '处理结果：已退回科室说明，待复核确认', auditor: '稽核人：医保科 周***（AUD-002）' },
    { id: 'IAU-002', billNo: '单据号：AUD-20261019-02（门诊处方）', doubt: '疑点类型：超医保限定用药（超适应症/超量开药）', amount: '疑点金额：约 560.00 元', result: '处理结果：疑点成立，约谈医生并扣回违规费用', auditor: '稽核人：医保科 吴***（AUD-007）' },
    { id: 'IAU-003', billNo: '单据号：AUD-20261019-03（诊疗项目单据）', doubt: '疑点类型：重复检查/无指征检查（同类项目重复收费）', amount: '疑点金额：约 890.00 元', result: '处理结果：疑点成立，责令整改并追回', auditor: '稽核人：医保科 周***（AUD-002）' },
    { id: 'IAU-004', billNo: '单据号：AUD-20261018-04（处方/结算）', doubt: '疑点类型：冒名就医/身份不符（就诊人与参保人存疑）', amount: '疑点金额：整单待核', result: '处理结果：调查中，暂冻结该笔结算', auditor: '稽核人：医保科 吴***（AUD-007）' },
    { id: 'IAU-005', billNo: '单据号：AUD-20261017-05（常规结算抽查）', doubt: '疑点类型：无明显疑点（抽查通过）', amount: '疑点金额：0 元', result: '处理结果：无违规，结算有效，归档备查', auditor: '稽核人：医保科 郑***（AUD-011）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m442Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/enrollments', handle: handleInsEnrollments, auth: true },
  { method: 'GET', path: '/api/v1/insurance/settlements', handle: handleInsSettlements, auth: true },
  { method: 'GET', path: '/api/v1/insurance/catalog', handle: handleInsCatalog, auth: true },
  { method: 'GET', path: '/api/v1/insurance/drg-pregroup', handle: handleInsDrgPregroup, auth: true },
  { method: 'GET', path: '/api/v1/insurance/audits', handle: handleInsAudits, auth: true },
];
