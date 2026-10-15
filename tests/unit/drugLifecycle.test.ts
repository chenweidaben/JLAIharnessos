/**
 * 健澜科技 jlmedaios - 药品全生命周期 单测（M153-B）
 *
 * 覆盖：批次追踪 / 近效期预警分级 / 批次召回（仅停指定批次、其他批次正常销售）/
 *       不良反应聚合报告。纯函数、无 I/O、无 DB。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeEach, describe, expect, it } from 'bun:test';
import {
  _resetRegistry,
  detectExpiringDrugs,
  getAdverseReactionReport,
  recallDrugBatch,
  reportAdverseReaction,
  trackDrugBatch,
} from '../../src/bff/aggregators/drugLifecycleAggregator.js';

/** 以今天为基准偏移 days 天，返回 YYYY-MM-DD（测试内确定性） */
function shift(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

beforeEach(() => _resetRegistry());

describe('M153-B 批次追踪 trackDrugBatch', () => {
  it('采购入库登记批次，返回完整批次快照', () => {
    const b = trackDrugBatch('B-TRACE-001', 'D-CTX', shift(-100), shift(200), '华北制药');
    expect(b.batchNo).toBe('B-TRACE-001');
    expect(b.drugId).toBe('D-CTX');
    expect(b.drugName).toBe('注射用头孢曲松钠');
    expect(b.supplier).toBe('华北制药');
    expect(b.status).toBe('active');
  });

  it('同一批号重复登记保留召回/不良反应历史（幂等更新）', () => {
    trackDrugBatch('B-TRACE-002', 'D-LEV', shift(-50), shift(300), '扬子江');
    recallDrugBatch('B-TRACE-002', '质量问题');
    // 再次入库登记同批号：召回状态不被覆盖
    const b = trackDrugBatch('B-TRACE-002', 'D-LEV', shift(-50), shift(300), '扬子江');
    expect(b.status).toBe('recalled');
    expect(b.recallReason).toBe('质量问题');
  });

  it('已过效期的批次自动置 expired，不允许上架', () => {
    const b = trackDrugBatch('B-EXP-OLD', 'D-OME', shift(-400), shift(-5), '阿斯利康');
    expect(b.status).toBe('expired');
  });
});

describe('M153-B 近效期预警 detectExpiringDrugs', () => {
  it('≤90 天的在库批次被预警，>90 天不预警', () => {
    trackDrugBatch('B-NEAR-30', 'D-CTX', shift(-200), shift(45), '华北制药'); // 45天 -> 预警
    trackDrugBatch('B-FAR-200', 'D-OME', shift(-100), shift(200), '阿斯利康'); // 200天 -> 不预警
    const expiring = detectExpiringDrugs(90);
    const nos = expiring.map((e) => e.batchNo);
    expect(nos).toContain('B-NEAR-30');
    expect(nos).not.toContain('B-FAR-200');
  });

  it('紧急度分级：≤30 critical / ≤60 warning / >60 notice', () => {
    trackDrugBatch('B-CRIT', 'D-LEV', shift(-200), shift(20), '扬子江');   // 20天 critical
    trackDrugBatch('B-WARN', 'D-MER', shift(-200), shift(55), '深圳海滨'); // 55天 warning
    trackDrugBatch('B-NOTI', 'D-ALB', shift(-100), shift(85), '上海莱士');  // 85天 notice
    const by = Object.fromEntries(detectExpiringDrugs(90).map((e) => [e.batchNo, e.riskLevel]));
    expect(by['B-CRIT']).toBe('critical');
    expect(by['B-WARN']).toBe('warning');
    expect(by['B-NOTI']).toBe('notice');
  });

  it('按距效期天数升序（最紧急在前）', () => {
    trackDrugBatch('B-A80', 'D-CTX', shift(-100), shift(80), '华北制药');
    trackDrugBatch('B-A10', 'D-CTX', shift(-300), shift(10), '华北制药');
    const sorted = detectExpiringDrugs(90);
    expect(sorted[0].batchNo).toBe('B-A10');
    expect(sorted[0].daysToExpiry).toBeLessThanOrEqual(sorted[1].daysToExpiry);
  });

  it('已召回批次不参与待销售预警', () => {
    trackDrugBatch('B-REC-EXP', 'D-LEV', shift(-100), shift(15), '扬子江');
    recallDrugBatch('B-REC-EXP', '问题批次');
    expect(detectExpiringDrugs(90).map((e) => e.batchNo)).not.toContain('B-REC-EXP');
  });
});

describe('M153-B 批次召回 recallDrugBatch（核心：只停指定批次）', () => {
  it('召回仅锁定指定批号，同药品其他批次仍 active 正常销售', () => {
    // 同一药品 D-CTX 两个批次
    trackDrugBatch('B-CTX-A', 'D-CTX', shift(-300), shift(300), '华北制药');
    trackDrugBatch('B-CTX-B', 'D-CTX', shift(-30), shift(300), '华北制药');

    const r = recallDrugBatch('B-CTX-A', '药监通报');
    expect(r.result).toBe('recalled');
    expect(r.batchNo).toBe('B-CTX-A');
    expect(r.affectedQuantity).toBeGreaterThan(0);
    // 关键断言：同药品还有 1 个批次在正常销售，未被误伤
    expect(r.otherActiveBatches).toBe(1);

    // 被召回批次状态已变
    const all = detectExpiringDrugs(99999).concat([]); // 仅取 active，recalled 不在其中
    expect(all.map((e) => e.batchNo)).not.toContain('B-CTX-A');
  });

  it('召回后其他批次仍可被检索为 active', () => {
    trackDrugBatch('B-X1', 'D-OME', shift(-100), shift(200), '阿斯利康');
    trackDrugBatch('B-X2', 'D-OME', shift(-50), shift(250), '阿斯利康');
    recallDrugBatch('B-X1', '质量问题');
    // B-X2 未受影响：仍然在 active 集合里（通过生命周期视图在库数验证）
    // 直接验证：recallDrugBatch 报告的 otherActiveBatches >= 1
    const r2 = recallDrugBatch('B-X2', '二次召回');
    expect(r2.result).toBe('recalled');
    // 此时 B-X1 已 recalled，B-X2 召回时同药 active 其他批次应为 0
    expect(r2.otherActiveBatches).toBe(0);
  });

  it('召回不存在的批号返回 not_found', () => {
    const r = recallDrugBatch('B-NOPE-999', '测试');
    expect(r.result).toBe('not_found');
  });

  it('重复召回同一批号返回 already_recalled，不重复操作', () => {
    trackDrugBatch('B-DUP', 'D-MER', shift(-100), shift(200), '深圳海滨');
    recallDrugBatch('B-DUP', '首次');
    const r = recallDrugBatch('B-DUP', '再次');
    expect(r.result).toBe('already_recalled');
  });
});

describe('M153-B 不良反应聚合 getAdverseReactionReport', () => {
  it('跨批次聚合同一药品的不良反应并合并计数', () => {
    trackDrugBatch('B-ALB-1', 'D-ALB', shift(-100), shift(200), '上海莱士');
    trackDrugBatch('B-ALB-2', 'D-ALB', shift(-50), shift(200), '上海莱士');
    reportAdverseReaction('B-ALB-1', '皮疹瘙痒', 'mild');
    reportAdverseReaction('B-ALB-1', '皮疹瘙痒', 'mild');
    reportAdverseReaction('B-ALB-2', '寒战发热', 'severe');

    const report = getAdverseReactionReport('D-ALB');
    expect(report.totalReports).toBe(3);
    expect(report.severeCount).toBe(1);
    const rash = report.reactions.find((x) => x.reaction === '皮疹瘙痒');
    expect(rash?.count).toBe(2);
    expect(report.lastReportedAt).not.toBeNull();
  });

  it('无上报的药品返回空报告', () => {
    trackDrugBatch('D-QUIET', 'D-OME', shift(-100), shift(200), '阿斯利康');
    const report = getAdverseReactionReport('D-OME');
    expect(report.totalReports).toBe(0);
    expect(report.reactions).toHaveLength(0);
  });
});
