-- ============================================================================
-- 健澜科技 jlmedaios — M153-B 药品全生命周期管理
--
-- 采购入库 → 库存 → 处方 → 不良反应 全链路批次级追溯。
-- 临床决策支持：
--   * 召回精确到批次（recall_scope = 'batch'），仅将指定批号置为 recalled，
--     同一药品的其他批号仍为 active、正常销售，绝不全停；
--   * 近效期自动预警（expiry_date - CURRENT_DATE <= 90 天）由应用层扫描，
--     本表用 idx 支撑范围查询；
--   * 不良反应以 jsonb 摘要挂在批次行上，支持按药品聚合上报。
-- 兼容：CREATE TABLE IF NOT EXISTS / ALTER TABLE ADD COLUMN IF NOT EXISTS，可重复执行。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE TABLE IF NOT EXISTS clinical.drug_lifecycle (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 批号：全生命周期追溯的最小粒度，唯一
  batch_no         text NOT NULL UNIQUE,
  -- 关联药品（clinical.drug_catalog.id）
  drug_id          uuid NOT NULL,
  drug_code        text,
  drug_name        text NOT NULL DEFAULT '',
  -- 采购入库节点
  production_date  date,
  expiry_date      date,
  supplier         text,
  quantity         integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit             text NOT NULL DEFAULT '盒',
  -- ---------------- 批次状态机 ----------------
  -- active   = 在库/在销（含近效期预警，仍可销售）
  -- recalled = 问题批次已召回（仅本批次停售，不影响其他批次）
  -- expired  = 已过效期，自动锁定
  -- discarded= 报损销毁
  status           text NOT NULL DEFAULT 'active'
                   CHECK (status IN ('active','recalled','expired','discarded')),
  -- 召回范围：固定 'batch'（批次级），杜绝"全停"
  recall_scope     text NOT NULL DEFAULT 'batch'
                   CHECK (recall_scope IN ('batch')),
  recall_reason    text,
  recalled_at      timestamptz,
  -- 不良反应摘要：[{reaction, severity, count, last_reported_at}]
  adverse_summary  jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 处方/调剂追溯计数（全链路：该批号已发药人次）
  dispensed_count  integer NOT NULL DEFAULT 0 CHECK (dispensed_count >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- 兼容既有库：表已存在则补齐列
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS drug_code text;
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS production_date date;
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS supplier text;
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS unit text NOT NULL DEFAULT '盒';
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS recall_scope text NOT NULL DEFAULT 'batch'
  CHECK (recall_scope IN ('batch'));
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS adverse_summary jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE clinical.drug_lifecycle ADD COLUMN IF NOT EXISTS dispensed_count integer NOT NULL DEFAULT 0
  CHECK (dispensed_count >= 0);

-- 批号唯一追溯
CREATE UNIQUE INDEX IF NOT EXISTS uq_drug_lifecycle_batch_no
  ON clinical.drug_lifecycle(batch_no);
-- 按药品聚合（不良反应报告 / 同药品多批次比对）
CREATE INDEX IF NOT EXISTS idx_drug_lifecycle_drug
  ON clinical.drug_lifecycle(drug_id, status);
-- 近效期预警范围扫描
CREATE INDEX IF NOT EXISTS idx_drug_lifecycle_expiry
  ON clinical.drug_lifecycle(expiry_date)
  WHERE status = 'active';
-- 在库批次过滤
CREATE INDEX IF NOT EXISTS idx_drug_lifecycle_status
  ON clinical.drug_lifecycle(status);

DROP TRIGGER IF EXISTS trg_drug_lifecycle_updated ON clinical.drug_lifecycle;
CREATE TRIGGER trg_drug_lifecycle_updated BEFORE UPDATE ON clinical.drug_lifecycle
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE clinical.drug_lifecycle IS
  'M153-B 药品全生命周期：批次级追溯/近效期预警/批次召回（临床决策支持）';
