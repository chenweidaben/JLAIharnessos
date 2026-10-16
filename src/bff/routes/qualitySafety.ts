/**
 * 健澜科技 jlmedaios — 【质量与体验】医院质量与安全管理深化路由（M180-A）
 *
 *   GET /api/v1/quality/deep
 *                       ?dept=内科                 （责任科室，默认全院）
 *                       &period=2026-10            （统计期，默认本月）
 *
 *   一次返回深度质量安全体系：
 *     system       buildDeepQualitySafety（四大管理维度，总在返回）；
 *     tracked      trackQualityIndicator（国家口径指标对照达标线跟踪）；
 *     gaps         identifyQualityGap（现状 vs 国家/评审标准差距分析）；
 *     improvement  generateQualityImprovement（根因匹配方法论生成改进措施）。
 *
 * 薄壳路由：业务规则与数学全部在 aggregators/qualitySafetyAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * 质量管理严格国家口径，不自创指标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepQualitySafety,
  generateQualityImprovement,
  identifyQualityGap,
  trackQualityIndicator,
  type GapItem,
  type QualityIndicatorInput,
  type RootCause,
} from '../aggregators/qualitySafetyAggregator';

/** 内置确定性国家口径指标样例（未接入真实采集时演示用，前端标注 demo） */
const DEMO_INDICATORS: QualityIndicatorInput[] = [
  { code: 'KPI-MQ-02', name: '手术患者并发症发生率', unit: '‰', direction: 'lower_better', target: 18, actual: 22.4, sampleSize: 420 },
  { code: 'KPI-MQ-03', name: 'I 类切口手术部位感染率', unit: '%', direction: 'lower_better', target: 1.5, actual: 1.1, sampleSize: 360 },
  { code: 'PSG-04', name: '手卫生依从率', unit: '%', direction: 'higher_better', target: 95, actual: 89, sampleSize: 500 },
  { code: 'PSG-05', name: '住院跌倒发生率（零容忍红线项）', unit: '‰', direction: 'lower_better', target: 0, actual: 0.6, sampleSize: 1200, zeroTolerance: true },
];

/** 内置差距对照样例（现状 vs 国家/评审标准） */
const DEMO_GAPS: GapItem[] = [
  { code: 'KPI-MQ-01', name: '出院患者四级手术比例', unit: '%', direction: 'higher_better', standard: 25, current: 18.5 },
  { code: 'EMR-L5', name: '电子病历五级（CDSS 闭环率）', unit: '%', direction: 'higher_better', standard: 90, current: 72 },
  { code: 'IHE-L4A', name: '互联互通四甲（院内主数据一致率）', unit: '%', direction: 'higher_better', standard: 95, current: 88 },
  { code: 'REV-4.3', name: '三甲评审条款 4.3.1.2 监测整改闭环率', unit: '%', direction: 'higher_better', standard: 100, current: 80 },
];

export const qualitySafetyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/quality/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const system = buildDeepQualitySafety();

        const dept = (c.query.get('dept') ?? '全院').trim() || '全院';
        const period = (c.query.get('period') ?? new Date().toISOString().slice(0, 7)).trim();

        // 1) 国家口径指标跟踪
        const tracked = DEMO_INDICATORS.map((ind) => trackQualityIndicator(ind, dept, period));

        // 2) 现状 vs 国家/评审标准差距分析
        const gaps = identifyQualityGap(dept, DEMO_GAPS);

        // 3) 针对首个红线/黄线问题生成改进措施（根因示例：流程方法类）
        const firstIssue = tracked.find((t) => t.severity === 'red') ?? tracked.find((t) => t.severity === 'yellow');
        const improvement = generateQualityImprovement(
          firstIssue ? firstIssue.summary : '质量指标距国家达标线存在差距',
          '方法' as RootCause,
        );

        return json(ok({
          system,
          tracked,
          gaps,
          improvement,
          dept,
          period,
          demo: true,
          generatedAt: new Date().toISOString(),
        }, '质量与安全体系已加载（国家口径指标跟踪/差距分析/根因改进，PDCA·QCC·DMAIC·Lean）'));
      } catch (err) {
        console.error(`[qualitySafety] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '质量与安全计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
