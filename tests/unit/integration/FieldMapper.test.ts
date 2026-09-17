/**
 * 健澜科技数智医院智能体 - 字段映射器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import { FieldMapper, COMMON_CODE_MAPPINGS, COMMON_UNIT_CONVERSIONS } from '../../../src/integration/middleware/FieldMapper';

describe('FieldMapper', () => {
  describe('基础字段映射', () => {
    it('应映射字段名', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'patientId', targetField: 'id' },
            { sourceField: 'name', targetField: 'patientName' },
          ],
        },
      });
      const result = mapper.map('patient', { patientId: 'P001', name: '张三' });
      expect(result.data.id).toBe('P001');
      expect(result.data.patientName).toBe('张三');
    });

    it('应返回正确的映射统计', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'patientId', targetField: 'id' },
          ],
        },
      });
      const result = mapper.map('patient', { patientId: 'P001', extra: 'value' });
      expect(result.stats.totalFields).toBe(2);
      expect(result.stats.mappedFields).toBe(1);
      expect(result.unmappedFields).toContain('extra');
    });

    it('preserveUnmapped 为 true 时应保留未映射字段', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [{ sourceField: 'patientId', targetField: 'id' }],
        },
        preserveUnmapped: true,
      });
      const result = mapper.map('patient', { patientId: 'P001', extra: 'value' });
      expect(result.data.extra).toBe('value');
    });

    it('未配置映射规则的实体应返回警告', () => {
      const mapper = new FieldMapper();
      const result = mapper.map('unknown', { field: 'value' });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.stats.mappedFields).toBe(0);
    });
  });

  describe('值映射', () => {
    it('应根据valueMap转换值', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            {
              sourceField: 'sex',
              targetField: 'gender',
              valueMap: { '1': 'male', '2': 'female', '9': 'unknown' },
            },
          ],
        },
      });
      expect(mapper.map('patient', { sex: '1' }).data.gender).toBe('male');
      expect(mapper.map('patient', { sex: '2' }).data.gender).toBe('female');
      expect(mapper.map('patient', { sex: '9' }).data.gender).toBe('unknown');
    });

    it('反向映射应正确转换值', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            {
              sourceField: 'sex',
              targetField: 'gender',
              valueMap: { '1': 'male', '2': 'female' },
            },
          ],
        },
      });
      const result = mapper.map('patient', { gender: 'male' }, 'target_to_source');
      expect(result.data.sex).toBe('1');
    });
  });

  describe('数据类型转换', () => {
    it('应转换为数字类型', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          lab: [
            { sourceField: 'value', targetField: 'resultValue', dataType: 'number' },
          ],
        },
      });
      const result = mapper.map('lab', { value: '6.5' });
      expect(result.data.resultValue).toBe(6.5);
      expect(typeof result.data.resultValue).toBe('number');
    });

    it('应转换为布尔类型', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          order: [
            { sourceField: 'active', targetField: 'isActive', dataType: 'boolean' },
          ],
        },
      });
      expect(mapper.map('order', { active: 'true' }).data.isActive).toBe(true);
      expect(mapper.map('order', { active: 'false' }).data.isActive).toBe(false);
      expect(mapper.map('order', { active: '1' }).data.isActive).toBe(true);
    });

    it('应转换为字符串类型', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'age', targetField: 'ageStr', dataType: 'string' },
          ],
        },
      });
      const result = mapper.map('patient', { age: 50 });
      expect(result.data.ageStr).toBe('50');
      expect(typeof result.data.ageStr).toBe('string');
    });

    it('应转换为数组类型', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'allergies', targetField: 'allergyList', dataType: 'array' },
          ],
        },
      });
      const result = mapper.map('patient', { allergies: '青霉素,头孢' });
      expect(Array.isArray(result.data.allergyList)).toBe(true);
      expect(result.data.allergyList).toEqual(['青霉素', '头孢']);
    });

    it('无效数字转换应抛出警告', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          lab: [
            { sourceField: 'value', targetField: 'resultValue', dataType: 'number' },
          ],
        },
      });
      const result = mapper.map('lab', { value: '不是数字' });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('默认值', () => {
    it('缺失字段时应使用默认值', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'phone', targetField: 'contact', defaultValue: '未知' },
          ],
        },
      });
      const result = mapper.map('patient', {});
      expect(result.data.contact).toBe('未知');
    });
  });

  describe('必填字段', () => {
    it('缺失必填字段应产生警告', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            { sourceField: 'patientId', targetField: 'id', required: true },
          ],
        },
      });
      const result = mapper.map('patient', {});
      expect(result.warnings.some((w) => w.includes('必填'))).toBe(true);
    });
  });

  describe('编码转换', () => {
    it('应使用COMMON_CODE_MAPPINGS转换性别编码', () => {
      const mapper = new FieldMapper({ codeMappings: COMMON_CODE_MAPPINGS });
      expect(mapper.convertCode('gender', '1')).toBe('male');
      expect(mapper.convertCode('gender', '2')).toBe('female');
      expect(mapper.convertCode('gender', 'M')).toBe('male');
    });

    it('应转换医嘱类型编码', () => {
      const mapper = new FieldMapper({ codeMappings: COMMON_CODE_MAPPINGS });
      expect(mapper.convertCode('order_type', '1')).toBe('drug');
      expect(mapper.convertCode('order_type', '3')).toBe('lab');
    });

    it('未知编码应返回原值或默认值', () => {
      const mapper = new FieldMapper({ codeMappings: COMMON_CODE_MAPPINGS });
      expect(mapper.convertCode('gender', 'X')).toBe('unknown'); // defaultCode
      expect(mapper.convertCode('unknown_type', 'XYZ')).toBe('XYZ'); // 无规则
    });

    it('反向编码转换应正确', () => {
      const mapper = new FieldMapper({ codeMappings: COMMON_CODE_MAPPINGS });
      expect(mapper.convertCode('gender', 'male', 'target_to_source')).toBe('M');
    });
  });

  describe('单位转换', () => {
    it('应使用COMMON_UNIT_CONVERSIONS转换单位', () => {
      const mapper = new FieldMapper({ unitConversions: COMMON_UNIT_CONVERSIONS });
      expect(mapper.convertUnit(1000, 'mg', 'g')).toBe(1);
      expect(mapper.convertUnit(1, 'g', 'mg')).toBe(1000);
    });

    it('应转换温度单位', () => {
      const mapper = new FieldMapper({ unitConversions: COMMON_UNIT_CONVERSIONS });
      expect(mapper.convertUnit(37, '℃', '℉')).toBe(98.6);
      expect(mapper.convertUnit(98.6, '℉', '℃')).toBeCloseTo(37, 1);
    });

    it('相同单位应返回原值', () => {
      const mapper = new FieldMapper({ unitConversions: COMMON_UNIT_CONVERSIONS });
      expect(mapper.convertUnit(5, 'mg', 'mg')).toBe(5);
    });

    it('无转换规则应返回原值', () => {
      const mapper = new FieldMapper();
      expect(mapper.convertUnit(5, 'unknown1', 'unknown2')).toBe(5);
    });
  });

  describe('配置管理', () => {
    it('应动态添加字段映射规则', () => {
      const mapper = new FieldMapper();
      mapper.addFieldMapping('test', { sourceField: 'a', targetField: 'b' });
      const result = mapper.map('test', { a: 'value' });
      expect(result.data.b).toBe('value');
    });

    it('应动态添加编码映射规则', () => {
      const mapper = new FieldMapper();
      mapper.addCodeMapping('custom', {
        sourceSystem: 'src',
        targetSystem: 'dst',
        mappings: { X: 'Y' },
      });
      expect(mapper.convertCode('custom', 'X')).toBe('Y');
    });
  });

  describe('日期格式转换', () => {
    it('应转换HL7日期格式为ISO格式', () => {
      const mapper = new FieldMapper({
        fieldMappings: {
          patient: [
            {
              sourceField: 'birthDate',
              targetField: 'birthDate',
              dataType: 'date',
              sourceDateFormat: 'YYYYMMDD',
              targetDateFormat: 'YYYY-MM-DD',
            },
          ],
        },
      });
      const result = mapper.map('patient', { birthDate: '19700101' });
      expect(result.data.birthDate).toBe('1970-01-01');
    });
  });
});
