/**
 * 健澜科技 jlmedaios - 医院机器人与自动化 V5 纯函数（M268-B）
 *
 * buildHospitalRobotV5Report / dispatchRobotTaskV5 / assessRobotUtilizationV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 机器人调度 V5（纯函数）。
 *
 * @param robots 机器人
 * @param tasks 任务
 * @returns 调度结果
 */
export function dispatchRobotTaskV5(robots: { id: string; available: boolean; battery: number }[], tasks: { id: string; type: string; priority: string }[]): { assignments: { robotId: string; taskId: string }[]; unassigned: number } {
  const assignments: { robotId: string; taskId: string }[] = [];
  const availableRobots = robots.filter((r) => r.available && r.battery > 20);
  const highPriorityTasks = tasks.filter((t) => t.priority === "high");
  const normalTasks = tasks.filter((t) => t.priority !== "high");
  let idx = 0;
  for (const task of highPriorityTasks) {
    if (idx < availableRobots.length) {
      assignments.push({ robotId: availableRobots[idx].id, taskId: task.id });
      idx++;
    }
  }
  for (const task of normalTasks) {
    if (idx < availableRobots.length) {
      assignments.push({ robotId: availableRobots[idx].id, taskId: task.id });
      idx++;
    }
  }
  const unassigned = tasks.length - assignments.length;
  return { assignments, unassigned };
}

/**
 * 评估机器人利用率 V5（纯函数）。
 *
 * @param robots 机器人
 * @returns 利用率
 */
export function assessRobotUtilizationV5(robots: { id: string; utilization: number; online: boolean }): { avg: number; onlineRate: number; level: string } {
  const avg = Math.round(robots.utilization);
  const onlineRate = robots.online ? 100 : 0;
  let level = "良好";
  if (avg < 40) {
    level = "低利用";
  } else if (avg >= 80) {
    level = "高利用";
  }
  return { avg, onlineRate, level };
}

/** 医院机器人与自动化 V5 报告输出 */
export interface HospitalRobotV5Report {
  timeRange: string;
  logistics: { drug: number; specimen: number; supply: number; linen: number; meal: number; dispatch: number; elevator: number };
  disinfection: { uv: number; nebulizer: number; surface: number; sampling: number; unmanned: number; scheduled: number };
  service: { guide: number; consult: number; deliver: number; navigation: number; followup: number; voice: number };
  surgical: { laparoscopic: number; orthopedic: number; neuro: number; ablation: number; planning: number; record: number };
  rehab: { upper: number; lower: number; exoskeleton: number; hand: number; gait: number; training: number };
  fleet: { fleet: number; taskQueue: number; charging: number; collision: number; manualTakeover: number; exception: number };
  automation: { pharmacy: number; labSorting: number; archive: number; ctPositioning: number };
  metrics: { taskVolume: number; laborSaved: number; faultRate: number; utilization: number; satisfaction: number };
  suggestions: string[];
}

/**
 * 构建医院机器人与自动化 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 医院机器人与自动化 V5 报告
 */
export function buildHospitalRobotV5Report(timeRange: string): HospitalRobotV5Report {
  return {
    timeRange,
    logistics: { drug: 500, specimen: 800, supply: 600, linen: 300, meal: 1000, dispatch: 95, elevator: 90 },
    disinfection: { uv: 200, nebulizer: 150, surface: 250, sampling: 100, unmanned: 80, scheduled: 95 },
    service: { guide: 300, consult: 500, deliver: 400, navigation: 350, followup: 200, voice: 85 },
    surgical: { laparoscopic: 50, orthopedic: 30, neuro: 10, ablation: 20, planning: 40, record: 90 },
    rehab: { upper: 100, lower: 150, exoskeleton: 30, hand: 80, gait: 120, training: 85 },
    fleet: { fleet: 20, taskQueue: 50, charging: 90, collision: 2, manualTakeover: 5, exception: 3 },
    automation: { pharmacy: 80, labSorting: 75, archive: 60, ctPositioning: 70 },
    metrics: { taskVolume: 5000, laborSaved: 30, faultRate: 2, utilization: 75, satisfaction: 88 },
    suggestions: ["提升机器人利用率", "降低故障率"],
  };
}
