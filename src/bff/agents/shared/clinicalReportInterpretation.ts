/**
 * 健澜AI原生医院操作系统OS - bff/agents/shared/clinicalReportInterpretation.ts
 *
 * 门诊 / 住院共用单一报告解读组件（4.2 节 S-09 落地，S-10 住院包直接复用，
 * 禁止在住院侧重复实现）：异常标注、危急值清单、医生 / 患者双版本措辞、
 * 固定免责声明；无引用证据时 evidenceLevel='none' 并附「（待核实）」口径。
 *
 * 纯函数离线实现，不接真实检验检查系统与大模型。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Citation } from '@/knowledge-platform/citation/citationProtocol.js';
import type { EvidenceLevel } from '@/security/ai/types.js';

/** 报告类别：检验 / 影像 / 检查 */
export type ReportKind = 'lab' | 'imaging' | 'exam';

/** 异常方向标记 */
export type AbnormalFlag = 'high' | 'low' | 'critical' | 'normal';

/** 单条报告项目 */
export interface ReportItem {
  item: string;
  value: string;
  referenceRange?: string;
  abnormalFlag?: AbnormalFlag;
}

/** 解读输入 */
export interface ClinicalInterpretationInput {
  reportKind: ReportKind;
  items: ReportItem[];
  focus?: string;
  audience: 'doctor' | 'patient';
  citations: Citation[];
}

/** 异常发现条目 */
export interface AbnormalFinding {
  item: string;
  value: string;
  referenceRange?: string;
  direction: Exclude<AbnormalFlag, 'normal'>;
  critical: boolean;
  plainLanguageNote: string;
}

/** 解读结果 */
export interface ClinicalInterpretationResult {
  summary: string;
  abnormalFindings: AbnormalFinding[];
  criticalAlerts: string[];
  recommendations: string[];
  disclaimer: string;
  citations: Citation[];
  evidenceLevel: EvidenceLevel;
}

/** 固定免责声明（医疗辅助口径，门诊 / 住院两侧一致） */
export const CLINICAL_INTERPRETATION_DISCLAIMER =
  '本解读为辅助参考，不作为诊断依据；请以执业医师判断为准。';

const DIRECTION_LABEL: Record<Exclude<AbnormalFlag, 'normal'>, string> = {
  high: '偏高',
  low: '偏低',
  critical: '危急',
};

function professionalNote(item: ReportItem, direction: Exclude<AbnormalFlag, 'normal'>): string {
  const range = item.referenceRange ? `（参考范围 ${item.referenceRange}）` : '';
  return `${item.item} ${item.value}${range}，方向${DIRECTION_LABEL[direction]}，建议结合临床指征与既往结果复核。`;
}

function patientNote(item: ReportItem, direction: Exclude<AbnormalFlag, 'normal'>): string {
  const verb = direction === 'low' ? '低于' : '高于';
  const range = item.referenceRange ? `（参考范围 ${item.referenceRange}）` : '';
  return `${item.item} 的数值为 ${item.value}，${verb}参考范围${range}。此项仅作提示，请勿自行判断或自行用药，由医生结合您的整体情况解释。`;
}

function recommendationFor(finding: AbnormalFinding, audience: 'doctor' | 'patient'): string {
  if (finding.direction === 'critical') {
    return audience === 'doctor'
      ? `危急值「${finding.item} = ${finding.value}」：请立即复核标本与结果，通知值班医师按危急值流程处置。`
      : `您的报告中有一项危急指标（${finding.item}），请留在诊区等待医生当面告知处置安排。`;
  }
  if (finding.direction === 'high') {
    return audience === 'doctor'
      ? `建议复核「${finding.item}」，结合症状、既往结果与相关检查进一步判断。`
      : `「${finding.item}」偏高，请勿自行判断或自行用药，建议按医生安排复查或补充检查。`;
  }
  return audience === 'doctor'
    ? `建议关注「${finding.item}」偏低项，结合营养、用药与病史复核原因。`
    : `「${finding.item}」偏低，请勿自行判断，按医生建议安排复查，日常注意休息与饮食配合。`;
}

/**
 * 解读报告：异常项分组、危急值单列、双版本措辞；无引用时证据级别为 none，
 * 摘要追加「（待核实）」标记，不输出确定性诊断结论。
 */
export function interpretClinicalReport(input: ClinicalInterpretationInput): ClinicalInterpretationResult {
  const abnormalFindings: AbnormalFinding[] = [];
  const criticalAlerts: string[] = [];
  const recommendations: string[] = [];

  for (const item of input.items) {
    const flag = item.abnormalFlag ?? 'normal';
    if (flag === 'normal') continue;
    const direction = flag;
    const critical = flag === 'critical';
    const note = input.audience === 'doctor' ? professionalNote(item, direction) : patientNote(item, direction);
    const finding: AbnormalFinding = {
      item: item.item,
      value: item.value,
      referenceRange: item.referenceRange,
      direction,
      critical,
      plainLanguageNote: note,
    };
    abnormalFindings.push(finding);
    if (critical) {
      const range = item.referenceRange ? `（参考 ${item.referenceRange}）` : '';
      criticalAlerts.push(`危急值提醒：${item.item} = ${item.value}${range}，请立即通知值班医师处置。`);
    }
    recommendations.push(recommendationFor(finding, input.audience));
  }

  const evidenceLevel: EvidenceLevel = input.citations.length === 0 ? 'none' : 'supported';
  const focusClause = input.focus ? `，关注主题：${input.focus}` : '';
  const kindLabel = input.reportKind === 'lab' ? '检验报告' : input.reportKind === 'imaging' ? '影像报告' : '检查报告';

  let summary: string;
  if (input.audience === 'doctor') {
    summary = `${kindLabel}${focusClause}：共 ${input.items.length} 项，异常 ${abnormalFindings.length} 项，危急 ${criticalAlerts.length} 项；异常清单与复核建议见下文。`;
  } else {
    summary = abnormalFindings.length === 0
      ? `本次${kindLabel}未见标注异常的项目${focusClause}。解读仅供参考，具体请遵医嘱。`
      : `本次${kindLabel}有 ${abnormalFindings.length} 项需要医生重点关注${focusClause}，下面用通俗语言逐项说明。`;
  }

  if (evidenceLevel === 'none') {
    summary = `（待核实）${summary}本解读未挂载权威知识引用，相关结论需医师结合资料核实后采用。`;
  }

  return {
    summary,
    abnormalFindings,
    criticalAlerts,
    recommendations,
    disclaimer: CLINICAL_INTERPRETATION_DISCLAIMER,
    citations: input.citations,
    evidenceLevel,
  };
}
