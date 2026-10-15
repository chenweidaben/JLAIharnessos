/**
 * 健澜科技 jlmedaios - 临床路径智能推荐纯函数单测（M153-A）
 *
 * 覆盖：路径推荐（冠心病/肺炎/糖尿病/胆囊切除）、偏离分析、费用计算。
 * 纯函数、确定性、无 I/O。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterEach, describe, expect, it } from 'bun:test';
import {
  clearPathwayDeviations,
  ClinicalPathwayError,
  deviationAnalysis,
  getPathwayCost,
  PATHWAY_DISCLAIMER,
  recommendPathway,
  recordPathwayDeviation,
} from '../../src/bff/aggregators/clinicalPathwayAggregator.js';

afterEach(() => {
  clearPathwayDeviations();
});

describe('M153-A recommendPathway 病种覆盖', () => {
  it('冠心病+支架关键词 → PCI支架路径，高置信', () => {
    const p = recommendPathway('冠心病急性心梗，拟行冠脉支架置入', 62, ['高血压']);
    expect(p.pathwayId).toBe('chd-stent');
    expect(p.confidence).toBeGreaterThanOrEqual(0.9);
    expect(p.standardLosDays).toBe(5);
  });

  it('冠心病+保守关键词 → 药物保守路径', () => {
    const p = recommendPathway('冠心病，拟药物保守治疗', 70, []);
    expect(p.pathwayId).toBe('chd-medical');
  });

  it('冠心病未明示方式 + 高龄共病 → 默认保守', () => {
    const p = recommendPathway('冠心病', 84, ['心衰']);
    expect(p.pathwayId).toBe('chd-medical');
  });

  it('冠心病未明示方式 + 年轻无高危共病 → 默认支架', () => {
    const p = recommendPathway('冠心病心绞痛', 55, ['高血压']);
    expect(p.pathwayId).toBe('chd-stent');
  });

  it('肺炎 CAP 关键词 → 社区获得性路径', () => {
    const p = recommendPathway('社区获得性肺炎', 66, []);
    expect(p.pathwayId).toBe('pneum-cap');
  });

  it('肺炎 HAP 关键词 → 院内获得性路径', () => {
    const p = recommendPathway('医院获得性肺炎', 70, []);
    expect(p.pathwayId).toBe('pneum-hap');
  });

  it('肺炎未明示 + 卧床/机械通气共病 → 按 HAP 处理', () => {
    const p = recommendPathway('肺部感染', 72, ['卧床', '机械通气']);
    expect(p.pathwayId).toBe('pneum-hap');
  });

  it('妊娠糖尿病 → GDM 路径', () => {
    const p = recommendPathway('妊娠糖尿病', 30, []);
    expect(p.pathwayId).toBe('dm-gestational');
    expect(p.icdCode).toBe('O24.4');
  });

  it('普通糖尿病 → 2型路径', () => {
    const p = recommendPathway('2型糖尿病血糖控制不佳', 58, ['高血压']);
    expect(p.pathwayId).toBe('dm-type2');
  });

  it('胆囊切除术 → 腹腔镜路径', () => {
    const p = recommendPathway('胆囊结石胆囊炎拟行LC', 49, []);
    expect(p.pathwayId).toBe('chole-laparoscopic');
    expect(p.standardLosDays).toBe(4);
  });

  it('未识别病种抛 ClinicalPathwayError', () => {
    expect(() => recommendPathway('骨折', 40, [])).toThrow(ClinicalPathwayError);
  });

  it('结果携带临床决策支持免责声明（医生可偏离）', () => {
    const p = recommendPathway('冠心病', 60, []);
    expect(p.disclaimer).toContain('仅供参考');
    expect(p.disclaimer).toContain('医生可根据实际情况偏离');
    expect(PATHWAY_DISCLAIMER).toBe(p.disclaimer);
  });
});

describe('M153-A deviationAnalysis 偏离分析', () => {
  it('无偏离记录 → 未偏离、偏离率 0', () => {
    const d = deviationAnalysis('visit-001', 'chd-stent');
    expect(d.isDeviated).toBe(false);
    expect(d.deviationRate).toBe(0);
    expect(d.items).toHaveLength(0);
  });

  it('登记一次偏离 → isDeviated=true，偏离率按步骤数折算', () => {
    recordPathwayDeviation('visit-002', 'chd-stent', '医师决定暂缓支架，先优化药物', 'clinical_judgement');
    const d = deviationAnalysis('visit-002', 'chd-stent');
    expect(d.isDeviated).toBe(true);
    // chd-stent 共 5 步，偏离 1 条 → 0.2
    expect(d.deviationRate).toBeCloseTo(0.2);
    expect(d.items[0].expected).toBe('入院评估');
    expect(d.items[0].actual).toContain('暂缓支架');
  });

  it('clearPathwayDeviations 后复位为未偏离', () => {
    recordPathwayDeviation('visit-003', 'pneum-cap', '升级广谱抗菌', 'complication');
    clearPathwayDeviations();
    const d = deviationAnalysis('visit-003', 'pneum-cap');
    expect(d.isDeviated).toBe(false);
    expect(d.deviationRate).toBe(0);
  });

  it('空 visitId 抛错；未知 pathwayId 抛错', () => {
    expect(() => deviationAnalysis('', 'chd-stent')).toThrow(ClinicalPathwayError);
    expect(() => deviationAnalysis('visit-x', 'not-exist')).toThrow(ClinicalPathwayError);
  });
});

describe('M153-A getPathwayCost 费用计算', () => {
  it('返回总费用 = 明细之和', () => {
    const c = getPathwayCost('chd-stent');
    const sum = c.items.reduce((acc, it) => acc + it.amountCny, 0);
    expect(c.totalCny).toBe(sum);
    expect(c.totalCny).toBe(26500);
    expect(c.estimatedDays).toBe(5);
  });

  it('胆囊路径总费用与字典一致', () => {
    const c = getPathwayCost('chole-laparoscopic');
    expect(c.totalCny).toBe(11000);
  });

  it('未知路径抛 ClinicalPathwayError', () => {
    expect(() => getPathwayCost('nope')).toThrow(ClinicalPathwayError);
  });

  it('费用结果携带免责声明', () => {
    expect(getPathwayCost('dm-type2').disclaimer).toContain('仅供参考');
  });
});
