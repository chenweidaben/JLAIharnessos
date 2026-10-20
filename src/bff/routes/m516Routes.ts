/**
 * 健澜科技 jlmedaios - M516 P0 合规重点（电子病历五级·单病种深度）：单病种质控深度 3 端点
 *
 * 字段契约（严格对齐前端 web/src/services/api/diseaseDeepBoard.ts）：
 *   ProcessRow:      { id, disease: 'STEMI'|'stroke'|'pneumonia'|'hipFracture'|'cesarean', completionRate: number(%), dept }
 *   OutcomeRow:      { id, disease: string, mortalityRate: number(%), readmissionRate: number(%), avgLosDays: number }
 *   ComplicationRow: { id, disease: string, type: 'bleeding'|'infection'|'thrombosis'|'poorHealing', rate: number(%) }
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/disease/process - 单病种过程质控 5 条（结构化枚举/数字） */
async function handleDiseaseProcess(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DP-001', disease: 'STEMI', completionRate: 92.0, dept: '心血管内科' },
    { id: 'DP-002', disease: 'stroke', completionRate: 78.0, dept: '神经内科' },
    { id: 'DP-003', disease: 'pneumonia', completionRate: 95.0, dept: '呼吸内科' },
    { id: 'DP-004', disease: 'hipFracture', completionRate: 82.0, dept: '骨科' },
    { id: 'DP-005', disease: 'cesarean', completionRate: 96.0, dept: '妇产科' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/disease/outcome - 单病种结局指标 5 条（纯数字，前端可排序/计算） */
async function handleDiseaseOutcome(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DO-001', disease: '急性心梗', mortalityRate: 0.8, readmissionRate: 3.2, avgLosDays: 7.5 },
    { id: 'DO-002', disease: '脑卒中', mortalityRate: 3.5, readmissionRate: 5.8, avgLosDays: 12.0 },
    { id: 'DO-003', disease: '社区获得性肺炎', mortalityRate: 2.8, readmissionRate: 4.5, avgLosDays: 9.5 },
    { id: 'DO-004', disease: '老年髋部骨折', mortalityRate: 3.2, readmissionRate: 6.5, avgLosDays: 14.5 },
    { id: 'DO-005', disease: '剖宫产', mortalityRate: 0.1, readmissionRate: 1.2, avgLosDays: 5.0 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/disease/complications - 并发症监控 5 条（结构化枚举/数字） */
async function handleDiseaseComplications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DC-001', disease: '急性心梗', type: 'bleeding', rate: 1.5 },
    { id: 'DC-002', disease: '脑卒中', type: 'infection', rate: 3.8 },
    { id: 'DC-003', disease: '老年髋部骨折', type: 'thrombosis', rate: 2.5 },
    { id: 'DC-004', disease: '剖宫产', type: 'poorHealing', rate: 1.2 },
    { id: 'DC-005', disease: '社区获得性肺炎', type: 'infection', rate: 2.2 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m516Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/disease/process', handle: handleDiseaseProcess, auth: true },
  { method: 'GET', path: '/api/v1/disease/outcome', handle: handleDiseaseOutcome, auth: true },
  { method: 'GET', path: '/api/v1/disease/complications', handle: handleDiseaseComplications, auth: true },
];
