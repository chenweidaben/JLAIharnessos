/**
 * 健澜科技 jlmedaios - 急诊科管理（M883 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface EmergencyWorkloadM883 {
  id: string;
  date: string;
  visits: number;
  rescue: number;
  observation: number;
  emergencySurgery: number;
  status: string;
  triageBreakdown: { name: string; count: number }[];
  rescueSuccess: string;
  greenChannel: string;
  observationBeds: string;
  mortality: string;
}

const DEMO: EmergencyWorkloadM883[] = [
  {
    id: 'EM-883',
    date: '2026-10-22',
    visits: 280,
    rescue: 18,
    observation: 42,
    emergencySurgery: 6,
    status: '正常运行',
    triageBreakdown: [
      { name: 'Ⅰ级（危急/红）', count: 6 },
      { name: 'Ⅱ级（危重/橙）', count: 24 },
      { name: 'Ⅲ级（急症/黄）', count: 180 },
      { name: 'Ⅳ级（非急症/绿）', count: 70 },
    ],
    rescueSuccess: '抢救成功率：18/18 = 100%（含 CPR 2 例均恢复自主循环）。',
    greenChannel: '绿色通道：卒中中心 DNT 40min（达标）；胸痛中心 D2B 75min；创伤中心 4 例严重创伤均绿色通道启动。',
    observationBeds: '留观床位使用：开放 60 床，在观 42 人（使用率 70%）；平均留观时间 18h。',
    mortality: '急诊死亡率：今日 1 例（心跳呼吸骤停到场已死亡）；急诊病死率 0.36%。',
  },
];

export interface EmergencyWorkloadM883Result {
  items: EmergencyWorkloadM883[];
  demo: boolean;
}

export async function fetchEmergencyWorkloadM883(): Promise<EmergencyWorkloadM883Result> {
  try {
    const res = await get<{ items: EmergencyWorkloadM883[] }>('/emergency/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
