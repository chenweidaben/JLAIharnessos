/**
 * 健澜科技数智医院智能体 - 临床警报类型定义
 *
 * 定义危急值、药物相互作用、过敏等临床警报的数据结构。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// ============================================================================
// 警报级别与类型
// ============================================================================

/** 警报级别 */
export type ClinicalAlertLevel = 'critical' | 'warning' | 'info';

/** 警报种类 */
export type ClinicalAlertKind = 'critical-value' | 'drug-interaction' | 'allergy';

/** 患者快照 */
export interface AlertPatient {
  /** 姓名 */
  name: string;
  /** 年龄 */
  age?: number;
  /** 性别 */
  gender?: string;
  /** 床号 */
  bedNo?: string;
  /** 科室 */
  department?: string;
}

/** 通知记录（危急值） */
export interface NotifyRecord {
  /** 通知人 */
  notifiedBy: string;
  /** 通知人角色 */
  role: string;
  /** 通知时间 */
  at: string;
}

/** 危急值警报数据 */
export interface CriticalValueData {
  /** 项目名称 */
  itemName: string;
  /** 结果值 */
  value: string;
  /** 单位 */
  unit: string;
  /** 参考范围 */
  referenceRange: string;
  /** 危急阈值 */
  criticalThreshold: string;
  /** 临床意义说明 */
  clinicalMeaning: string;
  /** 建议处理措施 */
  suggestedActions: string[];
  /** 通知记录 */
  notifyRecords: NotifyRecord[];
}

/** 药物相互作用数据 */
export interface DrugInteractionData {
  /** 药品A */
  drugA: string;
  /** 药品B */
  drugB: string;
  /** 相互作用类型 */
  interactionType: string;
  /** 严重程度 */
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  /** 临床意义 */
  clinicalMeaning: string;
  /** 建议处理 */
  suggestedActions: string[];
  /** 参考来源 */
  referenceSource: string;
}

/** 过敏警报数据 */
export interface AllergyData {
  /** 过敏原 */
  allergen: string;
  /** 过敏反应类型 */
  reactionType: string;
  /** 严重程度 */
  severity: 'mild' | 'moderate' | 'severe';
  /** 交叉过敏提示 */
  crossReactivity: string[];
  /** 建议处理 */
  suggestedActions: string[];
}

/** 临床警报（联合类型） */
export interface ClinicalAlert {
  /** 警报ID */
  id: string;
  /** 级别 */
  level: ClinicalAlertLevel;
  /** 种类 */
  kind: ClinicalAlertKind;
  /** 标题 */
  title: string;
  /** 患者 */
  patient: AlertPatient;
  /** 创建时间 */
  createdAt: string;
  /** 是否已确认 */
  acknowledged: boolean;
  /** 是否已延迟/暂缓 */
  snoozed: boolean;
  /** 危急值数据（kind=critical-value） */
  critical?: CriticalValueData;
  /** 药物相互作用数据（kind=drug-interaction） */
  interaction?: DrugInteractionData;
  /** 过敏数据（kind=allergy） */
  allergy?: AllergyData;
}

/** 优先级权重（数字越大越优先） */
export const ALERT_LEVEL_PRIORITY: Record<ClinicalAlertLevel, number> = {
  critical: 3,
  warning: 2,
  info: 1,
};

/**
 * 按优先级对警报排序（critical 优先，同级按时间倒序）
 * @param alerts - 警报列表
 * @returns 排序后的新数组
 */
export function sortAlertsByPriority(alerts: ClinicalAlert[]): ClinicalAlert[] {
  return [...alerts].sort((a, b) => {
    const p = ALERT_LEVEL_PRIORITY[b.level] - ALERT_LEVEL_PRIORITY[a.level];
    if (p !== 0) return p;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

/**
 * 终端响铃（危急值提示音）
 *
 * 写入 BEL 控制字符 \u0007，触发终端蜂鸣。
 */
export function beep(): void {
  try {
    process.stdout.write('\u0007');
  } catch {
    // 忽略不可写环境（如测试）
  }
}
