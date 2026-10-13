/**
 * 健澜科技 jlmedaios - 出院计划与随访纯函数（M61-A）
 *
 * 复诊日期建议（科室映射）：术后 7 天 / 慢病 30 天 / 默认 14 天；
 * 指导文本拼装。纯函数无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

function addDays(today: string, days: number): string {
  const d = new Date(today);
  if (!Number.isFinite(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 按科室建议复诊日期。 */
export function suggestFollowup(department: string, today: string): string {
  const dept = (department ?? '').trim();
  if (/外科|骨科|手术|普外|骨外|神外|胸外/.test(dept)) return addDays(today, 7);
  if (/心内|内分泌|肾内|呼吸|消化|慢病|高血压|糖尿病/.test(dept)) return addDays(today, 30);
  return addDays(today, 14);
}

/** 按诊断列表生成出院指导要点。 */
export function buildGuidance(diagnoses: string[]): string {
  const list = (diagnoses ?? []).map((d) => d.trim()).filter(Boolean);
  if (list.length === 0) return '遵医嘱休息，按时服药，如有不适及时就诊。';
  return `针对 ${list.join('、')}：遵医嘱服药、清淡饮食、规律作息；按复诊日期门诊随访，如有加重及时就诊。`;
}
