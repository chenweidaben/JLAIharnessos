-- ============================================================================
-- 健澜科技 jlmedaios - 医疗纠纷管理 · 纠纷登记台账表（M141-C · 质量与安全）
-- 277-medical-dispute.sql
--
-- 【质量与安全】医疗纠纷管理：保护医生，也保护患者。
--   每一起投诉 / 争议自接待起即登记入台账（medical_dispute），
--   按「登记 → 调查中 → 协商中 → 已解决 / 已诉讼」闭环流转，
--   全程留痕、责任科室与时间线可追溯——既为被投诉医生澄清事实，
--   也为患者诉求建立正式受理与反馈通道。
--
--   纠纷类型（dispute_type CHECK 锁死五类口径）：
--     service_attitude 服务态度
--     medical_quality  医疗质量
--     fee_dispute      费用争议
--     communication    沟通问题
--     other            其他
--
--   状态（status CHECK 锁死五态，流转由 BFF 纯函数强校验）：
--     registered 登记 → investigating 调查中 → negotiating 协商中
--     → resolved 已解决 / litigated 已诉讼
--
-- 设计要点：
--   - patient_id 一律脱敏存储（如 P0****23），不存患者明文主键 / 姓名 / 证件号，
--     最小暴露原则，台账本身即满足「纠纷场景不沉淀患者 PII」的合规要求；
--   - visit_id 记录关联就诊号（可空串），便于回溯病历但不做外键强约束，
--     避免已注销就诊拖累纠纷台账；
--   - resolution 记录处理结果 / 协商结论 / 诉讼案号，仅在终态（已解决/已诉讼）填写；
--   - created_at / updated_at 用数据库时钟 now()，不采信前端自报时间，防篡改。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS，可重复执行。
-- 不触碰 WebSocket，不新增依赖。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 医疗纠纷登记台账：一起纠纷从登记到闭环的全生命周期
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_dispute (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id    text NOT NULL,                            -- 脱敏患者标识（如 P0****23），禁止明文
  visit_id      text NOT NULL DEFAULT '',                 -- 关联就诊号（可空，不做强外键）
  dispute_type text NOT NULL CHECK (dispute_type IN
                ('service_attitude','medical_quality',
                 'fee_dispute','communication','other')),
  description   text NOT NULL DEFAULT '',                -- 纠纷经过 / 患者诉求描述
  status        text NOT NULL DEFAULT 'registered'
                CHECK (status IN
                ('registered','investigating','negotiating','resolved','litigated')),
  resolution    text NOT NULL DEFAULT '',                -- 处理结果（终态填写：协商结论/诉讼案号）
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- 按纠纷类型拉分类台账（质量与安全科按类型看板）
CREATE INDEX IF NOT EXISTS idx_medical_dispute_type
  ON clinical.medical_dispute (dispute_type);

-- 按状态过滤在办 / 已闭环纠纷（院长晨会盯在办件）
CREATE INDEX IF NOT EXISTS idx_medical_dispute_status
  ON clinical.medical_dispute (status);

-- 按账期出趋势分析（月度纠纷量 / 闭环率）
CREATE INDEX IF NOT EXISTS idx_medical_dispute_created
  ON clinical.medical_dispute (created_at);
