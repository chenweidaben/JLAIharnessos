-- ============================================================================
-- 健澜科技 jlmedaios - 医学影像 AI 辅助结果表（M138-A · 新业务场景）
--
-- 业务定位：
--   在放射科阅片环节，由规则引擎对影像特征做初筛，给出"AI 建议"。
--   该建议仅作参考，最终诊断必须由接诊医师在前端点击「医生确认」后落库。
--
-- 支持的检查类型（study_type）：
--   chest_xray  胸片  -> 肺炎 / 结节 / 积液
--   ct          CT    -> 脑出血 / 骨折 / 占位
--   xray        X光   -> 骨折 / 肺炎
--
-- 表结构：
--   id               uuid 主键
--   patient_id       text 患者号（不硬绑外键，便于与 RIS/LIS 解耦）
--   study_type       text 检查类型枚举 CHECK
--   image_features   jsonb 影像特征原始入参（透亮度、结节直径、有无积液等）
--   suggestions      jsonb AI 给出的建议条目（诊断名 + 置信度 + 描述）
--   overall_confidence numeric(5,4) 0~1，整体置信度
--   report           text AI 自动生成的结构化报告草稿
--   doctor_status    text 医师确认状态：pending / confirmed / rejected
--   doctor_comment   text 医师批注（驳回理由或补充说明）
--   confirmed_by     uuid 可空，确认医师 = iam.users.id
--   confirmed_at     timestamptz 可空，确认时间
--   created_at       timestamptz 创建时间
--
-- 医疗安全红线：
--   - doctor_status 默认 pending；未经 confirmed 的记录不得进入正式诊断；
--   - suggestions 内自带 disclaimer 字段声明"AI 仅辅助"；
--   - 本表不存患者直接标识（姓名/身份证），patient_id 仅为院内就诊号。
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

CREATE TABLE IF NOT EXISTS clinical.imaging_ai_result (
  id                 uuid PRIMARY KEY,
  patient_id         text NOT NULL DEFAULT '',
  study_type         text NOT NULL CHECK (study_type IN ('chest_xray','ct','xray')),
  image_features     jsonb NOT NULL DEFAULT '{}'::jsonb,
  suggestions        jsonb NOT NULL DEFAULT '[]'::jsonb,
  overall_confidence numeric(5,4) NOT NULL DEFAULT 0 CHECK (overall_confidence >= 0 AND overall_confidence <= 1),
  report             text NOT NULL DEFAULT '',
  doctor_status      text NOT NULL DEFAULT 'pending' CHECK (doctor_status IN ('pending','confirmed','rejected')),
  doctor_comment     text NOT NULL DEFAULT '',
  confirmed_by       uuid NULL,
  confirmed_at       timestamptz NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- 医师阅片工作台按状态 + 时间倒序拉取待确认队列
CREATE INDEX IF NOT EXISTS idx_imaging_ai_result_status_created
  ON clinical.imaging_ai_result (doctor_status, created_at DESC);

-- 按检查类型检索历史 AI 建议
CREATE INDEX IF NOT EXISTS idx_imaging_ai_result_study
  ON clinical.imaging_ai_result (study_type, created_at DESC);

COMMENT ON TABLE clinical.imaging_ai_result IS
  '医学影像 AI 辅助建议结果表（M138-A）；AI 仅辅助，须医师确认后方可作为诊断依据';
