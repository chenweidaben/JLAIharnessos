/**
 * 健澜科技 jlmedaios - M416 P1 业务扩展：运营管理深度打磨（详情版）
 *
 * 运营看板详情/运营效率详情/成本管控详情/收入分析详情/质量指标详情/对标分析详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/operations/dashboard-detail - 运营看板详情 5 条 */
async function handleOperationsDashboardDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ODD-001', metricName: 'Metric-001：日均门诊量', value: '数值：2200 人次/日', yoy: '同比：+8.5%（去年同期 2027 人次/日）', mom: '环比：+3.2%（上月 2132 人次/日）', targetRate: '目标达成率：95.7%（年度目标 2300 人次/日）' },
    { id: 'ODD-002', metricName: 'Metric-002：床位使用率', value: '数值：85.0%', yoy: '同比：+2.0 个百分点（去年同期 83.0%）', mom: '环比：+1.5 个百分点（上月 83.5%）', targetRate: '目标达成率：94.4%（年度目标 90.0%）' },
    { id: 'ODD-003', metricName: 'Metric-003：平均住院日', value: '数值：8.5 天', yoy: '同比：-0.5 天（去年同期 9.0 天）', mom: '环比：-0.2 天（上月 8.7 天）', targetRate: '目标达成率：105.9%（年度目标 8.0 天，优于目标）' },
    { id: 'ODD-004', metricName: 'Metric-004：患者满意度', value: '数值：92.0%', yoy: '同比：+1.5 个百分点（去年同期 90.5%）', mom: '环比：+0.5 个百分点（上月 91.5%）', targetRate: '目标达成率：102.2%（年度目标 90.0%，优于目标）' },
    { id: 'ODD-005', metricName: 'Metric-005：医疗收入', value: '数值：8000 万元/月', yoy: '同比：+12.0%（去年同期 7143 万元/月）', mom: '环比：+5.0%（上月 7619 万元/月）', targetRate: '目标达成率：100.0%（年度目标 9.6 亿元/年，即 8000 万元/月）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/efficiency-detail - 运营效率详情 5 条 */
async function handleOperationsEfficiencyDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OED-001', metricName: 'Metric-001：门诊平均候诊时间', value: '数值：35 分钟', industryAvg: '行业均值：45 分钟（浙江省三甲医院平均）', ranking: '排名：省内第 12 名（共 50 家三甲医院）', trend: '趋势：同比缩短 5 分钟（去年 40 分钟），环比缩短 2 分钟（上月 37 分钟），持续优化中' },
    { id: 'OED-002', metricName: 'Metric-002：术前平均等待时间', value: '数值：2.5 天', industryAvg: '行业均值：3.5 天（浙江省三甲医院平均）', ranking: '排名：省内第 8 名（共 50 家三甲医院）', trend: '趋势：同比缩短 0.5 天（去年 3.0 天），环比缩短 0.3 天（上月 2.8 天），持续优化中' },
    { id: 'OED-003', metricName: 'Metric-003：检查报告平均出具时间', value: '数值：2.0 小时', industryAvg: '行业均值：3.0 小时（浙江省三甲医院平均）', ranking: '排名：省内第 5 名（共 50 家三甲医院）', trend: '趋势：同比缩短 0.5 小时（去年 2.5 小时），环比持平（上月 2.0 小时），保持领先' },
    { id: 'OED-004', metricName: 'Metric-004：床位周转率', value: '数值：35 次/床/年', industryAvg: '行业均值：30 次/床/年（浙江省三甲医院平均）', ranking: '排名：省内第 10 名（共 50 家三甲医院）', trend: '趋势：同比增加 2 次/床/年（去年 33 次），环比增加 1 次/床/年（上月 34 次），持续提升中' },
    { id: 'OED-005', metricName: 'Metric-005：医生日均门诊量', value: '数值：40 人次/医生/日', industryAvg: '行业均值：35 人次/医生/日（浙江省三甲医院平均）', ranking: '排名：省内第 15 名（共 50 家三甲医院）', trend: '趋势：同比增加 3 人次/医生/日（去年 37 人次），环比增加 1 人次/医生/日（上月 39 人次），持续提升中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/cost-detail - 成本管控详情 5 条 */
async function handleOperationsCostDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OCD-001', costItem: '成本项：人员经费（工资+奖金+社保）', amount: '金额：3500 万元/月（占比 53.8%）', ratio: '占比：53.8%（占总运营成本 6500 万元/月的 53.8%）', yoy: '同比：+10.0%（去年同期 3182 万元/月，因人员增加 5% + 工资普涨 5%）', controlMeasures: '管控措施：1. 优化人员结构（减少行政后勤人员，增加临床一线人员）；2. 绩效改革（向临床一线倾斜，提高效率）；3. 控制人员增长（年度人员增长不超过 3%）' },
    { id: 'OCD-002', costItem: '成本项：药品费用', amount: '金额：1000 万元/月（占比 15.4%）', ratio: '占比：15.4%（占总运营成本 6500 万元/月的 15.4%）', yoy: '同比：-5.0%（去年同期 1053 万元/月，因集采药品占比提升至 60%）', controlMeasures: '管控措施：1. 扩大集采药品占比（目标 70%）；2. 加强合理用药管控（抗菌药物使用强度控制在 40 DDD 以下）；3. 药品零加成（药品收入 = 药品成本）' },
    { id: 'OCD-003', costItem: '成本项：卫生材料费', amount: '金额：800 万元/月（占比 12.3%）', ratio: '占比：12.3%（占总运营成本 6500 万元/月的 12.3%）', yoy: '同比：+8.0%（去年同期 741 万元/月，因手术量增加 10%）', controlMeasures: '管控措施：1. 高值耗材集中采购（降低采购价格 10-15%）；2. 耗材使用管控（建立耗材使用预警机制）；3. 耗材零加成（耗材收入 = 耗材成本）' },
    { id: 'OCD-004', costItem: '成本项：设备折旧/维护费', amount: '金额：500 万元/月（占比 7.7%）', ratio: '占比：7.7%（占总运营成本 6500 万元/月的 7.7%）', yoy: '同比：+15.0%（去年同期 435 万元/月，因新购 CT/MRI 等大型设备）', controlMeasures: '管控措施：1. 设备共享（提高设备使用率，降低闲置率）；2. 设备维护外包（降低维护成本 20%）；3. 设备更新规划（优先更新高使用率设备）' },
    { id: 'OCD-005', costItem: '成本项：后勤保障费（水电气+物业）', amount: '金额：400 万元/月（占比 6.2%）', ratio: '占比：6.2%（占总运营成本 6500 万元/月的 6.2%）', yoy: '同比：+5.0%（去年同期 381 万元/月，因能耗价格上涨）', controlMeasures: '管控措施：1. 节能改造（LED 照明+空调变频，预计节能 15%）；2. 物业外包（降低物业成本 10%）；3. 能耗监控（建立能耗实时监控平台）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/revenue-detail - 收入分析详情 5 条 */
async function handleOperationsRevenueDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ORD-001', revenueItem: '收入项：医疗服务收入（门诊+住院诊疗费）', amount: '金额：4000 万元/月（占比 50.0%）', ratio: '占比：50.0%（占总收入 8000 万元/月的 50.0%）', yoy: '同比：+15.0%（去年同期 3478 万元/月，因门诊量增加 8.5% + 医疗服务价格调整 5%）', trend: '趋势：持续增长（近 6 个月：1-6 月分别为 3500、3600、3700、3800、3900、4000 万元/月）' },
    { id: 'ORD-002', revenueItem: '收入项：药品收入（零加成）', amount: '金额：1000 万元/月（占比 12.5%）', ratio: '占比：12.5%（占总收入 8000 万元/月的 12.5%）', yoy: '同比：-5.0%（去年同期 1053 万元/月，因集采药品占比提升至 60%）', trend: '趋势：略有下降（近 6 个月：1-6 月分别为 1100、1080、1060、1040、1020、1000 万元/月）' },
    { id: 'ORD-003', revenueItem: '收入项：卫生材料收入（零加成）', amount: '金额：800 万元/月（占比 10.0%）', ratio: '占比：10.0%（占总收入 8000 万元/月的 10.0%）', yoy: '同比：+8.0%（去年同期 741 万元/月，因手术量增加 10%）', trend: '趋势：稳定增长（近 6 个月：1-6 月分别为 700、720、740、760、780、800 万元/月）' },
    { id: 'ORD-004', revenueItem: '收入项：检查检验收入', amount: '金额：1500 万元/月（占比 18.75%）', ratio: '占比：18.75%（占总收入 8000 万元/月的 18.75%）', yoy: '同比：+10.0%（去年同期 1364 万元/月，因门诊量增加 8.5% + 检查项目增加 5%）', trend: '趋势：持续增长（近 6 个月：1-6 月分别为 1300、1350、1400、1450、1480、1500 万元/月）' },
    { id: 'ORD-005', revenueItem: '收入项：其他收入（培训+租金+利息）', amount: '金额：700 万元/月（占比 8.75%）', ratio: '占比：8.75%（占总收入 8000 万元/月的 8.75%）', yoy: '同比：+5.0%（去年同期 667 万元/月，因培训收入增加 10%）', trend: '趋势：稳定（近 6 个月：1-6 月均为 650-700 万元/月）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/quality-detail - 质量指标详情 5 条 */
async function handleOperationsQualityDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OQD-001', metricName: 'Metric-001：三级手术占比', value: '数值：35.0%', standard: '标准：≥30.0%（三级医院评审标准）', passRate: '达标率：116.7%（优于标准 5 个百分点）', trend: '趋势：同比提升 3.0 个百分点（去年 32.0%），环比提升 1.0 个百分点（上月 34.0%），持续提升中' },
    { id: 'OQD-002', metricName: 'Metric-002：院内感染发生率', value: '数值：1.5%', standard: '标准：≤3.0%（三级医院评审标准）', passRate: '达标率：200.0%（远优于标准 1.5 个百分点）', trend: '趋势：同比下降 0.3 个百分点（去年 1.8%），环比下降 0.1 个百分点（上月 1.6%），持续下降中' },
    { id: 'OQD-003', metricName: 'Metric-003：病案甲级率', value: '数值：95.0%', standard: '标准：≥90.0%（三级医院评审标准）', passRate: '达标率：105.6%（优于标准 5 个百分点）', trend: '趋势：同比提升 1.5 个百分点（去年 93.5%），环比提升 0.5 个百分点（上月 94.5%），持续提升中' },
    { id: 'OQD-004', metricName: 'Metric-004：抗菌药物使用强度', value: '数值：35 DDD', standard: '标准：≤40 DDD（三级医院评审标准）', passRate: '达标率：114.3%（优于标准 5 DDD）', trend: '趋势：同比下降 3 DDD（去年 38 DDD），环比下降 1 DDD（上月 36 DDD），持续下降中' },
    { id: 'OQD-005', metricName: 'Metric-005：患者死亡率（住院）', value: '数值：1.2%', standard: '标准：≤1.5%（三级医院评审标准）', passRate: '达标率：125.0%（优于标准 0.3 个百分点）', trend: '趋势：同比下降 0.2 个百分点（去年 1.4%），环比持平（上月 1.2%），保持稳定' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/operations/comparison-detail - 对标分析详情 5 条 */
async function handleOperationsComparisonDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'OCD-001', metricName: 'Metric-001：日均门诊量', ourValue: '本院值：2200 人次/日（浙江省杭州市第一人民医院）', peerAvg: '同级均值：2500 人次/日（浙江省同类三甲医院平均）', topAvg: '三甲均值：3000 人次/日（全国顶级三甲医院平均）', gap: '差距：1. 与同级均值差距：-300 人次/日（落后 12%）；2. 与三甲均值差距：-800 人次/日（落后 27%）；3. 改进建议：加强学科建设，吸引更多患者' },
    { id: 'OCD-002', metricName: 'Metric-002：平均住院日', ourValue: '本院值：8.5 天（浙江省杭州市第一人民医院）', peerAvg: '同级均值：9.0 天（浙江省同类三甲医院平均）', topAvg: '三甲均值：7.0 天（全国顶级三甲医院平均）', gap: '差距：1. 与同级均值差距：-0.5 天（优于同级 5.6%）；2. 与三甲均值差距：+1.5 天（落后顶级 21.4%）；3. 改进建议：优化临床路径，缩短平均住院日' },
    { id: 'OCD-003', metricName: 'Metric-003：患者满意度', ourValue: '本院值：92.0%（浙江省杭州市第一人民医院）', peerAvg: '同级均值：90.0%（浙江省同类三甲医院平均）', topAvg: '三甲均值：95.0%（全国顶级三甲医院平均）', gap: '差距：1. 与同级均值差距：+2.0 个百分点（优于同级 2.2%）；2. 与三甲均值差距：-3.0 个百分点（落后顶级 3.2%）；3. 改进建议：改善就医环境，提升患者体验' },
    { id: 'OCD-004', metricName: 'Metric-004：医疗收入', ourValue: '本院值：8000 万元/月（浙江省杭州市第一人民医院）', peerAvg: '同级均值：9000 万元/月（浙江省同类三甲医院平均）', topAvg: '三甲均值：12000 万元/月（全国顶级三甲医院平均）', gap: '差距：1. 与同级均值差距：-1000 万元/月（落后 11.1%）；2. 与三甲均值差距：-4000 万元/月（落后 33.3%）；3. 改进建议：加强学科建设，提升医疗服务能力' },
    { id: 'OCD-005', metricName: 'Metric-005：床位使用率', ourValue: '本院值：85.0%（浙江省杭州市第一人民医院）', peerAvg: '同级均值：88.0%（浙江省同类三甲医院平均）', topAvg: '三甲均值：95.0%（全国顶级三甲医院平均）', gap: '差距：1. 与同级均值差距：-3.0 个百分点（落后 3.4%）；2. 与三甲均值差距：-10.0 个百分点（落后 10.5%）；3. 改进建议：优化床位分配，提高床位使用率' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m416Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/operations/dashboard-detail', handle: handleOperationsDashboardDetail, auth: true },
  { method: 'GET', path: '/api/v1/operations/efficiency-detail', handle: handleOperationsEfficiencyDetail, auth: true },
  { method: 'GET', path: '/api/v1/operations/cost-detail', handle: handleOperationsCostDetail, auth: true },
  { method: 'GET', path: '/api/v1/operations/revenue-detail', handle: handleOperationsRevenueDetail, auth: true },
  { method: 'GET', path: '/api/v1/operations/quality-detail', handle: handleOperationsQualityDetail, auth: true },
  { method: 'GET', path: '/api/v1/operations/comparison-detail', handle: handleOperationsComparisonDetail, auth: true },
];
