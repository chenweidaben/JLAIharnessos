/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 */

// ============================================================
// 用户与角色
// ============================================================

/** 用户角色类型 */
export type UserRole =
  | 'doctor' // 医生
  | 'nurse' // 护士
  | 'pharmacist' // 药师
  | 'coder' // 病案编码员
  | 'admin' // 管理员
  | 'researcher' // 科研人员
  | 'student' // 学员/规培生
  | 'patient'; // 患者（自助服务）

/** 职称类型 */
export type MedicalTitle =
  | 'chief' // 主任医师
  | 'associate_chief' // 副主任医师
  | 'attending' // 主治医师
  | 'resident' // 住院医师
  | 'intern' // 实习医师
  | 'head_nurse' // 护士长
  | 'supervisor_nurse' // 主管护师
  | 'nurse_practitioner' // 护师
  | 'chief_pharmacist' // 主任药师
  | 'pharmacist_specialist'; // 主管药师

/** 处方权等级 */
export type PrescriptionRightLevel =
  | 'none' // 无处方权
  | 'normal' // 普通处方权
  | 'special' // 特殊处方权（抗菌药物特殊级）
  | 'narcotic'; // 麻醉药品处方权

/**
 * 医疗系统用户
 *
 * 表示当前登录操作用户的完整信息，包含身份、权限、执业资格等。
 */
export interface MedicalUser {
  /** 用户唯一ID */
  readonly userId: string;
  /** 用户姓名 */
  readonly name: string;
  /** 用户角色 */
  readonly role: UserRole;
  /** 职称 */
  readonly title?: MedicalTitle;
  /** 所属科室 */
  readonly department: string;
  /** 执业医师资格证号（医生角色必填） */
  readonly licenseNo?: string;
  /** 是否拥有处方权 */
  readonly hasPrescriptionRight: boolean;
  /** 处方权等级 */
  readonly prescriptionRightLevel?: PrescriptionRightLevel;
  /** 权限列表（RBAC 粒度：模块:操作） */
  readonly permissions: readonly string[];
  /** 登录时间戳 */
  readonly loginTime: number;
  /** 会话ID */
  readonly sessionId: string;
  /** 客户端IP地址（审计用） */
  readonly clientIp?: string;
}

// ============================================================
// 患者
// ============================================================

/** 性别类型 */
export type Gender = 'male' | 'female' | 'unknown';

/** 患者状态 */
export type PatientStatus =
  | 'outpatient' // 门诊
  | 'hospitalized' // 住院
  | 'emergency' // 急诊
  | 'discharged' // 已出院
  | 'deceased' // 死亡
  | 'unknown'; // 未知

/** 过敏信息 */
export interface AllergyInfo {
  /** 过敏原 */
  allergen: string;
  /** 过敏反应描述 */
  reaction: string;
  /** 严重程度 */
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  /** 记录时间 */
  recordedAt: string;
}

/** 既往病史 */
export interface PastHistory {
  /** 疾病名称 */
  disease: string;
  /** 诊断时间 */
  diagnosedAt?: string;
  /** 疾病状态 */
  status: 'cured' | 'improved' | 'ongoing' | 'deceased';
  /** 备注 */
  notes?: string;
}

/** 当前用药信息 */
export interface CurrentMedication {
  /** 药品通用名 */
  drugName: string;
  /** 剂量 */
  dosage: string;
  /** 用法频次 */
  frequency: string;
  /** 开始日期 */
  startDate: string;
  /** 开方医生 */
  prescribingDoctor: string;
}

/** 生命体征 */
export interface VitalSigns {
  /** 体温（℃） */
  temperature?: number;
  /** 脉搏（次/分） */
  pulse?: number;
  /** 呼吸（次/分） */
  respiration?: number;
  /** 血压（收缩压/舒张压 mmHg） */
  bloodPressure?: string;
  /** 血氧饱和度（%） */
  spo2?: number;
  /** 测量时间 */
  measuredAt?: string;
}

/**
 * 患者摘要信息
 *
 * 用于列表展示和上下文注入的轻量级患者信息，已脱敏。
 */
export interface PatientSummary {
  /** 患者唯一ID */
  readonly patientId: string;
  /** 患者姓名（脱敏，如"李*英"） */
  readonly name: string;
  /** 性别 */
  readonly gender: Gender;
  /** 年龄 */
  readonly age?: number;
  /** 病案号 */
  readonly medicalRecordNo?: string;
  /** 当前就诊科室 */
  readonly department?: string;
  /** 当前诊断 */
  readonly currentDiagnosis?: string;
  /** 患者状态 */
  readonly status: PatientStatus;
  /** 过敏史摘要 */
  readonly allergySummary?: string;
  /** 是否急诊患者 */
  readonly isEmergency: boolean;
  /** 最后就诊日期 */
  readonly lastVisitDate?: string;
}

/**
 * 患者详细档案
 *
 * 包含患者完整信息，用于详细查看和诊疗决策支持。
 * 敏感字段（身份证、电话、地址）已脱敏。
 */
export interface PatientDetail extends PatientSummary {
  /** 出生日期 */
  readonly birthDate?: string;
  /** 脱敏身份证号 */
  readonly idCardMasked?: string;
  /** 脱敏联系电话 */
  readonly phoneMasked?: string;
  /** 脱敏地址 */
  readonly addressMasked?: string;
  /** 血型 */
  readonly bloodType?: string;
  /** 过敏史列表 */
  readonly allergies: readonly AllergyInfo[];
  /** 既往病史 */
  readonly pastHistory: readonly PastHistory[];
  /** 当前用药 */
  readonly currentMedications: readonly CurrentMedication[];
  /** 最新生命体征 */
  readonly latestVitals?: VitalSigns;
  /** 紧急联系人（脱敏） */
  readonly emergencyContactMasked?: string;
  /** 紧急联系人电话（脱敏） */
  readonly emergencyContactPhoneMasked?: string;
}

/**
 * 患者完整信息（内部使用，未脱敏）
 *
 * 仅在系统内部流转，输出到LLM或UI前必须经过脱敏处理。
 */
export interface Patient extends Omit<
  PatientDetail,
  | 'name'
  | 'idCardMasked'
  | 'phoneMasked'
  | 'addressMasked'
  | 'emergencyContactMasked'
  | 'emergencyContactPhoneMasked'
> {
  /** 真实姓名（未脱敏） */
  readonly realName: string;
  /** 身份证号（未脱敏） */
  readonly idCard?: string;
  /** 联系电话（未脱敏） */
  readonly phone?: string;
  /** 地址（未脱敏） */
  readonly address?: string;
  /** 紧急联系人（未脱敏） */
  readonly emergencyContact?: string;
  /** 紧急联系人电话（未脱敏） */
  readonly emergencyContactPhone?: string;
}

// ============================================================
// 就诊
// ============================================================

/** 就诊类型 */
export type VisitType =
  | 'outpatient' // 门诊
  | 'inpatient' // 住院
  | 'emergency' // 急诊
  | 'followup' // 随访
  | 'consultation' // 会诊
  | 'physical_exam'; // 体检

/** 就诊状态 */
export type EncounterStatus =
  | 'waiting' // 待诊
  | 'in_progress' // 诊疗中
  | 'completed' // 已完成
  | 'cancelled' // 已取消
  | 'transferred'; // 已转诊

/**
 * 就诊摘要
 *
 * 用于上下文注入的轻量级就诊信息。
 */
export interface EncounterSummary {
  /** 就诊唯一ID */
  readonly encounterId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 就诊类型 */
  readonly visitType: VisitType;
  /** 就诊科室 */
  readonly department: string;
  /** 接诊医生ID */
  readonly doctorId: string;
  /** 接诊医生姓名 */
  readonly doctorName: string;
  /** 就诊状态 */
  readonly status: EncounterStatus;
  /** 主诉 */
  readonly chiefComplaint?: string;
  /** 初步诊断 */
  readonly preliminaryDiagnosis?: string;
  /** 就诊开始时间 */
  readonly startTime: string;
  /** 就诊结束时间 */
  readonly endTime?: string;
  /** 床号（住院患者） */
  readonly bedNo?: string;
}

/**
 * 就诊完整信息
 */
export interface Encounter extends EncounterSummary {
  /** 现病史 */
  readonly presentIllness?: string;
  /** 既往史摘要 */
  readonly pastHistorySummary?: string;
  /** 体格检查 */
  readonly physicalExam?: string;
  /** 辅助检查摘要 */
  readonly auxiliaryExamSummary?: string;
  /** 最终诊断 */
  readonly finalDiagnosis?: string;
  /** 诊疗计划 */
  readonly treatmentPlan?: string;
  /** 就诊费用（分） */
  readonly totalCost?: number;
  /** 医保结算状态 */
  readonly insuranceSettled?: boolean;
}

// ============================================================
// 电子病历
// ============================================================

/** 病历类型 */
export type MedicalRecordType =
  | 'outpatient_note' // 门诊病历
  | 'progress_note' // 病程记录
  | 'admission_note' // 入院记录
  | 'discharge_summary' // 出院小结
  | 'operation_note' // 手术记录
  | 'anesthesia_note' // 麻醉记录
  | 'consultation_note' // 会诊记录
  | 'emergency_note' // 急诊病历
  | 'nursing_note' // 护理记录
  | 'death_note' // 死亡记录
  | 'other'; // 其他

/** 病历状态 */
export type MedicalRecordStatus =
  | 'draft' // 草稿
  | 'pending_review' // 待审核
  | 'signed' // 已签名
  | 'amended' // 已修改
  | 'cancelled'; // 已作废

/**
 * 电子病历记录
 */
export interface MedicalRecord {
  /** 病历唯一ID */
  readonly recordId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId: string;
  /** 病历类型 */
  readonly recordType: MedicalRecordType;
  /** 病历标题 */
  readonly title: string;
  /** 病历正文内容 */
  readonly content: string;
  /** 结构化数据（JSON格式，用于特定病历类型） */
  readonly structuredData?: Record<string, unknown>;
  /** 病历状态 */
  readonly status: MedicalRecordStatus;
  /** 创建医生ID */
  readonly creatorId: string;
  /** 创建医生姓名 */
  readonly creatorName: string;
  /** 创建时间 */
  readonly createdAt: string;
  /** 最后修改时间 */
  readonly updatedAt: string;
  /** 签名时间 */
  readonly signedAt?: string;
  /** 签名医生ID */
  readonly signerId?: string;
  /** 上级审核医生ID */
  readonly reviewerId?: string;
  /** 审核时间 */
  readonly reviewedAt?: string;
}

// ============================================================
// 医嘱与处方
// ============================================================

/** 医嘱类型 */
export type OrderType =
  | 'medication' // 药物医嘱
  | 'lab_test' // 检验医嘱
  | 'imaging' // 影像检查医嘱
  | 'treatment' // 治疗医嘱
  | 'procedure' // 操作医嘱
  | 'surgery' // 手术医嘱
  | 'nursing' // 护理医嘱
  | 'diet' // 饮食医嘱
  | 'consultation' // 会诊医嘱
  | 'other'; // 其他

/** 医嘱状态 */
export type OrderStatus =
  | 'draft' // 草稿
  | 'ordered' // 已开具
  | 'verified' // 已审核
  | 'in_progress' // 执行中
  | 'completed' // 已完成
  | 'cancelled' // 已取消
  | 'discontinued'; // 已停止

/** 医嘱频次 */
export type OrderFrequency =
  | 'stat' // 立即
  | 'once' // 一次
  | 'qd' // 每日一次
  | 'bid' // 每日两次
  | 'tid' // 每日三次
  | 'qid' // 每日四次
  | 'q4h' // 每4小时
  | 'q6h' // 每6小时
  | 'q8h' // 每8小时
  | 'q12h' // 每12小时
  | 'prn' // 必要时
  | 'sos' // 需要时（一次）
  | 'weekly' // 每周
  | 'monthly'; // 每月

/**
 * 医嘱
 */
export interface Order {
  /** 医嘱唯一ID */
  readonly orderId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId: string;
  /** 医嘱类型 */
  readonly orderType: OrderType;
  /** 医嘱内容描述 */
  readonly content: string;
  /** 医嘱详情（结构化） */
  readonly details?: Record<string, unknown>;
  /** 医嘱状态 */
  readonly status: OrderStatus;
  /** 开嘱医生ID */
  readonly orderingDoctorId: string;
  /** 开嘱医生姓名 */
  readonly orderingDoctorName: string;
  /** 开嘱时间 */
  readonly orderedAt: string;
  /** 审核医生ID（护士审核或药师审核） */
  readonly verifierId?: string;
  /** 审核时间 */
  readonly verifiedAt?: string;
  /** 开始时间 */
  readonly startTime?: string;
  /** 结束时间 */
  readonly endTime?: string;
  /** 频次 */
  readonly frequency?: OrderFrequency;
  /** 疗程天数 */
  readonly durationDays?: number;
  /** 备注 */
  readonly notes?: string;
}

/** 处方状态 */
export type PrescriptionStatus =
  | 'draft' // 草稿
  | 'pending_review' // 待审核
  | 'verified' // 已审核
  | 'dispensed' // 已调配
  | 'administered' // 已执行
  | 'cancelled' // 已取消
  | 'expired'; // 已过期

/** 处方药品条目 */
export interface PrescriptionItem {
  /** 药品通用名 */
  drugName: string;
  /** 药品规格 */
  specification: string;
  /** 剂量 */
  dosage: string;
  /** 用法 */
  usage: string;
  /** 频次 */
  frequency: OrderFrequency;
  /** 数量 */
  quantity: number;
  /** 单位 */
  unit: string;
  /** 疗程天数 */
  durationDays?: number;
  /** 备注 */
  notes?: string;
}

/**
 * 处方
 */
export interface Prescription {
  /** 处方唯一ID */
  readonly prescriptionId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId: string;
  /** 处方类型 */
  readonly prescriptionType: 'normal' | 'special' | 'narcotic' | 'psychiatric' | 'toxic';
  /** 药品列表 */
  readonly items: readonly PrescriptionItem[];
  /** 处方状态 */
  readonly status: PrescriptionStatus;
  /** 开方医生ID */
  readonly prescribingDoctorId: string;
  /** 开方医生姓名 */
  readonly prescribingDoctorName: string;
  /** 开方时间 */
  readonly prescribedAt: string;
  /** 审核药师ID */
  readonly reviewingPharmacistId?: string;
  /** 审核时间 */
  readonly reviewedAt?: string;
  /** 调配药师ID */
  readonly dispensingPharmacistId?: string;
  /** 调配时间 */
  readonly dispensedAt?: string;
  /** 临床诊断 */
  readonly clinicalDiagnosis?: string;
  /** 过敏提示 */
  readonly allergyWarning?: string;
  /** 药物相互作用提示 */
  readonly interactionWarning?: string;
  /** 总金额（分） */
  readonly totalCost?: number;
}

// ============================================================
// 检验检查
// ============================================================

/** 检验结果状态 */
export type LabResultStatus =
  | 'pending' // 待检验
  | 'in_progress' // 检验中
  | 'completed' // 已完成
  | 'critical' // 危急值
  | 'cancelled'; // 已取消

/** 检验结果项异常标识 */
export type LabAbnormalFlag =
  | 'normal' // 正常
  | 'high' // 偏高
  | 'low' // 偏低
  | 'critical_high' // 危急高
  | 'critical_low' // 危急低
  | 'positive' // 阳性
  | 'negative'; // 阴性

/**
 * 检验结果单项
 */
export interface LabResultItem {
  /** 检验项目编码（LOINC） */
  readonly testCode: string;
  /** 检验项目名称 */
  readonly testName: string;
  /** 检验结果值 */
  readonly value: string;
  /** 单位 */
  readonly unit?: string;
  /** 参考范围 */
  readonly referenceRange?: string;
  /** 参考下限 */
  readonly referenceLow?: number;
  /** 参考上限 */
  readonly referenceHigh?: number;
  /** 异常标识 */
  readonly abnormalFlag: LabAbnormalFlag;
  /** 是否危急值 */
  readonly isCritical: boolean;
  /** 检验方法 */
  readonly method?: string;
  /** 标本类型 */
  readonly specimenType?: string;
  /** 备注 */
  readonly notes?: string;
}

/**
 * 检验报告
 */
export interface LabResult {
  /** 检验报告唯一ID */
  readonly labResultId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId: string;
  /** 检验申请单ID */
  readonly orderId?: string;
  /** 检验类别（生化、血常规、免疫等） */
  readonly category: string;
  /** 检验项目列表 */
  readonly items: readonly LabResultItem[];
  /** 检验状态 */
  readonly status: LabResultStatus;
  /** 送检科室 */
  readonly orderingDepartment?: string;
  /** 送检医生 */
  readonly orderingDoctor?: string;
  /** 检验科室 */
  readonly labDepartment: string;
  /** 检验技师 */
  readonly labTechnician?: string;
  /** 审核医生 */
  readonly reviewerDoctor?: string;
  /** 采样时间 */
  readonly sampledAt?: string;
  /** 接收时间 */
  readonly receivedAt?: string;
  /** 报告时间 */
  readonly reportedAt: string;
  /** 临床诊断 */
  readonly clinicalDiagnosis?: string;
  /** 报告备注 */
  readonly reportNotes?: string;
}

/** 影像检查类型 */
export type ImagingType =
  | 'xray' // X线
  | 'ct' // CT
  | 'mri' // MRI
  | 'ultrasound' // 超声
  | 'nuclear' // 核医学
  | 'interventional' // 介入放射
  | 'mammography' // 乳腺钼靶
  | 'fluoroscopy' // 透视
  | 'other'; // 其他

/** 影像结果状态 */
export type ImagingResultStatus =
  | 'scheduled' // 已预约
  | 'in_progress' // 检查中
  | 'completed' // 已完成
  | 'reported' // 已出报告
  | 'critical' // 危急
  | 'cancelled'; // 已取消

/**
 * 影像检查报告
 */
export interface ImagingResult {
  /** 影像报告唯一ID */
  readonly imagingResultId: string;
  /** 关联患者ID */
  readonly patientId: string;
  /** 关联就诊ID */
  readonly encounterId: string;
  /** 检查申请单ID */
  readonly orderId?: string;
  /** 影像检查类型 */
  readonly imagingType: ImagingType;
  /** 检查部位 */
  readonly bodyPart: string;
  /** 检查项目名称 */
  readonly studyName: string;
  /** 影像所见 */
  readonly findings: string;
  /** 影像诊断/印象 */
  readonly impression: string;
  /** 检查状态 */
  readonly status: ImagingResultStatus;
  /** 是否危急 */
  readonly isCritical: boolean;
  /** 检查科室 */
  readonly department: string;
  /** 检查技师 */
  readonly technician?: string;
  /** 报告医生 */
  readonly reportingDoctor: string;
  /** 审核医生 */
  readonly reviewerDoctor?: string;
  /** 检查时间 */
  readonly examinedAt: string;
  /** 报告时间 */
  readonly reportedAt?: string;
  /** DICOM Study Instance UID */
  readonly dicomStudyUid?: string;
  /** 影像数量 */
  readonly imageCount?: number;
  /** 临床诊断 */
  readonly clinicalDiagnosis?: string;
  /** 建议 */
  readonly recommendation?: string;
}

// ============================================================
// 会话与消息
// ============================================================

/** 医疗会话类型 */
export type MedicalSessionType =
  | 'outpatient_consultation' // 门诊问诊
  | 'ward_round' // 查房记录
  | 'multidisciplinary_consultation' // 会诊讨论
  | 'record_quality_control' // 病历质控
  | 'teaching_training' // 教学培训
  | 'research_analysis' // 科研分析
  | 'emergency' // 急诊
  | 'admin'; // 管理操作

/** 会话状态 */
export type MedicalSessionStatus =
  | 'active' // 活跃
  | 'paused' // 暂停
  | 'completed' // 已完成
  | 'archived'; // 已归档

/** 消息角色 */
export type MessageRole =
  | 'user' // 用户
  | 'assistant' // 智能体
  | 'tool' // 工具结果
  | 'system'; // 系统

/**
 * 医疗会话消息
 */
export interface MedicalMessage {
  /** 消息唯一ID */
  readonly messageId: string;
  /** 消息角色 */
  readonly role: MessageRole;
  /** 消息内容 */
  readonly content: string;
  /** 工具调用列表（assistant消息） */
  readonly toolCalls?: readonly ToolCallReference[];
  /** 工具执行结果列表（tool消息） */
  readonly toolResults?: readonly ToolResultReference[];
  /** 时间戳 */
  readonly timestamp: number;
  /** Token使用量 */
  readonly tokens?: {
    input: number;
    output: number;
  };
  /** 审计日志引用 */
  readonly auditRef?: string;
  /** 消息元数据 */
  readonly metadata?: Record<string, unknown>;
}

/** 工具调用引用（消息中存储的轻量引用） */
export interface ToolCallReference {
  /** 工具调用ID */
  callId: string;
  /** 工具名称 */
  toolName: string;
  /** 输入参数 */
  input: Record<string, unknown>;
}

/** 工具结果引用（消息中存储的轻量引用） */
export interface ToolResultReference {
  /** 关联的工具调用ID */
  callId: string;
  /** 工具名称 */
  toolName: string;
  /** 是否成功 */
  success: boolean;
  /** 结果摘要 */
  summary: string;
}

/**
 * 医疗会话
 *
 * 表示一次完整的医疗智能体会话，包含消息历史和上下文状态。
 */
export interface MedicalSession {
  /** 会话唯一ID */
  readonly sessionId: string;
  /** 会话类型 */
  readonly sessionType: MedicalSessionType;
  /** 关联患者ID */
  readonly patientId?: string;
  /** 关联就诊ID */
  readonly encounterId?: string;
  /** 创建用户ID */
  readonly userId: string;
  /** 所属科室 */
  readonly department: string;
  /** 会话标题（自动生成） */
  readonly title: string;
  /** 会话状态 */
  readonly status: MedicalSessionStatus;
  /** 创建时间 */
  readonly createdAt: number;
  /** 最后更新时间 */
  readonly updatedAt: number;
  /** 完成时间 */
  readonly completedAt?: number;
  /** 消息列表（分页加载，此处为当前页） */
  readonly messages: readonly MedicalMessage[];
  /** 会话上下文快照 */
  readonly context?: Record<string, unknown>;
  /** 会话元数据（标签、评分等） */
  readonly metadata?: Record<string, unknown>;
  /** 总消息数 */
  readonly totalMessages: number;
  /** 总Token使用量 */
  readonly totalTokens: number;
}
