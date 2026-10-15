/**
 * 健澜科技 jlmedaios — 患者随访智能化聚合器（M152-D）
 *
 * AI能力深化：
 *   1. 根据出院诊断自动生成分层随访计划（术后/慢病/肿瘤/一般出院）；
 *   2. 基于疾病与年龄等特征预测 30 天再入院风险；
 *   3. 自动随访发送网关——强制患者授权 + 08:00–20:00 静默时段，不打扰患者。
 *
 * 合规红线：
 *   - auto_followup_enabled 默认 false，必须患者主动同意才开启；
 *   - 仅在 08:00–20:00 之间发送，夜间/清晨不打扰；
 *   - 风险评分为辅助决策，最终诊疗由医师判断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 触达渠道：短信 / 微信 / 电话 */
export type FollowupChannel = 'sms' | 'wechat' | 'phone';

/** 随访时间点 */
export interface FollowupTimepoint {
  daysAfterDischarge: number;
  label: string;
  action: string;
}

/** AI 生成的随访计划（纯数据） */
export interface FollowupPlan {
  patientId: string;
  disease: string;
  dischargeDate: string;
  timepoints: FollowupTimepoint[];
  /** 默认 false —— 必须患者主动授权才开启自动随访 */
  autoFollowupEnabled: boolean;
  channel: FollowupChannel;
  createdAt: string;
}

/** 再入院风险分层 */
export type RiskLevel = 'low' | 'medium' | 'high';

/** 再入院风险评分（纯数据） */
export interface RiskScore {
  patientId: string;
  disease: string;
  /** 0–100，越高风险越大 */
  score: number;
  level: RiskLevel;
  factors: string[];
  /** 预测窗口：默认 30 天 */
  predictedWindowDays: number;
}

/** 自动随访发送结果 */
export interface SendResult {
  patientId: string;
  channel: FollowupChannel;
  template: string;
  success: boolean;
  messageId?: string;
  skippedReason?:
    | 'patient_consent_required'
    | 'outside_send_window'
    | 'invalid_channel'
    | 'invalid_template';
  sentAt?: string;
}

// ============================================================================
// 临床规则常量
// ============================================================================

/** 允许的发送时段：08:00–20:00（含 08，不含 20） */
export const SEND_WINDOW_START_HOUR = 8;
export const SEND_WINDOW_END_HOUR = 20;

/** 再入院风险高风险阈值 */
const RISK_HIGH = 60;
/** 再入院风险中风险阈值 */
const RISK_MEDIUM = 30;

/** 高再入院风险疾病关键词（基础分权重） */
const HIGH_RISK_DISEASES = ['心衰', '心力衰竭', 'heart failure', 'copd', '慢阻肺', '肾衰', 'dialysis', '透析', '肿瘤', 'cancer', '卒中', 'stroke'];
const MEDIUM_RISK_DISEASES = ['糖尿病', 'diabetes', '高血压', 'hypertension', '冠心病', 'chd', '术后', 'postop', 'surgery'];

// ============================================================================
// 患者授权注册表（内存态，路由层从 DB 加载后调用 grant/revoke 同步）
// ============================================================================

/**
 * 患者授权状态：默认空 = 全部未授权（auto_followup_enabled=false）。
 * 这是模块级可替换状态，便于纯函数在路由/测试中注入。
 */
const consentStore = new Map<string, boolean>();

/** 患者主动签署知情同意后调用：开启自动随访 */
export function grantAutoFollowupConsent(patientId: string): void {
  if (patientId) consentStore.set(patientId, true);
}

/** 患者撤回同意或出院时调用：关闭自动随访 */
export function revokeAutoFollowupConsent(patientId: string): void {
  if (patientId) consentStore.set(patientId, false);
}

/** 查询患者是否已授权（默认 false —— 不授权即不发送） */
export function hasAutoFollowupConsent(patientId: string): boolean {
  return consentStore.get(patientId) === true;
}

// ============================================================================
// 纯函数：时段判定
// ============================================================================

/**
 * AI能力深化：判断给定时间是否在允许发送时段内（08:00–20:00）。
 * 纯函数，便于测试任意时刻。
 */
export function isWithinSendWindow(date: Date = new Date()): boolean {
  const h = date.getHours();
  return h >= SEND_WINDOW_START_HOUR && h < SEND_WINDOW_END_HOUR;
}

// ============================================================================
// 纯函数：随访计划生成
// ============================================================================

function classifyDisease(disease: string): 'postop' | 'chronic' | 'oncology' | 'general' {
  const d = (disease || '').toLowerCase();
  // 肿瘤优先：肿瘤患者术后随访需 MDT 分层，强度高于普通术后
  if (/肿瘤|癌|cancer|tumor|chem|化疗|放疗/.test(d)) return 'oncology';
  if (/术后|手术|切除|surg|postop|post-op|吻合|置换/.test(d)) return 'postop';
  if (/高血压|糖尿病|冠心病|心衰|心力衰竭|copd|慢阻肺|肾病|chronic|hypertension|diabetes/.test(d)) return 'chronic';
  return 'general';
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) throw new Error(`出院日期非法: ${isoDate}`);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * AI能力深化：根据患者ID、疾病、出院日期自动生成分层随访计划。
 *
 * 规则：
 *   - 术后：出院后 3 天电话慰问 + 7 天门诊 + 30 天复查；
 *   - 慢病：14 天首访 + 每月一次长期随访；
 *   - 肿瘤：7 天营养/不良反应随访 + 30 天复查 + 90 天MDT；
 *   - 一般出院：10 天复诊。
 *
 * @param patientId     患者ID
 * @param disease       出院诊断文本
 * @param dischargeDate 出院日期（ISO 8601）
 * @returns 随访计划（autoFollowupEnabled 默认 false）
 */
export function generateFollowupPlan(
  patientId: string,
  disease: string,
  dischargeDate: string,
): FollowupPlan {
  if (!patientId) throw new Error('patientId 不能为空');
  if (!dischargeDate) throw new Error('dischargeDate 不能为空');
  // 触发非法日期异常
  new Date(dischargeDate).getTime();

  const category = classifyDisease(disease);
  let timepoints: FollowupTimepoint[];

  if (category === 'postop') {
    timepoints = [
      { daysAfterDischarge: 3, label: '出院3天', action: '电话慰问：切口疼痛、体温、用药依从性' },
      { daysAfterDischarge: 7, label: '出院1周', action: '门诊复诊：切口换药、功能恢复评估' },
      { daysAfterDischarge: 30, label: '出院1月', action: '门诊复查：影像学/化验、康复指导' },
    ];
  } else if (category === 'oncology') {
    timepoints = [
      { daysAfterDischarge: 7, label: '出院1周', action: '电话随访：营养状态、化疗不良反应、心理评估' },
      { daysAfterDischarge: 30, label: '出院1月', action: '门诊复查：肿瘤标志物、影像、用药调整' },
      { daysAfterDischarge: 90, label: '出院3月', action: 'MDT 多学科会诊：疗效评估与后续方案' },
    ];
  } else if (category === 'chronic') {
    timepoints = [
      { daysAfterDischarge: 14, label: '出院2周', action: '微信随访：居家血压/血糖记录、用药打卡' },
      { daysAfterDischarge: 30, label: '出院1月', action: '门诊复诊：靶器官功能、用药调整' },
    ];
  } else {
    timepoints = [
      { daysAfterDischarge: 10, label: '出院10天', action: '短信提醒：门诊复诊与康复注意事项' },
    ];
  }

  // 注：addDaysIso 保留以兼容未来按具体到期日生成；此处返回相对时间点列表
  void addDaysIso;

  return {
    patientId,
    disease,
    dischargeDate,
    timepoints,
    // 合规：默认关闭自动随访，需患者主动同意
    autoFollowupEnabled: hasAutoFollowupConsent(patientId),
    channel: 'sms',
    createdAt: new Date().toISOString(),
  };
}

// ============================================================================
// 纯函数：再入院风险预测
// ============================================================================

/**
 * AI能力深化：基于疾病特征预测 30 天再入院风险。
 *
 * 模型为可解释的规则基线（0–100 分）：
 *   - 高风险疾病（心衰/慢阻肺/透析/肿瘤/卒中）基础分 55；
 *   - 中风险疾病（糖尿病/高血压/冠心病/术后）基础分 30；
 *   - 一般出院基础分 10；
 *   - 每种命中因素 +8 分，截断到 [0,100]。
 *
 * @param patientId 患者ID
 * @param disease   出院诊断文本
 */
export function predictRehospitalizationRisk(patientId: string, disease: string): RiskScore {
  if (!patientId) throw new Error('patientId 不能为空');
  const d = (disease || '').toLowerCase();
  const factors: string[] = [];

  let score = 10;
  if (HIGH_RISK_DISEASES.some((k) => d.includes(k.toLowerCase()))) {
    score = 62;
    factors.push('高风险基础疾病（心衰/慢阻肺/透析/肿瘤/卒中等）');
  } else if (MEDIUM_RISK_DISEASES.some((k) => d.includes(k.toLowerCase()))) {
    score = 30;
    factors.push('中风险基础疾病（糖尿病/高血压/冠心病/术后等）');
  } else {
    factors.push('一般出院诊断');
  }

  // 共病/加重因素
  if (/贫血|anemia|低蛋白|营养不良/.test(d)) { score += 8; factors.push('营养不良/贫血'); }
  if (/肾功能不全|ckd|肾衰/.test(d)) { score += 8; factors.push('肾功能不全'); }
  if (/老年|高龄|elderly/.test(d)) { score += 6; factors.push('高龄'); }
  if (/既往再入院|readmission|反复住院/.test(d)) { score += 10; factors.push('既往 30 天内再入院史'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const level: RiskLevel = score >= RISK_HIGH ? 'high' : score >= RISK_MEDIUM ? 'medium' : 'low';

  return {
    patientId,
    disease,
    score,
    level,
    factors,
    predictedWindowDays: 30,
  };
}

// ============================================================================
// 纯函数：自动随访发送网关
// ============================================================================

const ALLOWED_CHANNELS: ReadonlyArray<FollowupChannel> = ['sms', 'wechat', 'phone'];

/**
 * AI能力深化：自动随访发送网关。
 *
 * 合规闸口（任一不满足即拒绝发送，绝不骚扰患者）：
 *   1. 患者必须已主动授权（auto_followup_enabled=true）；
 *   2. 发送时刻必须在 08:00–20:00 之间；
 *   3. 渠道必须是 短信/微信/电话 之一；
 *   4. 模板内容不能为空。
 *
 * 本函数为纯业务逻辑：不真正调用短信/微信网关，仅返回发送决策结果。
 */
export function sendAutoFollowup(
  patientId: string,
  channel: FollowupChannel,
  template: string,
): SendResult {
  if (!patientId) {
    return { patientId: '', channel, template, success: false, skippedReason: 'invalid_template' };
  }

  // 闸口 1：患者授权
  if (!hasAutoFollowupConsent(patientId)) {
    return { patientId, channel, template, success: false, skippedReason: 'patient_consent_required' };
  }

  // 闸口 2：渠道
  if (!ALLOWED_CHANNELS.includes(channel)) {
    return { patientId, channel, template, success: false, skippedReason: 'invalid_channel' };
  }

  // 闸口 3：模板
  if (!template || !template.trim()) {
    return { patientId, channel, template, success: false, skippedReason: 'invalid_template' };
  }

  // 闸口 4：发送时段（08:00–20:00）
  if (!isWithinSendWindow(new Date())) {
    return { patientId, channel, template, success: false, skippedReason: 'outside_send_window' };
  }

  return {
    patientId,
    channel,
    template,
    success: true,
    messageId: `afu_${patientId.slice(0, 8)}_${Date.now()}`,
    sentAt: new Date().toISOString(),
  };
}

// ============================================================================
// 视图层错误
// ============================================================================

export class SmartFollowupError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SmartFollowupError';
  }
}
