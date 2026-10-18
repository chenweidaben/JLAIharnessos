/**
 * 健澜科技 jlmedaios - 可配置病历质控规则引擎（M460 大三甲深度升级）
 *
 * 与 medicalRecordQc.ts 的"硬编码规则"不同，本引擎允许按 category / severity / stage 维度
 * 灵活组合规则集，供质控科室按本院质控口径自定义启用/停用。
 *
 * 纯函数、无 I/O、可重复；AI 辅助结果在聚合器另行合并并标注 source='ai'。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RecordLike } from './medicalRecordQc';

/** 规则类别：首页 / 基础 / 内涵 / 预警 / 自定义 */
export type QcRuleCategory = 'homepage' | 'basic' | 'intrinsic' | 'warning' | 'custom';

/** 严重程度：拦截 / 主要缺陷 / 一般缺陷 */
export type QcRuleSeverity = 'block' | 'major' | 'minor';

/** 质控阶段：事前 / 事中 / 事后 */
export type QcRuleStage = 'pre' | 'during' | 'post';

/** 可配置规则定义 */
export interface QcRule {
  ruleId: string;
  name: string;
  category: QcRuleCategory;
  severity: QcRuleSeverity;
  enabled: boolean;
  stage: QcRuleStage;
  message: string;
  suggestion?: string;
}

/** 规则命中问题 */
export interface QcIssueItem {
  ruleId: string;
  severity: QcRuleSeverity;
  message: string;
  source: 'configurable';
}

/** 规则引擎评估结果 */
export interface QcRulesEvaluation {
  issues: QcIssueItem[];
  score: number;
  enabledCount: number;
  hitCount: number;
}

/**
 * 计算扣分：block 15 / major 8 / minor 3。
 *
 * @param hitCount 各严重程度命中数
 * @returns 扣分
 */
function deduct(hitCount: { block: number; major: number; minor: number }): number {
  return hitCount.block * 15 + hitCount.major * 8 + hitCount.minor * 3;
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

/**
 * 判断某条规则是否命中（按 ruleId 驱动的确定性判定）。
 *
 * @param rule 规则定义
 * @param record 病历
 * @returns 是否命中
 */
function isRuleHit(rule: QcRule, record: RecordLike): boolean {
  const content = record.content ?? {};
  const bodyText = (record.plainText?.trim() || Object.values(content).map(toText).join(' ')).replace(/\s+/g, ' ').trim();
  switch (rule.ruleId) {
    case 'CR-001': return !toText(content.diagnosis).trim();
    case 'CR-002': return !toText(content.admissionDate).trim();
    case 'CR-003': return !record.authorId;
    case 'CR-004': return bodyText.length < 20;
    case 'CR-005': return !toText(content.chiefComplaint).trim();
    case 'CR-006': return !toText(content.admissionNumber).trim();
    default: return false;
  }
}

/**
 * 内置默认规则集（CR-001 起编号，覆盖首页/基础/内涵/预警/自定义五类）。
 *
 * @returns 默认规则数组
 */
export function getDefaultRules(): QcRule[] {
  return [
    { ruleId: 'CR-001', name: '首页诊断缺失', category: 'homepage', severity: 'block', enabled: true, stage: 'pre', message: '首页缺少诊断字段', suggestion: '请补充首页诊断' },
    { ruleId: 'CR-002', name: '首页入院日期缺失', category: 'homepage', severity: 'major', enabled: true, stage: 'pre', message: '首页缺少入院日期', suggestion: '请补充入院日期' },
    { ruleId: 'CR-003', name: '作者签名缺失', category: 'basic', severity: 'major', enabled: true, stage: 'during', message: '病历缺少作者签名信息', suggestion: '请由质控医师本人签名' },
    { ruleId: 'CR-004', name: '全文过短', category: 'basic', severity: 'block', enabled: true, stage: 'during', message: '病历正文过短，不具备质控条件', suggestion: '请补充病历正文内容' },
    { ruleId: 'CR-005', name: '主诉缺失', category: 'intrinsic', severity: 'major', enabled: true, stage: 'during', message: '病历缺少主诉字段', suggestion: '请补充主诉' },
    { ruleId: 'CR-006', name: '住院号缺失', category: 'warning', severity: 'minor', enabled: true, stage: 'post', message: '病历缺少住院号', suggestion: '请关联住院号' },
    { ruleId: 'CR-007', name: '自定义示例规则', category: 'custom', severity: 'minor', enabled: false, stage: 'post', message: '自定义规则（默认停用）' },
  ];
}

/**
 * 评估可配置规则集。
 *
 * @param record 病历
 * @param rules 规则集（缺省使用 getDefaultRules()）
 * @returns 命中问题列表、得分、启用数、命中数
 */
export function evaluateConfigurableRules(record: RecordLike, rules?: QcRule[]): QcRulesEvaluation {
  const activeRules = rules ?? getDefaultRules();
  const enabledRules = activeRules.filter((r) => r.enabled);
  const issues: QcIssueItem[] = [];
  const hitCount = { block: 0, major: 0, minor: 0 };
  for (const rule of enabledRules) {
    if (isRuleHit(rule, record)) {
      issues.push({ ruleId: rule.ruleId, severity: rule.severity, message: rule.message, source: 'configurable' });
      if (rule.severity === 'block') hitCount.block += 1;
      else if (rule.severity === 'major') hitCount.major += 1;
      else hitCount.minor += 1;
    }
  }
  const rawScore = 100 - deduct(hitCount);
  const score = Math.max(0, Math.min(100, rawScore));
  return {
    issues,
    score,
    enabledCount: enabledRules.length,
    hitCount: hitCount.block + hitCount.major + hitCount.minor,
  };
}
