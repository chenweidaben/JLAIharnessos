/**
 * 健澜科技数智医院智能体 - integration/adapters/emr/EMRMockAdapter.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - EMR Mock适配器
 *
 * 版权所有 (c) 2026 健澜科技
 * 本文件为健澜科技专有技术文档，未经授权不得复制、传播或用于其他用途。
 *
 * 实现EMRAdapter接口，返回模拟的门诊病历、入院记录、病程记录等数据。
 *
 * @module integration/adapters/emr/EMRMockAdapter
 */

import type { AdapterMetadata, Unsubscribe } from '../../types';
import { createDefaultAdapterConfig } from '../AdapterConfig';
import { AdapterError, AdapterErrorCode } from '../AdapterError';
import { BaseAdapter } from '../BaseAdapter';
import type {
  CACertificate,
  EMRAdapter,
  MedicalRecord,
  MedicalRecordType,
  RecordEvent,
  RecordQueryCriteria,
  RecordTemplate,
  RecordWriteRequest,
  SignatureVerification,
  SignRequest,
} from './EMRAdapter';

/**
 * EMR Mock适配器
 */
export class EMRMockAdapter extends BaseAdapter implements EMRAdapter {
  private records = new Map<string, MedicalRecord>();
  private templates = new Map<string, RecordTemplate>();
  private recordEventListeners = new Set<(event: RecordEvent) => void>();
  private recordCounter = 0;

  constructor() {
    const config = createDefaultAdapterConfig({
      id: 'emr-mock',
      type: 'emr',
      vendor: 'mock',
      version: '1.0.0',
      name: 'EMR Mock适配器',
      endpoint: 'mock://emr',
      timeout: 5000,
    });
    super(config);
  }

  getMetadata(): AdapterMetadata {
    return {
      id: this.config.id,
      type: 'emr',
      vendor: 'mock',
      version: '1.0.0',
      name: 'EMR Mock适配器',
      description: '模拟EMR系统，返回门诊病历、入院记录、病程记录等',
      supportedProtocols: ['mock'],
    };
  }

  protected override async onInit(): Promise<void> {
    this.seedMockData();
  }

  private seedMockData(): void {
    // 种子病历模板
    const templateData: Omit<RecordTemplate, 'templateId'>[] = [
      {
        templateName: '标准门诊病历模板',
        recordType: 'outpatient_note',
        department: '通用',
        title: '门诊病历',
        freeTextTemplate: '主诉：\n现病史：\n既往史：\n查体：\n初步诊断：\n处理意见：',
        version: '1.0',
        isDefault: true,
      },
      {
        templateName: '标准入院记录模板',
        recordType: 'admission_note',
        department: '通用',
        title: '入院记录',
        freeTextTemplate:
          '主诉：\n现病史：\n既往史：\n个人史：\n家族史：\n体格检查：\n辅助检查：\n初步诊断：\n诊断依据：\n鉴别诊断：\n诊疗计划：',
        version: '1.0',
        isDefault: true,
      },
      {
        templateName: '首次病程记录模板',
        recordType: 'first_progress_note',
        department: '通用',
        title: '首次病程记录',
        freeTextTemplate: '病例特点：\n诊断依据：\n鉴别诊断：\n诊疗计划：',
        version: '1.0',
        isDefault: true,
      },
    ];
    templateData.forEach((t, i) => {
      this.templates.set(`TPL${String(i + 1).padStart(4, '0')}`, {
        ...t,
        templateId: `TPL${String(i + 1).padStart(4, '0')}`,
      });
    });

    // 种子病历数据
    const mockRecords: MedicalRecord[] = [
      {
        recordId: 'REC000001',
        patientId: 'P20240001',
        encounterId: 'E202400011',
        recordType: 'outpatient_note',
        recordTypeName: '门诊病历',
        title: '高血压病门诊复诊',
        status: 'signed',
        structuredData: {
          chiefComplaint: '发现血压升高5年，头晕1周',
          presentIllness:
            '患者5年前体检发现血压升高，最高160/100mmHg，诊断为"高血压病"，长期口服硝苯地平缓释片20mg QD，血压控制尚可。1周前无明显诱因出现头晕，呈持续性昏沉感，无视物旋转，无恶心呕吐，自测血压150/95mmHg。为求进一步诊治来院。',
          pastHistory:
            '既往体健，否认糖尿病、冠心病史，否认肝炎结核等传染病史，否认手术外伤史，否认食物药物过敏史。',
          physicalExam: {
            temperature: 36.5,
            pulse: 78,
            respiration: 18,
            bloodPressure: '150/95',
            general: '神志清，精神可，自主体位，查体合作',
            heart: '心率78次/分，律齐，各瓣膜听诊区未闻及病理性杂音',
            abdomen: '腹平软，无压痛反跳痛，肝脾肋下未及',
          },
          diagnosis: [
            { diagnosisCode: 'I10', diagnosisName: '高血压病', diagnosisType: 'primary' },
          ],
          treatmentPlan:
            '1. 继续硝苯地平缓释片20mg QD口服；2. 加用美托洛尔片25mg BID口服；3. 低盐低脂饮食，适量运动；4. 监测血压，2周后复诊。',
        },
        freeText:
          '主诉：发现血压升高5年，头晕1周\n\n现病史：患者5年前体检发现血压升高...\n\n查体：T 36.5℃ P 78次/分 R 18次/分 BP 150/95mmHg...\n\n初步诊断：高血压病\n\n处理意见：1. 继续硝苯地平缓释片20mg QD口服；2. 加用美托洛尔片25mg BID口服...',
        createdBy: '王医生',
        createdAt: '2024-06-15T09:30:00Z',
        signedBy: '王医生',
        signedAt: '2024-06-15T10:00:00Z',
        aiGenerated: false,
      },
      {
        recordId: 'REC000002',
        patientId: 'P20240002',
        encounterId: 'E202400021',
        recordType: 'admission_note',
        recordTypeName: '入院记录',
        title: '急性阑尾炎入院记录',
        status: 'signed',
        structuredData: {
          chiefComplaint: '转移性右下腹痛1天',
          presentIllness:
            '患者1天前无明显诱因出现上腹部隐痛，呈持续性，伴恶心，未呕吐，无发热。6小时前疼痛转移并固定于右下腹，呈持续性胀痛，弯腰屈膝位稍缓解，伴发热，体温最高38.5℃。发病以来，精神差，食欲差，睡眠欠佳，大小便正常，体重无明显变化。',
          pastHistory:
            '既往体健，否认高血压、糖尿病、冠心病史，否认肝炎结核等传染病史，否认手术外伤史，否认食物药物过敏史，预防接种史随社会。',
          personalHistory: '生于原籍，久居本地，无疫区旅居史，无烟酒嗜好。',
          familyHistory: '父母体健，否认家族性遗传病史。',
          physicalExam: {
            temperature: 38.5,
            pulse: 96,
            respiration: 20,
            bloodPressure: '125/80',
            general: '神志清，精神差，急性痛苦面容，自主体位',
            abdomen:
              '腹平坦，右下腹麦氏点压痛阳性，反跳痛阳性，肌紧张弱阳性，肝脾肋下未及，Murphy征阴性，移动性浊音阴性，肠鸣音减弱，1-2次/分，未闻及血管杂音。',
          },
          diagnosis: [
            { diagnosisCode: 'K35.9', diagnosisName: '急性阑尾炎', diagnosisType: 'primary' },
          ],
          treatmentPlan:
            '1. 完善血常规、CRP、凝血功能、心电图、腹部彩超等术前检查；2. 禁食水，补液，抗感染治疗；3. 拟急诊行腹腔镜阑尾切除术；4. 向患者及家属交代病情及手术风险，签署知情同意书。',
          admissionDate: '2024-07-20T08:00:00Z',
        },
        freeText:
          '主诉：转移性右下腹痛1天\n\n现病史：患者1天前无明显诱因出现上腹部隐痛...\n\n查体：T 38.5℃ P 96次/分 R 20次/分 BP 125/80mmHg...\n\n初步诊断：急性阑尾炎\n\n诊疗计划：1. 完善术前检查；2. 禁食水，补液抗感染；3. 拟急诊行腹腔镜阑尾切除术。',
        createdBy: '李医生',
        createdAt: '2024-07-20T08:30:00Z',
        signedBy: '李医生',
        signedAt: '2024-07-20T09:00:00Z',
        aiGenerated: false,
      },
      {
        recordId: 'REC000003',
        patientId: 'P20240002',
        encounterId: 'E202400021',
        recordType: 'progress_note',
        recordTypeName: '病程记录',
        title: '术后第一天病程记录',
        status: 'signed',
        structuredData: {
          presentIllness:
            '患者术后第一天，神志清，精神可，诉切口轻度疼痛，可耐受，无发热，无恶心呕吐，已排气，未排便。查体：T 37.2℃ P 80次/分 R 18次/分 BP 120/75mmHg，心肺听诊无异常，腹平软，切口敷料干燥固定，无渗血渗液，肠鸣音正常，3-4次/分。血常规：WBC 8.5×10^9/L，N 65%，Hb 125g/L。',
          treatmentPlan:
            '1. 继续抗感染治疗；2. 流质饮食；3. 鼓励早期下床活动；4. 观察切口情况，明日换药；5. 复查血常规。',
        },
        freeText:
          '患者术后第一天，神志清，精神可，诉切口轻度疼痛...\n\n查体：T 37.2℃ P 80次/分 R 18次/分 BP 120/75mmHg...\n\n处理：1. 继续抗感染；2. 流质饮食；3. 早期下床活动。',
        createdBy: '李医生',
        createdAt: '2024-07-21T08:00:00Z',
        signedBy: '李医生',
        signedAt: '2024-07-21T08:30:00Z',
        aiGenerated: true,
        aiModel: 'jianlan-medical-v1',
        doctorModified: true,
        modificationCount: 1,
      },
      {
        recordId: 'REC000004',
        patientId: 'P20240001',
        encounterId: 'E202400011',
        recordType: 'discharge_summary',
        recordTypeName: '出院小结',
        title: '高血压病出院小结',
        status: 'signed',
        structuredData: {
          admissionDate: '2024-05-10T09:00:00Z',
          dischargeDate: '2024-05-17T10:00:00Z',
          admissionDiagnosis: '高血压病3级（很高危）',
          dischargeDiagnosis: '高血压病3级（很高危）',
          treatmentSummary:
            '入院后完善相关检查，调整降压方案，血压控制在130-140/80-90mmHg，病情稳定出院。',
          dischargeAdvice: '1. 规律服药，监测血压；2. 低盐低脂饮食；3. 1周后门诊复诊。',
          followUpPlan: '出院后1周心内科门诊复诊。',
        },
        freeText:
          '入院情况：发现血压升高5年...\n诊疗经过：调整降压方案...\n出院诊断：高血压病3级...\n出院医嘱：规律服药...',
        createdBy: '王医生',
        createdAt: '2024-05-17T09:00:00Z',
        signedBy: '王医生',
        signedAt: '2024-05-17T10:00:00Z',
        aiGenerated: false,
      },
      {
        recordId: 'REC000005',
        patientId: 'P20240002',
        encounterId: 'E202400021',
        recordType: 'surgery_note',
        recordTypeName: '手术记录',
        title: '腹腔镜阑尾切除术手术记录',
        status: 'signed',
        structuredData: {
          surgeryName: '腹腔镜阑尾切除术',
          surgeryDate: '2024-07-20T14:00:00Z',
          surgeon: '李医生',
          anesthesiaType: '全身麻醉',
          surgeryFindings: '术中见阑尾充血水肿，位于盲肠后位，未见穿孔及坏疽。',
          surgeryProcedure: '常规三孔法腹腔镜，游离阑尾，结扎切断系膜及阑尾根部，切除阑尾取出。',
        },
        freeText:
          '手术名称：腹腔镜阑尾切除术\n麻醉方式：全身麻醉\n手术经过：常规消毒铺巾...\n术中所见：阑尾充血水肿...',
        createdBy: '李医生',
        createdAt: '2024-07-20T16:00:00Z',
        signedBy: '李医生',
        signedAt: '2024-07-20T16:30:00Z',
        caSignature: 'MOCK_CA_SIGN_REC000005',
        aiGenerated: false,
      },
    ];
    mockRecords.forEach((r) => this.records.set(r.recordId, r));
  }

  // === 病历读取 ===

  async getMedicalRecord(recordId: string): Promise<MedicalRecord> {
    return this.execute(async () => {
      const record = this.records.get(recordId);
      if (!record) {
        throw AdapterError.business(
          `病历 [${recordId}] 不存在`,
          AdapterErrorCode.ENCOUNTER_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      return record;
    });
  }

  async getRecordList(
    criteria: RecordQueryCriteria,
  ): Promise<{ records: MedicalRecord[]; total: number }> {
    return this.execute(async () => {
      let results = Array.from(this.records.values()).filter(
        (r) => r.patientId === criteria.patientId,
      );
      if (criteria.encounterId)
        results = results.filter((r) => r.encounterId === criteria.encounterId);
      if (criteria.recordType)
        results = results.filter((r) => r.recordType === criteria.recordType);
      if (criteria.status) results = results.filter((r) => r.status === criteria.status);
      const total = results.length;
      const page = criteria.page ?? 1;
      const pageSize = criteria.pageSize ?? 20;
      return { records: results.slice((page - 1) * pageSize, page * pageSize), total };
    });
  }

  // === 病历写入 ===

  async writeMedicalRecord(request: RecordWriteRequest): Promise<MedicalRecord> {
    return this.execute(async () => {
      this.recordCounter++;
      const recordId = `REC${String(this.recordCounter).padStart(6, '0')}`;
      const record: MedicalRecord = {
        recordId,
        patientId: request.patientId,
        encounterId: request.encounterId,
        recordType: request.recordType,
        recordTypeName: this.getRecordTypeName(request.recordType),
        title: request.title,
        status: 'draft',
        structuredData: request.structuredData ?? {},
        freeText: request.freeText,
        createdBy: request.createdBy,
        createdAt: new Date().toISOString(),
        aiGenerated: request.aiGenerated,
        aiModel: request.aiModel,
      };
      this.records.set(recordId, record);
      this.emitRecordEvent({
        eventType: 'created',
        recordId,
        patientId: request.patientId,
        encounterId: request.encounterId,
        timestamp: new Date().toISOString(),
      });
      return record;
    });
  }

  async updateMedicalRecord(
    recordId: string,
    updates: Partial<RecordWriteRequest>,
  ): Promise<MedicalRecord> {
    return this.execute(async () => {
      const record = this.records.get(recordId);
      if (!record) {
        throw AdapterError.business(
          `病历 [${recordId}] 不存在`,
          AdapterErrorCode.ENCOUNTER_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      const updated: MedicalRecord = {
        ...record,
        ...(updates.title ? { title: updates.title } : {}),
        ...(updates.structuredData
          ? { structuredData: { ...record.structuredData, ...updates.structuredData } }
          : {}),
        ...(updates.freeText ? { freeText: updates.freeText } : {}),
        status: 'draft',
        updatedBy: updates.createdBy,
        updatedAt: new Date().toISOString(),
      };
      this.records.set(recordId, updated);
      this.emitRecordEvent({
        eventType: 'updated',
        recordId,
        patientId: record.patientId,
        encounterId: record.encounterId,
        timestamp: new Date().toISOString(),
      });
      return updated;
    });
  }

  // === 病历模板 ===

  async getTemplate(templateId: string): Promise<RecordTemplate> {
    return this.execute(async () => {
      const template = this.templates.get(templateId);
      if (!template) {
        throw AdapterError.business(
          `病历模板 [${templateId}] 不存在`,
          AdapterErrorCode.UNKNOWN_ERROR,
          { adapterId: this.id },
        );
      }
      return template;
    });
  }

  async getTemplateList(
    recordType?: MedicalRecordType,
    department?: string,
  ): Promise<RecordTemplate[]> {
    return this.execute(async () => {
      let list = Array.from(this.templates.values());
      if (recordType) list = list.filter((t) => t.recordType === recordType);
      if (department)
        list = list.filter(
          (t) => !t.department || t.department === department || t.department === '通用',
        );
      return list;
    });
  }

  // === 电子签名 ===

  async signRecord(request: SignRequest): Promise<MedicalRecord> {
    return this.execute(async () => {
      const record = this.records.get(request.recordId);
      if (!record) {
        throw AdapterError.business(
          `病历 [${request.recordId}] 不存在`,
          AdapterErrorCode.ENCOUNTER_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      const signed: MedicalRecord = {
        ...record,
        status: 'signed',
        signedBy: request.signerName,
        signedAt: new Date().toISOString(),
        caSignature: request.signatureValue ?? `MOCK_SIGN_${Date.now()}`,
      };
      this.records.set(request.recordId, signed);
      this.emitRecordEvent({
        eventType: 'signed',
        recordId: request.recordId,
        patientId: record.patientId,
        encounterId: record.encounterId,
        timestamp: new Date().toISOString(),
      });
      return signed;
    });
  }

  async verifySignature(recordId: string): Promise<SignatureVerification> {
    return this.execute(async () => {
      const record = this.records.get(recordId);
      if (!record) {
        throw AdapterError.business(
          `病历 [${recordId}] 不存在`,
          AdapterErrorCode.ENCOUNTER_NOT_FOUND,
          { adapterId: this.id },
        );
      }
      const valid = record.status === 'signed' && !!record.caSignature;
      return {
        valid,
        recordId,
        signedBy: record.signedBy,
        signedAt: record.signedAt,
        certificateValid: valid,
        integrityValid: valid,
        message: valid ? '签名验证通过' : '病历未签名或签名无效',
      };
    });
  }

  // === CA 证书 ===

  async listAvailableCertificates(doctorId: string): Promise<CACertificate[]> {
    return this.execute(async () => {
      return [
        {
          certificateId: `CERT-${doctorId}-001`,
          subject: `CN=${doctorId},O=健澜科技医院`,
          issuer: 'CN=健澜CA,O=Jianlan',
          validFrom: '2024-01-01T00:00:00Z',
          validTo: '2027-01-01T00:00:00Z',
          serialNumber: '1234567890',
          usage: 'sign',
        },
      ];
    });
  }

  // === 事件订阅 ===

  onRecordEvent(callback: (event: RecordEvent) => void): Unsubscribe {
    this.recordEventListeners.add(callback);
    return () => {
      this.recordEventListeners.delete(callback);
    };
  }

  private emitRecordEvent(event: RecordEvent): void {
    this.recordEventListeners.forEach((cb) => {
      try {
        cb(event);
      } catch {
        /* ignore */
      }
    });
  }

  private getRecordTypeName(type: MedicalRecordType): string {
    const names: Partial<Record<MedicalRecordType, string>> = {
      outpatient_note: '门诊病历',
      emergency_note: '急诊病历',
      emergency_observation: '急诊留观记录',
      outpatient_prescription: '门诊处方',
      admission_note: '入院记录',
      admission_24h: '24小时入出院记录',
      admission_24h_death: '24小时入院死亡记录',
      transfer_in_note: '转科接收记录',
      transfer_out_note: '转科转出记录',
      progress_note: '病程记录',
      first_progress_note: '首次病程记录',
      director_rounds: '主任医师查房记录',
      associate_chief_rounds: '副主任医师查房记录',
      attending_rounds: '主治医师查房记录',
      superior_rounds_note: '上级医师查房记录',
      shift_handover: '交班前记录',
      shift_takeover: '接班后记录',
      stage_summary: '阶段小结',
      rescue_record: '抢救记录',
      difficult_case_discussion: '疑难病例讨论记录',
      consultation_note: '会诊记录',
      intra_hospital_consultation: '科间会诊记录',
      inter_hospital_consultation: '院外会诊记录',
      daily_progress: '日常病程记录',
      pre_op_summary: '术前小结',
      pre_op_discussion: '术前讨论记录',
      post_op_first_note: '术后首次病程记录',
      surgery_note: '手术记录',
      anesthesia_visit_pre: '麻醉术前访视记录',
      anesthesia_note: '麻醉记录',
      anesthesia_visit_post: '麻醉术后访视记录',
      surgery_safety_check: '手术安全核查记录',
      surgery_count_check: '手术清点记录',
      surgery_consent: '手术知情同意书',
      anesthesia_consent: '麻醉知情同意书',
      invasive_consent: '有创操作知情同意书',
      interventional_record: '介入手术记录',
      discharge_summary: '出院小结',
      death_record: '死亡记录',
      death_discussion: '死亡病例讨论记录',
      discharge_notice: '出院通知单',
      abscond_note: '自动出院记录',
      abandon_treatment_note: '放弃治疗记录',
      nursing_note: '护理记录',
      critical_nursing: '危重护理记录',
      admission_nursing: '入院护理评估',
      surgery_nursing: '手术护理记录',
      temperature_sheet: '体温单',
      order_sheet: '医嘱单',
      delivery_record: '分娩记录',
      newborn_record: '新生儿记录',
      informed_consent: '知情同意书',
      authorization: '授权委托书',
      health_education: '健康教育记录',
      endoscopy_record: '内镜检查记录',
      pathology_record: '病理记录',
      transfusion_record: '输血记录',
      critical_value_note: '危急值处理记录',
      consultation_request: '会诊申请单',
      disclosure_consent: '特殊检查治疗同意书',
      blood_consent: '输血治疗同意书',
      chemotherapy_note: '化疗记录',
      radiotherapy_note: '放疗记录',
      rehabilitation_note: '康复记录',
      psychology_note: '心理评估记录',
      nutrition_note: '营养评估记录',
      follow_up_note: '随访记录',
      transfer_note: '转科记录',
      observation_note: '留观记录',
      medical_quality_note: '医疗质控记录',
      research_consent: '科研知情同意书',
      other: '其他文书',
    };
    return names[type] ?? '其他文书';
  }
}
