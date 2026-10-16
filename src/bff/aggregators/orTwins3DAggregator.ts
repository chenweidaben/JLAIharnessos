/**
 * 健澜科技 jlmedaios - 数字孪生 3D 手术室试点纯函数（M185-B）
 *
 * buildORTwins3D：手术室实时状态、排程偏差、设备状态、利用率、延误预警
 * simulateORFlow：手术流程仿真
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 手术室状态 */
export type ORStatus = 'idle' | 'in_surgery' | 'preparing' | 'cleaning';

/** 设备状态 */
export interface OREquipment {
  name: string;
  status: 'ok' | 'warning' | 'fault';
}

/** 单台手术室数据 */
export interface ORRoom {
  orId: string;
  name: string;
  status: ORStatus;
  scheduledSurgery: string | null;
  actualStartTime: string | null;
  scheduledStartTime: string | null;
  /** 计划手术时长（分钟） */
  plannedDuration: number;
  /** 实际已进行时长（分钟） */
  actualElapsed: number;
  equipment: OREquipment[];
}

/** 延误预警 */
export interface DelayAlert {
  orId: string;
  type: 'overtime' | 'equipment_fault' | 'schedule_deviation';
  message: string;
}

/** 输出 */
export interface ORTwins3DResult {
  date: string;
  rooms: ORRoom[];
  utilizationRate: number;
  alerts: DelayAlert[];
}

/**
 * 构建数字孪生 3D 手术室看板数据。
 *
 * @param date 日期
 * @param rooms 手术室列表
 * @returns 看板结果
 */
export function buildORTwins3D(date: string, rooms: ORRoom[]): ORTwins3DResult {
  const alerts: DelayAlert[] = [];

  for (const room of rooms) {
    // 手术超时预警
    if (room.status === 'in_surgery' && room.actualElapsed > room.plannedDuration) {
      alerts.push({
        orId: room.orId,
        type: 'overtime',
        message: `${room.name} 手术已超时 ${room.actualElapsed - room.plannedDuration} 分钟`,
      });
    }
    // 设备故障预警
    for (const eq of room.equipment) {
      if (eq.status === 'fault') {
        alerts.push({
          orId: room.orId,
          type: 'equipment_fault',
          message: `${room.name} ${eq.name} 故障，需立即检修`,
        });
      }
    }
    // 排程偏差：实际开始时间晚于计划 > 30 分钟
    if (room.scheduledStartTime && room.actualStartTime) {
      const planned = new Date(`2026-10-16T${room.scheduledStartTime}:00`).getTime();
      const actual = new Date(`2026-10-16T${room.actualStartTime}:00`).getTime();
      const delayMin = (actual - planned) / 60000;
      if (delayMin > 30) {
        alerts.push({
          orId: room.orId,
          type: 'schedule_deviation',
          message: `${room.name} 手术开始延误 ${Math.round(delayMin)} 分钟`,
        });
      }
    }
  }

  // 利用率：手术中 + 准备中 / 总间数
  const busyRooms = rooms.filter((r) => r.status === 'in_surgery' || r.status === 'preparing').length;
  const utilizationRate = rooms.length > 0 ? busyRooms / rooms.length : 0;

  return { date, rooms, utilizationRate, alerts };
}

/**
 * 手术流程仿真（纯函数）：模拟一台手术从切皮到关闭切口的阶段进度。
 *
 * @param date 日期
 * @param orId 手术室 ID
 * @returns 仿真阶段列表
 */
export function simulateORFlow(
  date: string,
  orId: string,
): Array<{ phase: string; progress: number; estimatedMinutes: number }> {
  return [
    { phase: '麻醉诱导', progress: 0.8, estimatedMinutes: 15 },
    { phase: '消毒铺巾', progress: 0.6, estimatedMinutes: 10 },
    { phase: '手术操作', progress: 0.4, estimatedMinutes: 60 },
    { phase: '关闭切口', progress: 0, estimatedMinutes: 20 },
    { phase: '复苏', progress: 0, estimatedMinutes: 30 },
  ];
}
