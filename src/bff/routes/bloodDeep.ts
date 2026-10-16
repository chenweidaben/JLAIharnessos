/**
 * 健澜科技 jlmedaios — 【临床核心深化】医院输血管理深化路由（M176-D）
 *
 *   GET /api/v1/blood/deep
 *        ?patientId=P-1001&hb=58&plt=90&sbp=88&hr=118&weightKg=60
 *        &scenario=hemorrhage&lossMl=1500&activeBleeding=1&cardiac=0
 *        &reactionSymptoms=腰痛,寒战,血压骤降
 *        &preHb=58&postHb=78&units=2&component=rbc
 *
 *   一次返回输血管理深化体系：
 *     system   buildDeepBloodMgmt（四维度零差错管控体系，总在返回）；
 *     indication assessTransfusionIndication（带 patientId 与化验才返回，输血适应症评估）；
 *     reaction trackTransfusionReaction（带 reactionSymptoms 才返回，输血反应监测）；
 *     effect   evaluateTransfusionEffect（带 preHb/postHb 才返回，输血疗效评价）。
 *
 * 薄壳路由：业务规则全部在 aggregators/bloodDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库；不触碰 WebSocket；不新增依赖。
 * 参数缺省则只返回体系总览；其余模块按需返回。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  assessTransfusionIndication,
  buildDeepBloodMgmt,
  evaluateTransfusionEffect,
  trackTransfusionReaction,
  type BloodComponent,
  type TransfusionCondition,
} from '../aggregators/bloodDeepAggregator';

/** 允许的临床情境 */
const SCENARIOS: ReadonlySet<string> = new Set([
  'hemorrhage', 'surgery', 'anemia', 'thrombocytopenia', 'coagulopathy',
]);

/** 逗号分隔字符串 → 去空数组 */
function splitCsv(raw: string | null): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** 取数值 query，缺省/非法返回 fallback */
function num(c: Ctx, key: string, fallback: number): number {
  const v = Number(c.query.get(key) ?? '');
  return Number.isFinite(v) ? v : fallback;
}

export const bloodDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/blood/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        // 1) 深度输血管理体系（总在返回）
        const system = buildDeepBloodMgmt();

        // 2) 输血适应症评估（带 patientId + hb 才跑）
        let indication = null;
        const patientId = (c.query.get('patientId') ?? '').trim();
        if (patientId) {
          const hb = num(c, 'hb', 0);
          if (hb <= 0) {
            return json(fail(ErrorCode.BAD_REQUEST, '带 patientId 时 hb 必须为正数', c.traceId), 400);
          }
          const scenarioRaw = (c.query.get('scenario') ?? 'anemia').trim();
          const condition: TransfusionCondition = {
            scenario: (SCENARIOS.has(scenarioRaw) ? scenarioRaw : 'anemia') as TransfusionCondition['scenario'],
            estimatedBloodLossMl: num(c, 'lossMl', 0),
            activeBleeding: c.query.get('activeBleeding') === '1',
            cardiacComorbidity: c.query.get('cardiac') === '1',
          };
          indication = assessTransfusionIndication(
            {
              patientId,
              hb,
              plt: num(c, 'plt', 150),
              inr: c.query.get('inr') ? num(c, 'inr', 1.0) : undefined,
              apttSec: c.query.get('aptt') ? num(c, 'aptt', 35) : undefined,
              fibrinogen: c.query.get('fib') ? num(c, 'fib', 2.5) : undefined,
              sbp: num(c, 'sbp', 120),
              hr: num(c, 'hr', 75),
              weightKg: num(c, 'weightKg', 55),
              flags: splitCsv(c.query.get('flags')),
            },
            condition,
          );
        }

        // 3) 输血反应监测（带 reactionSymptoms 才跑）
        let reaction = null;
        const symptoms = splitCsv(c.query.get('reactionSymptoms'));
        if (symptoms.length > 0) {
          const tid = (c.query.get('transfusionId') ?? 'T-DEMO').trim();
          reaction = trackTransfusionReaction(tid, symptoms);
        }

        // 4) 输血疗效评价（带 preHb/postHb 才跑）
        let effect = null;
        if (c.query.get('preHb') && c.query.get('postHb')) {
          const tid = (c.query.get('transfusionId') ?? 'T-DEMO').trim();
          effect = evaluateTransfusionEffect(tid, {
            preHb: num(c, 'preHb', 0),
            postHb: num(c, 'postHb', 0),
            prePlt: c.query.get('prePlt') ? num(c, 'prePlt', 0) : undefined,
            postPlt: c.query.get('postPlt') ? num(c, 'postPlt', 0) : undefined,
            component: ((c.query.get('component') ?? 'rbc') as BloodComponent),
            units: num(c, 'units', 1),
            weightKg: num(c, 'weightKg', 55),
          });
        }

        return json(ok({
          system,
          indication,
          reaction,
          effect,
          generatedAt: new Date().toISOString(),
        }, '输血管理深化已加载（适应症/前评估/过程/后评价，零差错人命关天）'));
      } catch (err) {
        console.error(`[bloodDeep] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '输血深化计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
