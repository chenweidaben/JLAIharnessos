/**
 * 健澜科技 jlmedaios - DRG/DIP 智能审核规则引擎单元测试
 *
 * 覆盖 22 条规则，每条至少 1 个命中 + 1 个不命中用例；并校验批量与命中率统计。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  auditBatch,
  DRG_AUDIT_RULES,
  evaluateRules,
  hitRateStats,
  SAMPLE_DRG_CONFIG,
  type DrgAuditConfig,
  type DrgAuditVisit,
} from '../../src/bff/aggregators/drgAuditAggregator';

/**
 * 测试基配置：把规则引用到的编码（G001/N001/C001/R001）并入目录，
 * 避免这些条目因「超医保目录」污染用例断言。
 */
const cfg: DrgAuditConfig = {
  ...SAMPLE_DRG_CONFIG,
  catalog: {
    ...SAMPLE_DRG_CONFIG.catalog,
    G001: {},
    N001: {},
    C001: {},
    R001: {},
  },
};

/** 取某规则命中数 */
function has(visit: DrgAuditVisit, rule: string): boolean {
  return evaluateRules(visit, cfg).hits.some((h) => h.rule === rule);
}

describe('01 超医保目录 catalog.out_of_catalog', () => {
  it('目录外编码命中', () => {
    expect(has({ items: [{ itemCode: 'X999', itemName: '自费项目', category: '治疗', billedAt: '2026-01-01' }] }, 'catalog.out_of_catalog')).toBe(true);
  });
  it('目录内编码不命中', () => {
    expect(has({ items: [{ itemCode: 'Y001', itemName: '甲药', category: '药品', billedAt: '2026-01-01' }] }, 'catalog.out_of_catalog')).toBe(false);
  });
});

describe('02 限定支付 payment.limited_indication', () => {
  it('诊断不符命中', () => {
    expect(has({ principalDiagnosis: '高血压', items: [{ itemCode: 'Y002', itemName: '靶向药', category: '药品', billedAt: '2026-01-01' }] }, 'payment.limited_indication')).toBe(true);
  });
  it('诊断符合不命中', () => {
    expect(has({ principalDiagnosis: '肺腺癌', items: [{ itemCode: 'Y002', itemName: '靶向药', category: '药品', billedAt: '2026-01-01' }] }, 'payment.limited_indication')).toBe(false);
  });
});

describe('03 超限价 payment.price_cap_exceed', () => {
  it('单价超限价命中', () => {
    expect(has({ items: [{ itemCode: 'Y004', itemName: '检查', category: '检查', billedAt: '2026-01-01', unitPrice: 600 }] }, 'payment.price_cap_exceed')).toBe(true);
  });
  it('单价合规不命中', () => {
    expect(has({ items: [{ itemCode: 'Y004', itemName: '检查', category: '检查', billedAt: '2026-01-01', unitPrice: 100 }] }, 'payment.price_cap_exceed')).toBe(false);
  });
});

describe('04 重复收费 billing.duplicate_same_day', () => {
  it('同日同类别超上限命中', () => {
    const items = ['Y001', 'Y002', 'Y003'].map((code) => ({ itemCode: code, itemName: '药', category: '药品', billedAt: '2026-01-01' }));
    expect(has({ items }, 'billing.duplicate_same_day')).toBe(true);
  });
  it('同日同类别未超上限不命中', () => {
    const items = ['Y001', 'Y002'].map((code) => ({ itemCode: code, itemName: '药', category: '药品', billedAt: '2026-01-01' }));
    expect(has({ items }, 'billing.duplicate_same_day')).toBe(false);
  });
});

describe('05 打包重复 billing.package_duplicate', () => {
  it('同编码同日 3 次命中', () => {
    const items = [1, 2, 3].map(() => ({ itemCode: 'Y001', itemName: '甲药', category: '药品', billedAt: '2026-01-01' }));
    expect(has({ items }, 'billing.package_duplicate')).toBe(true);
  });
  it('同编码同日 1 次不命中', () => {
    expect(has({ items: [{ itemCode: 'Y001', itemName: '甲药', category: '药品', billedAt: '2026-01-01' }] }, 'billing.package_duplicate')).toBe(false);
  });
});

describe('06 分解住院 admission.decomposition', () => {
  it('窗口期同诊断再入院命中', () => {
    expect(has({ admissionAt: '2026-01-20', principalDiagnosis: '阑尾炎', priorAdmissions: [{ dischargeAt: '2026-01-10', principalDiagnosis: '阑尾炎' }] }, 'admission.decomposition')).toBe(true);
  });
  it('超窗口期再入院不命中', () => {
    expect(has({ admissionAt: '2026-03-20', principalDiagnosis: '阑尾炎', priorAdmissions: [{ dischargeAt: '2026-01-10', principalDiagnosis: '阑尾炎' }] }, 'admission.decomposition')).toBe(false);
  });
});

describe('07 低标入院 admission.low_standard', () => {
  it('短住院低费用无手术命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 1, totalCost: 1000 }, 'admission.low_standard')).toBe(true);
  });
  it('费用达标不命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 1, totalCost: 5000 }, 'admission.low_standard')).toBe(false);
  });
});

describe('08 缺主诊断 admission.missing_principal_dx', () => {
  it('无主诊断命中', () => {
    expect(has({ diagnoses: ['高血压'] }, 'admission.missing_principal_dx')).toBe(true);
  });
  it('有主诊断不命中', () => {
    expect(has({ principalDiagnosis: '高血压' }, 'admission.missing_principal_dx')).toBe(false);
  });
});

describe('09 高套分值 drg.upcoding', () => {
  it('重症诊断费用低命中', () => {
    expect(has({ principalDiagnosis: '脓毒症休克', totalCost: 5000 }, 'drg.upcoding')).toBe(true);
  });
  it('重症诊断费用充分不命中', () => {
    expect(has({ principalDiagnosis: '脓毒症休克', totalCost: 30000 }, 'drg.upcoding')).toBe(false);
  });
});

describe('10 诊断手术不匹配 drg.dx_proc_mismatch', () => {
  it('操作期望诊断不符命中', () => {
    expect(has({ principalDiagnosis: '高血压', procedures: [{ code: 'P001', name: '阑尾切除' }] }, 'drg.dx_proc_mismatch')).toBe(true);
  });
  it('操作与诊断匹配不命中', () => {
    expect(has({ principalDiagnosis: '急性阑尾炎', procedures: [{ code: 'P001', name: '阑尾切除' }] }, 'drg.dx_proc_mismatch')).toBe(false);
  });
});

describe('11 有手术无诊断 procedure.without_diagnosis', () => {
  it('有操作无任何诊断命中', () => {
    expect(has({ procedures: [{ code: 'P002', name: '缝合' }] }, 'procedure.without_diagnosis')).toBe(true);
  });
  it('有操作有诊断不命中', () => {
    expect(has({ principalDiagnosis: '外伤', procedures: [{ code: 'P002', name: '缝合' }] }, 'procedure.without_diagnosis')).toBe(false);
  });
});

describe('12 超限用药 drug.overlimit_dose', () => {
  it('日总量超上限命中', () => {
    expect(has({ items: [{ itemCode: 'Y001', itemName: '甲药', category: '药品', billedAt: '2026-01-01', quantity: 5 }] }, 'drug.overlimit_dose')).toBe(true);
  });
  it('日总量合规不命中', () => {
    expect(has({ items: [{ itemCode: 'Y001', itemName: '甲药', category: '药品', billedAt: '2026-01-01', quantity: 2 }] }, 'drug.overlimit_dose')).toBe(false);
  });
});

describe('13 抗菌药无感染 drug.antibacterial_no_infection', () => {
  it('抗菌药无感染诊断命中', () => {
    expect(has({ principalDiagnosis: '高血压', items: [{ itemCode: 'Y003', itemName: '头孢', category: '药品', billedAt: '2026-01-01', drugClass: 'antibacterial' }] }, 'drug.antibacterial_no_infection')).toBe(true);
  });
  it('抗菌药有感染诊断不命中', () => {
    expect(has({ principalDiagnosis: '肺炎', items: [{ itemCode: 'Y003', itemName: '头孢', category: '药品', billedAt: '2026-01-01', drugClass: 'antibacterial' }] }, 'drug.antibacterial_no_infection')).toBe(false);
  });
});

describe('14 重点监控药无适应症 drug.restricted_no_indication', () => {
  it('重点监控药无肿瘤/慢病诊断命中', () => {
    expect(has({ principalDiagnosis: '骨折', items: [{ itemCode: 'R001', itemName: '监控药', category: '药品', billedAt: '2026-01-01' }] }, 'drug.restricted_no_indication')).toBe(true);
  });
  it('重点监控药有适应症不命中', () => {
    expect(has({ principalDiagnosis: '2型糖尿病', items: [{ itemCode: 'R001', itemName: '监控药', category: '药品', billedAt: '2026-01-01' }] }, 'drug.restricted_no_indication')).toBe(false);
  });
});

describe('15 重复检验 lab.duplicate_test', () => {
  it('窗口内重复检验命中', () => {
    const items = [
      { itemCode: 'Y005', itemName: '血常规', category: '检验' as string, billedAt: '2026-01-01' },
      { itemCode: 'Y005', itemName: '血常规', category: '检验' as string, billedAt: '2026-01-05' },
    ];
    expect(has({ items }, 'lab.duplicate_test')).toBe(true);
  });
  it('超窗口重复检验不命中', () => {
    const items = [
      { itemCode: 'Y005', itemName: '血常规', category: '检验' as string, billedAt: '2026-01-01' },
      { itemCode: 'Y005', itemName: '血常规', category: '检验' as string, billedAt: '2026-01-20' },
    ];
    expect(has({ items }, 'lab.duplicate_test')).toBe(false);
  });
});

describe('16 高值耗材无手术 consumable.unreasonable', () => {
  it('高值耗材无手术命中', () => {
    expect(has({ items: [{ itemCode: 'C001', itemName: '支架', category: '耗材', billedAt: '2026-01-01' }] }, 'consumable.unreasonable')).toBe(true);
  });
  it('高值耗材有手术不命中', () => {
    expect(has({ principalDiagnosis: '冠心病', procedures: [{ code: 'P009', name: 'PCI' }], items: [{ itemCode: 'C001', itemName: '支架', category: '耗材', billedAt: '2026-01-01' }] }, 'consumable.unreasonable')).toBe(false);
  });
});

describe('17 耗材超量 consumable.qty_exceed', () => {
  it('数量超上限命中', () => {
    expect(has({ items: [{ itemCode: 'C001', itemName: '缝线', category: '耗材', billedAt: '2026-01-01', quantity: 5 }] }, 'consumable.qty_exceed')).toBe(true);
  });
  it('数量合规不命中', () => {
    expect(has({ items: [{ itemCode: 'C001', itemName: '缝线', category: '耗材', billedAt: '2026-01-01', quantity: 2 }] }, 'consumable.qty_exceed')).toBe(false);
  });
});

describe('18 性别不符 item.sex_mismatch', () => {
  it('男性用女性项目命中', () => {
    expect(has({ sex: 'M', items: [{ itemCode: 'G001', itemName: '妇科检查', category: '检查', billedAt: '2026-01-01' }] }, 'item.sex_mismatch')).toBe(true);
  });
  it('性别匹配不命中', () => {
    expect(has({ sex: 'F', items: [{ itemCode: 'G001', itemName: '妇科检查', category: '检查', billedAt: '2026-01-01' }] }, 'item.sex_mismatch')).toBe(false);
  });
});

describe('19 年龄不符 item.age_mismatch', () => {
  it('成人用新生儿项目命中', () => {
    expect(has({ age: 30, items: [{ itemCode: 'N001', itemName: '新生儿药', category: '药品', billedAt: '2026-01-01' }] }, 'item.age_mismatch')).toBe(true);
  });
  it('年龄匹配不命中', () => {
    expect(has({ age: 0, items: [{ itemCode: 'N001', itemName: '新生儿药', category: '药品', billedAt: '2026-01-01' }] }, 'item.age_mismatch')).toBe(false);
  });
});

describe('20 超长住院 los.excess', () => {
  it('超基准天数命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 45 }, 'los.excess')).toBe(true);
  });
  it('未超基准不命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 10 }, 'los.excess')).toBe(false);
  });
});

describe('21 短住院日费用畸高 visit.short_los_high_cost', () => {
  it('短住院日高费用命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 2, totalCost: 80000 }, 'visit.short_los_high_cost')).toBe(true);
  });
  it('短住院日费用正常不命中', () => {
    expect(has({ principalDiagnosis: '高血压', losDays: 2, totalCost: 10000 }, 'visit.short_los_high_cost')).toBe(false);
  });
});

describe('22 同日重复操作 billing.day_duplicate_procedure', () => {
  it('同操作同日 2 次命中', () => {
    expect(has({ principalDiagnosis: '外伤', procedures: [{ code: 'P002', name: '缝合', performedAt: '2026-01-01' }, { code: 'P002', name: '缝合', performedAt: '2026-01-01' }] }, 'billing.day_duplicate_procedure')).toBe(true);
  });
  it('同操作仅 1 次不命中', () => {
    expect(has({ principalDiagnosis: '外伤', procedures: [{ code: 'P002', name: '缝合', performedAt: '2026-01-01' }] }, 'billing.day_duplicate_procedure')).toBe(false);
  });
});

describe('批量与命中率统计', () => {
  it('auditBatch 输出与逐条一致', () => {
    const visits: DrgAuditVisit[] = [
      { visitId: 'V1', principalDiagnosis: '高血压', items: [{ itemCode: 'X999', itemName: '自费', category: '治疗', billedAt: '2026-01-01' }] },
      { visitId: 'V2', principalDiagnosis: '高血压', losDays: 10, totalCost: 5000 },
    ];
    const results = auditBatch(visits, cfg);
    expect(results.length).toBe(2);
    expect(results[0]?.blocked).toBe(true);
    expect(results[1]?.hitCount).toBe(0);
  });

  it('hitRateStats 正确汇总', () => {
    const visits: DrgAuditVisit[] = [
      { visitId: 'V1', items: [{ itemCode: 'X999', itemName: '自费', category: '治疗', billedAt: '2026-01-01' }] },
      { visitId: 'V2', principalDiagnosis: '高血压', losDays: 10, totalCost: 5000 },
    ];
    const stats = hitRateStats(auditBatch(visits, cfg));
    expect(stats.totalVisits).toBe(2);
    expect(stats.hitVisits).toBe(1);
    expect(stats.hitRate).toBe(0.5);
    expect(stats.byRule['catalog.out_of_catalog']?.hits).toBe(1);
  });

  it('空输入安全降级', () => {
    expect(hitRateStats(null).totalVisits).toBe(0);
    expect(evaluateRules(null, cfg).riskLevel).toBe('low');
  });

  it('内置规则库为 22 条且全部启用', () => {
    expect(DRG_AUDIT_RULES.length).toBe(22);
    expect(DRG_AUDIT_RULES.every((r) => r.enabled)).toBe(true);
  });
});
