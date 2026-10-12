/**
 * 健澜科技 jlmedaios - 给药三查七对前端展示层纯函数（M17-B）
 *
 * 状态/差错类型中文标签与颜色；高危药目录与后端 medAdminCheck.ts 同口径（展示用）。
 * 纯函数、确定性、无 I/O、可单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import type { MedAdminStatus, MedErrorType } from '@/types/medAdmin';

/** 给药状态中文标签。 */
export function medStatusLabel(s: MedAdminStatus | string): string {
  switch (s) {
    case 'planned': return '待执行';
    case 'arrived': return '已到旁';
    case 'given': return '已给药';
    case 'held': return '暂缓';
    case 'waste': return '报损';
    case 'cancelled': return '已取消';
    default: return s;
  }
}

/** 差错类型中文标签。 */
export function medErrorLabel(e: MedErrorType | string | null | undefined): string {
  switch (e) {
    case null:
    case undefined:
    case 'none': return '无差错';
    case 'medication_error': return '给药差错';
    case 'adr': return '不良反应(ADR)';
    case 'wrong_patient': return '错患者';
    case 'wrong_med': return '错药';
    default: return e;
  }
}

/** 给药状态 Tag 颜色。 */
export function medStatusColor(s: MedAdminStatus | string): string {
  switch (s) {
    case 'given': return 'green';
    case 'held': return 'orange';
    case 'waste': return 'red';
    case 'cancelled': return 'default';
    default: return 'blue';
  }
}

/** 内置高危药关键字（与后端 isHighRiskMed 同口径，前端预估展示用）。 */
const HIGH_RISK_KEYWORDS = [
  '吗啡', 'morphine', '哌替啶', '芬太尼', 'fentanyl', '阿托品', 'atropine',
  '氯化钾', 'insulin', '胰岛素', '肝素', 'heparin', '肾上腺素', 'adrenaline',
  '地高辛', '咪达唑仑', 'midazolam', '丙泊酚', 'propofol',
];

/** 前端预估是否高危药（展示用；最终以后端为准）。 */
export function previewHighRisk(medName: string): boolean {
  const n = (medName ?? '').trim().toLowerCase();
  if (!n) return false;
  return HIGH_RISK_KEYWORDS.some((k) => n.includes(k.toLowerCase()));
}
