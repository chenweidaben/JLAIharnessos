-- ============================================================================
-- 健澜AI原生医院操作系统OS - M134-B 医生成长档案：周期快照表
-- 262-doctor-growth.sql
--
-- 【用户体验深化】让医生看到自己的进步、有成就感：
--  - 按月为一名医生沉淀一条「成长快照」：本期处理病例数、平均诊断准确率、
--    经验沉淀条数、当期激活的技能标签；
--  - BFF 纯函数 buildDoctorGrowthRecordProfile 据此绘制成长曲线 + 雷达图，
--    并与同科室医生做横向对比（分位 / 排名），形成「我在变强」的正反馈；
--  - 与 M119-A（medmuse.staff_decision_memory，决策级复盘）互补：
--    本表是月度聚合快照，查询轻、可读，直接驱动前端曲线。
--
-- 设计要点：
--  - doctor_id 指向 iam.users(id)（脱敏工号），不直接落患者姓名 / 身份证号；
--  - period 采用 'YYYY-MM' UTC 文本键，与聚合器月度分桶口径一致，避免时区漂移；
--  - avg_score 为 0~100 百分比（诊断准确率百分制），cases_handled / experience_count
--    为非负整数；skills 为 text[] 技能标签数组，空数组表示当期无新增标签；
--  - (doctor_id, period) 唯一：同一医生同一月份只保留一条最新快照，重复 upsert 覆盖；
--  - hospital_id 与 261-multi-tenant.sql 对齐，多院部署强制行级隔离。
--
-- 幂等：全部 IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- SPDX-License-Identifier: Apache-2.0
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 医生成长周期快照表
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.doctor_growth_record (
  id               bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doctor_id        text         NOT NULL,
  hospital_id      text         NOT NULL DEFAULT 'demo-hospital',
  period           text         NOT NULL,                 -- 'YYYY-MM'（UTC）
  cases_handled    integer      NOT NULL DEFAULT 0
                                 CHECK (cases_handled >= 0),
  avg_score        numeric(5,2) NOT NULL DEFAULT 0
                                 CHECK (avg_score >= 0 AND avg_score <= 100),
  experience_count integer      NOT NULL DEFAULT 0
                                 CHECK (experience_count >= 0),
  skills           text[]       NOT NULL DEFAULT '{}',
  created_at        timestamptz  NOT NULL DEFAULT now(),
  updated_at        timestamptz  NOT NULL DEFAULT now(),

  -- 同一医生同一月份唯一快照
  CONSTRAINT doctor_growth_record_doctor_period_uk UNIQUE (doctor_id, period),
  -- 月份键格式粗校验：YYYY-MM
  CONSTRAINT doctor_growth_record_period_chk
    CHECK (period ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

COMMENT ON TABLE  medmuse.doctor_growth_record IS 'M134-B 医生成长档案：按月周期快照（病例数/诊断准确率/经验条数/技能标签）';
COMMENT ON COLUMN medmuse.doctor_growth_record.doctor_id        IS '医生工号（iam.users.id，脱敏）';
COMMENT ON COLUMN medmuse.doctor_growth_record.period           IS '统计月份 UTC 键 YYYY-MM';
COMMENT ON COLUMN medmuse.doctor_growth_record.cases_handled    IS '本期处理病例数';
COMMENT ON COLUMN medmuse.doctor_growth_record.avg_score        IS '本期平均诊断准确率（百分制 0~100）';
COMMENT ON COLUMN medmuse.doctor_growth_record.experience_count IS '本期经验沉淀条数（复盘/教训/心得）';
COMMENT ON COLUMN medmuse.doctor_growth_record.skills           IS '本期激活技能标签数组';

-- ----------------------------------------------------------------------------
-- 2. 索引：按医生取时间序列、按医院+科室做同科室对比
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_doctor_growth_record_doctor
  ON medmuse.doctor_growth_record (doctor_id, period);

CREATE INDEX IF NOT EXISTS idx_doctor_growth_record_hospital
  ON medmuse.doctor_growth_record (hospital_id, doctor_id);

-- ----------------------------------------------------------------------------
-- 3. updated_at 自动刷新触发器（轻量，与全院约定一致）
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION medmuse.doctor_growth_record_touch_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_doctor_growth_record_touch_updated_at
  ON medmuse.doctor_growth_record;
CREATE TRIGGER trg_doctor_growth_record_touch_updated_at
  BEFORE UPDATE ON medmuse.doctor_growth_record
  FOR EACH ROW EXECUTE FUNCTION medmuse.doctor_growth_record_touch_updated_at();

-- ----------------------------------------------------------------------------
-- 隔离红线：hospital_id 必须存在于 iam.tenants（与 261-multi-tenant.sql 一致）
-- 查询必须强制叠加 hospital_id 谓词，由 BFF 层统一收口。
-- ----------------------------------------------------------------------------
