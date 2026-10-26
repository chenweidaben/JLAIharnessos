/**
 * 健澜AI原生医院操作系统OS - bff/agents/inpatient/documentTemplates.ts
 *
 * 七类住院文书模板与时限规则引擎（4.3.1 / 4.3.2）：
 * 入院记录 24h、首次病程 8h、日常病程按病情分级频次、阶段小结 30 天或病情突变、
 * 出院记录出院后规定时限；规则仅产出提醒，不替代医师制度判断。
 *
 * 纯函数离线实现；院方制度参数校准与三级查房真实规则库接线列入未闭环项。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { EXPERT_REVIEW_ROLE, PHYSICIAN_CONFIRM_ROLE } from '@/bff/agents/agentAdmission.js';
import type {
  DocumentSections,
  DocumentType,
  ScheduleContext,
  ScheduleReminder,
  ScheduleStatus,
  SeverityLevel,
  TimelineNode,
} from './types.js';

/** 七类文书模板：中文必备章节与默认确认角色 */
export interface DocumentTemplate {
  type: DocumentType;
  label: string;
  sections: string[];
  defaultReviewRole: string;
}

/** 日常病程默认时间间隔（小时）：病危/病重 24h，稳定 72h */
const DAILY_PROGRESS_HOURS: Record<Exclude<SeverityLevel, 'critical'> | 'critical', number> = {
  critical: 24,
  serious: 24,
  stable: 72,
};

/** 出院记录默认时限（小时）；院方制度校准列入未闭环项 */
export const DISCHARGE_DEADLINE_HOURS = 24;

/** 临期阈值（小时，合成参数） */
export const DUE_SOON_HOURS = 2;

/** 长住院关键节点关键词（危急值、手术、过敏、输血、抢救、诊断变更等强制保留） */
const CRITICAL_NODE_PATTERN =
  /诊断变更|初步诊断调整|手术|急诊手术|危急值|过敏|输血|抢救|转入|转出|病危|病重|死亡|并发症|重大事件/;

export const DOCUMENT_TEMPLATES: Record<DocumentType, DocumentTemplate> = {
  'admission-record': {
    type: 'admission-record',
    label: '入院记录',
    sections: ['主诉', '现病史', '既往史', '体格检查', '辅助检查', '初步诊断', '入院计划'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'first-progress': {
    type: 'first-progress',
    label: '首次病程记录',
    sections: ['病例特点', '初步诊断', '诊断依据', '鉴别诊断', '诊疗计划'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'daily-progress': {
    type: 'daily-progress',
    label: '日常病程记录',
    sections: ['病情变化', '查体', '辅助检查', '诊疗调整', '下一步安排'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'senior-round': {
    type: 'senior-round',
    label: '上级医师查房记录',
    sections: ['查房意见', '病情分析', '诊断调整', '诊疗方案', '注意事项'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'stage-summary': {
    type: 'stage-summary',
    label: '阶段小结',
    sections: ['入院情况', '诊疗经过', '当前诊断', '病情评估', '下一阶段计划'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'discharge-record': {
    type: 'discharge-record',
    label: '出院记录',
    sections: ['入院诊断', '出院诊断', '诊疗经过', '出院情况', '出院医嘱', '随访安排'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
  'comprehensive-analysis': {
    type: 'comprehensive-analysis',
    label: '病情综合分析',
    sections: ['病情摘要', '检验检查解读', '诊断评估', '风险提示', '后续建议'],
    defaultReviewRole: PHYSICIAN_CONFIRM_ROLE,
  },
};

/** 获取文书模板；未知类型返回 undefined，由 Schema 校验层拦截 */
export function getDocumentTemplate(type: DocumentType): DocumentTemplate | undefined {
  return DOCUMENT_TEMPLATES[type];
}

/**
 * 按 S-06 口径判定确认角色：
 * 仅上级查房记录中存在诊疗方案调整建议时走 expert-review，其余六类走 physician-confirm。
 */
export function reviewRoleFor(documentType: DocumentType, treatmentPlanAdjustment: boolean): string {
  if (documentType === 'senior-round' && treatmentPlanAdjustment) return EXPERT_REVIEW_ROLE;
  return PHYSICIAN_CONFIRM_ROLE;
}

/** 返回当前文书缺失的必备章节名 */
export function missingDocumentSections(sections: DocumentSections, type: DocumentType): string[] {
  const template = DOCUMENT_TEMPLATES[type];
  if (!template) return ['未识别文书类型'];
  return template.sections.filter((section) => !(sections[section] ?? '').trim());
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function deadlineLabel(hours: number): string {
  return hours >= 24 ? `${Math.round(hours / 24)} 天` : `${hours} 小时`;
}

function statusFromDeadline(now: Date, deadline: Date, missing: boolean): ScheduleStatus {
  if (missing) return 'missing-context';
  if (now.getTime() > deadline.getTime()) return 'overdue';
  const remainMs = deadline.getTime() - now.getTime();
  if (remainMs <= DUE_SOON_HOURS * 60 * 60 * 1000) return 'dueSoon';
  return 'onTime';
}

/** 计算单类文书时限状态；缺少时间上下文时返回 missing-context，不抛异常 */
export function evaluateSchedule(context: ScheduleContext): ScheduleReminder {
  const template = DOCUMENT_TEMPLATES[context.documentType];
  const now = parseDate(context.currentTime);

  if (!now) {
    return {
      documentType: context.documentType,
      status: 'missing-context',
      rule: 'current-time-required',
      message: '缺少当前时间上下文，无法计算时限状态。',
    };
  }

  if (context.documentType === 'admission-record') {
    const admission = parseDate(context.admissionTime);
    if (!admission) {
      return {
        documentType: context.documentType,
        status: 'missing-context',
        rule: 'admission-time-required',
        message: '缺少入院时间，无法核对入院记录 24 小时时限。',
      };
    }
    const deadline = new Date(admission.getTime() + 24 * 60 * 60 * 1000);
    const status = statusFromDeadline(now, deadline, false);
    return {
      documentType: context.documentType,
      status,
      rule: 'admission-24h',
      deadline: deadline.toISOString(),
      message: `入院记录应于入院后 24 小时内完成；当前状态：${statusLabel(status)}。`,
    };
  }

  if (context.documentType === 'first-progress') {
    const admission = parseDate(context.admissionTime);
    if (!admission) {
      return {
        documentType: context.documentType,
        status: 'missing-context',
        rule: 'admission-time-required',
        message: '缺少入院时间，无法核对首次病程 8 小时时限。',
      };
    }
    const deadline = new Date(admission.getTime() + 8 * 60 * 60 * 1000);
    const status = statusFromDeadline(now, deadline, false);
    return {
      documentType: context.documentType,
      status,
      rule: 'first-progress-8h',
      deadline: deadline.toISOString(),
      message: `首次病程应于入院后 8 小时内完成；当前状态：${statusLabel(status)}。`,
    };
  }

  if (context.documentType === 'daily-progress') {
    const base = parseDate(context.lastProgressTime) ?? parseDate(context.admissionTime);
    if (!base) {
      return {
        documentType: context.documentType,
        status: 'missing-context',
        rule: 'progress-base-time-required',
        message: '缺少最近病程记录时间或入院时间，无法核对日常病程频次。',
      };
    }
    const severity = context.severityLevel ?? 'stable';
    const hours = DAILY_PROGRESS_HOURS[severity];
    const deadline = new Date(base.getTime() + hours * 60 * 60 * 1000);
    const status = statusFromDeadline(now, deadline, false);
    return {
      documentType: context.documentType,
      status,
      rule: `daily-progress-${severity}-${hours}h`,
      deadline: deadline.toISOString(),
      message: `病情分级为${severityLabel(severity)}，日常病程间隔应不超过 ${deadlineLabel(hours)}；当前状态：${statusLabel(status)}。`,
    };
  }

  if (context.documentType === 'stage-summary') {
    const admission = parseDate(context.admissionTime);
    if (!admission) {
      return {
        documentType: context.documentType,
        status: 'missing-context',
        rule: 'admission-time-required',
        message: '缺少入院时间，无法核对住院满 30 天阶段小结时限。',
      };
    }
    const deadline = new Date(admission.getTime() + 30 * 24 * 60 * 60 * 1000);
    let status = statusFromDeadline(now, deadline, false);
    let rule = 'stage-summary-30d';
    let message = `住院满 30 天应完成阶段小结；当前状态：${statusLabel(status)}。`;
    if (context.keyEventTime && status === 'onTime') {
      status = 'dueSoon';
      rule = 'stage-summary-key-event';
      message = '出现病情突变关键事件，应及时补记阶段小结。';
    }
    return { documentType: context.documentType, status, rule, deadline: deadline.toISOString(), message };
  }

  if (context.documentType === 'discharge-record') {
    const discharge = parseDate(context.dischargeTime);
    if (!discharge) {
      return {
        documentType: context.documentType,
        status: 'missing-context',
        rule: 'discharge-time-required',
        message: '缺少出院时间，无法核对出院记录完成时限。',
      };
    }
    const deadline = new Date(discharge.getTime() + DISCHARGE_DEADLINE_HOURS * 60 * 60 * 1000);
    const status = statusFromDeadline(now, deadline, false);
    return {
      documentType: context.documentType,
      status,
      rule: `discharge-${DISCHARGE_DEADLINE_HOURS}h`,
      deadline: deadline.toISOString(),
      message: `出院记录应于出院后 ${DISCHARGE_DEADLINE_HOURS} 小时内完成；当前状态：${statusLabel(status)}。`,
    };
  }

  return {
    documentType: context.documentType,
    status: 'onTime',
    rule: 'no-fixed-deadline',
    message: '病情综合分析无固定时限，按查房与诊疗安排生成辅助参考。',
  };
}

function statusLabel(status: ScheduleStatus): string {
  switch (status) {
    case 'onTime':
      return '按时';
    case 'dueSoon':
      return '临期';
    case 'overdue':
      return '逾期';
    default:
      return '缺少上下文';
  }
}

function severityLabel(severity: SeverityLevel): string {
  if (severity === 'critical') return '病危';
  if (severity === 'serious') return '病重';
  return '病情稳定';
}

/**
 * 长住院时间线折叠：关键诊断变更、手术、危急值、过敏、输血、抢救等节点强制保留；
 * 普通病程节点可折叠，首节点与末节点保留以维持时间线边界。
 */
export function collapseTimelineForSummary(nodes: TimelineNode[], options?: { criticalOnly?: boolean }): TimelineNode[] {
  if (nodes.length <= 2) return nodes.map((node) => ({ ...node }));
  const critical = nodes.filter((node) => CRITICAL_NODE_PATTERN.test(node.event));
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  const retained = new Map<string, TimelineNode>();
  if (!options?.criticalOnly) {
    for (const node of [first, last]) retained.set(`${node.time}|${node.event}`, node);
  }
  for (const node of critical) retained.set(`${node.time}|${node.event}`, node);
  return [...retained.values()].sort((a, b) => a.time.localeCompare(b.time)).map((node) => ({ ...node }));
}
