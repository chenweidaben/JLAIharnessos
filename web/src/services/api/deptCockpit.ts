/**
 * 健澜科技 jlmedaios - 科主任 agent 驾驶舱 API
 *
 * 直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * 本服务不提供本地假数据；demo:true 由 BFF 在内聚合失败时返回并由页面标注。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface DeptKpis {
  bedTurnoverRate: number | null;
  avgLod: number | null;
  avgCost: number | null;
  gradeARate: number | null;
}

export type DeptSeverity = 'error' | 'warning' | 'info';

export interface DeptWarning {
  id: string;
  item: string;
  severity: DeptSeverity;
  suggestion: string;
}

export interface DeptCockpitData {
  deptName: string;
  date: string;
  demo: boolean;
  kpis: DeptKpis;
  warnings: DeptWarning[];
}

/** 拉取科主任驾驶舱当日数据（GET，无参数） */
export function getDeptCockpit(): Promise<DeptCockpitData> {
  return get<DeptCockpitData>('/dept/cockpit');
}
