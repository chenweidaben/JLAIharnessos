/**
 * 健澜科技数智医院智能体 - DICOM 元数据解析单元测试
 *
 * 版权所有 (c) 2026 健澜科技
 */

import { describe, it, expect } from 'bun:test';
import {
  DICOMParser,
  DICOMWebClient,
  DICOM_TAGS,
  MODALITY_NAMES,
} from '../../../src/integration/protocols/dicom';

/** 构造一个显式 VR Little Endian 的 DICOM 元素 */
function makeElement(group: number, element: number, vr: string, value: string): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt16LE(group, 0);
  head.writeUInt16LE(element, 2);
  head.write(vr, 4, 'ascii');
  const valueBuf = Buffer.from(value, 'utf8');
  head.writeUInt16LE(valueBuf.length, 6);
  return Buffer.concat([head, valueBuf]);
}

/** 构造完整 DICOM Part10 缓冲区 */
function buildDicomBuffer(elements: Buffer[]): Buffer {
  const preamble = Buffer.alloc(128);
  const magic = Buffer.from('DICM', 'ascii');
  return Buffer.concat([preamble, magic, ...elements]);
}

describe('DICOM_TAGS', () => {
  it('应包含核心标签定义', () => {
    expect(DICOM_TAGS.PatientID.name).toBe('PatientID');
    expect(DICOM_TAGS.StudyInstanceUID.vr).toBe('UI');
    expect(DICOM_TAGS.Modality.vr).toBe('CS');
  });

  it('应包含模态中文名', () => {
    expect(MODALITY_NAMES.CT).toContain('断层');
    expect(MODALITY_NAMES.MR).toBeTruthy();
  });
});

describe('DICOMParser', () => {
  it('应解析 DICOM Part10 元数据', () => {
    const buf = buildDicomBuffer([
      makeElement(0x0010, 0x0010, 'PN', 'Zhang^San'),
      makeElement(0x0010, 0x0020, 'LO', 'P20240001'),
      makeElement(0x0010, 0x0040, 'CS', 'M'),
      makeElement(0x0020, 0x000d, 'UI', '1.2.3.4.5'),
      makeElement(0x0020, 0x000e, 'UI', '1.2.3.4.6'),
      makeElement(0x0008, 0x0060, 'CS', 'CT'),
      makeElement(0x0008, 0x0020, 'DA', '20240615'),
    ]);
    const parser = new DICOMParser();
    const result = parser.parse(buf, 'test.dcm');
    expect(result.success).toBe(true);
    expect(result.metadata?.isPart10).toBe(true);
    expect(result.metadata?.patientName).toBe('Zhang^San');
    expect(result.metadata?.patientID).toBe('P20240001');
    expect(result.metadata?.modality).toBe('CT');
    expect(result.metadata?.studyInstanceUID).toBe('1.2.3.4.5');
    expect(result.metadata?.patientSex).toBe('M');
  });

  it('应跳过像素数据元素', () => {
    // 构造像素数据元素 (7FE0,0010)，长VR格式（OB + 2保留 + 4字节长度）
    const pixel = Buffer.alloc(12);
    pixel.writeUInt16LE(0x7fe0, 0);
    pixel.writeUInt16LE(0x0010, 2);
    pixel.write('OB', 4, 'ascii');
    pixel.writeUInt32LE(0, 8); // 长度0
    const buf = buildDicomBuffer([makeElement(0x0010, 0x0020, 'LO', 'P1'), pixel]);
    const parser = new DICOMParser();
    const result = parser.parse(buf);
    expect(result.success).toBe(true);
    expect(result.metadata?.patientID).toBe('P1');
  });

  it('应拒绝非 DICOM 文件', () => {
    const parser = new DICOMParser();
    const result = parser.parse(Buffer.from('not a dicom file at all.....................'));
    expect(result.success).toBe(false);
  });
});

describe('DICOMWebClient', () => {
  it('应构造 QIDO/WADO/STOW 路径', () => {
    const client = new DICOMWebClient({ baseUrl: 'https://orthanc/dicom-web' });
    expect(client.getInstanceUrl('1.2.3', '1.2.4', '1.2.5')).toContain('/studies/1.2.3/series/1.2.4/instances/1.2.5');
  });
});
