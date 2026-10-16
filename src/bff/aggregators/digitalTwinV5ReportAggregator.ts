/**
 * 健澜科技 jlmedaios - 数字孪生可视化 V5 纯函数（M268-D）
 *
 * buildDigitalTwinV5Report / renderCampusTwinV5 / simulatePatientFlowV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 孪生渲染 V5（纯函数）。
 *
 * @param data 场景数据
 * @returns 渲染状态
 */
export function renderCampusTwinV5(data: { sceneCount: number; realtime: boolean; devices: number }): { rendered: boolean; fps: number; scenes: number; latency: number } {
  const rendered = data.realtime && data.sceneCount > 0 && data.devices > 0;
  const fps = rendered ? 30 : 0;
  const latency = rendered ? 100 : 0;
  return { rendered, fps, scenes: data.sceneCount, latency };
}

/**
 * 人流仿真 V5（纯函数）。
 *
 * @param scenario 场景
 * @returns 仿真结果
 */
export function simulatePatientFlowV5(scenario: { arrivalRate: number; serviceRate: number; capacity: number }): { waitTime: number; utilization: number; bottleneck: string; feasible: boolean } {
  const utilization = Math.round((scenario.arrivalRate / Math.max(scenario.serviceRate, 1)) * 100);
  let waitTime = 0;
  let bottleneck = "无";
  let feasible = true;
  if (utilization > 90) {
    waitTime = Math.round((utilization - 90) * 5);
    bottleneck = "候诊区";
    feasible = false;
  } else if (utilization > 70) {
    waitTime = Math.round((utilization - 70) * 2);
    bottleneck = "挂号窗口";
    feasible = true;
  }
  return { waitTime, utilization, bottleneck, feasible };
}

/** 数字孪生可视化 V5 报告输出 */
export interface DigitalTwinV5Report {
  timeRange: string;
  modeling: { building: number; floor: number; dept: number; bed: number; device: number; piping: number; realtimeMapping: number };
  opsDashboard: { traffic: number; parking: number; bed: number; orRoom: number; energy: number; heatmap: number };
  patientFlow: { appointment: number; waiting: number; visit: number; exam: number; admission: number; discharge: number; journey: number };
  deviceTwin: { status: number; position: number; maintenance: number; parameters: number; failurePrediction: number };
  emergency: { disaster: number; outbreak: number; power: number; water: number; evacuation: number; command: number };
  energy: { water: number; power: number; hvac: number; lighting: number; zoned: number; carbon: number; optimization: number };
  simulation: { patientFlow: number; capacity: number; process: number; outbreakDrill: number };
  metrics: { realtime: number; sceneCount: number; decisionAdoption: number; efficiency: number; dashboardUse: number };
  suggestions: string[];
}

/**
 * 构建数字孪生可视化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 数字孪生可视化 V5 报告
 */
export function buildDigitalTwinV5Report(timeRange: string): DigitalTwinV5Report {
  return {
    timeRange,
    modeling: { building: 90, floor: 85, dept: 80, bed: 95, device: 75, piping: 60, realtimeMapping: 85 },
    opsDashboard: { traffic: 80, parking: 75, bed: 90, orRoom: 85, energy: 70, heatmap: 65 },
    patientFlow: { appointment: 85, waiting: 80, visit: 90, exam: 75, admission: 80, discharge: 85, journey: 70 },
    deviceTwin: { status: 90, position: 85, maintenance: 75, parameters: 80, failurePrediction: 65 },
    emergency: { disaster: 60, outbreak: 65, power: 80, water: 75, evacuation: 55, command: 70 },
    energy: { water: 80, power: 85, hvac: 75, lighting: 70, zoned: 65, carbon: 50, optimization: 60 },
    simulation: { patientFlow: 70, capacity: 65, process: 75, outbreakDrill: 55 },
    metrics: { realtime: 95, sceneCount: 50, decisionAdoption: 60, efficiency: 75, dashboardUse: 80 },
    suggestions: ["提升故障预测准确率", "加强能耗优化"],
  };
}
