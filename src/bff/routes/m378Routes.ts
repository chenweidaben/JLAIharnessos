/**
 * 健澜科技 jlmedaios - M378 P1 业务扩展：医保管理深度打磨
 *
 * 医保政策/病种编码（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/insurance/policy - 医保政策 5 条 */
async function handleInsurancePolicy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IP-001', policyName: '浙江省基本医疗保险门诊统筹管理办法（2026 版）', type: '门诊统筹政策', content: '参保人员在定点医疗机构门诊就医发生的医疗费用，纳入门诊统筹基金支付范围，支付比例为在职职工 70%、退休人员 75%', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'IP-002', policyName: '浙江省基本医疗保险住院费用结算管理办法（2026 版）', type: '住院结算政策', content: '参保人员在定点医疗机构住院发生的医疗费用，纳入住院统筹基金支付范围，支付比例为在职职工 85%、退休人员 90%', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'IP-003', policyName: '浙江省大病保险管理办法（2026 版）', type: '大病保险政策', content: '参保人员在一个结算年度内发生的高额医疗费用，经基本医保报销后，个人负担超过大病保险起付线的部分，由大病保险基金按 60% 比例支付', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'IP-004', policyName: '浙江省医疗救助管理办法（2026 版）', type: '医疗救助政策', content: '对特困人员、低保对象、返贫致贫人口等困难群体参加基本医保的个人缴费部分给予全额资助，对其经基本医保、大病保险报销后个人负担的医疗费用给予救助', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
    { id: 'IP-005', policyName: '浙江省异地就医直接结算管理办法（2026 版）', type: '异地就医政策', content: '参保人员办理异地就医备案后，在异地定点医疗机构就医发生的医疗费用，可直接结算，执行就医地目录、参保地政策', publishTime: '2026-01-01（发布时间）', status: '已生效（2026-01-01 起执行）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/insurance/disease-codes - 病种编码 5 条 */
async function handleInsuranceDiseaseCodes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'IDC-001', diseaseName: '急性心肌梗死（急性 ST 段抬高型心肌梗死）', code: 'I21.301', version: 'ICD-10（2019 版）', category: '循环系统疾病', status: '已启用（当前有效）' },
    { id: 'IDC-002', diseaseName: '2 型糖尿病（伴并发症）', code: 'E11.901', version: 'ICD-10（2019 版）', category: '内分泌、营养和代谢疾病', status: '已启用（当前有效）' },
    { id: 'IDC-003', diseaseName: '高血压病 3 级（极高危）', code: 'I10.x05', version: 'ICD-10（2019 版）', category: '循环系统疾病', status: '已启用（当前有效）' },
    { id: 'IDC-004', diseaseName: '脑梗死（动脉粥样硬化性血栓性脑梗死）', code: 'I63.901', version: 'ICD-10（2019 版）', category: '循环系统疾病', status: '已启用（当前有效）' },
    { id: 'IDC-005', diseaseName: '社区获得性肺炎（成人）', code: 'J18.901', version: 'ICD-10（2019 版）', category: '呼吸系统疾病', status: '已启用（当前有效）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m378Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/insurance/policy', handle: handleInsurancePolicy, auth: true },
  { method: 'GET', path: '/api/v1/insurance/disease-codes', handle: handleInsuranceDiseaseCodes, auth: true },
];
