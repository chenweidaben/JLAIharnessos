/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 急诊业务常量：分诊级别 / NEWS2 / GCS / FAST / LAMS / 绿色通道 / 抢救 / 留观
 */
import type {
  DispositionCode,
  EmergencyStatus,
  GreenChannelStatus,
  GreenChannelType,
  ObsStatus,
  ResusStatus,
  TriageLevel,
} from '@/types/emergency';

// ============ 分诊级别 ============

export const LEVEL_COLOR: Record<number, string> = {
  1: '#F5222D', // 红 - 濒危
  2: '#FA541C', // 橙 - 危重
  3: '#FAAD14', // 黄 - 急症
  4: '#52C41A', // 绿 - 非急症
};

export const LEVEL_TEXT: Record<number, string> = {
  1: 'Ⅰ级 濒危',
  2: 'Ⅱ级 危重',
  3: 'Ⅲ级 急症',
  4: 'Ⅳ级 非急症',
};

/** 各级别响应时限（分钟）—— 急诊预检分诊专家共识 */
export const LEVEL_RESPONSE: Record<number, number> = {
  1: 0, // 立即
  2: 10,
  3: 30,
  4: 120,
};

/** 结构化分级元数据 */
export const TRIAGE_LEVEL_META: Record<
  TriageLevel,
  { color: string; label: string; short: string; response: number; wait: string }
> = {
  1: { color: '#F5222D', label: 'Ⅰ级 濒危', short: '濒危', response: 0, wait: '立即处置' },
  2: { color: '#FA541C', label: 'Ⅱ级 危重', short: '危重', response: 10, wait: '≤10分钟' },
  3: { color: '#FAAD14', label: 'Ⅲ级 急症', short: '急症', response: 30, wait: '≤30分钟' },
  4: { color: '#52C41A', label: 'Ⅳ级 非急症', short: '非急症', response: 120, wait: '≤120分钟' },
};

// ============ 急诊主状态 ============

export const EM_STATUS_META: Record<EmergencyStatus, { color: string; label: string }> = {
  waiting_triage: { color: 'default', label: '待分诊' },
  triaged: { color: 'cyan', label: '已分诊' },
  in_treatment: { color: 'processing', label: '救治中' },
  resuscitation: { color: 'error', label: '抢救中' },
  observation: { color: 'warning', label: '留观中' },
  admitted: { color: 'blue', label: '已入院' },
  transferred: { color: 'geekblue', label: '已转院' },
  discharged: { color: 'success', label: '已离院' },
  deceased: { color: 'default', label: '死亡' },
};

// ============ NEWS2 相关 ============

export const NEWS_RISK_COLOR: Record<string, string> = {
  low: '#52C41A',
  medium: '#FAAD14',
  high: '#F5222D',
};

export const NEWS2_META = {
  respiration: {
    label: '呼吸频率',
    unit: '次/分',
    ranges: [
      { min: 0, max: 8, score: 3 },
      { min: 9, max: 11, score: 1 },
      { min: 12, max: 20, score: 0 },
      { min: 21, max: 24, score: 2 },
      { min: 25, max: 100, score: 3 },
    ],
  },
  oxygen: {
    label: '是否吸氧',
    ranges: [{ value: true, score: 2 }],
  },
  oxygenSaturation: {
    label: '血氧饱和度',
    unit: '%',
    ranges: [
      { min: 0, max: 91, score: 3 },
      { min: 92, max: 93, score: 2 },
      { min: 94, max: 95, score: 1 },
      { min: 96, max: 100, score: 0 },
    ],
  },
  temperature: {
    label: '体温',
    unit: '℃',
    ranges: [
      { min: 0, max: 35.0, score: 3 },
      { min: 35.1, max: 36.0, score: 1 },
      { min: 36.1, max: 38.0, score: 0 },
      { min: 38.1, max: 39.0, score: 1 },
      { min: 39.1, max: 100, score: 2 },
    ],
  },
  systolic: {
    label: '收缩压',
    unit: 'mmHg',
    ranges: [
      { min: 0, max: 90, score: 3 },
      { min: 91, max: 100, score: 2 },
      { min: 101, max: 110, score: 1 },
      { min: 111, max: 219, score: 0 },
      { min: 220, max: 300, score: 3 },
    ],
  },
  pulse: {
    label: '心率',
    unit: '次/分',
    ranges: [
      { min: 0, max: 40, score: 3 },
      { min: 41, max: 50, score: 1 },
      { min: 51, max: 90, score: 0 },
      { min: 91, max: 110, score: 1 },
      { min: 111, max: 130, score: 2 },
      { min: 131, max: 300, score: 3 },
    ],
  },
  consciousness: {
    label: '意识状态',
    ranges: [
      { value: 'alert', score: 0 },
      { value: 'verbal', score: 3 },
      { value: 'pain', score: 3 },
      { value: 'unresponsive', score: 3 },
    ],
  },
};

// ============ GCS 评分 ============

export const GCS_META = {
  eye: {
    label: '睁眼反应',
    options: [
      { value: 4, label: '自动睁眼' },
      { value: 3, label: '呼唤睁眼' },
      { value: 2, label: '刺痛睁眼' },
      { value: 1, label: '不睁眼' },
    ],
  },
  verbal: {
    label: '语言反应',
    options: [
      { value: 5, label: '正常交谈' },
      { value: 4, label: '言语错乱' },
      { value: 3, label: '只能说出单词' },
      { value: 2, label: '只能发音' },
      { value: 1, label: '不能发音' },
    ],
  },
  motor: {
    label: '运动反应',
    options: [
      { value: 6, label: '按吩咐动作' },
      { value: 5, label: '对刺痛能定位' },
      { value: 4, label: '对刺痛能躲避' },
      { value: 3, label: '刺痛肢体屈曲' },
      { value: 2, label: '刺痛肢体过伸' },
      { value: 1, label: '无运动反应' },
    ],
  },
};

// ============ FAST / LAMS 卒中量表 ============

export const FAST_META = {
  face: { label: '面瘫', desc: '一侧面部下垂/口角歪斜' },
  arm: { label: '肢体无力', desc: '一侧上肢无法维持上举' },
  speech: { label: '言语障碍', desc: '言语含糊/无法理解' },
};

export const LAMS_META = {
  face: {
    label: '面瘫',
    options: [
      { value: 0, label: '正常' },
      { value: 1, label: '轻度面瘫' },
      { value: 2, label: '完全性下面瘫' },
    ],
  },
  arm: {
    label: '上肢肌力',
    options: [
      { value: 0, label: '可维持上举' },
      { value: 1, label: '上举漂移' },
      { value: 2, label: '不能对抗重力' },
    ],
  },
  grip: {
    label: '握力',
    options: [
      { value: 0, label: '正常' },
      { value: 1, label: '握力减弱' },
      { value: 2, label: '不能抓握' },
    ],
  },
};

// ============ 绿色通道 ============

export const GC_TYPE_META: Record<
  GreenChannelType,
  { label: string; color: string; icon: string; teams: string[] }
> = {
  chest_pain: {
    label: '胸痛中心',
    color: '#F5222D',
    icon: 'heart',
    teams: ['心内科', '导管室', '检验科', 'CCU'],
  },
  stroke: {
    label: '卒中中心',
    color: '#1890FF',
    icon: 'brain',
    teams: ['神经内科', '影像科', '检验科', '康复科'],
  },
  trauma: {
    label: '创伤中心',
    color: '#FA8C16',
    icon: 'first-aid',
    teams: ['创伤外科', '骨科', '麻醉科', '手术室', '输血科'],
  },
  maternal: {
    label: '孕产妇急救',
    color: '#EB2F96',
    icon: 'baby',
    teams: ['产科', '新生儿科', '麻醉科', '手术室', '输血科'],
  },
  neonatal: {
    label: '新生儿急救',
    color: '#13C2C2',
    icon: 'child',
    teams: ['新生儿科', 'NICU', '儿科'],
  },
};

/** 通道节点中文标签（与后端 GREEN_CHANNEL_TEMPLATES.nodeKey 对应） */
/** 通道状态元数据（与 BFF green_channels.status 运行时键对齐）：active 激活中 / completed 已关闭 / cancelled 已取消 */
export const GC_STATUS_META: Record<GreenChannelStatus, { label: string; color: string }> = {
  active: { label: '激活中', color: 'processing' },
  completed: { label: '已完成', color: 'default' },
  cancelled: { label: '已取消', color: 'error' },
};

export const GC_NODE_LABEL: Record<string, string> = {
  arrive: '患者到达',
  activate: '通道激活',
  ecg: '首份心电图',
  troponin: '肌钙蛋白结果',
  dual_antiplatelet: '双联抗血小板',
  ct: '头颅CT完成',
  cta: 'CTA完成',
  notify_intervention: '通知介入团队',
  pci: '球囊扩张(再灌注)',
  thrombolysis: '静脉溶栓',
  ct_report: 'CT报告出具',
  rescue_room: '进入抢救室',
  damage_control: '损伤控制性手术',
  transfusion: '启动大量输血',
  surgery: '急诊手术',
  notify_ob: '通知产科团队',
  delivery: '胎儿娩出',
  notify_nicu: '通知NICU',
  neonatal_resus: '新生儿复苏',
  close: '通道关闭',
};

// ============ 抢救 ============

/** 抢救床位/记录状态（含空床） */
export const RESUS_STATUS_META: Record<string, { label: string; color: string }> = {
  empty: { label: '空床', color: '#D9D9D9' },
  resuscitating: { label: '抢救中', color: '#F5222D' },
  stabilized: { label: '已稳定', color: '#52C41A' },
  transferred_icu: { label: '转ICU', color: '#1890FF' },
  deceased: { label: '死亡', color: '#8C8C8C' },
};

/** 抢救记录状态（不含空床） */
export const RESUS_RECORD_STATUS_META: Record<ResusStatus, { label: string; color: string }> = {
  resuscitating: { label: '抢救中', color: '#F5222D' },
  stabilized: { label: '已稳定', color: '#52C41A' },
  transferred_icu: { label: '转ICU', color: '#1890FF' },
  deceased: { label: '死亡', color: '#8C8C8C' },
};

export const RESUS_EVENT_TYPE_META: Record<string, { label: string; color: string }> = {
  vitals: { label: '生命体征', color: '#1890FF' },
  medication: { label: '给药', color: '#722ED1' },
  procedure: { label: '操作', color: '#F5222D' },
  exam: { label: '检查', color: '#13C2C2' },
  consult: { label: '会诊', color: '#FAAD14' },
  evaluation: { label: '评估', color: '#52C41A' },
};

// ============ 留观 ============

export const OBS_STATUS_META: Record<ObsStatus, { label: string; color: string }> = {
  observing: { label: '留观中', color: 'processing' },
  stable: { label: '病情稳定', color: 'success' },
  worsening: { label: '病情加重', color: 'error' },
  discharged: { label: '已离院', color: 'default' },
  admitted: { label: '已入院', color: 'blue' },
};

export const NURSING_LEVEL_META: Record<string, { label: string; color: string }> = {
  特级: { label: '特级护理', color: '#F5222D' },
  一级: { label: '一级护理', color: '#FA541C' },
  二级: { label: '二级护理', color: '#FAAD14' },
  三级: { label: '三级护理', color: '#52C41A' },
  // 兼容历史种子使用的 level 码（level1≈一级护理）
  special: { label: '特级护理', color: '#F5222D' },
  level1: { label: '一级护理', color: '#FA541C' },
  level2: { label: '二级护理', color: '#FAAD14' },
  level3: { label: '三级护理', color: '#52C41A' },
};

// ============ 转归 ============

export const DISPOSITION_META: Record<DispositionCode, { label: string; color: string }> = {
  admitted: { label: '收治入院', color: 'blue' },
  surgery: { label: '急诊手术', color: 'orange' },
  observation: { label: '继续留观', color: 'gold' },
  discharged: { label: '离院', color: 'success' },
  transferred: { label: '转院', color: 'geekblue' },
  deceased: { label: '死亡', color: 'default' },
};

// ============ 生命体征异常判断 ============

export function isVitalAbnormal(key: string, value: number | null | undefined): boolean {
  if (value == null) return false;
  switch (key) {
    case 'temperature':
      return value < 36 || value > 37.5;
    case 'pulse':
      return value < 50 || value > 100;
    case 'systolic':
      return value < 90 || value > 180;
    case 'diastolic':
      return value > 110;
    case 'spo2':
      return value < 95;
    case 'respiration':
      return value < 10 || value > 24;
    default:
      return false;
  }
}
