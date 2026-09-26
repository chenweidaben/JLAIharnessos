-- ============================================================================
-- 健澜科技 jlmedaios - 住院在院诊疗日常表（M1-B2）
-- 26-inpatient-care.sql
--
-- 覆盖在院三大高频日常，真实落 PostgreSQL：
--  - ward_rounds        医生查房记录（主诉/症状变化、查体、病情评估、诊疗调整、
--                          上级查房标识、本人签名、上级审签）；
--  - nursing_records    护士护理记录单（生命体征、出入量、护理级别、护理措施、
--                          压疮/跌倒风险评估、本人签名）；
--  - nursing_tasks      护理任务（生成 → 执行闭环，幂等防重复执行）；
--  - order_administrations 医嘱执行记录（执行人、执行时间、双人核对人）；
--  - clinical.orders    扩展长期/临时(category)、审核(reviewer)、停止(stopped)等。
--
-- 医疗级严谨：
--  - 医护职责分离由应用层（聚合器 + 权限码）强制，本表结构提供唯一约束兜底：
--      医嘱执行以 (order_id, idempotency_key) / (order_id, slot) 唯一，
--      护理任务以 idempotency_key 唯一，保证并发下不重复执行；
--  - 所有临床文书必须本人签名（signed_by 非空方可进入 signed 状态，应用层校验）。
--
-- 幂等：全部 CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS /
--   CREATE [UNIQUE] INDEX IF NOT EXISTS；orders 状态 CHECK 在 DO 块内按存在性
--   DROP + 重建，可重复执行不报错。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 医生查房记录
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.ward_rounds (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id            uuid NOT NULL REFERENCES clinical.patients(id),
  round_no              text NOT NULL UNIQUE,           -- 查房编号
  round_type            text NOT NULL DEFAULT 'routine'
                          CHECK (round_type IN ('routine','superior','attending','chief','director')),
  is_superior           boolean NOT NULL DEFAULT false, -- 上级查房标识
  round_at              timestamptz NOT NULL,           -- 查房时间
  symptom_change        text,                           -- 主诉 / 症状变化
  physical_exam         jsonb NOT NULL DEFAULT '{}',    -- 查体 {temperature,pulse,respiration,bp,...}
  assessment            text NOT NULL,                  -- 病情评估
  diagnosis             text,                           -- 当前诊断
  plan_adjustment       text,                           -- 诊疗调整
  ai_assisted           boolean NOT NULL DEFAULT false, -- AI 仅辅助
  ai_suggestion         jsonb NOT NULL DEFAULT '{}',    -- AI 建议（不得代签）
  status                text NOT NULL DEFAULT 'draft'
                          CHECK (status IN ('draft','signed','countersigned','returned')),
  author_id             uuid REFERENCES iam.users(id),  -- 记录医师
  signed_by             uuid REFERENCES iam.users(id),  -- 本人签名
  signed_at             timestamptz,
  countersigned_by      uuid REFERENCES iam.users(id),  -- 上级审签
  countersigned_at      timestamptz,
  return_reason         text,
  version               integer NOT NULL DEFAULT 1,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_visit ON clinical.ward_rounds(visit_id, round_at DESC);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_patient ON clinical.ward_rounds(patient_id, round_at DESC);
CREATE INDEX IF NOT EXISTS idx_ward_rounds_status ON clinical.ward_rounds(status);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'clinical.ward_rounds'::regclass AND tgname = 'trg_clinical_ward_rounds_updated'
  ) THEN
    CREATE TRIGGER trg_clinical_ward_rounds_updated BEFORE UPDATE ON clinical.ward_rounds
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 护士护理记录单
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_records (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id              uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id            uuid NOT NULL REFERENCES clinical.patients(id),
  record_no             text NOT NULL UNIQUE,           -- 护理记录编号
  recorded_at           timestamptz NOT NULL,
  shift                 text NOT NULL DEFAULT 'day' CHECK (shift IN ('day','night')), -- 白班/夜班
  nursing_level         text NOT NULL
                          CHECK (nursing_level IN ('special','level1','level2','level3')),
  vitals                jsonb NOT NULL DEFAULT '{}',    -- 生命体征 {temperature,pulse,respiration,sbp,dbp,spo2}
  intake                jsonb NOT NULL DEFAULT '{}',    -- 入量 {oral,iv,total,...}
  output                jsonb NOT NULL DEFAULT '{}',    -- 出量 {urine,stool,drainage,total,...}
  measures              text,                           -- 护理措施
  pressure_sore_risk    text NOT NULL DEFAULT 'none'
                          CHECK (pressure_sore_risk IN ('none','low','medium','high')), -- 压疮风险
  fall_risk             text NOT NULL DEFAULT 'none'
                          CHECK (fall_risk IN ('none','low','medium','high')),          -- 跌倒风险
  risk_assessment       jsonb NOT NULL DEFAULT '{}',    -- 评估明细 {braden,morse,skin}
  ai_assisted           boolean NOT NULL DEFAULT false,
  status                text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','signed')),
  nurse_id              uuid REFERENCES iam.users(id),  -- 责任护士
  signed_by             uuid REFERENCES iam.users(id),  -- 本人签名
  signed_at             timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  deleted_at            timestamptz
);
CREATE INDEX IF NOT EXISTS idx_nursing_records_visit
  ON clinical.nursing_records(visit_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_records_patient
  ON clinical.nursing_records(patient_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_nursing_records_level
  ON clinical.nursing_records(nursing_level);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'clinical.nursing_records'::regclass AND tgname = 'trg_clinical_nursing_records_updated'
  ) THEN
    CREATE TRIGGER trg_clinical_nursing_records_updated BEFORE UPDATE ON clinical.nursing_records
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 护理任务（执行闭环 + 幂等）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.nursing_tasks (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id          uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id        uuid NOT NULL REFERENCES clinical.patients(id),
  task_no           text NOT NULL UNIQUE,
  task_type         text NOT NULL
                      CHECK (task_type IN ('vitals','medication','turning','wound_care',
                                           'education','observation','other')),
  content           text NOT NULL,
  scheduled_at      timestamptz NOT NULL,
  status            text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','executing','done','cancelled')),
  idempotency_key   text NOT NULL,                     -- 幂等键（防重复执行）
  result            text,
  executed_by       uuid REFERENCES iam.users(id),
  executed_at       timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_nursing_tasks_idem ON clinical.nursing_tasks(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_visit
  ON clinical.nursing_tasks(visit_id, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_nursing_tasks_status ON clinical.nursing_tasks(status);
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'clinical.nursing_tasks'::regclass AND tgname = 'trg_clinical_nursing_tasks_updated'
  ) THEN
    CREATE TRIGGER trg_clinical_nursing_tasks_updated BEFORE UPDATE ON clinical.nursing_tasks
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- clinical.orders 扩展：长期/临时、审核、停止、双人核对
-- ---------------------------------------------------------------------------
ALTER TABLE clinical.orders ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'short_term'
  CHECK (category IN ('long_term','short_term'));                 -- 长期医嘱 / 临时医嘱
ALTER TABLE clinical.orders ADD COLUMN IF NOT EXISTS reviewer_id uuid REFERENCES iam.users(id);
ALTER TABLE clinical.orders ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;
ALTER TABLE clinical.orders ADD COLUMN IF NOT EXISTS reject_reason text;
ALTER TABLE clinical.orders ADD COLUMN IF NOT EXISTS requires_double_check boolean NOT NULL DEFAULT false;

-- 扩展医嘱状态机：
--   pending_review 待审核 / active 有效 / executed 已执行(完成) / stopped 已停止 /
--   cancelled 已取消 / rejected 审核驳回 / audited 已核对(兼容)
-- 在 DO 块内幂等重建状态 CHECK：
--  - 约束缺失 → 创建；
--  - 约束存在但不含新状态(pending_review) → DROP 后重建；
--  - 已含新状态 → 保持不动。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clinical.orders'::regclass AND conname = 'orders_status_check'
  ) THEN
    ALTER TABLE clinical.orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('pending_review','active','executed','stopped','cancelled','rejected','audited')
    );
  ELSIF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'clinical.orders'::regclass AND conname = 'orders_status_check'
      AND pg_get_constraintdef(oid) LIKE '%pending_review%'
  ) THEN
    ALTER TABLE clinical.orders DROP CONSTRAINT orders_status_check;
    ALTER TABLE clinical.orders ADD CONSTRAINT orders_status_check CHECK (
      status IN ('pending_review','active','executed','stopped','cancelled','rejected','audited')
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_visit_category
  ON clinical.orders(visit_id, category, status);

-- ---------------------------------------------------------------------------
-- 医嘱执行记录（含执行人 / 双人核对人 / 执行时间，幂等）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.order_administrations (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES clinical.orders(id) ON DELETE CASCADE,
  visit_id          uuid NOT NULL REFERENCES clinical.visits(id),
  patient_id        uuid NOT NULL REFERENCES clinical.patients(id),
  admin_no          text NOT NULL UNIQUE,
  slot              text NOT NULL,                     -- 执行时点标识（如 2026-09-26T08 / bid#1）
  idempotency_key   text NOT NULL,                     -- 幂等键
  status            text NOT NULL DEFAULT 'administered'
                      CHECK (status IN ('administered','held','refused')),
  dose              text,                              -- 实际执行 / 给药内容
  administered_by   uuid NOT NULL REFERENCES iam.users(id), -- 执行人（护士）
  checked_by        uuid REFERENCES iam.users(id),     -- 双人核对人（高风险药/血制品）
  administered_at   timestamptz NOT NULL,
  note              text,
  created_at        timestamptz NOT NULL DEFAULT now()
);
-- 并发兜底：同一医嘱同一执行时点 / 同一幂等键只能有一条执行记录
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_admin_idem
  ON clinical.order_administrations(order_id, idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_order_admin_slot
  ON clinical.order_administrations(order_id, slot);
CREATE INDEX IF NOT EXISTS idx_order_admin_visit
  ON clinical.order_administrations(visit_id, administered_at DESC);
