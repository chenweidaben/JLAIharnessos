/**
 * 健澜科技数智医院智能体 - FHIR R4 单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import {
  FHIRResourceModel,
  FHIRParser,
  FHIRBuilder,
  FHIRBundleBuilder,
  SUPPORTED_RESOURCE_TYPES,
} from '../../../src/integration/protocols/fhir';

describe('FHIRResourceModel', () => {
  it('应支持22种核心资源类型', () => {
    expect(SUPPORTED_RESOURCE_TYPES.length).toBeGreaterThanOrEqual(22);
    expect(SUPPORTED_RESOURCE_TYPES).toContain('Patient');
    expect(SUPPORTED_RESOURCE_TYPES).toContain('Observation');
    expect(SUPPORTED_RESOURCE_TYPES).toContain('DiagnosticReport');
    expect(SUPPORTED_RESOURCE_TYPES).toContain('ImagingStudy');
  });

  it('应能序列化/反序列化资源', () => {
    const patient = new FHIRResourceModel({ resourceType: 'Patient', id: 'P001', gender: 'male' });
    const json = patient.serialize();
    const restored = FHIRResourceModel.deserialize(json);
    expect(restored.resourceType).toBe('Patient');
    expect(restored.get<string>('id')).toBe('P001');
  });

  it('应校验 Patient 必填 name', () => {
    const p = new FHIRResourceModel({ resourceType: 'Patient', id: 'P1' });
    const result = p.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'Patient.name')).toBe(true);
  });

  it('应校验 Observation 必填 status 和 code', () => {
    const obs = new FHIRResourceModel({ resourceType: 'Observation', id: 'O1' });
    const result = obs.validate();
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('应支持扩展的添加与读取', () => {
    const p = new FHIRResourceModel({ resourceType: 'Patient', id: 'P1' });
    p.addExtension('http://jianlan/isVip', { valueBoolean: true });
    expect(p.getExtension('http://jianlan/isVip')?.valueBoolean).toBe(true);
  });

  it('应能为全部22种资源类型构建模型', () => {
    for (const rt of SUPPORTED_RESOURCE_TYPES) {
      const model = new FHIRResourceModel({ resourceType: rt, id: `${rt}-1` });
      expect(model.resourceType).toBe(rt);
      expect(model.id).toBe(`${rt}-1`);
    }
  });
});

describe('FHIRParser', () => {
  it('应解析单资源 JSON', () => {
    const parser = new FHIRParser();
    const result = parser.parse(JSON.stringify({
      resourceType: 'Patient',
      id: 'P001',
      name: [{ family: '张', given: ['伟'] }],
      gender: 'male',
    }));
    expect(result.success).toBe(true);
    expect(result.resource?.resourceType).toBe('Patient');
  });

  it('应识别资源类型', () => {
    const parser = new FHIRParser();
    const result = parser.parse({ resourceType: 'Observation', code: { text: 'WBC' }, status: 'final' });
    expect(result.isBundle).toBe(false);
  });

  it('应解析 Bundle', () => {
    const parser = new FHIRParser();
    const result = parser.parse({
      resourceType: 'Bundle',
      type: 'searchset',
      entry: [{ resource: { resourceType: 'Patient', id: 'P1' } }],
    });
    expect(result.isBundle).toBe(true);
    expect(result.bundle?.entry).toHaveLength(1);
  });

  it('应解析引用字符串', () => {
    const parser = new FHIRParser();
    const ref = parser.parseReference('Patient/P001');
    expect(ref?.resourceType).toBe('Patient');
    expect(ref?.id).toBe('P001');
  });

  it('应提取扩展', () => {
    const parser = new FHIRParser();
    const exts = parser.extractExtensions({
      resourceType: 'Patient',
      extension: [{ url: 'http://x/a', valueString: 'v' }],
    });
    expect(exts).toHaveLength(1);
  });
});

describe('FHIRBuilder', () => {
  it('应流式构建 Patient', () => {
    const patient = new FHIRBuilder('Patient')
      .setId('P001')
      .set('gender', 'male')
      .addHumanName({ family: '张', given: ['伟'] })
      .build();
    expect(patient.get<string>('gender')).toBe('male');
    expect(patient.get<string>('name.0.family')).toBe('张');
  });

  it('应构建并校验 Observation', () => {
    const { resource, validation } = new FHIRBuilder('Observation')
      .setId('O1')
      .set('status', 'final')
      .setCodeableConcept('code', { text: 'WBC' })
      .buildAndValidate();
    expect(validation.valid).toBe(true);
    expect(resource.get<string>('status')).toBe('final');
  });
});

describe('FHIRBundleBuilder', () => {
  it('应构建 Bundle', () => {
    const bundle = new FHIRBundleBuilder('searchset')
      .addResource(new FHIRResourceModel({ resourceType: 'Patient', id: 'P1' }))
      .addResource(new FHIRResourceModel({ resourceType: 'Encounter', id: 'E1' }))
      .build();
    expect(bundle.resourceType).toBe('Bundle');
    expect(bundle.type).toBe('searchset');
    expect(bundle.entry).toHaveLength(2);
  });
});
