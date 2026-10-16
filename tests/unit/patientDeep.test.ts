/**
 * 健澜科技 jlmedaios — 【安全质量与运营】患者服务与体验深化纯函数单测（M172-D）
 *
 * 覆盖：
 *  - buildDeepPatientService（四大深化域盘点 + 老人友好度按适老化开关折算）；
 *  - optimizePatientFlow（院内 BFS 路径、跨层电梯、距离/ETA、急诊强提示）；
 *  - predictPatientWaitTime（前方人数/窗口/单均耗时 → 等待预测与红黄绿灯）；
 *  - personalizePatientService（老人/轮椅/儿童 → 大字/语音/无障碍/优先叫号）。
 * 与持久化解耦，不触库，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_HOSPITAL_GRAPH,
  buildDeepPatientService,
  optimizePatientFlow,
  personalizePatientService,
  predictPatientWaitTime,
} from '../../src/bff/aggregators/patientDeepAggregator';

describe('buildDeepPatientService（导诊/导航/门诊/住院四件套）', () => {
  it('默认全量适老化开启时老人友好度为满分 100、等级优秀', () => {
    const r = buildDeepPatientService('P-001');
    expect(r.patientId).toBe('P-001');
    expect(r.modules.map((m) => m.code)).toEqual(['guide', 'nav', 'outpatient', 'inpatient']);
    expect(r.elderlyReadinessScore).toBe(100);
    expect(r.elderlyLevel).toBe('excellent');
  });

  it('适老化开关只开一半时，按开启占比折算得分（2/5=40，等级一般）', () => {
    const r = buildDeepPatientService('P-002', {
      elderly: { largeFont: true, voiceBroadcast: true, barrierFreeFirst: false, volunteerDesk: false, oneStepFlow: false },
    });
    expect(r.elderlyReadinessScore).toBe(40);
    expect(r.elderlyLevel).toBe('fair');
    expect(r.elderly.largeFont).toBe(true);
    expect(r.elderly.volunteerDesk).toBe(false);
  });

  it('导诊深化域包含症状→科室→医生→号源全链路能力', () => {
    const r = buildDeepPatientService('P-003');
    const guide = r.modules.find((m) => m.code === 'guide')!;
    expect(guide.capabilities.join('')).toContain('症状');
    expect(guide.capabilities.join('')).toContain('号源');
  });
});

describe('optimizePatientFlow（导航优化：老人也能照着走）', () => {
  it('门诊大厅→心内科(3层)：BFS 路径含西1号电梯，跨层且有电梯导引步', () => {
    const r = optimizePatientFlow('P-100', { code: 'gate_hall' }, { code: 'dept_cardio' });
    expect(r.path).toEqual(['gate_hall', 'elev_west', 'elev_west_3', 'dept_cardio']);
    expect(r.crossFloor).toBe(true);
    expect(r.barrierFree).toBe(true);
    expect(r.steps.some((s) => s.action === 'elevator')).toBe(true);
    // 老人步速 40 米/分，距离 >0 → ETA >0
    expect(r.totalDistanceM).toBeGreaterThan(0);
    expect(r.etaMin).toBeGreaterThan(0);
  });

  it('按名称片段也能解析终点（「心内」→ 心内科）', () => {
    const r = optimizePatientFlow('P-101', { name: '门诊大厅' }, { name: '心内' });
    expect(r.toName).toContain('心内');
    expect(r.path.length).toBeGreaterThan(0);
  });

  it('终点是急诊时给出 urgent 强提示', () => {
    const r = optimizePatientFlow('P-102', { code: 'gate_hall' }, { code: 'emergency' });
    expect(r.urgent).toBe(true);
  });

  it('解析不到的地点不抛错，返回兜底提示步', () => {
    const r = optimizePatientFlow('P-103', { code: 'gate_hall' }, { name: '不存在的科室xyz' });
    expect(r.path).toHaveLength(0);
    expect(r.steps[0].instruction).toContain('志愿者');
  });

  it('老人步速比普通步速慢，同一距离 ETA 更大', () => {
    const elder = optimizePatientFlow('P-104', { code: 'gate_hall' }, { code: 'dept_cardio' }, undefined, true);
    const normal = optimizePatientFlow('P-104', { code: 'gate_hall' }, { code: 'dept_cardio' }, undefined, false);
    expect(elder.etaMin).toBeGreaterThan(normal.etaMin);
  });
});

describe('predictPatientWaitTime（等待预测：红黄绿灯）', () => {
  it('前方 8 人 / 2 窗口 / 单均 6 分钟：8/2×6=24 分钟，黄灯', () => {
    const r = predictPatientWaitTime('consultation', { aheadCount: 8, openWindows: 2, avgServiceMinutes: 6 });
    expect(r.predictedWaitMin).toBe(24);
    expect(r.level).toBe('medium');
  });

  it('前方 0 人：即刻为 0、绿灯，并提示直接去', () => {
    const r = predictPatientWaitTime('pharmacy', { aheadCount: 0, openWindows: 1, avgServiceMinutes: 5 });
    expect(r.predictedWaitMin).toBe(0);
    expect(r.level).toBe('low');
    expect(r.plainMessage).toContain('不用等');
  });

  it('窗口未开放时按单窗口保守估算，并提示休息区等候', () => {
    const r = predictPatientWaitTime('registration', { aheadCount: 10, openWindows: 0, avgServiceMinutes: 4 });
    expect(r.predictedWaitMin).toBe(40); // 10/1×4
    expect(r.level).toBe('high');
    expect(r.plainMessage).toContain('窗口暂未全开');
  });

  it('灯号边界：≤10 绿、≤25 黄、其余红', () => {
    expect(predictPatientWaitTime('triage', { aheadCount: 5, openWindows: 3, avgServiceMinutes: 6 }).level).toBe('low');   // 10
    expect(predictPatientWaitTime('triage', { aheadCount: 5, openWindows: 2, avgServiceMinutes: 10 }).level).toBe('medium'); // 25
    expect(predictPatientWaitTime('triage', { aheadCount: 6, openWindows: 1, avgServiceMinutes: 5 }).level).toBe('high');  // 30
  });
});

describe('personalizePatientService（个性化服务：为每个人调好）', () => {
  it('老人：大字号 + 语音 + 强制无障碍 + 志愿者窗口 + 优先叫号 + sms/voice 提醒', () => {
    const r = personalizePatientService('P-200', { ageBand: 'elderly' });
    expect(r.fontScale).toBe('large');
    expect(r.voiceBroadcast).toBe(true);
    expect(r.forceBarrierFree).toBe(true);
    expect(r.volunteerDesk).toBe(true);
    expect(r.queuePriority).toBe('priority');
    expect(r.reminderChannels).toEqual(['sms', 'voice']);
    expect(r.greeting).toContain('大字');
  });

  it('轮椅成人：强制无障碍 + 优先叫号，字号按常规', () => {
    const r = personalizePatientService('P-201', { ageBand: 'adult', wheelchair: true });
    expect(r.forceBarrierFree).toBe(true);
    expect(r.queuePriority).toBe('priority');
    expect(r.fontScale).toBe('medium');
  });

  it('成人默认：常规字号、sms+wechat 提醒、普通叫号', () => {
    const r = personalizePatientService('P-202', { ageBand: 'adult' });
    expect(r.fontScale).toBe('medium');
    expect(r.queuePriority).toBe('normal');
    expect(r.reminderChannels).toEqual(['sms', 'wechat']);
  });

  it('显式指定提醒渠道时尊重患者选择', () => {
    const r = personalizePatientService('P-203', { ageBand: 'adult', reminderChannels: ['wechat'] });
    expect(r.reminderChannels).toEqual(['wechat']);
  });
});
