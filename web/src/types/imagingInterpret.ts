/**
 * 健澜科技 jlmedaios - 影像报告 AI 智能解读前端类型（M12-A）
 *
 * 一个已发布影像报告 × 一个视角一行；AI 仅辅助，须医师签名后生效。
 * 三态来源与检验解读一致（deepSource / llmStatus），未配置 LLM 时明确降级标注。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  DeepSource,
  InterpretAudience,
  LabInterpStatus,
  LabRecommendation,
  LlmStatus,
} from './labInterpret';

/** 逐项影像所见解释 */
export interface ImagingFindingExplanation {
  finding: string;
  explanation: string;
}

export interface ImagingInterpretation {
  id: string;
  reportId: string;
  visitId: string;
  patientId: string;
  department: string;
  /** 视角（doctor/patient） */
  audience: InterpretAudience;

  modality: string | null;
  examName: string | null;
  bodyPart: string | null;

  /** 逐项影像所见解释 */
  explainedFindings: ImagingFindingExplanation[];
  /** 可能方向（医生端，非诊断） */
  overallDirection: string | null;
  /** 患者端通俗总结 */
  plainLanguageSummary: string | null;
  /** 分级建议 */
  recommendations: LabRecommendation[];

  deepSource: DeepSource;
  model: string | null;
  llmStatus: LlmStatus;

  status: LabInterpStatus;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;
}

export interface ImagingInterpQueueItem {
  id: string;
  reportId: string;
  patientName: string;
  department: string;
  modality: string | null;
  examName: string | null;
  status: LabInterpStatus;
  updatedAt: string;
}
