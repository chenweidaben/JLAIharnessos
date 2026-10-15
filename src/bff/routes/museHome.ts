/**
 * 健澜科技 jlmedaios - 个人 MUSE 主页路由（M115-A）
 *
 * 依据宪法第七章（全角色 Personal Agent）：
 *   GET /api/v1/muse/home —— 返回当前登录员工的个人 MUSE 主页数据：
 *     个人卡片（头像 / 角色 / 经验年限）+ 四张统计卡（总决策数 / 成功率 /
 *     教训数 / 本周新增）+ 经验时间线 + 近 30 天成长趋势。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 只能看自己：staffId 缺省即当前登录员工 c.user.id；
 *  - admin 可传 ?staffId=xxx 查看他人主页（用于导师带教 / 抽检复盘）；
 *  - 非 admin 传 staffId → 403 FORBIDDEN。
 *
 * 医疗安全：本端点纯只读，不触发任何决策写入；返回数据均为岗位级聚合
 *   与脱敏决策摘要，不含患者直接标识符。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildMuseHomepage,
  type MuseHomeDecision,
  type MuseHomeProfile,
  type MuseHomeStats,
} from '../aggregators/museHomepageAggregator';

/** 无 DB 演示模式：返回样例主页，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限解析（纯函数，便于单测「角色差异」）                               */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
export interface MuseHomeUser {
  id: string;
  roles: string[];
}

/**
 * resolveMuseTargetStaffId：解析本次主页要查看的员工工号。
 *
 * 规则：
 *  - 未传 staffId → 看自己（staffId = c.user.id）；
 *  - 传了 staffId 且用户角色含 admin → 看他人；
 *  - 传了 staffId 且用户非 admin → 返回 forbidden（路由层转 403）。
 */
export function resolveMuseTargetStaffId(
  user: MuseHomeUser,
  queryStaffId: string | null | undefined,
): { staffId: string } | { forbidden: string } {
  const requested = (queryStaffId ?? '').trim();
  if (!requested) return { staffId: user.id };
  if (!user.roles.includes('admin')) {
    return { forbidden: '权限不足：仅 admin 可查看他人 MUSE 主页' };
  }
  return { staffId: requested };
}

/* ------------------------------------------------------------------ */
/* 数据塑形                                                             */
/* ------------------------------------------------------------------ */

/** 一行 staff_muse_profile 的宽松读取 */
interface ProfileRow {
  staff_id: unknown;
  name: unknown;
  role: unknown;
  avatar_url: unknown;
  years_of_experience: unknown;
}

/** 一行 staff_muse_stats 的宽松读取 */
interface StatsRow {
  total_decisions: unknown;
  success_count: unknown;
  lesson_count: unknown;
}

/** 从 DB 拉取画像 + 预聚合统计 + 近 30 天决策记忆，塑形为纯函数入参 */
async function buildView(
  staffId: string,
): Promise<{ profile: MuseHomeProfile; view: ReturnType<typeof buildMuseHomepage> }> {
  const db = getDb();

  // 1) 员工画像（无记录时冷启动兜底）
  const profRows = (await db`
    SELECT staff_id, name, role, avatar_url, years_of_experience
    FROM medmuse.staff_muse_profile
    WHERE staff_id = ${staffId}
    LIMIT 1
  `) as ProfileRow[];
  const p = profRows[0];
  const profile: MuseHomeProfile = p
    ? {
        staffId: String(p.staff_id ?? staffId),
        name: typeof p.name === 'string' && p.name.trim() ? p.name : '未命名员工',
        role:
          p.role === 'doctor' || p.role === 'nurse' || p.role === 'pharma' || p.role === 'admin'
            ? p.role
            : 'doctor',
        avatarUrl: typeof p.avatar_url === 'string' ? p.avatar_url : null,
        yearsOfExperience:
          typeof p.years_of_experience === 'number' ? p.years_of_experience : null,
      }
    : { staffId, name: '未命名员工', role: 'doctor', avatarUrl: null, yearsOfExperience: null };

  // 2) 预聚合统计（无记录时传 null，由纯函数用决策记忆现场兜底）
  const statRows = (await db`
    SELECT total_decisions, success_count, lesson_count
    FROM medmuse.staff_muse_stats
    WHERE staff_id = ${staffId}
    LIMIT 1
  `) as StatsRow[];
  const s = statRows[0];
  const stats: MuseHomeStats = {
    totalDecisions: s ? Number(s.total_decisions ?? 0) : null,
    successCount: s ? Number(s.success_count ?? 0) : null,
    lessonCount: s ? Number(s.lesson_count ?? 0) : null,
  };

  // 3) 最近决策记忆（取近 200 条，覆盖 30 天趋势分桶与时间线）
  const decRows = (await db`
    SELECT decision, outcome, created_at, lesson
    FROM medmuse.staff_decision_memory
    WHERE staff_id = ${staffId}
    ORDER BY created_at DESC
    LIMIT 200
  `) as Array<Record<string, unknown>>;
  const recentDecisions: MuseHomeDecision[] = decRows.map((r) => ({
    decision: typeof r.decision === 'string' ? r.decision : '',
    outcome:
      r.outcome === 'success' || r.outcome === 'failure' || r.outcome === 'mixed'
        ? r.outcome
        : 'mixed',
    createdAt: typeof r.created_at === 'string' ? r.created_at : new Date().toISOString(),
    lesson: typeof r.lesson === 'string' ? r.lesson : null,
  }));

  return { profile, view: buildMuseHomepage(profile, stats, recentDecisions) };
}

/** 演示模式样例：一名医生近 30 天逐步沉淀决策记忆 */
function demoView(
  staffId: string,
  name: string,
): { profile: MuseHomeProfile; view: ReturnType<typeof buildMuseHomepage> } {
  const today = new Date();
  const at = (offsetDays: number, hh = 9): string => {
    const d = new Date(today);
    d.setDate(d.getDate() - offsetDays);
    return d.toISOString().slice(0, 10) + `T${pad2(hh)}:00:00.000Z`;
  };
  const decisions: MuseHomeDecision[] = [
    { decision: '拒绝该 DIP 病组自费方案，改走路径内支付', outcome: 'success', createdAt: at(0, 10) },
    { decision: '抗凝桥接推迟 24h 待复查血栓弹力图', outcome: 'failure', createdAt: at(1, 14), lesson: '桥接窗口过晚，出血事件未提前干预' },
    { decision: '合并用药相互作用实时拦截，转药师复核', outcome: 'success', createdAt: at(2, 11) },
    { decision: '术后发热先排导管相关感染而非经验升级抗生素', outcome: 'mixed', createdAt: at(5, 9) },
    { decision: '早期康复介入提前至术后第 1 天', outcome: 'success', createdAt: at(9, 16) },
    { decision: '营养风险筛查 NRS2002 阳性者优先肠内营养', outcome: 'success', createdAt: at(16, 8) },
    { decision: '急诊胸痛三联检阴性后仍留观 6h 复测', outcome: 'failure', createdAt: at(22, 20), lesson: '漏诊极早期心梗，留观时长与复测节点需写入路径' },
    { decision: '糖尿病足分级评估后转创面中心多学科会诊', outcome: 'success', createdAt: at(28, 15) },
  ];
  const profile: MuseHomeProfile = {
    staffId,
    name,
    role: 'doctor',
    avatarUrl: null,
    yearsOfExperience: 12,
  };
  return { profile, view: buildMuseHomepage(profile, null, decisions) };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museHomeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/home',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：只能看自己；admin 可传 staffId 看他人
      const resolved = resolveMuseTargetStaffId(c.user!, c.query.get('staffId'));
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }

      try {
        if (isDemo) {
          const { profile, view } = demoView(resolved.staffId, c.user!.name);
          return json(ok({ demo: true, profile, ...view }));
        }
        const { profile, view } = await buildView(resolved.staffId);
        return json(ok({ demo: false, profile, ...view }));
      } catch (err) {
        console.error(`[museHome] GET /home [${c.traceId}] staff=${resolved.staffId}`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '个人 MUSE 主页加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
