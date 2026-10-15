/**
 * 健澜科技 jlmedaios - 医学知识图谱路由（M131-D + M147-A 知识图谱与患者教育）
 *
 * GET /api/v1/medical/graph/query?node=xxx&relation=xxx
 *   - node      ：起点中文名（必填，可模糊，如「胸痛」「高血压」）
 *   - relation  ：可选关系类型过滤（disease_has_symptom 等，见聚合器词典）
 *   - end       ：可选终点中文名；提供时返回两节点间有向推理路径
 *   - search    ：可选节点查询关键词；提供时模式切换为「节点检索」，
 *                 返回匹配节点列表（不分发边），供前端搜索框下拉补全。
 *
 * M147-A 新增：
 * GET /api/v1/graph/disease/:id
 *   - :id 疾病节点 id（如 D-HTN）或中文名；返回按 qualifier 分桶的疾病全景图
 *          （常见/鉴别症状、一线/二线用药、必做/选做检查、首诊/转诊科室）。
 * GET /api/v1/graph/differential?symptoms=胸痛,胸闷
 *   - 主诉症状反推鉴别诊断 TopN（带置信度、首诊科室、必做检查）。
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
  queryDiseaseGraph,
  findDifferentialDiagnosis,
  type GraphNode,
  type GraphResult,
  type DiseaseGraph,
  type Diagnosis,
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

  // 【M147-A 知识图谱与患者教育】GET /api/v1/graph/disease/:id 疾病全景图
  {
    method: 'GET',
    path: '/api/v1/graph/disease/:id',
    auth: true,
    handle: (c): Response => {
      const id = c.params.id ?? '';
      if (!id.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少路径参数 id（疾病节点 id/中文名）'), 400);
      }
      const result: DiseaseGraph = queryDiseaseGraph(id);
      if (!result.matched) {
        return json(ok(result, '未命中疾病节点，请检查 id 或名称', c.traceId));
      }
      return json(ok(result, 'ok', c.traceId));
    },
  },

  // 【M147-A 知识图谱与患者教育】GET /api/v1/graph/differential?symptoms=a,b
  {
    method: 'GET',
    path: '/api/v1/graph/differential',
    auth: true,
    handle: (c): Response => {
      const raw = c.query.get('symptoms') ?? '';
      if (!raw.trim()) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 query 参数 symptoms（逗号分隔主诉症状）'), 400);
      }
      const symptoms = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const list: Diagnosis[] = findDifferentialDiagnosis(symptoms);
      return json(ok({ items: list, total: list.length }, 'ok', c.traceId));
    },
  },
];
