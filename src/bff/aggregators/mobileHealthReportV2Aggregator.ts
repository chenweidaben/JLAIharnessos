/**
 * 健澜科技 jlmedaios - 移动医疗 V2 纯函数（M214-C）
 *
 * buildMobileHealthReportV2 / assessMobileAdoption / trackMobileUsage
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估移动医疗渗透率（纯函数）。
 *
 * @param users 活跃用户
 * @param total 总用户
 * @returns 渗透率
 */
export function assessMobileAdoption(users: number, total: number): { rate: number; level: string } {
  const rate = total > 0 ? users / total : 0;
  let level = '中等';
  if (rate >= 0.8) level = '高';
  else if (rate < 0.5) level = '低';
  return { rate, level };
}

/** 移动事件 */
export interface MobileEvent {
  type: string;
  count: number;
}

/**
 * 追踪移动使用量（纯函数）。
 *
 * @param events 事件列表
 * @returns 总事件数
 */
export function trackMobileUsage(events: MobileEvent[]): { totalEvents: number; topFeature: string } {
  const totalEvents = events.reduce((sum, e) => sum + e.count, 0);
  const top = events.reduce((max, e) => (e.count > max.count ? e : max), events[0] ?? { type: '', count: 0 });
  return { totalEvents, topFeature: top.type };
}

/** 移动医疗 V2 报告输出 */
export interface MobileHealthReportV2 {
  timeRange: string;
  mobileCare: { doctorStation: number; nurseStation: number; pda: number };
  office: { mobile: number };
  patientApp: { app: number; miniProgram: number };
  followup: { mobile: number };
  nursing: { mobile: number };
  pharmacy: { mobile: number };
  mdm: { devices: number; remoteWipe: number };
  suggestions: string[];
}

/**
 * 构建移动医疗 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 移动医疗 V2 报告
 */
export function buildMobileHealthReportV2(timeRange: string): MobileHealthReportV2 {
  return {
    timeRange,
    mobileCare: { doctorStation: 500, nurseStation: 500, pda: 1000 },
    office: { mobile: 200 },
    patientApp: { app: 100000, miniProgram: 200000 },
    followup: { mobile: 5000 },
    nursing: { mobile: 3000 },
    pharmacy: { mobile: 500 },
    mdm: { devices: 2000, remoteWipe: 5 },
    suggestions: ['提高移动端渗透率', '加强 MDM 安全'],
  };
}
