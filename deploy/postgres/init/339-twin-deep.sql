-- ============================================================================
-- 健澜科技 jlmedaios · M170-B 医院数字孪生深化——多建筑与仿真（自学习与数字孪生）
-- 339-twin-deep.sql
--
-- 目标：在 M160-B meta.room_layout（2D 楼层平面）之上做「多建筑语义扩展」，
--   把单一 main/er-building 布局升级为覆盖全院四类楼宇的孪生底图：
--     · 门诊楼 outpatient  ：楼层 / 科室 / 诊室 / 候诊区
--     · 住院楼 inpatient  ：楼层 / 病房 / 床位 / 护士站
--     · 医技楼 medical_tech：检查室 / 检验室 / 手术室
--     · 急诊楼 emergency   ：抢救室 / 留观室 / 输液室
--
-- 本期扩展的列（幂等 ADD COLUMN IF NOT EXISTS，可重入）：
--   - building_kind   楼宇大类（门诊/住院/医技/急诊）
--   - zone_type       细粒度分区类型（诊室/候诊区/病房/检查室/检验室/抢救/留观/输液…）
--   - crowd_baseline  基线人流密度（人次/小时），供 predictCrowdDensity 密度预测
--   - route_weight    寻路边权重（>0），供 optimizePatientRoute 最短路径/避堵
--
-- 设计边界：
--   - 仍为 2D 平面归一化坐标（0..1000 网格），不接 BIM/IFC、不碰 WebSocket；
--   - 患者位置只存脱敏标识（P-xxx），不落 PII；
--   - BFF 纯函数（twinDeepAggregator）内置演示台账与本种子对齐，空库仍可演示。
--
-- 【自学习与数字孪生】
--   - crowd_baseline 为冷启动基线，远期由自学习模块用真实客流/挂号/叫号数据
--     持续回写校准，使密度预测与路线优化越用越准（本切片不做回写）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. 扩展 meta.room_layout：多建筑语义 + 仿真参数列
-- ---------------------------------------------------------------------------
ALTER TABLE meta.room_layout
  ADD COLUMN IF NOT EXISTS building_kind  text    NOT NULL DEFAULT 'outpatient',
  ADD COLUMN IF NOT EXISTS zone_type      text    NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS crowd_baseline integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS route_weight   numeric(4,1) NOT NULL DEFAULT 1.0;

-- 幂等重建 CHECK（DROP IF EXISTS + ADD），收紧四类新列取值域
ALTER TABLE meta.room_layout
  DROP CONSTRAINT IF EXISTS room_layout_building_kind_check,
  ADD CONSTRAINT room_layout_building_kind_check CHECK (building_kind IN
    ('outpatient','inpatient','medical_tech','emergency')),
  DROP CONSTRAINT IF EXISTS room_layout_zone_type_check,
  ADD CONSTRAINT room_layout_zone_type_check CHECK (zone_type IN
    ('department','clinic_room','waiting_area','ward','bed','nurse_station',
     'exam_room','lab_room','operating_room','resus','observation',
     'infusion','corridor','other')),
  DROP CONSTRAINT IF EXISTS room_layout_crowd_baseline_check,
  ADD CONSTRAINT room_layout_crowd_baseline_check CHECK (crowd_baseline >= 0),
  DROP CONSTRAINT IF EXISTS room_layout_route_weight_check,
  ADD CONSTRAINT room_layout_route_weight_check CHECK (route_weight > 0);

-- 新增索引：按楼宇大类 + 分区类型快速渲染多建筑孪生
CREATE INDEX IF NOT EXISTS idx_room_layout_kind
  ON meta.room_layout(building_kind, zone_type);

-- ---------------------------------------------------------------------------
-- 2. 权限码（幂等）：数字孪生多建筑深化只读
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('digital_twin:deep:read', '数字孪生多建筑深化只读', 'digital-twin',
     '查看 admin 数字孪生多建筑页：四类楼宇 2D 总览、患者流仿真、人流密度预测与路线优化')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'digital_twin:deep:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. 多建筑演示种子（与 twinDeepAggregator 内置台账对齐；ON CONFLICT 兜底）
--   坐标为 0..1000 平面网格示例，仅供空库演示；生产环境由 BIM 导入工具补齐。
-- ---------------------------------------------------------------------------

-- 3.1 门诊楼 opd-building：1F 大厅/挂号/药房，2F 内外科诊室+候诊，3F 专科
INSERT INTO meta.room_layout
  (building_id, floor, room_code, room_name, room_type, dept_name,
   x, y, width, height, capacity, bed_count, status,
   building_kind, zone_type, crowd_baseline, route_weight, note) VALUES
  ('opd-building','1','OPD-大厅','门诊大厅','waiting_area','门诊部',
    60,80,880,120,600,0,'available','outpatient','waiting_area',480,1.0,
    '自学习与数字孪生：门诊到院主入口，人流密度最高'),
  ('opd-building','1','OPD-挂号','挂号收费处','department','门诊部',
    60,220,200,100,80,0,'available','outpatient','department',200,1.2,'高峰易排队'),
  ('opd-building','1','OPD-导诊','导诊台','nurse_station','门诊部',
    300,220,160,100,10,0,'available','outpatient','nurse_station',120,1.0,''),
  ('opd-building','1','OPD-药房','门诊药房','department','药剂科',
    820,220,180,100,50,0,'available','outpatient','department',150,1.1,''),
  ('opd-building','2','OPD-内科','内科诊室','department','心血管内科',
    60,120,260,160,40,0,'available','outpatient','clinic_room',180,1.0,''),
  ('opd-building','2','OPD-外科','外科诊室','department','普通外科',
    360,120,260,160,40,0,'available','outpatient','clinic_room',160,1.0,''),
  ('opd-building','2','OPD-候诊2','二层候诊区','waiting_area','门诊部',
    660,120,280,160,200,0,'available','outpatient','waiting_area',220,1.0,''),
  ('opd-building','2','OPD-连廊2','二层走廊','corridor','门诊部',
    60,320,880,60,400,0,'available','outpatient','corridor',300,1.0,''),
  ('opd-building','3','OPD-专科3','专科诊室','department','门诊部',
    60,120,400,200,30,0,'available','outpatient','clinic_room',140,1.0,''),
  ('opd-building','3','OPD-候诊3','三层候诊区','waiting_area','门诊部',
    500,120,440,200,150,0,'available','outpatient','waiting_area',160,1.0,''),
  ('opd-building','3','OPD-连廊3','三层走廊','corridor','门诊部',
    60,360,880,60,300,0,'available','outpatient','corridor',200,1.0,'')
ON CONFLICT (building_id, floor, room_code) DO NOTHING;

-- 3.2 住院楼 ipd-building：5F/6F 病房 + 护士站 + 电梯厅
INSERT INTO meta.room_layout
  (building_id, floor, room_code, room_name, room_type, dept_name,
   x, y, width, height, capacity, bed_count, status,
   building_kind, zone_type, crowd_baseline, route_weight, note) VALUES
  ('ipd-building','5','IPD-5大厅','五层病区大厅','waiting_area','心血管内科',
    60,80,880,100,120,0,'available','inpatient','waiting_area',60,1.0,''),
  ('ipd-building','5','IPD-5护士站','五层护士站','nurse_station','心血管内科',
    380,200,240,90,8,0,'available','inpatient','nurse_station',30,1.0,''),
  ('ipd-building','5','IPD-501','心内科一病房','ward','心血管内科',
    60,200,280,180,40,24,'occupied','inpatient','ward',25,1.3,'含床位 24'),
  ('ipd-building','5','IPD-502','心内科二病房','ward','心血管内科',
    60,400,280,180,40,22,'occupied','inpatient','ward',22,1.3,'含床位 22'),
  ('ipd-building','5','IPD-5CCU','CCU 监护室','icu','心血管内科',
    680,200,260,200,20,14,'isolation','inpatient','ward',18,1.5,'隔离监护'),
  ('ipd-building','5','IPD-电梯厅','五层电梯厅','corridor','住院部',
    680,440,260,80,100,0,'available','inpatient','corridor',90,1.0,'连通六层'),
  ('ipd-building','6','IPD-6大厅','六层病区大厅','waiting_area','普通外科',
    60,80,880,100,120,0,'available','inpatient','waiting_area',55,1.0,''),
  ('ipd-building','6','IPD-6护士站','六层护士站','nurse_station','普通外科',
    380,200,240,90,8,0,'available','inpatient','nurse_station',28,1.0,''),
  ('ipd-building','6','IPD-601','普外一病房','ward','普通外科',
    60,200,280,180,40,26,'occupied','inpatient','ward',24,1.3,'含床位 26'),
  ('ipd-building','6','IPD-602','普外二病房','ward','普通外科',
    60,400,280,180,40,20,'available','inpatient','ward',20,1.3,'含床位 20'),
  ('ipd-building','6','IPD-6电梯厅','六层电梯厅','corridor','住院部',
    680,200,260,120,100,0,'available','inpatient','corridor',95,1.0,'连通五层')
ON CONFLICT (building_id, floor, room_code) DO NOTHING;

-- 3.3 医技楼 tech-building：2F 放射/超声，3F 检验/采血，4F 手术室
INSERT INTO meta.room_layout
  (building_id, floor, room_code, room_name, room_type, dept_name,
   x, y, width, height, capacity, bed_count, status,
   building_kind, zone_type, crowd_baseline, route_weight, note) VALUES
  ('tech-building','2','TECH-2大厅','医技大厅','waiting_area','医技部',
    60,80,880,100,250,0,'available','medical_tech','waiting_area',200,1.0,''),
  ('tech-building','2','TECH-电梯','电梯厅','corridor','医技部',
    60,200,160,100,80,0,'available','medical_tech','corridor',150,1.0,'连通2/3/4层'),
  ('tech-building','2','TECH-放射','CT/DR 检查室','department','放射科',
    260,200,300,200,30,0,'occupied','medical_tech','exam_room',120,1.2,'检查中'),
  ('tech-building','2','TECH-候2','二层候检区','waiting_area','医技部',
    600,200,340,200,150,0,'available','medical_tech','waiting_area',140,1.0,''),
  ('tech-building','2','TECH-超声','B 超检查室','department','超声科',
    260,420,300,160,24,0,'available','medical_tech','exam_room',100,1.2,''),
  ('tech-building','3','TECH-3大厅','三层检验大厅','waiting_area','检验科',
    60,80,880,100,200,0,'available','medical_tech','waiting_area',160,1.0,''),
  ('tech-building','3','TECH-检验','检验科','department','检验科',
    60,200,400,200,40,0,'available','medical_tech','lab_room',90,1.1,''),
  ('tech-building','3','TECH-采血','采血室','department','检验科',
    500,200,240,200,30,0,'available','medical_tech','lab_room',110,1.1,''),
  ('tech-building','4','TECH-4大厅','四层手术区大厅','waiting_area','手术麻醉科',
    60,80,880,100,100,0,'available','medical_tech','waiting_area',70,1.0,''),
  ('tech-building','4','TECH-OR1','一号手术室','operating_room','手术麻醉科',
    60,200,280,200,10,0,'occupied','medical_tech','operating_room',12,1.5,'手术中'),
  ('tech-building','4','TECH-OR2','二号手术室','operating_room','手术麻醉科',
    360,200,280,200,10,0,'available','medical_tech','operating_room',10,1.5,''),
  ('tech-building','4','TECH-OR3','三号手术室','operating_room','手术麻醉科',
    660,200,280,200,10,0,'maintenance','medical_tech','operating_room',8,1.5,'维护中')
ON CONFLICT (building_id, floor, room_code) DO NOTHING;

-- 3.4 急诊楼 er-building：在既有 1F 布局上补「输液室」等深化分区（room_code 不冲突）
INSERT INTO meta.room_layout
  (building_id, floor, room_code, room_name, room_type, dept_name,
   x, y, width, height, capacity, bed_count, status,
   building_kind, zone_type, crowd_baseline, route_weight, note) VALUES
  ('er-building','1','ER-大厅','急诊大厅','waiting_area','急诊医学科',
    60,80,880,110,300,0,'available','emergency','waiting_area',260,1.0,'急诊主入口'),
  ('er-building','1','ER-分诊','检伤分诊台','nurse_station','急诊医学科',
    60,210,200,90,6,0,'available','emergency','nurse_station',140,1.0,'红黄绿灯检伤'),
  ('er-building','1','ER-抢救','急诊抢救室','er','急诊医学科',
    300,210,300,200,20,16,'occupied','emergency','resus',45,1.6,'绿色通道'),
  ('er-building','1','ER-留观','急诊留观室','er','急诊医学科',
    60,430,300,200,40,28,'occupied','emergency','observation',60,1.3,''),
  ('er-building','1','ER-输液','急诊输液室','department','急诊医学科',
    380,430,300,200,60,40,'occupied','emergency','infusion',80,1.2,''),
  ('er-building','1','ER-诊室','急诊诊室','department','急诊医学科',
    640,210,300,160,12,0,'available','emergency','clinic_room',90,1.0,''),
  ('er-building','1','ER-护士站','急诊护士站','nurse_station','急诊医学科',
    640,400,300,120,10,0,'available','emergency','nurse_station',40,1.0,'')
ON CONFLICT (building_id, floor, room_code) DO NOTHING;

-- 【远期路线图】后续迁移将增加：
--   - crowd_learning_log（自学习客流回写日志，持续校准 crowd_baseline）；
--   - route_graph_edges（显式走廊边表，替代聚合器内存邻接表）；
--   - 3D 包围盒与 BIM/IFC 模型绑定（本期仍为 2D 平面）。
