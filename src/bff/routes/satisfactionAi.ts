/**
 * 健澜科技 jlmedaios - 患者满意度智能化分析 BFF 路由（M153-D）
 *
 * 【临床决策支持】GET /api/v1/admin/satisfaction/ai-report
 *   - 仅 admin；
 *   - 拉取近 90 天带评论的满意度问卷，调用纯函数聚合器做：
 *       ① 情感倾向判定（正/中/负占比）
 *       ② 关键问题抽取（等待/态度/费用/环境/沟通/流程/预约/疗效）
 *       ③ 低分维度改进计划（按优先级排序）
 *   - 不触写库；分析结果只读返回，前端呈现深海蓝 VI 报告页。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { type Ctx, json, ok, type RouteDef } from '../types';
import { requireRole } from '../middleware/auth';
import {
  analyzeSatisfactionFeedback,
  extractKeyIssues,
  generateImprovementPlan,
  type ImprovementPlan,
  type KeyIssue,
  type LowScoreDept,
  type SentimentResult,
} from '../aggregators/satisfactionAiAggregator';

/** 近 N 天窗口 */
const WINDOW_DAYS = 90;

interface SurveyRow {
  source_type: string;
  overall_score: number;
  comment: string | null;
}

/** 路由层聚合视图 */
export interface AiReportView {
  periodDays: number;
  totalSurveys: number;
  /** 参评评论数（comment 非空） */
  totalComments: number;
  sentiment: SentimentResult;
  issues: KeyIssue[];
  plan: ImprovementPlan[];
  /** 低分维度（overall_score ≤ 3）按来源分组，供前端下钻 */
  lowScoreDepts: LowScoreDept[];
}

async function loadRecentSurveys(): Promise<SurveyRow[]> {
  try {
    const rows = await getDb()`
      SELECT source_type::text AS source_type,
             overall_score     AS overall_score,
             comment           AS comment
        FROM clinical.satisfaction_surveys
       WHERE submitted_at >= now() - (${WINDOW_DAYS} || ' days')::interval
         AND comment IS NOT NULL
         AND btrim(comment) <> ''
       ORDER BY submitted_at DESC
       LIMIT 2000
    `;
    return (rows as unknown[]).map((r) => r as SurveyRow);
  } catch {
    // 库不可达或表未迁移时，降级为空集，前端展示「暂无数据」
    return [];
  }
}

export const satisfactionAiRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/satisfaction/ai-report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const rows = await loadRecentSurveys();
      const comments = rows.map((r) => r.comment ?? '').filter(Boolean);

      const sentiment = analyzeSatisfactionFeedback(comments);
      const issues = extractKeyIssues(comments);

      // 按 source_type 聚合低分（≤3）维度
      const deptMap = new Map<string, { sum: number; count: number; lowCount: number }>();
      for (const r of rows) {
        const key = r.source_type || 'unknown';
        const bucket = deptMap.get(key) ?? { sum: 0, count: 0, lowCount: 0 };
        bucket.sum += Number(r.overall_score) || 0;
        bucket.count += 1;
        if (Number(r.overall_score) <= 3) bucket.lowCount += 1;
        deptMap.set(key, bucket);
      }
      const lowScoreDepts: LowScoreDept[] = [];
      for (const [dept, b] of deptMap.entries()) {
        if (b.count === 0) continue;
        const avg = b.sum / b.count;
        // 仅把均分 < 4 或有低分样本的维度纳入改进计划
        if (avg < 4 || b.lowCount > 0) {
          lowScoreDepts.push({ dept, avgScore: avg, issueCount: b.lowCount });
        }
      }
      const plan = generateImprovementPlan(lowScoreDepts);

      const view: AiReportView = {
        periodDays: WINDOW_DAYS,
        totalSurveys: rows.length,
        totalComments: comments.length,
        sentiment,
        issues,
        plan,
        lowScoreDepts,
      };
      return json(ok(view, 'ok'));
    },
  },
];
