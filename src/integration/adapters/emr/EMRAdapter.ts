/**
 * 健澜科技数智医院智能体 - integration/adapters/emr/EMRAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - EMR适配器接口
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 定义EMR（电子病历）统一适配器接口，支持病历读取、写入、
 * 模板管理和电子签名。
 *
 * @module integration/adapters/emr/EMRAdapter
 */

import type { Unsubscribe } from '../../types';
import type { BaseAdapter } from '../BaseAdapter';

/** 病历文书类型（覆盖 72 种常用医学文书） */
export type MedicalRecordType =
  // === 门诊/急诊（4） ===
  | 'outpatient_note' // 门诊病历
  | 'emergency_note' // 急诊病历
  | 'emergency_observation' // 急诊留观记录
  | 'outpatient_prescription' // 门诊处方
  // === 入院（5） ===
  | 'admission_note' // 入院记录
  | 'admission_24h' // 24小时入出院记录
  | 'admission_24h_death' // 24小时入院死亡记录
  | 'transfer_in_note' // 转科接收记录
  | 'transfer_out_note' // 转科转出记录
  // === 病程记录（18） ===
  | 'progress_note' // 病程记录
  | 'first_progress_note' // 首次病程记录
  | 'director_rounds' // 主任医师查房记录
  | 'associate_chief_rounds' // 副主任医师查房记录
  | 'attending_rounds' // 主治医师查房记录
  | 'superior_rounds_note' // 上级医师查房记录
  | 'shift_handover' // 交班前记录
  | 'shift_takeover' // 接班后记录
  | 'stage_summary' // 阶段小结
  | 'rescue_record' // 抢救记录
  | 'difficult_case_discussion' // 疑难病例讨论记录
  | 'consultation_note' // 会诊记录
  | 'intra_hospital_consultation' // 科间会诊
  | 'inter_hospital_consultation' // 院外会诊
  | 'daily_progress' // 日常病程记录
  | 'pre_op_summary' // 术前小结
  | 'pre_op_discussion' // 术前讨论记录
  | 'post_op_first_note' // 术后首次病程记录
  // === 手术麻醉（10） ===
  | 'surgery_note' // 手术记录
  | 'anesthesia_visit_pre' // 麻醉术前访视记录
  | 'anesthesia_note' // 麻醉记录
  | 'anesthesia_visit_post' // 麻醉术后访视记录
  | 'surgery_safety_check' // 手术安全核查记录
  | 'surgery_count_check' // 手术清点记录
  | 'surgery_consent' // 手术知情同意书
  | 'anesthesia_consent' // 麻醉知情同意书
  | 'invasive_consent' // 有创操作知情同意书
  | 'interventional_record' // 介入手术记录
  // === 出院/死亡（6） ===
  | 'discharge_summary' // 出院小结
  | 'death_record' // 死亡记录
  | 'death_discussion' // 死亡病例讨论记录
  | 'discharge_notice' // 出院通知单
  | 'abscond_note' // 自动出院记录
  | 'abandon_treatment_note' // 放弃治疗记录
  // === 护理（8） ===
  | 'nursing_note' // 护理记录
  | 'critical_nursing' // 危重护理记录
  | 'admission_nursing' // 入院护理评估
  | 'surgery_nursing' // 手术护理记录
  | 'temperature_sheet' // 体温单
  | 'order_sheet' // 医嘱单
  | 'delivery_record' // 分娩记录
  | 'newborn_record' // 新生儿记录
  // === 其他（21） ===
  | 'informed_consent' // 知情同意书
  | 'authorization' // 授权委托书
  | 'health_education' // 健康教育记录
  | 'endoscopy_record' // 内镜检查记录
  | 'pathology_record' // 病理记录
  | 'transfusion_record' // 输血记录
  | 'critical_value_note' // 危急值处理记录
  | 'consultation_request' // 会诊申请单
  | 'disclosure_consent' // 特殊检查治疗同意书
  | 'blood_consent' // 输血治疗同意书
  | 'chemotherapy_note' // 化疗记录
  | 'radiotherapy_note' // 放疗记录
  | 'rehabilitation_note' // 康复记录
  | 'psychology_note' // 心理评估记录
  | 'nutrition_note' // 营养评估记录
  | 'follow_up_note' // 随访记录
  | 'transfer_note' // 转科记录
  | 'observation_note' // 留观记录
  | 'other' // 其他
  | 'medical_quality_note' // 医疗质控记录
  | 'research_consent'; // 科研知情同意书

/** 病历状态 */
export type MedicalRecordStatus = 'draft' | 'submitted' | 'signed' | 'archived' | 'amended';

/** 诊断信息 */
export interface Diagnosis {
  diagnosisCode: string; // ICD-10编码
  diagnosisName: string; // 诊断名称
  diagnosisType?: 'primary' | 'secondary' | 'complication' | 'comorbidity';
  diagnosisDate?: string;
}

/** 体格检查（结构化） */
export interface PhysicalExam {
  temperature?: number; // 体温（℃）
  pulse?: number; // 脉搏（次/分）
  respiration?: number; // 呼吸（次/分）
  bloodPressure?: string; // 血压（mmHg）
  height?: number; // 身高（cm）
  weight?: number; // 体重（kg）
  bmi?: number; // BMI
  general?: string; // 一般情况
  headNeck?: string; // 头颈部
  chest?: string; // 胸部
  heart?: string; // 心脏
  abdomen?: string; // 腹部
  extremities?: string; // 四肢脊柱
  neurological?: string; // 神经系统
  others?: string; // 其他
}

/** 电子病历 */
export interface MedicalRecord {
  recordId: string;
  patientId: string;
  encounterId: string;
  recordType: MedicalRecordType;
  recordTypeName: string;
  title: string;
  status: MedicalRecordStatus;

  // 结构化字段
  structuredData: {
    chiefComplaint?: string;
    presentIllness?: string;
    pastHistory?: string;
    personalHistory?: string;
    familyHistory?: string;
    physicalExam?: PhysicalExam;
    diagnosis?: Diagnosis[];
    treatmentPlan?: string;
    // 手术记录专用
    surgeryName?: string;
    surgeryDate?: string;
    surgeon?: string;
    anesthesiaType?: string;
    surgeryFindings?: string;
    surgeryProcedure?: string;
    // 出院小结专用
    admissionDate?: string;
    dischargeDate?: string;
    admissionDiagnosis?: string;
    dischargeDiagnosis?: string;
    treatmentSummary?: string;
    dischargeAdvice?: string;
    followUpPlan?: string;
    // 扩展字段
    [key: string]: unknown;
  };

  // 自由文本
  freeText: string;

  // 原始格式
  rawFormat?: {
    type: 'xml' | 'json' | 'cda' | 'hl7' | 'text';
    content: string;
  };

  // 审计信息
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  signedBy?: string;
  signedAt?: string;
  caSignature?: string;

  // AI生成信息
  aiGenerated?: boolean;
  aiModel?: string;
  doctorModified?: boolean;
  modificationCount?: number;
}

/** 病历查询条件 */
export interface RecordQueryCriteria {
  patientId: string;
  encounterId?: string;
  recordType?: MedicalRecordType;
  status?: MedicalRecordStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

/** 病历写入请求 */
export interface RecordWriteRequest {
  patientId: string;
  encounterId: string;
  recordType: MedicalRecordType;
  title: string;
  structuredData?: MedicalRecord['structuredData'];
  freeText: string;
  createdBy: string;
  aiGenerated?: boolean;
  aiModel?: string;
}

/** 病历模板 */
export interface RecordTemplate {
  templateId: string;
  templateName: string;
  recordType: MedicalRecordType;
  department?: string;
  title: string;
  structuredData?: MedicalRecord['structuredData'];
  freeTextTemplate: string;
  version: string;
  isDefault?: boolean;
}

/** 电子签名请求 */
export interface SignRequest {
  recordId: string;
  signerId: string;
  signerName: string;
  caCertificate?: string;
  signatureValue?: string;
  timestamp?: string;
}

/** 签名验证结果 */
export interface SignatureVerification {
  valid: boolean;
  recordId: string;
  signedBy?: string;
  signedAt?: string;
  certificateValid?: boolean;
  integrityValid?: boolean;
  message?: string;
}

/** CA 数字证书信息 */
export interface CACertificate {
  certificateId: string;
  subject: string;
  issuer: string;
  validFrom: string;
  validTo: string;
  serialNumber?: string;
  usage: 'sign' | 'encrypt';
}

/** 病历事件类型 */
export type RecordEventType = 'created' | 'updated' | 'signed' | 'archived' | 'amended';

/** 病历事件 */
export interface RecordEvent {
  eventType: RecordEventType;
  recordId: string;
  patientId: string;
  encounterId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * EMR适配器接口
 *
 * 所有EMR系统适配器必须实现此接口。
 */
export interface EMRAdapter extends BaseAdapter {
  // === 病历读取 ===
  getMedicalRecord(recordId: string): Promise<MedicalRecord>;
  getRecordList(
    criteria: RecordQueryCriteria,
  ): Promise<{ records: MedicalRecord[]; total: number }>;

  // === 病历写入 ===
  writeMedicalRecord(request: RecordWriteRequest): Promise<MedicalRecord>;
  updateMedicalRecord(
    recordId: string,
    updates: Partial<RecordWriteRequest>,
  ): Promise<MedicalRecord>;

  // === 病历模板 ===
  getTemplate(templateId: string): Promise<RecordTemplate>;
  getTemplateList(recordType?: MedicalRecordType, department?: string): Promise<RecordTemplate[]>;

  // === 电子签名 ===
  signRecord(request: SignRequest): Promise<MedicalRecord>;
  verifySignature(recordId: string): Promise<SignatureVerification>;
  /** 查询可用 CA 证书列表 */
  listAvailableCertificates(doctorId: string): Promise<CACertificate[]>;

  // === 事件订阅 ===
  onRecordEvent(callback: (event: RecordEvent) => void): Unsubscribe;
}
