/**
 * 健澜科技 jlmedaios - M429 P1 业务扩展：护理质量敏感指标(NQI)深度打磨
 *
 * 压疮发生率/跌倒发生率/给药错误/导管相关感染/护患比与护理工时/护理质量综合评分
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/nqi/pressure-ulcer - 压疮发生率（指标/科室/本期值/目标值/环比）5 条 */
async function handleNqiPressureUlcer(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NPU-001', indicator: '指标：院内获得性压疮发生率（Ⅲ期及以上）', dept: '科室：老年医学科', currentValue: '本期值：0.32%（住院 1250 人日，新发压疮 4 例）', targetValue: '目标值：≤0.50%', mom: '环比：较上期 0.41% 下降 0.09 个百分点' },
    { id: 'NPU-002', indicator: '指标：难免压疮申报合格率', dept: '科室：神经内科', currentValue: '本期值：96.0%（申报 25 例，合格 24 例）', targetValue: '目标值：≥95.0%', mom: '环比：较上期 94.0% 提升 2.0 个百分点' },
    { id: 'NPU-003', indicator: '指标：压疮愈合率（入院带入压疮）', dept: '科室：骨科', currentValue: '本期值：82.0%（带入压疮 11 例，愈合 9 例）', targetValue: '目标值：≥80.0%', mom: '环比：较上期 78.0% 提升 4.0 个百分点' },
    { id: 'NPU-004', indicator: '指标：Braden 评分评估覆盖率', dept: '科室：全院（护理部汇总）', currentValue: '本期值：99.2%（入院患者 2480 人，完成评估 2460 人）', targetValue: '目标值：100.0%', mom: '环比：较上期 98.5% 提升 0.7 个百分点' },
    { id: 'NPU-005', indicator: '指标：压疮防护措施落实率', dept: '科室：ICU', currentValue: '本期值：97.5%（高危患者 40 例，落实减压垫/翻身 39 例）', targetValue: '目标值：≥95.0%', mom: '环比：较上期 96.0% 提升 1.5 个百分点' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/falls - 跌倒发生率（指标/科室/事件数/暴露人日/等级分布）5 条 */
async function handleNqiFalls(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NFL-001', indicator: '指标：住院患者跌倒发生率', dept: '科室：老年医学科', eventCount: '事件数：3 例（本期）', exposureDays: '暴露人日：1250 人日，发生率 0.24%', levelDist: '等级分布：Ⅰ级（未受伤）2 例，Ⅱ级（轻微擦伤）1 例，无Ⅲ级及以上' },
    { id: 'NFL-002', indicator: '指标：跌倒高危患者防护落实率', dept: '科室：神经内科', eventCount: '事件数：1 例（本期）', exposureDays: '暴露人日：1180 人日，发生率 0.08%', levelDist: '等级分布：Ⅰ级（未受伤）1 例；高危患者 35 例均落实床栏/陪护/警示标识' },
    { id: 'NFL-003', indicator: '指标：Morse 跌倒评分评估覆盖率', dept: '科室：全院（护理部汇总）', eventCount: '事件数：2 例（本期）', exposureDays: '暴露人日：2480 人日，发生率 0.08%', levelDist: '等级分布：Ⅰ级 1 例，Ⅱ级 1 例；Morse 评估覆盖率 99.5%' },
    { id: 'NFL-004', indicator: '指标：夜间跌倒事件占比', dept: '科室：骨科', eventCount: '事件数：1 例（本期，夜间如厕跌倒）', exposureDays: '暴露人日：960 人日，发生率 0.10%', levelDist: '等级分布：Ⅱ级（轻微软组织挫伤）1 例，已落实夜间陪护提醒' },
    { id: 'NFL-005', indicator: '指标：跌倒不良事件闭环上报率', dept: '科室：全院（护理部汇总）', eventCount: '事件数：6 例（本期全部上报）', exposureDays: '暴露人日：6 例事件，闭环上报率 100%', levelDist: '等级分布：Ⅰ级 4 例，Ⅱ级 2 例；均完成根因分析与整改' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/medication-errors - 给药错误（事件/类型/分级/处置/闭环状态）5 条 */
async function handleNqiMedicationErrors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NME-001', event: '事件：ME-2026-001（口服药漏发 1 次）', type: '类型：漏给药（医嘱已开，护士未按时发放）', grade: '分级：Ⅳ级（未造成伤害，B 类未遂事件）', handling: '处置：发现后立即补服，监测患者无不适，记录并告知医生', closedLoop: '闭环状态：已闭环（已上报、根因分析、科室整改）' },
    { id: 'NME-002', event: '事件：ME-2026-002（剂量错误：降压药剂量多给 1 次）', type: '类型：剂量错误（重复给药）', grade: '分级：Ⅲ级（造成一过性血压下降，无后遗症，C 类）', handling: '处置：立即停药、监测血压、对症处理，2 小时后恢复正常', closedLoop: '闭环状态：已闭环（双人核对流程已加强）' },
    { id: 'NME-003', event: '事件：ME-2026-003（给药途径错误：外用膏剂误口服）', type: '类型：途径错误（外用/内服混淆）', grade: '分级：Ⅳ级（未造成伤害，发现及时，B 类）', handling: '处置：立即停止、漱口、观察，患者无不适', closedLoop: '闭环状态：已闭环（外用药独立标识已整改）' },
    { id: 'NME-004', event: '事件：ME-2026-004（患者身份核对错误，药发给邻床）', type: '类型：对象错误（张冠李戴）', grade: '分级：Ⅲ级（邻床误服常规维生素，无伤害风险，C 类）', handling: '处置：立即收回、核对腕带、评估两患者，无不良反应', closedLoop: '闭环状态：已闭环（腕带双核对制度已强化）' },
    { id: 'NME-005', event: '事件：ME-2026-005（给药时间错误：抗生素间隔不足）', type: '类型：时间错误（给药间隔缩短）', grade: '分级：Ⅳ级（未造成伤害，B 类未遂）', handling: '处置：调整后续给药时间，监测血药浓度，无异常', closedLoop: '闭环状态：已闭环（给药时间提醒已上线）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/infection - 导管相关感染（导管类型/感染例数/千导管日/趋势）5 条 */
async function handleNqiInfection(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NCI-001', catheterType: '导管类型：中心静脉导管（CVC）相关血流感染', infectionCases: '感染例数：1 例（本期）', perThousandDays: '千导管日：CVC 共 320 导管日，感染率 3.13‰', trend: '趋势：较上期 4.50‰ 下降，低于院感目标 ≤5‰' },
    { id: 'NCI-002', catheterType: '导管类型：导尿管相关尿路感染（CAUTI）', infectionCases: '感染例数：2 例（本期）', perThousandDays: '千导管日：尿管共 1100 导管日，感染率 1.82‰', trend: '趋势：较上期 2.50‰ 下降，达标（目标 ≤3‰）' },
    { id: 'NCI-003', catheterType: '导管类型：呼吸机相关肺炎（VAP）', infectionCases: '感染例数：1 例（本期，ICU）', perThousandDays: '千呼吸机日：呼吸机共 260 日，感染率 3.85‰', trend: '趋势：较上期 5.20‰ 下降，接近目标 ≤4‰' },
    { id: 'NCI-004', catheterType: '导管类型：外科引流管相关感染', infectionCases: '感染例数：0 例（本期）', perThousandDays: '千导管日：引流管共 480 导管日，感染率 0‰', trend: '趋势：连续 2 期零感染，维持良好' },
    { id: 'NCI-005', catheterType: '导管类型：PICC 导管相关感染', infectionCases: '感染例数：1 例（本期）', perThousandDays: '千导管日：PICC 共 620 导管日，感染率 1.61‰', trend: '趋势：较上期 2.40‰ 下降，达标（目标 ≤2‰）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/nursing-hours - 护患比与护理工时（科室/床护比/护理工时/达标）5 条 */
async function handleNqiNursingHours(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NNH-001', dept: '科室：心内科病区（开放床位 45 张）', bedNurseRatio: '床护比：1:0.42（床位 45，护士 19 人）', nursingHours: '护理工时：日均直接护理 7.2 小时/患者', compliant: '达标：达标（符合病区 1:0.4 配置要求）' },
    { id: 'NNH-002', dept: '科室：ICU（开放床位 12 张）', bedNurseRatio: '床护比：1:2.5（床位 12，护士 30 人，一对一/二护理）', nursingHours: '护理工时：日均直接护理 18.5 小时/患者', compliant: '达标：达标（符合 ICU 1:2.5 重症配置要求）' },
    { id: 'NNH-003', dept: '科室：神经内科病区（开放床位 40 张）', bedNurseRatio: '床护比：1:0.40（床位 40，护士 16 人）', nursingHours: '护理工时：日均直接护理 6.8 小时/患者', compliant: '达标：达标（达到 1:0.4 配置下限）' },
    { id: 'NNH-004', dept: '科室：儿科病区（开放床位 30 张）', bedNurseRatio: '床护比：1:0.47（床位 30，护士 14 人）', nursingHours: '护理工时：日均直接护理 8.0 小时/患者（含家长宣教）', compliant: '达标：达标（儿科护理需求高，配置充足）' },
    { id: 'NNH-005', dept: '科室：急诊抢救室（留观床位 20 张）', bedNurseRatio: '床护比：1:0.55（床位 20，护士 11 人，三班轮转）', nursingHours: '护理工时：日均直接护理 9.5 小时/患者', compliant: '达标：达标（急诊高峰时段增配机动护士）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/nqi/quality-score - 护理质量综合评分（维度/得分/权重/等级）5 条 */
async function handleNqiQualityScore(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'NQS-001', dimension: '维度：基础护理质量（晨晚间护理、生活照护）', score: '得分：94.5 分（满分 100）', weight: '权重：20%', grade: '等级：优秀（≥90 分）' },
    { id: 'NQS-002', dimension: '维度：特级/一级护理落实质量', score: '得分：92.0 分（满分 100）', weight: '权重：20%', grade: '等级：优秀（≥90 分）' },
    { id: 'NQS-003', dimension: '维度：护理文书书写质量（记录规范/及时/完整）', score: '得分：88.5 分（满分 100）', weight: '权重：15%', grade: '等级：良好（80-89 分）' },
    { id: 'NQS-004', dimension: '维度：消毒隔离与院感防控质量', score: '得分：95.0 分（满分 100）', weight: '权重：15%', grade: '等级：优秀（≥90 分）' },
    { id: 'NQS-005', dimension: '维度：患者满意度（护理服务评价）', score: '得分：93.2 分（满分 100）', weight: '权重：30%', grade: '等级：优秀（≥90 分）；综合加权总分 92.6 分，全院护理质量等级：优秀' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m429Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/nqi/pressure-ulcer', handle: handleNqiPressureUlcer, auth: true },
  { method: 'GET', path: '/api/v1/nqi/falls', handle: handleNqiFalls, auth: true },
  { method: 'GET', path: '/api/v1/nqi/medication-errors', handle: handleNqiMedicationErrors, auth: true },
  { method: 'GET', path: '/api/v1/nqi/infection', handle: handleNqiInfection, auth: true },
  { method: 'GET', path: '/api/v1/nqi/nursing-hours', handle: handleNqiNursingHours, auth: true },
  { method: 'GET', path: '/api/v1/nqi/quality-score', handle: handleNqiQualityScore, auth: true },
];
