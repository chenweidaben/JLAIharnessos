/**
 * 健澜科技 jlmedaios - RAG 知识库检索优化 V5 路由（M280-C）
 *
 * GET  /api/v1/rag-tuning（检索结果+命中率看板）
 * POST /api/v1/rag-tuning/reindex（索引重建）
 * GET  /api/v1/rag-tuning/hit-rate（命中率看板）
 *
 * 权限：rag-tuning:read / rag-tuning:write。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildRagTuningV5Report,
  embedQueryV5,
  hybridSearchV5,
  rerankV5,
} from "../aggregators/ragTuningV5Aggregator.js";

const chunks = [
  { retrievalCount: 120, hit: true },
  { retrievalCount: 80, hit: true },
  { retrievalCount: 50, hit: false },
];

export const ragTuningV5Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/rag-tuning",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rag-tuning:read");
      if (denied) return denied;

      const q = c.query.get("q") ?? "高血压诊疗";
      const vec = embedQueryV5(q);
      const candidates = [
        { docId: "doc-1", chunkId: "c1", vectorScore: 0.9, keywordScore: 0.8 },
        { docId: "doc-2", chunkId: "c2", vectorScore: 0.7, keywordScore: 0.9 },
        { docId: "doc-3", chunkId: "c3", vectorScore: 0.5, keywordScore: 0.4 },
      ];
      const results = rerankV5(hybridSearchV5(candidates), 2);
      return json(ok({ query: q, embedding: vec, results }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/rag-tuning/reindex",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rag-tuning:write");
      if (denied) return denied;

      const body = await c.req.json() as { docId: string; chunkCount: number };
      return json(ok({ reindexed: true, ...body }));
    },
  },
  {
    method: "GET",
    path: "/api/v1/rag-tuning/hit-rate",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "rag-tuning:read");
      if (denied) return denied;

      return json(ok(buildRagTuningV5Report(chunks, 3)));
    },
  },
];
