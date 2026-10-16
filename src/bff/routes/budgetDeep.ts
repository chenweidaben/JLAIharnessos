/**
 * 健澜科技 jlmedaios — 【CDSS与运营精细化】医院预算与成本管理深化路由（M165-B）
 *
 *   GET /api/v1/admin/budget?dept=xxx&year=2026
 *     从 medmuse.budget_plan 读科室年度预算明细，从 medmuse.budget_execution 读
 *     逐月实际支出，交由纯函数聚合器（aggregators/budgetDeepAggregator.ts）：
 *       1) trackBudgetExecution  — 截至本月执行率 / 进度偏差 / 状态；
 *       2) predictBudgetOverrun  — 月均运行率年化外推，预测年末超支与风险档。
 *     未编制预算的科室返回 hasPlan=false，不伪造数字。
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回空集；某行无支出记录按 0 计。
 * 医疗安全红线：预算仅为运营管理辅助，不触发诊疗行为。
 * 权限码：finance:view（财务处 / admin 只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  predictBudgetOverrun,
  trackBudgetExecution,
  type BudgetCategory,
  type ExecutionLine,
} from '../aggregators/budgetDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface PlanRow {
  dept_code: string;
  dept_name: string;
  category: string;
  sub_item: string;
  annual_budget: string | number;
}

interface ExecRow {
  category: string;
  sub_item: string;
  period_month: number;
  actual_spent: string | number;
}

const SUB_NAME: Record<string, string> = {
  salary: '工资', performance: '绩效', social_security: '社保公积金', training: '培训',
  west_medicine: '西药', patent_drug: '中成药', consumable: '耗材',
  purchase: '设备采购', depreciation: '设备折旧', maintenance: '设备维护',
  utility: '水电', office: '办公', travel: '差旅', meeting: '会议',
};

export const budgetDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/budget',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'finance:view');
      if (denied) return denied;

      const dept = c.query.get('dept')?.trim() ?? '';
      const year = Math.floor(Number(c.query.get('year') ?? new Date().getFullYear()));
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 dept 参数', c.traceId), 400);
      }
      if (!Number.isFinite(year) || year < 2000 || year > 2100) {
        return json(fail(ErrorCode.BAD_REQUEST, 'year 参数非法', c.traceId), 400);
      }

      if (isDemo) {
        return json(ok({
          dept, year, demo: true, hasPlan: false,
          message: '演示模式：未连接 PostgreSQL，不返回预算数据',
        }));
      }

      try {
        const db = getDb();
        const planRows = (await db`
          SELECT dept_code, dept_name, category, sub_item, annual_budget
          FROM medmuse.budget_plan
          WHERE dept_code = ${dept} AND fiscal_year = ${year}
          ORDER BY category, sub_item
        `) as PlanRow[];

        if (!planRows || planRows.length === 0) {
          return json(ok({
            dept, year, demo: false, hasPlan: false,
            message: '该科室本年度尚未编制预算，可基于驱动因子测算后落库',
          }));
        }

        const execRows = (await db`
          SELECT category, sub_item, period_month, actual_spent
          FROM medmuse.budget_execution
          WHERE dept_code = ${dept} AND fiscal_year = ${year}
        `) as ExecRow[];

        // 组装纯函数输入：按 (category, sub) 聚合预算与逐月支出
        const map = new Map<string, ExecutionLine>();
        for (const r of planRows) {
          const key = `${r.category}|${r.sub_item}`;
          map.set(key, {
            category: r.category as BudgetCategory,
            sub: r.sub_item,
            subName: SUB_NAME[r.sub_item] ?? r.sub_item,
            annualBudget: Number(r.annual_budget),
            spentByMonth: new Array(12).fill(0),
          });
        }
        for (const r of execRows) {
          const key = `${r.category}|${r.sub_item}`;
          const line = map.get(key);
          if (line && r.period_month >= 1 && r.period_month <= 12) {
            line.spentByMonth[r.period_month - 1] += Number(r.actual_spent);
          }
        }

        const lines = Array.from(map.values());
        const deptName = planRows[0].dept_name || dept;
        // 截止到当前月（预算年=当前年用本月，否则 12 月）
        const now = new Date();
        const upToMonth = year === now.getFullYear() ? now.getMonth() + 1 : 12;

        const execution = trackBudgetExecution(
          { deptCode: dept, deptName, year, lines },
          { upToMonth },
        );
        const forecast = predictBudgetOverrun({ deptCode: dept, year, lines }, year);

        return json(ok({
          dept, year, demo: false, hasPlan: true,
          deptName,
          execution,
          forecast,
          generatedAt: now.toISOString(),
        }));
      } catch (err) {
        console.error(`[budgetDeep] GET /admin/budget [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '预算数据加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
