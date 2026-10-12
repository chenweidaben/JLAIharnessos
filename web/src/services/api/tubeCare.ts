/**
 * 健澜科技 jlmedaios - 管路护理前端 API（M17-C）
 *
 * 路径相对（不带 /api/v1 前缀）；不提供本地假数据。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type {
  AssessTubeReq, ExtubationMetrics, InsertTubeReq, RemoveTubeReq, Tube,
} from '@/types/tubeCare';

const base = '/tube-care';

export function listTubes(params: { visitId?: string; status?: string } = {}): Promise<Tube[]> {
  return get(`${base}`, params);
}

export function insertTube(body: InsertTubeReq): Promise<Tube> {
  return post(`${base}/insert`, body);
}

export function assessTube(tubeId: string, body: AssessTubeReq): Promise<unknown> {
  return post(`${base}/${tubeId}/assess`, body);
}

export function removeTube(tubeId: string, body: RemoveTubeReq): Promise<Tube> {
  return post(`${base}/${tubeId}/remove`, body);
}

export function getExtubationMetrics(): Promise<ExtubationMetrics> {
  return get(`${base}/metrics`);
}
