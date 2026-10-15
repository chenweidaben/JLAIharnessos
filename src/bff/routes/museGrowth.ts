/**
 * 健澜科技 jlmedaios - M119-A 医生成长档案路由
 *
 * GET /api/v1/muse/growth/:staffId —— 返回一名医生的成长档案：
 *   月度成长折线（monthlyGrowth）+ 成功率趋势（successTrend）+
 *   教训闭环（lessonImprovement）+ 专长标签（expertiseTags）+
 *   成长里程碑（milestones）+ 四维能力雷达（radar）。
 *
 * 依据宪法第七章（个人数据归属 / 全角色 Personal Agent）：
 *  - 只读端点，不触发任何决策写入或自动处置动作；
 *  - 返回数据均为岗位级聚合与脱敏标签统计，不含患者姓名 / 身份证号等直标身份；
 *  - staffId 取自路径参数；DEMO_MODE=1 时走进程内样例数据，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import {
  buildDoctorGrowthProfile,
  computeRadarScores,
  type GrowthDecision,
} from '../aggregators/doctorGrowthAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式：返回样例成长档案，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** staff_decision_memory 一行的宽松读取 */
interface DecisionRow {
  decision: unknown;
  outcome: unknown;
  created_at: unknown;
  lesson: unknown;
  context: unknown;
}

/**
 * 从 DB 拉取该医生的历史决策记忆，塑形为纯函数入参 GrowthDecision[]。
 * context jsonb 里的 specialty / tag 已在录入侧脱敏，这里只取结构化字段。
 */
async function loadDecisions(staffId: string): Promise<GrowthDecision[]> {
  const db = getDb();
  const rows = (await db`
    SELECT decision, outcome, created_at, lesson, context
    FROM medmuse.staff_decision_memory
    WHERE staff_id = ${staffId}
    ORDER BY created_at ASC
    LIMIT 500
  `) as DecisionRow[];

  return rows.map((r) => {
    const ctx = (r.context ?? {}) as Record<string, unknown>;
    return {
      at: typeof r.created_at === 'string' ? r.created_at : '',
      outcome: r.outcome,
      specialty: typeof ctx.specialty === 'string' ? ctx.specialty : '',
      tag:
        typeof ctx.experienceTag === 'string'
          ? ctx.experienceTag
          : Array.isArray(ctx.tags)
            ? String((ctx.tags as unknown[])[0] ?? '')
            : '',
      lesson: typeof r.lesson === 'string' ? r.lesson : '',
    } satisfies GrowthDecision;
  });
}

/** 演示样例：一名医生近半年逐步成长、教训闭环 */
function demoDecisions(): GrowthDecision[] {
  const today = Date.UTC(2026, 9, 1); // 2026-10-01 UTC 基准
  const at = (daysAgo: number): string => new Date(today - daysAgo * 86400_000).toISOString();
  return [
    { at: at(178), outcome: 'failure', tag: '抗凝出血风险', lesson: '桥接窗口过晚，出血未提前干预' },
    { at: at(160), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(150), outcome: 'success', tag: '胸痛分诊' },
    { at: at(140), outcome: 'failure', tag: '抗生素升级', lesson: '术后发热经验性升梯，后证实为导管相关感染' },
    { at: at(120), outcome: 'success', tag: '抗生素升级' },
    { at: at(110), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(95), outcome: 'mixed', tag: '医患沟通告知' },
    { at: at(80), outcome: 'success', tag: '路径管理' },
    { at: at(70), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(60), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(50), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(40), outcome: 'success', tag: '医保病组成本管控' },
    { at: at(30), outcome: 'success', tag: '医患沟通告知' },
    { at: at(20), outcome: 'success', tag: '路径管理' },
    { at: at(10), outcome: 'success', tag: '抗凝出血风险' },
    { at: at(3), outcome: 'success', tag: '医保病组成本管控' },
  ];
}

export const museGrowthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/growth/:staffId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      const staffId = (c.params.staffId ?? '').trim();
      if (!staffId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少员工工号 staffId', c.traceId), 400);
      }

      // 可选时间范围：?start=YYYY-MM-DD&end=YYYY-MM-DD
      const timeRange = {
        start: c.query.get('start'),
        end: c.query.get('end'),
      };

      try {
        const decisions: GrowthDecision[] = isDemo ? demoDecisions() : await loadDecisions(staffId);
        const profile = buildDoctorGrowthProfile(staffId, timeRange, decisions);
        const radar = computeRadarScores(profile);
        return json(
          ok(
            {
              demo: isDemo,
              staffId,
              ...profile,
              radar,
            },
            '医生成长档案已加载',
            c.traceId,
          ),
        );
      } catch (err) {
        console.error(`[museGrowth] GET /growth/:staffId [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '医生成长档案加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
