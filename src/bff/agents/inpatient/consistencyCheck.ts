/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/consistencyCheck.ts
 *
 * 住院病历一致性校验（4.3.2 consistency-check）：主诉/现病史与诊断方向对应、
 * 查体与诊断不矛盾、医嘱/用药与诊断粗匹配、检验检查结论被引用且方向一致。
 * 纯规则离线实现；真实药典、ICD 与护理医嘱字典接线列入未闭环项。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type {
  ConsistencyFinding,
  InpatientDraft,
} from './types.js';

/** 一致性校验补充上下文 */
export interface ConsistencyContext {
  facts: FactSnapshot;
  orders?: string[];
  examResults?: string[];
}

/** 合成诊断-用药粗匹配表（离线展示口径，不接真实药典） */
const DIAGNOSIS_MEDICATION_FAMILY: ReadonlyArray<{ diagnosis: string; family: string }> = [
  { diagnosis: '高血压', family: '降压' },
  { diagnosis: '糖尿病', family: '降糖' },
  { diagnosis: '肺炎', family: '抗菌' },
  { diagnosis: '肺部感染', family: '抗菌' },
  { diagnosis: '冠心病', family: '抗血小板' },
];

const CITATION_MARKER_PATTERN = /\[\d+(?:-\d+)?\]/;

function normalizeText(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, '');
}

function sharedTokens(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (b.includes(a)) return true;
  if (a.includes(b)) return true;
  for (let i = 0; i + 2 <= a.length; i += 1) {
    const token = a.slice(i, i + 2);
    if (b.includes(token)) return true;
  }
  return false;
}

function checkComplaintCorrespondence(draft: InpatientDraft): ConsistencyFinding[] {
  const complaint = normalizeText(draft.chiefComplaint);
  if (!complaint) return [];
  const diagnosisText = draft.diagnosis.map((item) => item.name).join('');
  if (!diagnosisText) {
    return [
      {
        rule: 'complaint-diagnosis',
        severity: 'caution',
        message: '主诉存在，但诊断方向尚未形成，需补充诊断依据。',
        excerpt: draft.chiefComplaint,
        suggestion: '请结合现病史、查体与辅助检查补充初步诊断方向。',
      },
    ];
  }
  if (!sharedTokens(complaint, diagnosisText)) {
    return [
      {
        rule: 'complaint-diagnosis',
        severity: 'caution',
        message: '主诉症状与诊断方向未形成对应关系，请复核是否漏列或误列诊断。',
        excerpt: `主诉：${draft.chiefComplaint}；诊断：${diagnosisText}`,
        suggestion: '请确认诊断名称是否覆盖主诉核心症状，必要时补充鉴别诊断。',
      },
    ];
  }
  return [];
}

function checkPhysicalExamConsistency(draft: InpatientDraft, facts: FactSnapshot): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const snapshotDiagnoses = facts.diagnoses ?? [];
  const deniedText = [draft.historyIllness, draft.physicalExam, draft.presentIllness]
    .map((text) => normalizeText(text))
    .join('；');
  for (const diagnosis of snapshotDiagnoses) {
    if (!diagnosis) continue;
    const denied = deniedText.includes(`否认${diagnosis}`) || deniedText.includes(`无${diagnosis}`);
    if (denied) {
      findings.push({
        rule: 'physical-exam-diagnosis',
        severity: 'block',
        message: `事实快照中的「${diagnosis}」在病历中被否认，存在查体/既往史与快照矛盾。`,
        excerpt: diagnosis,
        suggestion: '请复核事实快照、既往史与查体记录，消除矛盾后再提交。',
      });
    }
  }
  return findings;
}

function checkOrdersDiagnosisMatch(draft: InpatientDraft, context: ConsistencyContext): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const ordersText = [...(context.orders ?? []), draft.orders, ...draft.suggestions.map((item) => item.content)]
    .map((item) => normalizeText(item))
    .join('；');
  if (!ordersText) return findings;

  for (const diagnosis of draft.diagnosis) {
    for (const rule of DIAGNOSIS_MEDICATION_FAMILY) {
      if (!diagnosis.name.includes(rule.diagnosis)) continue;
      const expectsFamily = ordersText.includes(rule.family);
      const explicitlyStopsFamily = ordersText.includes(`停用${rule.family}`) || ordersText.includes(`禁用${rule.family}`);
      if (explicitlyStopsFamily) {
        findings.push({
          rule: 'orders-diagnosis',
          severity: 'caution',
          message: `诊断「${diagnosis.name}」与医嘱中${rule.family}类用药方向存在明显冲突，请复核。`,
          excerpt: diagnosis.name,
          suggestion: '请核对诊断依据、用药禁忌与医嘱调整记录。',
        });
      } else if (!expectsFamily) {
        findings.push({
          rule: 'orders-diagnosis',
          severity: 'info',
          message: `诊断「${diagnosis.name}」对应的${rule.family}类处理方向尚未在医嘱中体现，供查房复核。`,
          excerpt: diagnosis.name,
          suggestion: '请结合诊疗计划确认是否已开具对应处理措施。',
        });
      }
    }
  }
  return findings;
}

function checkExamResultCitation(draft: InpatientDraft, context: ConsistencyContext): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const examText = [draft.auxiliaryExams, ...(context.examResults ?? [])]
    .map((text) => normalizeText(text))
    .join('；');
  const conclusionPattern = /提示|考虑|符合|提示异常|考虑诊断|支持诊断/;
  if (!conclusionPattern.test(examText)) return findings;

  const allText = [draft.chiefComplaint, draft.presentIllness, draft.auxiliaryExams, draft.physicalExam]
    .map((text) => normalizeText(text))
    .join('；');
  if (!CITATION_MARKER_PATTERN.test(allText) && draft.citations.length === 0) {
    findings.push({
      rule: 'exam-result-citation',
      severity: 'caution',
      message: '检验检查结论性表述未挂引用编号，证据链不完整。',
      excerpt: draft.auxiliaryExams,
      suggestion: '请为检验检查结论补充来源引用编号，或标注待核实。',
    });
  }
  return findings;
}

function checkTimelineConsistency(draft: InpatientDraft, facts: FactSnapshot): ConsistencyFinding[] {
  const findings: ConsistencyFinding[] = [];
  const snapshotDiagnoses = facts.diagnoses ?? [];
  const draftText = [draft.historyIllness, draft.presentIllness, draft.physicalExam, draft.auxiliaryExams]
    .map((text) => normalizeText(text))
    .join('；');
  const draftDiagnosisText = draft.diagnosis.map((item) => item.name).join('');
  for (const diagnosis of snapshotDiagnoses) {
    if (!diagnosis) continue;
    const reflected = draftText.includes(diagnosis) || draftDiagnosisText.includes(diagnosis);
    if (!reflected && draftText.includes('否认既往诊断')) {
      findings.push({
        rule: 'timeline-consistency',
        severity: 'block',
        message: `事实快照诊断「${diagnosis}」未在时间线中体现，且既往史被整体否认，存在时间线矛盾。`,
        excerpt: diagnosis,
        suggestion: '请按入院记录、病程记录与检验检查节点重建患者时间线。',
      });
    }
  }
  return findings;
}

/** 执行住院病历一致性校验；返回全部发现（不抛异常） */
export function runConsistencyCheck(draft: InpatientDraft, context: ConsistencyContext): ConsistencyFinding[] {
  return [
    ...checkComplaintCorrespondence(draft),
    ...checkPhysicalExamConsistency(draft, context.facts),
    ...checkOrdersDiagnosisMatch(draft, context),
    ...checkExamResultCitation(draft, context),
    ...checkTimelineConsistency(draft, context.facts),
  ];
}
