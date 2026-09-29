-- ============================================================================
-- 健澜科技 jlmedaios · M3-A 病案首页自动汇聚与编码-质控-归档状态机
-- 53-medical-record-front-page.sql
--
-- 出院后自动把出院病历汇聚成「病案首页」：
--   诊断 / 手术 / 操作 / 费用 / 入出院信息一次性快照；
--   编码由病案室编码员填写（ICD 编码）；
--   质控由第二人执行（职责分离：编码员不能自审，应用层强制）；
--   通过后归档。
--
-- 状态机 status：draft（已汇聚待编码）→ coding（编码中/已编码待质控）
--   → qc（质控通过待归档）→ archived（已归档）。
--   质控退回：qc 前可退回 coding 重新编码。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / INSERT ... ON CONFLICT DO NOTHING，可重入。
-- 编号位：位于审计迁移 52 之后、60-chat 之前（不占用 30 号）。
--
-- 全程审计哈希链同事务留痕：业务写与 audit.audit_logs（触发器维护的全局链）
-- 在同一事务提交；front_page_reviews 另存业务级签名链 prev_hash/cur_hash。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1、病案首页主表：出院就诊一份（visit_id 唯一），版本号乐观锁
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_record_front_pages (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 一个出院就诊一份首页（并发汇聚靠唯一约束兜底，幂等回查）
  visit_id                  uuid NOT NULL UNIQUE REFERENCES clinical.visits(id),
  patient_id                uuid NOT NULL REFERENCES clinical.patients(id),
  -- 汇聚时快照科室，供 DataScope 过滤（不随后续就诊变动）
  department                text NOT NULL,

  -- 状态机 + 乐观锁
  status                    text NOT NULL DEFAULT 'draft'
                            CHECK (status IN ('draft', 'coding', 'qc', 'archived')),
  version                   integer NOT NULL DEFAULT 1,

  -- 入出院信息快照
  admit_at                  timestamptz,
  discharge_at              timestamptz,
  ward                      text,
  bed_no                    text,

  -- 诊断（主诊断 + 其他诊断 jsonb；ICD 编码由编码员填写）
  primary_diagnosis         text,
  primary_diagnosis_code    text,
  secondary_diagnoses       jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 手术 / 操作（jsonb：[{code,name,date,level}]，汇聚时从医嘱/操作清单组装，编码员可补）
  operations                jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- 费用
  total_fee                 numeric(12, 2)
                            CHECK (total_fee IS NULL OR total_fee >= 0),

  -- 编码（病案室编码员本人签名）
  coded_by                  uuid REFERENCES iam.users(id),
  coded_at                  timestamptz,

  -- 完整性 / 质控
  defects                   jsonb NOT NULL DEFAULT '[]'::jsonb,
  quality_score             integer
                            CHECK (quality_score IS NULL OR (quality_score BETWEEN 0 AND 100)),

  -- 归档
  archived_by               uuid REFERENCES iam.users(id),
  archived_at               timestamptz,

  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_front_page_status
  ON clinical.medical_record_front_pages(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_front_page_department
  ON clinical.medical_record_front_pages(department);
CREATE INDEX IF NOT EXISTS idx_front_page_patient
  ON clinical.medical_record_front_pages(patient_id);

DROP TRIGGER IF EXISTS trg_front_pages_updated ON clinical.medical_record_front_pages;
CREATE TRIGGER trg_front_pages_updated BEFORE UPDATE ON clinical.medical_record_front_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2、病案首页质控签名留痕（第二人，职责分离）
--    每次质控 pass/return 落一行，形成业务级签名哈希链 prev_hash/cur_hash。
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.front_page_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  front_page_id   uuid NOT NULL REFERENCES clinical.medical_record_front_pages(id) ON DELETE CASCADE,
  reviewer_id     uuid NOT NULL REFERENCES iam.users(id),
  -- 质控结论：pass 通过（进入待归档）/ return 退回（回到编码）
  decision        text NOT NULL CHECK (decision IN ('pass', 'return')),
  -- 缺陷清单快照（纯函数完整性质检结果 + 质控人补充）
  defects         jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 退回原因 / 质控意见
  comment         text,
  -- 签名时间（质控人本人签名，AI 仅辅助需医师复核）
  signature_at    timestamptz NOT NULL DEFAULT now(),
  -- 业务级签名哈希链：cur_hash = sha256(prev_hash || front_page_id || reviewer_id
  --                  || decision || defects || signature_at)
  prev_hash       text,
  cur_hash        text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fpr_front_page
  ON clinical.front_page_reviews(front_page_id, created_at);
CREATE INDEX IF NOT EXISTS idx_fpr_reviewer
  ON clinical.front_page_reviews(reviewer_id);

-- ----------------------------------------------------------------------------
-- 3、IAM 权限码种子（不改 10-iam.sql）
--    front_page:read  队列/详情查看
--    front_page:code  病案室编码员填写编码
--    front_page:audit 第二人质控通过/退回/归档
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('front_page:read',  '病案首页读取',   'emr', '病案首页队列与详情查看'),
  ('front_page:code',  '病案首页编码',   'emr', '病案室编码员填写 ICD 诊断/手术编码'),
  ('front_page:audit', '病案首页质控归档','qc',  '第二人质控（通过/退回）与归档，职责分离')
ON CONFLICT (code) DO NOTHING;

-- 授予角色（DB 目录种子；运行时 RBAC 映射见 userView.ts ROLE_PERMISSIONS）
--   admin：病案/医务，可读 + 编码 + 质控归档（演示库无独立病案角色）
--   doctor：可读 + 第二人质控（不可自编码本人首页）
--   pharmacist/nurse 等不授予，越权 403
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'front_page:read'),
  ('admin', 'front_page:code'),
  ('admin', 'front_page:audit'),
  ('doctor', 'front_page:read'),
  ('doctor', 'front_page:audit')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
