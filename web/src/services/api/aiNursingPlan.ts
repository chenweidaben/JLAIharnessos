/**
 * 健澜科技 jlmedaios - M90-B AI护理计划推荐 API
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供任何本地假数据；BFF/数据库不可用时由 request 层显式抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { post } from '../request';

export interface NursingPlanItem {
  item: string;
  category: string;
}

export interface AiNursingPlan {
  id: string;
  visitId: string;
  diagnosis: string;
  plan: NursingPlanItem[];
  riskLevel: 'low' | 'medium' | 'high';
  status: 'pending' | 'accepted' | 'rejected';
  operator: string | null;
  createdAt: string;
}

/** 生成护理计划推荐（按诊断关键词规则推荐，落库 pending 记录） */
export function recommendAiNursingPlan(payload: {
  visitId: string;
  diagnosis: string;
}): Promise<AiNursingPlan> {
  return post<AiNursingPlan>('/ai-nursing-plans/recommend', payload);
}

/** 采纳推荐（pending → accepted，落库操作人） */
export function acceptAiNursingPlan(id: string): Promise<AiNursingPlan> {
  return post<AiNursingPlan>(`/ai-nursing-plans/${id}/accept`);
}
