/**
 * S-10 文书模板、时限规则与时间线折叠单测（4.3.1 / 4.3.2 / 4.3.5）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'bun:test';
import {
  DOCUMENT_TEMPLATES,
  collapseTimelineForSummary,
  evaluateSchedule,
  getDocumentTemplate,
  missingDocumentSections,
  reviewRoleFor,
} from '@/bff/agents/inpatient/documentTemplates.js';
import type { DocumentType, TimelineNode } from '@/bff/agents/inpatient/types.js';

const ALL_DOCUMENT_TYPES: DocumentType[] = [
  'admission-record',
  'first-progress',
  'daily-progress',
  'senior-round',
  'stage-summary',
  'discharge-record',
  'comprehensive-analysis',
];

describe('七类住院文书模板', () => {
  it('每类文书均定义非空必备章节清单', () => {
    for (const type of ALL_DOCUMENT_TYPES) {
      const template = getDocumentTemplate(type);
      expect(template).toBeTruthy();
      expect(template!.sections.length).toBeGreaterThan(0);
    }
  });

  it('章节清单与 4.3.1 七类文书口径一致', () => {
    expect(DOCUMENT_TEMPLATES['admission-record'].sections).toContain('初步诊断');
    expect(DOCUMENT_TEMPLATES['first-progress'].sections).toContain('鉴别诊断');
    expect(DOCUMENT_TEMPLATES['daily-progress'].sections).toContain('病情变化');
    expect(DOCUMENT_TEMPLATES['senior-round'].sections).toContain('诊疗方案');
    expect(DOCUMENT_TEMPLATES['stage-summary'].sections).toContain('下一阶段计划');
    expect(DOCUMENT_TEMPLATES['discharge-record'].sections).toContain('出院医嘱');
    expect(DOCUMENT_TEMPLATES['comprehensive-analysis'].sections).toContain('检验检查解读');
  });

  it('缺失章节返回待补充清单；章节齐备时返回空数组', () => {
    const missing = missingDocumentSections({ 主诉: '', 现病史: '患者咳嗽 3 天。' }, 'admission-record');
    expect(missing).toContain('主诉');
    expect(missing).not.toContain('现病史');
    expect(
      missingDocumentSections(
        {
          主诉: '咳嗽 3 天',
          现病史: '现病史内容',
          既往史: '既往史内容',
          体格检查: '查体内容',
          辅助检查: '检查内容',
          初步诊断: '诊断方向',
          入院计划: '计划内容',
        },
        'admission-record',
      ),
    ).toEqual([]);
  });
});

describe('人工确认角色分级（S-06 口径）', () => {
  it('上级查房存在方案调整建议时走 expert-review', () => {
    expect(reviewRoleFor('senior-round', true)).toBe('expert-review');
  });

  it('上级查房无方案调整建议时走 physician-confirm', () => {
    expect(reviewRoleFor('senior-round', false)).toBe('physician-confirm');
  });

  it('其余六类文书均走 physician-confirm', () => {
    for (const type of ALL_DOCUMENT_TYPES.filter((item) => item !== 'senior-round')) {
      expect(reviewRoleFor(type, true)).toBe('physician-confirm');
    }
  });
});

describe('时限规则引擎', () => {
  it('入院记录 24h 内为 onTime', () => {
    const reminder = evaluateSchedule({
      documentType: 'admission-record',
      admissionTime: '2026-10-26T08:00:00+08:00',
      currentTime: '2026-10-26T09:00:00+08:00',
    });
    expect(reminder.status).toBe('onTime');
  });

  it('入院记录临期 2h 内为 dueSoon', () => {
    const reminder = evaluateSchedule({
      documentType: 'admission-record',
      admissionTime: '2026-10-25T08:00:00+08:00',
      currentTime: '2026-10-26T07:30:00+08:00',
    });
    expect(reminder.status).toBe('dueSoon');
  });

  it('首次病程 8h 内为 onTime，超过 8h 为 overdue', () => {
    const onTime = evaluateSchedule({
      documentType: 'first-progress',
      admissionTime: '2026-10-26T08:00:00+08:00',
      currentTime: '2026-10-26T12:00:00+08:00',
    });
    expect(onTime.status).toBe('onTime');
    const overdue = evaluateSchedule({
      documentType: 'first-progress',
      admissionTime: '2026-10-26T08:00:00+08:00',
      currentTime: '2026-10-26T17:00:00+08:00',
    });
    expect(overdue.status).toBe('overdue');
  });

  it('病危/病重日常病程间隔超过 24h 为 overdue，稳定患者超过 72h 为 overdue', () => {
    const criticalOverdue = evaluateSchedule({
      documentType: 'daily-progress',
      severityLevel: 'critical',
      lastProgressTime: '2026-10-25T08:00:00+08:00',
      currentTime: '2026-10-26T15:00:00+08:00',
    });
    expect(criticalOverdue.status).toBe('overdue');

    const stableOverdue = evaluateSchedule({
      documentType: 'daily-progress',
      severityLevel: 'stable',
      lastProgressTime: '2026-10-23T08:00:00+08:00',
      currentTime: '2026-10-26T10:00:00+08:00',
    });
    expect(stableOverdue.status).toBe('overdue');
  });

  it('稳定患者日常病程临期为 dueSoon', () => {
    const reminder = evaluateSchedule({
      documentType: 'daily-progress',
      severityLevel: 'stable',
      lastProgressTime: '2026-10-23T09:30:00+08:00',
      currentTime: '2026-10-26T09:00:00+08:00',
    });
    expect(reminder.status).toBe('dueSoon');
  });

  it('阶段小结住院满 30 天为 overdue；病情突变在未满 30 天时触发 dueSoon', () => {
    const overdue = evaluateSchedule({
      documentType: 'stage-summary',
      admissionTime: '2026-09-20T09:00:00+08:00',
      currentTime: '2026-10-26T09:00:00+08:00',
    });
    expect(overdue.status).toBe('overdue');

    const keyEvent = evaluateSchedule({
      documentType: 'stage-summary',
      admissionTime: '2026-10-20T09:00:00+08:00',
      currentTime: '2026-10-26T09:00:00+08:00',
      keyEventTime: '2026-10-26T06:00:00+08:00',
    });
    expect(keyEvent.status).toBe('dueSoon');
  });

  it('出院记录出院后 24h 内为 onTime，超时为 overdue', () => {
    const onTime = evaluateSchedule({
      documentType: 'discharge-record',
      dischargeTime: '2026-10-26T08:00:00+08:00',
      currentTime: '2026-10-26T09:00:00+08:00',
    });
    expect(onTime.status).toBe('onTime');
    const overdue = evaluateSchedule({
      documentType: 'discharge-record',
      dischargeTime: '2026-10-25T08:00:00+08:00',
      currentTime: '2026-10-26T10:00:00+08:00',
    });
    expect(overdue.status).toBe('overdue');
  });

  it('缺少时间上下文进入 missing-context，不抛异常', () => {
    const missingCurrent = evaluateSchedule({ documentType: 'admission-record' });
    expect(missingCurrent.status).toBe('missing-context');
    const missingDischarge = evaluateSchedule({
      documentType: 'discharge-record',
      currentTime: '2026-10-26T09:00:00+08:00',
    });
    expect(missingDischarge.status).toBe('missing-context');
  });
});

describe('长住院时间线折叠', () => {
  it('手术、危急值等关键节点强制保留，普通病程可折叠', () => {
    const nodes: TimelineNode[] = [
      { time: '2026-10-01T08:00:00+08:00', event: '办理入院', source: 'admission-record' },
      { time: '2026-10-02T09:00:00+08:00', event: '普通日常病程：自觉症状平稳', source: 'daily-progress' },
      { time: '2026-10-05T11:00:00+08:00', event: '急诊手术：阑尾切除术', source: 'operation-record' },
      { time: '2026-10-08T07:30:00+08:00', event: '普通日常病程：饮食恢复中', source: 'daily-progress' },
      { time: '2026-10-12T20:00:00+08:00', event: '危急值提醒：血钾 2.8 mmol/L', source: 'lab-report' },
      { time: '2026-10-20T10:00:00+08:00', event: '出院前复查平稳', source: 'discharge-record' },
    ];
    const retained = collapseTimelineForSummary(nodes);
    const events = retained.map((node) => node.event);
    expect(events).toContain('急诊手术：阑尾切除术');
    expect(events).toContain('危急值提醒：血钾 2.8 mmol/L');
    expect(events).toContain('办理入院');
    expect(events).toContain('出院前复查平稳');
  });
});
