/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院行政办公深化纯函数单测（M178-C）
 *
 * 覆盖：buildDeepOfficeMgmt（四域体系蓝图）、
 *       routeApproval（审批流转：下一待办人 / 终审归档 / 驳回退拟稿人 / 空链踢皮球报错）、
 *       scheduleMeeting（会议安排：确认 / 冲突给建议时段 / 容量预警）、
 *       trackSupervisionTask（督办跟踪：进行中 / 有风险 / 超期升级 / 已办结 / 无 owner 踢皮球）。
 * 与持久化解耦，不触库。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildDeepOfficeMgmt,
  routeApproval,
  scheduleMeeting,
  trackSupervisionTask,
  type ApproverNode,
  type MeetingRequest,
  type OfficeDocument,
  type RoomBooking,
  type SupervisionTask,
} from '../../src/bff/aggregators/officeDeepAggregator';

const doc: OfficeDocument = {
  id: 'doc_1',
  title: '国庆节值班通知',
  direction: 'outgoing',
  category: 'notice',
  applicantId: 'u_a',
  deptCode: 'yuanban',
  status: 'pending',
  currentStep: 0,
};

const chain: ApproverNode[] = [
  { order: 0, role: 'dept_head', approverId: 'u_head' },
  { order: 1, role: 'vice_director', approverId: 'u_vp' },
  { order: 2, role: 'director', approverId: 'u_dir' },
];

describe('buildDeepOfficeMgmt（行政办公体系蓝图）', () => {
  it('输出公文/会议/档案/督办四域，每域带子模块与管理目标', () => {
    const sys = buildDeepOfficeMgmt();
    expect(sys.domains.map((d) => d.key).sort())
      .toEqual(['archive', 'document', 'meeting', 'supervision']);
    for (const d of sys.domains) {
      expect(d.subModules.length).toBeGreaterThan(0);
      expect(d.managementGoal.length).toBeGreaterThan(0);
    }
    expect(sys.principles.join('|')).toContain('踢皮球');
  });
});

describe('routeApproval（审批流转，节点到人不踢皮球）', () => {
  it('未签节点存在 → 返回 next，待办人唯一且非空', () => {
    const r = routeApproval(doc, chain);
    expect(r.kind).toBe('next');
    if (r.kind === 'next') {
      expect(r.approverId).toBe('u_head');
      expect(r.role).toBe('dept_head');
    }
  });

  it('第一节点已签 → 下一待办人是第二节点', () => {
    const signed: ApproverNode[] = [
      { order: 0, role: 'dept_head', approverId: 'u_head', action: 'approve', actedAt: '2026-09-25' },
      ...chain.slice(1),
    ];
    const r = routeApproval(doc, signed);
    expect(r.kind).toBe('next');
    if (r.kind === 'next') expect(r.approverId).toBe('u_vp');
  });

  it('全部通过 → routed 到文书档案', () => {
    const allApproved: ApproverNode[] = chain.map((n) => ({
      ...n, action: 'approve' as const, actedAt: '2026-09-25',
    }));
    const r = routeApproval(doc, allApproved);
    expect(r.kind).toBe('routed');
    if (r.kind === 'routed') {
      expect(r.status).toBe('approved');
      expect(r.routedTo).toContain('文书档案');
    }
  });

  it('任一节点驳回 → routed 退回拟稿人', () => {
    const rejected: ApproverNode[] = [
      { order: 0, role: 'dept_head', approverId: 'u_head', action: 'reject', comment: '要素不全' },
      ...chain.slice(1),
    ];
    const r = routeApproval(doc, rejected);
    expect(r.kind).toBe('routed');
    if (r.kind === 'routed') {
      expect(r.status).toBe('rejected');
      expect(r.routedTo).toBe('u_a');
    }
  });

  it('审批链为空 → error（拒绝踢皮球）', () => {
    const r = routeApproval(doc, []);
    expect(r.kind).toBe('error');
  });

  it('已归档公文 → terminal 不再流转', () => {
    const r = routeApproval({ ...doc, status: 'archived' }, chain);
    expect(r.kind).toBe('terminal');
  });
});

describe('scheduleMeeting（会议安排，不冲突不踢皮球）', () => {
  const mtg: MeetingRequest = {
    id: 'm1', title: '布置会', requesterDept: '院办', room: '行政楼301',
    startAt: '2026-09-28T09:00:00+08:00', endAt: '2026-09-28T10:00:00+08:00',
    attendees: 12,
  };

  it('无冲突 → confirmed', () => {
    const r = scheduleMeeting(mtg, []);
    expect(r.kind).toBe('confirmed');
  });

  it('同 room 时段重叠 → conflict 并给出最近建议时段', () => {
    const bookings: RoomBooking[] = [
      { id: 'b1', room: '行政楼301', startAt: '2026-09-28T08:00:00+08:00', endAt: '2026-09-28T09:30:00+08:00', status: 'booked' },
    ];
    const r = scheduleMeeting(mtg, bookings);
    expect(r.kind).toBe('conflict');
    if (r.kind === 'conflict') {
      // 建议时段必须晚于冲突结束时间（09:30 +08）
      expect(Date.parse(r.suggestedStartAt)).toBeGreaterThanOrEqual(Date.parse('2026-09-28T09:30:00+08:00'));
    }
  });

  it('容量超员 → capacity_warn', () => {
    const r = scheduleMeeting({ ...mtg, attendees: 80 }, []);
    expect(r.kind).toBe('capacity_warn');
  });

  it('时间非法 → error', () => {
    const r = scheduleMeeting({ ...mtg, endAt: mtg.startAt }, []);
    expect(r.kind).toBe('error');
  });
});

describe('trackSupervisionTask（督办跟踪，owner 锁定不踢皮球）', () => {
  const now = new Date('2026-09-25T10:00:00+08:00');
  const base: SupervisionTask = {
    id: 's1', title: '安全整改', ownerDept: '后勤保卫处',
    assignedAt: '2026-09-01T09:00:00+08:00', dueAt: '2026-09-30T18:00:00+08:00',
    progress: 0.6, updates: [], closed: false,
  };

  it('进度正常 → open，owner 锁定', () => {
    const r = trackSupervisionTask(base, now);
    expect(r.status).toBe('open');
    expect(r.ownerDept).toBe('后勤保卫处');
    expect(r.progressPct).toBe(60);
  });

  it('距到期 ≤3 天且进度 <50% → at_risk', () => {
    const r = trackSupervisionTask({ ...base, dueAt: '2026-09-27T18:00:00+08:00', progress: 0.3 }, now);
    expect(r.status).toBe('at_risk');
  });

  it('已超期 → overdue 且 escalated=true', () => {
    const r = trackSupervisionTask({ ...base, dueAt: '2026-09-20T18:00:00+08:00', progress: 0.4 }, now);
    expect(r.status).toBe('overdue');
    expect(r.escalated).toBe(true);
  });

  it('已办结 → closed', () => {
    const r = trackSupervisionTask({ ...base, closed: true, progress: 1, closedAt: '2026-09-24' }, now);
    expect(r.status).toBe('closed');
    expect(r.progressPct).toBe(100);
  });

  it('无 owner → 显式标红踢皮球', () => {
    const r = trackSupervisionTask({ ...base, ownerDept: '' }, now);
    expect(r.escalated).toBe(true);
    expect(r.ownerDept).toContain('踢皮球');
  });
});
