/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘 API（M90-A + M93-B）
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 表为空时 BFF 会返回演示序列（demo:true），前端据此展示“演示数据”提示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

/** 某一自然日的合格率 */
export interface TrendPoint {
  date: string;
  total: number;
  passed: number;
  passRate: number;
}

/** 评级分布计数（甲/乙/丙） */
export interface GradeDistribution {
  甲级: number;
  乙级: number;
  丙级: number;
}

/** 短板维度 */
export interface WeaknessDimension {
  dimension: string;
  label: string;
  count: number;
}

export interface ModuleTrend {
  key: 'inpatient' | 'terminal';
  label: string;
  trend: TrendPoint[];
}

export interface EmrLevel5Dashboard {
  demo: boolean;
  rangeDays: number;
  trend: TrendPoint[];
  modules: [ModuleTrend, ModuleTrend];
  gradeDistribution: GradeDistribution;
  weaknesses: WeaknessDimension[];
}

/** 拉取电子病历五级评审自评仪表盘 */
export function getEmrLevel5Dashboard(): Promise<EmrLevel5Dashboard> {
  return get<EmrLevel5Dashboard>('/emr-level5/dashboard');
}
