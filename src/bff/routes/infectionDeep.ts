/**
 * 健澜科技 jlmedaios — 【护理院感医保药事】医院院感管理深化路由（M179-B）
 *
 *   GET /api/v1/infection/deep
 *                       ?dept=ICU                 （手卫生/暴发识别按科室）
 *                       &period=2026-10           （周期，默认本月）
 *                       &observed=200&compliant=190（手卫生观察数/合格数，缺省走内置样例）
 *                       &threshold=3              （聚集阈值，默认 3）
 *                       &cases=mdro,CRE,2026-10-16T09:00:00Z;mdro,CRE,...
 *                                                 （自定义聚集病例：type,strain,at 分号分隔）
 *
 *   一次返回深度院感管理体系：
 *     system   buildDeepInfectionMgmt（四大维度，总在返回）；
 *     hand     monitorHandHygiene（dept/period/observed/compliant 手卫生监测）；
 *     outbreak detectInfectionOutbreak（dept/cases/threshold 暴发识别）；
 *     report   generateInfectionReport（period 周期院感报告）。
 *
 * 薄壳路由：业务规则全部在 aggregators/infectionDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * 依据：《医院感染管理办法》卫生部令第48号、WS/T 312、WS/T 313、
 *       《医院感染暴发报告及处置管理规范》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepInfectionMgmt,
  detectInfectionOutbreak,
  generateInfectionReport,
  monitorHandHygiene,
  type InfectionEventType,
  type MdroStrain,
  type OutbreakCase,
} from '../aggregators/infectionDeepAggregator';

/** 解析自定义病例串：`type,strain,at;type,strain,at` → OutbreakCase[] */
function parseCases(raw: string | null): OutbreakCase[] {
  if (!raw) return [];
  const out: OutbreakCase[] = [];
  for (const seg of raw.split(';')) {
    const parts = seg.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 0) continue;
    const [type, strain, at] = parts;
    out.push({
      type: (type || 'mdro') as InfectionEventType,
      strain: (strain || 'unknown') as MdroStrain,
      at: at || new Date().toISOString(),
    });
  }
  return out;
}

/** 内置确定性聚集样例（三例 CRE，72h 窗内，用于暴发识别演示） */
const DEMO_CASES: OutbreakCase[] = [
  { type: 'mdro', strain: 'CRE', at: new Date(Date.now() - 1 * 3600 * 1000).toISOString() },
  { type: 'mdro', strain: 'CRE', at: new Date(Date.now() - 8 * 3600 * 1000).toISOString() },
  { type: 'mdro', strain: 'CRE', at: new Date(Date.now() - 20 * 3600 * 1000).toISOString() },
];

export const infectionDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/infection/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const system = buildDeepInfectionMgmt();

        const dept = (c.query.get('dept') ?? '全院').trim() || '全院';
        const period = (c.query.get('period') ?? new Date().toISOString().slice(0, 7)).trim();

        // 1) 手卫生监测
        const observedRaw = c.query.get('observed');
        const compliantRaw = c.query.get('compliant');
        const hand = observedRaw && compliantRaw
          ? monitorHandHygiene(dept, period, {
              observed: Number(observedRaw) || 0,
              compliant: Number(compliantRaw) || 0,
            })
          : monitorHandHygiene(dept, period);

        // 2) 暴发识别（自定义 cases 优先，否则内置三例 CRE 样例）
        const threshold = Number(c.query.get('threshold') ?? '3') || 3;
        const customCases = parseCases(c.query.get('cases'));
        const outbreak = detectInfectionOutbreak(dept, customCases.length > 0 ? customCases : DEMO_CASES, threshold);

        // 3) 周期院感报告
        const report = generateInfectionReport(period);

        return json(ok({
          system,
          hand,
          outbreak,
          report,
          generatedAt: new Date().toISOString(),
        }, '深度院感管理已加载（手卫生/聚集预警/同源性/四类国家指标，WS/T 312·313 口径）'));
      } catch (err) {
        console.error(`[infectionDeep] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '院感管理计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
