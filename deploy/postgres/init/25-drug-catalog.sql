-- ============================================================================
-- 健澜科技杠OS - 药品目录与库存表
-- 25-drug-catalog.sql
--
-- 医院药品主数据：通用名/商品名/规格/剂型/给药途径/参考价/禁忌等。
-- 处方/医嘱从该目录引用药品，CDS 药物相互作用/过敏禁忌基于此表。
--
-- Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
-- ============================================================================

-- 药品目录
CREATE TABLE IF NOT EXISTS clinical.drug_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_code       text NOT NULL UNIQUE,           -- 院内药品编码
  generic_name    text NOT NULL,                  -- 通用名
  brand_name      text,                           -- 商品名
  specification   text NOT NULL,                  -- 规格（如 0.25g*24片）
  dosage_form     text NOT NULL,                  -- 剂型（片剂/注射剂/胶囊...）
  route           text,                           -- 默认给药途径
  unit            text NOT NULL,                  -- 最小单位
  price           numeric(12,4),                  -- 参考单价
  manufacturer    text,
  category        text,                           -- 处方药/OTC/麻醉/精神/毒性
  pregnancy_cat   text,                           -- 妊娠分级 A/B/C/D/X
  controlled      boolean NOT NULL DEFAULT false, -- 特殊管控药品
  ingredients     jsonb NOT NULL DEFAULT '[]',    -- 活性成分 [{name,amount,unit}]
  contraindications text,                         -- 禁忌说明
  adverse_reactions text,                         -- 不良反应
  interactions    jsonb NOT NULL DEFAULT '[]',    -- 已知相互作用 [{drug,severity,description}]
  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','inactive','deprecated')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_drug_generic ON clinical.drug_catalog USING gin (to_tsvector('simple', generic_name));
CREATE INDEX IF NOT EXISTS idx_drug_code ON clinical.drug_catalog(drug_code);
CREATE TRIGGER trg_clinical_drug_updated BEFORE UPDATE ON clinical.drug_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 药品库存（按药房/库房）
CREATE TABLE IF NOT EXISTS clinical.drug_inventory (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  drug_id       uuid NOT NULL REFERENCES clinical.drug_catalog(id),
  warehouse     text NOT NULL,                    -- 药房/库房名称
  batch_no      text,
  quantity      numeric(12,2) NOT NULL DEFAULT 0,
  unit          text NOT NULL,
  expiry_date   date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (drug_id, warehouse, batch_no)
);
CREATE INDEX IF NOT EXISTS idx_inv_drug ON clinical.drug_inventory(drug_id);
CREATE TRIGGER trg_clinical_inv_updated BEFORE UPDATE ON clinical.drug_inventory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
