/**
 * 健澜科技 jlmedaios — 【临床核心深化】医院抗菌药物管理深化路由（M176-B）
 *
 *   GET /api/v1/pharmacy/antibiotic/deep
 *                       ?drug=美罗培南          （带 drug 返回分级结果）
 *                       &ddds=1                （返回内置确定性样例 DDDs/AUD 推演）
 *                       &rx=1                  （合理性自检，见下方参数）
 *                       &drug2=头孢曲松&indication=1&doseMg=2000&recommendedDoseMg=2000
 *                       &durationDays=7&purpose=therapeutic&specialApproved=0
 *                       &incisionClass=I&timingMin=45&periDurationH=24
 *                       &age=65&pregnant=0&renal=1&allergies=青霉素
 *                       &therapeutic=1&cultureSent=0
 *
 *   一次返回深度抗菌药物管理体系：
 *     system      buildDeepAntibioticMgmt（六大维度，总在返回）；
 *     classification classifyAntibioticLevel（带 drug 才返回，分级结果）；
 *     ddds        calculateAntibioticDDDs（ddds=1 返回内置样例的 DDDs/AUD 推演）；
 *     rationality evaluateAntibioticRationality（rx=1 且 drug2 才返回，合理性评价）。
 *
 * 薄壳路由：业务规则全部在 aggregators/antibioticDeepAggregator.ts 纯函数层。
 * 不写 SQL、不触库、不新增表；不触碰 WebSocket；不新增依赖。
 * 抗菌药物管理口径：国卫办医发〔2015〕42号《抗菌药物临床应用指导原则（2015年版）》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildDeepAntibioticMgmt,
  calculateAntibioticDDDs,
  classifyAntibioticLevel,
  evaluateAntibioticRationality,
  type AbxPrescriptionDose,
  type AbxPurpose,
  type IncisionClass,
} from '../aggregators/antibioticDeepAggregator';

/** 逗号分隔字符串 → 去空数组 */
function splitCsv(raw: string | null): string[] {
  return (raw ?? '').split(',').map((s) => s.trim()).filter(Boolean);
}

/** 内置确定性样例处方（DDDs/AUD 演示推演，纯函数可复算） */
const DEMO_PRESCRIPTIONS: AbxPrescriptionDose[] = [
  { drugName: '阿莫西林胶囊', totalAmountG: 30, ddd: 1, purpose: 'therapeutic', patientDays: 200 },
  { drugName: '头孢曲松钠', totalAmountG: 20, ddd: 2, purpose: 'therapeutic' },
  { drugName: '美罗培南', totalAmountG: 6, ddd: 2, purpose: 'therapeutic' },
  { drugName: '左氧氟沙星注射液', totalAmountG: 5, ddd: 0.5, purpose: 'prophylactic' },
];

export const antibioticDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/pharmacy/antibiotic/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        // 1) 深度抗菌药物管理体系（总在返回）
        const system = buildDeepAntibioticMgmt();

        // 2) 药品分级（带 drug 才跑）
        let classification = null;
        const drug = (c.query.get('drug') ?? '').trim();
        if (drug) {
          classification = classifyAntibioticLevel(drug);
        }

        // 3) DDDs / AUD 推演（ddds=1 返回内置确定性样例）
        let ddds = null;
        if (c.query.get('ddds') === '1') {
          ddds = calculateAntibioticDDDs(DEMO_PRESCRIPTIONS);
        }

        // 4) 合理性评价自检（rx=1 且 drug2 才跑）
        let rationality = null;
        if (c.query.get('rx') === '1') {
          const drug2 = (c.query.get('drug2') ?? '').trim();
          if (!drug2) {
            return json(fail(ErrorCode.BAD_REQUEST, 'rx=1 时 drug2 不能为空', c.traceId), 400);
          }
          const purposeRaw = (c.query.get('purpose') ?? 'therapeutic').trim();
          const purpose: AbxPurpose = purposeRaw === 'prophylactic' ? 'prophylactic' : 'therapeutic';
          const incisionRaw = (c.query.get('incisionClass') ?? '').trim();
          rationality = evaluateAntibioticRationality(
            {
              drugName: drug2,
              hasIndication: c.query.get('indication') !== '0',
              dailyDoseMg: Number(c.query.get('doseMg') ?? '0') || 0,
              recommendedDoseMg: Number(c.query.get('recommendedDoseMg') ?? '0') || 0,
              durationDays: Number(c.query.get('durationDays') ?? '0') || 0,
              purpose,
              specialApproved: c.query.get('specialApproved') === '1',
              incisionClass: incisionRaw === 'I' || incisionRaw === 'II' || incisionRaw === 'III'
                ? (incisionRaw as IncisionClass)
                : undefined,
              timingMinutes: c.query.get('timingMin') ? Number(c.query.get('timingMin')) : undefined,
              prophylaxisDurationHours: c.query.get('periDurationH')
                ? Number(c.query.get('periDurationH'))
                : undefined,
            },
            {
              age: Number(c.query.get('age') ?? '0') || 0,
              pregnant: c.query.get('pregnant') === '1',
              renalImpairment: c.query.get('renal') === '1',
              allergies: splitCsv(c.query.get('allergies')),
            },
            {
              therapeutic: c.query.get('therapeutic') !== '0',
              cultureSent: c.query.get('cultureSent') === '1',
              result: (c.query.get('cultureResult') ?? 'none') as 'none' | 'pending' | 'positive' | 'negative',
            },
          );
        }

        return json(ok({
          system,
          classification,
          ddds,
          rationality,
          generatedAt: new Date().toISOString(),
        }, '深度抗菌药物管理已加载（分级/使用率/AUD/送检率/合理性，国卫办医发〔2015〕42号口径）'));
      } catch (err) {
        console.error(`[antibioticDeep] GET /deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '抗菌药物管理计算失败', c.traceId),
          500,
        );
      }
    },
  },
];
