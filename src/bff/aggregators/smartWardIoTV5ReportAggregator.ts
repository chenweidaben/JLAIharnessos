/**
 * 健澜科技 jlmedaios - 智慧病房 IoT V5 纯函数（M268-A）
 *
 * buildSmartWardIoTV5Report / assessWardIoTAlertV5 / recommendNurseTaskV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 评估病房 IoT 报警 V5（纯函数）。
 *
 * @param events 报警事件
 * @returns 报警评估
 */
export function assessWardIoTAlertV5(events: { total: number; trueAlert: number; falseAlert: number; responseTime: number }): { accuracy: number; trueRate: number; avgResponse: number; level: string } {
  const trueRate = events.total > 0 ? Math.round((events.trueAlert / events.total) * 100) : 0;
  const accuracy = Math.round((1 - events.falseAlert / Math.max(events.total, 1)) * 100);
  let level = "良好";
  if (trueRate < 70) {
    level = "待改进";
  } else if (trueRate >= 90) {
    level = "优秀";
  }
  return { accuracy, trueRate, avgResponse: events.responseTime, level };
}

/**
 * 推荐护士任务 V5（纯函数）。
 *
 * @param alarms 报警
 * @param nurse 护士
 * @returns 任务推荐
 */
export function recommendNurseTaskV5(alarms: { priority: string; location: string }[], nurse: { currentLocation: string; available: boolean }): { task: string; priority: string; eta: number } {
  const high = alarms.filter((a) => a.priority === "high");
  if (high.length > 0 && nurse.available) {
    return { task: `优先处理 ${high[0].location} 高优先级报警`, priority: "high", eta: 2 };
  }
  if (alarms.length > 0) {
    return { task: `处理 ${alarms[0].location} 常规报警`, priority: "normal", eta: 5 };
  }
  return { task: "无报警，常规巡视", priority: "low", eta: 30 };
}

/** 智慧病房 IoT V5 报告输出 */
export interface SmartWardIoTV5Report {
  timeRange: string;
  smartBed: { offBedAlarm: number; position: number; turning: number; pressure: number; inBedDuration: number; nursingLink: number };
  infusion: { rate: number; volume: number; endAlarm: number; abnormal: number; nurseAlert: number };
  vitals: { bedsideMonitor: number; dynamicTemp: number; bp: number; spo2: number; autoEhr: number };
  environment: { temp: number; humidity: number; light: number; noise: number; airQuality: number; bedClean: number };
  smartCall: { priority: number; location: number; voice: number; video: number; carePathway: number };
  access: { wristband: number; location: number; patientSafety: number; wandering: number; staffTrack: number };
  deviceLinkage: { ac: number; light: number; curtain: number; tv: number; call: number; his: number };
  metrics: { alertVolume: number; responseTime: number; falseRate: number; walkReduction: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建智慧病房 IoT V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 智慧病房 IoT V5 报告
 */
export function buildSmartWardIoTV5Report(timeRange: string): SmartWardIoTV5Report {
  return {
    timeRange,
    smartBed: { offBedAlarm: 90, position: 85, turning: 80, pressure: 75, inBedDuration: 95, nursingLink: 90 },
    infusion: { rate: 95, volume: 90, endAlarm: 98, abnormal: 85, nurseAlert: 92 },
    vitals: { bedsideMonitor: 90, dynamicTemp: 80, bp: 85, spo2: 90, autoEhr: 85 },
    environment: { temp: 95, humidity: 95, light: 90, noise: 85, airQuality: 90, bedClean: 80 },
    smartCall: { priority: 85, location: 90, voice: 75, video: 70, carePathway: 65 },
    access: { wristband: 95, location: 90, patientSafety: 98, wandering: 80, staffTrack: 85 },
    deviceLinkage: { ac: 80, light: 85, curtain: 75, tv: 70, call: 90, his: 85 },
    metrics: { alertVolume: 500, responseTime: 3, falseRate: 10, walkReduction: 30, satisfaction: 90 },
    suggestions: ["降低误报率", "提升智能呼叫覆盖率"],
  };
}
