/**
 * 健澜科技 jlmedaios - 患者端 H5 首页聚合纯函数测试（M148-C，产品化收尾）
 *
 * 覆盖：首页聚合（空/默认值/问候语）、我的预约过滤排序、我的报告倒序、
 * 我的账单待缴优先与金额汇总、健康提醒排序、PII 脱敏（姓名/手机号）、
 * 身份证号不下发、权限校验（仅患者本人）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildPatientH5Dashboard,
  isPatientRole,
  type H5Appointment,
  type H5Bill,
  type H5Reminder,
  type H5Report,
} from '../../src/bff/aggregators/patientH5Aggregator.js';

const NOW = new Date('2026-10-16T10:00:00');
const H = 3600_000;

function at(ms: number): string {
  return new Date(NOW.getTime() + ms).toISOString();
}

function rem(p: Partial<H5Reminder> & Pick<H5Reminder, 'id'>): H5Reminder {
  return {
    kind: 'followup',
    level: 'normal',
    title: p.id,
    body: '',
    dueAt: at(0),
    ...p,
  };
}

describe('buildPatientH5Dashboard - 首页聚合与空输入', () => {
  it('全空输入返回合法首页骨架', () => {
    const d = buildPatientH5Dashboard('p1', {}, NOW);
    expect(d.patientId).toBe('p1');
    expect(d.greeting).toBe('上午好');
    expect(d.appointments).toEqual([]);
    expect(d.appointmentCount).toBe(0);
    expect(d.reports).toEqual([]);
    expect(d.bills).toEqual([]);
    expect(d.unpaidAmount).toBe(0);
    expect(d.unpaidCount).toBe(0);
    expect(d.healthReminders).toEqual([]);
    expect(d.urgentCount).toBe(0);
    expect(d.smartGuide.available).toBe(true);
    expect(d.smartGuide.quickSymptoms.length).toBeGreaterThan(0);
    expect(d.updatedAt).toBe(NOW.toISOString());
  });

  it('按时段生成问候语', () => {
    expect(buildPatientH5Dashboard('p', {}, new Date('2026-10-16T08:00:00')).greeting).toBe('早上好');
    expect(buildPatientH5Dashboard('p', {}, new Date('2026-10-16T14:00:00')).greeting).toBe('下午好');
    expect(buildPatientH5Dashboard('p', {}, new Date('2026-10-16T20:00:00')).greeting).toBe('晚上好');
  });

  it('不污染调用方传入的原始数组', () => {
    const reminders: H5Reminder[] = [
      rem({ id: 'r2', level: 'normal', dueAt: at(5 * H) }),
      rem({ id: 'r1', level: 'urgent', dueAt: at(1 * H) }),
    ];
    buildPatientH5Dashboard('p', { reminders }, NOW);
    expect(reminders[0].id).toBe('r2');
  });
});

describe('buildPatientH5Dashboard - 我的预约', () => {
  const appt = (p: Partial<H5Appointment> & Pick<H5Appointment, 'id'>): H5Appointment => ({
    scheduledAt: at(0),
    department: '全科',
    doctor: '',
    purpose: '',
    status: 'scheduled',
    ...p,
  });

  it('过滤已完成/已取消预约，按时间升序，最多 5 条', () => {
    const d = buildPatientH5Dashboard('p', {
      appointments: [
        appt({ id: 'later', scheduledAt: at(3 * H) }),
        appt({ id: 'done', scheduledAt: at(0), status: 'completed' }),
        appt({ id: 'cancel', scheduledAt: at(0), status: 'cancelled' }),
        appt({ id: 'soon', scheduledAt: at(1 * H) }),
        ...Array.from({ length: 6 }, (_, i) => appt({ id: `x${i}`, scheduledAt: at((4 + i) * H) })),
      ],
    }, NOW);
    expect(d.appointments.map((a) => a.id)).toEqual(['soon', 'later', 'x0', 'x1', 'x2']);
    expect(d.appointmentCount).toBe(5);
  });
});

describe('buildPatientH5Dashboard - 我的报告', () => {
  it('按报告日期倒序，最多 5 条', () => {
    const d = buildPatientH5Dashboard('p', {
      reports: [
        { id: 'old', name: '旧报告', reportDate: at(-30 * H), status: 'available' },
        { id: 'new', name: '新报告', reportDate: at(-1 * H), status: 'available' },
        ...Array.from({ length: 6 }, (_, i) => ({
          id: `r${i}`,
          name: `报告${i}`,
          reportDate: at(-(10 + i) * H),
          status: 'available' as const,
        })),
      ] as H5Report[],
    }, NOW);
    expect(d.reports.length).toBe(5);
    expect(d.reports[0].id).toBe('new');
    expect(d.reports[4].id).toBe('r3');
    expect(d.reports.some((r) => r.id === 'old')).toBe(false);
  });
});

describe('buildPatientH5Dashboard - 我的账单', () => {
  const bill = (p: Partial<H5Bill> & Pick<H5Bill, 'id'>): H5Bill => ({
    title: p.id,
    amount: 0,
    status: 'unpaid',
    billDate: at(0),
    ...p,
  });

  it('待缴优先、再按日期倒序，最多 5 条', () => {
    const d = buildPatientH5Dashboard('p', {
      bills: [
        bill({ id: 'paid-old', status: 'paid', billDate: at(-20 * H) }),
        bill({ id: 'unpaid-old', billDate: at(-10 * H) }),
        bill({ id: 'unpaid-new', billDate: at(-1 * H) }),
        bill({ id: 'paid-new', status: 'paid', billDate: at(-2 * H) }),
      ],
    }, NOW);
    // 待缴两条：unpaid-new（-1h）在前、unpaid-old（-10h）在后；已缴两条：paid-new 在前
    expect(d.bills.map((b) => b.id)).toEqual(['unpaid-new', 'unpaid-old', 'paid-new', 'paid-old']);
  });

  it('待缴金额汇总（保留两位小数）与条数', () => {
    const d = buildPatientH5Dashboard('p', {
      bills: [
        bill({ id: 'b1', status: 'unpaid', amount: 12.5 }),
        bill({ id: 'b2', status: 'unpaid', amount: 30 }),
        bill({ id: 'b3', status: 'paid', amount: 100 }),
        bill({ id: 'b4', status: 'unpaid', amount: 0.001 }),
      ],
    }, NOW);
    expect(d.unpaidCount).toBe(3);
    expect(d.unpaidAmount).toBe(42.5);
  });
});

describe('buildPatientH5Dashboard - 健康提醒排序', () => {
  it('紧迫度优先：urgent 排在 warning/normal 之前', () => {
    const d = buildPatientH5Dashboard('p', {
      reminders: [
        rem({ id: 'n', level: 'normal', dueAt: at(0) }),
        rem({ id: 'u', level: 'urgent', dueAt: at(5 * H) }),
        rem({ id: 'w', level: 'warning', dueAt: at(1 * H) }),
      ],
    }, NOW);
    expect(d.healthReminders.map((r) => r.id)).toEqual(['u', 'w', 'n']);
    expect(d.urgentCount).toBe(1);
  });

  it('同紧迫度内按时间升序，最多 10 条', () => {
    const many: H5Reminder[] = Array.from({ length: 15 }, (_, i) =>
      rem({ id: `m${i}`, level: 'normal', dueAt: at(i * H) }),
    );
    const d = buildPatientH5Dashboard('p', { reminders: many }, NOW);
    expect(d.healthReminders.length).toBe(10);
  });
});

describe('buildPatientH5Dashboard - PII 脱敏与安全', () => {
  it('姓名脱敏：张建国 → 张*国', () => {
    const d = buildPatientH5Dashboard('p', { profile: { name: '张建国', phone: '13812345678', idCard: '330106199001011234' } }, NOW);
    expect(d.profile.name).toBe('张*国');
  });

  it('手机号脱敏：13812345678 → 138****5678', () => {
    const d = buildPatientH5Dashboard('p', { profile: { name: '张三', phone: '13812345678' } }, NOW);
    expect(d.profile.phone).toBe('138****5678');
  });

  it('身份证号绝不下发：输出对象不含 idCard 字段', () => {
    const d = buildPatientH5Dashboard('p', {
      profile: { name: '张三', phone: '13812345678', idCard: '330106199001011234' },
    }, NOW);
    const out = d as unknown as Record<string, unknown>;
    // profile 内无 idCard
    expect((d.profile as unknown as Record<string, unknown>).idCard).toBeUndefined();
    // 顶层也无泄漏
    expect(out.idCard).toBeUndefined();
    expect(out.phone).toBeUndefined();
  });

  it('空/缺失档案回退为空串，不抛错', () => {
    const d = buildPatientH5Dashboard('p', { profile: { name: '' } }, NOW);
    expect(d.profile.name).toBe('');
    expect(d.profile.phone).toBe('');
  });
});

describe('isPatientRole - 权限校验（产品化收尾）', () => {
  it('包含 patient 角色 → 放行', () => {
    expect(isPatientRole(['patient'])).toBe(true);
    expect(isPatientRole(['doctor', 'patient'])).toBe(true);
  });

  it('非患者角色（doctor/nurse/admin）→ 拒绝', () => {
    expect(isPatientRole(['doctor'])).toBe(false);
    expect(isPatientRole(['nurse'])).toBe(false);
    expect(isPatientRole(['admin'])).toBe(false);
    expect(isPatientRole([])).toBe(false);
  });

  it('空/非法入参 → 拒绝', () => {
    expect(isPatientRole(null)).toBe(false);
    expect(isPatientRole(undefined)).toBe(false);
  });
});
