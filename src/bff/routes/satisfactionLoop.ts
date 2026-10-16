/**
 * 健澜科技 jlmedaios - 【CDSS与运营精细化】患者满意度与服务改进闭环 BFF 路由（M165-C）
 *
 * GET /api/v1/patient/satisfaction/loop
 *   - 需登录（患者端/运营管理共用只读视图）；
 *   - 拉取近 90 天满意度信号（满意度问卷 + 投诉 + 表扬）与已派单的改进事项，
 *     调用纯函数聚合器 buildSatisfactionLoop 输出四阶段闭环：
 *       收集 → 分析（归类+根因+趋势）→ 改进（措施+责任到人+限期）→ 验证（复查+效果+标准化）；
 *   - 不触写库；闭环结论只读返回，前端呈现深海蓝 VI 闭环页。
 *
 * 设计原则：满意度闭环要真改进，不能只是登记投诉——
 *   每条不满意信号都必须在 improve 阶段落到 owner + dueDays，
 *   verify 阶段未改善的事项标记 needsRework 回炉，不静默归档。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { type Ctx, json, ok, type RouteDef } from '../types';
import {
  buildSatisfactionLoop,
  type ImprovementEffectInput,
  type SatisfactionLoop,
  type SatisfactionSignal,
} from '../aggregators/satisfactionLoopAggregator';

/** 近 N 天窗口 */
const WINDOW_DAYS = 90;

interface SurveyRow {
  source_type: string;
  overall_score: number | null;
  comment: string | null;
  dept_code: string | null;
  submitted_at: string | null;
}

interface ImprovementRow {
  id: string;
  category: string | null;
  before_score: number | null;
  after_score: number | null;
  issue_summary: string | null;
}

/** 数据库不可达或表未迁移时的内置演示信号（标注 demo，保证闭环页可渲染） */
const DEMO_SIGNALS: SatisfactionSignal[] = [
  { source: 'satisfaction', score: 2, comment: '排队太久了，等了快两个小时', dept: 'outpatient', date: '2026-09-20' },
  { source: 'satisfaction', score: 2, comment: '候诊时间太长，人太多排长队', dept: 'outpatient', date: '2026-09-25' },
  { source: 'complaint', comment: '医生态度差，不耐烦，问两句就敷衍', dept: 'outpatient', date: '2026-09-28' },
  { source: 'complaint', comment: '费用不透明，药费贵，收费高', dept: 'pharmacy', date: '2026-10-02' },
  { source: 'satisfaction', score: 3, comment: '跑了好几个窗口，手续多，来回跑', dept: 'outpatient', date: '2026-10-05' },
  { source: 'satisfaction', score: 5, comment: '护士很耐心，解释清楚，非常满意', dept: 'nursing', date: '2026-10-06' },
  { source: 'praise', comment: '医生专业负责，感谢', dept: 'internal', date: '2026-10-08' },
  { source: 'complaint', comment: '卫生间有异味，等候区太吵', dept: 'outpatient', date: '2026-10-10' },
  { source: 'satisfaction', score: 4, comment: '整体不错，就是排队久了点', dept: 'outpatient', date: '2026-10-12' },
  { source: 'satisfaction', score: 5, comment: '服务周到，满意', dept: 'registration', date: '2026-10-13' },
  { source: 'complaint', comment: '排队太久，等很久，号也难挂', dept: 'outpatient', date: '2026-10-14' },
  { source: 'satisfaction', score: 4, comment: '满意，谢谢', dept: 'outpatient', date: '2026-10-15' },
];

/** 演示阶段已改进事项的前后对照（验证阶段演示） */
const DEMO_IMPROVEMENTS: ImprovementEffectInput[] = [
  { improvementId: 'imp-demo-1', category: 'wait_time', beforeScore: 2.1, afterScore: 3.8, followUpComments: ['比以前快了不少'] },
  { improvementId: 'imp-demo-2', category: 'staff_attitude', beforeScore: 2.3, afterScore: 4.6, followUpComments: ['医生耐心多了'] },
  { improvementId: 'imp-demo-3', category: 'cost', beforeScore: 3.0, afterScore: 2.6, followUpComments: ['还是觉得贵'] },
];

/** 路由层聚合视图 */
export interface SatisfactionLoopView {
  periodDays: number;
  /** database = 真实库数据；demo = 库不可达时的内置演示数据 */
  dataSource: 'database' | 'demo';
  loop: SatisfactionLoop;
}

/** 把满意度问卷行映射为闭环信号 */
function mapSurveyRow(r: SurveyRow): SatisfactionSignal {
  const sourceType = (r.source_type || 'satisfaction').toLowerCase();
  const source: SatisfactionSignal['source'] =
    sourceType.includes('complaint') ? 'complaint'
    : sourceType.includes('praise') || sourceType.includes('praise') ? 'praise'
    : 'satisfaction';
  return {
    source,
    score: typeof r.overall_score === 'number' ? r.overall_score : undefined,
    comment: r.comment ?? undefined,
    dept: r.dept_code ?? undefined,
    date: (r.submitted_at ?? '').slice(0, 10) || undefined,
  };
}

/** 加载近 90 天满意度信号 */
async function loadSignals(): Promise<SatisfactionSignal[]> {
  try {
    const rows = await getDb()`
      SELECT source_type::text AS source_type,
             overall_score     AS overall_score,
             comment           AS comment,
             dept_code         AS dept_code,
             submitted_at      AS submitted_at
        FROM clinical.satisfaction_surveys
       WHERE submitted_at >= now() - (${WINDOW_DAYS} || ' days')::interval
       ORDER BY submitted_at DESC
       LIMIT 2000
    `;
    return (rows as unknown[]).map((r) => mapSurveyRow(r as SurveyRow));
  } catch {
    // 库不可达或表未迁移：返回空，由上层降级为 demo
    return [];
  }
}

/** 加载已派单改进事项（验证阶段输入） */
async function loadImprovements(): Promise<ImprovementEffectInput[]> {
  try {
    const rows = await getDb()`
      SELECT id            AS id,
             category      AS category,
             before_score  AS before_score,
             after_score   AS after_score,
             issue_summary AS issue_summary
        FROM medmuse.service_improvement
       WHERE status IN ('improving', 'verified', 'closed')
       ORDER BY updated_at DESC
       LIMIT 200
    `;
    return (rows as unknown[]).map((r) => {
      const row = r as ImprovementRow;
      return {
        improvementId: row.id,
        category: (row.category ?? undefined) as ImprovementEffectInput['category'],
        beforeScore: row.before_score ?? undefined,
        afterScore: row.after_score ?? undefined,
      } satisfies ImprovementEffectInput;
    });
  } catch {
    return [];
  }
}

export const satisfactionLoopRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/satisfaction/loop',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const signals = await loadSignals();
      const improvements = await loadImprovements();

      let dataSource: SatisfactionLoopView['dataSource'] = 'database';
      let effectiveSignals = signals;
      let effectiveImprovements = improvements;
      if (signals.length === 0) {
        // 库无数据：用内置演示信号构建闭环，保证患者端闭环页可演示
        dataSource = 'demo';
        effectiveSignals = DEMO_SIGNALS;
        effectiveImprovements = DEMO_IMPROVEMENTS;
      }

      const loop = buildSatisfactionLoop(effectiveSignals, effectiveImprovements);
      const view: SatisfactionLoopView = {
        periodDays: WINDOW_DAYS,
        dataSource,
        loop,
      };
      return json(ok(view, 'ok'));
    },
  },
];
