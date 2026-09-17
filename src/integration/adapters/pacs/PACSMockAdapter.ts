/**
 * 健澜科技数智医院智能体 - integration/adapters/pacs/PACSMockAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - PACS Mock适配器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现PACSAdapter接口，返回模拟影像报告数据（CT、MRI、DR等）。
 *
 * @module integration/adapters/pacs/PACSMockAdapter
 */

import type { AdapterMetadata, Unsubscribe } from '../../types';
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError, AdapterErrorCode } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import type {
  AIAnalysisRequest,
  AIAnalysisResult,
  AIAnalysisStatus,
  DicomInstance,
  DicomSeries,
  DicomStudy,
  ImagingEvent,
  ImagingExamRequest,
  ImagingExamResult,
  ImagingModality,
  ImagingReport,
  PACSAdapter,
} from './PACSAdapter';

/**
 * PACS Mock适配器
 */
export class PACSMockAdapter extends BaseAdapter implements PACSAdapter {
  private reports = new Map<string, ImagingReport>();
  private studies = new Map<string, DicomStudy>();
  private series = new Map<string, DicomSeries>();
  private aiResults = new Map<string, AIAnalysisResult>();
  private imagingEventListeners = new Set<(event: ImagingEvent) => void>();
  private examCounter = 0;
  private aiCounter = 1; // AI000001已作为种子数据，新分析从AI000002开始

  constructor() {
    const config = createDefaultAdapterConfig({
      id: 'pacs-mock',
      type: 'pacs',
      vendor: 'mock',
      version: '1.0.0',
      name: 'PACS Mock适配器',
      endpoint: 'mock://pacs',
      timeout: 5000,
    });
    super(config);
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'pacs',
      vendor: 'mock',
      version: '1.0.0',
      name: 'PACS Mock适配器',
      description: '模拟PACS系统，返回CT、MRI、DR等影像报告数据',
      supportedProtocols: ['mock', 'dicom'],
    };
  }

  protected override async onInit(): Promise<void> {
    this.seedMockData();
  }

  private seedMockData(): void {
    // 胸部CT报告
    this.reports.set('IMG000001', {
      reportId: 'IMG000001',
      examId: 'EXAM001',
      pacsExamId: 'PACS001',
      accessionNumber: 'ACC202406001',
      patientId: 'P20240001',
      encounterId: 'E202400011',
      modality: 'CT',
      bodyPart: '胸部',
      examName: '胸部CT平扫',
      examDate: '2024-06-15T10:00:00Z',
      reportStatus: 'final',
      finding:
        '双肺纹理清晰，右肺上叶见一磨玻璃结节影，大小约8mm×6mm，边界尚清，未见明显分叶及毛刺征。双肺门不大，纵隔居中，心影大小形态正常，纵隔内未见明显肿大淋巴结。双侧胸膜未见增厚，胸腔未见积液。胸廓骨质未见异常。',
      impression: '右肺上叶磨玻璃结节，建议3-6个月复查胸部CT。',
      recommendation: '建议3-6个月后复查胸部高分辨率CT，观察结节变化。',
      radiologist: '陈医生',
      radiologistId: 'DOC002',
      reportedAt: '2024-06-15T14:30:00Z',
      reviewedBy: '李主任',
      reviewedAt: '2024-06-15T15:00:00Z',
    });

    // 头颅MRI报告
    this.reports.set('IMG000002', {
      reportId: 'IMG000002',
      examId: 'EXAM002',
      pacsExamId: 'PACS002',
      accessionNumber: 'ACC202407001',
      patientId: 'P20240003',
      encounterId: 'E202400031',
      modality: 'MRI',
      bodyPart: '头颅',
      examName: '头颅MRI平扫+DWI',
      examDate: '2024-07-10T09:00:00Z',
      reportStatus: 'final',
      finding:
        '左侧基底节区见片状长T1长T2信号影，DWI呈高信号，ADC呈低信号，范围约15mm×10mm，边界尚清。右侧大脑半球未见明显异常信号。脑室系统大小形态正常，脑沟脑裂未见增宽，中线结构居中。脑干及小脑未见明显异常。',
      impression: '左侧基底节区急性脑梗死。',
      recommendation: '建议立即神经内科会诊，按急性脑卒中流程处理。',
      radiologist: '王医生',
      radiologistId: 'DOC003',
      reportedAt: '2024-07-10T10:30:00Z',
      reviewedBy: '李主任',
      reviewedAt: '2024-07-10T11:00:00Z',
    });

    // 胸部DR报告
    this.reports.set('IMG000003', {
      reportId: 'IMG000003',
      examId: 'EXAM003',
      pacsExamId: 'PACS003',
      accessionNumber: 'ACC202407002',
      patientId: 'P20240002',
      encounterId: 'E202400021',
      modality: 'DR',
      bodyPart: '胸部',
      examName: '胸部正位片',
      examDate: '2024-07-20T10:00:00Z',
      reportStatus: 'final',
      finding:
        '双肺纹理增多增粗，右肺中下野见斑片状模糊影，密度不均。双肺门影增浓。心影大小形态正常，纵隔居中。双侧膈面光滑，肋膈角锐利。胸廓对称，骨质未见异常。',
      impression: '右肺中下野炎症，建议治疗后复查。',
      radiologist: '陈医生',
      reportedAt: '2024-07-20T11:00:00Z',
    });

    // 胸部CT报告（肺结节）
    this.reports.set('IMG000004', {
      reportId: 'IMG000004',
      examId: 'EXAM004',
      pacsExamId: 'PACS004',
      accessionNumber: 'ACC202408001',
      patientId: 'P20240005',
      encounterId: 'E202400051',
      modality: 'CT',
      bodyPart: '胸部',
      examName: '胸部CT平扫（低剂量筛查）',
      examDate: '2024-08-05T09:30:00Z',
      reportStatus: 'final',
      finding:
        '右肺上叶尖段见一直径约6.5mm磨玻璃结节，边界清，密度不均。左肺下叶见一直径约3.2mm实性小结节。双肺纹理清晰，未见明显实变影。气管支气管通畅，纵隔内未见肿大淋巴结。心影大小形态正常。',
      impression: '右肺上叶磨玻璃结节（LU-RADS 3类），左肺下叶微小结节，建议6个月随访。',
      recommendation: '建议6个月后胸部CT低剂量随访，观察结节变化。',
      radiologist: '陈医生',
      radiologistId: 'DOC003',
      reportedAt: '2024-08-05T10:30:00Z',
      reviewedBy: '李主任',
      reviewedAt: '2024-08-05T11:00:00Z',
    });

    // 腹部CT报告
    this.reports.set('IMG000005', {
      reportId: 'IMG000005',
      examId: 'EXAM005',
      pacsExamId: 'PACS005',
      accessionNumber: 'ACC202408002',
      patientId: 'P20240002',
      encounterId: 'E202400021',
      modality: 'CT',
      bodyPart: '腹部',
      examName: '全腹部CT平扫',
      examDate: '2024-08-12T14:00:00Z',
      reportStatus: 'preliminary',
      finding:
        '肝脏大小形态正常，肝实质密度均匀，未见异常密度灶。胆囊不大，壁不厚。胰腺、脾脏、双肾未见明显异常。胃肠道未见明显扩张。腹膜后未见肿大淋巴结。腹腔未见积液。',
      impression: '全腹部CT平扫未见明显异常。',
      radiologist: '王医生',
      reportedAt: '2024-08-12T15:30:00Z',
    });

    // DICOM Study数据
    const study1: DicomStudy = {
      studyInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.198',
      patientId: 'P20240001',
      patientName: '张三',
      studyDate: '2024-06-15',
      studyTime: '10:00:00',
      studyDescription: '胸部CT平扫',
      modalities: ['CT'],
      accessionNumber: 'ACC202406001',
      referringPhysician: '王医生',
      numberOfSeries: 2,
      numberOfInstances: 256,
    };
    this.studies.set(study1.studyInstanceUid, study1);

    const series1: DicomSeries = {
      seriesInstanceUid: '1.2.840.113619.2.55.3.604688119.443.1402723142.199',
      studyInstanceUid: study1.studyInstanceUid,
      modality: 'CT',
      seriesDescription: '胸部轴位',
      seriesNumber: 1,
      numberOfInstances: 200,
      bodyPart: '胸部',
      stationName: 'CT01',
    };
    this.series.set(series1.seriesInstanceUid, series1);

    // AI分析结果（肺结节检测）
    this.aiResults.set('AI000001', {
      analysisId: 'AI000001',
      examId: 'EXAM001',
      analysisType: 'lung_nodule',
      status: 'completed',
      modelVersion: 'jianlan-lung-v2.1',
      findings: [
        {
          type: 'nodule',
          description: '右肺上叶磨玻璃结节，大小约8mm×6mm',
          confidence: 0.94,
          location: '右肺上叶S1段',
          severity: 'moderate',
          coordinates: { x: 342, y: 187, width: 24, height: 18 },
        },
      ],
      summary: '检测到1处肺结节，建议3-6个月复查。恶性风险评估：低-中度。',
      startedAt: '2024-06-15T10:30:00Z',
      completedAt: '2024-06-15T10:32:15Z',
    });
  }

  // === 影像检查申请 ===

  async orderImagingExam(request: ImagingExamRequest): Promise<ImagingExamResult> {
    return this.execute(async () => {
      this.examCounter++;
      const examId = `EXAM${Date.now()}${this.examCounter}`;
      this.emitImagingEvent({
        eventType: 'exam_scheduled',
        examId,
        patientId: request.patientId,
        encounterId: request.encounterId,
        timestamp: new Date().toISOString(),
        data: { modality: request.modality, examName: request.examName },
      });
      return {
        examId,
        pacsExamId: `PACS${examId}`,
        accessionNumber: `ACC${Date.now()}`,
        status: 'scheduled',
        scheduledTime: new Date(Date.now() + 3600000).toISOString(),
        message: `${request.modality}检查申请已提交`,
      };
    });
  }

  // === 影像报告查询 ===

  async getImageReport(reportId: string): Promise<ImagingReport> {
    return this.execute(async () => {
      const report = this.reports.get(reportId);
      if (!report) {
        throw AdapterError.business(
          `影像报告 [${reportId}] 不存在`,
          AdapterErrorCode.UNKNOWN_ERROR,
          { adapterId: this.id },
        );
      }
      return report;
    });
  }

  async getReportList(
    patientId: string,
    encounterId?: string,
    modality?: ImagingModality,
    limit = 20,
  ): Promise<ImagingReport[]> {
    return this.execute(async () => {
      let list = Array.from(this.reports.values()).filter((r) => r.patientId === patientId);
      if (encounterId) list = list.filter((r) => r.encounterId === encounterId);
      if (modality) list = list.filter((r) => r.modality === modality);
      return list.sort((a, b) => b.examDate.localeCompare(a.examDate)).slice(0, limit);
    });
  }

  // === DICOM影像获取 ===

  async getStudyList(
    patientId: string,
    modality?: ImagingModality,
    startDate?: string,
    endDate?: string,
  ): Promise<DicomStudy[]> {
    return this.execute(async () => {
      let list = Array.from(this.studies.values()).filter((s) => s.patientId === patientId);
      if (modality) list = list.filter((s) => s.modalities.includes(modality));
      if (startDate) list = list.filter((s) => s.studyDate >= startDate);
      if (endDate) list = list.filter((s) => s.studyDate <= endDate);
      return list;
    });
  }

  async getDicomImage(
    studyInstanceUid: string,
    seriesInstanceUid?: string,
    instanceNumber?: number,
  ): Promise<DicomInstance[]> {
    return this.execute(async () => {
      const study = this.studies.get(studyInstanceUid);
      if (!study) {
        throw AdapterError.business(
          `DICOM Study [${studyInstanceUid}] 不存在`,
          AdapterErrorCode.UNKNOWN_ERROR,
          { adapterId: this.id },
        );
      }
      // Mock返回影像实例列表
      const count = instanceNumber ? 1 : 10;
      const instances: DicomInstance[] = [];
      for (let i = 0; i < count; i++) {
        const num = instanceNumber ?? i + 1;
        instances.push({
          sopInstanceUid: `${studyInstanceUid}.${num}`,
          seriesInstanceUid: seriesInstanceUid ?? `${studyInstanceUid}.1`,
          studyInstanceUid,
          instanceNumber: num,
          rows: 512,
          columns: 512,
          bitsAllocated: 16,
          photometricInterpretation: 'MONOCHROME2',
          imageUrl: `mock://dicom/${studyInstanceUid}/${num}`,
          thumbnailUrl: `mock://dicom/${studyInstanceUid}/${num}/thumb`,
        });
      }
      return instances;
    });
  }

  // === 影像AI分析 ===

  async triggerAIAnalysis(
    request: AIAnalysisRequest,
  ): Promise<{ analysisId: string; status: AIAnalysisStatus }> {
    return this.execute(async () => {
      this.aiCounter++;
      const analysisId = `AI${String(this.aiCounter).padStart(6, '0')}`;
      const result: AIAnalysisResult = {
        analysisId,
        examId: request.examId,
        analysisType: request.analysisType,
        status: 'processing',
        modelVersion: request.modelVersion ?? 'jianlan-ai-v1.0',
        startedAt: new Date().toISOString(),
      };
      this.aiResults.set(analysisId, result);
      return { analysisId, status: 'processing' };
    });
  }

  async getAIResult(analysisId: string): Promise<AIAnalysisResult> {
    return this.execute(async () => {
      const result = this.aiResults.get(analysisId);
      if (!result) {
        throw AdapterError.business(
          `AI分析任务 [${analysisId}] 不存在`,
          AdapterErrorCode.UNKNOWN_ERROR,
          { adapterId: this.id },
        );
      }
      return result;
    });
  }

  // === 事件订阅 ===

  onImagingEvent(callback: (event: ImagingEvent) => void): Unsubscribe {
    this.imagingEventListeners.add(callback);
    return () => {
      this.imagingEventListeners.delete(callback);
    };
  }

  private emitImagingEvent(event: ImagingEvent): void {
    this.imagingEventListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        /* ignore */
      }
    });
  }

  // === DICOM C-MOVE / C-STORE / Viewer ===

  async retrieveStudy(
    studyInstanceUid: string,
    destinationAE = 'JIANLAN_SCU',
  ): Promise<{ transferred: number }> {
    return this.execute(async () => {
      this.logger.info(`C-MOVE Study [${studyInstanceUid}] → ${destinationAE}`);
      return { transferred: 120 };
    });
  }

  async storeInstance(_file: unknown): Promise<{ sopInstanceUid: string }> {
    return this.execute(async () => {
      const sop = `1.2.840.113619.2.55.3.${Date.now()}`;
      this.logger.info(`C-STORE 实例 [${sop}] 成功`);
      return { sopInstanceUid: sop };
    });
  }

  getViewerUrl(studyInstanceUid: string, viewer: 'cornerstone' | 'ohif' = 'ohif'): string {
    if (viewer === 'cornerstone') {
      return `/viewer/cornerstone.html?studyUID=${encodeURIComponent(studyInstanceUid)}`;
    }
    return `/viewer/ohif/viewer.html?StudyInstanceUIDs=${encodeURIComponent(studyInstanceUid)}`;
  }
}
