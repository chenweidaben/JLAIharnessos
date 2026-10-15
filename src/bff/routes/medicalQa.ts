/**
 * 健澜科技 jlmedaios - AI 知识问答 BFF 路由（M154-D）「AI深化与运营预测」
 *
 * POST /api/v1/ai/ask   医学知识问答（纯函数计算，即时返回，必带 citation）；
 * GET  /api/v1/ai/knowledge/search  按关键词检索内置知识词典（供前端联想/校验）。
 *
 * 鉴权 + 统一错误信封；回答由纯函数产出，不落敏感明文，不臆造医学结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  answerMedicalQuestion,
  searchMedicalKnowledge,
  type AnswerResult,
  type KnowledgeEntry,
} from '../aggregators/medicalQaAggregator.js';

/** POST /api/v1/ai/ask 请求体 */
interface AskBody {
  question?: string;
  /** 可选上下文：科室/主诉等，纯透传，不参与匹配 */
  context?: Record<string, unknown> | null;
}

function badRequest(message: string): Response {
  return json(fail(ErrorCode.BAD_REQUEST, message), 400);
}

export const medicalQaRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/ask',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      let body: AskBody;
      try {
        body = await c.body<AskBody>();
      } catch {
        return badRequest('请求体不是合法 JSON');
      }
      if (!body || typeof body !== 'object') return badRequest('请求体为空');

      const question = typeof body.question === 'string' ? body.question : '';
      if (!question.trim()) return badRequest('question 不能为空');
      if (question.length > 500) return badRequest('question 过长（应 ≤500 字）');

      const result: AnswerResult = answerMedicalQuestion(question, body.context ?? null);
      return json(ok({ result }));
    },
  },
  {
    method: 'GET',
    path: '/api/v1/ai/knowledge/search',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      const q = c.query.get('q') ?? '';
      const topK = Number(c.query.get('topK') ?? '5');
      const entries: KnowledgeEntry[] = searchMedicalKnowledge(q, Number.isFinite(topK) ? topK : 5);
      return json(ok({ query: q, count: entries.length, entries }));
    },
  },
];
