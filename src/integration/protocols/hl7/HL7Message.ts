/**
 * 健澜科技数智医院智能体 - integration/protocols/hl7/HL7Message.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - HL7消息模型
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * HL7 v2.x 消息结构模型，包含消息（Message）、段（Segment）、
 * 字段（Field）、组件（Component）、子组件（SubComponent）。
 *
 * HL7 v2.x 编码规则：
 * - 段分隔符：\r (回车)
 * - 字段分隔符：| (MSH段第1个字段定义)
 * - 组件分隔符：^ (MSH-2定义)
 * - 重复分隔符：~ (MSH-2定义)
 * - 转义字符：\ (MSH-2定义)
 * - 子组件分隔符：& (MSH-2定义)
 *
 * @module integration/protocols/hl7/HL7Message
 */

/**
 * HL7 编码字符集
 *
 * 从 MSH-2 字段解析，定义消息中使用的分隔符。
 */
export interface HL7EncodingCharacters {
  /** 组件分隔符，默认 ^ */
  componentSeparator: string;
  /** 重复分隔符，默认 ~ */
  repetitionSeparator: string;
  /** 转义字符，默认 \ */
  escapeCharacter: string;
  /** 子组件分隔符，默认 & */
  subcomponentSeparator: string;
}

/** 默认编码字符 */
export const DEFAULT_ENCODING_CHARACTERS: HL7EncodingCharacters = {
  componentSeparator: '^',
  repetitionSeparator: '~',
  escapeCharacter: '\\',
  subcomponentSeparator: '&',
};

/**
 * HL7 子组件（SubComponent）
 *
 * 最底层的数据单元，由 & 分隔。
 * 例如：组件 "abc&def" 包含两个子组件 "abc" 和 "def"。
 */
export class HL7SubComponent {
  private _value: string;

  constructor(value = '') {
    this._value = value;
  }

  get value(): string {
    return this._value;
  }

  set value(v: string) {
    this._value = v;
  }

  toString(): string {
    return this._value;
  }
}

/**
 * HL7 组件（Component）
 *
 * 字段内的数据单元，由 ^ 分隔，可包含多个子组件（由 & 分隔）。
 * 例如：字段 "张三^男^19700101" 包含三个组件。
 */
export class HL7Component {
  private subcomponents: HL7SubComponent[] = [];

  constructor(value?: string) {
    if (value !== undefined) {
      this.subcomponents.push(new HL7SubComponent(value));
    }
  }

  /**
   * 获取子组件
   *
   * @param index - 子组件索引（0-based）
   * @returns 子组件，不存在则返回 undefined
   */
  getSubComponent(index: number): HL7SubComponent | undefined {
    return this.subcomponents[index];
  }

  /**
   * 设置子组件值
   *
   * @param index - 子组件索引
   * @param value - 值
   */
  setSubComponent(index: number, value: string): void {
    while (this.subcomponents.length <= index) {
      this.subcomponents.push(new HL7SubComponent());
    }
    this.subcomponents[index].value = value;
  }

  /**
   * 添加子组件
   */
  addSubComponent(value: string): HL7SubComponent {
    const sc = new HL7SubComponent(value);
    this.subcomponents.push(sc);
    return sc;
  }

  /** 获取子组件数量 */
  getSubComponentCount(): number {
    return this.subcomponents.length;
  }

  /**
   * 获取组件的字符串值（第一个子组件的值）
   */
  get value(): string {
    return this.subcomponents.length > 0 ? this.subcomponents[0].value : '';
  }

  /**
   * 设置组件值（设置第一个子组件，清除其余）
   */
  set value(v: string) {
    this.subcomponents = [new HL7SubComponent(v)];
  }

  /**
   * 转换为字符串（使用 & 连接子组件）
   */
  toString(encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS): string {
    return this.subcomponents.map((sc) => sc.toString()).join(encoding.subcomponentSeparator);
  }

  /**
   * 从字符串解析组件
   */
  static parse(
    value: string,
    encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS,
  ): HL7Component {
    const comp = new HL7Component();
    const parts = value.split(encoding.subcomponentSeparator);
    parts.forEach((p) => comp.addSubComponent(p));
    return comp;
  }
}

/**
 * HL7 字段（Field）
 *
 * 段内的数据单元，由 | 分隔，可包含多个重复（由 ~ 分隔），
 * 每个重复可包含多个组件（由 ^ 分隔）。
 *
 * 注意：MSH段的字段索引特殊，MSH-1 是字段分隔符本身，
 * MSH-2 是编码字符，实际数据从 MSH-3 开始。
 */
export class HL7Field {
  /** 重复列表，每个重复是一个组件数组 */
  private repetitions: HL7Component[][] = [];

  constructor(value?: string) {
    if (value !== undefined) {
      this.repetitions.push([new HL7Component(value)]);
    }
  }

  /**
   * 获取组件
   *
   * @param repetition - 重复索引（0-based，默认0）
   * @param component - 组件索引（0-based，默认0）
   * @returns 组件，不存在则返回 undefined
   */
  getComponent(repetition = 0, component = 0): HL7Component | undefined {
    return this.repetitions[repetition]?.[component];
  }

  /**
   * 获取字段值（第一个重复的第一个组件值）
   */
  get value(): string {
    return this.getComponent()?.value ?? '';
  }

  /**
   * 设置字段值（设置第一个重复第一个组件，清除其余）
   */
  set value(v: string) {
    this.repetitions = [[new HL7Component(v)]];
  }

  /**
   * 设置组件值
   *
   * @param repetition - 重复索引
   * @param component - 组件索引
   * @param value - 值
   */
  setComponent(repetition: number, component: number, value: string): void {
    while (this.repetitions.length <= repetition) {
      this.repetitions.push([]);
    }
    while (this.repetitions[repetition].length <= component) {
      this.repetitions[repetition].push(new HL7Component());
    }
    this.repetitions[repetition][component].value = value;
  }

  /**
   * 添加重复
   *
   * @param components - 组件列表
   */
  addRepetition(components: HL7Component[] = []): HL7Component[] {
    this.repetitions.push(components);
    return components;
  }

  /** 获取重复数量 */
  getRepetitionCount(): number {
    return this.repetitions.length;
  }

  /** 获取指定重复的组件数量 */
  getComponentCount(repetition = 0): number {
    return this.repetitions[repetition]?.length ?? 0;
  }

  /**
   * 转换为字符串
   *
   * @param encoding - 编码字符
   * @returns 字段字符串，重复用 ~ 连接，组件用 ^ 连接
   */
  toString(encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS): string {
    return this.repetitions
      .map((comps) => comps.map((c) => c.toString(encoding)).join(encoding.componentSeparator))
      .join(encoding.repetitionSeparator);
  }

  /**
   * 从字符串解析字段
   */
  static parse(
    value: string,
    encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS,
  ): HL7Field {
    const field = new HL7Field();
    const reps = value.split(encoding.repetitionSeparator);
    reps.forEach((rep) => {
      const comps = rep
        .split(encoding.componentSeparator)
        .map((c) => HL7Component.parse(c, encoding));
      field.addRepetition(comps);
    });
    return field;
  }
}

/**
 * HL7 段（Segment）
 *
 * 消息的基本结构单元，由3个字母的段类型代码开头，
 * 后跟多个字段（由 | 分隔）。
 * 例如：PID|1|12345|张三|...
 */
export class HL7Segment {
  /** 段类型（3个字母，如 MSH、PID、OBR） */
  private _segmentType: string;
  /** 字段列表 */
  private fields: HL7Field[] = [];

  constructor(segmentType: string) {
    this._segmentType = segmentType;
  }

  /** 段类型 */
  get segmentType(): string {
    return this._segmentType;
  }

  /**
   * 获取字段
   *
   * 注意：对于MSH段，字段索引遵循HL7标准：
   * - MSH-1 = 字段分隔符
   * - MSH-2 = 编码字符
   * - MSH-3 = 发送应用（第一个数据字段）
   *
   * @param index - 字段索引（1-based，遵循HL7标准）
   * @returns 字段，不存在则返回 undefined
   */
  getField(index: number): HL7Field | undefined {
    // 内部存储是0-based，MSH段特殊处理
    if (this._segmentType === 'MSH') {
      if (index === 1) {
        // MSH-1 是字段分隔符，返回虚拟字段
        const f = new HL7Field();
        f.value = '|';
        return f;
      }
      // MSH-2 及以后，内部索引 = index - 2
      return this.fields[index - 2];
    }
    return this.fields[index - 1];
  }

  /**
   * 获取字段值
   *
   * @param index - 字段索引（1-based）
   * @param repetition - 重复索引（0-based）
   * @param component - 组件索引（0-based）
   * @returns 字段值字符串
   */
  getFieldValue(index: number, repetition = 0, component = 0): string {
    return this.getField(index)?.getComponent(repetition, component)?.value ?? '';
  }

  /**
   * 设置字段
   *
   * @param index - 字段索引（1-based）
   * @param field - 字段对象
   */
  setField(index: number, field: HL7Field): void {
    if (this._segmentType === 'MSH') {
      if (index < 2) return; // MSH-1, MSH-2 不允许直接设置
      const internalIndex = index - 2;
      while (this.fields.length <= internalIndex) {
        this.fields.push(new HL7Field());
      }
      this.fields[internalIndex] = field;
    } else {
      const internalIndex = index - 1;
      while (this.fields.length <= internalIndex) {
        this.fields.push(new HL7Field());
      }
      this.fields[internalIndex] = field;
    }
  }

  /**
   * 设置字段值
   *
   * @param index - 字段索引（1-based）
   * @param value - 值
   */
  setFieldValue(index: number, value: string): void {
    const field = new HL7Field(value);
    this.setField(index, field);
  }

  /**
   * 添加字段
   */
  addField(field: HL7Field): HL7Field {
    this.fields.push(field);
    return field;
  }

  /** 添加字段值 */
  addFieldValue(value: string): HL7Field {
    const field = new HL7Field(value);
    this.fields.push(field);
    return field;
  }

  /** 获取字段数量（不含段类型） */
  getFieldCount(): number {
    return this.fields.length;
  }

  /**
   * 转换为字符串
   *
   * @param fieldSeparator - 字段分隔符，默认 |
   * @param encoding - 编码字符
   * @returns 段字符串
   */
  toString(
    fieldSeparator = '|',
    encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS,
  ): string {
    const fieldStrings = this.fields.map((f) => f.toString(encoding));
    return `${this._segmentType}${fieldSeparator}${fieldStrings.join(fieldSeparator)}`;
  }

  /**
   * 从字符串解析段
   *
   * @param line - 段字符串（不含段分隔符 \r）
   * @param fieldSeparator - 字段分隔符
   * @param encoding - 编码字符
   */
  static parse(
    line: string,
    fieldSeparator = '|',
    encoding: HL7EncodingCharacters = DEFAULT_ENCODING_CHARACTERS,
  ): HL7Segment {
    const parts = line.split(fieldSeparator);
    const segmentType = parts[0];
    const segment = new HL7Segment(segmentType);

    // MSH段特殊处理：parts[0] 是段名 "MSH"，parts[1] 是编码字符(MSH-2)
    // 数据字段从 parts[1] 开始，对应 MSH-2，存储在 fields[0]
    let startIndex = 1;
    if (segmentType === 'MSH') {
      // MSH-1 (字段分隔符) 是虚拟字段，不存储在 fields 中
      // MSH-2 (编码字符) 存储在 fields[0]，MSH-3 存储在 fields[1]，以此类推
      startIndex = 1;
    }

    for (let i = startIndex; i < parts.length; i++) {
      segment.addField(HL7Field.parse(parts[i], encoding));
    }

    return segment;
  }
}

/**
 * HL7 消息（Message）
 *
 * 由多个段组成，第一个段必须是 MSH（消息头）。
 * 段之间用 \r（回车）分隔。
 */
export class HL7Message {
  /** 段列表 */
  private segments: HL7Segment[] = [];
  /** 字段分隔符（从MSH-1获取） */
  private _fieldSeparator = '|';
  /** 编码字符（从MSH-2获取） */
  private _encoding: HL7EncodingCharacters = { ...DEFAULT_ENCODING_CHARACTERS };

  constructor() {
    // 默认创建MSH段
    const msh = new HL7Segment('MSH');
    // MSH-2 编码字符
    msh.setFieldValue(2, '^~\\&');
    this.segments.push(msh);
  }

  /** 字段分隔符 */
  get fieldSeparator(): string {
    return this._fieldSeparator;
  }

  /** 编码字符 */
  get encoding(): HL7EncodingCharacters {
    return this._encoding;
  }

  /**
   * 获取MSH段
   */
  getMSH(): HL7Segment {
    return this.segments[0];
  }

  /**
   * 获取消息类型（MSH-9.1）
   */
  getMessageType(): string {
    return this.getMSH().getFieldValue(9, 0, 0);
  }

  /**
   * 获取触发事件（MSH-9.2）
   */
  getTriggerEvent(): string {
    return this.getMSH().getFieldValue(9, 0, 1);
  }

  /**
   * 获取消息控制ID（MSH-10）
   */
  getMessageControlId(): string {
    return this.getMSH().getFieldValue(10);
  }

  /**
   * 获取所有段
   */
  getSegments(): HL7Segment[] {
    return this.segments;
  }

  /**
   * 按段类型获取段列表
   *
   * @param segmentType - 段类型（如 PID、OBR、OBX）
   * @returns 匹配的段列表
   */
  getSegmentsByType(segmentType: string): HL7Segment[] {
    return this.segments.filter((s) => s.segmentType === segmentType);
  }

  /**
   * 获取第一个指定类型的段
   */
  getFirstSegment(segmentType: string): HL7Segment | undefined {
    return this.segments.find((s) => s.segmentType === segmentType);
  }

  /**
   * 添加段
   */
  addSegment(segment: HL7Segment): HL7Segment {
    this.segments.push(segment);
    return segment;
  }

  /**
   * 在指定位置插入段
   */
  insertSegment(index: number, segment: HL7Segment): void {
    if (index === 0) {
      // MSH段不能被替换
      this.segments.splice(1, 0, segment);
    } else {
      this.segments.splice(index, 0, segment);
    }
  }

  /** 获取段数量 */
  getSegmentCount(): number {
    return this.segments.length;
  }

  /**
   * 转换为HL7字符串
   *
   * @returns HL7消息字符串，段间用 \r 分隔
   */
  toString(): string {
    return this.segments.map((s) => s.toString(this._fieldSeparator, this._encoding)).join('\r');
  }

  /**
   * 从字符串解析HL7消息
   *
   * @param raw - HL7消息字符串
   * @returns 解析后的HL7消息
   * @throws 如果消息不以MSH开头
   */
  static parse(raw: string): HL7Message {
    // 规范化行尾：\r\n 和 \n 都转为 \r
    const normalized = raw.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
    const lines = normalized.split('\r').filter((l) => l.trim().length > 0);

    if (lines.length === 0) {
      throw new Error('HL7消息为空');
    }

    const firstLine = lines[0];
    if (!firstLine.startsWith('MSH')) {
      throw new Error(`HL7消息必须以MSH段开头，实际为: ${firstLine.substring(0, 10)}`);
    }

    // 解析字段分隔符（MSH后第一个字符）
    const fieldSeparator = firstLine.charAt(3);

    // 解析编码字符（MSH-2）
    const mshParts = firstLine.split(fieldSeparator);
    const encodingChars = mshParts[1] ?? '^~\\&';
    const encoding: HL7EncodingCharacters = {
      componentSeparator: encodingChars.charAt(0) || '^',
      repetitionSeparator: encodingChars.charAt(1) || '~',
      escapeCharacter: encodingChars.charAt(2) || '\\',
      subcomponentSeparator: encodingChars.charAt(3) || '&',
    };

    const message = new HL7Message();
    message._fieldSeparator = fieldSeparator;
    message._encoding = encoding;
    message.segments = []; // 清空默认MSH

    lines.forEach((line) => {
      const segment = HL7Segment.parse(line, fieldSeparator, encoding);
      message.segments.push(segment);
    });

    return message;
  }
}
