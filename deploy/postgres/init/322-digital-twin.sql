-- ============================================================================
-- 健澜科技 jlmedaios · M160-B 医院数字孪生基础（2D 可视化）
-- 322-digital-twin.sql
--
-- 目标：为"医院数字孪生"沉淀一张楼层平面布局表 meta.room_layout，
--   支撑 2D 楼层平面图（科室 / 病房 / 手术室 / 急诊）、床位四态实时映射、
--   患者位置脱敏追踪与设备位置标注。
--
-- 设计边界（本期只做 2D）：
--   - 坐标采用 2D 平面归一化坐标（x/y/width/height，单位 0..1000 的平面网格），
--     前端按等比缩放渲染，不依赖 BIM/IFC；
--   - 床位四态与 clinical.beds 对齐：available 空 / occupied 占 /
--     isolation 隔离 / maintenance 维护；
--   - 患者位置只存脱敏标识（P-xxx），不落姓名/身份证，符合隐私合规；
--   - 设备位置以 jsonb 标注（设备编码 + 平面坐标），不接 IoT 实时流。
--
-- 【远期路线图】
--   - 3D 可视化：接入 BIM/IFC 模型与 Three.js 场景，本表坐标升级为三维包围盒；
--   - 实时推送：通过 WebSocket / MQTT 把床位状态与患者穿戴定位推送到孪生大屏；
--   - 仿真推演：基于 simulateBedUsage 的日/周曲线做床位扩容与急诊高峰预案。
--
-- 幂等：CREATE TABLE IF NOT EXISTS / ON CONFLICT DO NOTHING，可重入。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 楼层房间布局表（2D 平面）
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meta.room_layout (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- 楼宇编号（如 main 门诊住院综合楼 / er-building 急诊楼）
  building_id  text NOT NULL DEFAULT 'main',
  -- 楼层（如 B1 / 1 / 5 / 6）
  floor        text NOT NULL,
  -- 房间编号（如 501 / OR-03 / ER-抢救室1）
  room_code    text NOT NULL,
  room_name    text NOT NULL,
  -- 房间类型：department 科室 / ward 病房 / operating_room 手术室 /
  --          er 急诊 / icu 重症 / nurse_station 护士站 / corridor 走廊 / other
  room_type    text NOT NULL CHECK (room_type IN
                ('department','ward','operating_room','er','icu',
                 'nurse_station','corridor','other')),
  -- 所属科室（展示用，如 心血管内科）
  dept_name    text NOT NULL DEFAULT '',
  -- 2D 平面归一化坐标（0..1000 网格，前端等比缩放）
  x            numeric(6,1) NOT NULL DEFAULT 0,
  y            numeric(6,1) NOT NULL DEFAULT 0,
  width        numeric(6,1) NOT NULL DEFAULT 100,
  height       numeric(6,1) NOT NULL DEFAULT 80,
  -- 床位容量 / 实有床位
  capacity     integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  bed_count    integer NOT NULL DEFAULT 0 CHECK (bed_count >= 0),
  -- 房间聚合状态（与床位四态对齐，由 BFF 纯函数重算，不做触发强约束）
  status       text NOT NULL DEFAULT 'available'
                CHECK (status IN ('available','occupied','isolation','maintenance')),
  -- 设备位置标注：[{"code":"vent-01","name":"有创呼吸机","x":80,"y":60}]
  equipment    jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- 患者脱敏位置标注：[{"patientRef":"P-0001","x":40,"y":55}]（不落 PII）
  patient_refs jsonb NOT NULL DEFAULT '[]'::jsonb,
  note         text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (building_id, floor, room_code)
);

CREATE INDEX IF NOT EXISTS idx_room_layout_lookup
  ON meta.room_layout(building_id, floor, room_type);
CREATE INDEX IF NOT EXISTS idx_room_layout_status
  ON meta.room_layout(building_id, status);

DROP TRIGGER IF EXISTS trg_meta_room_layout_updated ON meta.room_layout;
CREATE TRIGGER trg_meta_room_layout_updated BEFORE UPDATE ON meta.room_layout
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
--   digital_twin:read  查看 2D 数字孪生楼层布局（admin / 护理部 / 医务部）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('digital_twin:read', '数字孪生 2D 楼层只读', 'digital-twin',
     '查看 admin 数字孪生页：楼层平面图、床位四态映射、脱敏患者位置与设备标注')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'digital_twin:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 演示布局种子（main 楼 5F/6F + 急诊楼 1F；ON CONFLICT 兜底，可重入）
--   坐标为 0..1000 平面网格示例，仅供空库演示；生产环境由 BIM 导入工具补齐。
-- ---------------------------------------------------------------------------
INSERT INTO meta.room_layout
  (building_id, floor, room_code, room_name, room_type, dept_name,
   x, y, width, height, capacity, bed_count, status, equipment, note) VALUES
  -- main 5F：心内科病区
  ('main','5','501','心内科一病房','ward','心血管内科',
    60,120,260,180,6,6,'occupied',
    '[{"code":"card-mon-01","name":"床旁监护仪","x":120,"y":160}]',
    '演示：4 占 1 空 1 隔离'),
  ('main','5','502','心内科二病房','ward','心血管内科',
    360,120,260,180,4,4,'occupied',
    '[]','演示'),
  ('main','5','503','CCU 监护室','icu','心血管内科',
    60,340,260,180,8,6,'isolation',
    '[{"code":"vent-01","name":"有创呼吸机","x":120,"y":380},
      {"code":"crrt-01","name":"CRRT 机","x":260,"y":420}]',
    '演示：隔离/监护'),
  ('main','5','5-N','心内科护士站','nurse_station','心血管内科',
    360,340,260,90,0,0,'available','[]',''),
  -- main 6F：普外科病区
  ('main','6','601','普外一病房','ward','普通外科',
    60,120,260,180,6,5,'occupied',
    '[]','演示：含 1 间维护床'),
  ('main','6','602','普外二病房','ward','普通外科',
    360,120,260,180,6,4,'available',
    '[]','演示：2 床空置待消毒'),
  ('main','6','OR-01','一号手术室','operating_room','手术麻醉科',
    60,340,200,160,0,0,'occupied',
    '[{"code":"anes-01","name":"麻醉机","x":110,"y":380},
      {"code":"op-lamp-01","name":"无影灯","x":160,"y":400}]',
    '演示：手术进行中'),
  ('main','6','OR-02','二号手术室','operating_room','手术麻醉科',
    290,340,200,160,0,0,'available',
    '[]','演示：待机'),
  ('main','6','OR-03','三号手术室','operating_room','手术麻醉科',
    520,340,200,160,0,0,'maintenance',
    '[]','演示：设备维护中'),
  -- er-building 1F：急诊
  ('er-building','1','ER-抢救','急诊抢救室','er','急诊医学科',
    60,120,300,200,6,5,'occupied',
    '[{"code":"crash-01","name":"抢救车","x":100,"y":160}]',''),
  ('er-building','1','ER-留观','急诊留观室','er','急诊医学科',
    400,120,300,200,10,7,'occupied','[]',''),
  ('er-building','1','ER-诊室1','急诊诊室一','department','急诊医学科',
    60,360,180,120,0,0,'available','[]','')
ON CONFLICT (building_id, floor, room_code) DO NOTHING;

-- 【远期路线图】后续迁移将增加：
--   - room_layout_3d（三维包围盒 min_x/min_y/min_z/max_x/max_y/max_z）；
--   - bed_layout（床位在房间内的相对坐标，细粒度到单床渲染）；
--   - equipment_live（IoT 设备实时心跳表，对接 WebSocket 推送）。
