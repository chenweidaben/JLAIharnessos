/**
 * 健澜科技 jlmedaios - Admin MUSE 管理智能体 V2 纯函数（M186-A）
 *
 * 多角色管理看板：院长/科主任/护士长 + 自动决策建议。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type AdminRoleV2 = 'dean' | 'dept_head' | 'head_nurse';

export interface DeanViewV2 {
  outpatientVisits: number;
  inpatientCount: number;
  surgeries: number;
  drgBalance: number;
  recordQualificationRate: number;
  patientSatisfaction: number;
}

export interface DeptHeadViewV2 {
  bedOccupancyRate: number;
  averageLOS: number;
  drgWeight: number;
  drugRatio: number;
  supplyRatio: number;
}

export interface HeadNurseViewV2 {
  pressureUlcerRate: number;
  fallRate: number;
  catheterDisplacementRate: number;
  nursingSatisfaction: number;
}

export interface DecisionSuggestionV2 {
  priority: 'low' | 'medium' | 'high';
  category: string;
  message: string;
}

export interface AdminMUSEV2Result {
  role: AdminRoleV2;
  dept: string;
  date: string;
  dean?: DeanViewV2;
  deptHead?: DeptHeadViewV2;
  headNurse?: HeadNurseViewV2;
  suggestions: DecisionSuggestionV2[];
}

/**
 * 构建 Admin MUSE V2 管理智能体数据。
 *
 * @param role 角色
 * @param dept 科室
 * @param date 日期
 * @returns 多角色管理看板
 */
export function buildAdminMUSE(role: AdminRoleV2, dept: string, date: string): AdminMUSEV2Result {
  const suggestions: DecisionSuggestionV2[] = [];

  const dean: DeanViewV2 = {
    outpatientVisits: 3200,
    inpatientCount: 850,
    surgeries: 120,
    drgBalance: 280,
    recordQualificationRate: 0.94,
    patientSatisfaction: 0.92,
  };

  const deptHead: DeptHeadViewV2 = {
    bedOccupancyRate: 0.88,
    averageLOS: 8.5,
    drgWeight: 1.2,
    drugRatio: 0.32,
    supplyRatio: 0.18,
  };

  const headNurse: HeadNurseViewV2 = {
    pressureUlcerRate: 0.012,
    fallRate: 0.008,
    catheterDisplacementRate: 0.005,
    nursingSatisfaction: 0.95,
  };

  if (dean.recordQualificationRate < 0.95) {
    suggestions.push({
      priority: 'medium',
      category: '病历质量',
      message: `病历合格率 ${(dean.recordQualificationRate * 100).toFixed(1)}%，低于 95% 目标，建议加强病历质控培训`,
    });
  }
  if (deptHead.bedOccupancyRate > 0.9) {
    suggestions.push({
      priority: 'high',
      category: '床位管理',
      message: `床位使用率 ${(deptHead.bedOccupancyRate * 100).toFixed(0)}%，接近饱和，建议加快出院流程`,
    });
  }
  if (deptHead.drugRatio > 0.3) {
    suggestions.push({
      priority: 'medium',
      category: '药占比',
      message: `药占比 ${(deptHead.drugRatio * 100).toFixed(1)}%，偏高，建议强化处方点评`,
    });
  }
  if (headNurse.pressureUlcerRate > 0.01) {
    suggestions.push({
      priority: 'low',
      category: '护理质量',
      message: `压疮发生率 ${(headNurse.pressureUlcerRate * 100).toFixed(1)}%，建议加强翻身落实`,
    });
  }
  if (suggestions.length === 0) {
    suggestions.push({ priority: 'low', category: '综合', message: '各项指标正常，保持当前管理节奏' });
  }

  return {
    role,
    dept,
    date,
    dean: role === 'dean' ? dean : undefined,
    deptHead: role === 'dept_head' ? deptHead : undefined,
    headNurse: role === 'head_nurse' ? headNurse : undefined,
    suggestions,
  };
}
