/**
 * 健澜科技 jlmedaios - 管理员 MUSE 专属路由（M116-C）
 *
 * 依据宪法第七章 7.6（管理员 MUSE）：
 *   GET /api/v1/muse/admin —— 返回当前登录管理员的个人决策经验页数据：
 *     总决策数 + 平均量化改善 + 决策 ROI 排行 + 管理经验时间线。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 本端点仅 admin 角色可访问（院长 / 职能科室主任）；
 *  - 普通员工访问 → 403 FORBIDDEN；
 *  - staffId 缺省即当前登录管理员本人；admin 可传 ?staffId=xxx
 *    查看他人决策经验（用于院长带教 / 管理复盘抽检）。
 *
 * 医疗安全：本端点纯只读，不触发任何决策写入；返回数据均为脱敏管理决策
 *   摘要与量化指标，不含患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildAdminMuse,
  type AdminDecision,
  type AdminDecisionOutcome,
} from '../aggregators/adminMuseAggregator';

/** 无 DB 演示模式：返回样例决策经验，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限解析（纯函数，便于单测「角色差异」）                               */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
export interface MuseAdminUser {
  id: string;
  roles: string[];
}

/**
 * resolveMuseAdminTarget：解析本次要查看的管理员工号，并校验角色。
 *
 * 规则：
 *  - 用户角色不含 admin → forbidden（路由层转 403）；
 *  - 未传 staffId → 看自己（staffId = c.user.id）；
 *  - 传了 staffId → 看他人（admin 带教 / 复盘抽检）。
 */
export function resolveMuseAdminTarget(
  user: MuseAdminUser,
  queryStaffId: string | null | undefined,
): { staffId: string } | { forbidden: string } {
  if (!user.roles.includes('admin')) {
    return { forbidden: '权限不足：仅管理员可访问 MUSE 决策经验页' };
  }
  const requested = (queryStaffId ?? '').trim();
  if (!requested) return { staffId: user.id };
  return { staffId: requested };
}

/* ------------------------------------------------------------------ */
/* 数据塑形                                                             */
/* ------------------------------------------------------------------ */

/** 一行 admin_decision_memory 的宽松读取 */
interface AdminRow {
  id: unknown;
  admin_id: unknown;
  decision_type: unknown;
  context: unknown;
  action: unknown;
  result_metric: unknown;
  outcome: unknown;
  created_at: unknown;
}

/** 结局归一为三态 */
function normalizeOutcome(v: unknown): AdminDecisionOutcome {
  if (v === 'success' || v === 'failure' || v === 'mixed') return v;
  return 'mixed';
}

/** 从 DB 拉取某管理员的决策经验流水，塑形为纯函数入参 */
async function buildView(
  staffId: string,
): Promise<ReturnType<typeof buildAdminMuse>> {
  const db = getDb();
  const rows = (await db`
    SELECT id, admin_id, decision_type, context, action, result_metric, outcome, created_at
    FROM medmuse.admin_decision_memory
    WHERE admin_id = ${staffId}
    ORDER BY created_at DESC
    LIMIT 200
  `) as AdminRow[];

  const decisions: AdminDecision[] = rows.map((r) => ({
    id: typeof r.id === 'string' ? r.id : String(r.id ?? ''),
    adminId: typeof r.admin_id === 'string' ? r.admin_id : staffId,
    decisionType: typeof r.decision_type === 'string' ? r.decision_type : '',
    context: typeof r.context === 'string' ? r.context : '',
    action: typeof r.action === 'string' ? r.action : '',
    resultMetric:
      typeof r.result_metric === 'number' && Number.isFinite(r.result_metric)
        ? r.result_metric
        : null,
    outcome: normalizeOutcome(r.outcome),
    createdAt:
      typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
  }));

  // 本期无独立效果评估表，outcomes 传空；纯函数自动回落到决策自带 result_metric
  return buildAdminMuse(staffId, decisions, []);
}

/** 演示模式样例：一名院长近半年的管理决策经验 */
function demoView(
  staffId: string,
): ReturnType<typeof buildAdminMuse> {
  const today = new Date();
  const at = (offsetDays: number, hh = 10): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10) + `T${pad2(hh)}:00:00.000Z`;
  };
  const decisions: AdminDecision[] = [
    { id: 'd1', adminId: staffId, decisionType: '流程再造', context: '门诊高峰拥堵', action: '推行分时段预约 + 诊间结算', resultMetric: 18.5, outcome: 'success', createdAt: at(3, 9) },
    { id: 'd2', adminId: staffId, decisionType: '预算分配', context: 'ICU 床位紧张', action: '将预算向重症监护倾斜扩容 6 床', resultMetric: 12.0, outcome: 'success', createdAt: at(12, 14) },
    { id: 'd3', adminId: staffId, decisionType: '人事调度', context: '夜班护士离职率偏高', action: '调整夜班补贴与弹性排班方案', resultMetric: 8.2, outcome: 'mixed', createdAt: at(25, 11) },
    { id: 'd4', adminId: staffId, decisionType: '设备采购', context: '检验科报告周期长', action: '采购全自动流水线生化设备', resultMetric: -5.0, outcome: 'failure', createdAt: at(45, 16), },
    { id: 'd5', adminId: staffId, decisionType: '绩效方案', context: '平均住院日偏高', action: '将 DRG 效率指标纳入科室绩效系数', resultMetric: 9.6, outcome: 'success', createdAt: at(80, 10) },
  ];
  // d4 的 result_metric=-5（恶化），failure 下 ROI 取反 = +5；演示「失败决策也有复盘价值」
  return buildAdminMuse(staffId, decisions, []);
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museAdminRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/admin',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：仅 admin 可访问；admin 可传 staffId 看他人
      const resolved = resolveMuseAdminTarget(c.user!, c.query.get('staffId'));
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }

      try {
        if (isDemo) {
          const view = demoView(resolved.staffId);
          return json(ok({ demo: true, staffId: resolved.staffId, ...view }));
        }
        const view = await buildView(resolved.staffId);
        return json(ok({ demo: false, staffId: resolved.staffId, ...view }));
      } catch (err) {
        console.error(`[museAdmin] GET /admin [${c.traceId}] staff=${resolved.staffId}`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '管理员 MUSE 加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
