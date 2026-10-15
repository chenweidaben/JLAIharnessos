-- ============================================================================
-- 健澜科技 jlmedaios - M146-B 个人智能体成长快照表（让每个员工有成就感）
--
-- 【越用越聪明深化】Personal Agent 每被员工使用一次，其经验沉淀、AI 采纳、
-- 技能标签、互助行为都按月落一份快照；前端据此绘制「成长曲线 vs 3 月前」、
-- 同侪对比与成就徽章，把抽象的「越用越聪明」变成员工可感知的正反馈。
--
-- 表结构：medmuse.personal_growth_snapshot
--   id                  bigserial    主键（快照流水号）
--   staff_id            text         员工工号（仅本人可读本人快照）
--   snapshot_month      text         快照月份 YYYY-MM（与 staff_id 联合唯一）
--   experience_success  int          经验沉淀数·成功（累计到当月）
--   experience_failure  int          经验沉淀数·失败教训（累计到当月，失败同样是财富）
--   ai_suggested        int          AI 建议下发次数（当月）
--   ai_accepted         int          AI 建议被采纳次数（当月）
--   skill_tags          jsonb        当月技能标签快照（字符串数组，脱敏标签）
--   helped_colleagues   int          当月帮助同事人次
--   growth_score        double       当月成长分 0~100（综合成功/采纳/互助加权）
--   badges              jsonb        当月已解锁成就徽章 code 列表（字符串数组）
--   recorded_at         timestamptz  快照业务时间（默认 now()）
--   created_at          timestamptz  落库时间（默认 now()）
--
-- 医疗安全红线（生产安全加固）：
--   - 仅落员工本人的脱敏统计与标签，严禁落患者 PII / 诊疗明细；
--   - 行级归属 staff_id = 本人，接口层只允许读自己；同侪对比只发聚合均值；
--   - 只增不改：每月一份快照，历史曲线可追溯，避免 UPDATE 热点。
--
-- 兼容：CREATE SCHEMA / TABLE IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS medmuse;

-- ---------------------------------------------------------------------------
-- 个人成长月度快照（按「员工 + 月份」唯一；查询主力路径为员工 + 月份倒序）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS medmuse.personal_growth_snapshot (
  id                  bigserial PRIMARY KEY,
  staff_id            text         NOT NULL,
  snapshot_month      text         NOT NULL,
  experience_success  int          NOT NULL DEFAULT 0,
  experience_failure  int          NOT NULL DEFAULT 0,
  ai_suggested        int          NOT NULL DEFAULT 0,
  ai_accepted         int          NOT NULL DEFAULT 0,
  skill_tags          jsonb        NOT NULL DEFAULT '[]'::jsonb,
  helped_colleagues   int          NOT NULL DEFAULT 0,
  growth_score        double       NOT NULL DEFAULT 0,
  badges              jsonb        NOT NULL DEFAULT '[]'::jsonb,
  recorded_at         timestamptz  NOT NULL DEFAULT now(),
  created_at          timestamptz  NOT NULL DEFAULT now(),
  CONSTRAINT uq_personal_growth_month UNIQUE (staff_id, snapshot_month),
  CONSTRAINT chk_personal_growth_nonneg CHECK (
    experience_success >= 0
    AND experience_failure >= 0
    AND ai_suggested >= 0
    AND ai_accepted >= 0
    AND helped_colleagues >= 0
  )
);

CREATE INDEX IF NOT EXISTS idx_personal_growth_staff_month
  ON medmuse.personal_growth_snapshot (staff_id, snapshot_month DESC);

-- 权限：员工只读本人成长报告；同侪对比仅下发聚合均值，不下发他人明细
INSERT INTO iam.permissions(code, name, module) VALUES
  ('personal:growth:view', '个人成长报告-查看本人', 'personal')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions(role_code, permission_code) VALUES
  ('doctor', 'personal:growth:view'),
  ('nurse', 'personal:growth:view'),
  ('pharmacist', 'personal:growth:view'),
  ('admin', 'personal:growth:view')
ON CONFLICT DO NOTHING;
