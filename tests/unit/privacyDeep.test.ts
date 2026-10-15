/**
 * 健澜科技 jlmedaios - M155-B 患者隐私深度脱敏单测
 *
 * 覆盖：
 *  - maskDiagnosis：保留疾病大类，具体亚型（型/期/级/度）脱敏；
 *  - deepMaskPatientData：姓名/证件/手机/地址/诊断五类字段、嵌套与数组、
 *    大小写不敏感字段名、入参不被修改（纯函数）；
 *  - auditDataAccess：风险等级推导（导出 PII=高 / 查看 PII=中 / 其余=低）、
 *    审计记录不落地原始 PII；
 *  - checkPrivacyCompliance：四项检查齐全、总体 pass、得分 100。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  auditDataAccess,
  checkPrivacyCompliance,
  deepMaskPatientData,
  maskDiagnosis,
  DEFAULT_DEEP_MASK_RULES,
} from '../../src/bff/aggregators/privacyDeepAggregator';

/* ------------------------------------------------------------------ */
/* maskDiagnosis                                                        */
/* ------------------------------------------------------------------ */

describe('maskDiagnosis', () => {
  it('保留疾病大类，数字亚型脱敏', () => {
    expect(maskDiagnosis('2型糖尿病')).toBe('*型糖尿病');
    expect(maskDiagnosis('高血压3级')).toBe('高血压*级');
  });
  it('罗马数字亚型同样脱敏', () => {
    expect(maskDiagnosis('肺癌Ⅲ期')).toBe('肺癌*期');
  });
  it('无亚型时原样保留', () => {
    expect(maskDiagnosis('糖尿病')).toBe('糖尿病');
    expect(maskDiagnosis('急性阑尾炎')).toBe('急性阑尾炎');
  });
  it('空值 / 非字符串兜底', () => {
    expect(maskDiagnosis('')).toBe('');
    expect(maskDiagnosis(null)).toBe('');
    expect(maskDiagnosis(undefined)).toBe('');
  });
});

/* ------------------------------------------------------------------ */
/* deepMaskPatientData                                                  */
/* ------------------------------------------------------------------ */

const PATIENT = {
  patientName: '张建国',
  idCard: '330106199001011234',
  phone: '13812345678',
  homeAddress: '杭州市西湖区文三路123号',
  diagnosis: '2型糖尿病',
  dept: '内分泌科',
};

describe('deepMaskPatientData', () => {
  it('五类敏感字段全部深度脱敏（非只遮手机号）', () => {
    const out = deepMaskPatientData(PATIENT, DEFAULT_DEEP_MASK_RULES) as typeof PATIENT;
    expect(out.patientName).toBe('张*国');
    expect(out.idCard).toBe('3301**********1234');
    expect(out.phone).toBe('138****5678');
    expect(out.homeAddress.startsWith('杭州市西湖区')).toBe(true);
    expect(out.homeAddress.endsWith('*')).toBe(true);
    expect(out.diagnosis).toBe('*型糖尿病');
    // 非敏感字段保留
    expect(out.dept).toBe('内分泌科');
  });

  it('缺省字段规则时使用默认规则表', () => {
    const out = deepMaskPatientData({ patientName: '张三', phone: '13812345678' }) as {
      patientName: string;
      phone: string;
    };
    expect(out.patientName).toBe('张*');
    expect(out.phone).toBe('138****5678');
  });

  it('大小写不敏感匹配字段名', () => {
    const input = { PatientName: '李四', PHONE: '13987654321', Diagnosis: '高血压3级' };
    const out = deepMaskPatientData(input, DEFAULT_DEEP_MASK_RULES) as typeof input;
    expect(out.PatientName).toBe('李*');
    expect(out.PHONE).toBe('139****4321');
    expect(out.Diagnosis).toBe('高血压*级');
  });

  it('嵌套对象与数组递归脱敏', () => {
    const input = {
      records: [
        { patientName: '张建国', diagnosis: '2型糖尿病' },
        { patientName: '王五', diagnosis: '肺癌Ⅲ期' },
      ],
      meta: { hospital: '健澜医院' },
    };
    const out = deepMaskPatientData(input, DEFAULT_DEEP_MASK_RULES) as typeof input;
    expect(out.records[0].patientName).toBe('张*国');
    expect(out.records[0].diagnosis).toBe('*型糖尿病');
    expect(out.records[1].patientName).toBe('王*');
    expect(out.records[1].diagnosis).toBe('肺癌*期');
    expect(out.meta.hospital).toBe('健澜医院');
  });

  it('不修改入参（纯函数）', () => {
    const snapshot = JSON.stringify(PATIENT);
    deepMaskPatientData(PATIENT, DEFAULT_DEEP_MASK_RULES);
    expect(JSON.stringify(PATIENT)).toBe(snapshot);
  });
});

/* ------------------------------------------------------------------ */
/* auditDataAccess                                                      */
/* ------------------------------------------------------------------ */

describe('auditDataAccess', () => {
  it('导出 PII 资源为高风险且标记已脱敏', () => {
    const rec = auditDataAccess('u_001', 'patient', 'p_1001', 'export');
    expect(rec.userId).toBe('u_001');
    expect(rec.resourceType).toBe('patient');
    expect(rec.resourceId).toBe('p_1001');
    expect(rec.action).toBe('export');
    expect(rec.riskLevel).toBe('high');
    expect(rec.piiInvolved).toBe(true);
    expect(rec.masked).toBe(true);
    expect(rec.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('查看 PII 资源为中风险', () => {
    const rec = auditDataAccess('u_002', 'emr', 'e_2002', 'view');
    expect(rec.riskLevel).toBe('medium');
    expect(rec.piiInvolved).toBe(true);
    expect(rec.masked).toBe(true);
  });

  it('非 PII 资源为低风险且无需脱敏', () => {
    const rec = auditDataAccess('u_003', 'systemConfig', 'c_1', 'view');
    expect(rec.riskLevel).toBe('low');
    expect(rec.piiInvolved).toBe(false);
    expect(rec.masked).toBe(false);
  });

  it('空 userId / resourceId 兜底', () => {
    const rec = auditDataAccess('', 'diagnosis', '', 'list');
    expect(rec.userId).toBe('anonymous');
    expect(rec.resourceId).toBe('-');
    expect(rec.piiInvolved).toBe(true);
  });

  it('审计记录不含原始 PII 字段', () => {
    const rec = auditDataAccess('u_001', 'patient', 'p_1', 'view');
    const keys = Object.keys(rec);
    expect(keys).not.toContain('patientName');
    expect(keys).not.toContain('idCard');
    expect(keys).not.toContain('phone');
  });
});

/* ------------------------------------------------------------------ */
/* checkPrivacyCompliance                                               */
/* ------------------------------------------------------------------ */

describe('checkPrivacyCompliance', () => {
  it('总体 pass 且得分 100', () => {
    const report = checkPrivacyCompliance();
    expect(report.overall).toBe('pass');
    expect(report.score).toBe(100);
  });

  it('四项检查齐全', () => {
    const report = checkPrivacyCompliance();
    const keys = report.items.map((i) => i.key);
    expect(keys).toContain('api-default-mask');
    expect(keys).toContain('log-no-sensitive');
    expect(keys).toContain('export-masked');
    expect(keys).toContain('least-privilege');
    expect(report.items.every((i) => i.status === 'pass')).toBe(true);
  });

  it('附带深度脱敏样例', () => {
    const report = checkPrivacyCompliance();
    expect(report.maskedSamples.name).toBe('张*国');
    expect(report.maskedSamples.idCard).toBe('3301**********1234');
    expect(report.maskedSamples.phone).toBe('138****5678');
    expect(report.maskedSamples.diagnosis).toBe('*型糖尿病');
    expect(report.checkedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
