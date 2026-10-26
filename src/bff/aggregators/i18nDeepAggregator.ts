/**
 * 健澜科技 jlmedaios - 多语言深化 · 英文界面完善聚合器（M158-A）
 *
 * v4.x近期：在 M151-C 轻量字典之上，把英文界面补齐到生产可用：
 *   - 导航菜单 15+ 项、按钮文案 30+ 条、表单标签 50+ 条、
 *     医疗术语 30+ 条、错误提示 25+ 条、通知消息 18+ 条；
 *   - 医疗英文使用专业术语（Chief Complaint / HPI / PMH / SpO₂ / NRS …），
 *     杜绝 "main complain"、"blood pressure high" 之类机翻腔；
 *   - 英文覆盖率按分类统计，SLA 阈值 80%。
 *
 * 三个纯函数（不触 DB / 不触 LLM / 不触网络，结果可复现、可单测）：
 *   - getI18nTranslation(key, locale, params?): string
 *       按命名空间 key 取文案，带 {{param}} 插值；回退链
 *       目标语言 → 默认语言(zh-CN) → key 本身（界面永不渲染 undefined）。
 *   - autoTranslateBatch(keys, targetLocale): TranslatedMap
 *       批量确定性翻译：目标语言已有译文则幂等返回；否则取 zh-CN 原文，
 *       套用内置短语对照表做替换（长短语优先，避免子串抢命中）。
 *   - checkTranslationCompleteness(locale): Completeness
 *       以 zh-CN 为基准，统计目标语言整体覆盖率与分类覆盖率，
 *       输出 missing key 列表与是否达成 80% SLA。
 *
 * 本切片纯函数 + 路由 + 前端，不写 SQL、不新增表。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 通用插值参数 */
export type I18nDeepParams = Record<string, string | number>;

/** 翻译分类（用于完整性报告分组） */
export type I18nCategory =
  | 'navigation'
  | 'actions'
  | 'form'
  | 'medical'
  | 'errors'
  | 'notifications'
  | 'common';

/** autoTranslateBatch 返回结构 */
export type TranslatedMap = Record<string, string>;

/** 单分类完整性 */
export interface CategoryCompleteness {
  category: I18nCategory;
  label: string;
  total: number;
  translated: number;
  missing: number;
  coverage: number; // 0-100
}

/** checkTranslationCompleteness 返回结构 */
export interface Completeness {
  locale: string;
  defaultLocale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coverage: number; // 0-100
  slaThreshold: number; // 默认 80
  meetsSla: boolean;
  categories: CategoryCompleteness[];
  missing: string[];
}

/** 默认（回退）语言 */
export const DEEP_DEFAULT_LOCALE = 'zh-CN';

/** 英文覆盖 SLA：≥80% */
export const DEEP_SLA_THRESHOLD = 80;

/* ------------------------------------------------------------------ */
/* 内置深度字典：分类元数据                                            */
/* ------------------------------------------------------------------ */

const CATEGORY_LABEL: Record<I18nCategory, string> = {
  navigation: 'Navigation Menu',
  actions: 'Action Buttons',
  form: 'Form Labels',
  medical: 'Medical Terminology',
  errors: 'Error Messages',
  notifications: 'Notifications',
  common: 'Common Phrases',
};

/**
 * 深度字典：zh-CN 为基准语言；en-US 为专业医学英文。
 * key 命名空间即分类前缀：nav.* / action.* / form.* / medical.* / error.* / notification.* / common.*
 */
const DEEP_ZH: Record<string, string> = {
  /* ---- 导航菜单（15 项） ---- */
  'nav.dashboard': '工作台',
  'nav.patient': '患者管理',
  'nav.order': '医嘱管理',
  'nav.pharmacy': '药房管理',
  'nav.lab': '检验检查',
  'nav.imaging': '影像中心',
  'nav.nursing': '护理工作站',
  'nav.surgery': '手术麻醉',
  'nav.emergency': '急诊分诊',
  'nav.billing': '收费结算',
  'nav.aiAssistant': 'AI 助理',
  'nav.notifications': '消息通知',
  'nav.reports': '报表中心',
  'nav.admin': '系统管理',
  'nav.settings': '个人设置',

  /* ---- 按钮文案（32 条） ---- */
  'action.save': '保存',
  'action.cancel': '取消',
  'action.confirm': '确认',
  'action.submit': '提交',
  'action.delete': '删除',
  'action.edit': '编辑',
  'action.add': '新增',
  'action.search': '查询',
  'action.reset': '重置',
  'action.export': '导出',
  'action.import': '导入',
  'action.print': '打印',
  'action.close': '关闭',
  'action.back': '返回',
  'action.next': '下一步',
  'action.previous': '上一步',
  'action.refresh': '刷新',
  'action.view': '查看',
  'action.approve': '审核通过',
  'action.reject': '驳回',
  'action.acknowledge': '确认知悉',
  'action.refer': '转诊',
  'action.transfer': '转科',
  'action.discharge': '办理出院',
  'action.admit': '办理入院',
  'action.schedule': '安排排班',
  'action.assign': '分配',
  'action.revoke': '撤销',
  'action.upload': '上传',
  'action.download': '下载',
  'action.sign': '电子签名',
  'action.followUp': '发起随访',

  /* ---- 表单标签（52 条） ---- */
  'form.patient.name': '患者姓名',
  'form.patient.mrn': '病历号',
  'form.patient.gender': '性别',
  'form.patient.age': '年龄',
  'form.patient.dob': '出生日期',
  'form.patient.phone': '联系电话',
  'form.patient.address': '家庭住址',
  'form.patient.idNumber': '身份证号',
  'form.patient.emergencyContact': '紧急联系人',
  'form.patient.bloodType': '血型',
  'form.patient.allergies': '过敏史',
  'form.patient.occupation': '职业',
  'form.patient.maritalStatus': '婚姻状况',

  'form.visit.dept': '就诊科室',
  'form.visit.doctor': '接诊医师',
  'form.visit.reason': '就诊原因',
  'form.visit.chiefComplaint': '主诉',
  'form.visit.hpi': '现病史',
  'form.visit.pmh': '既往史',
  'form.visit.familyHistory': '家族史',
  'form.visit.personalHistory': '个人史',
  'form.visit.medications': '当前用药',
  'form.visit.vitals': '生命体征',

  'form.order.type': '医嘱类型',
  'form.order.diagnosis': '临床诊断',
  'form.order.drug': '药品名称',
  'form.order.dosage': '单次剂量',
  'form.order.frequency': '给药频次',
  'form.order.route': '给药途径',
  'form.order.duration': '疗程',
  'form.order.instructions': '用药指导',
  'form.order.startTime': '开始时间',
  'form.order.endTime': '结束时间',

  'form.appointment.date': '预约日期',
  'form.appointment.time': '预约时段',
  'form.appointment.type': '预约类型',
  'form.appointment.clinic': '就诊院区',
  'form.appointment.notes': '备注说明',

  'form.nursing.temperature': '体温 (℃)',
  'form.nursing.bloodPressure': '血压 (mmHg)',
  'form.nursing.heartRate': '心率 (次/分)',
  'form.nursing.respiratoryRate': '呼吸 (次/分)',
  'form.nursing.oxygenSaturation': '血氧饱和度 (%)',
  'form.nursing.weight': '体重 (kg)',
  'form.nursing.height': '身高 (cm)',
  'form.nursing.painScore': '疼痛评分 (NRS 0-10)',

  'form.discharge.primaryDiagnosis': '出院主要诊断',
  'form.discharge.summary': '出院小结',
  'form.discharge.followUpDate': '随访日期',
  'form.discharge.dischargeDate': '出院日期',

  'form.login.username': '工号 / 手机号',
  'form.login.password': '登录密码',
  'form.login.role': '角色',
  'form.login.tenant': '院区',

  /* ---- 医疗术语（32 条） ---- */
  'medical.chiefComplaint': '主诉',
  'medical.hpi': '现病史',
  'medical.pmh': '既往史',
  'medical.familyHistory': '家族史',
  'medical.allergyHistory': '过敏史',
  'medical.physicalExam': '体格检查',
  'medical.differentialDiagnosis': '鉴别诊断',
  'medical.icd10': 'ICD-10 诊断编码',
  'medical.prescription': '处方',
  'medical.dosage': '单次剂量',
  'medical.route': '给药途径',
  'medical.frequency': '给药频次',
  'medical.duration': '疗程',
  'medical.genericName': '药品通用名',
  'medical.tradeName': '商品名',
  'medical.penicillinAllergy': '青霉素过敏',
  'medical.sulfaAllergy': '磺胺类过敏',
  'medical.vitalSigns': '生命体征',
  'medical.bloodPressure': '血压',
  'medical.heartRate': '心率',
  'medical.temperature': '体温',
  'medical.respiratoryRate': '呼吸频率',
  'medical.oxygenSaturation': '血氧饱和度',
  'medical.bodyMassIndex': '体重指数 (BMI)',
  'medical.triage': '急诊分诊',
  'medical.emergencyDept': '急诊科',
  'medical.inpatient': '住院患者',
  'medical.outpatient': '门诊患者',
  'medical.icu': '重症监护室 (ICU)',
  'medical.operatingRoom': '手术室 (OR)',
  'medical.pacu': '麻醉后恢复室 (PACU)',
  'medical.criticalValue': '危急值',

  /* ---- 错误提示（26 条） ---- */
  'error.network': '网络异常，请稍后重试',
  'error.timeout': '请求超时，请稍后重试',
  'error.server': '服务器内部错误',
  'error.unauthorized': '登录已过期，请重新登录',
  'error.forbidden': '您没有该操作的权限',
  'error.notFound': '请求的资源不存在',
  'error.validation': '提交内容校验未通过',
  'error.requiredField': '必填项未填写',
  'error.invalidFormat': '格式不正确',
  'error.invalidDate': '日期格式不正确',
  'error.invalidPhone': '手机号格式不正确',
  'error.invalidIdNumber': '身份证号格式不正确',
  'error.invalidAmount': '金额格式不正确',
  'error.conflict': '数据冲突，请刷新后重试',
  'error.rateLimited': '请求过于频繁，请稍后再试',
  'error.maintenance': '系统维护中，暂不可用',
  'error.dependency': '依赖服务暂不可用',
  'error.dataIntegrity': '数据完整性校验失败',
  'error.sessionExpired': '会话已失效，请重新登录',
  'error.tokenInvalid': '访问凭证无效',
  'error.tooManyRequests': '操作过于频繁',
  'error.patientNotFound': '未找到该患者',
  'error.orderNotFound': '未找到该医嘱',
  'error.doctorNotFound': '未找到该医师',
  'error.scheduleConflict': '排班时间冲突',
  'error.inventoryInsufficient': '药品库存不足',

  /* ---- 通知消息（18 条） ---- */
  'notification.welcome': '欢迎使用健澜AI原生医院操作系统OS',
  'notification.appointmentReminder': '您有一条预约就诊提醒',
  'notification.appointmentConfirmed': '预约已确认',
  'notification.appointmentCancelled': '预约已取消',
  'notification.prescriptionReady': '处方已开具，请前往药房取药',
  'notification.labResultReady': '您的检验报告已出具',
  'notification.imagingResultReady': '您的影像报告已出具',
  'notification.billingNotice': '您有一笔待结算费用',
  'notification.dischargeSummary': '出院小结已生成',
  'notification.followUpReminder': '您有一条术后随访提醒',
  'notification.criticalValue': '出现危急值，请立即处理',
  'notification.medicationReminder': '请按时服药',
  'notification.visitReminder': '明日就诊提醒',
  'notification.systemUpdate': '系统已完成版本更新',
  'notification.passwordChanged': '您的密码已修改',
  'notification.accountLocked': '账号因多次登录失败已锁定',
  'notification.roleAssigned': '您已被分配新角色',
  'notification.messageReceived': '您收到一条新消息',

  /* ---- 通用短语（8 条） ---- */
  'common.loading': '加载中…',
  'common.confirm': '确定',
  'common.cancel': '取消',
  'common.welcome': '欢迎，{{name}}',
  'common.empty': '暂无数据',
  'common.success': '操作成功',
  'common.failed': '操作失败',
  'common.searchPlaceholder': '请输入关键字查询',
};

/** 专业医学英文（M158-A：杜绝机翻腔） */
const DEEP_EN: Record<string, string> = {
  /* ---- Navigation ---- */
  'nav.dashboard': 'Dashboard',
  'nav.patient': 'Patient Management',
  'nav.order': 'Orders',
  'nav.pharmacy': 'Pharmacy',
  'nav.lab': 'Laboratory & Tests',
  'nav.imaging': 'Imaging Center',
  'nav.nursing': 'Nursing Station',
  'nav.surgery': 'Surgery & Anesthesia',
  'nav.emergency': 'Emergency Triage',
  'nav.billing': 'Billing & Settlement',
  'nav.aiAssistant': 'AI Assistant',
  'nav.notifications': 'Notifications',
  'nav.reports': 'Reports Center',
  'nav.admin': 'Administration',
  'nav.settings': 'Settings',

  /* ---- Action Buttons ---- */
  'action.save': 'Save',
  'action.cancel': 'Cancel',
  'action.confirm': 'Confirm',
  'action.submit': 'Submit',
  'action.delete': 'Delete',
  'action.edit': 'Edit',
  'action.add': 'Add New',
  'action.search': 'Search',
  'action.reset': 'Reset',
  'action.export': 'Export',
  'action.import': 'Import',
  'action.print': 'Print',
  'action.close': 'Close',
  'action.back': 'Back',
  'action.next': 'Next',
  'action.previous': 'Previous',
  'action.refresh': 'Refresh',
  'action.view': 'View',
  'action.approve': 'Approve',
  'action.reject': 'Reject',
  'action.acknowledge': 'Acknowledge',
  'action.refer': 'Refer',
  'action.transfer': 'Transfer',
  'action.discharge': 'Discharge',
  'action.admit': 'Admit',
  'action.schedule': 'Schedule',
  'action.assign': 'Assign',
  'action.revoke': 'Revoke',
  'action.upload': 'Upload',
  'action.download': 'Download',
  'action.sign': 'e-Sign',
  'action.followUp': 'Start Follow-up',

  /* ---- Form Labels ---- */
  'form.patient.name': 'Patient Name',
  'form.patient.mrn': 'Medical Record No. (MRN)',
  'form.patient.gender': 'Sex',
  'form.patient.age': 'Age',
  'form.patient.dob': 'Date of Birth (DOB)',
  'form.patient.phone': 'Contact Number',
  'form.patient.address': 'Home Address',
  'form.patient.idNumber': 'National ID No.',
  'form.patient.emergencyContact': 'Emergency Contact',
  'form.patient.bloodType': 'Blood Type',
  'form.patient.allergies': 'Allergy History',
  'form.patient.occupation': 'Occupation',
  'form.patient.maritalStatus': 'Marital Status',

  'form.visit.dept': 'Department',
  'form.visit.doctor': 'Attending Physician',
  'form.visit.reason': 'Reason for Visit',
  'form.visit.chiefComplaint': 'Chief Complaint',
  'form.visit.hpi': 'History of Present Illness (HPI)',
  'form.visit.pmh': 'Past Medical History (PMH)',
  'form.visit.familyHistory': 'Family History',
  'form.visit.personalHistory': 'Personal History',
  'form.visit.medications': 'Current Medications',
  'form.visit.vitals': 'Vital Signs',

  'form.order.type': 'Order Type',
  'form.order.diagnosis': 'Clinical Diagnosis',
  'form.order.drug': 'Medication',
  'form.order.dosage': 'Single Dose',
  'form.order.frequency': 'Frequency',
  'form.order.route': 'Route of Administration',
  'form.order.duration': 'Duration of Therapy',
  'form.order.instructions': 'Administration Instructions',
  'form.order.startTime': 'Start Time',
  'form.order.endTime': 'End Time',

  'form.appointment.date': 'Appointment Date',
  'form.appointment.time': 'Time Slot',
  'form.appointment.type': 'Appointment Type',
  'form.appointment.clinic': 'Campus / Clinic',
  'form.appointment.notes': 'Notes',

  'form.nursing.temperature': 'Temperature (℃)',
  'form.nursing.bloodPressure': 'Blood Pressure (mmHg)',
  'form.nursing.heartRate': 'Heart Rate (bpm)',
  'form.nursing.respiratoryRate': 'Respiratory Rate (rpm)',
  'form.nursing.oxygenSaturation': 'SpO₂ (%)',
  'form.nursing.weight': 'Weight (kg)',
  'form.nursing.height': 'Height (cm)',
  'form.nursing.painScore': 'Pain Score (NRS 0–10)',

  'form.discharge.primaryDiagnosis': 'Primary Discharge Diagnosis',
  'form.discharge.summary': 'Discharge Summary',
  'form.discharge.followUpDate': 'Follow-up Date',
  'form.discharge.dischargeDate': 'Discharge Date',

  'form.login.username': 'Staff ID / Mobile No.',
  'form.login.password': 'Password',
  'form.login.role': 'Role',
  'form.login.tenant': 'Campus',

  /* ---- Medical Terminology (professional) ---- */
  'medical.chiefComplaint': 'Chief Complaint',
  'medical.hpi': 'History of Present Illness (HPI)',
  'medical.pmh': 'Past Medical History (PMH)',
  'medical.familyHistory': 'Family History',
  'medical.allergyHistory': 'Allergy History',
  'medical.physicalExam': 'Physical Examination',
  'medical.differentialDiagnosis': 'Differential Diagnosis',
  'medical.icd10': 'ICD-10 Diagnosis Code',
  'medical.prescription': 'Prescription',
  'medical.dosage': 'Single Dose',
  'medical.route': 'Route of Administration',
  'medical.frequency': 'Frequency',
  'medical.duration': 'Duration of Therapy',
  'medical.genericName': 'Generic Name',
  'medical.tradeName': 'Brand Name',
  'medical.penicillinAllergy': 'Penicillin Allergy',
  'medical.sulfaAllergy': 'Sulfonamide Allergy',
  'medical.vitalSigns': 'Vital Signs',
  'medical.bloodPressure': 'Blood Pressure',
  'medical.heartRate': 'Heart Rate',
  'medical.temperature': 'Body Temperature',
  'medical.respiratoryRate': 'Respiratory Rate',
  'medical.oxygenSaturation': 'Oxygen Saturation (SpO₂)',
  'medical.bodyMassIndex': 'Body Mass Index (BMI)',
  'medical.triage': 'Triage',
  'medical.emergencyDept': 'Emergency Department (ED)',
  'medical.inpatient': 'Inpatient',
  'medical.outpatient': 'Outpatient',
  'medical.icu': 'Intensive Care Unit (ICU)',
  'medical.operatingRoom': 'Operating Room (OR)',
  'medical.pacu': 'Post-Anesthesia Care Unit (PACU)',
  'medical.criticalValue': 'Critical (Panic) Value',

  /* ---- Error Messages ---- */
  'error.network': 'Network error, please try again later',
  'error.timeout': 'Request timed out, please try again later',
  'error.server': 'Internal server error',
  'error.unauthorized': 'Session expired, please sign in again',
  'error.forbidden': 'You do not have permission for this action',
  'error.notFound': 'The requested resource was not found',
  'error.validation': 'Validation failed for the submitted content',
  'error.requiredField': 'Required field is missing',
  'error.invalidFormat': 'Invalid format',
  'error.invalidDate': 'Invalid date format',
  'error.invalidPhone': 'Invalid mobile number format',
  'error.invalidIdNumber': 'Invalid national ID number format',
  'error.invalidAmount': 'Invalid amount format',
  'error.conflict': 'Data conflict, please refresh and try again',
  'error.rateLimited': 'Too many requests, please try again later',
  'error.maintenance': 'System under maintenance, temporarily unavailable',
  'error.dependency': 'A dependent service is temporarily unavailable',
  'error.dataIntegrity': 'Data integrity check failed',
  'error.sessionExpired': 'Session expired, please sign in again',
  'error.tokenInvalid': 'Invalid access token',
  'error.tooManyRequests': 'Operation rate exceeded',
  'error.patientNotFound': 'Patient not found',
  'error.orderNotFound': 'Order not found',
  'error.doctorNotFound': 'Physician not found',
  'error.scheduleConflict': 'Schedule conflict',
  'error.inventoryInsufficient': 'Insufficient drug inventory',

  /* ---- Notifications ---- */
  'notification.welcome': 'Welcome to the Jianlan Digital Hospital Platform',
  'notification.appointmentReminder': 'You have an upcoming appointment reminder',
  'notification.appointmentConfirmed': 'Your appointment has been confirmed',
  'notification.appointmentCancelled': 'Your appointment has been cancelled',
  'notification.prescriptionReady': 'Prescription issued, please collect it at the pharmacy',
  'notification.labResultReady': 'Your laboratory report is now available',
  'notification.imagingResultReady': 'Your imaging report is now available',
  'notification.billingNotice': 'You have a pending balance to be settled',
  'notification.dischargeSummary': 'Your discharge summary has been generated',
  'notification.followUpReminder': 'You have a post-discharge follow-up reminder',
  'notification.criticalValue': 'Critical value detected, please attend immediately',
  'notification.medicationReminder': 'Please take your medication as prescribed',
  'notification.visitReminder': 'Reminder: your visit is scheduled for tomorrow',
  'notification.systemUpdate': 'The system has been updated to a new version',
  'notification.passwordChanged': 'Your password has been changed',
  'notification.accountLocked': 'Account locked due to repeated failed sign-in attempts',
  'notification.roleAssigned': 'A new role has been assigned to you',
  'notification.messageReceived': 'You have received a new message',

  /* ---- Common ---- */
  'common.loading': 'Loading…',
  'common.confirm': 'OK',
  'common.cancel': 'Cancel',
  'common.welcome': 'Welcome, {{name}}',
  'common.empty': 'No data available',
  'common.success': 'Operation succeeded',
  'common.failed': 'Operation failed',
  'common.searchPlaceholder': 'Enter keyword to search',
};

/* ------------------------------------------------------------------ */
/* 进程内注册表（深切片自带，不污染 M151-C 轻量字典）                  */
/* ------------------------------------------------------------------ */

const registry = new Map<string, Map<string, string>>();

function ensureLocale(locale: string): Map<string, string> {
  const normalized = normalizeLocale(locale);
  let m = registry.get(normalized);
  if (!m) {
    m = new Map<string, string>();
    registry.set(normalized, m);
  }
  return m;
}

function seedDeep(): void {
  if (registry.size > 0) return;
  const zh = ensureLocale(DEEP_DEFAULT_LOCALE);
  for (const [k, v] of Object.entries(DEEP_ZH)) zh.set(k, v);
  const en = ensureLocale('en-US');
  for (const [k, v] of Object.entries(DEEP_EN)) en.set(k, v);
}

function normalizeLocale(locale: string): string {
  // 'en_us' / 'EN-US' / 'en-us' 统一为标准 locale（语言小写、地区大写）
  return String(locale || '')
    .trim()
    .replace('_', '-')
    .toLowerCase()
    .replace(/^([a-z]{2})-([a-z]{2})$/, (_m, a: string, b: string) => `${a}-${b.toUpperCase()}`);
}

function categoryOf(key: string): I18nCategory {
  if (key.startsWith('nav.')) return 'navigation';
  if (key.startsWith('action.')) return 'actions';
  if (key.startsWith('form.')) return 'form';
  if (key.startsWith('medical.')) return 'medical';
  if (key.startsWith('error.')) return 'errors';
  if (key.startsWith('notification.')) return 'notifications';
  return 'common';
}

function interpolate(template: string, params?: I18nDeepParams): string {
  if (!params) return template;
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_m, name: string) => {
    const v = params[name];
    return v === undefined || v === null ? '' : String(v);
  });
}

/* ------------------------------------------------------------------ */
/* 内置自动翻译短语对照表（zh-CN → en-US，长短语优先）                 */
/* ------------------------------------------------------------------ */

const AUTO_PHRASES: Record<string, string> = {
  工作台: 'Dashboard',
  患者: 'Patient',
  管理: 'Management',
  医嘱: 'Order',
  药房: 'Pharmacy',
  检验: 'Laboratory',
  检查: 'Test',
  影像: 'Imaging',
  护理: 'Nursing',
  手术: 'Surgery',
  麻醉: 'Anesthesia',
  急诊: 'Emergency',
  分诊: 'Triage',
  收费: 'Billing',
  结算: 'Settlement',
  助理: 'Assistant',
  消息: 'Message',
  通知: 'Notification',
  报表: 'Report',
  系统: 'System',
  设置: 'Settings',
  保存: 'Save',
  取消: 'Cancel',
  确认: 'Confirm',
  提交: 'Submit',
  删除: 'Delete',
  编辑: 'Edit',
  新增: 'Add',
  查询: 'Search',
  重置: 'Reset',
  导出: 'Export',
  导入: 'Import',
  打印: 'Print',
  关闭: 'Close',
  返回: 'Back',
  下一步: 'Next',
  上一步: 'Previous',
  刷新: 'Refresh',
  查看: 'View',
  审核: 'Approve',
  通过: 'Approved',
  驳回: 'Reject',
  转诊: 'Refer',
  转科: 'Transfer',
  出院: 'Discharge',
  入院: 'Admission',
  排班: 'Schedule',
  分配: 'Assign',
  撤销: 'Revoke',
  上传: 'Upload',
  下载: 'Download',
  电子签名: 'e-Sign',
  随访: 'Follow-up',
  网络异常: 'Network error',
  超时: 'Timed out',
  服务器: 'Server',
  登录: 'Sign in',
  权限: 'Permission',
  未找到: 'Not found',
  校验: 'Validation',
  必填: 'Required',
  格式: 'Format',
  日期: 'Date',
  手机号: 'Mobile number',
  身份证号: 'National ID number',
  金额: 'Amount',
  冲突: 'Conflict',
  频繁: 'Too frequent',
  维护: 'Maintenance',
  成功: 'Succeeded',
  失败: 'Failed',
  加载中: 'Loading',
  暂无数据: 'No data',
  请稍后重试: 'please try again later',
};

/* ------------------------------------------------------------------ */
/* 纯函数 API                                                         */
/* ------------------------------------------------------------------ */

/**
 * 翻译查询：命中目标语言 → 回退 zh-CN → 返回 key 本身。
 * 支持 {{param}} 插值。
 */
export function getI18nTranslation(
  key: string,
  locale: string,
  params?: I18nDeepParams,
): string {
  seedDeep();
  const target = normalizeLocale(locale);
  const targetMap = registry.get(target);
  let raw: string | undefined;
  if (targetMap && targetMap.has(key)) {
    raw = targetMap.get(key);
  } else if (target !== DEEP_DEFAULT_LOCALE) {
    const defMap = registry.get(DEEP_DEFAULT_LOCALE);
    if (defMap && defMap.has(key)) raw = defMap.get(key);
  }
  if (raw === undefined) return key;
  return interpolate(raw, params);
}

/**
 * 批量确定性自动翻译。
 * 口径：
 *   1. key 在目标语言已有译文 → 直接返回（幂等）；
 *   2. 否则取 zh-CN 原文，按内置短语表做最长匹配替换；
 *   3. 源语言也没有该 key → 返回 key 本身。
 * 不触 LLM / 不触网络，结果可复现。
 */
export function autoTranslateBatch(
  keys: string[],
  targetLocale: string,
): TranslatedMap {
  seedDeep();
  const tgt = normalizeLocale(targetLocale);
  const tgtMap = registry.get(tgt);
  const srcMap = registry.get(DEEP_DEFAULT_LOCALE);
  const phrases = Object.keys(AUTO_PHRASES).sort((a, b) => b.length - a.length);

  const out: TranslatedMap = {};
  for (const key of keys) {
    if (tgtMap && tgtMap.has(key)) {
      out[key] = tgtMap.get(key) as string;
      continue;
    }
    const srcText = srcMap?.get(key);
    if (!srcText) {
      out[key] = key;
      continue;
    }
    let translated = srcText;
    for (const phrase of phrases) {
      translated = translated.split(phrase).join(AUTO_PHRASES[phrase]);
    }
    out[key] = translated;
  }
  return out;
}

/**
 * 完整性检查：以 zh-CN 为基准，统计目标语言覆盖率。
 * 返回整体覆盖率、分类覆盖率、missing key 列表、是否达成 SLA（≥80%）。
 */
export function checkTranslationCompleteness(locale: string): Completeness {
  seedDeep();
  const target = normalizeLocale(locale);
  const srcMap = registry.get(DEEP_DEFAULT_LOCALE) ?? new Map<string, string>();
  const tgtMap = registry.get(target) ?? new Map<string, string>();

  const missing: string[] = [];
  const catStats = new Map<I18nCategory, { total: number; translated: number }>();

  for (const key of srcMap.keys()) {
    const cat = categoryOf(key);
    const stats = catStats.get(cat) ?? { total: 0, translated: 0 };
    stats.total += 1;
    catStats.set(cat, stats);
    if (tgtMap.has(key)) {
      stats.translated += 1;
    } else {
      missing.push(key);
    }
  }

  const categories: CategoryCompleteness[] = Array.from(catStats.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([category, s]) => ({
      category,
      label: CATEGORY_LABEL[category],
      total: s.total,
      translated: s.translated,
      missing: s.total - s.translated,
      coverage: s.total === 0 ? 100 : Math.round((s.translated / s.total) * 1000) / 10,
    }));

  const totalKeys = srcMap.size;
  const translatedKeys = totalKeys - missing.length;
  const coverage = totalKeys === 0 ? 100 : Math.round((translatedKeys / totalKeys) * 1000) / 10;

  return {
    locale: target,
    defaultLocale: DEEP_DEFAULT_LOCALE,
    totalKeys,
    translatedKeys,
    missingKeys: missing.length,
    coverage,
    slaThreshold: DEEP_SLA_THRESHOLD,
    meetsSla: coverage >= DEEP_SLA_THRESHOLD,
    categories,
    missing: missing.sort(),
  };
}

/** 导出全部 key（供前端管理后台展示） */
export function listDeepKeys(): string[] {
  seedDeep();
  return Array.from(registry.get(DEEP_DEFAULT_LOCALE)?.keys() ?? []).sort();
}

/** 导出某语言整包字典（供 BFF GET 下发） */
export function getDeepBundle(locale: string): Record<string, string> {
  seedDeep();
  const target = normalizeLocale(locale);
  const map = registry.get(target) ?? new Map<string, string>();
  const out: Record<string, string> = {};
  for (const [k, v] of map.entries()) out[k] = v;
  return out;
}
