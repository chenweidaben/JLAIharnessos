/**
 * 健澜科技 jlmedaios - 检查检验结果 AI 智能解读前端类型（M3-E 规则版 → M12-A LLM 升级版）
 *
 * 三态来源（deepSource / llmStatus）：
 *  - llm / llm_ok           ：LLM 深度解读成功
 *  - rule / llm_not_configured：未配置 LLM，纯规则解读 + 明确降级标注（绝不冒充 LLM 文本）
 *  - llm_fallback / llm_error ：LLM 传输/解析失败，保留规则解读并记录错误
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type LabInterpStatus = 'pending_review' | 'signed' | 'rejected';

/** 解读视角：doctor 医师端 / patient 患者端 */
export type InterpretAudience = 'doctor' | 'patient';

/** 生成模式：auto 自动尝试 LLM（可降级）/ rule 强制规则 / llm 强制 LLM（未配置则明确报错） */
export type InterpretMode = 'auto' | 'rule' | 'llm';

/** 深度来源（规则 / LLM / LLM 失败回退规则） */
export type DeepSource = 'rule' | 'llm' | 'llm_fallback';

/** LLM 状态四态 */
export type LlmStatus = 'llm_ok' | 'llm_not_configured' | 'llm_error' | 'rule_only';

/** 趋势方向（数学在后端规则引擎内完成，LLM 仅加叙述） */
export type TrendDirection = 'rising' | 'falling' | 'stable' | 'no_history';

export interface LabAbnormalItem {
  item: string;
  code: string | null;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  flag: string;
}

/** 逐项临床意义解释（LLM 或规则生成，医师端参考、非确诊） */
export interface LabItemExplanation {
  code: string | null;
  name: string;
  meaning: string;
}

/** 确定性趋势数据（前后两次结果对比） */
export interface LabTrend {
  code: string;
  name: string;
  previous: number | null;
  current: number | null;
  unit: string | null;
  delta: number | null;
  pct: number | null;
  direction: TrendDirection;
  resultTime: string | null;
}

/** 分级建议 */
export interface LabRecommendation {
  level: 'urgent' | 'high' | 'medium' | 'low' | 'routine';
  text: string;
}

export interface LabInterpretation {
  id: string;
  visitId: string;
  patientId: string;
  department: string;
  itemCount: number;
  abnormalCount: number;
  criticalCount: number;
  summary: string;
  abnormalItems: LabAbnormalItem[];
  criticalItems: LabAbnormalItem[];
  engineVersion: string;
  status: LabInterpStatus;
  generatedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectReason: string | null;

  /* ---- M12-A LLM 扩展字段 ---- */
  /** 视角（doctor/patient） */
  audience: InterpretAudience;
  /** 整体印象（医生端，参考方向非确诊） */
  overallImpression: string | null;
  /** 逐项临床意义解释 */
  itemExplanations: LabItemExplanation[];
  /** 确定性趋势数据 */
  trends: LabTrend[];
  /** 分级建议 */
  recommendations: LabRecommendation[];
  /** 患者端通俗总结 */
  plainLanguageSummary: string | null;
  /** 深度来源 */
  deepSource: DeepSource;
  /** LLM 模型名（无则 null） */
  model: string | null;
  /** LLM 状态四态 */
  llmStatus: LlmStatus;
}

export interface LabInterpQueueItem {
  id: string;
  visitId: string;
  visitNo: string;
  patientName: string;
  department: string;
  abnormalCount: number;
  criticalCount: number;
  status: LabInterpStatus;
  updatedAt: string;
}
