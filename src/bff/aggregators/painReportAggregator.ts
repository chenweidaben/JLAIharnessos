/**
 * 健澜科技 jlmedaios - 疼痛管理纯函数（M222-D）
 *
 * buildPainReport / assessPainScore / designAnalgesiaPlan
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估疼痛评分（纯函数）。
 *
 * @param score 疼痛评分
 * @param scale 量表
 * @returns 疼痛等级
 */
export function assessPainScore(score: number, scale: string): { level: string; controlled: boolean } {
  let level = '无痛';
  if (score >= 7) level = '重度';
  else if (score >= 4) level = '中度';
  else if (score >= 1) level = '轻度';
  return { level, controlled: score <= 3 };
}

/**
 * 设计镇痛方案（纯函数）。
 *
 * @param painType 疼痛类型
 * @param severity 严重程度
 * @returns 方案
 */
export function designAnalgesiaPlan(painType: string, severity: number): { ladder: string; method: string } {
  let ladder = '第一阶梯';
  let method = 'NSAIDs';
  if (severity >= 7) {
    ladder = '第三阶梯';
    method = 'PCA阿片类';
  } else if (severity >= 4) {
    ladder = '第二阶梯';
    method = '弱阿片';
  }
  if (painType.includes('神经病理性')) method = '神经阻滞';
  return { ladder, method };
}

/** 疼痛管理报告输出 */
export interface PainReport {
  timeRange: string;
  assessment: { nrs: number; vas: number; fps: number };
  acute: { postoperative: number; trauma: number; labor: number };
  chronic: { lowBack: number; neuropathic: number };
  cancer: { threeLadder: number; pca: number };
  clinic: { visits: number };
  multimodal: { nerveBlock: number; intervention: number };
  nursing: { ward: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建疼痛管理报告。
 *
 * @param timeRange 时间范围
 * @returns 疼痛管理报告
 */
export function buildPainReport(timeRange: string): PainReport {
  return {
    timeRange,
    assessment: { nrs: 1000, vas: 500, fps: 200 },
    acute: { postoperative: 800, trauma: 200, labor: 300 },
    chronic: { lowBack: 400, neuropathic: 150 },
    cancer: { threeLadder: 100, pca: 50 },
    clinic: { visits: 600 },
    multimodal: { nerveBlock: 80, intervention: 30 },
    nursing: { ward: 30 },
    management: { satisfaction: 88 },
    suggestions: ['推广多模式镇痛', '建设无痛病房'],
  };
}
