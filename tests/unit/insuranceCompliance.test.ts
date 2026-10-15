/**
 * 健澜科技 jlmedaios - 医保控费智能提醒（M121-D）纯函数单测
 *
 * 覆盖：
 *  - 合规检查（pass / warning / blocked 三分支 + riskLevel 汇总 + summary）；
 *  - 医保规则（目录外 critical / 限定适应症不符 warning / 超量 warning / 乙类自付 info）；
 *  - 替代方案（仅对不合规项目推荐 + 按节省金额降序）；
 *  - 历史违规透传 + 重复违规标记；
 *  - 患者姓名脱敏 + 非法输入安全降级。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildInsuranceComplianceAssistant,
  maskPatientName,
  type InsuranceComplianceData,
} from '../../src/bff/aggregators/insuranceComplianceAggregator';

const item = (
  itemCode: string,
  itemName: string,
  extra?: Partial<{ quantity: number; unitPrice: number; category: string }>,
) => ({
  itemCode, itemName, category: extra?.category ?? '药品',
  quantity: extra?.quantity, unitPrice: extra?.unitPrice,
});

const baseData = (over: Partial<InsuranceComplianceData> = {}): InsuranceComplianceData => ({
  items: [], diagnoses: [], catalog: {}, historyViolations: [], alternatives: {}, ...over,
});

describe('患者脱敏', () => {
  it('张建国 -> 张*国；张三 -> 张*；空值 -> 待确认患者', () => {
    expect(maskPatientName('张建国')).toBe('张*国');
    expect(maskPatientName('张三')).toBe('张*');
    expect(maskPatientName('')).toBe('待确认患者');
    expect(maskPatientName(undefined)).toBe('待确认患者');
    const r = buildInsuranceComplianceAssistant('d001', 'rx001', 'p001', baseData({ patientName: '王秀兰' }));
    expect(r.patientName).toBe('王*兰');
  });
});

describe('医保规则', () => {
  it('目录外项目（编码不在 catalog）-> critical，触发 out_of_catalog', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx002', 'p001', baseData({
      items: [item('X999', '进口营养补充剂')],
      catalog: { Y001: { reimburseType: '甲' } },
    }));
    const hit = r.insuranceLimits.find((l) => l.rule === 'out_of_catalog');
    expect(hit?.level).toBe('critical');
    expect(hit?.detail).toContain('医保基金不予支付');
  });

  it('目录内但限定适应症不满足当前诊断 -> warning，触发 limited_indication', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx003', 'p001', baseData({
      items: [item('Y002', '注射用曲妥珠单抗')],
      diagnoses: ['2型糖尿病'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌', '胃腺癌'] } },
    }));
    const hit = r.insuranceLimits.find((l) => l.rule === 'limited_indication');
    expect(hit?.level).toBe('warning');
    expect(hit?.detail).toContain('限定支付适应症');
  });

  it('诊断命中限定适应症 -> 不触发 limited_indication', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx004', 'p001', baseData({
      items: [item('Y002', '注射用曲妥珠单抗')],
      diagnoses: ['肺腺癌术后'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'] } },
    }));
    expect(r.insuranceLimits.some((l) => l.rule === 'limited_indication')).toBe(false);
  });

  it('数量超过 maxQuantity -> warning，触发 over_quantity', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx005', 'p001', baseData({
      items: [item('Y001', '阿莫西林胶囊', { quantity: 30 })],
      catalog: { Y001: { reimburseType: '甲', maxQuantity: 14 } },
    }));
    const hit = r.insuranceLimits.find((l) => l.rule === 'over_quantity');
    expect(hit?.level).toBe('warning');
    expect(hit?.detail).toContain('超过医保单次合理上限');
  });

  it('乙类药品带 selfPayRatio -> info，触发 self_pay（不阻断）', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx006', 'p001', baseData({
      items: [item('Y002', '注射用曲妥珠单抗')],
      diagnoses: ['肺腺癌'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'], selfPayRatio: 0.1 } },
    }));
    const hit = r.insuranceLimits.find((l) => l.rule === 'self_pay');
    expect(hit?.level).toBe('info');
    expect(hit?.detail).toContain('先行自付 10%');
  });

  it('甲类无限定、未超量 -> 无任何命中', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx007', 'p001', baseData({
      items: [item('Y001', '阿莫西林胶囊', { quantity: 7 })],
      catalog: { Y001: { reimburseType: '甲', maxQuantity: 14 } },
    }));
    expect(r.insuranceLimits.length).toBe(0);
  });
});

describe('合规检查', () => {
  it('存在目录外 critical -> status=blocked，riskLevel=critical', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx008', 'p001', baseData({
      items: [item('X999', '自费药')],
      catalog: {},
    }));
    expect(r.complianceCheck.status).toBe('blocked');
    expect(r.complianceCheck.riskLevel).toBe('critical');
    expect(r.complianceCheck.summary).toContain('不予支付');
  });

  it('仅 warning（限定适应症）-> status=warning，riskLevel=warning', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx009', 'p001', baseData({
      items: [item('Y002', '靶向药')],
      diagnoses: ['高血压'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'] } },
    }));
    expect(r.complianceCheck.status).toBe('warning');
    expect(r.complianceCheck.riskLevel).toBe('warning');
  });

  it('仅 info（乙类自付）-> status=warning，riskLevel=info', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx010', 'p001', baseData({
      items: [item('Y002', '靶向药')],
      diagnoses: ['肺腺癌'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'], selfPayRatio: 0.1 } },
    }));
    expect(r.complianceCheck.status).toBe('warning');
    expect(r.complianceCheck.riskLevel).toBe('info');
  });

  it('无任何命中 -> status=pass，summary 提示可正常结算', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx011', 'p001', baseData({
      items: [item('Y001', '阿莫西林胶囊')],
      catalog: { Y001: { reimburseType: '甲' } },
    }));
    expect(r.complianceCheck.status).toBe('pass');
    expect(r.complianceCheck.hitCount).toBe(0);
  });
});

describe('历史违规', () => {
  it('透传历史违规，且本次同类规则再次命中 -> repeated=true', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx012', 'p001', baseData({
      items: [item('Y002', '靶向药')],
      diagnoses: ['高血压'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'] } },
      historyViolations: [
        { date: '2026-09-01', type: 'limited_indication', detail: '历史限定适应症不符', amount: 5000 },
        { date: '2026-08-01', type: 'over_quantity', detail: '历史超量', amount: 45 },
      ],
    }));
    expect(r.historyViolations.length).toBe(2);
    const repeated = r.historyViolations.find((h) => h.type === 'limited_indication');
    expect(repeated?.repeated).toBe(true);
    const notRepeated = r.historyViolations.find((h) => h.type === 'over_quantity');
    expect(notRepeated?.repeated).toBe(false);
    // 按日期降序
    expect(r.historyViolations[0].date >= r.historyViolations[1].date).toBe(true);
  });
});

describe('替代方案', () => {
  it('仅对 critical / warning 项目推荐替代，info 级不推荐', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx013', 'p001', baseData({
      items: [item('X999', '自费药'), item('Y002', '乙类靶向药')],
      diagnoses: ['肺腺癌'],
      catalog: { Y002: { reimburseType: '乙', limitedIndications: ['肺腺癌'], selfPayRatio: 0.1 } },
      alternatives: {
        X999: [{ itemCode: 'Y010', itemName: '甲类等效药', reason: '目录内', estimatedSaving: 760 }],
        Y002: [{ itemCode: 'Y011', itemName: '国谈仿制', reason: '同通用名', estimatedSaving: 1200 }],
      },
    }));
    // X999 是 critical -> 推荐；Y002 仅 info(self_pay) -> 不推荐
    expect(r.alternatives.some((a) => a.itemCode === 'Y010')).toBe(true);
    expect(r.alternatives.some((a) => a.itemCode === 'Y011')).toBe(false);
  });

  it('替代方案按估算节省金额降序', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx014', 'p001', baseData({
      items: [item('X999', '自费药')],
      catalog: {},
      alternatives: {
        X999: [
          { itemCode: 'A', itemName: '便宜药', reason: 'r', estimatedSaving: 100 },
          { itemCode: 'B', itemName: '更便宜药', reason: 'r', estimatedSaving: 900 },
        ],
      },
    }));
    expect(r.alternatives[0].itemCode).toBe('B');
    expect(r.alternatives[0].estimatedSaving).toBe(900);
  });

  it('合规处方（无限制命中）-> 无替代方案', () => {
    const r = buildInsuranceComplianceAssistant('d001', 'rx015', 'p001', baseData({
      items: [item('Y001', '阿莫西林胶囊')],
      catalog: { Y001: { reimburseType: '甲' } },
      alternatives: { Y001: [{ itemCode: 'Z', itemName: 'x', reason: 'r', estimatedSaving: 10 }] },
    }));
    expect(r.alternatives.length).toBe(0);
  });
});

describe('非法输入安全降级', () => {
  it('undefined / null data -> 空结果不抛错', () => {
    // undefined / null 为签名允许的兜底入参，纯函数内安全降级
    const r = buildInsuranceComplianceAssistant('d001', 'rx016', 'p001', undefined);
    expect(r.insuranceLimits.length).toBe(0);
    expect(r.historyViolations.length).toBe(0);
    expect(r.alternatives.length).toBe(0);
    expect(r.complianceCheck.status).toBe('pass');
    expect(r.patientName).toBe('待确认患者');
  });

  it('doctorId / prescriptionId / patientId 不回显进输出', () => {
    const r = buildInsuranceComplianceAssistant('doctor_secret', 'rx_secret', 'patient_secret', baseData({
      patientName: '张三',
    }));
    const serialized = JSON.stringify(r);
    expect(serialized).not.toContain('doctor_secret');
    expect(serialized).not.toContain('patient_secret');
    expect(serialized).not.toContain('张三');
  });
});
