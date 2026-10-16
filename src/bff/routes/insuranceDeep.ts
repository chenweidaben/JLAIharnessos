/**
 * 健澜科技 jlmedaios - 【护理院感医保药事】医院医保管理深化 BFF 路由（M179-C）
 *
 *   GET /api/v1/insurance/deep?period=2026-09
 *     读取医保结算/申报数据（clinical.insurance_settlement），交由纯函数聚合器
 *     （aggregators/insuranceDeepAggregator.ts）完成：
 *       1) buildDeepInsuranceMgmt   —— 政策目录/费用审核/结算/拒付四维总装
 *       2) auditInsuranceClaim      —— 单费用单审核（事前/事中/事后三道防线）
 *       3) predictRejectionRisk      —— 拒付风险预测（可解释因子加权）
 *       4) generateInsuranceReport   —— 按期医保管理报告
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置演示样例并显式标注 demo=true；
 * 表不存在或无数据时返回 hasData=false，不虚构数字。
 * 权限码：insurance:deep:view（医保办/admin 只读）。
 * 医疗安全红线：审核结论为建议级，由医保办人工确认，不自动改医嘱/结算，严禁骗保。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepInsuranceMgmt,
  generateInsuranceReport,
  predictRejectionRisk,
  type InsuranceClaim,
  type RejectionCase,
} from '../aggregators/insuranceDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * 演示样例：覆盖甲类全额/乙类先行自付/丙类目录外/缺事前审批/重复收费/拒付案件。
 * 仅 DEMO_MODE 使用，便于前端直接演示。
 */
function demoClaims(): InsuranceClaim[] {
  return [
    // 合规单：甲类为主
    {
      claimId: 'c-demo-001', visitId: 'v-001', dept: '呼吸内科', type: 'inpatient',
      hasPriorAuth: true, losDays: 7,
      items: [
        { code: 'D-A001', name: '阿司匹林肠溶片', amount: 60 },
        { code: 'T-A001', name: '血常规检查', amount: 30 },
        { code: 'F-A001', name: '普通病房床位费', amount: 350 },
      ],
    },
    // 乙类+缺事前审批：高风险
    {
      claimId: 'c-demo-002', visitId: 'v-002', dept: '肿瘤科', type: 'inpatient',
      hasPriorAuth: false, losDays: 10,
      items: [
        { code: 'D-B002', name: '靶向抗肿瘤药（限制适应症）', amount: 12000 },
        { code: 'T-B001', name: 'CT 平扫', amount: 300 },
      ],
    },
    // 重复收费 + 目录外：中风险
    {
      claimId: 'c-demo-003', visitId: 'v-003', dept: '门诊', type: 'outpatient',
      hasPriorAuth: true,
      items: [
        { code: 'D-B001', name: '注射用头孢克肟', amount: 120, repeated: true },
        { code: 'T-C001', name: '特需门诊服务', amount: 200 },
      ],
    },
  ];
}

function demoRejections(): RejectionCase[] {
  return [
    { caseId: 'r-001', claimId: 'c-demo-002', reason: '高值药品无适应症佐证/缺事前审批', amount: 3000, stage: 'appeal', appealed: true, recovered: false },
    { caseId: 'r-002', claimId: 'c-demo-003', reason: '重复计费', amount: 120, stage: 'recovered', appealed: false, recovered: true },
  ];
}

interface SettlementRow {
  claim_id: string;
  visit_id: string | null;
  dept: string | null;
  settlement_type: string | null;
  prior_auth: boolean;
  los_days: number | null;
  items: unknown;
}

export const insuranceDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/insurance/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'insurance:deep:view');
      if (denied) return denied;

      const period = c.query.get('period')?.trim() ?? '';
      const periodKey = period || new Date().toISOString().slice(0, 7);

      // DEMO 模式：内置样例
      if (isDemo) {
        const claims = demoClaims();
        const rejections = demoRejections();
        return json(ok({
          demo: true,
          hasData: true,
          message: '演示模式：使用内置样例数据，未连接 PostgreSQL',
          mgmt: buildDeepInsuranceMgmt({ claims, rejections }),
          risks: claims.map((cl) => predictRejectionRisk(cl)),
          report: generateInsuranceReport(periodKey, { claims, rejections }),
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        const rows = (await db`
          SELECT claim_id, visit_id, dept, settlement_type, prior_auth, los_days, items
          FROM clinical.insurance_settlement
          WHERE (${period}::text IS NULL OR period_key = ${period})
          ORDER BY created_at DESC
          LIMIT 500
        `) as SettlementRow[];

        if (!rows || rows.length === 0) {
          return json(ok({
            period: periodKey, demo: false, hasData: false,
            message: '本期暂无医保结算数据，结算落库后再分析',
          }));
        }

        const claims: InsuranceClaim[] = rows.map((r) => ({
          claimId: r.claim_id,
          visitId: r.visit_id ?? '',
          dept: r.dept ?? '',
          type: (r.settlement_type as InsuranceClaim['type']) ?? 'outpatient',
          hasPriorAuth: r.prior_auth,
          losDays: Number(r.los_days ?? 0),
          items: (Array.isArray(r.items) ? r.items : []) as InsuranceClaim['items'],
        }));

        // 拒付案件（表缺失时安全降级为空数组）
        let rejections: RejectionCase[] = [];
        try {
          const rejRows = (await db`
            SELECT case_id, claim_id, reason, amount, stage, appealed, recovered
            FROM clinical.insurance_rejection
            WHERE (${period}::text IS NULL OR period_key = ${period})
            LIMIT 500
          `) as Array<Omit<RejectionCase, 'note'>>;
          rejections = (rejRows ?? []).map((r) => ({ ...r }));
        } catch {
          rejections = [];
        }

        return json(ok({
          demo: false,
          hasData: true,
          mgmt: buildDeepInsuranceMgmt({ claims, rejections }),
          risks: claims.map((cl) => predictRejectionRisk(cl)),
          report: generateInsuranceReport(periodKey, { claims, rejections }),
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[insuranceDeep] GET /insurance/deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '医保管理深化加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
