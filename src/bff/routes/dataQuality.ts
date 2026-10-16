/* ============================================================================
 * 健澜科技 jlmedaios - M159-D 数据质量治理 BFF 路由（中期路线图）
 *
 * GET /api/v1/admin/data-quality/report
 *   - 路由层负责 I/O：从 PostgreSQL 取出目标表样本行 + 被引用表样本行；
 *   - 判定逻辑全部下沉到纯函数 dataQualityAggregator（不连库、可单测）；
 *   - 五维：完整性/准确性/一致性/及时性/唯一性，输出综合评分与问题清单。
 *
 * 权限：data_quality:read（admin）；统一错误信封；查询失败优雅降级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ==========================================================================*/

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import { requirePermissionCode } from '../middleware/auth.js';
import { getDb } from '../../db/pool.js';
import {
  generateDataQualityReport,
  type Row,
  type QualityReport,
} from '../aggregators/dataQualityAggregator.js';

/** 允许巡检的业务表白名单（防 SQL 注入，只认固定表） */
const TARGETS = {
  patients: { schema: 'clinical', table: 'patients', label: '患者主索引' },
  visits: { schema: 'clinical', table: 'visits', label: '就诊主表' },
} as const;

type TargetKey = keyof typeof TARGETS;

const SAMPLE_LIMIT = 200;

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

/** 取一张表的样本行；失败返回空数组（优雅降级，不拖垮整页） */
async function safeSample(schema: string, table: string): Promise<Row[]> {
  try {
    const db = getDb();
    // 表名来自白名单常量拼接，非用户输入；列不做假设，SELECT *
    const rows = await db.unsafe(
      `SELECT * FROM ${schema}.${table} LIMIT ${SAMPLE_LIMIT}`,
    );
    return (rows as Row[]) ?? [];
  } catch {
    return [];
  }
}

/** 组装一张表的质量报告 */
async function buildReport(target: TargetKey, period: string): Promise<QualityReport> {
  const t = TARGETS[target];
  const rows = await safeSample(t.schema, t.table);

  // 一致性：就诊表要关联患者主索引；患者表自引用 id 即可
  let refRows: Row[] = [];
  if (target === 'visits') {
    refRows = await safeSample('clinical', 'patients');
  } else {
    refRows = rows; // 患者表 patient_id 不存在，一致性用自身 id 集合兜底
  }

  return generateDataQualityReport(`${t.schema}.${t.table}`, period, {
    rows,
    refRows,
    pkField: 'id',
    timeField: 'updated_at',
    completenessThreshold: 95,
  });
}

export const dataQualityRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/data-quality/report',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'data_quality:read');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

      const rawTable = (c.query.get('table') ?? 'patients') as TargetKey;
      const target: TargetKey = rawTable in TARGETS ? rawTable : 'patients';
      const period = c.query.get('period') ?? 'today';

      try {
        const report = await buildReport(target, period);
        return json(ok(report));
      } catch (err) {
        const message = err instanceof Error ? err.message : '数据质量报告生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
      }
    },
  },
];
