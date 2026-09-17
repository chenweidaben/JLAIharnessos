/**
 * 健澜科技数智医院智能体 - integration/protocols/hl7/HL7Builder.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HL7消息构建器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 从对象模型构建HL7 v2.x消息字符串，支持各段字段设置，
 * 自动计算校验和（用于MLLP传输）。
 *
 * @module integration/protocols/hl7/HL7Builder
 */

import {
  DEFAULT_ENCODING_CHARACTERS,
  type HL7EncodingCharacters,
  HL7Field,
  HL7Message,
  HL7Segment,
} from './HL7Message';

/**
 * HL7消息构建器
 *
 * 提供流式API构建HL7消息，自动管理MSH段和编码字符。
 *
 * @example
 * ```typescript
 * const builder = new HL7Builder();
 * builder
 *   .setMessageType('ADT', 'A01')
 *   .setSendingApplication('JIANLAN')
 *   .setSendingFacility('HOSPITAL01')
 *   .setReceivingApplication('HIS')
 *   .setReceivingFacility('HIS_VENDOR')
 *   .addSegment('PID')
 *     .setField(3, 'P12345')
 *     .setField(5, '张三')
 *   .build();
 * ```
 */
export class HL7Builder {
  private message: HL7Message;
  private currentSegment: HL7Segment | undefined;
  private messageCounter = 0;

  constructor(encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS) {
    this.message = new HL7Message();
    // 设置编码字符到MSH-2
    const msh = this.message.getMSH();
    const encStr = `${encoding.componentSeparator}${encoding.repetitionSeparator}${encoding.escapeCharacter}${encoding.subcomponentSeparator}`;
    msh.setFieldValue(2, encStr);
  }

  // ============================================================
  // MSH段设置
  // ============================================================

  /**
   * 设置消息类型和触发事件（MSH-9）
   *
   * @param messageType - 消息类型（如 ADT、ORM、ORU）
   * @param triggerEvent - 触发事件（如 A01、O01、R01）
   */
  setMessageType(messageType: string, triggerEvent: string): this {
    const msh = this.message.getMSH();
    const field = new HL7Field();
    field.setComponent(0, 0, messageType);
    field.setComponent(0, 1, triggerEvent);
    msh.setField(9, field);
    return this;
  }

  /** 设置发送应用（MSH-3） */
  setSendingApplication(value: string): this {
    this.message.getMSH().setFieldValue(3, value);
    return this;
  }

  /** 设置发送机构（MSH-4） */
  setSendingFacility(value: string): this {
    this.message.getMSH().setFieldValue(4, value);
    return this;
  }

  /** 设置接收应用（MSH-5） */
  setReceivingApplication(value: string): this {
    this.message.getMSH().setFieldValue(5, value);
    return this;
  }

  /** 设置接收机构（MSH-6） */
  setReceivingFacility(value: string): this {
    this.message.getMSH().setFieldValue(6, value);
    return this;
  }

  /** 设置消息时间（MSH-7），默认当前时间 */
  setDateTime(value?: string): this {
    const dt = value ?? this.formatHL7DateTime(new Date());
    this.message.getMSH().setFieldValue(7, dt);
    return this;
  }

  /** 设置安全级别（MSH-8） */
  setSecurity(value: string): this {
    this.message.getMSH().setFieldValue(8, value);
    return this;
  }

  /** 设置消息控制ID（MSH-10），默认自动生成 */
  setMessageControlId(value?: string): this {
    const id = value ?? this.generateControlId();
    this.message.getMSH().setFieldValue(10, id);
    return this;
  }

  /** 设置处理ID（MSH-11），默认 P（生产） */
  setProcessingId(value = 'P'): this {
    this.message.getMSH().setFieldValue(11, value);
    return this;
  }

  /** 设置版本ID（MSH-12），默认 2.5 */
  setVersionId(value = '2.5'): this {
    this.message.getMSH().setFieldValue(12, value);
    return this;
  }

  /** 设置字符集（MSH-18），默认 UTF-8 */
  setCharacterSet(value = 'UTF-8'): this {
    this.message.getMSH().setFieldValue(18, value);
    return this;
  }

  // ============================================================
  // 段操作
  // ============================================================

  /**
   * 添加新段
   *
   * @param segmentType - 段类型（3个字母，如 PID、OBR、OBX）
   * @returns 构建器实例（链式调用）
   */
  addSegment(segmentType: string): this {
    const segment = new HL7Segment(segmentType);
    this.message.addSegment(segment);
    this.currentSegment = segment;
    return this;
  }

  /**
   * 获取当前操作的段
   */
  getCurrentSegment(): HL7Segment | undefined {
    return this.currentSegment;
  }

  /**
   * 设置当前段的字段值
   *
   * @param index - 字段索引（1-based）
   * @param value - 字段值
   */
  setField(index: number, value: string): this {
    if (!this.currentSegment) {
      throw new Error('当前没有活动段，请先调用 addSegment()');
    }
    // 使用HL7Field.parse解析值，自动拆分组件/重复/子组件
    const field = HL7Field.parse(value, this.message.encoding);
    this.currentSegment.setField(index, field);
    return this;
  }

  /**
   * 设置当前段的字段组件值
   *
   * @param fieldIndex - 字段索引（1-based）
   * @param componentIndex - 组件索引（0-based）
   * @param value - 值
   * @param repetition - 重复索引（0-based，默认0）
   */
  setFieldComponent(
    fieldIndex: number,
    componentIndex: number,
    value: string,
    repetition = 0,
  ): this {
    if (!this.currentSegment) {
      throw new Error('当前没有活动段，请先调用 addSegment()');
    }
    let field = this.currentSegment.getField(fieldIndex);
    if (!field) {
      field = new HL7Field();
      this.currentSegment.setField(fieldIndex, field);
    }
    field.setComponent(repetition, componentIndex, value);
    return this;
  }

  /**
   * 设置当前段的字段对象
   */
  setFieldObject(index: number, field: HL7Field): this {
    if (!this.currentSegment) {
      throw new Error('当前没有活动段，请先调用 addSegment()');
    }
    this.currentSegment.setField(index, field);
    return this;
  }

  // ============================================================
  // 构建
  // ============================================================

  /**
   * 构建HL7消息
   *
   * @returns HL7消息对象
   */
  build(): HL7Message {
    // 确保消息控制ID存在
    if (!this.message.getMessageControlId()) {
      this.setMessageControlId();
    }
    // 确保消息时间存在
    if (!this.message.getMSH().getFieldValue(7)) {
      this.setDateTime();
    }
    // 确保处理ID存在（默认P=生产）
    if (!this.message.getMSH().getFieldValue(11)) {
      this.setProcessingId('P');
    }
    // 确保版本ID存在（默认2.5）
    if (!this.message.getMSH().getFieldValue(12)) {
      this.setVersionId('2.5');
    }
    return this.message;
  }

  /**
   * 构建并转换为HL7字符串
   *
   * @returns HL7消息字符串
   */
  buildString(): string {
    return this.build().toString();
  }

  /**
   * 构建MLLP帧
   *
   * MLLP（Minimum Lower Layer Protocol）是HL7 over TCP的标准封装：
   * <VT>消息<FS><CR>
   * VT = 0x0B (垂直制表符)
   * FS = 0x1C (文件分隔符)
   * CR = 0x0D (回车)
   *
   * @returns MLLP帧Buffer
   */
  buildMLLP(): Buffer {
    const message = this.buildString();
    const VT = Buffer.from([0x0b]);
    const FS = Buffer.from([0x1c]);
    const CR = Buffer.from([0x0d]);
    return Buffer.concat([VT, Buffer.from(message, 'utf8'), FS, CR]);
  }

  /**
   * 计算校验和（简单的字节和，用于自定义传输）
   *
   * 注意：HL7标准本身不定义校验和，某些私有传输协议可能使用。
   *
   * @returns 校验和（16进制字符串）
   */
  calculateChecksum(): string {
    const message = this.buildString();
    let sum = 0;
    for (let i = 0; i < message.length; i++) {
      sum = (sum + message.charCodeAt(i)) & 0xffff;
    }
    return sum.toString(16).toUpperCase().padStart(4, '0');
  }

  // ============================================================
  // 工具方法
  // ============================================================

  /**
   * 格式化HL7日期时间（YYYYMMDDHHMMSS）
   */
  private formatHL7DateTime(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }

  /**
   * 生成消息控制ID
   */
  private generateControlId(): string {
    this.messageCounter++;
    return `JL${Date.now().toString(36).toUpperCase()}${String(this.messageCounter).padStart(4, '0')}`;
  }

  /**
   * 从现有消息创建构建器
   */
  static fromMessage(message: HL7Message): HL7Builder {
    const builder = new HL7Builder(message.encoding);
    // 复制MSH字段
    const srcMsh = message.getMSH();
    const dstMsh = builder.message.getMSH();
    for (let i = 2; i <= srcMsh.getFieldCount() + 1; i++) {
      const field = srcMsh.getField(i);
      if (field) {
        dstMsh.setField(i, field);
      }
    }
    // 复制其余段
    for (const seg of message.getSegments()) {
      if (seg.segmentType !== 'MSH') {
        builder.message.addSegment(seg);
      }
    }
    return builder;
  }
}
