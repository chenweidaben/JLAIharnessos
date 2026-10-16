/**
 * 健澜科技 jlmedaios - 教学管理纯函数（M191-B）
 *
 * buildTeachingManagementReport / calculateTeachingScore
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 教学数据 */
export interface TeachingData {
  undergraduateHours: number;
  postgraduateHours: number;
  trainingHours: number;
  evaluationScore: number;
  satisfaction: number;
  teachingAwards: number;
}

/**
 * 教学绩效评分（纯函数）。
 *
 * @param data 教学数据
 * @returns 0-100 分
 */
export function calculateTeachingScore(data: TeachingData): number {
  const score =
    data.undergraduateHours * 0.05 +
    data.postgraduateHours * 0.1 +
    data.trainingHours * 0.05 +
    data.evaluationScore * 0.3 +
    data.satisfaction * 40 +
    data.teachingAwards * 3;
  return Math.min(100, Math.round(score));
}

/** 教学报告输出 */
export interface TeachingManagementReport {
  dept: string;
  timeRange: string;
  tasks: { undergraduate: number; postgraduate: number; training: number; residency: number };
  quality: { evaluationScore: number; satisfaction: number; incidents: number };
  results: { awards: number; reformProjects: number; papers: number };
  faculty: { phdSupervisor: number; masterSupervisor: number; famousTeachers: number };
  bases: { residencyBase: number; specialtyBase: number };
  teachingScore: number;
  suggestions: string[];
}

/**
 * 构建教学管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 教学报告
 */
export function buildTeachingManagementReport(dept: string, timeRange: string): TeachingManagementReport {
  const data: TeachingData = {
    undergraduateHours: 200,
    postgraduateHours: 150,
    trainingHours: 300,
    evaluationScore: 88,
    satisfaction: 0.92,
    teachingAwards: 2,
  };

  const teachingScore = calculateTeachingScore(data);

  const suggestions: string[] = [];
  if (data.satisfaction < 0.9) {
    suggestions.push('教学满意度偏低，建议加强师生沟通');
  }
  if (data.teachingAwards < 3) {
    suggestions.push('教学成果偏少，鼓励申报教改项目');
  }

  return {
    dept,
    timeRange,
    tasks: { undergraduate: 200, postgraduate: 150, training: 300, residency: 250 },
    quality: { evaluationScore: 88, satisfaction: 0.92, incidents: 0 },
    results: { awards: 2, reformProjects: 3, papers: 5 },
    faculty: { phdSupervisor: 2, masterSupervisor: 8, famousTeachers: 1 },
    bases: { residencyBase: 1, specialtyBase: 2 },
    teachingScore,
    suggestions,
  };
}
