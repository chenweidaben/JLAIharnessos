/**
 * 健澜科技 jlmedaios - 预问诊报告生成器（M3-P）
 *
 * 纯函数、确定性：将患者结构化填写的病史汇总为预问诊报告，
 * 供医生在接诊前快速了解病情。
 *
 * 安全边界：报告为患者自填/结构化采集，不构成诊断，
 * 最终诊断与病历由医师本人确认并签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 结构化病史输入 */
export interface PreliminaryHistoryInput {
  chiefComplaint: string;
  presentIllness: string;
  pastHistory?: string | null;
  medications?: string | null;
  allergies?: string | null;
  /** 起病时间（如「3 天前」） */
  onsetTime?: string | null;
  /** 伴随症状 */
  accompanyingSymptoms?: string[] | null;
}

/** 报告头部的免责声明 */
export const PRELIMINARY_REPORT_DISCLAIMER =
  '本报告由患者在就诊前通过预问诊结构化填写，仅供医师接诊参考，不构成诊断结论；最终诊断以医师面诊及病历记录为准。';

/** 规范化空值（空白统一显示为「未填写」） */
function field(label: string, value?: string | null): string {
  const v = (value ?? '').trim();
  return `${label}：${v || '未填写'}`;
}

/**
 * 生成预问诊报告文本。
 *
 * @param targetDepartment - 目标科室
 * @param history - 结构化病史
 */
export function buildPreliminaryReport(
  targetDepartment: string | undefined,
  history: PreliminaryHistoryInput,
): string {
  const lines: string[] = [];
  lines.push('【预问诊报告】');
  if (targetDepartment) lines.push(`拟就诊科室：${targetDepartment}`);
  lines.push(field('主诉', history.chiefComplaint));
  if (history.onsetTime?.trim()) {
    lines.push(`起病时间：${history.onsetTime.trim()}`);
  }
  lines.push(field('现病史', history.presentIllness));

  if (history.accompanyingSymptoms && history.accompanyingSymptoms.length > 0) {
    const valid = history.accompanyingSymptoms.map((s) => s.trim()).filter(Boolean);
    if (valid.length) lines.push(`伴随症状：${valid.join('、')}`);
  }

  lines.push(field('既往史', history.pastHistory));
  lines.push(field('当前用药', history.medications));
  lines.push(field('过敏史', history.allergies));

  lines.push('');
  lines.push(PRELIMINARY_REPORT_DISCLAIMER);

  return lines.join('\n');
}

/**
 * 校验预问诊必填项（主诉、现病史不得为空）。
 * 返回缺失字段名数组（空数组表示通过）。
 */
export function validatePreliminaryHistory(
  history: PreliminaryHistoryInput,
): string[] {
  const missing: string[] = [];
  if (!history.chiefComplaint?.trim()) missing.push('主诉');
  if (!history.presentIllness?.trim()) missing.push('现病史');
  return missing;
}
