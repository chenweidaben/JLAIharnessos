/**
 * 健澜科技数智医院智能体 - 查看DICOM影像元数据工具
 *
 * 工具名：view_dicom
 * 功能：查看DICOM影像元数据（Study/Series列表、模态、部位、关键标注），不处理真实影像像素
 * 风险等级：low（只读元数据）
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

import { z } from 'zod';

import { buildMedicalTool } from '../framework.js';
import { getPACSAdapter } from '../integration/adapterBridge.js';
import type { MedicalToolContext, ToolResult } from '../types.js';
import { MedicalToolCategory } from '../types.js';

// ============================================================================
// 内置 DICOM Study 元数据（胸部CT肺结节 / 头颅MRI脑梗死）
// ============================================================================

interface DicomSeriesMeta {
  seriesInstanceUid: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  numberOfImages: number;
}

interface DicomStudyMeta {
  studyInstanceUid: string;
  patientId: string;
  studyDate: string;
  studyDescription: string;
  modality: string;
  bodyPart: string;
  accessionNumber: string;
  referringPhysician: string;
  seriesList: DicomSeriesMeta[];
  reportSummary: string;
  keyAnnotations: {
    location: string;
    finding: string;
    confidence: number;
  }[];
}

/** 内置 DICOM Study 元数据（虚构数据） */
const MOCK_DICOM_STUDIES: DicomStudyMeta[] = [
  {
    studyInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.198',
    patientId: 'P2026090002',
    studyDate: '2026-09-10',
    studyDescription: '胸部高分辨率CT平扫',
    modality: 'CT',
    bodyPart: '胸部',
    accessionNumber: 'ACC20260910002',
    referringPhysician: '陈医生',
    seriesList: [
      {
        seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.199',
        seriesNumber: 1,
        seriesDescription: '胸部轴位薄层（肺窗）',
        modality: 'CT',
        numberOfImages: 320,
      },
      {
        seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.200',
        seriesNumber: 2,
        seriesDescription: '胸部轴位薄层（纵隔窗）',
        modality: 'CT',
        numberOfImages: 320,
      },
    ],
    reportSummary:
      '双肺透亮度增高（肺气肿），右下肺后基底段斑片影4.5×3.2cm伴支气管充气征，提示炎症；肺动脉主干增宽。',
    keyAnnotations: [
      { location: '右肺下叶后基底段', finding: '斑片影4.5×3.2cm，支气管充气征', confidence: 0.96 },
      { location: '双肺弥漫', finding: '肺气肿改变', confidence: 0.9 },
    ],
  },
  {
    studyInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.301',
    patientId: 'P2026090005',
    studyDate: '2026-09-14',
    studyDescription: '头颅MRI平扫+DWI',
    modality: 'MRI',
    bodyPart: '头颅',
    accessionNumber: 'ACC20260914006',
    referringPhysician: '周主任',
    seriesList: [
      {
        seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.302',
        seriesNumber: 1,
        seriesDescription: 'DWI弥散加权',
        modality: 'MRI',
        numberOfImages: 24,
      },
      {
        seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.303',
        seriesNumber: 2,
        seriesDescription: 'ADC表观弥散系数',
        modality: 'MRI',
        numberOfImages: 24,
      },
      {
        seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.304',
        seriesNumber: 3,
        seriesDescription: 'MRA脑血管成像',
        modality: 'MRA',
        numberOfImages: 60,
      },
    ],
    reportSummary:
      '左侧基底节区及侧脑室旁DWI高信号、ADC低信号，范围3.5×2.0cm，提示急性脑梗死；左侧大脑中动脉M1段狭窄约70%。',
    keyAnnotations: [
      { location: '左侧基底节区', finding: '急性梗死灶3.5×2.0cm（DWI高信号）', confidence: 0.97 },
      { location: '左侧大脑中动脉M1段', finding: '管腔狭窄约70%', confidence: 0.88 },
    ],
  },
];

// ============================================================================
// 输入/输出 Schema
// ============================================================================

const ViewDicomInput = z.object({
  patientId: z.string().describe('患者ID'),
  studyInstanceUid: z.string().optional().describe('Study Instance UID（指定检查）'),
  seriesInstanceUid: z.string().optional().describe('Series Instance UID（指定序列）'),
  examId: z.string().optional().describe('检查号（备选定位）'),
});

const ViewDicomOutput = z.object({
  success: z.boolean(),
  patientId: z.string(),
  studies: z.array(
    z.object({
      studyInstanceUid: z.string(),
      studyDate: z.string(),
      studyDescription: z.string(),
      modality: z.string(),
      bodyPart: z.string(),
      accessionNumber: z.string(),
      seriesList: z.array(
        z.object({
          seriesInstanceUid: z.string(),
          seriesNumber: z.number(),
          seriesDescription: z.string(),
          modality: z.string(),
          numberOfImages: z.number(),
        }),
      ),
      totalImages: z.number(),
      reportSummary: z.string(),
      keyAnnotations: z.array(
        z.object({
          location: z.string(),
          finding: z.string(),
          confidence: z.number(),
        }),
      ),
    }),
  ),
  note: z.string().describe('说明：本工具仅返回DICOM元数据，不传输真实影像像素数据'),
  source: z.string(),
});

// ============================================================================
// 工具实现
// ============================================================================

/**
 * 查看DICOM影像元数据
 *
 * 仅返回 Study/Series 元数据、影像数量、模态、检查部位、报告摘要与AI关键标注，
 * 不处理真实 DICOM 像素文件。优先尝试 PACS 适配器，不可用时使用内置元数据。
 *
 * @param input - 查询参数
 * @param context - 工具执行上下文
 * @returns DICOM 元数据
 */
async function executeViewDicom(
  input: unknown,
  _context: MedicalToolContext,
): Promise<ToolResult<unknown>> {
  const parsed = ViewDicomInput.parse(input);

  let results = MOCK_DICOM_STUDIES.filter((s) => s.patientId === parsed.patientId);
  let source = 'mock';

  // 优先尝试 PACS 适配器
  try {
    const adapter = await getPACSAdapter();
    if (adapter) {
      try {
        const adapterStudies = await adapter.getStudyList(parsed.patientId);
        if (adapterStudies.length > 0) {
          source = 'adapter';
          return {
            success: true,
            data: {
              success: true,
              patientId: parsed.patientId,
              studies: adapterStudies.map((s) => ({
                studyInstanceUid: s.studyInstanceUid,
                studyDate: s.studyDate,
                studyDescription: s.studyDescription ?? 'PACS检查',
                modality: s.modalities.join('/'),
                bodyPart: '未知（PACS元数据未提供部位）',
                accessionNumber: s.accessionNumber ?? '',
                seriesList: [],
                totalImages: s.numberOfInstances,
                reportSummary: 'PACS适配器元数据（详见影像报告）',
                keyAnnotations: [],
              })),
              note: '本工具仅返回DICOM元数据，不传输真实影像像素数据',
              source,
            },
          };
        }
      } catch {
        // 适配器无此患者，使用内置元数据
      }
    }
  } catch {
    // 适配器不可用
  }

  // 按 studyInstanceUid / examId 进一步筛选
  if (parsed.studyInstanceUid) {
    results = results.filter((s) => s.studyInstanceUid === parsed.studyInstanceUid);
  }
  if (parsed.examId) {
    results = results.filter((s) => s.accessionNumber === parsed.examId);
  }

  // 若无匹配，返回该患者全部 Study
  if (results.length === 0) {
    results = MOCK_DICOM_STUDIES.filter((s) => s.patientId === parsed.patientId);
  }
  // 仍无则返回全部内置 Study（演示用）
  if (results.length === 0) {
    results = MOCK_DICOM_STUDIES;
  }

  return {
    success: true,
    data: {
      success: true,
      patientId: parsed.patientId,
      studies: results.map((s) => ({
        studyInstanceUid: s.studyInstanceUid,
        studyDate: s.studyDate,
        studyDescription: s.studyDescription,
        modality: s.modality,
        bodyPart: s.bodyPart,
        accessionNumber: s.accessionNumber,
        seriesList: s.seriesList,
        totalImages: s.seriesList.reduce((sum, ser) => sum + ser.numberOfImages, 0),
        reportSummary: s.reportSummary,
        keyAnnotations: s.keyAnnotations,
      })),
      note: '本工具仅返回DICOM元数据（Study/Series列表、模态、关键标注），不传输真实影像像素数据；影像浏览请通过医院PACS工作站',
      source,
    },
  };
}

// ============================================================================
// 工具导出
// ============================================================================

export const viewDicomTool = buildMedicalTool({
  name: 'view_dicom',
  description:
    '查看患者DICOM影像元数据（Study/Series列表、影像数量、模态、检查部位、检查时间、报告摘要、关键影像标注），含胸部CT（肺结节/肺炎）与头颅MRI（脑梗死）。本工具仅返回元数据，不处理真实影像像素文件。优先调用PACS适配器。',
  category: MedicalToolCategory.IMAGING,
  riskLevel: 'low',
  requiresAuth: true,
  requiresConfirm: false,
  requiredPermissions: ['imaging:read'],
  inputSchema: ViewDicomInput,
  outputSchema: ViewDicomOutput,
  execute: executeViewDicom,
  isReadOnly: () => true,
  isConcurrencySafe: () => true,
  userFacingName: () => '查看DICOM影像',
  getActivityDescription: (input: unknown) => {
    const parsed = ViewDicomInput.safeParse(input);
    if (parsed.success) {
      return `查看DICOM元数据: 患者${parsed.data.patientId}`;
    }
    return '查看DICOM影像';
  },
});

export type ViewDicomInputType = z.infer<typeof ViewDicomInput>;
export type ViewDicomOutputType = z.infer<typeof ViewDicomOutput>;
