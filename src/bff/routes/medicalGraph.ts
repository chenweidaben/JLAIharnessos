/**
 * 健澜科技 jlmedaios - 医学知识图谱路由（M131-D，AI 能力深化）
 *
 * GET /api/v1/medical/graph/query?node=xxx&relation=xxx
 *   - node      ：起点中文名（必填，可模糊，如「胸痛」「高血压」）
 *   - relation  ：可选关系类型过滤（disease_has_symptom 等，见聚合器词典）
 *   - end       ：可选终点中文名；提供时返回两节点间有向推理路径
 *   - search    ：可选节点查询关键词；提供时模式切换为「节点检索」，
 *                 返回匹配节点列表（不分发边），供前端搜索框下拉补全。
 *
 * 本路由纯转发聚合器纯函数，不触库、不调外部 LLM、不碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  asNodeType,
  searchMedicalNodes,
  queryMedicalGraph,
  type GraphNode,
  type GraphResult,
} from '../aggregators/medicalGraphAggregator.js';

/** 节点查询模式返回信封（与力导向图页搜索框对齐） */
interface NodeSearchView {
  items: GraphNode[];
  total: number;
}

export const medicalGraphRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medical/graph/query',
    auth: true,
    handle: (c): Response => {
      const node = c.query.get('node') ?? '';
      const relation = c.query.get('relation');
      const end = c.query.get('end');
      const search = c.query.get('search');

      // 模式一：节点检索（搜索框补全）——必须带 search 关键词
      if (search && search.trim()) {
        const type = c.query.get('type');
        const view: NodeSearchView = {
          items: searchMedicalNodes(search, asNodeType(type ?? null) ?? undefined),
          total: 0,
        };
        view.total = view.items.length;
        return json(ok(view, 'ok', c.traceId));
      }

      // 模式二：关系遍历 + 可选路径推理
      if (!node.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少必填参数 node（起点中文名）'), 400);
      }
      const result: GraphResult = queryMedicalGraph(node, relation, end);
      if (!result.matched) {
        return json(ok(result, '未检索到该医学概念，请检查名称', c.traceId));
      }
      return json(ok(result, 'ok', c.traceId));
    },
  },
];
