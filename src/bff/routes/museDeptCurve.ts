/**
 * 健澜科技 jlmedaios - 科室学习曲线路由（M119-B）
 *
 * GET /api/v1/muse/dept-curve/:deptCode：
 *   返回单个科室的学习曲线四件套（月度增长 / 成功率趋势 / 教训降幅 /
 *   最佳实践数），并按 ?compare=DEP-RESP,DEP-SURG 附带多科室对比行，
 *   供前端渲染「科室对比柱状图 + 学习曲线」。
 *
 * 依据宪法第七章「Doctor MUSE」：
 *  - 7.2 科室层：跨员工个人智能体经验按月汇聚，形成组织级学习曲线；
 *  - 7.7 经验记录铁律：失败经验（教训）单独成桶，曲线核心证据是
 *    「成功率爬升 + 教训收敛」双指标共振；
 *  - 7.8 后继者机制：bestPracticeCount 即新员工入职自动加载的科室基线规模。
 *
 * 医疗安全：
 *  - 本端点纯只读，不触发任何决策写入；返回均为岗位级聚合，
 *    不含患者直接标识符，不外露员工姓名；
 *  - DEMO_MODE=1 时走进程内样例数据，不连 PostgreSQL、不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import {
  buildDeptLearningCurve,
  compareDeptCurves,
  type LearningCurveDecision,
} from '../aggregators/deptLearningCurveAggregator.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式：走进程内样例，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** ?compare= 最多追加的对比科室数（防止单次聚合爆炸） */
const MAX_COMPARE = 6;

/* ------------------------------------------------------------------ */
/* DB 装载（宽松塑形，列缺失/异常不炸路由）                             */
/* ------------------------------------------------------------------ */

/** staff_decision_memory 一行的宽松读取（与 museHospital 同口径） */
interface MemoryRow {
  staff_id: unknown;
  name: unknown;
  role: unknown;
  decision: unknown;
  outcome: unknown;
  created_at: unknown;
  lesson: unknown;
}

/** 把 DB 决策记忆行塑形为聚合器入参 */
function toDecision(r: MemoryRow): LearningCurveDecision {
  return {
    staffId: String(r.staff_id ?? ''),
    // 依据宪法第七章 7.2：科室维度待 staff_muse_profile 接入 dept_code 后按科室拆分
    // （当前与 museHospital 同口径，先全院聚合兜底，不炸路由）
    deptCode: '',
    topic: typeof r.decision === 'string' ? r.decision : '',
    success: r.outcome !== 'failure',
    createdAt: typeof r.created_at === 'string' ? r.created_at : '',
  };
}

/** 从 DB 拉取全院决策记忆，装配聚合器入参 */
async function loadDecisions(): Promise<LearningCurveDecision[]> {
  const db = getDb();
  const rows = (await db`
    SELECT m.staff_id, p.name, p.role, m.decision, m.outcome, m.created_at, m.lesson
    FROM medmuse.staff_decision_memory m
    LEFT JOIN medmuse.staff_muse_profile p ON p.staff_id = m.staff_id
    ORDER BY m.created_at DESC
    LIMIT 2000
  `) as MemoryRow[];
  return rows.map(toDecision);
}

/* ------------------------------------------------------------------ */
/* 演示样例：三个科室近 6 个月的典型学习曲线                             */
/* ------------------------------------------------------------------ */

/** 演示科室名表（前端对比柱状图用） */
const DEMO_DEPT_NAMES: Record<string, string> = {
  'DEP-CARD': '心血管内科',
  'DEP-RESP': '呼吸与危重症医学科',
  'DEP-SURG': '普外科',
};

/** 生成锚定当前月的过去第 back 个月的 YYYY-MM-DD T09:00:00Z */
function demoMonth(back: number, day = 10): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, day));
  return d.toISOString();
}

/**
 * 样例造数：三个科室各 6 个月，刻意做出可辨析的学习曲线形状——
 *  - 心内科：平稳爬升型（成功率 0.62→0.90，教训 4→1）；
 *  - 呼吸内科：高基线稳健型（成功率 0.88 平台期，教训维持低位）；
 *  - 普外科：陡峭学习型（成功率 0.50→0.95，教训 6→0，降幅最大）。
 */
function demoDecisions(): LearningCurveDecision[] {
  const rows: LearningCurveDecision[] = [];

  /** 单科室逐月造数：rateSeq 为各月成功率，lessonSeq 为各月教训数 */
  function fabricate(
    deptCode: string,
    topics: string[],
    rateSeq: number[],
    lessonSeq: number[],
  ): void {
    rateSeq.forEach((rate, i) => {
      const createdAt = demoMonth(rateSeq.length - 1 - i);
      const lessons = lessonSeq[i] ?? 0;
      const successes = Math.max(0, Math.round((rate * 10) - lessons));
      for (let s = 0; s < successes; s++) {
        rows.push({
          staffId: `${deptCode}-s${(s % 3) + 1}`,
          deptCode,
          topic: topics[s % topics.length],
          success: true,
          createdAt,
        });
      }
      for (let l = 0; l < lessons; l++) {
        rows.push({
          staffId: `${deptCode}-s${(l % 3) + 1}`,
          deptCode,
          topic: topics[l % topics.length],
          success: false, // 7.7：失败经验单独成桶
          createdAt,
        });
      }
    });
  }

  fabricate(
    'DEP-CARD',
    ['STEMI 急诊再灌注', '抗凝桥接窗口', '心衰容量管理'],
    [0.62, 0.7, 0.76, 0.82, 0.86, 0.9],
    [4, 3, 3, 2, 1, 1],
  );
  fabricate(
    'DEP-RESP',
    ['CAP 经验性抗感染', '跌倒初筛干预', '雾化吸入规范化'],
    [0.88, 0.87, 0.9, 0.89, 0.91, 0.92],
    [1, 2, 1, 1, 1, 0],
  );
  fabricate(
    'DEP-SURG',
    ['术后早期康复', '围术期预防用药', '术后发热鉴别'],
    [0.5, 0.62, 0.74, 0.83, 0.9, 0.95],
    [6, 5, 3, 2, 1, 0],
  );

  return rows;
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museDeptCurveRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/dept-curve/:deptCode',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const deptCode = (c.params.deptCode ?? '').trim();
      if (!deptCode) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少科室编码 deptCode', c.traceId), 400);
      }

      /* ?months= 收敛到 1~24（聚合器内部二次夹取） */
      const monthsRaw = Number(c.query.get('months') ?? '6');
      const months = Number.isFinite(monthsRaw)
        ? Math.min(24, Math.max(1, Math.floor(monthsRaw)))
        : 6;

      /* ?compare=DEP-RESP,DEP-SURG → 追加对比科室（去重、去自身、限量） */
      const compareRaw = (c.query.get('compare') ?? '').trim();
      const compareCodes = compareRaw
        ? [...new Set(compareRaw.split(',').map((s) => s.trim()).filter(Boolean))]
            .filter((d) => d !== deptCode)
            .slice(0, MAX_COMPARE)
        : [];

      try {
        const allData = isDemo ? demoDecisions() : await loadDecisions();

        const curve = buildDeptLearningCurve(
          deptCode,
          { months },
          allData,
        );
        const comparison = compareDeptCurves([deptCode, ...compareCodes], allData, {
          timeRange: { months },
        });

        return json(
          ok(
            {
              demo: isDemo,
              deptCode,
              months,
              curve,
              comparison,
              deptNames: DEMO_DEPT_NAMES,
            },
            '科室学习曲线',
            c.traceId,
          ),
        );
      } catch (err) {
        console.error(`[museDeptCurve] GET /dept-curve/${deptCode} [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '科室学习曲线加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
