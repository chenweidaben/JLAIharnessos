/**
 * 健澜科技 jlmedaios - M469 科室成本核算与绩效分配（dept-cost/cost/performance）
 *
 * 科室成本汇总 / 项目成本 / 病种成本 / 绩效得分 / 计件绩效 / 成本预警
 * 避开 DRG/DIP 经营分析、BI 驾驶舱、运营 KPI、设备全生命周期既有口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/dept-cost/summary - 科室成本汇总（科室/期间/医疗收入/总成本/结余/成本率）5 条 */
async function handleDeptCostSummary(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DCS-001', dept: '科室：心血管内科（一病区）', period: '期间：2026 年 9 月', revenue: '医疗收入：人民币 6,820,000.00 元', totalCost: '总成本：人民币 5,310,000.00 元', balance: '结余：人民币 1,510,000.00 元', rate: '成本率：77.9%（成本/收入）' },
    { id: 'DCS-002', dept: '科室：骨科（二病区）', period: '期间：2026 年 9 月', revenue: '医疗收入：人民币 5,940,000.00 元', totalCost: '总成本：人民币 4,860,000.00 元', balance: '结余：人民币 1,080,000.00 元', rate: '成本率：81.8%' },
    { id: 'DCS-003', dept: '科室：急诊科', period: '期间：2026 年 9 月', revenue: '医疗收入：人民币 3,260,000.00 元', totalCost: '总成本：人民币 3,180,000.00 元', balance: '结余：人民币 80,000.00 元', rate: '成本率：97.5%（微利，公益性属性）' },
    { id: 'DCS-004', dept: '科室：医学影像科（CT/MRI）', period: '期间：2026 年 9 月', revenue: '医疗收入：人民币 4,120,000.00 元', totalCost: '总成本：人民币 2,760,000.00 元', balance: '结余：人民币 1,360,000.00 元', rate: '成本率：67.0%（高效益医技）' },
    { id: 'DCS-005', dept: '科室：ICU 重症医学科', period: '期间：2026 年 9 月', revenue: '医疗收入：人民币 4,680,000.00 元', totalCost: '总成本：人民币 4,520,000.00 元', balance: '结余：人民币 160,000.00 元', rate: '成本率：96.6%（高投入、政策性微利）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cost/item - 项目成本（医疗项目/直接成本/间接分摊/单位成本/定价对比）5 条 */
async function handleCostItem(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CIT-001', item: '医疗项目：CT 平扫（64 排，次）', direct: '直接成本：人民币 186.00 元（折旧+耗材+人力）', indirect: '间接分摊：人民币 42.00 元（管理/水电/后勤）', unitCost: '单位成本：人民币 228.00 元/次', compare: '定价对比：收费 320.00 元，单位成本低于定价（毛利空间合理）' },
    { id: 'CIT-002', item: '医疗项目：MRI 平扫（1.5T，次）', direct: '直接成本：人民币 342.00 元（高折旧+维保）', indirect: '间接分摊：人民币 78.00 元', unitCost: '单位成本：人民币 420.00 元/次', compare: '定价对比：收费 680.00 元，成本占比 61.8%' },
    { id: 'CIT-003', item: '医疗项目：普通门诊挂号（次）', direct: '直接成本：人民币 3.50 元（人力分摊）', indirect: '间接分摊：人民币 2.20 元', unitCost: '单位成本：人民币 5.70 元/次', compare: '定价对比：挂号费 15.00 元（体现医护劳务，不盈利导向）' },
    { id: 'CIT-004', item: '医疗项目：静脉输液（组，含耗材）', direct: '直接成本：人民币 16.80 元（耗材+护理人力）', indirect: '间接分摊：人民币 3.60 元', unitCost: '单位成本：人民币 20.40 元/组', compare: '定价对比：收费 26.00 元，微利，防过度输液' },
    { id: 'CIT-005', item: '医疗项目：术后Ⅰ类切口换药（次）', direct: '直接成本：人民币 22.00 元（敷料+护理）', indirect: '间接分摊：人民币 4.50 元', unitCost: '单位成本：人民币 26.50 元/次', compare: '定价对比：收费 30.00 元，成本接近定价（劳务体现不足待优化）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cost/disease - 病种成本（病种/例均成本/医保支付/结余/成本结构）5 条 */
async function handleCostDisease(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CDZ-001', disease: '病种：急性 ST 段抬高心梗（DRG 组）', avgCost: '例均成本：人民币 23,600.00 元', payment: '医保支付：人民币 26,800.00 元（DRG 结算）', balance: '结余：人民币 3,200.00 元/例（盈余）', structure: '成本结构：耗材 42%、人力 26%、药品 18%、其他 14%' },
    { id: 'CDZ-002', disease: '病种：胆囊结石伴胆囊炎（腹腔镜，DRG）', avgCost: '例均成本：人民币 11,200.00 元', payment: '医保支付：人民币 12,600.00 元', balance: '结余：人民币 1,400.00 元/例（盈余）', structure: '成本结构：耗材 38%、人力 24%、药品 20%、麻醉 18%' },
    { id: 'CDZ-003', disease: '病种：2 型糖尿病（内科保守，DIP）', avgCost: '例均成本：人民币 6,400.00 元', payment: '医保支付：人民币 6,100.00 元（DIP 分值结算）', balance: '结余：-300.00 元/例（小幅亏损，需控药耗）', structure: '成本结构：药品 46%、检查 22%、人力 18%、耗材 14%' },
    { id: 'CDZ-004', disease: '病种：髋部骨折（老年，DRG，含内固定）', avgCost: '例均成本：人民币 31,800.00 元', payment: '医保支付：人民币 30,200.00 元', balance: '结余：-1,600.00 元/例（亏损，高耗材是主因）', structure: '成本结构：内固定耗材 51%、人力 21%、药品 15%、其他 13%' },
    { id: 'CDZ-005', disease: '病种：社区获得性肺炎（内科，DRG）', avgCost: '例均成本：人民币 8,900.00 元', payment: '医保支付：人民币 9,800.00 元', balance: '结余：900.00 元/例（盈余，路径管理良好）', structure: '成本结构：药品 35%、检查 26%、人力 24%、耗材 15%' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/performance/score - 绩效得分（科室/考核维度/得分/等级/排名）5 条 */
async function handlePerfScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PSC-001', dept: '科室：心血管内科（一病区）', dim: '考核维度：医疗质量+运营效率+满意度综合', score: '得分：92.5 分（百分制）', grade: '等级：A 档（优秀）', rank: '排名：全院第 2（本月）' },
    { id: 'PSC-002', dept: '科室：医学影像科', dim: '考核维度：工作量+成本控制+预约时效', score: '得分：90.8 分', grade: '等级：A 档（优秀）', rank: '排名：全院第 4' },
    { id: 'PSC-003', dept: '科室：骨科（二病区）', dim: '考核维度：手术质量+病种结余+安全', score: '得分：86.3 分', grade: '等级：B+ 档（良好）', rank: '排名：全院第 9' },
    { id: 'PSC-004', dept: '科室：急诊科', dim: '考核维度：绿色通道时效+抢救成功率+公益', score: '得分：84.0 分（公益项单独补偿，不唯结余）', grade: '等级：B 档（合格偏上）', rank: '排名：全院第 14' },
    { id: 'PSC-005', dept: '科室：ICU 重症医学科', dim: '考核维度：抢救成功率+院感+成本（政策补偿）', score: '得分：87.6 分', grade: '等级：B+ 档（良好）', rank: '排名：全院第 7' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/performance/piecework - 计件绩效（科室/业务量/单价/计件金额/考核扣减）5 条 */
async function handlePerfPiecework(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PWS-001', dept: '科室：医学影像科（CT/MRI）', volume: '业务量：CT 1,860 例 + MRI 620 例', price: '单价：CT 8.00 元/例、MRI 12.00 元/例（计件标准）', amount: '计件金额：人民币 22,320.00 元', deduct: '考核扣减：超时报告 3 例扣 240.00 元（净 22,080.00 元）' },
    { id: 'PWS-002', dept: '科室：检验科', volume: '业务量：检验标本 18,400 项次', price: '单价：按项目类别 0.30-1.20 元/项次', amount: '计件金额：人民币 19,650.00 元', deduct: '考核扣减：危急值迟报 1 例扣 150.00 元' },
    { id: 'PWS-003', dept: '科室：门诊护理（治疗室）', volume: '业务量：输液 3,260 组 + 换药 480 次', price: '单价：输液 1.50 元/组、换药 2.50 元/次', amount: '计件金额：人民币 6,150.00 元', deduct: '考核扣减：核对差错隐患 1 起扣 100.00 元' },
    { id: 'PWS-004', dept: '科室：手术室（护理配合）', volume: '业务量：手术配合 218 台', price: '单价：按手术分级 18-60 元/台', amount: '计件金额：人民币 11,940.00 元', deduct: '考核扣减：器械准备缺项 1 台扣 80.00 元' },
    { id: 'PWS-005', dept: '科室：病案室', volume: '业务量：归档病历 1,420 份 + 编码 1,420 份', price: '单价：归档 1.00 元/份、编码 1.50 元/份', amount: '计件金额：人民币 3,550.00 元', deduct: '考核扣减：编码错误 6 份扣 60.00 元' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cost/alert - 成本预警（科室/预警项/超支幅度/趋势/整改建议）5 条 */
async function handleCostAlert(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CAL-001', dept: '科室：骨科（髋部骨折病种）', alert: '预警项：高值耗材占比超阈值（内固定 51%）', overrun: '超支幅度：较 DRG 支付亏损 1,600.00 元/例', trend: '趋势：连续 3 例亏损，呈扩大趋势', fix: '整改建议：开展耗材集采比价，推行国产替代与临床路径控耗' },
    { id: 'CAL-002', dept: '科室：内分泌科（2 型糖尿病）', alert: '预警项：药占比偏高（药品 46%）', overrun: '超支幅度：DIP 结算小幅亏损 300.00 元/例', trend: '趋势：用药结构待优化，趋势平稳偏紧', fix: '整改建议：控辅助用药，规范降糖药联合方案，月度点评' },
    { id: 'CAL-003', dept: '科室：ICU', alert: '预警项：成本率 96.6%（接近全额成本）', overrun: '超支幅度：结余空间仅 160,000.00 元（占收入 3.4%）', trend: '趋势：高投入刚性，需政策补偿而非简单压缩', fix: '整改建议：争取政策性补偿，优化床位周转与耗材领用' },
    { id: 'CAL-004', dept: '科室：急诊科', alert: '预警项：成本率 97.5%（微利）', overrun: '超支幅度：结余仅 80,000.00 元（占收入 2.5%）', trend: '趋势：公益属性，人力/耗材刚性，不宜压成本', fix: '整改建议：公益岗位补偿核算，保障运转不裁剪抢救能力' },
    { id: 'CAL-005', dept: '科室：某医技科室（试剂耗材）', alert: '预警项：试剂损耗率超定额 8%', overrun: '超支幅度：月度耗材超定额 12,400.00 元', trend: '趋势：连续 2 月上升，疑报废/效期管理漏洞', fix: '整改建议：效期先进先出、报废审批复核，月度损耗专项盘点' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m469Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dept-cost/summary', handle: handleDeptCostSummary, auth: true },
  { method: 'GET', path: '/api/v1/cost/item', handle: handleCostItem, auth: true },
  { method: 'GET', path: '/api/v1/cost/disease', handle: handleCostDisease, auth: true },
  { method: 'GET', path: '/api/v1/performance/score', handle: handlePerfScore, auth: true },
  { method: 'GET', path: '/api/v1/performance/piecework', handle: handlePerfPiecework, auth: true },
  { method: 'GET', path: '/api/v1/cost/alert', handle: handleCostAlert, auth: true },
];
