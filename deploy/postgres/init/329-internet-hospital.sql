-- ============================================================================
-- 健澜科技 jlmedaios · M163-D 互联网医院深化 · 处方流转与药品配送
-- 329-internet-hospital.sql
--
-- 业务闭环（与本切片纯函数一一对应）：
--   患者预约 → 医生接诊 → 在线问诊 → 开具处方
--     → 处方流转（routePrescriptionToPharmacy：按患者定位选最近合规药房）
--     → 药品配送（trackDelivery：建单→打包→发货→送达/取药）
--     → 用药随访
--
-- 与既有表的关系（不覆盖、不修改）：
--   · clinical.internet_prescriptions（65）：电子处方主表，审方状态机；
--   · clinical.prescription_deliveries（67）：药房侧履约单（自取/快递、取货码）；
--   · 本表 clinical.prescription_delivery_routes：处方流转路由记录，
--     记录“一张审方通过的处方被流转到哪家互联网药房、距离/ETA/选择理由”，
--     与 67 履约单通过 rx_id 关联，口径互不重叠。
--
-- 合规红线（安全与运营）：
--   · 麻、精、毒、放、医疗用毒性药品、终止妊娠类药品不得在互联网医院开具；
--     开方时即拦截，流转前 verifyOnlinePrescription 二次复核；
--   · 复诊二次方（second_time=true）必须经药师审方通过（status='approved'）
--     方可流转配送，未审方一律阻断；
--   · 承接药房须持《药品经营许可证》《互联网药品信息服务资格证》双证，
--     licensed=false 的药房不参与路由；
--   · 处方仅在审方通过（approved）后方可流转，pending_review/rejected/cancelled
--     一律禁止进入配送，杜绝“未审先配”“违规售药”。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
-- 不触碰 WebSocket；本切片仅做拉取式 REST。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ----------------------------------------------------------------------------
-- （1）处方流转路由表 prescription_delivery_routes
--     ：一张审方通过的处方 → 选定一家合规互联网药房（就近 + 持证 + 有库存）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.prescription_delivery_routes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_no            text NOT NULL UNIQUE,

  -- 被流转的电子处方（65 主表），仅 approved 处方可建路由
  rx_id               uuid NOT NULL REFERENCES clinical.internet_prescriptions(id),
  patient_id          uuid NOT NULL REFERENCES clinical.patients(id),

  -- 承接药房（外部互联网药房字典，不设外键，由运营维护）
  pharmacy_id         text NOT NULL,
  pharmacy_name       text NOT NULL,
  -- 配送方式：self_pick 到店自取 / express 快递上门
  channel             text NOT NULL CHECK (channel IN ('self_pick','express')),

  -- 路由决策依据（按患者定位就近）
  distance_km         numeric(6,2),
  eta_minutes         integer,
  route_reason        text NOT NULL DEFAULT '',

  -- 合规复核结果：pass 放行流转 / blocked 阻断（违规药品或未审方）
  compliance_result   text NOT NULL DEFAULT 'pending'
                        CHECK (compliance_result IN ('pending','pass','blocked')),
  -- 阻断原因（合规不通过时必填，便于药师复盘）
  block_reason        text,

  -- 路由状态机：routed 已流转 → accepted 药房接单 → rejected 药房拒单
  status              text NOT NULL DEFAULT 'routed'
                        CHECK (status IN ('routed','accepted','rejected','cancelled')),

  routed_by           uuid,
  accepted_at         timestamptz,
  rejected_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- 一张处方同时仅一条有效流转路由（未取消/未拒单）
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_route_per_rx
  ON clinical.prescription_delivery_routes(rx_id)
  WHERE status IN ('routed','accepted');
CREATE INDEX IF NOT EXISTS idx_route_patient
  ON clinical.prescription_delivery_routes(patient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_route_pharmacy
  ON clinical.prescription_delivery_routes(pharmacy_id, status);
CREATE INDEX IF NOT EXISTS idx_route_status
  ON clinical.prescription_delivery_routes(status, created_at DESC);

DROP TRIGGER IF EXISTS trg_prescription_routes_updated
  ON clinical.prescription_delivery_routes;
CREATE TRIGGER trg_prescription_routes_updated
  BEFORE UPDATE ON clinical.prescription_delivery_routes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ----------------------------------------------------------------------------
-- （2）互联网药房字典（外部承接药房，双证齐全方可参与路由）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clinical.internet_pharmacies (
  id                  text PRIMARY KEY,
  name                text NOT NULL,
  -- 《药品经营许可证》《互联网药品信息服务资格证》双证齐全标记
  licensed            boolean NOT NULL DEFAULT false,
  lng                 numeric(9,5),
  lat                 numeric(9,5),
  -- 服务半径（公里），患者定位超出半径不承接
  service_radius_km   numeric(5,2) NOT NULL DEFAULT 5.0,
  -- 是否有该处方库存（演示/路由锚点，运营可维护）
  stock_ready         boolean NOT NULL DEFAULT true,
  enabled             boolean NOT NULL DEFAULT true
);

-- ----------------------------------------------------------------------------
-- （3）权限点与角色授权
-- ----------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('internet:prescription:route', '互联网处方流转', 'internet-hospital',
     '将审方通过的处方按患者定位流转至最近合规互联网药房'),
  ('internet:delivery:track', '互联网配送追踪', 'internet-hospital',
     '按处方查询药品配送全链路状态（建单/打包/发货/送达）')
ON CONFLICT (code) DO NOTHING;

-- 患者：发起流转 + 追踪本人配送
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'patient'
   AND p.code IN ('internet:prescription:route','internet:delivery:track')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 药师：流转 + 追踪（审方后衔接配送）
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'pharmacist'
   AND p.code IN ('internet:prescription:route','internet:delivery:track')
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- 管理端：流转 + 追踪
INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.code, p.code
  FROM iam.roles r
 CROSS JOIN iam.permissions p
 WHERE r.code = 'admin'
   AND p.code IN ('internet:prescription:route','internet:delivery:track')
ON CONFLICT (role_code, permission_code) DO NOTHING;
