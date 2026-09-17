/**
 * 健澜科技数智医院智能体 - 数据分级分类器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, expect, test } from 'bun:test';
import { DataClassifier } from '../../../src/security';
import { DataLevel } from '../../../src/security';

describe('DataClassifier', () => {
  const classifier = new DataClassifier();

  test('患者标识信息（姓名/身份证/手机号）为L4机密', () => {
    expect(classifier.classify('patientName').level).toBe(DataLevel.L4_CONFIDENTIAL);
    expect(classifier.classify('idCardNumber').level).toBe(DataLevel.L4_CONFIDENTIAL);
    expect(classifier.classify('mobilePhone').level).toBe(DataLevel.L4_CONFIDENTIAL);
    expect(classifier.classify('homeAddress').level).toBe(DataLevel.L4_CONFIDENTIAL);
  });

  test('医疗健康信息为L3敏感', () => {
    expect(classifier.classify('diagnosis').level).toBe(DataLevel.L3_SENSITIVE);
    expect(classifier.classify('emrContent').level).toBe(DataLevel.L3_SENSITIVE);
    expect(classifier.classify('labResult').level).toBe(DataLevel.L3_SENSITIVE);
    expect(classifier.classify('prescriptionOrder').level).toBe(DataLevel.L3_SENSITIVE);
    expect(classifier.classify('inpatientNo').level).toBe(DataLevel.L3_SENSITIVE);
  });

  test('运营管理信息为L2内部', () => {
    expect(classifier.classify('feeAmount').level).toBe(DataLevel.L2_INTERNAL);
    expect(classifier.classify('dutySchedule').level).toBe(DataLevel.L2_INTERNAL);
    expect(classifier.classify('qcScore').level).toBe(DataLevel.L2_INTERNAL);
  });

  test('公开信息为L1公开', () => {
    expect(classifier.classify('deptIntroduction').level).toBe(DataLevel.L1_PUBLIC);
    expect(classifier.classify('doctorProfile').level).toBe(DataLevel.L1_PUBLIC);
    expect(classifier.classify('healthEducation').level).toBe(DataLevel.L1_PUBLIC);
  });

  test('基于内容识别手机号为L4', () => {
    const result = classifier.classify('remark', '联系电话：13812345678');
    expect(result.level).toBe(DataLevel.L4_CONFIDENTIAL);
    expect(result.source).toBe('content');
  });

  test('未命中规则的字段按默认级别L2', () => {
    const result = classifier.classify('someUnknownField');
    expect(result.level).toBe(DataLevel.L2_INTERNAL);
    expect(result.source).toBe('default');
  });

  test('getHighestLevel取对象中最高级别', () => {
    const level = classifier.getHighestLevel({
      deptIntro: '介绍',
      patientName: '张三',
      diagnosis: '高血压',
    });
    expect(level).toBe(DataLevel.L4_CONFIDENTIAL);
  });

  test('分类结果可缓存', () => {
    const c = new DataClassifier({ enableCache: true });
    const r1 = c.classify('patientName');
    const r2 = c.classify('patientName');
    expect(r1.level).toBe(r2.level);
    c.clearCache();
  });

  test('人工修正分级会产生审计记录', () => {
    const c = new DataClassifier();
    c.overrideLevel('diagnosis', DataLevel.L4_CONFIDENTIAL, 'admin001');
    const trail = c.getAuditTrail();
    expect(trail.length).toBe(1);
    expect(trail[0].operator).toBe('admin001');
    expect(trail[0].newLevel).toBe(DataLevel.L4_CONFIDENTIAL);
  });

  test('10+种敏感字段均可识别分级', () => {
    const fields = [
      'patientName', 'idCardNumber', 'mobilePhone', 'homeAddress', 'email',
      'bankCardNo', 'diagnosis', 'emrContent', 'labResult', 'imagingReport',
      'prescriptionOrder', 'inpatientNo', 'feeAmount', 'dutySchedule',
    ];
    const classified = classifier.classifyFields(Object.fromEntries(fields.map((f) => [f, ''])));
    const l4 = Object.values(classified).filter((r) => r.level === DataLevel.L4_CONFIDENTIAL).length;
    const l3 = Object.values(classified).filter((r) => r.level === DataLevel.L3_SENSITIVE).length;
    expect(l4).toBeGreaterThanOrEqual(6);
    expect(l3).toBeGreaterThanOrEqual(5);
  });
});
