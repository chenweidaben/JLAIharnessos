-- ============================================================================
-- 健澜科技 jlmedaios · M142-A 健康体检管理（预防保健与患者服务）
-- ----------------------------------------------------------------------------
-- 定位：让普通人“看得懂”的体检报告 —— 不堆砌医学术语，异常指标自动标红并给出
--       通俗的生活方式建议与就医提示（如“血压偏高，建议低盐饮食 + 复查”）。
--
-- 体检套餐：入职体检 / 健康体检 / 老年体检 / 妇科体检 / 专项检查。
--
-- 表结构：
--   clinical.health_checkup            体检主单（开单）：谁、做哪个套餐、查哪些项目；
--   clinical.health_checkup_result      体检结果明细：每个项目的数值、单位、参考区间、
--                                       自动判定的高低 flag 与通俗解释/建议。
--
-- 医疗安全红线：
--   - 系统只做“辅助解读与生活方式建议”，不做诊断、不替代医生结论；
--   - 异常项一律建议“复查 / 到相应科室就诊”，最终以临床医生判断为准；
--   - 所有开单、结果记录均可溯源（记录人、记录时间）。
--
-- 权限码：checkup:view  患者查看本人报告（登录即可）；
--         checkup:admin 体检中心管理端查看体检单列表。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / 触发器先 DROP 再建，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 体检主单（开单）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.health_checkup (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_no    text NOT NULL UNIQUE,                 -- 体检号，对外展示
  patient_id    uuid NOT NULL,                        -- 患者（主索引），不硬绑外键以兼容多来源
  patient_name  text,                                 -- 冗余展示，报告直读
  package_name  text NOT NULL CHECK (package_name IN
                ('入职体检','健康体检','老年体检','妇科体检','专项检查')),
  items         jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 体检项目清单 ["血压","血糖",...]
  status        text NOT NULL DEFAULT 'ordered'
                CHECK (status IN ('ordered','in_progress','completed','cancelled')),
  ordered_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  created_by    uuid REFERENCES iam.users(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_checkup_patient
  ON clinical.health_checkup(patient_id, ordered_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_checkup_status
  ON clinical.health_checkup(status);

DROP TRIGGER IF EXISTS trg_health_checkup_updated ON clinical.health_checkup;
CREATE TRIGGER trg_health_checkup_updated BEFORE UPDATE ON clinical.health_checkup
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 体检结果明细（每个项目一行）
--   flag：N 正常 / H 偏高 / L 偏低 / A 异常（手动标注）
--   plain_text 通俗解释；advice 通俗就医/生活建议 —— “让普通人看得懂”的核心列
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.health_checkup_result (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  checkup_id    uuid NOT NULL REFERENCES clinical.health_checkup(id) ON DELETE CASCADE,
  item          text NOT NULL,                        -- 项目名，如 收缩压 / 空腹血糖
  value         numeric NOT NULL,                     -- 测量值
  unit          text NOT NULL DEFAULT '',             -- 单位 mmHg / mmol/L / kg/m²
  ref_range     text NOT NULL DEFAULT '',             -- 参考区间展示，如 90-120
  flag          text NOT NULL DEFAULT 'N'
                CHECK (flag IN ('N','H','L','A')),
  plain_text    text NOT NULL DEFAULT '',             -- 通俗解释（不用术语）
  advice        text NOT NULL DEFAULT '',             -- 通俗建议（低盐饮食+复查 等）
  abnormal      boolean NOT NULL DEFAULT false,       -- 是否异常（前端标红）
  recorded_by   uuid REFERENCES iam.users(id),
  recorded_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_health_checkup_result_checkup
  ON clinical.health_checkup_result(checkup_id);
CREATE INDEX IF NOT EXISTS idx_health_checkup_result_abnormal
  ON clinical.health_checkup_result(checkup_id) WHERE abnormal = true;
