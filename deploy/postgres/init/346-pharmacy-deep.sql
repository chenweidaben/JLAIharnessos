-- ============================================================================
-- 健澜科技 jlmedaios · M173-C 医院智能药房深化（真减少差错，不能只是看板）
-- 346-pharmacy-deep.sql
--
-- 【质量提升与新场景】智能药房要真减少差错，不能只是看板。在 25-drug-catalog.sql
-- 的 clinical.drug_inventory（按药房/库房的批次库存）之上，把药房从「事后盘点」
-- 升级为「全流程防错」，补齐四大能力域：
--
--   ① 智能摆药：自动摆药机对接 + 摆药差错率监控（pharmacy_dispense_event）；
--   ② 智能审方：AI 前置审核 + 药师事后复核（pharmacy_review_task）；
--   ③ 智能库存：效期管理 + 自动补货 + 缺货预警（drug_inventory 扩列 + 预警表）；
--   ④ 智能用药：用药指导 + 相互作用 + 特殊人群（pharmacy_adverse_event）。
--
-- 安全红线（质量提升与新场景）：
--   - 摆药机逐包复核（药名/规格/数量/效期四码比对），任一项不符即锁机告警，
--     差错率按日监控，连续两天超标自动升级科主任；
--   - AI 前置审核只拦「硬性错误」（过敏/禁忌/超量/相互作用），药师事后复核兜底，
--     AI 不自动发药、不自动改方，处方生效必须有人审签；
--   - 近效期药品（默认 90 天内）先近先出（FEFO），过期药品零出库；
--   - 不良反应预警为辅助提示，临床处置以医生判断为准，但预警必须留痕可追溯。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / DO 块判断加列 / ON CONFLICT DO NOTHING /
--       WHERE NOT EXISTS，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS clinical;

-- ---------------------------------------------------------------------------
-- 0. 扩展既有 drug_inventory：挂载「质量提升与新场景」库存优化字段（幂等加列）
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- 安全库存：提前期内需求波动 + 供应延迟的缓冲量
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'safety_stock'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN safety_stock numeric(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- 再订货点：库存降到该点即触发自动补货建议（= 提前期需求 + 安全库存）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'reorder_point'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN reorder_point numeric(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- 最高库存上限：自动补货一次补到的上限（避免占压资金与近效期浪费）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'max_stock'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN max_stock numeric(12,2) NOT NULL DEFAULT 0;
  END IF;

  -- 采购提前期（天）：下单到入库的常规时长，用于再订货点测算
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'lead_time_days'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN lead_time_days integer NOT NULL DEFAULT 7;
  END IF;

  -- ABC 分类：A 类（高值/高频，重点盯防）/ B 类 / C 类
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'abc_class'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN abc_class text NOT NULL DEFAULT 'C'
      CHECK (abc_class IN ('A', 'B', 'C'));
  END IF;

  -- 近效期预警天数：距效期 ≤ 该天数即触发先近先出与催用提醒
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'expiry_alert_days'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN expiry_alert_days integer NOT NULL DEFAULT 90;
  END IF;

  -- 自动摆药机编号：该库存位是否已对接摆药机（空 = 人工发药窗口）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'dispense_machine_id'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN dispense_machine_id text NOT NULL DEFAULT '';
  END IF;

  -- 摆药机工作模式：manual 人工 / semi 半自动（机摆人核）/ auto 全自动（机摆+视频复核）
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'clinical' AND table_name = 'drug_inventory'
      AND column_name = 'machine_mode'
  ) THEN
    ALTER TABLE clinical.drug_inventory
      ADD COLUMN machine_mode text NOT NULL DEFAULT 'manual'
      CHECK (machine_mode IN ('manual', 'semi', 'auto'));
  END IF;
END $$;

COMMENT ON COLUMN clinical.drug_inventory.safety_stock IS
  '【质量提升与新场景】安全库存：提前期需求波动与供应延迟缓冲，自动补货测算用';
COMMENT ON COLUMN clinical.drug_inventory.reorder_point IS
  '【质量提升与新场景】再订货点：库存≤该点即自动生成补货建议（提前期需求+安全库存）';
COMMENT ON COLUMN clinical.drug_inventory.max_stock IS
  '【质量提升与新场景】最高库存上限：一次补货补到上限，防占压资金与近效期浪费';
COMMENT ON COLUMN clinical.drug_inventory.lead_time_days IS
  '【质量提升与新场景】采购提前期（天）：下单到入库时长，再订货点测算输入';
COMMENT ON COLUMN clinical.drug_inventory.abc_class IS
  '【质量提升与新场景】ABC 库存分类：A 类高值高频重点盯防';
COMMENT ON COLUMN clinical.drug_inventory.expiry_alert_days IS
  '【质量提升与新场景】近效期预警天数：≤该天数触发 FEFO 先近先出与催用';
COMMENT ON COLUMN clinical.drug_inventory.dispense_machine_id IS
  '【质量提升与新场景】对接的自动摆药机编号（空=人工发药窗口）';
COMMENT ON COLUMN clinical.drug_inventory.machine_mode IS
  '【质量提升与新场景】摆药机模式：manual人工/semi半自动机摆人核/auto全自动机摆+视频复核';

-- 近效期预警扫描索引（expiry_date 升序，只看有库存的批次）
CREATE INDEX IF NOT EXISTS idx_inv_expiry_warning
  ON clinical.drug_inventory (expiry_date ASC)
  WHERE quantity > 0;
-- 缺货预警扫描索引（数量 ≤ 再订货点 的批次）
CREATE INDEX IF NOT EXISTS idx_inv_reorder_scan
  ON clinical.drug_inventory (drug_id, warehouse, quantity)
  WHERE quantity <= reorder_point;

-- ---------------------------------------------------------------------------
-- ① 智能摆药：自动摆药机对接 + 摆药差错率监控（逐包四码比对，真减差错）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_dispense_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no        text NOT NULL UNIQUE,                 -- 摆药事件编号
  machine_id      text NOT NULL DEFAULT '',              -- 摆药机编号
  prescription_no text NOT NULL DEFAULT '',              -- 关联处方号
  patient_id      text NOT NULL DEFAULT '',              -- 脱敏患者标识
  -- 四码比对结果：药名/规格/数量/效期，机扫逐包复核
  name_match      boolean NOT NULL DEFAULT false,
  spec_match      boolean NOT NULL DEFAULT false,
  qty_match       boolean NOT NULL DEFAULT false,
  expiry_match    boolean NOT NULL DEFAULT false,
  matched_count   integer NOT NULL DEFAULT 0,            -- 四码中比对一致的项数（0..4）
  has_error       boolean NOT NULL DEFAULT false,        -- 是否检出摆药差错
  error_type      text NOT NULL DEFAULT ''               -- 差错类型：错药/错规格/错量/近效期/无
                    CHECK (error_type IN ('', 'wrong_drug', 'wrong_spec', 'wrong_qty', 'expired_risk')),
  locked          boolean NOT NULL DEFAULT false,        -- 检出差错后是否自动锁机告警
  pharmacist_verified boolean NOT NULL DEFAULT false,    -- 药师事后复核签核
  verified_by     text NOT NULL DEFAULT '',
  dispensed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.pharmacy_dispense_event IS
  '【质量提升与新场景】智能摆药：摆药机逐包四码比对（药名/规格/数量/效期），差错即锁机，差错率按日监控';
CREATE INDEX IF NOT EXISTS idx_pde_created
  ON clinical.pharmacy_dispense_event (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pde_error
  ON clinical.pharmacy_dispense_event (has_error, created_at DESC)
  WHERE has_error = true;
DROP TRIGGER IF EXISTS trg_pde_updated ON clinical.pharmacy_dispense_event;
CREATE TRIGGER trg_pde_updated BEFORE UPDATE ON clinical.pharmacy_dispense_event
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ② 智能审方：AI 前置审核 + 药师事后复核（AI 只拦硬性错误，不自动发药）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_review_task (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_no       text NOT NULL UNIQUE,                 -- 审方任务编号
  prescription_no text NOT NULL DEFAULT '',              -- 处方号
  patient_id      text NOT NULL DEFAULT '',              -- 脱敏患者标识
  -- AI 前置审核结论
  ai_verdict      text NOT NULL DEFAULT 'pending'
                    CHECK (ai_verdict IN ('pending', 'pass', 'review', 'block')),
  ai_hard_blocks  jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 硬性拦截项 [{type,detail}]：过敏/禁忌/超量/相互作用
  ai_soft_hints   jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 柔性提示：相互作用注意/特殊人群提醒
  -- 药师事后复核兜底
  pharmacist_verdict text NOT NULL DEFAULT 'pending'
                    CHECK (pharmacist_verdict IN ('pending', 'approved', 'modified', 'rejected')),
  pharmacist_id   text NOT NULL DEFAULT '',
  reviewed_at     timestamptz,
  -- AI 与药师结论一致性（用于审方模型自学习，不替代人工签核）
  consistent      boolean,                               -- AI block ↔ 药师 reject 是否一致
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.pharmacy_review_task IS
  '【质量提升与新场景】智能审方：AI 前置只拦过敏/禁忌/超量/相互作用硬性错误，药师事后复核签核，AI 不自动发药';
CREATE INDEX IF NOT EXISTS idx_prt_created
  ON clinical.pharmacy_review_task (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prt_ai_block
  ON clinical.pharmacy_review_task (ai_verdict, created_at DESC)
  WHERE ai_verdict = 'block';
DROP TRIGGER IF EXISTS trg_prt_updated ON clinical.pharmacy_review_task;
CREATE TRIGGER trg_prt_updated BEFORE UPDATE ON clinical.pharmacy_review_task
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ④ 智能用药：不良反应预警留痕（用药指导 + 相互作用 + 特殊人群）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.pharmacy_adverse_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_no        text NOT NULL UNIQUE,                 -- 不良反应预警编号
  prescription_no text NOT NULL DEFAULT '',
  patient_id      text NOT NULL DEFAULT '',              -- 脱敏患者标识
  drug_name       text NOT NULL DEFAULT '',
  risk_level      text NOT NULL DEFAULT 'none'
                    CHECK (risk_level IN ('none', 'mild', 'moderate', 'severe')),
  triggers        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 命中的风险因子 [{type,detail}]
  symptoms        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 患者已出现症状
  suggestions     jsonb NOT NULL DEFAULT '[]'::jsonb,    -- 处置建议（停药观察/换药/上报）
  -- 预警为辅助：是否已被医生确认、是否上报国家不良反应监测网
  doctor_confirmed boolean NOT NULL DEFAULT false,
  reported        boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE clinical.pharmacy_adverse_event IS
  '【质量提升与新场景】智能用药：过敏/妊娠/肾损/特殊人群不良反应预警，留痕可追溯，临床处置以医生为准';
CREATE INDEX IF NOT EXISTS idx_pae_level
  ON clinical.pharmacy_adverse_event (risk_level, created_at DESC)
  WHERE risk_level IN ('moderate', 'severe');
DROP TRIGGER IF EXISTS trg_pae_updated ON clinical.pharmacy_adverse_event;
CREATE TRIGGER trg_pae_updated BEFORE UPDATE ON clinical.pharmacy_adverse_event
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）：智能药房只读 / 摆药机操作与差错处置 / 审方签核
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('pharmacy_deep:read',    '智能药房深化只读', 'pharmacy_deep', '查看智能摆药/审方/库存/用药四大体系运行指标与预警（医护/药师只读）'),
  ('pharmacy_deep:dispense','智能摆药与差错处置','pharmacy_deep', '自动摆药机对接、四码复核、差错锁机解锁与差错率处置（药师/摆药护士）'),
  ('pharmacy_deep:review',  '智能审方签核',      'pharmacy_deep', 'AI 前置审核后的药师事后复核签核、处方修改/驳回（药师）')
ON CONFLICT (code) DO NOTHING;

-- 角色授权（幂等）：read 全员；dispense 授 pharmacist/nurse/admin；review 授 pharmacist/admin
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('doctor'),('nurse'),('pharmacist')) AS r(code)
  CROSS JOIN (VALUES ('pharmacy_deep:read')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('nurse'),('pharmacist')) AS r(code)
  CROSS JOIN (VALUES ('pharmacy_deep:dispense')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM (VALUES ('admin'),('pharmacist')) AS r(code)
  CROSS JOIN (VALUES ('pharmacy_deep:review')) AS p(code)
 WHERE NOT EXISTS (
   SELECT 1 FROM iam.role_permissions rp
    WHERE rp.role_code = r.code AND rp.permission_code = p.code
 );
