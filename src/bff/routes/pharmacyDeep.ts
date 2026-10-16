/**
 * 健澜科技 jlmedaios — 【质量提升与新场景】医院智能药房深化路由（M173-C）
 *
 *   GET /api/v1/pharmacy/smart?drugId=&period=7&seasonality=none&leadTime=7
 *                            &ae=1&drugName=&age=65&gender=female&pregnant=0
 *                            &renal=0&allergies=青霉素&symptoms=皮疹,瘙痒
 *
 *   一次返回智能药房深化体系：
 *     system      buildSmartPharmacy（四大能力域 + 差错下降目标，总在返回）；
 *     demand      predictDrugDemand（带 drugId 才返回，药品需求预测）；
 *     inventory   optimizeDrugInventory（带 drugId 才返回，库存优化建议）；
 *     adverse     detectDrugAdverseEvent（带 ae=1 与 drugName 才返回，不良反应预警）。
 *
 * 薄壳路由：业务规则全部在 aggregators/pharmacyDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * drugId 缺省则只返回体系总览；其余参数缺省则对应模块不返回。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildSmartPharmacy,
  detectDrugAdverseEvent,
  optimizeDrugInventory,
  predictDrugDemand,
  type Seasonality,
} from '../aggregators/pharmacyDeepAggregator';

/** 允许的季节情景 */
const SEASONALITIES: ReadonlySet<string> = new Set([
  'none', 'winter_respiratory', 'summer_gastro', 'flu_peak', 'year_round',
]);

/** 逗号分隔字符串 → 去空数组 */
function splitCsv(raw: string | null): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

export const pharmacyDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/smart',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        // 1) 智能药房体系（总在返回）
        const system = buildSmartPharmacy();

        // 2) 需求预测 + 库存优化（带 drugId 才跑）
        const drugId = (c.query.get('drugId') ?? '').trim();
        let demand = null;
        let inventory = null;
        if (drugId) {
          const period = Number(c.query.get('period') ?? '7') || 7;
          const seasonalityRaw = (c.query.get('seasonality') ?? 'none').trim();
          const seasonality = (SEASONALITIES.has(seasonalityRaw)
            ? seasonalityRaw
            : 'none') as Seasonality;
          demand = predictDrugDemand(drugId, period, seasonality);
          const leadTime = Number(c.query.get('leadTime') ?? '7') || 7;
          inventory = optimizeDrugInventory(drugId, demand.forecastDaily, leadTime);
        }

        // 3) 不良反应预警（带 ae=1 且 drugName 才跑）
        let adverse = null;
        if (c.query.get('ae') === '1') {
          const drugName = (c.query.get('drugName') ?? '').trim();
          if (!drugName) {
            return json(fail(ErrorCode.BAD_REQUEST, 'ae=1 时 drugName 不能为空', c.traceId), 400);
          }
          adverse = detectDrugAdverseEvent(
            {
              drugName,
              drugClass: splitCsv(c.query.get('drugClass')),
              doseMg: Number(c.query.get('doseMg') ?? '0') || 0,
            },
            {
              age: Number(c.query.get('age') ?? '0') || 0,
              gender: (c.query.get('gender') ?? '').trim() || 'unknown',
              pregnant: c.query.get('pregnant') === '1',
              renalImpairment: c.query.get('renal') === '1',
              allergies: splitCsv(c.query.get('allergies')),
              weightKg: c.query.get('weightKg') ? Number(c.query.get('weightKg')) : undefined,
            },
            splitCsv(c.query.get('symptoms')),
          );
        }

        return json(ok({
          system,
          demand,
          inventory,
          adverse,
          generatedAt: new Date().toISOString(),
        }, '智能药房体系已加载（摆药/审方/库存/用药，真减差错）'));
      } catch (err) {
        console.error(`[pharmacyDeep] GET /smart [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '智能药房计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
