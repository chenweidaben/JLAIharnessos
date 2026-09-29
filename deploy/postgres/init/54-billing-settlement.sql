-- ============================================================================
-- 健澜科技 jlmedaios · M3-B 收费结算（费用明细→结算→票据→退费补偿）
-- 54-billing-settlement.sql
--
-- 医院收入循环（Revenue Cycle）真实闭环：
--   1）价表：charge_item_catalog 统一收费项目与价格（药品走 drug_catalog.price）；
--   2）计费：服务（挂号/诊查/检验/检查/治疗/药品…）生成 fee_items 费用明细，
--      幂等——同一来源（source_type, source_id）只生成一条；
--   3）结算：把待结算费用归集到 settlements，收款（unpaid → paid），开具 invoices；
--   4）退费：对已结算明细做补偿（Saga），settled → refunded，结算单/票据联动，
--      同一明细只能退一次（fee_item_id 唯一）。
--
-- 状态机：
--   fee_items   active → settled → refunded；active → void（结算前作废）
--   settlements unpaid → paid → partially_refunded / refunded；unpaid → void
--   invoices    issued（paid 时开具）；refunded 仅累计金额
--
-- 并发与一致性：
--   - 条件式状态推进 UPDATE ... WHERE status=... FOR UPDATE，收款/退费不重复；
--   - 一个就诊同时只允许一张未结/已结/部分退费结算单（部分唯一索引）；
--   - 版本号乐观锁 version；费用与审计哈希链在同一事务提交。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 编号位：位于 M3-A 病案首页 53 之后、60-chat 之前。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1、收费项目价表（医院"价表"，药品价格另见 drug_catalog）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.charge_item_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE,
  name        text NOT NULL,
  category    text NOT NULL
              CHECK (category IN ('registration','consultation','lab','imaging',
                     'treatment','bed','nursing','surgery','material','other')),
  unit        text NOT NULL DEFAULT '次',
  price       numeric(12,2) NOT NULL CHECK (price >= 0),
  aliases     jsonb NOT NULL DEFAULT '[]'::jsonb,   -- 匹配医嘱内容的别名/关键词
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_charge_cat_category ON clinical.charge_item_catalog(category);
CREATE INDEX IF NOT EXISTS idx_charge_cat_name ON clinical.charge_item_catalog USING gin (to_tsvector('simple', name));
DROP TRIGGER IF EXISTS trg_charge_cat_updated ON clinical.charge_item_catalog;
CREATE TRIGGER trg_charge_cat_updated BEFORE UPDATE ON clinical.charge_item_catalog
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 2、结算单（先于费用明细建立，供 fee_items.settlement_id 外键引用）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.settlements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_no   text NOT NULL UNIQUE,
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  department      text NOT NULL,

  status          text NOT NULL DEFAULT 'unpaid'
                  CHECK (status IN ('unpaid','paid','partially_refunded','refunded','void')),
  version         integer NOT NULL DEFAULT 1,

  payment_method  text NOT NULL DEFAULT 'cash'
                  CHECK (payment_method IN ('cash','wechat','alipay','bank_card','insurance','mixed')),

  total_amount    numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
  paid_amount     numeric(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),

  paid_by         uuid REFERENCES iam.users(id),
  paid_at         timestamptz,
  voided_by       uuid REFERENCES iam.users(id),
  voided_at       timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- 一个就诊同时只允许一张"在途"结算单（未付/已付/部分退费），全额退费/作废后可再开
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_settlement_per_visit
  ON clinical.settlements(visit_id) WHERE status IN ('unpaid','paid','partially_refunded');
CREATE INDEX IF NOT EXISTS idx_settlement_status ON clinical.settlements(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_patient ON clinical.settlements(patient_id);
DROP TRIGGER IF EXISTS trg_settlements_updated ON clinical.settlements;
CREATE TRIGGER trg_settlements_updated BEFORE UPDATE ON clinical.settlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 3、费用明细（收费行），金额由 数量×单价 生成
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.fee_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  category        text NOT NULL
                  CHECK (category IN ('registration','consultation','lab','imaging',
                         'drug','treatment','bed','nursing','surgery','material','other')),
  item_code       text,
  item_name       text NOT NULL,
  quantity        numeric(12,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price      numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  amount          numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,

  source_type     text NOT NULL
                  CHECK (source_type IN ('registration','consultation','lab','imaging',
                         'drug','treatment','nursing','bed','surgery','material','other')),
  source_id       uuid,
  price_source    text NOT NULL DEFAULT 'catalog'
                  CHECK (price_source IN ('catalog','drug','default','manual')),

  status          text NOT NULL DEFAULT 'active'
                  CHECK (status IN ('active','settled','refunded','void')),
  settlement_id   uuid REFERENCES clinical.settlements(id),
  department      text NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
-- 幂等：同一来源只生成一条费用（source_id 非空时）
CREATE UNIQUE INDEX IF NOT EXISTS uq_fee_item_source
  ON clinical.fee_items(source_type, source_id) WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_fee_visit_status ON clinical.fee_items(visit_id, status);
CREATE INDEX IF NOT EXISTS idx_fee_settlement ON clinical.fee_items(settlement_id);
CREATE INDEX IF NOT EXISTS idx_fee_patient ON clinical.fee_items(patient_id);
DROP TRIGGER IF EXISTS trg_fee_items_updated ON clinical.fee_items;
CREATE TRIGGER trg_fee_items_updated BEFORE UPDATE ON clinical.fee_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 4、医疗票据（收款后开具，电子票据为主）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.invoices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no      text NOT NULL UNIQUE,
  settlement_id   uuid NOT NULL REFERENCES clinical.settlements(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  invoice_type    text NOT NULL DEFAULT 'electronic'
                  CHECK (invoice_type IN ('electronic','paper')),
  total_amount    numeric(12,2) NOT NULL CHECK (total_amount >= 0),
  refunded_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  status          text NOT NULL DEFAULT 'issued' CHECK (status IN ('issued','void')),
  issued_by       uuid REFERENCES iam.users(id),
  issued_at       timestamptz NOT NULL DEFAULT now(),
  voided_at       timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_invoice_settlement ON clinical.invoices(settlement_id);
CREATE INDEX IF NOT EXISTS idx_invoice_visit ON clinical.invoices(visit_id);

-- ----------------------------------------------------------------------------
-- 5、退费记录（一条费用明细最多退一次；Saga 补偿动作落库）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.refunds (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  refund_no       text NOT NULL UNIQUE,
  settlement_id   uuid NOT NULL REFERENCES clinical.settlements(id),
  invoice_id      uuid REFERENCES clinical.invoices(id),
  patient_id      uuid NOT NULL REFERENCES clinical.patients(id),
  visit_id        uuid NOT NULL REFERENCES clinical.visits(id),
  fee_item_id     uuid NOT NULL UNIQUE REFERENCES clinical.fee_items(id),
  amount          numeric(12,2) NOT NULL CHECK (amount > 0),
  reason          text NOT NULL,
  refunded_by     uuid REFERENCES iam.users(id),
  refunded_at     timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_refund_settlement ON clinical.refunds(settlement_id);
CREATE INDEX IF NOT EXISTS idx_refund_visit ON clinical.refunds(visit_id);

-- ----------------------------------------------------------------------------
-- 6、Saga 编排日志（forward 结算 / compensate 退费，统一关联 saga_id）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.billing_saga_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id     uuid NOT NULL,
  visit_id    uuid REFERENCES clinical.visits(id),
  step        text NOT NULL,
  direction   text NOT NULL CHECK (direction IN ('forward','compensate')),
  status      text NOT NULL CHECK (status IN ('started','succeeded','failed','compensated')),
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_billing_saga ON clinical.billing_saga_log(saga_id, created_at);

-- ============================================================================
-- 7、收费项目价表种子（ON CONFLICT DO NOTHING，可重入）
-- ============================================================================
INSERT INTO clinical.charge_item_catalog (code, name, category, unit, price, aliases) VALUES
  -- 挂号
  ('REG001','普通门诊挂号费','registration','次',10.00,'["普通挂号","普通门诊挂号"]'),
  ('REG002','专家门诊挂号费','registration','次',30.00,'["专家挂号","专家门诊挂号"]'),
  ('REG003','急诊挂号费','registration','次',20.00,'["急诊挂号"]'),
  ('REG004','住院挂号费','registration','次',15.00,'["住院挂号"]'),
  -- 诊查
  ('CON001','门诊诊查费','consultation','次',15.00,'["诊查费","诊疗费","门诊诊疗"]'),
  ('CON002','急诊诊查费','consultation','次',25.00,'["急诊诊查"]'),
  ('CON003','住院诊查费','consultation','次',20.00,'["住院诊查"]'),
  -- 检验
  ('LAB001','血常规','lab','次',25.00,'["血细胞分析","全血细胞计数","CBC"]'),
  ('LAB002','尿常规','lab','次',18.00,'["尿液分析","尿液常规"]'),
  ('LAB003','粪便常规','lab','次',15.00,'["大便常规"]'),
  ('LAB004','肝功能','lab','次',60.00,'["肝功能全套","肝功","肝功能检查"]'),
  ('LAB005','肾功能','lab','次',45.00,'["肾功","肾功能检查"]'),
  ('LAB006','血脂','lab','次',55.00,'["血脂分析","血脂四项"]'),
  ('LAB007','空腹血糖','lab','次',10.00,'["血糖","葡萄糖","血糖测定"]'),
  ('LAB008','糖化血红蛋白','lab','次',70.00,'["糖化","HbA1c","糖化血红蛋白测定"]'),
  ('LAB009','电解质','lab','次',30.00,'["电解质四项","钾钠氯","电解质检查"]'),
  ('LAB010','心肌酶谱','lab','次',80.00,'["心肌酶","心肌酶检查"]'),
  ('LAB011','肌钙蛋白','lab','次',120.00,'["cTnI","肌钙蛋白定量","肌钙蛋白测定","肌钙蛋白I"]'),
  ('LAB012','B型利钠肽','lab','次',150.00,'["BNP","脑钠肽","BNP测定"]'),
  ('LAB013','凝血功能','lab','次',65.00,'["凝血四项","凝血检查","凝血"]'),
  ('LAB014','D-二聚体','lab','次',90.00,'["D二聚体","D-二聚体测定","DD"]'),
  ('LAB015','甲状腺功能','lab','次',120.00,'["甲功","甲功五项","甲状腺功能检查"]'),
  ('LAB016','血淀粉酶','lab','次',35.00,'["淀粉酶","淀粉酶测定"]'),
  ('LAB017','血气分析','lab','次',80.00,'["血气"]'),
  ('LAB018','C反应蛋白','lab','次',40.00,'["CRP","C-反应蛋白"]'),
  -- 检查（影像/功能）
  ('IMG001','胸部X线摄影','imaging','次',60.00,'["胸片","胸部正位","胸部DR","DR胸部"]'),
  ('IMG002','胸部CT平扫','imaging','次',280.00,'["胸部CT","肺CT","胸部CT"]'),
  ('IMG003','头部CT平扫','imaging','次',260.00,'["头颅CT","脑CT","头部CT","颅脑CT"]'),
  ('IMG004','头部MRI','imaging','次',550.00,'["头颅MRI","脑MRI","头部核磁","头颅核磁","颅脑MRI"]'),
  ('IMG005','腹部超声','imaging','次',120.00,'["腹部彩超","肝胆胰脾超声","肝胆B超"]'),
  ('IMG006','心脏彩色多普勒超声','imaging','次',180.00,'["心脏彩超","心超","心脏超声","心脏多普勒"]'),
  ('IMG007','心电图','imaging','次',30.00,'["ECG","12导联心电图","床旁心电图","十二导联心电图"]'),
  ('IMG008','腹部CT平扫','imaging','次',280.00,'["腹部CT","上腹CT"]'),
  ('IMG009','颈动脉超声','imaging','次',130.00,'["颈动脉彩超","颈部血管超声"]'),
  ('IMG010','腰椎MRI','imaging','次',520.00,'["腰椎核磁","腰椎MRI平扫"]'),
  ('IMG011','甲状腺超声','imaging','次',100.00,'["甲状腺彩超"]'),
  ('IMG012','泌尿系超声','imaging','次',110.00,'["泌尿系彩超","双肾超声","肾脏超声"]'),
  -- 治疗
  ('TRE001','静脉输液','treatment','次',15.00,'["输液","静脉滴注","打点滴","点滴"]'),
  ('TRE002','静脉注射','treatment','次',10.00,'["静注","静脉推注"]'),
  ('TRE003','肌肉注射','treatment','次',6.00,'["肌注"]'),
  ('TRE004','皮下注射','treatment','次',6.00,'["皮注"]'),
  ('TRE005','吸氧','treatment','小时',8.00,'["氧气吸入","氧疗"]'),
  ('TRE006','清创缝合','treatment','次',180.00,'["清创","缝合","清创缝合术"]'),
  ('TRE007','雾化吸入','treatment','次',20.00,'["雾化","雾化治疗"]'),
  ('TRE008','胃肠减压','treatment','次',25.00,'["胃肠减压术"]'),
  ('TRE009','导尿','treatment','次',30.00,'["留置导尿","导尿术"]'),
  ('TRE010','心肺复苏','treatment','次',300.00,'["CPR","胸外按压"]'),
  -- 床位 / 护理
  ('BED001','普通病房床位费','bed','天',50.00,'["床位费","床费","普通床位"]'),
  ('BED002','监护病房床位费','bed','天',200.00,'["ICU床位","监护床","重症监护床位"]'),
  ('NUR001','Ⅰ级护理','nursing','天',25.00,'["一级护理","I级护理"]'),
  ('NUR002','Ⅱ级护理','nursing','天',18.00,'["二级护理","II级护理"]'),
  ('NUR003','Ⅲ级护理','nursing','天',12.00,'["三级护理","III级护理"]'),
  ('NUR004','特级护理','nursing','天',80.00,'["特级护理"]'),
  -- 手术 / 材料 / 其他
  ('SUR001','阑尾切除术','surgery','次',1500.00,'["阑尾炎手术","阑尾切除"]'),
  ('SUR002','胆囊切除术','surgery','次',4000.00,'["胆囊手术","腹腔镜胆囊切除"]'),
  ('SUR003','骨折内固定术','surgery','次',6000.00,'["骨折内固定","内固定术"]'),
  ('MAT001','一次性输液器','material','个',5.00,'["输液器"]'),
  ('MAT002','一次性注射器','material','个',2.00,'["注射器"]'),
  ('OTH001','其他化验','other','次',20.00,'["其他检验"]'),
  ('OTH002','其他检查','other','次',100.00,'[]'),
  ('OTH003','其他治疗','other','次',30.00,'[]')
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- 8、IAM 权限码种子（不改 10-iam.sql）
--    billing:read   收费查询/队列/详情
--    billing:charge 计费、归集、收款、票据开具（收费员）
--    billing:refund 退费、作废（高风险，单独授权，宜双人/主管）
-- ============================================================================
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('billing:read',   '收费结算读取', 'billing', '费用明细/结算单/票据查询'),
  ('billing:charge', '收费结算收款', 'billing', '计费、费用归集、收款与票据开具'),
  ('billing:refund', '收费退费作废', 'billing', '退费与结算单作废（高风险，单独授权）')
ON CONFLICT (code) DO NOTHING;

-- 授予角色（DB 目录种子；运行时 RBAC 映射见 userView.ts ROLE_PERMISSIONS）
--   admin：收费员/主管，读 + 收款 + 退费
--   doctor / pharmacist / nurse：只读（核对费用），收款/退费一律 403
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'billing:read'),
  ('admin', 'billing:charge'),
  ('admin', 'billing:refund'),
  ('doctor', 'billing:read'),
  ('pharmacist', 'billing:read'),
  ('nurse', 'billing:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;
