/**
 * 健澜科技数智医院智能体 - HL7 消息类型与解析增强单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import {
  MESSAGE_TYPE_DEFS,
  createADTA01Builder,
  createADTA03Builder,
  createORMO01Builder,
  createORUR01Builder,
  HL7Parser,
} from '../../../src/integration/protocols/hl7';

describe('MESSAGE_TYPE_DEFS', () => {
  it('应包含15种以上消息类型', () => {
    const keys = Object.keys(MESSAGE_TYPE_DEFS);
    expect(keys.length).toBeGreaterThanOrEqual(15);
    expect(keys).toContain('ADT^A01');
    expect(keys).toContain('ADT^A02');
    expect(keys).toContain('ADT^A03');
    expect(keys).toContain('ADT^A04');
    expect(keys).toContain('ADT^A08');
    expect(keys).toContain('ADT^A11');
    expect(keys).toContain('ADT^A40');
    expect(keys).toContain('ORM^O01');
    expect(keys).toContain('ORU^R01');
    expect(keys).toContain('MDM^T02');
    expect(keys).toContain('BAR^P01');
    expect(keys).toContain('DFT^P03');
    expect(keys).toContain('SIU^S12');
    expect(keys).toContain('RDE^O01');
    expect(keys).toContain('RDS^O01');
    expect(keys).toContain('RAS^O01');
  });
});

describe('HL7 Builder/Parser 往返', () => {
  it('应构建并解析 ADT^A01', () => {
    const msg = createADTA01Builder({ patientId: 'P001', patientName: '张三' }).buildString();
    const parser = new HL7Parser();
    const result = parser.parse(msg);
    expect(result.success).toBe(true);
    expect(result.message.getMessageType()).toBe('ADT');
    expect(result.message.getTriggerEvent()).toBe('A01');
  });

  it('应构建并解析 ADT^A03', () => {
    const msg = createADTA03Builder({ patientId: 'P001', patientName: '李四', department: '心内科' }).buildString();
    const parser = new HL7Parser();
    const result = parser.parse(msg);
    expect(result.success).toBe(true);
    expect(result.message.getTriggerEvent()).toBe('A03');
  });

  it('应构建并解析 ORM^O01', () => {
    const msg = createORMO01Builder({
      patientId: 'P001',
      patientName: '王五',
      placerOrderNo: 'ORD1',
      examCode: 'CBC',
      examName: '血常规',
    }).buildString();
    const parser = new HL7Parser();
    const result = parser.parse(msg);
    expect(result.success).toBe(true);
    expect(result.message.getMessageType()).toBe('ORM');
  });

  it('应构建并解析 ORU^R01（含多个OBX）', () => {
    const msg = createORUR01Builder({
      patientId: 'P001',
      patientName: '赵六',
      placerOrderNo: 'L1',
      examCode: 'CBC',
      examName: '血常规',
      results: [
        { code: 'WBC', name: '白细胞', value: '6.5', unit: '10^9/L', referenceRange: '3.5-9.5', abnormalFlag: 'N' },
        { code: 'HGB', name: '血红蛋白', value: '148', unit: 'g/L', referenceRange: '130-175', abnormalFlag: 'N' },
      ],
    }).buildString();
    const parser = new HL7Parser();
    const result = parser.parse(msg);
    expect(result.success).toBe(true);
    expect(result.message.getMessageType()).toBe('ORU');
    expect(result.message.getSegments().some((s) => s.segmentType === 'OBX')).toBe(true);
  });
});

describe('HL7Parser 增强', () => {
  it('应支持转义字符 \\F\\ \\S\\ \\T\\ \\R\\ \\E\\', () => {
    const parser = new HL7Parser();
    const msh = 'MSH|^~\\&|S|F|||20240101||ADT^A01|M1|P|2.5';
    const pid = 'PID|||P1||Smith^John';
    const result = parser.parse(`${msh}\r${pid}`);
    expect(result.success).toBe(true);
  });

  it('应识别 Z 段', () => {
    const parser = new HL7Parser();
    const msh = 'MSH|^~\\&|S|F|||20240101||ADT^A01|M1|P|2.5';
    const zseg = 'ZPD|vendor.custom|value';
    const result = parser.parse(`${msh}\r${zseg}`);
    expect(result.success).toBe(true);
    expect(parser.isZSegment('ZPD')).toBe(true);
    expect(parser.isZSegment('PID')).toBe(false);
    expect(parser.getZSegments(result.message)).toHaveLength(1);
  });

  it('严格模式下缺少 PID 应报错', () => {
    const parser = new HL7Parser();
    parser.strictMode = true;
    const msh = 'MSH|^~\\&|S|F|||20240101||ORM^O01|M1|P|2.5';
    const result = parser.parse(msh);
    expect(result.success).toBe(false);
    expect(result.errors.some((e) => e.includes('PID'))).toBe(true);
  });
});
