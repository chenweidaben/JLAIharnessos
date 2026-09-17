/**
 * 健澜科技数智医院智能体 - integration/protocols/hl7/HL7MessageTypes.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HL7消息类型定义
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义常用HL7 v2.x消息类型的段结构和辅助构建方法：
 * - ADT^A01：入院通知
 * - ADT^A04：挂号通知
 * - ORM^O01：订单请求
 * - ORU^R01：观察结果
 *
 * @module integration/protocols/hl7/HL7MessageTypes
 */

import { HL7Builder } from './HL7Builder';
import { HL7Segment } from './HL7Message';

// ============================================================
// 段结构定义
// ============================================================

/** 段定义：字段描述 */
export interface SegmentFieldDef {
  /** 字段索引（1-based） */
  index: number;
  /** 字段名称 */
  name: string;
  /** 是否必填 */
  required: boolean;
  /** 数据类型（如 ST、CX、XPN、TS） */
  dataType?: string;
  /** 描述 */
  description?: string;
}

/** 段定义 */
export interface SegmentDef {
  /** 段类型 */
  segmentType: string;
  /** 段名称 */
  name: string;
  /** 是否必填 */
  required: boolean;
  /** 是否可重复 */
  repeatable: boolean;
  /** 字段定义 */
  fields: SegmentFieldDef[];
}

/** 消息类型定义 */
export interface MessageTypeDef {
  /** 消息类型（如 ADT） */
  messageType: string;
  /** 触发事件（如 A01） */
  triggerEvent: string;
  /** 描述 */
  description: string;
  /** 段结构（按顺序） */
  segments: SegmentDef[];
}

// ============================================================
// 常用段定义
// ============================================================

/** MSH段定义 */
export const MSH_SEGMENT_DEF: SegmentDef = {
  segmentType: 'MSH',
  name: '消息头',
  required: true,
  repeatable: false,
  fields: [
    { index: 1, name: '字段分隔符', required: true, dataType: 'ST' },
    { index: 2, name: '编码字符', required: true, dataType: 'ST' },
    { index: 3, name: '发送应用', required: false, dataType: 'HD' },
    { index: 4, name: '发送机构', required: false, dataType: 'HD' },
    { index: 5, name: '接收应用', required: false, dataType: 'HD' },
    { index: 6, name: '接收机构', required: false, dataType: 'HD' },
    { index: 7, name: '日期时间', required: true, dataType: 'TS' },
    { index: 8, name: '安全', required: false, dataType: 'ST' },
    { index: 9, name: '消息类型', required: true, dataType: 'MSG' },
    { index: 10, name: '消息控制ID', required: true, dataType: 'ST' },
    { index: 11, name: '处理ID', required: true, dataType: 'PT' },
    { index: 12, name: '版本ID', required: true, dataType: 'VID' },
    { index: 18, name: '字符集', required: false, dataType: 'ID' },
  ],
};

/** PID段定义 */
export const PID_SEGMENT_DEF: SegmentDef = {
  segmentType: 'PID',
  name: '患者识别',
  required: true,
  repeatable: false,
  fields: [
    { index: 1, name: '设置ID', required: false, dataType: 'SI' },
    { index: 2, name: '患者ID（外部）', required: false, dataType: 'CX' },
    { index: 3, name: '患者ID（内部）', required: true, dataType: 'CX' },
    { index: 4, name: '替代患者ID', required: false, dataType: 'CX' },
    { index: 5, name: '患者姓名', required: true, dataType: 'XPN' },
    { index: 6, name: '母亲娘家姓', required: false, dataType: 'XPN' },
    { index: 7, name: '出生日期时间', required: false, dataType: 'TS' },
    { index: 8, name: '性别', required: false, dataType: 'IS' },
    { index: 10, name: '种族', required: false, dataType: 'CE' },
    { index: 11, name: '患者地址', required: false, dataType: 'XAD' },
    { index: 13, name: '电话号码（家庭）', required: false, dataType: 'XTN' },
    { index: 14, name: '电话号码（工作）', required: false, dataType: 'XTN' },
    { index: 16, name: '婚姻状况', required: false, dataType: 'CE' },
    { index: 19, name: 'SSN号码（身份证）', required: false, dataType: 'ST' },
  ],
};

/** PV1段定义（患者就诊） */
export const PV1_SEGMENT_DEF: SegmentDef = {
  segmentType: 'PV1',
  name: '患者就诊',
  required: false,
  repeatable: false,
  fields: [
    { index: 1, name: '设置ID', required: false, dataType: 'SI' },
    { index: 2, name: '患者类别', required: false, dataType: 'IS' },
    { index: 3, name: '分配患者位置', required: false, dataType: 'PL' },
    { index: 4, name: '入院类型', required: false, dataType: 'IS' },
    { index: 7, name: '主治医生', required: false, dataType: 'XCN' },
    { index: 8, name: '转诊医生', required: false, dataType: 'XCN' },
    { index: 10, name: '医院服务', required: false, dataType: 'IS' },
    { index: 14, name: '入院来源', required: false, dataType: 'IS' },
    { index: 17, name: '出院方式', required: false, dataType: 'IS' },
    { index: 18, name: '出院去向', required: false, dataType: 'IS' },
    { index: 19, name: '就诊状态', required: false, dataType: 'IS' },
    { index: 44, name: '入院时间', required: false, dataType: 'TS' },
    { index: 45, name: '出院时间', required: false, dataType: 'TS' },
  ],
};

/** ORC段定义（通用订单） */
export const ORC_SEGMENT_DEF: SegmentDef = {
  segmentType: 'ORC',
  name: '通用订单',
  required: true,
  repeatable: false,
  fields: [
    { index: 1, name: '订单控制', required: true, dataType: 'ID' },
    { index: 2, name: '商家订单号', required: false, dataType: 'EI' },
    { index: 3, name: '申请订单号', required: false, dataType: 'EI' },
    { index: 4, name: '组号', required: false, dataType: 'EI' },
    { index: 5, name: '订单状态', required: false, dataType: 'ID' },
    { index: 7, name: '数量（定时）', required: false, dataType: 'CQ' },
    { index: 9, name: '日期时间（交易）', required: false, dataType: 'TS' },
    { index: 10, name: '输入者', required: false, dataType: 'XCN' },
    { index: 12, name: '订单提供商', required: false, dataType: 'XCN' },
    { index: 13, name: '输入者地址', required: false, dataType: 'PLD' },
    { index: 16, name: '订单控制原因', required: false, dataType: 'CE' },
  ],
};

/** OBR段定义（观察请求） */
export const OBR_SEGMENT_DEF: SegmentDef = {
  segmentType: 'OBR',
  name: '观察请求',
  required: true,
  repeatable: true,
  fields: [
    { index: 1, name: '设置ID', required: false, dataType: 'SI' },
    { index: 2, name: '商家订单号', required: false, dataType: 'EI' },
    { index: 3, name: '申请订单号', required: false, dataType: 'EI' },
    { index: 4, name: '通用服务ID', required: true, dataType: 'CE' },
    { index: 5, name: '优先级', required: false, dataType: 'ID' },
    { index: 6, name: '请求日期时间', required: false, dataType: 'TS' },
    { index: 7, name: '观察日期时间', required: false, dataType: 'TS' },
    { index: 10, name: '收集代码', required: false, dataType: 'CNE' },
    { index: 13, name: '临床信息', required: false, dataType: 'ST' },
    { index: 14, name: '日期时间（结果状态变化）', required: false, dataType: 'TS' },
    { index: 15, name: '标本收集时间', required: false, dataType: 'TS' },
    { index: 16, name: '标本收集者', required: false, dataType: 'XCN' },
    { index: 17, name: '标本类型', required: false, dataType: 'SPS' },
    { index: 18, name: '标本接受时间', required: false, dataType: 'TS' },
    { index: 19, name: '标本来源', required: false, dataType: 'CM' },
    { index: 22, name: '结果日期时间', required: false, dataType: 'TS' },
    { index: 24, name: '诊断服务部', required: false, dataType: 'CE' },
    { index: 25, name: '结果状态', required: false, dataType: 'ID' },
    { index: 27, name: '结果报告的目的', required: false, dataType: 'ST' },
    { index: 32, name: '结果报告的原则', required: false, dataType: 'ID' },
    { index: 33, name: '标本量', required: false, dataType: 'CQ' },
    { index: 34, name: '标本需要的次数', required: false, dataType: 'NM' },
    { index: 36, name: '运输方式', required: false, dataType: 'CE' },
    { index: 37, name: '安全机制', required: false, dataType: 'CE' },
    { index: 38, name: '报告者', required: false, dataType: 'XCN' },
  ],
};

/** OBX段定义（观察结果） */
export const OBX_SEGMENT_DEF: SegmentDef = {
  segmentType: 'OBX',
  name: '观察结果',
  required: false,
  repeatable: true,
  fields: [
    { index: 1, name: '设置ID', required: false, dataType: 'SI' },
    { index: 2, name: '值类型', required: true, dataType: 'ID' },
    { index: 3, name: '观察ID', required: true, dataType: 'CE' },
    { index: 4, name: '观察子ID', required: false, dataType: 'NM' },
    { index: 5, name: '观察值', required: false, dataType: 'varies' },
    { index: 6, name: '单位', required: false, dataType: 'CE' },
    { index: 7, name: '参考范围', required: false, dataType: 'ST' },
    { index: 8, name: '异常标志', required: false, dataType: 'IS' },
    { index: 9, name: '概率', required: false, dataType: 'NM' },
    { index: 10, name: '异常性质', required: false, dataType: 'ID' },
    { index: 11, name: '观察结果状态', required: false, dataType: 'ID' },
    { index: 12, name: '生效日期时间', required: false, dataType: 'TS' },
    { index: 13, name: '生产者ID', required: false, dataType: 'CE' },
    { index: 14, name: '负责观察者', required: false, dataType: 'XCN' },
    { index: 15, name: '观察方法', required: false, dataType: 'CE' },
    { index: 16, name: '设备标识', required: false, dataType: 'EI' },
    { index: 17, name: '分析结果状态', required: false, dataType: 'ID' },
    { index: 18, name: '日期时间（分析）', required: false, dataType: 'TS' },
    { index: 19, name: '日期时间（观察）', required: false, dataType: 'TS' },
  ],
};

/** DG1段定义（诊断） */
export const DG1_SEGMENT_DEF: SegmentDef = {
  segmentType: 'DG1',
  name: '诊断',
  required: false,
  repeatable: true,
  fields: [
    { index: 1, name: '设置ID', required: false, dataType: 'SI' },
    { index: 2, name: '诊断编码方法', required: false, dataType: 'IS' },
    { index: 3, name: '诊断代码', required: false, dataType: 'CE' },
    { index: 4, name: '诊断描述', required: false, dataType: 'ST' },
    { index: 5, name: '诊断日期时间', required: false, dataType: 'TS' },
    { index: 6, name: '诊断类型', required: false, dataType: 'IS' },
    { index: 7, name: '主要诊断类别', required: false, dataType: 'IS' },
  ],
};

// ============================================================
// 消息类型定义
// ============================================================

/** ADT^A01：入院通知 */
export const ADT_A01_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A01',
  description: '入院通知 - 患者入院时发送',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: true },
    { ...DG1_SEGMENT_DEF, required: false },
  ],
};

/** ADT^A04：挂号通知 */
export const ADT_A04_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A04',
  description: '挂号通知 - 患者门诊挂号时发送',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...DG1_SEGMENT_DEF, required: false },
  ],
};

/** ORM^O01：订单请求 */
export const ORM_O01_DEF: MessageTypeDef = {
  messageType: 'ORM',
  triggerEvent: 'O01',
  description: '订单请求 - 下达检验/检查/药品医嘱时发送',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...ORC_SEGMENT_DEF, required: true },
    { ...OBR_SEGMENT_DEF, required: true },
    { ...DG1_SEGMENT_DEF, required: false },
  ],
};

/** ORU^R01：观察结果 */
export const ORU_R01_DEF: MessageTypeDef = {
  messageType: 'ORU',
  triggerEvent: 'R01',
  description: '观察结果 - 检验/检查结果回报时发送',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...ORC_SEGMENT_DEF, required: false },
    { ...OBR_SEGMENT_DEF, required: true },
    { ...OBX_SEGMENT_DEF, required: true, repeatable: true },
    { ...DG1_SEGMENT_DEF, required: false },
  ],
};

/** ADT^A02：患者转入/转科 */
export const ADT_A02_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A02',
  description: '患者转入/转科通知',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: true },
  ],
};

/** ADT^A03：出院通知 */
export const ADT_A03_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A03',
  description: '出院通知 - 患者出院时发送',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: true },
  ],
};

/** ADT^A08：患者信息更新 */
export const ADT_A08_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A08',
  description: '患者信息更新 - 修改患者人口学信息',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
  ],
};

/** ADT^A11：取消入院 */
export const ADT_A11_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A11',
  description: '取消入院通知',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: true },
  ],
};

/** ADT^A40：患者信息合并 */
export const ADT_A40_DEF: MessageTypeDef = {
  messageType: 'ADT',
  triggerEvent: 'A40',
  description: '患者ID合并通知',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
  ],
};

/** MDM^T02：文档查询/分享 */
export const MDM_T02_DEF: MessageTypeDef = {
  messageType: 'MDM',
  triggerEvent: 'T02',
  description: '文档原文通知/分享（病历文档）',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...OBX_SEGMENT_DEF, required: true, repeatable: true },
  ],
};

/** BAR^P01：账户管理（费用记账） */
export const BAR_P01_DEF: MessageTypeDef = {
  messageType: 'BAR',
  triggerEvent: 'P01',
  description: '添加/更新账单项',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: true },
  ],
};

/** DFT^P03：直接财务交易 */
export const DFT_P03_DEF: MessageTypeDef = {
  messageType: 'DFT',
  triggerEvent: 'P03',
  description: 'Post Detail Financial Transaction（费用明细记账）',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
  ],
};

/** SIU^S12：排班通知（预约取消） */
export const SIU_S12_DEF: MessageTypeDef = {
  messageType: 'SIU',
  triggerEvent: 'S12',
  description: '排班/预约通知（取消预约）',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
  ],
};

/** RDE^O01：药品/耗材医嘱 */
export const RDE_O01_DEF: MessageTypeDef = {
  messageType: 'RDE',
  triggerEvent: 'O01',
  description: '药品/耗材订单请求',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...ORC_SEGMENT_DEF, required: true },
    { ...OBR_SEGMENT_DEF, required: true },
  ],
};

/** RDS^O01：药品调配 */
export const RDS_O01_DEF: MessageTypeDef = {
  messageType: 'RDS',
  triggerEvent: 'O01',
  description: '药品调配分发结果',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...ORC_SEGMENT_DEF, required: true },
    { ...OBR_SEGMENT_DEF, required: true },
  ],
};

/** RAS^O01：药品给药记录 */
export const RAS_O01_DEF: MessageTypeDef = {
  messageType: 'RAS',
  triggerEvent: 'O01',
  description: '药品给药管理记录',
  segments: [
    MSH_SEGMENT_DEF,
    { ...PID_SEGMENT_DEF, required: true },
    { ...PV1_SEGMENT_DEF, required: false },
    { ...ORC_SEGMENT_DEF, required: true },
    { ...OBR_SEGMENT_DEF, required: true },
  ],
};

/** 所有消息类型定义 */
export const MESSAGE_TYPE_DEFS: Record<string, MessageTypeDef> = {
  'ADT^A01': ADT_A01_DEF,
  'ADT^A02': ADT_A02_DEF,
  'ADT^A03': ADT_A03_DEF,
  'ADT^A04': ADT_A04_DEF,
  'ADT^A08': ADT_A08_DEF,
  'ADT^A11': ADT_A11_DEF,
  'ADT^A40': ADT_A40_DEF,
  'ORM^O01': ORM_O01_DEF,
  'ORU^R01': ORU_R01_DEF,
  'MDM^T02': MDM_T02_DEF,
  'BAR^P01': BAR_P01_DEF,
  'DFT^P03': DFT_P03_DEF,
  'SIU^S12': SIU_S12_DEF,
  'RDE^O01': RDE_O01_DEF,
  'RDS^O01': RDS_O01_DEF,
  'RAS^O01': RAS_O01_DEF,
};

// ============================================================
// 辅助构建方法
// ============================================================

/**
 * 创建ADT^A01（入院通知）消息构建器
 *
 * @param options - 消息选项
 * @returns HL7Builder实例
 */
export function createADTA01Builder(options: {
  sendingApp?: string;
  sendingFacility?: string;
  receivingApp?: string;
  receivingFacility?: string;
  patientId: string;
  patientName: string;
  gender?: string;
  birthDate?: string;
  admittingDoctor?: string;
  department?: string;
  bedNo?: string;
  diagnosis?: string;
  diagnosisCode?: string;
}): HL7Builder {
  const builder = new HL7Builder();
  builder
    .setMessageType('ADT', 'A01')
    .setSendingApplication(options.sendingApp ?? 'JIANLAN_AGENT')
    .setSendingFacility(options.sendingFacility ?? 'JIANLAN')
    .setReceivingApplication(options.receivingApp ?? 'HIS')
    .setReceivingFacility(options.receivingFacility ?? 'HOSPITAL')
    .setProcessingId('P')
    .setVersionId('2.5')
    .setCharacterSet('UTF-8');

  // PID段
  builder.addSegment('PID').setField(3, options.patientId).setField(5, options.patientName);
  if (options.birthDate) builder.setField(7, options.birthDate);
  if (options.gender) builder.setField(8, options.gender);

  // PV1段
  builder
    .addSegment('PV1')
    .setField(2, 'I') // 住院
    .setField(10, options.department ?? '');
  if (options.admittingDoctor) builder.setField(7, options.admittingDoctor);
  if (options.bedNo) builder.setField(3, options.bedNo);

  // DG1段
  if (options.diagnosis) {
    builder
      .addSegment('DG1')
      .setField(2, 'ICD10')
      .setField(3, options.diagnosisCode ?? '')
      .setField(4, options.diagnosis)
      .setField(6, 'A'); // 最终诊断
  }

  return builder;
}

/**
 * 创建ORM^O01（订单请求）消息构建器
 */
export function createORMO01Builder(options: {
  sendingApp?: string;
  sendingFacility?: string;
  receivingApp?: string;
  receivingFacility?: string;
  patientId: string;
  patientName: string;
  orderControl?: string; // NW=新订单, CA=取消
  placerOrderNo: string;
  examCode: string;
  examName: string;
  priority?: string; // R=常规, S=加急, T=特急
  clinicalDiagnosis?: string;
  orderingDoctor?: string;
}): HL7Builder {
  const builder = new HL7Builder();
  builder
    .setMessageType('ORM', 'O01')
    .setSendingApplication(options.sendingApp ?? 'JIANLAN_AGENT')
    .setSendingFacility(options.sendingFacility ?? 'JIANLAN')
    .setReceivingApplication(options.receivingApp ?? 'LIS')
    .setReceivingFacility(options.receivingFacility ?? 'HOSPITAL')
    .setProcessingId('P')
    .setVersionId('2.5')
    .setCharacterSet('UTF-8');

  // PID段
  builder.addSegment('PID').setField(3, options.patientId).setField(5, options.patientName);

  // ORC段
  builder
    .addSegment('ORC')
    .setField(1, options.orderControl ?? 'NW')
    .setField(2, options.placerOrderNo)
    .setField(3, options.placerOrderNo);
  if (options.orderingDoctor) builder.setField(12, options.orderingDoctor);

  // OBR段
  builder
    .addSegment('OBR')
    .setField(2, options.placerOrderNo)
    .setField(3, options.placerOrderNo)
    .setField(4, `${options.examCode}^${options.examName}`)
    .setField(5, options.priority ?? 'R');
  if (options.clinicalDiagnosis) builder.setField(13, options.clinicalDiagnosis);

  return builder;
}

/**
 * 创建ORU^R01（观察结果）消息构建器
 */
export function createORUR01Builder(options: {
  sendingApp?: string;
  sendingFacility?: string;
  receivingApp?: string;
  receivingFacility?: string;
  patientId: string;
  patientName: string;
  placerOrderNo: string;
  examCode: string;
  examName: string;
  results: {
    code: string;
    name: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    abnormalFlag?: string; // H=高, L=低, A=异常, N=正常
    valueType?: string; // NM=数值, ST=文本
  }[];
  reportedBy?: string;
}): HL7Builder {
  const builder = new HL7Builder();
  builder
    .setMessageType('ORU', 'R01')
    .setSendingApplication(options.sendingApp ?? 'LIS')
    .setSendingFacility(options.sendingFacility ?? 'HOSPITAL')
    .setReceivingApplication(options.receivingApp ?? 'JIANLAN_AGENT')
    .setReceivingFacility(options.receivingFacility ?? 'JIANLAN')
    .setProcessingId('P')
    .setVersionId('2.5')
    .setCharacterSet('UTF-8');

  // PID段
  builder.addSegment('PID').setField(3, options.patientId).setField(5, options.patientName);

  // OBR段
  builder
    .addSegment('OBR')
    .setField(2, options.placerOrderNo)
    .setField(3, options.placerOrderNo)
    .setField(4, `${options.examCode}^${options.examName}`)
    .setField(25, 'F'); // 最终结果
  if (options.reportedBy) builder.setField(38, options.reportedBy);

  // OBX段（每个结果一个OBX）
  options.results.forEach((result, idx) => {
    builder
      .addSegment('OBX')
      .setField(1, String(idx + 1))
      .setField(2, result.valueType ?? 'NM')
      .setField(3, `${result.code}^${result.name}`)
      .setField(5, result.value)
      .setField(6, result.unit ?? '')
      .setField(7, result.referenceRange ?? '')
      .setField(8, result.abnormalFlag ?? 'N')
      .setField(11, 'F'); // 最终结果
  });

  return builder;
}

/**
 * 创建ADT^A03（出院通知）消息构建器
 */
export function createADTA03Builder(options: {
  sendingApp?: string;
  patientId: string;
  patientName: string;
  department?: string;
  dischargeDisposition?: string;
}): HL7Builder {
  const builder = new HL7Builder();
  builder
    .setMessageType('ADT', 'A03')
    .setSendingApplication(options.sendingApp ?? 'HIS')
    .setSendingFacility('HOSPITAL')
    .setReceivingApplication('JIANLAN_AGENT')
    .setReceivingFacility('JIANLAN')
    .setProcessingId('P')
    .setVersionId('2.5')
    .setCharacterSet('UTF-8');

  builder.addSegment('PID').setField(3, options.patientId).setField(5, options.patientName);
  builder
    .addSegment('PV1')
    .setField(2, 'I')
    .setField(10, options.department ?? '')
    .setField(18, options.dischargeDisposition ?? '');

  return builder;
}

/**
 * 创建 ORU^R01 危急值结果构建器（快捷封装）
 */
export function createORUCriticalValueBuilder(options: {
  patientId: string;
  patientName: string;
  placerOrderNo: string;
  examCode: string;
  examName: string;
  itemCode: string;
  itemName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  abnormalFlag?: string;
}): HL7Builder {
  return createORUR01Builder({
    patientId: options.patientId,
    patientName: options.patientName,
    placerOrderNo: options.placerOrderNo,
    examCode: options.examCode,
    examName: options.examName,
    results: [
      {
        code: options.itemCode,
        name: options.itemName,
        value: options.value,
        unit: options.unit,
        referenceRange: options.referenceRange,
        abnormalFlag: options.abnormalFlag ?? 'CC',
        valueType: 'NM',
      },
    ],
  });
}
