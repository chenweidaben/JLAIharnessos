/**
 * 健澜科技 jlmedaios - 患者随访学习引擎聚合器（M33）
 *
 * 依据宪法第四章：公民的基本权利和义务——患者随访健康数据属个人信息，
 * 随访计划推荐仅做最小必要计算，不得超范围使用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { AuthView } from '../view/userView.js';

/**
 * 单条随访历史记录（纯数据，不含 I/O）。
 */
export interface FollowupHistoryItem {
  /** 本次随访是否有效应答（患者回复/完成随访） */
  responded: boolean;
  /** 本次随访是否检出异常指标（血压/血糖越界等） */
  abnormal?: boolean;
}

/**
 * 随访计划推荐结果。
 */
export interface FollowupPlan {
  /** 推荐随访间隔（天） */
  intervalDays: number;
  /** 随访频率中文描述 */
  frequency: string;
  /** 推荐依据说明 */
  reason: string;
}

/** 各疾病类型的默认随访间隔（天） */
const BASE_INTERVAL_DAYS: Readonly<Record<string, number>> = {
  hypertension: 90,
  diabetes: 30,
  coronary: 60,
  copd: 30,
  tumor: 14,
};

/** 无匹配疾病类型时的兜底间隔 */
const DEFAULT_INTERVAL_DAYS = 90;

/** 应答率阈值：>= 视为应答良好，<= 视为应答不足 */
const HIGH_RESPONSE = 0.8;
const LOW_RESPONSE = 0.5;

/**
 * 将间隔天数映射为人类可读的随访频率描述。
 *
 * @param days 间隔天数
 * @returns 频率中文标签
 */
function frequencyLabel(days: number): string {
  if (days <= 7) return '每周';
  if (days <= 14) return '每两周';
  if (days <= 30) return '每月';
  if (days <= 90) return '每季度';
  return '每半年';
}

/**
 * 根据疾病类型与历史应答率计算随访计划（纯函数、确定性、无副作用）。
 *
 * 规则：
 *  - 无历史数据 -> 按疾病默认间隔兜底；
 *  - 历史出现异常指标 -> 加密随访，间隔缩短至 14 天（异常优先）；
 *  - 应答率高（>=0.8）-> 间隔延长 1.5 倍，上限 180 天；
 *  - 应答率低（<0.5） -> 间隔缩短一半，下限 7 天；
 *  - 其余维持默认间隔。
 *
 * @param patientHistory 患者随访历史，可为空数组/null（空数据兜底）
 * @param diseaseType    疾病类型（hypertension/diabetes/coronary/copd/tumor 等）
 * @returns 随访计划 { intervalDays, frequency, reason }
 */
export function buildFollowupPlan(
  patientHistory: FollowupHistoryItem[] | null | undefined,
  diseaseType: string,
): FollowupPlan {
  const disease = (diseaseType ?? '').trim().toLowerCase();
  const base = BASE_INTERVAL_DAYS[disease] ?? DEFAULT_INTERVAL_DAYS;

  // 空数据兜底
  if (!patientHistory || patientHistory.length === 0) {
    return {
      intervalDays: base,
      frequency: frequencyLabel(base),
      reason: `无随访历史数据，按疾病「${disease || 'unknown'}」默认间隔 ${base} 天兜底`,
    };
  }

  const total = patientHistory.length;
  const responded = patientHistory.filter((h) => h.responded).length;
  const responseRate = total > 0 ? responded / total : 0;
  const hasAbnormal = patientHistory.some((h) => h.abnormal === true);

  let interval = base;
  let reason = `疾病「${disease || 'unknown'}」默认间隔 ${base} 天，历史应答率 ${(responseRate * 100).toFixed(0)}%`;

  if (hasAbnormal) {
    // 异常指标优先：加密随访
    interval = Math.min(base, 14);
    reason = `${reason}；检出异常指标，加密随访至 14 天`;
  } else if (responseRate >= HIGH_RESPONSE) {
    // 应答率高：延长间隔
    interval = Math.min(Math.round(base * 1.5), 180);
    reason = `${reason}；应答良好，间隔延长 1.5 倍`;
  } else if (responseRate < LOW_RESPONSE) {
    // 应答率低：加密随访
    interval = Math.max(Math.round(base * 0.5), 7);
    reason = `${reason}；应答不足，间隔缩短一半`;
  } else {
    reason = `${reason}；应答率适中，维持默认间隔`;
  }

  return { intervalDays: interval, frequency: frequencyLabel(interval), reason };
}

/** 视图层业务错误 */
export class FollowupLearningError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'FollowupLearningError';
  }
}

/** 随访计划视图输出（带患者与疾病标识） */
export interface FollowupPlanView extends FollowupPlan {
  patientId: string;
  diseaseType: string;
}

/**
 * 路由视图：鉴权后为指定患者生成随访计划。
 *
 * @param auth        当前登录用户鉴权视图
 * @param patientId   患者 ID（路径参数）
 * @param diseaseType 疾病类型（查询参数）
 * @returns 随访计划视图
 */
export function buildFollowupPlanView(
  auth: AuthView,
  patientId: string,
  diseaseType: string,
): FollowupPlanView {
  if (!auth.permissions.includes('medmuse:view')) {
    throw new FollowupLearningError(403, '缺少权限：medmuse:view');
  }
  if (!patientId) {
    throw new FollowupLearningError(400, 'patientId 不能为空');
  }
  if (!diseaseType) {
    throw new FollowupLearningError(400, 'diseaseType 不能为空');
  }

  // TODO: 接入 medmuse.followup_learning 历史记录后，以真实历史替换空数组。
  // 当前空数组走默认间隔兜底，保证接口在无数据时可用。
  const plan = buildFollowupPlan([], diseaseType);
  return { patientId, diseaseType, ...plan };
}
