/**
 * 健澜科技 jlmedaios - 【集团与科研】科研智能化深化：文献与论文 BFF 路由（M159-C）
 *
 * 中期路线图：
 *  - GET  /api/v1/research/literature/search    文献检索（关键词/作者/期刊 + 年份区间 + topK）
 *  - POST /api/v1/research/literature/summarize 摘要自动总结（年/刊分布 + 主题标签 + gap）
 *  - POST /api/v1/research/paper/outline        IMRaD 论文大纲（Introduction/Methods/Results/Discussion）
 *  - POST /api/v1/research/grant/proposal       国自然/省自然基金申请书框架
 *
 * 路由层只做参数解析与结果装配；所有计算下沉到纯函数聚合器
 * researchLitAggregator，可单测、可复算。本切片不写 SQL、不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  generateGrantProposal,
  generatePaperOutline,
  searchMedicalLiterature,
  summarizeLiterature,
  type LiteratureQuery,
  type YearRange,
} from '../aggregators/researchLitAggregator';

function badRequest(message: string): Response {
  return json(fail(ErrorCode.BAD_REQUEST, message), 400);
}

function parseYearRange(q: URLSearchParams): YearRange {
  const start = Number(q.get('yearStart') ?? NaN);
  const end = Number(q.get('yearEnd') ?? NaN);
  const range: YearRange = {};
  if (!Number.isNaN(start)) range.start = start;
  if (!Number.isNaN(end)) range.end = end;
  return range;
}

export const researchLitRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/research/literature/search',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const query: LiteratureQuery = {};
        const keyword = c.query.get('keyword');
        const author = c.query.get('author');
        const journal = c.query.get('journal');
        if (keyword) query.keyword = keyword;
        if (author) query.author = author;
        if (journal) query.journal = journal;

        const topKRaw = Number(c.query.get('topK') ?? NaN);
        const topK = Number.isNaN(topKRaw) ? undefined : topKRaw;

        const results = searchMedicalLiterature(query, parseYearRange(c.query), topK);
        return json(ok({ query, yearRange: parseYearRange(c.query), total: results.length, results }));
      } catch (err) {
        const message = err instanceof Error ? err.message : '文献检索失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/research/literature/summarize',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const body = (await c.body()) as {
          items?: Array<{ abstract: string; year?: number; journal?: string; keywords?: string[] }>;
        };
        if (!body || !Array.isArray(body.items) || body.items.length === 0) {
          return badRequest('请求体须包含 items 数组（每项含 abstract）');
        }
        const summary = summarizeLiterature(body.items);
        return json(ok(summary));
      } catch (err) {
        const message = err instanceof Error ? err.message : '摘要总结失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/research/paper/outline',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const body = (await c.body()) as { topic?: string; targetJournal?: string };
        if (!body?.topic?.trim()) {
          return badRequest('topic 不能为空');
        }
        const outline = generatePaperOutline(body.topic, body.targetJournal ?? '');
        return json(ok(outline));
      } catch (err) {
        const message = err instanceof Error ? err.message : '论文大纲生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/research/grant/proposal',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'research:read');
      if (denied) return denied;
      try {
        const body = (await c.body()) as { topic?: string; fundingBody?: string };
        if (!body?.topic?.trim()) {
          return badRequest('topic 不能为空');
        }
        const framework = generateGrantProposal(body.topic, body.fundingBody ?? '国自然');
        return json(ok(framework));
      } catch (err) {
        const message = err instanceof Error ? err.message : '基金框架生成失败';
        return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
      }
    },
  },
];
