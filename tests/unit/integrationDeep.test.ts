/**
 * 健澜科技 jlmedaios — 【系统集成深化·二期】标准接口扩展纯函数单测（M174-B）
 *
 * 覆盖：HL7 v2.x 深度事件解析（ADT^A08 患者信息更新 / ORM^O02 医嘱修改 /
 *       ORU^R30 观察结果上传）、FHIR R4 五资源装配（Patient/Encounter/
 *       Observation/MedicationRequest/Condition）、跨标准消息合规校验
 *       （hl7v2x / fhir-r4 / dicom / lis）、深度集成能力清单。
 * 全部为纯函数单测，使用 mock 报文，不依赖数据库与网络。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { describe, expect, it } from 'bun:test';

import {
  buildDeepIntegration,
  buildFHIRR4,
  DEEP_DICOM_SOP_CLASSES,
  parseHL7v2x,
  validateIntegrationMessage,
  type DeepFHIRResource,
} from '../../src/bff/aggregators/integrationDeepAggregator';

/** 用 0x0D 作为段分隔符（HL7 v2.x 标准） */
const SEG = '\r';

/** ADT^A08 患者信息更新样例（含地址 PID-11 / 电话 PID-13） */
const ADT_A08 = [
  'MSH|^~\\&|HIS|健澜总院|EMR|健澜总院|20261016093000||ADT^A08|MSG001001|P|2.5.1',
  'PID|1||MRN20261001^健澜^^^MRN||张^三^^^Mr||19850312|F|||文一西路969号^^杭州市^^310012||057188888888',
  'PV1|1|I|INP^03^12^1|||000000^王医生^^^^DR|||||||||||||VISIT20261001',
].join(SEG);

/** ORM^O02 医嘱修改样例（ORC-1=XO 修订 / ORC-2=医嘱号） */
const ORM_O02 = [
  'MSH|^~\\&|HIS|健澜总院|PHARM|健澜总院|20261016110000||ORM^O02|MSG001002|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'ORC|XO|ORD2026001|||9|20261016110000',
  'OBR|1|||04AA0^阿莫西林^ATC',
].join(SEG);

/** ORU^R30 观察结果上传样例（检验仪器 -> LIS 上行） */
const ORU_R30 = [
  'MSH|^~\\&|LIS|健澜总院|EMR|健澜总院|20261016100000||ORU^R30|MSG001003|P|2.5.1',
  'PID|1||MRN20261001||张^三',
  'OBR|1|||2951-2^收缩压^LN',
  'OBX|1|NM|2951-2^收缩压^LN||120|mmHg|||F',
  'OBX|2|NM|6690-2^舒张压^LN||80|mmHg|||F',
].join(SEG);

describe('M174-B buildDeepIntegration 能力清单', () => {
  it('宣告四类标准通道与扩展事件/资源白名单', () => {
    const cap = buildDeepIntegration();
    expect(cap.standards.map((s) => s.code).sort()).toEqual(['dicom', 'fhir-r4', 'hl7v2x', 'lis']);
    expect(cap.hl7Events).toContain('ADT^A08');
    expect(cap.hl7Events).toContain('ORM^O02');
    expect(cap.hl7Events).toContain('ORU^R30');
    expect(cap.fhirResources).toContain('Encounter');
    expect(cap.fhirResources).toContain('Condition');
    expect(cap.dicomSopClasses.length).toBeGreaterThan(0);
    expect(cap.lisDirections).toContain('query_host');
    expect(cap.lisDirections).toContain('upload_result');
  });
});

describe('M174-B HL7 v2.x 深度事件解析', () => {
  it('ADT^A08：提取患者人口学更新字段（地址/电话）', () => {
    const m = parseHL7v2x(ADT_A08);
    expect(m.messageEvent).toBe('ADT^A08');
    expect(m.messageType).toBe('ADT');
    expect(m.triggerEvent).toBe('A08');
    expect(m.messageControlId).toBe('MSG001001');
    expect(m.sendingApplication).toBe('HIS');
    expect(m.patientId).toBe('MRN20261001');
    expect(m.patientName).toBe('张 三');
    expect(m.administrativeSex).toBe('F');
    expect(m.dateTimeOfBirth).toBe('1985-03-12');
    expect(m.patientAddress).toBe('文一西路969号');
    expect(m.homePhone).toBe('057188888888');
    expect(m.visitNumber).toBe('VISIT20261001');
    expect(m.errors).toEqual([]);
  });

  it('ORM^O02：抽取修改语义（订单控制 XO + 医嘱号）', () => {
    const m = parseHL7v2x(ORM_O02);
    expect(m.messageEvent).toBe('ORM^O02');
    expect(m.orders.length).toBe(1);
    expect(m.orders[0].orderControl).toBe('XO');
    expect(m.orders[0].orderNumber).toBe('ORD2026001');
    expect(m.orders[0].code).toBe('04AA0');
    expect(m.orders[0].display).toBe('阿莫西林');
    expect(m.orders[0].authoredOn).toBe('2026-10-16T11:00:00');
  });

  it('ORU^R30：检验仪器上行观察结果', () => {
    const m = parseHL7v2x(ORU_R30);
    expect(m.messageEvent).toBe('ORU^R30');
    expect(m.sendingApplication).toBe('LIS');
    expect(m.observations.length).toBe(2);
    expect(m.observations[0].code).toBe('2951-2');
    expect(m.observations[0].display).toBe('收缩压');
    expect(m.observations[0].value).toBe('120');
    expect(m.observations[0].unit).toBe('mmHg');
    expect(m.observations[1].code).toBe('6690-2');
  });

  it('空报文 / 非 MSH 开头：返回错误而非抛异常', () => {
    expect(parseHL7v2x('').errors.length).toBeGreaterThan(0);
    const bad = parseHL7v2x('PID|1||MRN||张^三');
    expect(bad.errors.some((e) => e.includes('MSH'))).toBe(true);
  });

  it('不在深度白名单的事件：记入 errors 但仍解析', () => {
    const weird = [
      'MSH|^~\\&|HIS|FAC|EMR|FAC|20261016093000||ADT^A01|MSG999|P|2.5.1',
      'PID|1||MRN||张^三',
    ].join(SEG);
    const m = parseHL7v2x(weird);
    expect(m.messageEvent).toBe('ADT^A01');
    expect(m.errors.some((e) => e.includes('不支持'))).toBe(true);
  });
});

describe('M174-B FHIR R4 五资源装配', () => {
  it('Patient：identifier/name/gender/birthDate', () => {
    const p = buildFHIRR4('Patient', {
      id: 'p1',
      identifier: 'MRN001',
      familyName: '张',
      givenNames: ['三'],
      gender: 'female',
      birthDate: '1985-03-12',
    }) as DeepFHIRResource & {
      identifier: Array<{ system: string; value: string }>;
      name: Array<{ family: string; given: string[] }>;
    };
    expect(p.resourceType).toBe('Patient');
    expect(p.identifier[0].value).toBe('MRN001');
    expect(p.name[0].family).toBe('张');
    expect(p.name[0].given).toEqual(['三']);
  });

  it('Encounter：status/class/subject/period/serviceProvider', () => {
    const e = buildFHIRR4('Encounter', {
      patientId: 'MRN001',
      encounterClass: 'IMP',
      periodStart: '2026-10-16T09:30:00',
      serviceProvider: '心内科',
    }) as DeepFHIRResource & {
      status: string;
      class: { coding: Array<{ code: string; display: string }> };
      subject: { reference: string };
      period: { start: string };
      serviceProvider: { display: string };
    };
    expect(e.resourceType).toBe('Encounter');
    expect(e.status).toBe('finished');
    expect(e.class.coding[0].code).toBe('IMP');
    expect(e.subject.reference).toBe('Patient/MRN001');
    expect(e.period.start).toBe('2026-10-16T09:30:00');
    expect(e.serviceProvider.display).toBe('心内科');
  });

  it('Observation：数值结果装为 valueQuantity（UCUM）', () => {
    const o = buildFHIRR4('Observation', {
      patientId: 'MRN001',
      code: '2951-2',
      codeDisplay: '收缩压',
      value: 120,
      unit: 'mmHg',
      effectiveDateTime: '2026-10-16T10:00:00',
    }) as DeepFHIRResource & {
      subject: { reference: string };
      valueQuantity: { value: number; unit: string };
    };
    expect(o.resourceType).toBe('Observation');
    expect(o.subject.reference).toBe('Patient/MRN001');
    expect(o.valueQuantity.value).toBe(120);
    expect(o.valueQuantity.unit).toBe('mmHg');
  });

  it('MedicationRequest：status/intent/medicationCodeableConcept', () => {
    const m = buildFHIRR4('MedicationRequest', {
      patientId: 'MRN001',
      medicationCode: '04AA0',
      medicationDisplay: '阿莫西林',
      authoredOn: '2026-10-16T11:00:00',
    }) as DeepFHIRResource & {
      status: string;
      intent: string;
      medicationCodeableConcept: { coding: Array<{ code: string }> };
    };
    expect(m.resourceType).toBe('MedicationRequest');
    expect(m.status).toBe('active');
    expect(m.intent).toBe('order');
    expect(m.medicationCodeableConcept.coding[0].code).toBe('04AA0');
  });

  it('Condition：ICD-10 诊断 + clinicalStatus', () => {
    const c = buildFHIRR4('Condition', {
      patientId: 'MRN001',
      conditionCode: 'I10',
      conditionDisplay: '原发性高血压',
      onsetDateTime: '2026-10-16T09:30:00',
    }) as DeepFHIRResource & {
      clinicalStatus: { coding: Array<{ code: string }> };
      code: { coding: Array<{ system: string; code: string; display: string }> };
      subject: { reference: string };
      onsetDateTime: string;
    };
    expect(c.resourceType).toBe('Condition');
    expect(c.clinicalStatus.coding[0].code).toBe('active');
    expect(c.code.coding[0].system).toBe('http://hl7.org/fhir/sid/icd-10');
    expect(c.code.coding[0].code).toBe('I10');
    expect(c.subject.reference).toBe('Patient/MRN001');
    expect(c.onsetDateTime).toBe('2026-10-16T09:30:00');
  });
});

describe('M174-B 跨标准消息合规校验', () => {
  it('hl7v2x：合法 ADT^A08 通过；非 MSH 开头失败', () => {
    expect(validateIntegrationMessage(ADT_A08, 'hl7v2x').valid).toBe(true);
    const bad = validateIntegrationMessage('PID|1||MRN||张^三', 'hl7v2x');
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('MSH'))).toBe(true);
  });

  it('hl7v2x：非白名单事件失败', () => {
    const weird = [
      'MSH|^~\\&|HIS|FAC|EMR|FAC|20261016093000||ADT^A01|MSG999|P|2.5.1',
      'PID|1||MRN||张^三',
    ].join(SEG);
    const r = validateIntegrationMessage(weird, 'hl7v2x');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('不支持'))).toBe(true);
  });

  it('fhir-r4：合法 Patient 通过；缺 subject 的 Observation 失败', () => {
    const p = buildFHIRR4('Patient', { familyName: '张', givenNames: ['三'] });
    expect(validateIntegrationMessage(p, 'fhir-r4').valid).toBe(true);

    const o = buildFHIRR4('Observation', { code: '2951-2', value: 120, unit: 'mmHg' });
    const r = validateIntegrationMessage(o, 'fhir-r4');
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes('subject'))).toBe(true);
  });

  it('fhir-r4：Condition 合法通过', () => {
    const c = buildFHIRR4('Condition', { patientId: 'MRN001', conditionCode: 'I10', conditionDisplay: '高血压' });
    expect(validateIntegrationMessage(c, 'fhir-r4').valid).toBe(true);
  });

  it('dicom：标准 SOP + modality 通过；缺 SOP UID 失败', () => {
    const ok = validateIntegrationMessage(
      { sopClassUid: DEEP_DICOM_SOP_CLASSES[0].uid, modality: 'CT', studyInstanceUid: '1.2.840.114342.1' },
      'dicom',
    );
    expect(ok.valid).toBe(true);

    const bad = validateIntegrationMessage({ sopClassUid: '9.9.9', modality: 'CT' }, 'dicom');
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('SOP'))).toBe(true);
  });

  it('lis：双向通道描述符通过；非双向 / 缺仪器代码失败', () => {
    const ok = validateIntegrationMessage(
      { host: 'LIS-HIS', instrumentCode: '01-CBC-5800', bidirectional: true, supportedQueries: ['order_query'] },
      'lis',
    );
    expect(ok.valid).toBe(true);

    const bad = validateIntegrationMessage(
      { host: 'LIS-HIS', bidirectional: false, supportedQueries: ['order_query'] },
      'lis',
    );
    expect(bad.valid).toBe(false);
    expect(bad.errors.some((e) => e.includes('双向'))).toBe(true);
  });
});
