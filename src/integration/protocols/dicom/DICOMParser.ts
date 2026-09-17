/**
 * 健澜科技数智医院智能体 - integration/protocols/dicom/DICOMParser.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - DICOM 解析器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 解析 DICOM Part 10 文件的元数据：
 * - 文件头（128字节前导 + "DICM" 魔数）
 * - 数据集（Tag / VR / Length / Value）
 * - 支持显式 VR（Explicit VR Little Endian）与隐式 VR（Implicit VR Little Endian）
 *
 * 注意：本解析器仅提取元数据，不读取/解码像素数据（7FE0,0010）。
 *
 * @module integration/protocols/dicom/DICOMParser
 */

import {
  DICOM_TAGS,
  DICOM_VR,
  type DICOMDataElement,
  type DICOMMetadata,
  type DICOMTagDefinition,
} from './DICOMMetadata';

/** DICOM 魔数 */
const DICM_MAGIC = 'DICM';
/** 前导长度 */
const PREAMBLE_LENGTH = 128;

/** 需要按 64 位长度解析 VR 的集合（Explicit VR 长格式） */
const LONG_VR_SET: ReadonlySet<string> = new Set(['OB', 'OW', 'OF', 'OL', 'SQ', 'UT', 'UN']);

/** 像素数据标签（不解析其值） */
const PIXEL_DATA_TAG = '7FE00010';

/** 解析选项 */
export interface DICOMParserOptions {
  /** 强制显式 VR（默认自动检测） */
  forceExplicitVR?: boolean;
  /** 强制隐式 VR */
  forceImplicitVR?: boolean;
  /** 是否保留像素数据元素条目（默认跳过其值，仅记录存在） */
  includePixelDataElement?: boolean;
}

/** 解析结果 */
export interface DICOMParserResult {
  success: boolean;
  metadata?: DICOMMetadata;
  error?: string;
}

/**
 * DICOM 解析器
 *
 * 从 Buffer 解析 DICOM 文件元数据。
 *
 * @example
 * ```typescript
 * const parser = new DICOMParser();
 * const result = parser.parse(buffer);
 * if (result.success) {
 *   console.log(result.metadata?.patientName);
 * }
 * ```
 */
export class DICOMParser {
  private readonly options: Required<DICOMParserOptions>;

  constructor(options: DICOMParserOptions = {}) {
    this.options = {
      forceExplicitVR: options.forceExplicitVR ?? false,
      forceImplicitVR: options.forceImplicitVR ?? false,
      includePixelDataElement: options.includePixelDataElement ?? false,
    };
  }

  /**
   * 解析 DICOM Buffer
   *
   * @param buffer - DICOM 文件 Buffer
   * @param fileName - 可选文件名
   * @returns 解析结果
   */
  parse(buffer: Buffer, fileName?: string): DICOMParserResult {
    try {
      if (buffer.length < PREAMBLE_LENGTH + 4) {
        return { success: false, error: 'Buffer 过小，不是有效的 DICOM 文件' };
      }

      // 检查 DICM 魔数
      const magic = buffer.toString('ascii', PREAMBLE_LENGTH, PREAMBLE_LENGTH + 4);
      const isPart10 = magic === DICM_MAGIC;
      let offset = isPart10 ? PREAMBLE_LENGTH + 4 : 0;

      // 检测 VR 模式
      const explicitVR = this.detectVRMode(buffer, offset);

      const elements: DICOMDataElement[] = [];
      let transferSyntaxUID: string | undefined;
      let sopClassUID: string | undefined;
      let sopInstanceUID: string | undefined;

      // 遍历数据元素
      while (offset + 8 <= buffer.length) {
        const tag = this.readTag(buffer, offset);
        const tagHex = tag.toString(16).padStart(8, '0');
        offset += 4;

        // 读取 VR 与长度
        let vr: string;
        let valueLength: number;

        if (explicitVR) {
          vr = buffer.toString('ascii', offset, offset + 2);
          offset += 2;
          if (LONG_VR_SET.has(vr)) {
            offset += 2; // 保留字节
            valueLength = buffer.readUInt32LE(offset);
            offset += 4;
          } else {
            valueLength = buffer.readUInt16LE(offset);
            offset += 2;
          }
        } else {
          // 隐式 VR：长度直接为 4 字节
          valueLength = buffer.readUInt32LE(offset);
          offset += 4;
          vr = this.guessVRFromDictionary(tagHex);
        }

        // 像素数据：跳过值
        if (tagHex === PIXEL_DATA_TAG) {
          if (this.options.includePixelDataElement) {
            elements.push({
              tag: tagHex,
              vr,
              value: `<pixel data, ${valueLength} bytes>`,
              length: valueLength,
            });
          }
          break;
        }

        // 序列（SQ）：简化处理，跳过
        if (vr === 'SQ') {
          offset += valueLength;
          elements.push({ tag: tagHex, vr, value: '<sequence>', length: valueLength });
          continue;
        }

        // 越界保护
        if (offset + valueLength > buffer.length) {
          break;
        }

        const valueBuffer = buffer.subarray(offset, offset + valueLength);
        const value = this.decodeValue(vr, valueBuffer);
        offset += valueLength;

        const definition = this.findTagDefinition(tagHex);
        elements.push({ tag: tagHex, definition, vr, value, length: valueLength });

        // 提取关键 UID
        if (definition?.name === 'TransferSyntaxUID') transferSyntaxUID = value;
        if (definition?.name === 'SOPClassUID') sopClassUID = value;
        if (definition?.name === 'SOPInstanceUID') sopInstanceUID = value;
      }

      const metadata = this.buildMetadata({
        fileName,
        isPart10,
        explicitVR,
        transferSyntaxUID,
        sopClassUID,
        sopInstanceUID,
        elements,
      });

      return { success: true, metadata };
    } catch (error) {
      return {
        success: false,
        error: `DICOM 解析失败: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  // ============================================================
  // 内部方法
  // ============================================================

  /**
   * 读取标签（group + element 合并为一个整数）
   */
  private readTag(buffer: Buffer, offset: number): number {
    const group = buffer.readUInt16LE(offset);
    const element = buffer.readUInt16LE(offset + 2);
    return (group << 16) | element;
  }

  /**
   * 检测 VR 模式
   */
  private detectVRMode(buffer: Buffer, offset: number): boolean {
    if (this.options.forceExplicitVR) return true;
    if (this.options.forceImplicitVR) return false;

    // 读取第一个数据元素的 VR 字段（第5-6字节）
    if (offset + 8 > buffer.length) return true;
    const vrCandidate = buffer.toString('ascii', offset + 4, offset + 6);
    // 如果 VR 是合法的双字符字母，则视为显式 VR
    if (
      /^[A-Z]{2}$/.test(vrCandidate) &&
      (Object.values(DICOM_VR) as string[]).includes(vrCandidate)
    ) {
      return true;
    }
    return false;
  }

  /**
   * 从字典猜测 VR（隐式 VR 模式）
   */
  private guessVRFromDictionary(tagHex: string): string {
    const def = this.findTagDefinition(tagHex);
    return def?.vr ?? 'UN';
  }

  /**
   * 按 VR 解码值
   */
  private decodeValue(vr: string, valueBuffer: Buffer): string {
    const trimmed = valueBuffer.toString('utf8').replace(/\0+$/, '').trim();
    switch (vr) {
      case 'US':
        return valueBuffer.length >= 2 ? String(valueBuffer.readUInt16LE(0)) : trimmed;
      case 'SS':
        return valueBuffer.length >= 2 ? String(valueBuffer.readInt16LE(0)) : trimmed;
      case 'UL':
        return valueBuffer.length >= 4 ? String(valueBuffer.readUInt32LE(0)) : trimmed;
      case 'SL':
        return valueBuffer.length >= 4 ? String(valueBuffer.readInt32LE(0)) : trimmed;
      case 'FD':
        return valueBuffer.length >= 8 ? String(valueBuffer.readDoubleLE(0)) : trimmed;
      case 'FL':
        return valueBuffer.length >= 4 ? String(valueBuffer.readFloatLE(0)) : trimmed;
      default:
        return trimmed;
    }
  }

  /**
   * 在字典中查找标签定义
   */
  private findTagDefinition(tagHex: string): DICOMTagDefinition | undefined {
    const groupHex = tagHex.slice(0, 4);
    const elementHex = tagHex.slice(4);
    for (const def of Object.values(DICOM_TAGS)) {
      if (
        def.group.toString(16).padStart(4, '0') === groupHex &&
        def.element.toString(16).padStart(4, '0') === elementHex
      ) {
        return def;
      }
    }
    return undefined;
  }

  /**
   * 从数据元素构建 DICOMMetadata
   */
  private buildMetadata(partial: {
    fileName?: string;
    isPart10: boolean;
    explicitVR: boolean;
    transferSyntaxUID?: string;
    sopClassUID?: string;
    sopInstanceUID?: string;
    elements: DICOMDataElement[];
  }): DICOMMetadata {
    const get = (name: string): string | undefined =>
      partial.elements.find((e) => e.definition?.name === name)?.value;

    const getNum = (name: string): number | undefined => {
      const v = get(name);
      return v !== undefined ? Number(v) : undefined;
    };

    return {
      fileName: partial.fileName,
      isPart10: partial.isPart10,
      explicitVR: partial.explicitVR,
      transferSyntaxUID: partial.transferSyntaxUID,
      sopClassUID: partial.sopClassUID,
      sopInstanceUID: partial.sopInstanceUID,
      patientName: get('PatientName'),
      patientID: get('PatientID'),
      patientBirthDate: get('PatientBirthDate'),
      patientSex: get('PatientSex'),
      studyInstanceUID: get('StudyInstanceUID'),
      seriesInstanceUID: get('SeriesInstanceUID'),
      studyDate: get('StudyDate'),
      modality: get('Modality'),
      bodyPartExamined: get('BodyPartExamined'),
      seriesNumber: getNum('SeriesNumber'),
      instanceNumber: getNum('InstanceNumber'),
      rows: getNum('Rows'),
      columns: getNum('Columns'),
      elements: partial.elements,
    };
  }
}
