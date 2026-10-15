/**
 * 健澜科技 jlmedaios - 患者移动端 H5 首页聚合纯函数测试（M128-C）
 *
 * 覆盖：首页聚合（空/默认值/问候语）、提醒排序（紧迫度+时间）、
 * 报告倒序限量、文字格式化。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientMobileHome,
  formatPatientMobileText,
  type MobileReminder,
} from '../../src/bff/aggregators/patientMobileAggregator.js';

const NOW = new Date('2026-10-16T10:00:00');
const H = 3600_000;

function at(ms: number): string {
  return new Date(NOW.getTime() + ms).toISOString();
}

function rem(p: Partial<MobileReminder> & Pick<MobileReminder, 'id'>): MobileReminder {
  return {
    type: 'appointment',
    level: 'normal',
    title: p.id,
    body: '',
    dueAt: at(0),
    ...p,
  };
}

describe('buildPatientMobileHome - 首页聚合与空输入', () => {
  it('全空输入返回合法首页骨架', () => {
    const home = buildPatientMobileHome('p1', {}, NOW);
    expect(home.patientId).toBe('p1');
    expect(home.todayReminders).toEqual([]);
    expect(home.reminderCount).toBe(0);
    expect(home.urgentCount).toBe(0);
    expect(home.recentReports).toEqual([]);
    // 智能导诊默认开放 + 一组快捷症状
    expect(home.smartGuide.available).toBe(true);
    expect(home.smartGuide.quickSymptoms.length).toBeGreaterThan(0);
    // 满意度默认无待评价
    expect(home.satisfaction.pending).toBe(false);
    expect(home.updatedAt).toBe(NOW.toISOString());
  });

  it('按时段生成问候语', () => {
    expect(buildPatientMobileHome('p', {}, new Date('2026-10-16T08:00:00')).greeting).toBe('早上好');
    expect(buildPatientMobileHome('p', {}, new Date('2026-10-16T14:00:00')).greeting).toBe('下午好');
    expect(buildPatientMobileHome('p', {}, new Date('2026-10-16T20:00:00')).greeting).toBe('晚上好');
  });

  it('不污染调用方传入的原始数组', () => {
    const reminders: MobileReminder[] = [
      rem({ id: 'r2', level: 'normal', dueAt: at(5 * H) }),
      rem({ id: 'r1', level: 'urgent', dueAt: at(1 * H) }),
    ];
    buildPatientMobileHome('p', { reminders }, NOW);
    expect(reminders[0].id).toBe('r2');
  });
});

describe('buildPatientMobileHome - 提醒排序', () => {
  it('紧迫度优先：urgent 排在 warning/normal 之前', () => {
    const home = buildPatientMobileHome('p', {
      reminders: [
        rem({ id: 'n', level: 'normal', dueAt: at(0) }),
        rem({ id: 'u', level: 'urgent', dueAt: at(5 * H) }),
        rem({ id: 'w', level: 'warning', dueAt: at(1 * H) }),
      ],
    }, NOW);
    expect(home.todayReminders.map((r) => r.id)).toEqual(['u', 'w', 'n']);
    expect(home.urgentCount).toBe(1);
    expect(home.reminderCount).toBe(3);
  });

  it('同紧迫度内按时间升序（近的在前）', () => {
    const home = buildPatientMobileHome('p', {
      reminders: [
        rem({ id: 'later', level: 'urgent', dueAt: at(5 * H) }),
        rem({ id: 'soon', level: 'urgent', dueAt: at(1 * H) }),
      ],
    }, NOW);
    expect(home.todayReminders.map((r) => r.id)).toEqual(['soon', 'later']);
  });

  it('今日提醒最多展示 10 条', () => {
    const many: MobileReminder[] = Array.from({ length: 15 }, (_, i) =>
      rem({ id: `m${i}`, level: 'normal', dueAt: at(i * H) }),
    );
    const home = buildPatientMobileHome('p', { reminders: many }, NOW);
    expect(home.todayReminders.length).toBe(10);
    expect(home.reminderCount).toBe(10);
  });
});

describe('buildPatientMobileHome - 最近报告', () => {
  it('按报告日期倒序，最多 5 条', () => {
    const home = buildPatientMobileHome('p', {
      reports: [
        { id: 'old', name: '旧报告', reportDate: at(-30 * H), status: 'available' },
        { id: 'new', name: '新报告', reportDate: at(-1 * H), status: 'available' },
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `r${i}`,
          name: `报告${i}`,
          reportDate: at(-(10 + i) * H),
          status: 'available' as const,
        })),
      ],
    }, NOW);
    expect(home.recentReports.length).toBe(5);
    expect(home.recentReports[0].id).toBe('new');
    // 倒序前 5 条：new, r0, r1, r2, r3；更旧的 r4 与 old 被截断
    expect(home.recentReports[4].id).toBe('r3');
    expect(home.recentReports.some((r) => r.id === 'old')).toBe(false);
  });
});

describe('buildPatientMobileHome - 入口配置覆盖', () => {
  it('可关闭智能导诊入口', () => {
    const home = buildPatientMobileHome('p', { guide: { available: false } }, NOW);
    expect(home.smartGuide.available).toBe(false);
  });

  it('可传入快捷症状并限量', () => {
    const home = buildPatientMobileHome(
      'p',
      { guide: { available: true, quickSymptoms: ['胸痛', '头晕', '失眠', '胃痛', '皮疹', '气短', '耳鸣'] } },
      NOW,
    );
    expect(home.smartGuide.quickSymptoms).toEqual(['胸痛', '头晕', '失眠', '胃痛', '皮疹', '气短']);
  });

  it('满意度待评价与最近评分', () => {
    const home = buildPatientMobileHome('p', { satisfaction: { pending: true, lastScore: 5 } }, NOW);
    expect(home.satisfaction.pending).toBe(true);
    expect(home.satisfaction.lastScore).toBe(5);
  });
});

describe('formatPatientMobileText - 文字格式化', () => {
  it('null/undefined/非字符串 → 空串', () => {
    expect(formatPatientMobileText(null)).toBe('');
    expect(formatPatientMobileText(undefined)).toBe('');
    expect(formatPatientMobileText(123 as unknown)).toBe('');
  });

  it('折叠连续空白与全角空格为单空格并 trim', () => {
    expect(formatPatientMobileText('  你好\n\n  世界\t\t\t  \u3000')).toBe('你好 世界');
  });

  it('去除控制字符', () => {
    expect(formatPatientMobileText('用药\x00说明\x07：遵医嘱')).toBe('用药说明：遵医嘱');
  });

  it('正常文本原样保留可读内容', () => {
    expect(formatPatientMobileText('  氨氯地平片 5mg，每日一次  ')).toBe('氨氯地平片 5mg，每日一次');
  });
});
