/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院财务管理深化路由（M178-A）
 *
 *   GET /api/v1/finance/deep?year=2026&month=10&dept=internal_medicine
 *
 *   从 clinical.finance_transaction（360-finance-deep.sql 扩展维度）读真实流水，
 *   从 clinical.finance_budget 读年度预算计划数，交由纯函数聚合器
 *   （aggregators/financeDeepAggregator.ts）一次产出四大管理维度：
 *     1) buildDeepFinanceMgmt      — 深度财务管理驾驶舱（总装）
 *     2) calculateDepartmentCost    — 科室成本核算（直接/间接/项目/病种）
 *     3) analyzeRevenueStructure    — 收入结构分析（四类收入占比/药占比预警）
 *     4) predictFinancialTrend      — 财务趋势预测（月度净结余线性外推）
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回 demo=true；扩展列未迁移（老库）时
 *   查询失败静默降级为空口径，不阻断页面主流程（页面显示空状态而非 500）。
 * 财务安全红线：本接口仅为运营管理分析，不触发任何诊疗行为、不暴露患者级 PII。
 * 权限码：finance:view（财务处 / admin 只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepFinanceMgmt,
  type BudgetLine,
  type DeepTxn,
  type MonthlyPoint,
} from '../aggregators/financeDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** finance_transaction 扩展列行（老库可能缺列，故全部可选） */
interface TxnRow {
  type: string;
  category: string;
  amount: string | number;
  dept: string;
  cost_center: string | null;
  period_year: number | null;
  period_month: number | null;
  project_code: string | null;
  disease_code: string | null;
  cost_nature: string | null;
  recorded_at: string;
}

interface BudgetRow {
  cost_center: string;
  fiscal_year: number;
  budget_subject: string;
  annual_amount: string | number;
}

/** recorded_at 兜底解析会计期间（扩展列为空时用入账时间） */
function resolvePeriod(row: TxnRow): { year: number; month: number } {
  if (row.period_year != null && row.period_month != null) {
    return { year: Number(row.period_year), month: Number(row.period_month) };
  }
  const d = new Date(row.recorded_at);
  if (Number.isNaN(d.getTime())) return { year: 1970, month: 1 };
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export const financeDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/finance/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'finance:view');
      if (denied) return denied;

      const now = new Date();
      const year = Math.floor(Number(c.query.get('year') ?? now.getFullYear()));
      const monthRaw = c.query.get('month');
      const month = monthRaw ? Math.floor(Number(monthRaw)) : undefined;
      const dept = c.query.get('dept')?.trim() || undefined;

      if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        return json(fail(ErrorCode.BAD_REQUEST, 'year 参数非法', c.traceId), 400);
      }
      if (month !== undefined && (!Number.isFinite(month) || month < 1 || month > 12)) {
        return json(fail(ErrorCode.BAD_REQUEST, 'month 参数非法（1..12）', c.traceId), 400);
      }

      if (isDemo) {
        return json(ok({
          year, month, demo: true,
          message: '演示模式：未连接 PostgreSQL，返回空财务口径（不伪造数字）',
        }));
      }

      try {
        const db = getDb();
        // 真实流水（扩展维度）；老库缺列时本查询会抛错，由外层 catch 降级
        const txnRows = (await db`
          SELECT type, category, amount, dept,
                 cost_center, period_year, period_month,
                 project_code, disease_code, cost_nature, recorded_at
          FROM clinical.finance_transaction
          WHERE recorded_at >= (${year}-01-01)::date
        `) as TxnRow[];

        const txns: DeepTxn[] = (txnRows ?? []).map((r) => {
          const { year: py, month: pm } = resolvePeriod(r);
          return {
            type: r.type === 'income' ? 'income' : 'expense',
            category: r.category,
            amount: Number(r.amount),
            dept: r.cost_center || r.dept || 'unknown',
            periodYear: py,
            periodMonth: pm,
            projectCode: r.project_code ?? undefined,
            diseaseCode: r.disease_code ?? undefined,
            costNature: r.cost_nature === 'indirect' ? 'indirect' : 'direct',
          };
        });

        // 年度预算计划数；预算表不存在时降级为空
        let budgets: BudgetLine[] = [];
        try {
          const budgetRows = (await db`
            SELECT cost_center, fiscal_year, budget_subject, annual_amount
            FROM clinical.finance_budget
            WHERE fiscal_year = ${year}
          `) as BudgetRow[];
          budgets = (budgetRows ?? []).map((r) => ({
            dept: r.cost_center,
            fiscalYear: Number(r.fiscal_year),
            subject: r.budget_subject,
            annualAmount: Number(r.annual_amount),
          }));
        } catch {
          budgets = []; // 预算表未迁移：预算管理维度按空口径展示
        }

        // 趋势预测月度序列：按年-月聚合近 12 期收支
        const agg = new Map<string, MonthlyPoint>();
        for (const t of txns) {
          const key = `${t.periodYear}-${t.periodMonth}`;
          const p = agg.get(key) ?? { year: t.periodYear, month: t.periodMonth, income: 0, expense: 0 };
          if (t.type === 'income') p.income = Math.round((p.income + t.amount) * 100) / 100;
          else p.expense = Math.round((p.expense + t.amount) * 100) / 100;
          agg.set(key, p);
        }
        const monthlySeries = Array.from(agg.values())
          .sort((a, b) => (a.year - b.year) || (a.month - b.month))
          .slice(-12);

        const result = buildDeepFinanceMgmt({
          period: { year, month },
          txns,
          budgets,
          dept,
          monthlySeries,
        });

        return json(ok({
          type: 'finance_deep',
          demo: false,
          rowCount: txns.length,
          ...result,
        }));
      } catch (err) {
        // 扩展列未迁移（老库）等：降级为空口径，不暴露内部错误细节给前端
        console.error(`[financeDeep] GET /finance/deep [${c.traceId}]`, err);
        return json(ok({
          type: 'finance_deep',
          demo: false,
          degraded: true,
          message: '财务深化维度尚未迁移（360-finance-deep.sql），当前返回空口径',
          year, month,
        }));
      }
    },
  },
];
