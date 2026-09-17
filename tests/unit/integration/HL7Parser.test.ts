/**
 * 健澜科技数智医院智能体 - HL7解析器单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import { HL7Parser, HL7EscapeHandler } from '../../../src/integration/protocols/hl7/HL7Parser';
import { HL7Message } from '../../../src/integration/protocols/hl7/HL7Message';

// ============================================================
// 真实HL7消息示例
// ============================================================

/** ADT^A01 入院通知示例 */
const ADT_A01_MESSAGE = [
  'MSH|^~\\&|EPIC|HOSPITAL01|HIS|HIS_VENDOR|20240615093000||ADT^A01|MSG001|P|2.5|||',
  'EVN|A01|20240615093000|||01234^张三^医生^^^',
  'PID|1||P20240001^^^MRN||张三^男||19700101|M|||浙江省杭州市余杭区^^杭州^浙江^311100||13800138000|||S|||330110197001011234',
  'PV1|1|I|1203^5^心内科病房^^^心内科|1|0|||1234^王医生^主治^^^|||||||||||INPATIENT|||||||||||||||||||||20240615090000|',
  'DG1|1||I10^高血压病^ICD10||20240615|A',
].join('\r');

/** ORU^R01 检验结果示例 */
const ORU_R01_MESSAGE = [
  'MSH|^~\\&|LIS|HOSPITAL01|JIANLAN|JIANLAN_AGENT|20240615103000||ORU^R01|MSG002|P|2.5|||',
  'PID|1||P20240001^^^MRN||张三^男||19700101|M',
  'OBR|1|ORD001|ORD001|CBC^血常规^LIS||20240615100000|20240615101500|||||||20240615102000|血清|张检验师||||20240615103000|检验科|F|||1234^王医生^主治^^^',
  'OBX|1|NM|WBC^白细胞计数^LIS||6.5|10\\S\\9/L|3.5-9.5|N|||F|||20240615102500|Sysmex XN-9000',
  'OBX|2|NM|RBC^红细胞计数^LIS||4.8|10\\S\\12/L|4.3-5.8|N|||F|||20240615102500|Sysmex XN-9000',
  'OBX|3|NM|HGB^血红蛋白^LIS||148|g/L|130-175|N|||F|||20240615102500|Sysmex XN-9000',
  'OBX|4|NM|PLT^血小板计数^LIS||220|10\\S\\9/L|125-350|N|||F|||20240615102500|Sysmex XN-9000',
].join('\r');

/** ORM^O01 订单请求示例 */
const ORM_O01_MESSAGE = [
  'MSH|^~\\&|JIANLAN|JIANLAN_AGENT|LIS|HOSPITAL01|20240615110000||ORM^O01|MSG003|P|2.5|||',
  'PID|1||P20240001^^^MRN||张三^男||19700101|M',
  'ORC|NW|ORD002|ORD002||||||20240615110000|1234^王医生^主治^^^',
  'OBR|1|ORD002|ORD002|BIO^生化全套^LIS||20240615110000|||||||||||||||R|||1234^王医生^主治^^^',
].join('\r');

// ============================================================
// 测试
// ============================================================

describe('HL7Parser', () => {
  const parser = new HL7Parser();

  describe('ADT^A01 入院通知解析', () => {
    it('应成功解析ADT^A01消息', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('应正确解析MSH段', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      const msh = result.message.getMSH();
      expect(msh.segmentType).toBe('MSH');
      expect(result.message.getMessageType()).toBe('ADT');
      expect(result.message.getTriggerEvent()).toBe('A01');
      expect(result.message.getMessageControlId()).toBe('MSG001');
    });

    it('应正确解析MSH发送/接收信息', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      const msh = result.message.getMSH();
      expect(msh.getFieldValue(3)).toBe('EPIC');
      expect(msh.getFieldValue(4)).toBe('HOSPITAL01');
      expect(msh.getFieldValue(5)).toBe('HIS');
      expect(msh.getFieldValue(6)).toBe('HIS_VENDOR');
    });

    it('应正确解析PID段患者信息', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      const pid = result.message.getFirstSegment('PID');
      expect(pid).toBeDefined();
      expect(pid!.getFieldValue(3, 0, 0)).toBe('P20240001');
      expect(pid!.getFieldValue(5, 0, 0)).toBe('张三');
      expect(pid!.getFieldValue(7)).toBe('19700101');
      expect(pid!.getFieldValue(8)).toBe('M');
    });

    it('应正确解析PV1段就诊信息', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      const pv1 = result.message.getFirstSegment('PV1');
      expect(pv1).toBeDefined();
      expect(pv1!.getFieldValue(2)).toBe('I'); // 住院
      expect(pv1!.getFieldValue(3, 0, 2)).toBe('心内科病房');
    });

    it('应正确解析DG1段诊断信息', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      const dg1 = result.message.getFirstSegment('DG1');
      expect(dg1).toBeDefined();
      expect(dg1!.getFieldValue(3, 0, 0)).toBe('I10');
      expect(dg1!.getFieldValue(3, 0, 1)).toBe('高血压病');
    });

    it('应返回正确的段数量', () => {
      const result = parser.parse(ADT_A01_MESSAGE);
      expect(result.message.getSegmentCount()).toBe(5); // MSH, EVN, PID, PV1, DG1
    });
  });

  describe('ORU^R01 检验结果解析', () => {
    it('应成功解析ORU^R01消息', () => {
      const result = parser.parse(ORU_R01_MESSAGE);
      expect(result.success).toBe(true);
    });

    it('应正确解析OBR段检验申请信息', () => {
      const result = parser.parse(ORU_R01_MESSAGE);
      const obr = result.message.getFirstSegment('OBR');
      expect(obr).toBeDefined();
      expect(obr!.getFieldValue(4, 0, 0)).toBe('CBC');
      expect(obr!.getFieldValue(4, 0, 1)).toBe('血常规');
    });

    it('应正确解析多个OBX段检验结果', () => {
      const result = parser.parse(ORU_R01_MESSAGE);
      const obxList = result.message.getSegmentsByType('OBX');
      expect(obxList).toHaveLength(4);

      // 白细胞
      expect(obxList[0].getFieldValue(3, 0, 1)).toBe('白细胞计数');
      expect(obxList[0].getFieldValue(5)).toBe('6.5');
      expect(obxList[0].getFieldValue(6)).toBe('10^9/L');
      expect(obxList[0].getFieldValue(7)).toBe('3.5-9.5');
      expect(obxList[0].getFieldValue(8)).toBe('N');

      // 血红蛋白
      expect(obxList[2].getFieldValue(3, 0, 1)).toBe('血红蛋白');
      expect(obxList[2].getFieldValue(5)).toBe('148');
    });
  });

  describe('ORM^O01 订单请求解析', () => {
    it('应成功解析ORM^O01消息', () => {
      const result = parser.parse(ORM_O01_MESSAGE);
      expect(result.success).toBe(true);
      expect(result.message.getMessageType()).toBe('ORM');
      expect(result.message.getTriggerEvent()).toBe('O01');
    });

    it('应正确解析ORC段订单控制', () => {
      const result = parser.parse(ORM_O01_MESSAGE);
      const orc = result.message.getFirstSegment('ORC');
      expect(orc).toBeDefined();
      expect(orc!.getFieldValue(1)).toBe('NW'); // 新订单
      expect(orc!.getFieldValue(2)).toBe('ORD002');
    });
  });

  describe('编码字符解析', () => {
    it('应正确解析自定义编码字符', () => {
      const message = 'MSH|^~\\&|APP|FAC||||20240101||ADT^A01|ID001|P|2.5\rPID|1||P001||张三';
      const result = parser.parse(message);
      expect(result.success).toBe(true);
      expect(result.message.encoding.componentSeparator).toBe('^');
      expect(result.message.encoding.repetitionSeparator).toBe('~');
      expect(result.message.encoding.escapeCharacter).toBe('\\');
      expect(result.message.encoding.subcomponentSeparator).toBe('&');
    });
  });

  describe('错误处理', () => {
    it('空消息应返回失败', () => {
      const result = parser.parse('');
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('非MSH开头的消息应返回失败', () => {
      const result = parser.parse('PID|1||P001||张三');
      expect(result.success).toBe(false);
    });

    it('\\n换行符应被规范化为\\r', () => {
      const message = 'MSH|^~\\&|APP|FAC||||20240101||ADT^A01|ID001|P|2.5\nPID|1||P001||张三';
      const result = parser.parse(message);
      expect(result.success).toBe(true);
      expect(result.message.getSegmentCount()).toBe(2);
    });
  });

  describe('转义字符处理', () => {
    const handler = new HL7EscapeHandler();

    it('应解码字段分隔符转义', () => {
      expect(handler.decode('a\\F\\b')).toBe('a|b');
    });

    it('应解码组件分隔符转义', () => {
      expect(handler.decode('a\\S\\b')).toBe('a^b');
    });

    it('应解码子组件分隔符转义', () => {
      expect(handler.decode('a\\T\\b')).toBe('a&b');
    });

    it('应解码重复分隔符转义', () => {
      expect(handler.decode('a\\R\\b')).toBe('a~b');
    });

    it('应解码转义字符本身', () => {
      expect(handler.decode('a\\E\\b')).toBe('a\\b');
    });

    it('无转义字符时应返回原字符串', () => {
      expect(handler.decode('正常文本')).toBe('正常文本');
    });

    it('应编码特殊字符', () => {
      expect(handler.encode('a|b')).toBe('a\\F\\b');
      expect(handler.encode('a^b')).toBe('a\\S\\b');
    });
  });

  describe('组件和子组件解析', () => {
    it('应正确解析带组件的字段', () => {
      const message = 'MSH|^~\\&|APP|FAC||||20240101||ADT^A01|ID001|P|2.5\rPID|1||P001||张三^男^19700101';
      const result = parser.parse(message);
      const pid = result.message.getFirstSegment('PID');
      expect(pid!.getFieldValue(5, 0, 0)).toBe('张三');
      expect(pid!.getFieldValue(5, 0, 1)).toBe('男');
      expect(pid!.getFieldValue(5, 0, 2)).toBe('19700101');
    });

    it('应正确解析带子组件的组件', () => {
      const message = 'MSH|^~\\&|APP|FAC||||20240101||ADT^A01|ID001|P|2.5\rPID|1||P001^^^MRN^AssignAuth';
      const result = parser.parse(message);
      const pid = result.message.getFirstSegment('PID');
      // PID-3: P001^^^MRN^AssignAuth
      expect(pid!.getFieldValue(3, 0, 0)).toBe('P001');
      expect(pid!.getFieldValue(3, 0, 3)).toBe('MRN');
      expect(pid!.getFieldValue(3, 0, 4)).toBe('AssignAuth');
    });
  });
});
