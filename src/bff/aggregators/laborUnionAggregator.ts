/**
 * 健澜科技 jlmedaios - 工会管理纯函数（M194-C）
 *
 * buildLaborUnionReport / calculateEmployeeWelfare / assessEmployeeSatisfaction
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 福利数据 */
export interface WelfareData {
  festivalAllowance: number;
  birthdayAllowance: number;
  healthCheck: number;
  insurance: number;
}

/**
 * 职工福利计算（纯函数）。
 *
 * @param data 福利数据
 * @returns 人均福利总额
 */
export function calculateEmployeeWelfare(data: WelfareData): number {
  return data.festivalAllowance + data.birthdayAllowance + data.healthCheck + data.insurance;
}

/** 满意度调查数据 */
export interface SurveyData {
  responseRate: number;
  satisfactionScore: number;
}

/**
 * 职工满意度评估（纯函数）。
 *
 * @param data 调查数据
 * @returns 等级
 */
export function assessEmployeeSatisfaction(data: SurveyData): 'excellent' | 'good' | 'fair' | 'poor' {
  if (data.satisfactionScore >= 90) return 'excellent';
  if (data.satisfactionScore >= 80) return 'good';
  if (data.satisfactionScore >= 70) return 'fair';
  return 'poor';
}

/** 工会报告输出 */
export interface LaborUnionReport {
  dept: string;
  timeRange: string;
  organization: { union: number; committee: number; members: number };
  workersCongress: { meetings: number; proposals: number; resolved: number };
  welfare: { perCapita: number; festival: number; birthday: number; healthCheck: number };
  assistance: { assisted: number; amount: number };
  activities: { count: number; participants: number };
  women: { activities: number };
  eap: { sessions: number; participants: number };
  funds: { income: number; expense: number; balance: number };
  suggestions: string[];
}

/**
 * 构建工会报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 工会报告
 */
export function buildLaborUnionReport(dept: string, timeRange: string): LaborUnionReport {
  const wData: WelfareData = { festivalAllowance: 2000, birthdayAllowance: 500, healthCheck: 800, insurance: 1000 };
  const perCapita = calculateEmployeeWelfare(wData);

  return {
    dept,
    timeRange,
    organization: { union: 1, committee: 15, members: 1200 },
    workersCongress: { meetings: 2, proposals: 35, resolved: 32 },
    welfare: { perCapita, festival: wData.festivalAllowance, birthday: wData.birthdayAllowance, healthCheck: wData.healthCheck },
    assistance: { assisted: 12, amount: 60000 },
    activities: { count: 8, participants: 600 },
    women: { activities: 3 },
    eap: { sessions: 4, participants: 100 },
    funds: { income: 500000, expense: 400000, balance: 100000 },
    suggestions: ['丰富职工文体活动', '加大困难职工帮扶力度'],
  };
}
