/**
 * 健澜科技数智医院智能体 - HL7构建器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import { HL7Builder } from '../../../src/integration/protocols/hl7/HL7Builder';
import { HL7Parser } from '../../../src/integration/protocols/hl7/HL7Parser';
import {
  createADTA01Builder,
  createORMO01Builder,
  createORUR01Builder,
} from '../../../src/integration/protocols/hl7/HL7MessageTypes';

describe('HL7Builder', () => {
  describe('基础构建', () => {
    it('应构建包含MSH段的消息', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01');
      const message = builder.build();
      expect(message.getSegmentCount()).toBe(1);
      expect(message.getMessageType()).toBe('ADT');
      expect(message.getTriggerEvent()).toBe('A01');
    });

    it('应自动生成消息控制ID', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01');
      const message = builder.build();
      expect(message.getMessageControlId()).toBeTruthy();
      expect(message.getMessageControlId().length).toBeGreaterThan(0);
    });

    it('应自动设置消息时间', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01');
      const message = builder.build();
      const msh = message.getMSH();
      expect(msh.getFieldValue(7)).toBeTruthy();
      expect(msh.getFieldValue(7).length).toBe(14); // YYYYMMDDHHmmss
    });

    it('应设置默认处理ID和版本', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01');
      const message = builder.build();
      const msh = message.getMSH();
      expect(msh.getFieldValue(11)).toBe('P');
      expect(msh.getFieldValue(12)).toBe('2.5');
    });
  });

  describe('MSH段设置', () => {
    it('应设置发送/接收应用和机构', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ORM', 'O01')
        .setSendingApplication('JIANLAN')
        .setSendingFacility('JIANLAN_HOSPITAL')
        .setReceivingApplication('HIS')
        .setReceivingFacility('HIS_VENDOR');
      const message = builder.build();
      const msh = message.getMSH();
      expect(msh.getFieldValue(3)).toBe('JIANLAN');
      expect(msh.getFieldValue(4)).toBe('JIANLAN_HOSPITAL');
      expect(msh.getFieldValue(5)).toBe('HIS');
      expect(msh.getFieldValue(6)).toBe('HIS_VENDOR');
    });

    it('应设置自定义消息控制ID', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01').setMessageControlId('CUSTOM001');
      const message = builder.build();
      expect(message.getMessageControlId()).toBe('CUSTOM001');
    });
  });

  describe('段和字段操作', () => {
    it('应添加段并设置字段值', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ADT', 'A01')
        .addSegment('PID')
        .setField(3, 'P001')
        .setField(5, '张三');
      const message = builder.build();
      const pid = message.getFirstSegment('PID');
      expect(pid).toBeDefined();
      expect(pid!.getFieldValue(3)).toBe('P001');
      expect(pid!.getFieldValue(5)).toBe('张三');
    });

    it('应设置字段组件值', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ADT', 'A01')
        .addSegment('PID')
        .setFieldComponent(5, 0, '张三')
        .setFieldComponent(5, 1, '男');
      const message = builder.build();
      const pid = message.getFirstSegment('PID');
      expect(pid!.getFieldValue(5, 0, 0)).toBe('张三');
      expect(pid!.getFieldValue(5, 0, 1)).toBe('男');
    });

    it('应支持链式调用添加多个段', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ORU', 'R01')
        .addSegment('PID').setField(3, 'P001')
        .addSegment('OBR').setField(4, 'CBC^血常规')
        .addSegment('OBX').setField(5, '6.5');
      const message = builder.build();
      expect(message.getSegmentCount()).toBe(4); // MSH + PID + OBR + OBX
    });
  });

  describe('构建字符串', () => {
    it('应构建有效的HL7字符串', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ADT', 'A01')
        .setSendingApplication('APP')
        .setSendingFacility('FAC')
        .addSegment('PID')
        .setField(3, 'P001')
        .setField(5, '张三');
      const str = builder.buildString();
      expect(str).toContain('MSH|^~\\&|APP|FAC|');
      expect(str).toContain('ADT^A01');
      expect(str).toContain('PID|');
      expect(str).toContain('P001');
      expect(str).toContain('张三');
      // 段间用\r分隔
      expect(str.split('\r').length).toBe(2);
    });

    it('构建的字符串应能被解析器重新解析', () => {
      const builder = new HL7Builder();
      builder
        .setMessageType('ORM', 'O01')
        .setSendingApplication('JIANLAN')
        .setReceivingApplication('LIS')
        .addSegment('PID').setField(3, 'P001').setField(5, '张三')
        .addSegment('ORC').setField(1, 'NW').setField(2, 'ORD001')
        .addSegment('OBR').setField(4, 'BIO^生化全套');

      const str = builder.buildString();
      const parser = new HL7Parser();
      const result = parser.parse(str);

      expect(result.success).toBe(true);
      expect(result.message.getMessageType()).toBe('ORM');
      expect(result.message.getTriggerEvent()).toBe('O01');
      expect(result.message.getFirstSegment('PID')!.getFieldValue(3)).toBe('P001');
      expect(result.message.getFirstSegment('ORC')!.getFieldValue(1)).toBe('NW');
      expect(result.message.getFirstSegment('OBR')!.getFieldValue(4, 0, 1)).toBe('生化全套');
    });
  });

  describe('MLLP帧构建', () => {
    it('应构建有效的MLLP帧', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01').addSegment('PID').setField(3, 'P001');
      const mllp = builder.buildMLLP();

      // MLLP: <VT=0x0B>消息<FS=0x1C><CR=0x0D>
      expect(mllp[0]).toBe(0x0B);
      expect(mllp[mllp.length - 2]).toBe(0x1C);
      expect(mllp[mllp.length - 1]).toBe(0x0D);
    });
  });

  describe('辅助构建方法', () => {
    it('createADTA01Builder 应构建入院通知消息', () => {
      const builder = createADTA01Builder({
        patientId: 'P001',
        patientName: '张三',
        gender: 'M',
        birthDate: '19700101',
        department: '心内科',
        admittingDoctor: '王医生',
        diagnosis: '高血压病',
        diagnosisCode: 'I10',
      });
      const message = builder.build();
      expect(message.getMessageType()).toBe('ADT');
      expect(message.getTriggerEvent()).toBe('A01');
      expect(message.getFirstSegment('PID')!.getFieldValue(3)).toBe('P001');
      expect(message.getFirstSegment('DG1')!.getFieldValue(4)).toBe('高血压病');
    });

    it('createORMO01Builder 应构建订单请求消息', () => {
      const builder = createORMO01Builder({
        patientId: 'P001',
        patientName: '张三',
        placerOrderNo: 'ORD001',
        examCode: 'CBC',
        examName: '血常规',
        priority: 'R',
        clinicalDiagnosis: '发热待查',
      });
      const message = builder.build();
      expect(message.getMessageType()).toBe('ORM');
      expect(message.getFirstSegment('ORC')!.getFieldValue(1)).toBe('NW');
      expect(message.getFirstSegment('OBR')!.getFieldValue(4, 0, 0)).toBe('CBC');
    });

    it('createORUR01Builder 应构建观察结果消息', () => {
      const builder = createORUR01Builder({
        patientId: 'P001',
        patientName: '张三',
        placerOrderNo: 'ORD001',
        examCode: 'CBC',
        examName: '血常规',
        results: [
          { code: 'WBC', name: '白细胞计数', value: '6.5', unit: '10^9/L', referenceRange: '3.5-9.5', abnormalFlag: 'N' },
          { code: 'HGB', name: '血红蛋白', value: '148', unit: 'g/L', referenceRange: '130-175', abnormalFlag: 'N' },
        ],
      });
      const message = builder.build();
      expect(message.getMessageType()).toBe('ORU');
      const obxList = message.getSegmentsByType('OBX');
      expect(obxList).toHaveLength(2);
      expect(obxList[0].getFieldValue(5)).toBe('6.5');
      expect(obxList[1].getFieldValue(3, 0, 1)).toBe('血红蛋白');
    });
  });

  describe('校验和', () => {
    it('应计算非空校验和', () => {
      const builder = new HL7Builder();
      builder.setMessageType('ADT', 'A01');
      const checksum = builder.calculateChecksum();
      expect(checksum).toBeTruthy();
      expect(checksum.length).toBe(4);
    });
  });
});
