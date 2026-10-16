/**
 * 健澜科技 jlmedaios - 影像中心 V2 纯函数（M223-B）
 *
 * buildImagingReportV2 / assessImageQuality / structureReport
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估影像质量（纯函数）。
 *
 * @param images 影像数
 * @param criteria 合格数
 * @returns 合格率
 */
export function assessImageQuality(images: number, criteria: number): { rate: number; pass: boolean } {
  const rate = images > 0 ? Math.round((criteria / images) * 100) : 0;
  return { rate, pass: rate >= 95 };
}

/**
 * 结构化报告（纯函数）。
 *
 * @param template 模板
 * @param findings 发现
 * @returns 报告
 */
export function structureReport(template: string, findings: string[]): { sections: number; ready: boolean } {
  return { sections: findings.length + 1, ready: findings.length > 0 };
}

/** 影像中心 V2 报告输出 */
export interface ImagingReportV2 {
  timeRange: string;
  xray: { dr: number };
  ct: { ct: number; cta: number };
  mri: { mri: number };
  intervention: { tace: number; ablation: number };
  ultrasound: { us: number };
  nuclear: { pet: number; spect: number };
  reporting: { pacs: boolean; ai: boolean; structured: number };
  management: { satisfaction: number };
  suggestions: string[];
}

/**
 * 构建影像中心 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 影像中心 V2 报告
 */
export function buildImagingReportV2(timeRange: string): ImagingReportV2 {
  return {
    timeRange,
    xray: { dr: 50000 },
    ct: { ct: 20000, cta: 3000 },
    mri: { mri: 10000 },
    intervention: { tace: 200, ablation: 150 },
    ultrasound: { us: 40000 },
    nuclear: { pet: 500, spect: 800 },
    reporting: { pacs: true, ai: true, structured: 50000 },
    management: { satisfaction: 93 },
    suggestions: ['扩大 AI 辅助诊断覆盖', '推进结构化报告'],
  };
}
