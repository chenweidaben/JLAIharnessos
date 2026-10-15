/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评 API（M99-A）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';

/** 单条评审条款完成情况 */
export interface DimensionItem {
  achieved: boolean;
}

/** 单维度评分结果 */
export interface DimensionScore {
  dimension: string;
  label: string;
  score: number;
  maxScore: number;
  /** 完成率 0-1 */
  ratio: number;
  achievedCount: number;
  totalCount: number;
  suggestions: string[];
}

/** 一次完整自评视图 */
export interface Grade5Assessment {
  demo: boolean;
  assessedAt: string | null;
  totalScore: number;
  maxTotal: number;
  dimensions: DimensionScore[];
}

/** 提交自评时的单维度输入 */
export interface Grade5DimensionInput {
  dimension: string;
  items: DimensionItem[];
}

/** 拉取八维度最新自评结果 */
export function getGrade5Assessment(): Promise<Grade5Assessment> {
  return get<Grade5Assessment>('/emr/grade5');
}

/** 发起一次八维度闭环自评（写入后回读最新视图） */
export function submitGrade5Assessment(
  dimensions: Grade5DimensionInput[],
): Promise<Grade5Assessment> {
  return post<Grade5Assessment>('/emr/grade5', { dimensions });
}
