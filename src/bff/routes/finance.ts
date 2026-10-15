/**
 * 健澜科技 jlmedaios - 医院财务管理路由（M139-D · 医院运营管理）
 *
 * 【医院运营管理】财务报表清晰，院长一眼看懂钱花在哪了。
 *   GET  /api/v1/admin/finance/report?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 *       按账期出财务报表（收入合计 / 支出合计 / 净额 / 分类汇总 / 科室分摊）；
 *       不传账期时默认本月 1 日 ~ 今日。
 *   POST /api/v1/admin/finance/transaction
 *       登记一笔收支流水：{ type, category, amount, dept, description }。
 *
 * 鉴权：未登录 401 / admin 放行 / 其余需显式权限码
 *   finance:view（看报表）、finance:record（登记流水），否则 403。
 *
 * 生产安全：纯聚合结果，不暴露患者级 PII；入参非法一律 400 结构化错误信封，
 *   不抛 500；落库 best-effort，断库不阻断报表主流程。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requirePermissionCode } from '../middleware/auth';
import { ErrorCode, fail, json, ok, type Ctx, type RouteDef } from '../types';
import {
  buildFinanceReport,
  persistTransaction,
  recordTransaction,
  type FinanceType,
} from '../aggregators/financeAggregator';

/** 登记流水请求体 */
interface RecordBody {
  type?: FinanceType;
  category?: string;
  amount?: number;
  dept?: string;
  description?: string;
}

/** 本月 1 日 ~ 今日（YYYY-MM-DD），作为未指定账期时的默认口径 */
function defaultRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  return { startDate: iso(start), endDate: iso(now) };
}

export const financeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/finance/report',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'finance:view');
      if (denied) return denied;

      const { startDate: defStart, endDate: defEnd } = defaultRange();
      const startDate = c.query.get('startDate') || defStart;
      const endDate = c.query.get('endDate') || defEnd;

      try {
        const report = buildFinanceReport(startDate, endDate);
        return json(ok({ type: 'finance_report', report }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '财务报表生成失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/admin/finance/transaction',
    auth: true,
    handle: async (c: Ctx) => {
      const denied = requirePermissionCode(c, 'finance:record');
      if (denied) return denied;

      let body: RecordBody;
      try {
        body = await c.body<RecordBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
      }

      try {
        const txn = recordTransaction(
          body.type ?? ('income' as FinanceType),
          body.category ?? '',
          typeof body.amount === 'number' ? body.amount : Number(body.amount),
          body.dept ?? '',
          body.description ?? '',
        );
        // best-effort 落库持久化流水（断库降级，不阻断登记）
        await persistTransaction(txn);
        return json(ok({ transaction: txn }, '登记成功'));
      } catch (err) {
        const message = err instanceof Error ? err.message : '收支流水登记失败';
        return json(fail(ErrorCode.BAD_REQUEST, message, c.traceId), 400);
      }
    },
  },
];
