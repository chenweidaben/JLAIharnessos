/**
 * 健澜科技 jlmedaios - 医学知识智能问答路由（M126-C，AI 能力升级）
 *
 * POST /api/v1/assistant/knowledge/ask
 *   body: {
 *     question: string;
 *     deptCode?: string;
 *     context?: {
 *       ageGroup?: 'adult' | 'pediatric' | 'geriatric';
 *       symptoms?: string[];
 *       deptCode?: string;
 *     };
 *   }
 *   resp: { question, answer, sources, confidence, intent, matched }
 *
 * 在院内医学知识种子库中做意图识别 + 关键词加权检索，输出可读答案与可溯源来源。
 *
 * 医疗安全（依据宪法第七章）：本端点只读；答案为院内权威指南摘要的辅助参考，
 * 不改变医嘱、不强制改派诊疗方案；仅要求登录态（auth），不单独设权限码。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  askMedicalKnowledge,
  type MedicalKnowledgeContext,
  type MedicalKnowledgeResult,
} from '../aggregators/medicalKnowledgeAggregator';

/** 问答请求体 */
interface AskKnowledgeBody {
  question?: string;
  deptCode?: string;
  context?: MedicalKnowledgeContext;
}

/** 问答响应信封 */
export interface AskKnowledgeResponse extends MedicalKnowledgeResult {
  /** 原始问句 */
  question: string;
}

export const assistantKnowledgeRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/knowledge/ask',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      let body: AskKnowledgeBody;
      try {
        body = await c.body<AskKnowledgeBody>();
      } catch {
        return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON', c.traceId), 400);
      }

      const question = (body?.question ?? '').trim();
      if (!question) {
        return json(fail(ErrorCode.BAD_REQUEST, 'question 不能为空', c.traceId), 400);
      }

      try {
        // AI 能力升级：纯函数问答，不触库、不调外部 LLM
        const result = askMedicalKnowledge(question, body?.deptCode, body?.context);
        const payload: AskKnowledgeResponse = { question, ...result };
        return json(ok(payload, 'ok', c.traceId));
      } catch (e) {
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            e instanceof Error ? e.message : '医学知识问答失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
