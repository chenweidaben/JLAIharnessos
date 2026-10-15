/**
 * 健澜科技 jlmedaios - 医疗纠纷管理纯函数单测（M141-C · 质量与安全）
 *
 * 覆盖：
 *   - registerDispute：五类纠纷归类（代码/中文双口径）、patientId 脱敏、
 *     初始状态恒为「登记」、入参校验；
 *   - updateDisputeStatus：状态机闭环 登记→调查中→协商中→已解决/已诉讼，
 *     非法跳变 / 重复流转 / 未知纠纷 / 终态缺处理结果一律抛错；
 *   - analyzeDisputeTrend：账期过滤、分类别/分状态计数、闭环率、
 *     账期格式校验。
 *
 * 与持久化解耦：不触库（persistDispute / persistDisputeStatus 由路由层显式调用，
 * 单测不覆盖）。保护医生，也保护患者：状态机不允许未调查即定性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  analyzeDisputeTrend,
  listDisputes,
  registerDispute,
  resetDisputeLedger,
  updateDisputeStatus,
} from '../../src/bff/aggregators/disputeAggregator';

beforeEach(() => resetDisputeLedger());

describe('registerDispute 纠纷登记', () => {
  it('五类纠纷按代码/中文双口径归类，patientId 登记瞬间脱敏', () => {
    // 中文标签口径
    const d1 = registerDispute('P000123', 'V001', '服务态度', '候诊两小时无人解释', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    expect(d1.type).toBe('service_attitude');
    expect(d1.typeLabel).toBe('服务态度');
    // 脱敏：前2 + **** + 后2
    expect(d1.patientId).toBe('P0****23');

    // 代码口径
    const d2 = registerDispute('P000456', 'V002', 'medical_quality', '手术指征争议', {
      createdAt: '2026-10-06T09:00:00Z',
    });
    expect(d2.type).toBe('medical_quality');
    expect(d2.typeLabel).toBe('医疗质量');
    expect(d2.patientId).toBe('P0****56');

    const d3 = registerDispute('P000789', '', '费用争议', '检查项目重复计费', {
      createdAt: '2026-10-07T09:00:00Z',
    });
    expect(d3.type).toBe('fee_dispute');
    expect(d3.visitId).toBe('');

    const d4 = registerDispute('P000321', 'V004', '沟通问题', '出院小结未解释用药', {
      createdAt: '2026-10-08T09:00:00Z',
    });
    expect(d4.type).toBe('communication');

    const d5 = registerDispute('P000654', 'V005', '其他', '停车纠纷', {
      createdAt: '2026-10-09T09:00:00Z',
    });
    expect(d5.type).toBe('other');

    // 初始状态恒为「登记」
    for (const d of [d1, d2, d3, d4, d5]) {
      expect(d.status).toBe('registered');
      expect(d.statusLabel).toBe('登记');
      expect(d.resolution).toBe('');
      expect(d.id).toBeTruthy();
    }
  });

  it('短标识整体打码；非法入参与未知类型抛错', () => {
    // 短于 4 位的标识整体打码，绝不明文
    const short = registerDispute('P1', 'V001', '其他', '', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    expect(short.patientId).toBe('****');

    expect(() => registerDispute('', 'V001', '其他', '')).toThrow();
    expect(() => registerDispute('P000123', 'V001', '医患恩怨', '')).toThrow();
    expect(() => registerDispute('P000123', 'V001', '', '')).toThrow();
  });
});

describe('updateDisputeStatus 状态流转', () => {
  it('合法路径：登记 → 调查中 → 协商中 → 已解决（终态带处理结果）', () => {
    const d = registerDispute('P000123', 'V001', '费用争议', '重复计费', {
      createdAt: '2026-10-05T09:00:00Z',
    });

    const investigating = updateDisputeStatus(d.id, 'investigating');
    expect(investigating.status).toBe('investigating');
    expect(investigating.statusLabel).toBe('调查中');
    expect(investigating.updatedAt >= investigating.createdAt).toBe(true);

    // 中文标签口径同样可流转
    const negotiating = updateDisputeStatus(d.id, '协商中');
    expect(negotiating.status).toBe('negotiating');

    const resolved = updateDisputeStatus(d.id, '已解决', '退费 1280 元，患方签字结案');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolution).toBe('退费 1280 元，患方签字结案');

    // 台账内对象同步生效
    const stored = listDisputes().find((x) => x.id === d.id);
    expect(stored?.status).toBe('resolved');
  });

  it('协商不成可转「已诉讼」', () => {
    const d = registerDispute('P000456', 'V002', '医疗质量', '手术指征争议', {
      createdAt: '2026-10-06T09:00:00Z',
    });
    updateDisputeStatus(d.id, 'investigating');
    updateDisputeStatus(d.id, 'negotiating');
    const litigated = updateDisputeStatus(d.id, 'litigated', '案号 (2026)杭0106民初8888号');
    expect(litigated.status).toBe('litigated');
    expect(litigated.resolution).toContain('8888');
  });

  it('非法跳变 / 重复流转 / 未知纠纷 / 终态缺处理结果一律抛错', () => {
    const d = registerDispute('P000789', 'V003', '服务态度', '态度生硬', {
      createdAt: '2026-10-07T09:00:00Z',
    });

    // 登记 不能直达 已解决（保护医生：未调查不得定性）
    expect(() => updateDisputeStatus(d.id, 'resolved', '结案')).toThrow();
    // 登记 不能直达 已诉讼
    expect(() => updateDisputeStatus(d.id, 'litigated', '案号')).toThrow();
    // 调查中 不能直达 已解决
    updateDisputeStatus(d.id, 'investigating');
    expect(() => updateDisputeStatus(d.id, 'resolved', '结案')).toThrow();
    // 终态缺处理结果抛错
    updateDisputeStatus(d.id, 'negotiating');
    expect(() => updateDisputeStatus(d.id, 'resolved')).toThrow();
    expect(() => updateDisputeStatus(d.id, 'litigated')).toThrow();

    // 合法流转后终态不可再动
    updateDisputeStatus(d.id, 'resolved', '当面致歉并整改');
    expect(() => updateDisputeStatus(d.id, 'negotiating')).toThrow();
    expect(() => updateDisputeStatus(d.id, 'resolved', '再次结案')).toThrow();

    // 未知纠纷 / 空 id 抛错
    expect(() => updateDisputeStatus('not-exist', 'investigating')).toThrow();
    expect(() => updateDisputeStatus('', 'investigating')).toThrow();
    // 非法状态值抛错
    const d2 = registerDispute('P000321', 'V004', '其他', '', {
      createdAt: '2026-10-08T09:00:00Z',
    });
    expect(() => updateDisputeStatus(d2.id, '私了')).toThrow();
  });
});

describe('analyzeDisputeTrend 纠纷趋势', () => {
  it('按账期汇总总量/分类别/分状态/闭环率', () => {
    // 2026-10：3 件——2 件已解决/已诉讼闭环，1 件在办
    const d1 = registerDispute('P000123', 'V001', '服务态度', '态度', {
      createdAt: '2026-10-05T09:00:00Z',
    });
    registerDispute('P000456', 'V002', '费用争议', '计费', {
      createdAt: '2026-10-06T09:00:00Z',
    });
    registerDispute('P000789', 'V003', '费用争议', '退费', {
      createdAt: '2026-10-07T09:00:00Z',
    });
    // 2026-09 的纠纷应被账期过滤
    registerDispute('P000321', 'V004', '其他', '上月', {
      createdAt: '2026-09-20T09:00:00Z',
    });

    // 闭环：d1 已解决、d2 已诉讼；d3 停在登记（在办）
    updateDisputeStatus(d1.id, 'investigating');
    updateDisputeStatus(d1.id, 'negotiating');
    updateDisputeStatus(d1.id, 'resolved', '致歉结案');
    const d2 = listDisputes().find((x) => x.patientId === 'P0****56');
    updateDisputeStatus(d2!.id, 'investigating');
    updateDisputeStatus(d2!.id, 'negotiating');
    updateDisputeStatus(d2!.id, 'litigated', '案号');

    const trend = analyzeDisputeTrend('2026-10');
    expect(trend.period).toBe('2026-10');
    expect(trend.total).toBe(3); // 9 月那件被过滤
    expect(trend.resolvedCount).toBe(1);
    expect(trend.litigatedCount).toBe(1);
    expect(trend.openCount).toBe(1);
    expect(trend.resolutionRate).toBe(0.6667); // 2 / 3

    // 分类别：费用争议 2 件居首，服务态度 1 件
    expect(trend.byType).toHaveLength(2);
    expect(trend.byType[0].type).toBe('fee_dispute');
    expect(trend.byType[0].count).toBe(2);
    expect(trend.byType[1].type).toBe('service_attitude');
    expect(trend.byType[1].count).toBe(1);

    // 分状态按状态机固定顺序：登记 1 / 调查中 0 / 协商中 0 / 已解决 1 / 已诉讼 1
    expect(trend.byStatus).toHaveLength(5);
    expect(trend.byStatus[0].status).toBe('registered');
    expect(trend.byStatus[0].count).toBe(1);
    expect(trend.byStatus[3].status).toBe('resolved');
    expect(trend.byStatus[3].count).toBe(1);
    expect(trend.byStatus[4].status).toBe('litigated');
    expect(trend.byStatus[4].count).toBe(1);
  });

  it('账期格式非法抛错；空账期闭环率为 0', () => {
    expect(() => analyzeDisputeTrend('2026/10')).toThrow();
    expect(() => analyzeDisputeTrend('2026-13')).toThrow();

    const empty = analyzeDisputeTrend('2026-11');
    expect(empty.total).toBe(0);
    expect(empty.resolutionRate).toBe(0);
    expect(empty.openCount).toBe(0);
    expect(empty.byType).toHaveLength(0);
    expect(empty.byStatus).toHaveLength(5); // 空账期仍输出五态骨架
  });
});
