/**
 * 健澜科技数智医院智能体 - integration/protocols/dicom/DICOMMetadata.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - DICOM 元数据模型
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义 DICOM 标签、数据字典、模态与元数据模型。
 * 本模块仅处理 DICOM 元数据，不解析像素数据。
 *
 * @module integration/protocols/dicom/DICOMMetadata
 */

/**
 * DICOM 标签（Group, Element）
 *
 * 标签以 (gggg, eeee) 形式表示，如患者ID为 (0010, 0020)。
 */
export interface DICOMTag {
  /** 组号（十六进制） */
  group: number;
  /** 元素号（十六进制） */
  element: number;
}

/**
 * DICOM 标签定义
 */
export interface DICOMTagDefinition extends DICOMTag {
  /** 标签名称（如 PatientID） */
  name: string;
  /** 值表示法 VR（如 LO、PN、UI、DS、IS） */
  vr: string;
  /** 描述 */
  description?: string;
}

/**
 * DICOM 值表示法（Value Representation）
 *
 * 参考 DICOM PS3.5 第6章。
 */
export const DICOM_VR = {
  /** Application Entity Title */
  AE: 'AE',
  /** Age String */
  AS: 'AS',
  /** Attribute Tag */
  AT: 'AT',
  /** Code String */
  CS: 'CS',
  /** Date */
  DA: 'DA',
  /** Decimal String */
  DS: 'DS',
  /** Date Time */
  DT: 'DT',
  /** Floating Point Single */
  FL: 'FL',
  /** Floating Point Double */
  FD: 'FD',
  /** Integer String */
  IS: 'IS',
  /** Long String */
  LO: 'LO',
  /** Long Text */
  LT: 'LT',
  /** Other Byte */
  OB: 'OB',
  /** Other Float */
  OF: 'OF',
  /** Other Word */
  OW: 'OW',
  /** Person Name */
  PN: 'PN',
  /** Short String */
  SH: 'SH',
  /** Signed Long */
  SL: 'SL',
  /** Sequence of Items */
  SQ: 'SQ',
  /** Signed Short */
  SS: 'SS',
  /** Time */
  TM: 'TM',
  /** Unique Identifier */
  UI: 'UI',
  /** Unsigned Long */
  UL: 'UL',
  /** Unknown */
  UN: 'UN',
  /** Unsigned Short */
  US: 'US',
} as const;

/**
 * DICOM 常用数据字典标签
 *
 * 覆盖患者、研究、序列、实例四大模块的核心标签。
 */
export const DICOM_TAGS: Record<string, DICOMTagDefinition> = {
  // === 患者模块 ===
  PatientName: {
    group: 0x0010,
    element: 0x0010,
    name: 'PatientName',
    vr: 'PN',
    description: '患者姓名',
  },
  PatientID: { group: 0x0010, element: 0x0020, name: 'PatientID', vr: 'LO', description: '患者ID' },
  PatientBirthDate: {
    group: 0x0010,
    element: 0x0030,
    name: 'PatientBirthDate',
    vr: 'DA',
    description: '出生日期',
  },
  PatientSex: {
    group: 0x0010,
    element: 0x0040,
    name: 'PatientSex',
    vr: 'CS',
    description: '性别 M/F/O',
  },
  PatientAge: { group: 0x0010, element: 0x1010, name: 'PatientAge', vr: 'AS', description: '年龄' },

  // === 研究模块 ===
  StudyInstanceUID: {
    group: 0x0020,
    element: 0x000d,
    name: 'StudyInstanceUID',
    vr: 'UI',
    description: '研究实例UID',
  },
  StudyDate: {
    group: 0x0008,
    element: 0x0020,
    name: 'StudyDate',
    vr: 'DA',
    description: '研究日期',
  },
  StudyTime: {
    group: 0x0008,
    element: 0x0030,
    name: 'StudyTime',
    vr: 'TM',
    description: '研究时间',
  },
  StudyDescription: {
    group: 0x0008,
    element: 0x1030,
    name: 'StudyDescription',
    vr: 'LO',
    description: '研究描述',
  },
  AccessionNumber: {
    group: 0x0008,
    element: 0x0050,
    name: 'AccessionNumber',
    vr: 'SH',
    description: '检查号',
  },
  ReferringPhysicianName: {
    group: 0x0008,
    element: 0x0090,
    name: 'ReferringPhysicianName',
    vr: 'PN',
    description: '申请医生',
  },
  StudyID: { group: 0x0020, element: 0x0010, name: 'StudyID', vr: 'SH', description: '研究ID' },
  NumberOfStudyRelatedSeries: {
    group: 0x0020,
    element: 0x1206,
    name: 'NumberOfStudyRelatedSeries',
    vr: 'IS',
    description: '相关序列数',
  },
  NumberOfStudyRelatedInstances: {
    group: 0x0020,
    element: 0x1208,
    name: 'NumberOfStudyRelatedInstances',
    vr: 'IS',
    description: '相关实例数',
  },

  // === 序列模块 ===
  SeriesInstanceUID: {
    group: 0x0020,
    element: 0x000e,
    name: 'SeriesInstanceUID',
    vr: 'UI',
    description: '序列实例UID',
  },
  SeriesNumber: {
    group: 0x0020,
    element: 0x0011,
    name: 'SeriesNumber',
    vr: 'IS',
    description: '序列号',
  },
  SeriesDescription: {
    group: 0x0008,
    element: 0x103e,
    name: 'SeriesDescription',
    vr: 'LO',
    description: '序列描述',
  },
  Modality: { group: 0x0008, element: 0x0060, name: 'Modality', vr: 'CS', description: '模态' },
  BodyPartExamined: {
    group: 0x0018,
    element: 0x0015,
    name: 'BodyPartExamined',
    vr: 'CS',
    description: '检查部位',
  },
  StationName: {
    group: 0x0008,
    element: 0x1010,
    name: 'StationName',
    vr: 'SH',
    description: '设备名称',
  },
  NumberOfSeriesRelatedInstances: {
    group: 0x0020,
    element: 0x1209,
    name: 'NumberOfSeriesRelatedInstances',
    vr: 'IS',
    description: '相关实例数',
  },

  // === 实例模块 ===
  SOPInstanceUID: {
    group: 0x0008,
    element: 0x0018,
    name: 'SOPInstanceUID',
    vr: 'UI',
    description: 'SOP实例UID',
  },
  SOPClassUID: {
    group: 0x0008,
    element: 0x0016,
    name: 'SOPClassUID',
    vr: 'UI',
    description: 'SOP类UID',
  },
  InstanceNumber: {
    group: 0x0020,
    element: 0x0013,
    name: 'InstanceNumber',
    vr: 'IS',
    description: '实例号',
  },
  Rows: { group: 0x0028, element: 0x0010, name: 'Rows', vr: 'US', description: '图像行数' },
  Columns: { group: 0x0028, element: 0x0011, name: 'Columns', vr: 'US', description: '图像列数' },
  BitsAllocated: {
    group: 0x0028,
    element: 0x0100,
    name: 'BitsAllocated',
    vr: 'US',
    description: '分配位数',
  },
  PhotometricInterpretation: {
    group: 0x0028,
    element: 0x0004,
    name: 'PhotometricInterpretation',
    vr: 'CS',
    description: '光度解释',
  },
};

/**
 * 模态定义（Modality）
 */
export type DICOMModality =
  | 'CT'
  | 'MR'
  | 'US'
  | 'XA'
  | 'CR'
  | 'DR'
  | 'DX'
  | 'MG'
  | 'NM'
  | 'PT'
  | 'SR'
  | 'SC'
  | 'OT'
  | 'ES'
  | 'RF'
  | 'RG'
  | 'CP'
  // 使用 (string & {}) 保留上述已知模态的编辑器自动补全，同时允许任意厂商扩展的模态码
  | (string & {});

/**
 * 模态中文名映射
 */
export const MODALITY_NAMES: Record<string, string> = {
  CT: '计算机断层扫描',
  MR: '磁共振成像',
  US: '超声',
  XA: 'X射线血管造影',
  CR: '计算机X线摄影',
  DR: '数字X线摄影',
  DX: '数字X线成像',
  MG: '乳腺摄影',
  NM: '核医学',
  PT: '正电子发射断层',
  SR: '结构化报告',
  RF: 'X射线透视',
};

/**
 * DICOM 数据集条目
 */
export interface DICOMDataElement {
  /** 标签（十六进制字符串，如 "00100020"） */
  tag: string;
  /** 标签定义（如字典命中） */
  definition?: DICOMTagDefinition;
  /** 值表示法 */
  vr: string;
  /** 值（字符串形式，像素数据除外） */
  value: string;
  /** 值长度 */
  length: number;
}

/**
 * DICOM 元数据（解析结果）
 *
 * 不包含像素数据（PixelData，7FE0,0010）。
 */
export interface DICOMMetadata {
  /** 源文件名 */
  fileName?: string;
  /** 是否为 DICOM Part 10 文件 */
  isPart10: boolean;
  /** 是否显式 VR */
  explicitVR: boolean;
  /** 传输语法 UID */
  transferSyntaxUID?: string;
  /** SOP Class UID */
  sopClassUID?: string;
  /** SOP Instance UID */
  sopInstanceUID?: string;
  /** 患者姓名 */
  patientName?: string;
  /** 患者ID */
  patientID?: string;
  /** 出生日期 */
  patientBirthDate?: string;
  /** 性别 */
  patientSex?: string;
  /** Study Instance UID */
  studyInstanceUID?: string;
  /** Series Instance UID */
  seriesInstanceUID?: string;
  /** 研究日期 */
  studyDate?: string;
  /** 模态 */
  modality?: string;
  /** 检查部位 */
  bodyPartExamined?: string;
  /** 序列数 */
  seriesNumber?: number;
  /** 实例数 */
  instanceNumber?: number;
  /** 图像行 */
  rows?: number;
  /** 图像列 */
  columns?: number;
  /** 所有数据元素 */
  elements: DICOMDataElement[];
}

/**
 * DICOM 元数据序列化工具
 */
export class DICOMMetadataSerializer {
  /**
   * 序列化为 JSON 对象
   *
   * @param metadata - DICOM 元数据
   * @returns 可序列化对象
   */
  static toJSON(metadata: DICOMMetadata): Record<string, unknown> {
    return { ...metadata };
  }

  /**
   * 序列化为可读的键值对文本
   *
   * @param metadata - DICOM 元数据
   * @returns 键值对文本
   */
  static toText(metadata: DICOMMetadata): string {
    const lines: string[] = [];
    for (const el of metadata.elements) {
      const name = el.definition?.name ?? el.tag;
      lines.push(`(${el.tag.slice(0, 4)},${el.tag.slice(4)}) ${name} [${el.vr}] = ${el.value}`);
    }
    return lines.join('\n');
  }
}
