/**
 * 健澜科技 jlmedaios - 三甲评审准备系统 BFF 路由（M141-A · 质量与安全）
 *
 * GET /api/v1/admin/review/checklist（仅 admin 角色可读）
 *  - 返回七大类别核心条款检查清单（红黄绿三态 + 证据链）+ 差距分析报告；
 *  - 条款目录、状态机、差距统计全部下沉到纯函数
 *    buildReviewChecklist / generateReviewGapReport，本路由只做鉴权与数据装配；
 *  - 当前内置核心条款目录（与 review_criterion 表同源），后续可平滑替换为
 *    PostgreSQL clinical.review_criterion 的实时聚合，函数签名不变。
 *
 * 生产安全：仅 admin 角色（requireRole 内部处理 401/403），只读、无写副作用、
 * 不暴露患者明细；聚合异常返回结构化错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildReviewChecklist,
  generateReviewGapReport,
} from '../aggregators/jciReviewAggregator.js';

/**
 * GET /api/v1/admin/review/checklist
 * 三甲评审准备页：检查清单 + 差距报告（仅 admin）。
 */
async function handleReviewChecklist(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const checklist = buildReviewChecklist();
    const gapReport = generateReviewGapReport(checklist);
    return json(ok({ checklist, gapReport }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '评审检查清单聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const jciReviewRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/review/checklist',
    auth: true,
    handle: handleReviewChecklist,
  },
];
