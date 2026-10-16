/**
 * 健澜科技 jlmedaios - 【患者体验深化】满意度闭环路由（M174-D）
 *
 *   GET /api/v1/patient/satisfaction/deep?dept=&period=
 *
 *   一次返回深化满意度闭环体系：
 *     loop      buildDeepSatisfactionLoop（多渠道 + 情感 + 5Why + PDCA + NPS）；
 *     trend     analyzeSatisfactionTrend（按科室周期趋势分析）；
 *     benchmark benchmarkSatisfaction（本科室 vs 区域标杆对标）；
 *     voice     generatePatientVoiceReport（患者之声报告）。
 *
 * 薄壳路由：业务规则全部在 aggregators/satisfactionDeepAggregator.ts 纯函数层。
 * 不写 SQL 写操作、不触 WebSocket、不新增依赖；库不可达时降级为内置 demo 数据。
 *
 * 设计原则：满意度闭环要真改进，不能只是登记。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  benchmarkSatisfaction,
  buildDeepSatisfactionLoop,
  analyzeSatisfactionTrend,
  generatePatientVoiceReport,
  type DeepSatisfactionSignal,
  type PdcaAction,
  type TrendPoint,
} from '../aggregators/satisfactionDeepAggregator';

/** 近 N 天窗口 */
const WINDOW_DAYS = 90;

/* -------------------------------------------------------------------------- */
/* 内置 demo 数据（库不可达时降级，保证页面可渲染）                              */
/* -------------------------------------------------------------------------- */

/** demo 多渠道信号：覆盖门诊/住院/手术/检查/药房/后勤 */
const DEMO_SIGNALS: DeepSatisfactionSignal[] = [
  { channel: 'outpatient', score: 2, comment: '排队太久了，等了快两个小时', dept: 'outpatient', date: '2026-09-20', npsScore: 4 },
  { channel: 'outpatient', score: 2, comment: '候诊时间太长，人太多排长队', dept: 'outpatient', date: '2026-09-25', npsScore: 5 },
  { channel: 'outpatient', score: 3, comment: '医生态度差，不耐烦，问两句就敷衍', dept: 'outpatient', date: '2026-09-28', npsScore: 3 },
  { channel: 'pharmacy', score: 3, comment: '费用不透明，药费贵，收费高', dept: 'pharmacy', date: '2026-10-02', npsScore: 5 },
  { channel: 'outpatient', score: 3, comment: '跑了好几个窗口，手续多，来回跑', dept: 'outpatient', date: '2026-10-05', npsScore: 6 },
  { channel: 'inpatient', score: 5, comment: '护士很耐心，解释清楚，非常满意', dept: 'nursing', date: '2026-10-06', npsScore: 10 },
  { channel: 'inpatient', score: 5, comment: '医生专业负责，感谢', dept: 'internal', date: '2026-10-08', npsScore: 9 },
  { channel: 'logistics', score: 2, comment: '卫生间有异味，等候区太吵', dept: 'logistics', date: '2026-10-10', npsScore: 4 },
  { channel: 'outpatient', score: 4, comment: '整体不错，就是排队久了点', dept: 'outpatient', date: '2026-10-12', npsScore: 8 },
  { channel: 'exam', score: 4, comment: '检查预约顺利，护士引导清楚', dept: 'exam', date: '2026-10-13', npsScore: 9 },
  { channel: 'outpatient', score: 2, comment: '排队太久，等很久，号也难挂', dept: 'outpatient', date: '2026-10-14', npsScore: 3 },
  { channel: 'surgery', score: 4, comment: '手术安排合理，术后回访及时', dept: 'surgery', date: '2026-10-15', npsScore: 9 },
];

/** demo PDCA 改进事项 */
const DEMO_PDCA_ACTIONS: PdcaAction[] = [
  { actionId: 'pdca-1', category: 'wait_time', phase: 'check', action: '高峰时段弹性排班，门诊增派流动护士', owner: '门诊部', dueDays: 14, beforeScore: 2.1, afterScore: 3.8 },
  { actionId: 'pdca-2', category: 'staff_attitude', phase: 'act', action: '服务礼仪专项培训，三分钟病情解释标准动作', owner: '医务处', dueDays: 14, beforeScore: 2.3, afterScore: 4.6 },
  { actionId: 'pdca-3', category: 'cost', phase: 'plan', action: '费用清单自助打印并公众号实时推送', owner: '财务/医保办', dueDays: 14, beforeScore: 3.0 },
  { actionId: 'pdca-4', category: 'environment', phase: 'do', action: '每日两次环境巡检，高峰加密保洁', owner: '后勤保障部', dueDays: 30 },
];

/** demo 趋势序列（按周） */
const DEMO_TREND: TrendPoint[] = [
  { period: '2026-W35', sampleSize: 18, avgScore: 3.2, negativeRatio: 0.44, nps: 12 },
  { period: '2026-W36', sampleSize: 22, avgScore: 3.4, negativeRatio: 0.38, nps: 18 },
  { period: '2026-W37', sampleSize: 25, avgScore: 3.6, negativeRatio: 0.32, nps: 24 },
  { period: '2026-W38', sampleSize: 28, avgScore: 3.9, negativeRatio: 0.25, nps: 32 },
];

/** demo 同行对标 */
const DEMO_PEERS = [
  { name: '区域同级医院均值', avgScore: 3.7, negativeRatio: 0.30, nps: 25 },
  { name: '三甲标杆', avgScore: 4.4, negativeRatio: 0.12, nps: 55 },
];

export const satisfactionDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/satisfaction/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const dept = (c.query.get('dept') ?? 'outpatient').trim() || 'outpatient';
        const period = (c.query.get('period') ?? '2026-Q4').trim() || '2026-Q4';

        // 1) 深化闭环（多渠道 + 情感 + 5Why + PDCA + NPS）
        const loop = buildDeepSatisfactionLoop(DEMO_SIGNALS, DEMO_PDCA_ACTIONS);

        // 2) 趋势分析
        const trend = analyzeSatisfactionTrend(dept, DEMO_TREND);

        // 3) 对标
        const benchmark = benchmarkSatisfaction(
          { dept, avgScore: loop.collect.channels[0]?.avgScore ?? 3.6, negativeRatio: loop.collect.emotion.negativeRatio, nps: loop.nps.nps, sampleSize: loop.collect.total },
          DEMO_PEERS,
        );

        // 4) 患者之声报告
        const voice = generatePatientVoiceReport(period, DEMO_SIGNALS);

        return json(ok({
          periodDays: WINDOW_DAYS,
          dataSource: 'demo' as const,
          loop,
          trend,
          benchmark,
          voice,
          generatedAt: new Date().toISOString(),
        }, '满意度深化闭环已加载（多渠道/情感/5Why/PDCA/NPS，真改进不只登记）'));
      } catch (err) {
        console.error(`[satisfactionDeep] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '满意度深化计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
