/**
 * 健澜AI原生医院操作系统OS - bff/agents/outpatient/qcRealtime.ts
 *
 * 门诊实时要素质控（4.2.3 qc-realtime 规则节点）五条规则：
 * 主诉-现病史对应、时间线一致性、ICD-诊断-用药匹配、复制粘贴检测、要素完整性。
 * 纯规则离线实现；规则发现供 revise 回退与人工复核，不替代 S-01 输出侧校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import type { FactSnapshot } from '@/security/ai/types.js';
import type {
  DiagnosisEntry,
  EncounterKind,
  OutpatientRecordDraft,
  QcFinding,
  SuggestionEntry,
  TimelineEvent,
} from './types.js';

/** 质控上下文（事实快照来自 HIS/EMR 实时取数，作为一致性比对基准） */
export interface QcContext {
  encounterKind: EncounterKind;
  facts: FactSnapshot;
  timeline: TimelineEvent[];
}

/** 复制粘贴检测默认重复阈值（字符） */
export const COPY_PASTE_THRESHOLD = 80;

/** 诊断方向与兼容用药关键词粗匹配字典（合成占位，不接真实药典） */
const DIAGNOSIS_MEDICATION_MAP: ReadonlyArray<{ diagnosis: string; medications: string[] }> = [
  { diagnosis: '高血压', medications: ['降压', '氨氯地平', '缬沙坦', '美托洛尔', '硝苯地平'] },
  { diagnosis: '糖尿病', medications: ['二甲双胍', '胰岛素', '降糖', '格列美脲', '瑞格列奈'] },
  { diagnosis: '冠心病', medications: ['阿司匹林', '他汀', '美托洛尔', '氯吡格雷'] },
];

/** 初诊必备章节 */
const INITIAL_REQUIRED = [
  ['chiefComplaint', '主诉'],
  ['presentIllness', '现病史'],
  ['historyIllness', '既往史'],
  ['physicalExam', '查体'],
  ['auxiliaryExams', '辅助检查'],
] as const;

/** 复诊必备章节 */
const FOLLOW_UP_REQUIRED = [
  ['presentIllness', '诊疗经过与病情变化'],
  ['physicalExam', '查体'],
  ['auxiliaryExams', '辅助检查'],
  ['historyIllness', '诊断调整记录'],
  ['suggestions', '后续处理'],
] as const;

function nonEmpty(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** 主诉修饰 / 语气 / 时间前缀词表（仅做展示剥离，不改变医学事实） */
const CHIEF_MODIFIER_TOKENS = [
  '反复',
  '间断',
  '阵发性',
  '进行性',
  '逐渐',
  '突然',
  '持续',
  '加重',
  '缓解',
  '伴',
  '无',
  '否认',
  '近期',
  '今天',
  '昨天',
  '前天',
  '上周',
  '本周',
  '年前',
  '个月前',
  '天',
  '周',
  '月',
  '年',
];

/** 剥离时间词与修饰词，提取主诉核心症状文本 */
function extractCoreSymptom(complaint: string): string {
  let text = complaint.replace(/\d+\s*(天|周|月|年)|昨天|今天|前天|上周|本周|年前|个月前/g, '');
  let previous = '';
  while (previous !== text) {
    previous = text;
    for (const token of CHIEF_MODIFIER_TOKENS) {
      text = text.replaceAll(token, '');
    }
  }
  return text.replace(/[，。；、\s]/g, '');
}

/** 1. 主诉-现病史对应：现病史须覆盖主诉核心症状；修饰语未复现不构成误报 */
function checkChiefComplaintCorrespondence(draft: OutpatientRecordDraft): QcFinding[] {
  const findings: QcFinding[] = [];
  if (!nonEmpty(draft.chiefComplaint)) {
    findings.push({
      rule: 'chief-complaint-correspondence',
      severity: 'block',
      message: '主诉缺失，无法构成门诊病历初稿。',
      suggestion: '请先录入主诉（主要不适与持续时间）。',
    });
    return findings;
  }
  if (!nonEmpty(draft.presentIllness)) {
    findings.push({
      rule: 'chief-complaint-correspondence',
      severity: 'caution',
      message: '现病史缺失，未覆盖主诉症状与发病经过。',
      excerpt: draft.chiefComplaint,
      suggestion: '补充现病史，说明症状出现时间、诱因与演变过程。',
    });
    return findings;
  }
  const core = extractCoreSymptom(draft.chiefComplaint);
  if (core.length >= 2) {
    const bigrams = Array.from({ length: core.length - 1 }, (_, index) => core.slice(index, index + 2));
    const missing = bigrams.filter((token) => !draft.presentIllness.includes(token));
    if (missing.length > 0) {
      findings.push({
        rule: 'chief-complaint-correspondence',
        severity: 'caution',
        message: '现病史与主诉核心症状对应关系不足，建议核对症状描述是否一致。',
        excerpt: draft.chiefComplaint,
        suggestion: '现病史应围绕主诉核心症状展开，避免遗漏主要不适。',
      });
    }
  }
  return findings;
}

/** 2. 时间线一致性：与事实快照、归一时间线、日期表述交叉核对 */
function checkTimelineConsistency(
  draft: OutpatientRecordDraft,
  context: QcContext,
): QcFinding[] {
  const findings: QcFinding[] = [];
  const factsDiagnoses = context.facts.diagnoses ?? [];
  if (factsDiagnoses.length > 0 && /否认既往|无相关病史/.test(draft.presentIllness)) {
    findings.push({
      rule: 'timeline-consistency',
      severity: 'block',
      message: `现病史否认既往病史，与事实快照诊断 ${factsDiagnoses.join('、')} 不一致。`,
      suggestion: '核对既往诊断与现病史表述，避免矛盾记录。',
    });
  }
  const datePattern = /(\d{4})-(\d{2})-(\d{2})/;
  for (const section of [draft.presentIllness, draft.auxiliaryExams, draft.historyIllness]) {
    if (!section) continue;
    const match = section.match(datePattern);
    if (!match) continue;
    const year = Number(match[1]);
    if (year < 1900 || year > new Date().getFullYear() + 1) {
      findings.push({
        rule: 'timeline-consistency',
        severity: 'caution',
        message: `日期表述 ${match[0]} 超出合理范围，请核对时间线。`,
        excerpt: match[0],
      });
    }
  }
  if (context.timeline.length === 0 && /天|周|月|加重|缓解/.test(draft.presentIllness)) {
    findings.push({
      rule: 'timeline-consistency',
      severity: 'caution',
      message: '现病史含病程变化描述，但归一时间线为空，建议补录发病时间节点。',
      suggestion: '将症状出现、加重、缓解等节点挂入时间线。',
    });
  }
  return findings;
}

/** 3. ICD-诊断-用药匹配：诊断方向与建议用药粗匹配（合成字典，不接真实药典） */
function checkIcdDiagnosisMedicationMatch(draft: OutpatientRecordDraft, context: QcContext): QcFinding[] {
  const findings: QcFinding[] = [];
  const medicationSuggestions = draft.suggestions.filter((s) => s.kind === 'medication');
  if (medicationSuggestions.length === 0) return findings;

  const diagnosisNames = draft.diagnosis.map((d: DiagnosisEntry) => d.name);
  if (diagnosisNames.length === 0) {
    findings.push({
      rule: 'icd-diagnosis-medication-match',
      severity: 'caution',
      message: '用药建议缺少明确诊断方向依据，请补充诊断后再核实用药建议。',
      excerpt: medicationSuggestions.map((s: SuggestionEntry) => s.content).join('；'),
    });
    return findings;
  }

  for (const suggestion of medicationSuggestions) {
    const compatible = DIAGNOSIS_MEDICATION_MAP.filter((entry) =>
      diagnosisNames.some((name) => name.includes(entry.diagnosis)),
    );
    if (compatible.length === 0) continue;
    const compatibleText = compatible.flatMap((entry) => entry.medications);
    const matched = compatibleText.some((keyword) => suggestion.content.includes(keyword));
    if (!matched) {
      findings.push({
        rule: 'icd-diagnosis-medication-match',
        severity: 'caution',
        message: `诊断方向（${diagnosisNames.join('、')}）与用药建议「${suggestion.content}」粗匹配未通过，请医师核对。`,
        excerpt: suggestion.content,
        suggestion: '用药建议应与诊断方向一致，必要时补充药品通用名与剂量依据。',
      });
    }
  }

  // 与事实快照在用药物方向交叉核对
  const knownMedications = context.facts.medications ?? [];
  for (const diagnosis of draft.diagnosis) {
    const compatible = DIAGNOSIS_MEDICATION_MAP.find((entry) => diagnosis.name.includes(entry.diagnosis));
    if (!compatible) continue;
    const hasKnownMatch = knownMedications.some((med) => compatible.medications.some((keyword) => med.includes(keyword)));
    if (!hasKnownMatch && knownMedications.length > 0) {
      findings.push({
        rule: 'icd-diagnosis-medication-match',
        severity: 'caution',
        message: `诊断「${diagnosis.name}」与快照在用药物方向未形成对应关系，请核对用药历史。`,
        excerpt: knownMedications.join('、'),
      });
    }
  }
  return findings;
}

/** 4. 复制粘贴检测：跨章节 80 字以上重复片段检出 */
function checkCopyPaste(draft: OutpatientRecordDraft): QcFinding[] {
  const sections: Array<[string, string]> = [
    ['主诉', draft.chiefComplaint],
    ['现病史', draft.presentIllness],
    ['既往史', draft.historyIllness],
    ['查体', draft.physicalExam],
    ['辅助检查', draft.auxiliaryExams],
  ];
  const findings: QcFinding[] = [];
  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const [labelA, textA] = sections[i];
      const [labelB, textB] = sections[j];
      if (!textA || !textB) continue;
      const repeated = longestCommonSubstring(textA, textB);
      if (repeated.length >= COPY_PASTE_THRESHOLD) {
        findings.push({
          rule: 'copy-paste-detection',
          severity: 'caution',
          message: `「${labelA}」与「${labelB}」存在 ${repeated.length} 字以上重复片段，疑似复制粘贴。`,
          excerpt: repeated.slice(0, 120),
          suggestion: '按章节分别组织内容，删除跨章节重复表述。',
        });
      }
    }
  }
  return findings;
}

/** 5. 要素完整性：按就诊类型核对必备章节（对照 S-01 format-completeness，仅 CAUTION 供人工复核） */
function checkElementCompleteness(draft: OutpatientRecordDraft, context: QcContext): QcFinding[] {
  const required = context.encounterKind === 'initial' ? INITIAL_REQUIRED : FOLLOW_UP_REQUIRED;
  const findings: QcFinding[] = [];
  for (const [field, label] of required) {
    const value = field === 'suggestions' ? draft.suggestions.map((s) => s.content).join('；') : draft[field];
    if (!nonEmpty(String(value))) {
      findings.push({
        rule: 'element-completeness',
        severity: 'caution',
        message: `必备章节「${label}」缺失或为空，建议补充后再提交。`,
        suggestion: `补全「${label}」相关内容，要素缺项同时进入 missingInfo 清单。`,
      });
    }
  }
  return findings;
}

/** 最长公共子串（复制粘贴检测使用） */
function longestCommonSubstring(a: string, b: string): string {
  if (!a || !b) return '';
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  let best = 0;
  let end = 0;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
        if (dp[i][j] > best) {
          best = dp[i][j];
          end = i;
        }
      }
    }
  }
  return a.slice(end - best, end);
}

/** 运行五条实时质控规则，返回全部发现（按规则顺序排列） */
export function runQcRealtime(draft: OutpatientRecordDraft, context: QcContext): QcFinding[] {
  return [
    ...checkChiefComplaintCorrespondence(draft),
    ...checkTimelineConsistency(draft, context),
    ...checkIcdDiagnosisMedicationMatch(draft, context),
    ...checkCopyPaste(draft),
    ...checkElementCompleteness(draft, context),
  ];
}
