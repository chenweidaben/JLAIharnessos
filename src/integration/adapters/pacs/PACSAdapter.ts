/**
 * 健澜科技数智医院智能体 - integration/adapters/pacs/PACSAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - PACS适配器接口
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义PACS（影像归档和通信系统）统一适配器接口，支持影像检查申请、
 * 报告查询、DICOM影像获取和影像AI分析。
 *
 * @module integration/adapters/pacs/PACSAdapter
 */

import type { Unsubscribe } from '../../types';
import type { BaseAdapter } from '../BaseAdapter';

/** 影像检查类型 */
export type ImagingModality =
  | 'CT'
  | 'MRI'
  | 'DR'
  | 'CR'
  | 'US'
  | 'PET'
  | 'SPECT'
  | 'Mammography'
  | 'Fluoroscopy'
  | 'Angiography'
  | 'Other';

/** 检查状态 */
export type ImagingExamStatus =
  'scheduled' | 'in_progress' | 'completed' | 'reported' | 'cancelled';

/** 影像检查申请请求 */
export interface ImagingExamRequest {
  patientId: string;
  encounterId?: string;
  modality: ImagingModality;
  bodyPart: string;
  examName: string;
  examCode?: string;
  clinicalDiagnosis?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  contrastAgent?: string;
  orderedBy: string;
  orderedById: string;
  notes?: string;
}

/** 影像检查申请结果 */
export interface ImagingExamResult {
  examId: string;
  pacsExamId?: string;
  accessionNumber?: string;
  status: ImagingExamStatus;
  scheduledTime?: string;
  message?: string;
}

/** 影像报告 */
export interface ImagingReport {
  reportId: string;
  examId: string;
  pacsExamId?: string;
  accessionNumber?: string;
  patientId: string;
  encounterId?: string;
  modality: ImagingModality;
  bodyPart: string;
  examName: string;
  examDate: string;
  reportStatus: 'preliminary' | 'final' | 'amended';
  finding: string;
  impression: string;
  recommendation?: string;
  radiologist: string;
  radiologistId?: string;
  reportedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  keyImages?: {
    sopInstanceUid?: string;
    description?: string;
    thumbnailUrl?: string;
  }[];
  rawData?: string;
}

/** DICOM Study信息 */
export interface DicomStudy {
  studyInstanceUid: string;
  patientId: string;
  patientName: string;
  studyDate: string;
  studyTime?: string;
  studyDescription?: string;
  modalities: ImagingModality[];
  accessionNumber?: string;
  referringPhysician?: string;
  numberOfSeries: number;
  numberOfInstances: number;
}

/** DICOM Series信息 */
export interface DicomSeries {
  seriesInstanceUid: string;
  studyInstanceUid: string;
  modality: ImagingModality;
  seriesDescription?: string;
  seriesNumber?: number;
  numberOfInstances: number;
  bodyPart?: string;
  stationName?: string;
}

/** DICOM影像实例 */
export interface DicomInstance {
  sopInstanceUid: string;
  seriesInstanceUid: string;
  studyInstanceUid: string;
  instanceNumber?: number;
  rows?: number;
  columns?: number;
  bitsAllocated?: number;
  photometricInterpretation?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
}

/** AI分析任务状态 */
export type AIAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed';

/** AI分析请求 */
export interface AIAnalysisRequest {
  examId: string;
  studyInstanceUid?: string;
  analysisType: string; // 如 'lung_nodule', 'stroke', 'fracture', 'chest_xray'
  modelVersion?: string;
  priority?: 'routine' | 'urgent';
}

/** AI分析结果 */
export interface AIAnalysisResult {
  analysisId: string;
  examId: string;
  analysisType: string;
  status: AIAnalysisStatus;
  modelVersion?: string;
  findings?: {
    type: string;
    description: string;
    confidence: number;
    location?: string;
    severity?: 'mild' | 'moderate' | 'severe';
    coordinates?: { x: number; y: number; width: number; height: number };
  }[];
  summary?: string;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

/** 影像事件类型 */
export type ImagingEventType =
  'exam_scheduled' | 'exam_completed' | 'report_ready' | 'ai_analysis_ready';

/** 影像事件 */
export interface ImagingEvent {
  eventType: ImagingEventType;
  examId: string;
  patientId: string;
  encounterId?: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * PACS适配器接口
 *
 * 所有PACS系统适配器必须实现此接口。
 */
export interface PACSAdapter extends BaseAdapter {
  // === 影像检查申请 ===
  orderImagingExam(request: ImagingExamRequest): Promise<ImagingExamResult>;

  // === 影像报告查询 ===
  getImageReport(reportId: string): Promise<ImagingReport>;
  getReportList(
    patientId: string,
    encounterId?: string,
    modality?: ImagingModality,
    limit?: number,
  ): Promise<ImagingReport[]>;

  // === DICOM影像获取 ===
  getStudyList(
    patientId: string,
    modality?: ImagingModality,
    startDate?: string,
    endDate?: string,
  ): Promise<DicomStudy[]>;
  getDicomImage(
    studyInstanceUid: string,
    seriesInstanceUid?: string,
    instanceNumber?: number,
  ): Promise<DicomInstance[]>;

  // === 影像AI分析 ===
  triggerAIAnalysis(
    request: AIAnalysisRequest,
  ): Promise<{ analysisId: string; status: AIAnalysisStatus }>;
  getAIResult(analysisId: string): Promise<AIAnalysisResult>;

  // === 事件订阅 ===
  onImagingEvent(callback: (event: ImagingEvent) => void): Unsubscribe;

  // === DICOM C-MOVE / C-STORE / DICOMweb / Viewer ===
  /** C-MOVE：将 Study 从 PACS 拉取到指定 AE 节点 */
  retrieveStudy(studyInstanceUid: string, destinationAE?: string): Promise<{ transferred: number }>;
  /** C-STORE：向 PACS 存储 DICOM 实例 */
  storeInstance(file: unknown): Promise<{ sopInstanceUid: string }>;
  /** 获取影像查看器 URL（Cornerstone.js / OHIF Viewer 内嵌） */
  getViewerUrl(studyInstanceUid: string, viewer?: 'cornerstone' | 'ohif'): string;
}
