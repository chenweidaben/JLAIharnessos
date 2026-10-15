/**
 * 健澜科技 jlmedaios - 患者服务中心纯函数单测（M142-C · 预防保健与患者服务）
 *
 * 覆盖：
 *   - createServiceTicket：五类诉求归类（代码/中文双口径）、patientId 脱敏、
 *     初始状态恒为「已创建」、48h 时限写入、入参校验；
 *   - assignServiceTicket：工单分派 已创建 → 已分派，非法重复分派抛错；
 *   - resolveServiceTicket：处理闭环 已分派 → 已解决，缺处理结果抛错；
 *   - submitSatisfaction：满意度回访 已解决 → 已关闭，1-5 分留痕；
 *   - scanEscalations：48h 未处理一级升级、96h 未处理二级升级，已解决件不参与。
 *
 * 与持久化解耦：不触库（persistTicket / persistTicketStatus 由路由层显式调用，
 * 单测不覆盖）。患者诉求限时处理，不能石沉大海：超时必升级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  assignServiceTicket,
  createServiceTicket,
  listAllTickets,
  listMyTickets,
  resolveServiceTicket,
  resetTicketLedger,
  SLA_WINDOW_MS,
  scanEscalations,
  submitSatisfaction,
} from '../../src/bff/aggregators/patientServiceAggregator';

beforeEach(() => resetTicketLedger());

describe('createServiceTicket 工单创建', () => {
  it('五类诉求按代码/中文双口径归类，patientId 受理瞬间脱敏', () => {
    // 中文标签口径
    const t1 = createServiceTicket('P000123', '咨询电话', '想预约下周心内科号', {
      createdAt: '2026-10-15T09:00:00Z',
    });
    expect(t1.type).toBe('consultation_call');
    expect(t1.typeLabel).toBe('咨询电话');
    expect(t1.patientId).toBe('P0****23');

    // 代码口径
    const t2 = createServiceTicket('P000456', 'medical_record_copy', '需要复印住院病历', {
      createdAt: '2026-10-15T09:05:00Z',
    });
    expect(t2.type).toBe('medical_record_copy');
    expect(t2.typeLabel).toBe('病历复印');
    expect(t2.patientId).toBe('P0****56');

    const t3 = createServiceTicket('P000789', '诊断证明', '需开具病假证明', {
      createdAt: '2026-10-15T09:10:00Z',
    });
    expect(t3.type).toBe('diagnosis_proof');

    const t4 = createServiceTicket('P000321', '转诊预约', '希望转诊上级医院', {
      createdAt: '2026-10-15T09:15:00Z',
    });
    expect(t4.type).toBe('referral_appointment');

    const t5 = createServiceTicket('P000654', '投诉建议', '停车场引导不清晰', {
      createdAt: '2026-10-15T09:20:00Z',
    });
    expect(t5.type).toBe('complaint_suggestion');

    // 初始状态恒为「已创建」，48h 时限写入，升级等级为 0
    for (const t of [t1, t2, t3, t4, t5]) {
      expect(t.status).toBe('created');
      expect(t.statusLabel).toBe('已创建');
      expect(t.handlerId).toBe('');
      expect(t.escalationLevel).toBe(0);
      expect(t.id).toBeTruthy();
      expect(t.ticketNo).toMatch(/^SV/);
      // deadline = createdAt + 48h
      const deadline = new Date(t.deadlineAt).getTime();
      const created = new Date(t.createdAt).getTime();
      expect(deadline - created).toBe(SLA_WINDOW_MS);
    }
  });

  it('短标识整体打码；非法入参与未知类型抛错', () => {
    const short = createServiceTicket('P1', '咨询电话', '', {
      createdAt: '2026-10-15T09:00:00Z',
    });
    expect(short.patientId).toBe('****');

    expect(() => createServiceTicket('', '咨询电话', '')).toThrow();
    expect(() => createServiceTicket('P000123', '医疗纠纷', '')).toThrow();
    expect(() => createServiceTicket('P000123', '', '')).toThrow();
  });
});

describe('assignServiceTicket / resolveServiceTicket 分派处理', () => {
  it('闭环：已创建 → 已分派 → 已解决（终态带处理结果）', () => {
    const t = createServiceTicket('P000123', '病历复印', '复印 2026 住院病历', {
      createdAt: '2026-10-15T09:00:00Z',
    });

    // 分派
    const assigned = assignServiceTicket(t.id, 'H001', '王护士');
    expect(assigned.status).toBe('assigned');
    expect(assigned.statusLabel).toBe('已分派');
    expect(assigned.handlerId).toBe('H001');
    expect(assigned.handlerName).toBe('王护士');
    expect(assigned.assignedAt).toBeTruthy();

    // 处理闭环
    const resolved = resolveServiceTicket(t.id, '已电话告知携带身份证到病案室办理');
    expect(resolved.status).toBe('resolved');
    expect(resolved.statusLabel).toBe('已解决');
    expect(resolved.resolution).toContain('病案室');
    expect(resolved.resolvedAt).toBeTruthy();

    // 台账内对象同步生效
    const stored = listAllTickets().find((x) => x.id === t.id);
    expect(stored?.status).toBe('resolved');
  });

  it('非法分派 / 缺处理结果 / 未知工单一律抛错', () => {
    const t = createServiceTicket('P000456', '投诉建议', '候诊太久', {
      createdAt: '2026-10-15T09:00:00Z',
    });

    // 已创建工单缺受理人抛错
    expect(() => assignServiceTicket(t.id, '')).toThrow();
    // 分派后不得重复分派
    assignServiceTicket(t.id, 'H002');
    expect(() => assignServiceTicket(t.id, 'H003')).toThrow();
    // 未分派不得径行解决
    const t2 = createServiceTicket('P000789', '咨询电话', '', {
      createdAt: '2026-10-15T09:05:00Z',
    });
    expect(() => resolveServiceTicket(t2.id, '直接结案')).toThrow();
    // 处理闭环缺处理结果抛错
    assignServiceTicket(t2.id, 'H004');
    expect(() => resolveServiceTicket(t2.id, '')).toThrow();

    // 未知工单 / 空 id 抛错
    expect(() => assignServiceTicket('not-exist', 'H001')).toThrow();
    expect(() => resolveServiceTicket('', '结案')).toThrow();
  });
});

describe('submitSatisfaction 满意度回访', () => {
  it('已解决 → 已关闭，1-5 分留痕', () => {
    const t = createServiceTicket('P000123', '诊断证明', '开病假条', {
      createdAt: '2026-10-15T09:00:00Z',
    });
    assignServiceTicket(t.id, 'H001', '李医生');
    resolveServiceTicket(t.id, '已开具诊断证明并加盖公章');

    const closed = submitSatisfaction(t.id, 5, '处理很快，很满意');
    expect(closed.status).toBe('closed');
    expect(closed.statusLabel).toBe('已关闭');
    expect(closed.satisfactionScore).toBe(5);
    expect(closed.satisfactionComment).toBe('处理很快，很满意');
    expect(closed.satisfactionAt).toBeTruthy();
  });

  it('未解决不得回访；评分越界抛错', () => {
    const t = createServiceTicket('P000456', '转诊预约', '转浙二', {
      createdAt: '2026-10-15T09:00:00Z',
    });
    // 未解决工单不得回访
    expect(() => submitSatisfaction(t.id, 5)).toThrow();

    assignServiceTicket(t.id, 'H002');
    resolveServiceTicket(t.id, '已预约转诊号');

    // 评分必须为 1-5 整数
    expect(() => submitSatisfaction(t.id, 0)).toThrow();
    expect(() => submitSatisfaction(t.id, 6)).toThrow();
    expect(() => submitSatisfaction(t.id, 3.5)).toThrow();
    expect(() => submitSatisfaction('not-exist', 5)).toThrow();
  });
});

describe('scanEscalations 48h 超时自动升级', () => {
  it('48h 未处理一级升级、96h 未处理二级升级；已解决件不参与', () => {
    const createdAt = '2026-10-15T00:00:00Z';
    // 件 A：创建后一直未处理
    const a = createServiceTicket('P000111', '咨询电话', '问号源', { createdAt });
    // 件 B：已分派但未解决（仍在 48h 窗口内创建，后续超时）
    const b = createServiceTicket('P000222', '病历复印', '复印病历', { createdAt });
    assignServiceTicket(b.id, 'H001', '王护士');
    // 件 C：已解决，不应被升级
    const c = createServiceTicket('P000333', '投诉建议', '停车', { createdAt });
    assignServiceTicket(c.id, 'H002');
    resolveServiceTicket(c.id, '已整改');

    // 36h 后：未超 48h，无升级
    const at36h = new Date(createdAt).getTime() + 36 * 3600 * 1000;
    expect(scanEscalations(at36h)).toHaveLength(0);

    // 50h 后：A、B 超时未解决 → 一级升级（C 已解决不参与）
    const at50h = new Date(createdAt).getTime() + 50 * 3600 * 1000;
    const escalated1 = scanEscalations(at50h);
    expect(escalated1).toHaveLength(2);
    expect(escalated1.find((t) => t.id === a.id)?.escalationLevel).toBe(1);
    expect(escalated1.find((t) => t.id === b.id)?.escalationLevel).toBe(1);

    // 100h 后：A、B 再升一级为二级；重复扫描不重复报新升级
    const at100h = new Date(createdAt).getTime() + 100 * 3600 * 1000;
    const escalated2 = scanEscalations(at100h);
    expect(escalated2).toHaveLength(2);
    expect(escalated2.find((t) => t.id === a.id)?.escalationLevel).toBe(2);
    expect(escalated2.find((t) => t.id === b.id)?.escalationLevel).toBe(2);

    // 再次扫描：等级已到 2，不产生新升级件
    expect(scanEscalations(at100h + 3600 * 1000)).toHaveLength(0);

    // 已解决的 C 始终未升级
    const cStored = listAllTickets().find((t) => t.id === c.id);
    expect(cStored?.escalationLevel).toBe(0);
  });
});

describe('listMyTickets 患者我的诉求', () => {
  it('按脱敏 patientId 过滤，创建时间倒序', () => {
    createServiceTicket('P000123', '咨询电话', '一', { createdAt: '2026-10-15T09:00:00Z' });
    createServiceTicket('P000123', '病历复印', '二', { createdAt: '2026-10-15T10:00:00Z' });
    createServiceTicket('P000456', '投诉建议', '别人的单', { createdAt: '2026-10-15T11:00:00Z' });

    const mine = listMyTickets('P000123');
    expect(mine).toHaveLength(2);
    // 倒序：10 点的排前
    expect(mine[0].description).toBe('二');
    expect(mine[1].description).toBe('一');
    expect(mine.every((t) => t.patientId === 'P0****23')).toBe(true);

    // 空 patientId 返回空
    expect(listMyTickets('')).toHaveLength(0);
  });
});
