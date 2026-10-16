-- ============================================================================
-- 健澜科技 jlmedaios - M177-A 医院病案管理深化
-- 【病案设备耗材】病案首页编码 / 归档 / 质控 / 借阅 全生命周期管理
--
-- 病案编码要 ICD 标准，不能自创：
--   1. 首页诊断编码统一采用 ICD-10（如 I50.9 心力衰竭、J18.9 肺炎）；
--      手术/操作编码统一采用 ICD-9-CM-3（如 47.09 阑尾切除术、81.54 全膝关节置换）；
--      应用层（aggregators/medicalRecordDeepAggregator.ts）对编码格式做强校验，
--      非法 / 自创编码（含中文、字母越界、位数不符）一律退回编码员重编；
--   2. 病案归档：出院后次日起 3 个工作日内必须完成归档，归档时校验首页要素完整性；
--   3. 病案质控：首页合格率 / 编码准确率 / 缺项率三项按期统计，可追溯到科室；
--   4. 病案借阅：借阅登记 + 归还跟踪 + 保密等级（内部/机密/绝密），超期未还预警。
--
-- 生产红线：
--   - 仅病案室 / 质控科 / admin 可读写；病案含患者隐私，访问需脱敏与审计；
--   - 不回写临床文书正文、不触发诊疗；编码校验仅提示，不自动改诊断；
--   - ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS，可重复执行；
--   - 比率一律 0..1 小数；金额 numeric 不取舍。
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) 扩展 clinical.medical_records：病案首页 ICD 编码 / 归档 / 质控字段
--    （基础表见 20-clinical.sql；此处只做增量列，不重建）
-- ----------------------------------------------------------------------------
ALTER TABLE clinical.medical_records
  ADD COLUMN IF NOT EXISTS primary_dx_icd10      text,                     -- 主诊断 ICD-10 编码（如 I50.9）
  ADD COLUMN IF NOT EXISTS primary_dx_name       text,                     -- 主诊断名称
  ADD COLUMN IF NOT EXISTS secondary_dx_icd10s   jsonb
                    NOT NULL DEFAULT '[]'::jsonb,                         -- 其他诊断 [{code,name}]（ICD-10）
  ADD COLUMN IF NOT EXISTS surgery_icd9cm3       jsonb
                    NOT NULL DEFAULT '[]'::jsonb,                         -- 手术操作 [{code,name,level,date}]（ICD-9-CM-3）

  -- 病案归档（出院后归档时限 + 归档完整性）
  ADD COLUMN IF NOT EXISTS archive_deadline_at   timestamptz,              -- 归档时限（出院+3工作日）
  ADD COLUMN IF NOT EXISTS archived_at           timestamptz,              -- 实际归档时间
  ADD COLUMN IF NOT EXISTS archive_integrity     jsonb
                    NOT NULL DEFAULT '{}'::jsonb,                        -- 归档完整性 {首页/知情/手术记录/出院小结...是否齐}
  ADD COLUMN IF NOT EXISTS archive_on_time       boolean,                  -- 是否按时归档

  -- 病案质控（首页合格率 + 编码准确率 + 缺项率）
  ADD COLUMN IF NOT EXISTS qc_front_page_pass    boolean,                  -- 首页是否合格
  ADD COLUMN IF NOT EXISTS qc_coding_accuracy    numeric(6,3)
                    NOT NULL DEFAULT 0,                                    -- 单病案编码准确率 0..1
  ADD COLUMN IF NOT EXISTS qc_missing_items      jsonb
                    NOT NULL DEFAULT '[]'::jsonb,                        -- 缺项清单
  ADD COLUMN IF NOT EXISTS qc_checked_by         uuid REFERENCES iam.users(id),
  ADD COLUMN IF NOT EXISTS qc_checked_at         timestamptz,

  -- 病案借阅（借阅登记 + 归还跟踪 + 保密等级）
  ADD COLUMN IF NOT EXISTS borrow_status         text
                    NOT NULL DEFAULT 'none'
                    CHECK (borrow_status IN ('none','borrowed','returned','overdue')),
  ADD COLUMN IF NOT EXISTS confidentiality       text
                    NOT NULL DEFAULT 'internal'
                    CHECK (confidentiality IN ('internal','confidential','secret'));

CREATE INDEX IF NOT EXISTS idx_records_icd10
  ON clinical.medical_records (primary_dx_icd10);
CREATE INDEX IF NOT EXISTS idx_records_archive
  ON clinical.medical_records (archived_at, archive_on_time);
CREATE INDEX IF NOT EXISTS idx_records_qc_pass
  ON clinical.medical_records (qc_front_page_pass);
CREATE INDEX IF NOT EXISTS idx_records_borrow
  ON clinical.medical_records (borrow_status);

-- ----------------------------------------------------------------------------
-- 2) clinical.medical_record_borrows：病案借阅登记簿（借阅登记 + 归还跟踪）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.medical_record_borrows (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id       uuid NOT NULL REFERENCES clinical.medical_records(id),
  visit_id        uuid REFERENCES clinical.visits(id),
  patient_id      uuid REFERENCES clinical.patients(id),

  borrower_name   text NOT NULL DEFAULT '',                 -- 借阅人
  borrower_dept   text NOT NULL DEFAULT '',                 -- 借阅科室/单位
  purpose         text NOT NULL DEFAULT '',                 -- 借阅用途（科研/病历复印/司法/会诊）
  -- 保密等级：internal 内部 / confidential 机密 / secret 绝密（绝密须病案室主任审批）
  confidentiality text NOT NULL DEFAULT 'internal'
                    CHECK (confidentiality IN ('internal','confidential','secret')),

  borrowed_at     timestamptz NOT NULL DEFAULT now(),       -- 借出时间
  due_at          timestamptz,                              -- 应归还时间
  returned_at     timestamptz,                              -- 实际归还时间（NULL=未还）
  status          text NOT NULL DEFAULT 'borrowed'
                    CHECK (status IN ('borrowed','returned','overdue')),
  approved_by     uuid REFERENCES iam.users(id),            -- 审批人（保密级必填）
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mr_borrows_record
  ON clinical.medical_record_borrows (record_id);
CREATE INDEX IF NOT EXISTS idx_mr_borrows_status
  ON clinical.medical_record_borrows (status);
CREATE INDEX IF NOT EXISTS idx_mr_borrows_due
  ON clinical.medical_record_borrows (due_at);

DROP TRIGGER IF EXISTS trg_mr_borrows_updated ON clinical.medical_record_borrows;
CREATE TRIGGER trg_mr_borrows_updated BEFORE UPDATE ON clinical.medical_record_borrows
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE clinical.medical_record_borrows IS
  'M177-A【病案设备耗材】病案借阅登记与归还跟踪：借阅人/用途/保密等级/应还与实还时间';

-- ----------------------------------------------------------------------------
-- 3) 权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('medical-record:deep:view', '病案深化管理查看', 'medical_record',
   '查看病案首页 ICD 编码校验、归档时限、首页合格率/编码准确率/缺项率与借阅跟踪（病案室/质控科）')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
  CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code = 'medical-record:deep:view'
ON CONFLICT (role_code, permission_code) DO NOTHING;
