/**
 * 健澜科技 jlmedaios — 【系统集成深化】HL7 v2.x / FHIR R4 纯函数单测（M155-C）
 *
 * 覆盖：HL7 报文解析（ADT^A04 / ORM^O01 / ORU^R01 / DFT^P03）、
 *       FHIR R4 资源装配（Patient / Observation / MedicationRequest）、
 *       资源必填字段校验（valid / invalid）。
 * 全部为纯函数单测，使用 mock 报文，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import {
  buildFHIRResource,
  FHIR_R4_SCHEMAS,
  hl7DateTimeToIso,
  hl7GenderToFhir,
  parseHL7Message,
  validateFHIRResource,
  type FHIRResource,
} from '../../src/bff/aggregators/integrationHl7Aggregator';

/** 用 0x0D 作为段分隔符（HL7 v2.x 标准） */
const SEG = '\r';

/** ADT^A04 入院登记样例 */
const ADT_A04 = [
  'MSH|^~\\&|HIS|健澜总院|EMR|健澜总院|20261016093000||ADT^A04|MSG000001|P|2.5.1',
  'EVN|A04|20261016093000',
  'PID|1||MRN20261001^健澜^^^MRN||张^三^^^Mr||19850312|F',
  'PV1|1|I|INP^03^12^1|||000000^王医生^^^^DR|||||||||||||VISIT20261001',
].join(SEG);

/** ORU^R01 检验结果样例 */
const ORU_R01 = [
  'MSH|^~\\&|LIS|健澜总院|EMR|健澜总院|20261016100000||ORU^R01|MSG000002|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'OBR|1|||2951-2^收缩压^LN',
  'OBX|1|NM|2951-2^收缩压^LN||120|mmHg|||F',
  'OBX|2|NM|6690-2^舒张压^LN||80|mmHg|||F',
].join(SEG);

/** ORM^O01 医嘱下单样例 */
const ORM_O01 = [
  'MSH|^~\\&|HIS|健澜总院|PHARM|健澜总院|20261016110000||ORM^O01|MSG000003|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'ORC|NW|ORD001|||9|20261016110000',
  'OBR|1|||04AA0^阿莫西林^ATC',
].join(SEG);

/** DFT^P03 账单更新样例 */
const DFT_P03 = [
  'MSH|^~\\&|HIS|健澜总院|BILL|健澜总院|20261016120000||DFT^P03|MSG000004|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'FT1|1|20261016120000|CHG|门诊挂号费|||15.00',
].join(SEG);

describe('M155-C HL7 v2.x 解析', () => {
  it('ADT^A04：正确提取消息事件、患者、就诊号', () => {
    const m = parseHL7Message(ADT_A04);
    expect(m.messageEvent).toBe('ADT^A04');
    expect(m.messageType).toBe('ADT');
    expect(m.triggerEvent).toBe('A04');
    expect(m.messageControlId).toBe('MSG000001');
    expect(m.sendingApplication).toBe('HIS');
    expect(m.patientId).toBe('MRN20261001');
    expect(m.patientName).toBe('张 三');
    expect(m.administrativeSex).toBe('F');
    expect(m.dateTimeOfBirth).toBe('1985-03-12');
    expect(m.visitNumber).toBe('VISIT20261001');
    expect(m.errors).toEqual([]);
  });

  it('ORU^R01：抽取 OBX 为检验结果列表', () => {
    const m = parseHL7Message(ORU_R01);
    expect(m.messageEvent).toBe('ORU^R01');
    expect(m.observations.length).toBe(2);
    expect(m.observations[0].code).toBe('2951-2');
    expect(m.observations[0].display).toBe('收缩压');
    expect(m.observations[0].value).toBe('120');
    expect(m.observations[0].unit).toBe('mmHg');
    expect(m.observations[1].code).toBe('6690-2');
  });

  it('ORM^O01：抽取 OBR 为医嘱列表并带开嘱时间', () => {
    const m = parseHL7Message(ORM_O01);
    expect(m.messageEvent).toBe('ORM^O01');
    expect(m.orders.length).toBe(1);
    expect(m.orders[0].code).toBe('04AA0');
    expect(m.orders[0].display).toBe('阿莫西林');
    expect(m.orders[0].authoredOn).toBe('2026-10-16T11:00:00');
  });

  it('DFT^P03：账单消息可解析且落入白名单', () => {
    const m = parseHL7Message(DFT_P03);
    expect(m.messageEvent).toBe('DFT^P03');
    expect(m.patientId).toBe('MRN20261001');
    expect(m.errors).toEqual([]);
  });

  it('空报文 / 非 MSH 开头：返回错误而非抛异常', () => {
    expect(parseHL7Message('').errors.length).toBeGreaterThan(0);
    const bad = parseHL7Message('PID|1||MRN||张^三');
    expect(bad.errors.some((e) => e.includes('MSH'))).toBe(true);
  });

  it('不支持的消息事件：记入 errors 但仍返回已解析字段', () => {
    const weird = [
      'MSH|^~\\&|HIS|FAC|EMR|FAC|20261016093000||ADT^A01|MSG999|P|2.5.1',
      'PID|1||MRN||张^三',
    ].join(SEG);
    const m = parseHL7Message(weird);
    expect(m.messageEvent).toBe('ADT^A01');
    expect(m.errors.some((e) => e.includes('不支持'))).toBe(true);
  });

  it('兼容 \\n 段分隔（部分系统未用 0x0D）', () => {
    const m = parseHL7Message(ADT_A04.replace(/\r/g, '\n'));
    expect(m.messageEvent).toBe('ADT^A04');
    expect(m.patientId).toBe('MRN20261001');
  });
});

describe('M155-C 工具函数', () => {
  it('hl7DateTimeToIso：日期/日期时间转换', () => {
    expect(hl7DateTimeToIso('20261016')).toBe('2026-10-16');
    expect(hl7DateTimeToIso('20261016093000')).toBe('2026-10-16T09:30:00');
    expect(hl7DateTimeToIso('')).toBe('');
  });

  it('hl7GenderToFhir：M/F/O/U 映射', () => {
    expect(hl7GenderToFhir('M')).toBe('male');
    expect(hl7GenderToFhir('F')).toBe('female');
    expect(hl7GenderToFhir('O')).toBe('other');
    expect(hl7GenderToFhir('U')).toBe('unknown');
  });
});

describe('M155-C FHIR R4 资源装配', () => {
  it('Patient：装配 identifier/name/gender/birthDate', () => {
    const p = buildFHIRResource('Patient', {
      id: 'p1',
      identifier: 'MRN001',
      familyName: '张',
      givenNames: ['三'],
      gender: 'female',
      birthDate: '1985-03-12',
    }) as FHIRResource & {
      identifier: Array<{ system: string; value: string }>;
      name: Array<{ family: string; given: string[] }>;
      gender: string;
      birthDate: string;
    };
    expect(p.resourceType).toBe('Patient');
    expect(p.id).toBe('p1');
    expect(p.identifier[0].value).toBe('MRN001');
    expect(p.identifier[0].system).toBe('urn:jianlan:mrn');
    expect(p.name[0].family).toBe('张');
    expect(p.name[0].given).toEqual(['三']);
    expect(p.gender).toBe('female');
    expect(p.birthDate).toBe('1985-03-12');
  });

  it('Observation：数值结果装为 valueQuantity（UCUM）', () => {
    const o = buildFHIRResource('Observation', {
      patientId: 'MRN001',
      code: '2951-2',
      codeDisplay: '收缩压',
      value: 120,
      unit: 'mmHg',
      effectiveDateTime: '2026-10-16T10:00:00',
    }) as FHIRResource & {
      status: string;
      code: { coding: Array<{ system: string; code: string }> };
      subject: { reference: string };
      valueQuantity: { value: number; unit: string };
    };
    expect(o.resourceType).toBe('Observation');
    expect(o.status).toBe('final');
    expect(o.code.coding[0].system).toBe('http://loinc.org');
    expect(o.code.coding[0].code).toBe('2951-2');
    expect(o.subject.reference).toBe('Patient/MRN001');
    expect(o.valueQuantity.value).toBe(120);
    expect(o.valueQuantity.unit).toBe('mmHg');
  });

  it('Observation：文本结果装为 valueString', () => {
    const o = buildFHIRResource('Observation', {
      patientId: 'MRN001',
      code: '55752-0',
      codeDisplay: '心电图结论',
      valueText: '窦性心律，正常心电图',
    }) as FHIRResource & { valueString: string };
    expect(o.valueString).toBe('窦性心律，正常心电图');
  });

  it('MedicationRequest：装配 status/intent/medicationCodeableConcept', () => {
    const m = buildFHIRResource('MedicationRequest', {
      patientId: 'MRN001',
      medicationCode: '04AA0',
      medicationDisplay: '阿莫西林',
      authoredOn: '2026-10-16T11:00:00',
    }) as FHIRResource & {
      status: string;
      intent: string;
      subject: { reference: string };
      medicationCodeableConcept: { coding: Array<{ code: string; display: string }> };
    };
    expect(m.resourceType).toBe('MedicationRequest');
    expect(m.status).toBe('active');
    expect(m.intent).toBe('order');
    expect(m.subject.reference).toBe('Patient/MRN001');
    expect(m.medicationCodeableConcept.coding[0].code).toBe('04AA0');
  });
});

describe('M155-C FHIR R4 资源校验', () => {
  it('合法 Patient 通过校验', () => {
    const p = buildFHIRResource('Patient', { familyName: '张', givenNames: ['三'] });
    const r = validateFHIRResource(p, FHIR_R4_SCHEMAS.Patient);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('缺 name 的 Patient 校验失败', () => {
    const p = buildFHIRResource('Patient', { gender: 'male' });
    const r = validateFHIRResource(p, FHIR_R4_SCHEMAS.Patient);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('缺 subject 的 Observation 校验失败', () => {
    const o = buildFHIRResource('Observation', { code: '2951-2', value: 120, unit: 'mmHg' });
    const r = validateFHIRResource(o, FHIR_R4_SCHEMAS.Observation);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('subject'))).toBe(true);
  });

  it('合法 MedicationRequest 通过校验', () => {
    const m = buildFHIRResource('MedicationRequest', {
      patientId: 'MRN001',
      medicationCode: '04AA0',
      medicationDisplay: '阿莫西林',
    });
    const r = validateFHIRResource(m, FHIR_R4_SCHEMAS.MedicationRequest);
    expect(r.valid).toBe(true);
  });

  it('resourceType 不匹配时报错', () => {
    const p = buildFHIRResource('Patient', { familyName: '张' });
    const r = validateFHIRResource(p, FHIR_R4_SCHEMAS.Observation);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('resourceType'))).toBe(true);
  });
});
