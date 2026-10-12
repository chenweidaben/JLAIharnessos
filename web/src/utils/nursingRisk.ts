/**
 * 健澜科技 jlmedaios - 压疮/跌倒风险预警前端纯函数（M17-A）
 *
 * 与后端 riskWarning.ts 同口径的展示层字典：Braden/Morse 表单条目、层级标签与颜色。
 * 纯函数、确定性、无 I/O、可单测。实际打分与分层由后端引擎完成，这里只负责表单渲染。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type { RiskLevel, RiskType } from '@/types/nursingRisk';

/** Braden 压疮量表 6 条目（取值范围与 mobileNursing.scoreBraden 一致）。 */
export const BRADEN_ITEMS: Array<{ key: string; label: string; min: number; max: number }> = [
  { key: 'sensory', label: '感觉（对不适相关刺激的感受能力）', min: 1, max: 4 },
  { key: 'moisture', label: '潮湿（皮肤暴露于潮湿程度）', min: 1, max: 4 },
  { key: 'activity', label: '活动（身体活动程度）', min: 1, max: 4 },
  { key: 'mobility', label: '移动（改变/控制体位能力）', min: 1, max: 4 },
  { key: 'nutrition', label: '营养（日常食物摄入模式）', min: 1, max: 4 },
  { key: 'frictionShear', label: '摩擦与剪切力', min: 1, max: 3 },
];

/** Morse 跌倒量表 6 条目（分值为固定选项，与 mobileNursing.scoreMorse 一致）。 */
export const MORSE_ITEMS: Array<{ key: string; label: string; options: Array<{ value: number; label: string }> }> = [
  { key: 'fallHistory', label: '跌倒史', options: [
    { value: 0, label: '无' }, { value: 25, label: '有' },
  ] },
  { key: 'multipleDiagnoses', label: '多于一个诊断', options: [
    { value: 0, label: '否' }, { value: 15, label: '是' },
  ] },
  { key: 'ambulationAid', label: '行走辅助', options: [
    { value: 0, label: '无需/卧床/轮椅' }, { value: 15, label: '拐杖/手杖' }, { value: 30, label: '扶家具行走' },
  ] },
  { key: 'ivTherapy', label: '静脉输液/通路', options: [
    { value: 0, label: '无' }, { value: 20, label: '有' },
  ] },
  { key: 'gait', label: '步态', options: [
    { value: 0, label: '正常/卧床/轮椅' }, { value: 10, label: '虚弱' }, { value: 20, label: '受损' },
  ] },
  { key: 'mentalStatus', label: '认知状态', options: [
    { value: 0, label: '知道自身活动能力' }, { value: 30, label: '高估/受限' },
  ] },
];

/** 风险类型中文名。 */
export function riskTypeLabel(t: RiskType): string {
  return t === 'pressure_ulcer' ? '压疮(Braden)' : '跌倒(Morse)';
}

/** 层级中文标签。 */
export function levelLabel(l: RiskLevel): string {
  return l === 'high' ? '高危' : l === 'medium' ? '中危' : '低危';
}

/** 层级标签色（antd Tag color）。 */
export function levelColor(l: RiskLevel): string {
  return l === 'high' ? 'red' : l === 'medium' ? 'orange' : 'green';
}

/** 预防措施状态中文标签。 */
export function preventionStatusLabel(s: string): string {
  switch (s) {
    case 'suggested': return '待确认';
    case 'accepted': return '已确认待执行';
    case 'executed': return '已执行';
    case 'cancelled': return '已取消';
    default: return s;
  }
}
