/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * DAMO-RADAR「AI 辅诊报告」前端类型定义
 * 严格对齐契约 docs/RADAR_FUSION_CONTRACT.md（§2 / §3.6 / §4），不得臆造字段。
 */

/** 发现分级：critical=危急 / major=重要 / minor=次要 */
export type RadarTier = 'critical' | 'major' | 'minor';

/** 推理模式：demo=内置预计算确定性结果 / production=真实模型推理 */
export type RadarMode = 'demo' | 'production';

/** 任务状态机（契约 §3.5） */
export type RadarJobStatus = 'queued' | 'running' | 'completed' | 'failed';

/** 医师复核结论（契约 §4 review） */
export type RadarVerdict = 'approve' | 'modify' | 'reject';

/** 单条发现（契约 §2） */
export interface RadarFinding {
  key: string;
  organ_zh: string;
  name_zh: string;
  name_en: string;
  /** 0~1 模型输出概率 */
  probability: number;
  /** probability >= 阈值判定为阳性 */
  positive: boolean;
  tier: RadarTier;
}

/** 目录中一个器官及其发现（契约 §3.3，目录不含概率） */
export interface RadarCatalogOrgan {
  key: string;
  name_zh: string;
  name_en?: string;
  findings: Pick<RadarFinding, 'key' | 'name_zh' | 'name_en'>[];
}

/** 静态目录（契约 §3.3） */
export interface RadarCatalog {
  organs: RadarCatalogOrgan[];
  positive_threshold: number;
  critical_findings: string[];
}

/** 报告汇总（契约 §3.6 summary） */
export interface RadarSummary {
  critical_count: number;
  major_count: number;
  minor_count: number;
  positive_count: number;
  critical_findings: string[];
  major_findings: string[];
}

/** 完整 AI 辅诊结果（契约 §3.6 RadarResult） */
export interface RadarResult {
  study_uid: string;
  model: 'damo-radar';
  model_version: 'eaec6129';
  mode: RadarMode;
  /** ISO8601，如 2026-09-21T14:00:00+08:00 */
  generated_at: string;
  positive_threshold: number;
  findings: RadarFinding[];
  summary: RadarSummary;
  disclaimer: string;
}

/** 提交任务响应（契约 §3.4） */
export interface RadarJobCreated {
  job_id: string;
  status: RadarJobStatus;
  mode: RadarMode;
}

/** 任务查询响应（契约 §3.5） */
export interface RadarJob {
  job_id: string;
  status: RadarJobStatus;
  /** 0~1 */
  progress: number;
  mode: RadarMode;
  study_uid: string;
  error: { code: string; message: string } | null;
  result: RadarResult | null;
}

/** 复核提交入参（契约 §4 review） */
export interface RadarReviewRequest {
  verdict: RadarVerdict;
  comment?: string;
  report_text?: string;
  signer_id: string;
  signer_name: string;
  /** CA 签名 Base64；演示模式可为空串 */
  ca_signature?: string;
}

/** 复核提交出参（契约 §4 review） */
export interface RadarReviewReceipt {
  reviewed_at: string;
  signer_id: string;
  audit_id: string;
  verdict: RadarVerdict;
}
