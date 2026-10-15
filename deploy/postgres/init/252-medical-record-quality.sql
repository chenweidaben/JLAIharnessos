-- ============================================================================
-- 健澜科技 jlmedaios - M130-A 病历质控智能审核（核心业务深化）
--
-- 【核心业务深化】
--   病历质控智能审核在病案归档/三级医师查房之间，对整份病历的"诊疗思维链"
--   做一次结构化自动审核：主诉完整性、现病史时间线、鉴别诊断、诊疗计划、
--   用药指征五项规则由 BFF 纯函数（recordQualityAggregator）逐项判定，
--   输出评分与问题清单。本表持久化每一次审核快照，供质控科人工复核闭环。
--
-- 医疗安全红线（质控 ≠ 终判）：
--   - 审核结论一律为"建议"（suggestion），系统不自动判退/不自动归档；
--   - status 默认 'pending'，必须由人工（质控医师）confirmed 后才闭环；
--   - record_content 存被审核病历的结构化快照（jsonb），敏感字段仍按
--     患者脱敏规范处理，本表不存明文身份证/电话；
--   - 仅 admin / 质控角色可写；普通医师只读本人被整改项。
--
-- 表结构：
--   medmuse.record_quality_check
--     id            bigserial     主键
--     record_id     text          病历/就诊标识（病历号或 visit 业务号，可空）
--     record_content jsonb        被审核病历结构化快照（主诉/现病史/鉴别诊断/
--                                  诊疗计划/用药列表）
--     checks        jsonb         五项规则逐项结果 [{key,label,passed,
--                                  severity,message,suggestion}]
--     score         int           综合评分 0-100（各项权重求和）
--     grade         text          建议等级：合格 / 需整改 / 不合格
--     issues        jsonb         提取出的问题清单（待整改项）
--     suggestion    text          审核结论（"建议"，必须人工确认）
--     status        text          pending（待人工确认）/ confirmed（已确认）/
--                                  dismissed（不采纳）
--     created_by    text          触发审核人工号
--     created_at    timestamptz   审核时间
--     confirmed_by  text          人工确认人工号
--     confirmed_at  timestamptz   人工确认时间
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 病历质控智能审核记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.record_quality_check (
  id             bigserial PRIMARY KEY,
  record_id      text          NOT NULL DEFAULT '',
  record_content jsonb         NOT NULL DEFAULT '{}'::jsonb,
  checks         jsonb         NOT NULL DEFAULT '[]'::jsonb,
  score          int           NOT NULL DEFAULT 0,
  grade          text          NOT NULL DEFAULT '需整改',
  issues         jsonb         NOT NULL DEFAULT '[]'::jsonb,
  suggestion     text          NOT NULL DEFAULT '',
  status         text          NOT NULL DEFAULT 'pending',
  created_by     text          NOT NULL DEFAULT '',
  created_at     timestamptz   NOT NULL DEFAULT now(),
  confirmed_by   text          NOT NULL DEFAULT '',
  confirmed_at   timestamptz,
  CONSTRAINT record_quality_check_score_chk
    CHECK (score BETWEEN 0 AND 100),
  CONSTRAINT record_quality_check_grade_chk
    CHECK (grade IN ('合格', '需整改', '不合格')),
  CONSTRAINT record_quality_check_status_chk
    CHECK (status IN ('pending', 'confirmed', 'dismissed'))
);

-- 按状态收敛质控待办看板：pending 项优先排队人工复核
CREATE INDEX IF NOT EXISTS idx_record_quality_check_status
  ON medmuse.record_quality_check (status, created_at DESC);

-- 按病历标识追溯：同一病历多次审核历史
CREATE INDEX IF NOT EXISTS idx_record_quality_check_record
  ON medmuse.record_quality_check (record_id, id DESC);
