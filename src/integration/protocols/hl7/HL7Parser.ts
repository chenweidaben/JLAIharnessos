/**
 * 健澜科技数智医院智能体 - integration/protocols/hl7/HL7Parser.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HL7解析器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * HL7 v2.x 消息解析器，将HL7消息字符串解析为对象模型。
 * 支持编码处理、转义字符处理和消息结构验证。
 *
 * @module integration/protocols/hl7/HL7Parser
 */

import {
  DEFAULT_ENCODING_CHARACTERS,
  type HL7EncodingCharacters,
  type HL7Field,
  HL7Message,
  type HL7Segment,
} from './HL7Message';

/** 解析结果 */
export interface HL7ParseResult {
  /** 解析后的消息 */
  message: HL7Message;
  /** 是否解析成功 */
  success: boolean;
  /** 警告信息 */
  warnings: string[];
  /** 错误信息 */
  errors: string[];
  /** 解析耗时（毫秒） */
  parseTimeMs: number;
}

/**
 * HL7转义字符处理
 *
 * HL7 v2.x 转义序列：
 * \H\ - 开始高亮
 * \N\ - 正常文本（结束高亮）
 * \F\ - 字段分隔符
 * \S\ - 组件分隔符
 * \T\ - 子组件分隔符
 * \R\ - 重复分隔符
 * \E\ - 转义字符
 * \Xdddd\ - 十六进制数据
 * \Z...\ - 本地定义转义
 */
export class HL7EscapeHandler {
  private readonly encoding: HL7EncodingCharacters;
  private readonly fieldSep: string;

  constructor(encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS, fieldSeparator = '|') {
    this.encoding = encoding;
    this.fieldSep = fieldSeparator;
  }

  /**
   * 解码HL7转义序列
   *
   * @param value - 包含转义序列的字符串
   * @returns 解码后的字符串
   */
  decode(value: string): string {
    const esc = this.encoding.escapeCharacter;
    if (!value.includes(esc)) {
      return value;
    }

    let result = '';
    let i = 0;
    while (i < value.length) {
      if (value[i] === esc) {
        // 查找结束转义符
        const endIndex = value.indexOf(esc, i + 1);
        if (endIndex === -1) {
          // 未闭合的转义，保留原文
          result += value.substring(i);
          break;
        }
        const escapeContent = value.substring(i + 1, endIndex);
        result += this.decodeEscapeSequence(escapeContent);
        i = endIndex + 1;
      } else {
        result += value[i];
        i++;
      }
    }
    return result;
  }

  /**
   * 编码为HL7转义序列
   *
   * @param value - 原始字符串
   * @returns 编码后的字符串
   */
  encode(value: string): string {
    const esc = this.encoding.escapeCharacter;
    let result = '';
    for (const ch of value) {
      switch (ch) {
        case this.fieldSep:
          result += `${esc}F${esc}`;
          break;
        case this.encoding.componentSeparator:
          result += `${esc}S${esc}`;
          break;
        case this.encoding.subcomponentSeparator:
          result += `${esc}T${esc}`;
          break;
        case this.encoding.repetitionSeparator:
          result += `${esc}R${esc}`;
          break;
        case esc:
          result += `${esc}E${esc}`;
          break;
        default:
          result += ch;
      }
    }
    return result;
  }

  private decodeEscapeSequence(content: string): string {
    if (content.length === 0) return '';

    switch (content.charAt(0)) {
      case 'H':
        return ''; // 高亮开始（纯文本中忽略）
      case 'N':
        return ''; // 正常文本（结束高亮）
      case 'F':
        return this.fieldSep;
      case 'S':
        return this.encoding.componentSeparator;
      case 'T':
        return this.encoding.subcomponentSeparator;
      case 'R':
        return this.encoding.repetitionSeparator;
      case 'E':
        return this.encoding.escapeCharacter;
      case 'C':
        return '&'; // \C\ 连接符（ampersand）
      case 'M':
        return ''; // 多字节开始（纯文本中忽略）
      case '.': {
        // \.br\ 换行，\.sp\ 空格
        if (content === '.br') return '\n';
        if (content === '.sp') return ' ';
        return `${this.encoding.escapeCharacter}${content}${this.encoding.escapeCharacter}`;
      }
      case 'X': {
        // 十六进制数据 \Xdddd\
        const hex = content.substring(1);
        try {
          const bytes = [];
          for (let i = 0; i < hex.length; i += 2) {
            bytes.push(parseInt(hex.substring(i, i + 2), 16));
          }
          return Buffer.from(bytes).toString('utf8');
        } catch {
          return content;
        }
      }
      default:
        // 本地定义转义或未知，保留原文（含转义符）
        return `${this.encoding.escapeCharacter}${content}${this.encoding.escapeCharacter}`;
    }
  }
}

/**
 * HL7解析器
 *
 * 将HL7 v2.x消息字符串解析为HL7Message对象模型，
 * 并进行结构验证。
 */
export class HL7Parser {
  /** 是否严格验证（缺少必填段时报错） */
  public strictMode = false;
  /** 是否解码转义字符 */
  public decodeEscapes = true;

  /**
   * 解析HL7消息
   *
   * @param raw - HL7消息字符串
   * @returns 解析结果
   */
  parse(raw: string): HL7ParseResult {
    const startTime = Date.now();
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      if (!raw || raw.trim().length === 0) {
        errors.push('HL7消息为空');
        return {
          message: new HL7Message(),
          success: false,
          warnings,
          errors,
          parseTimeMs: Date.now() - startTime,
        };
      }

      const message = HL7Message.parse(raw);

      // 验证消息结构
      this.validateMessage(message, warnings, errors);

      // 解码转义字符
      if (this.decodeEscapes) {
        this.decodeMessageEscapes(message);
      }

      const success = errors.length === 0;
      return {
        message,
        success,
        warnings,
        errors,
        parseTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      errors.push(`解析失败: ${error instanceof Error ? error.message : String(error)}`);
      return {
        message: new HL7Message(),
        success: false,
        warnings,
        errors,
        parseTimeMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 验证消息结构
   */
  private validateMessage(message: HL7Message, warnings: string[], errors: string[]): void {
    const segments = message.getSegments();

    // 检查MSH段
    const msh = message.getMSH();
    if (msh?.segmentType !== 'MSH') {
      errors.push('消息缺少MSH段');
      return;
    }

    // 检查MSH必填字段
    const messageType = message.getMessageType();
    if (!messageType) {
      (this.strictMode ? errors : warnings).push('MSH-9（消息类型）为空');
    }
    const controlId = message.getMessageControlId();
    if (!controlId) {
      (this.strictMode ? errors : warnings).push('MSH-10（消息控制ID）为空');
    }

    // 检查消息类型对应的必填段
    if (this.strictMode) {
      this.validateRequiredSegments(messageType, message.getTriggerEvent(), segments, errors);
    }
  }

  /**
   * 验证必填段
   */
  private validateRequiredSegments(
    messageType: string,
    triggerEvent: string,
    segments: HL7Segment[],
    errors: string[],
  ): void {
    const segmentTypes = new Set(segments.map((s) => s.segmentType));
    const required: string[] = ['PID']; // 大多数消息需要PID

    if (messageType === 'ORM' || messageType === 'ORU') {
      required.push('OBR'); // 订单/观察结果需要OBR
    }

    for (const seg of required) {
      if (!segmentTypes.has(seg)) {
        errors.push(`消息类型 ${messageType}^${triggerEvent} 缺少必填段 ${seg}`);
      }
    }
  }

  /**
   * 解码消息中所有字段的转义字符
   */
  private decodeMessageEscapes(message: HL7Message): void {
    const handler = new HL7EscapeHandler(message.encoding, message.fieldSeparator);
    for (const segment of message.getSegments()) {
      for (let i = 1; i <= segment.getFieldCount(); i++) {
        const field = segment.getField(i);
        if (field) {
          this.decodeFieldEscapes(field, handler);
        }
      }
    }
  }

  private decodeFieldEscapes(field: HL7Field, handler: HL7EscapeHandler): void {
    for (let rep = 0; rep < field.getRepetitionCount(); rep++) {
      for (let comp = 0; comp < field.getComponentCount(rep); comp++) {
        const component = field.getComponent(rep, comp);
        if (component) {
          const decoded = handler.decode(component.value);
          if (decoded !== component.value) {
            component.value = decoded;
          }
        }
      }
    }
  }

  /**
   * 判断段类型是否为 Z 段（厂商自定义段，以 Z 开头）
   *
   * @param segmentType - 段类型
   * @returns 是否为 Z 段
   */
  isZSegment(segmentType: string): boolean {
    return segmentType.length === 3 && segmentType.startsWith('Z');
  }

  /**
   * 提取消息中的所有 Z 段（厂商自定义扩展段）
   *
   * @param message - 已解析消息
   * @returns Z 段列表
   */
  getZSegments(message: HL7Message): HL7Segment[] {
    return message.getSegments().filter((seg) => this.isZSegment(seg.segmentType));
  }
}
