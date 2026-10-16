-- ============================================================================
-- 健澜科技 jlmedaios · M175-C 医院数字孪生深化——3D 可视化
-- 351-twin-3d.sql
--
-- 目标：在 meta.room_layout（322-digital-twin.sql，2D 平面）基础上扩展
--   三维包围盒字段，支撑 3D 楼层建模（科室/病房/手术室/急诊）、床位四态
--   三维映射、患者位置三维追踪（脱敏）与设备位置三维标注。
--
-- 设计边界（本期 3D 不引入 WebGL/Three.js 依赖）：
--   - 2D 平面坐标 x/y/width/height 保留为楼层 footprint（0..1000 网格）；
--   - 新增 floor_z（楼层底面标高，米）与 ceiling_h（房间净高，米），
--     由 BFF 纯函数 build3DDigitalTwin 挤出三维包围盒；
--   - 新增 depth_m（房间进深，米）与 model_url（可选 BIM/IFC 模型引用），
--     生产环境由 BIM 导入工具写入；空库时 BFF 用内置演示台账兜底；
--   - 床位四态与 clinical.beds 对齐：available 空 / occupied 占 /
--     isolation 隔离 / maintenance 维护；
--   - 患者位置只存脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规。
--
-- 【质量与新场景】M175-C：3D 真可用——前端按等距投影渲染挤出体，
--   非花哨截图；路线优化 A* 纯函数在 3D 网格内避障。
--
-- 幂等：ALTER TABLE ... ADD COLUMN IF NOT EXISTS / ON CONFLICT DO NOTHING，
--   可重入，不破坏 322 既有数据。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 三维扩展列（在 322 的 2D footprint 上挤出 z 轴）
-- ---------------------------------------------------------------------------
ALTER TABLE meta.room_layout
  ADD COLUMN IF NOT EXISTS floor_z       numeric(6,1) NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS ceiling_h     numeric(6,1) NOT NULL DEFAULT 3.6,
  ADD COLUMN IF NOT EXISTS depth_m        numeric(6,1) NOT NULL DEFAULT 6.0,
  ADD COLUMN IF NOT EXISTS model_url      text        NOT NULL DEFAULT '';

COMMENT ON COLUMN meta.room_layout.floor_z   IS '楼层底面标高（米）：B1=-4.5, 1F=0, 2F=4.5, ...';
COMMENT ON COLUMN meta.room_layout.ceiling_h IS '房间净高（米），门诊一般 3.6m，手术室 4.5m';
COMMENT ON COLUMN meta.room_layout.depth_m   IS '房间进深（米），与 2D height（网格）等比换算';
COMMENT ON COLUMN meta.room_layout.model_url IS '可选 BIM/IFC 模型引用 URL（空则用挤出盒渲染）';

CREATE INDEX IF NOT EXISTS idx_room_layout_3d_z
  ON meta.room_layout(building_id, floor_z);

-- ---------------------------------------------------------------------------
-- 权限码（幂等）
--   digital_twin_3d:read  查看 3D 数字孪生楼层建模（admin / 护理部 / 医务部）
-- ---------------------------------------------------------------------------
INSERT INTO iam.permissions (code, name, module, description) VALUES
  ('digital_twin_3d:read', '数字孪生 3D 楼层只读', 'digital-twin-3d',
     '查看 admin 3D 数字孪生页：三维楼层建模、床位四态挤出、脱敏患者三维位置与设备三维标注')
ON CONFLICT (code) DO NOTHING;

INSERT INTO iam.role_permissions (role_code, permission_code)
SELECT r.role_code, r.permission_code
FROM (VALUES
  ('admin', 'digital_twin_3d:read')
) AS r(role_code, permission_code)
JOIN iam.roles ro ON ro.code = r.role_code
JOIN iam.permissions p ON p.code = r.permission_code
ON CONFLICT (role_code, permission_code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 演示种子补 z 轴标高（ON CONFLICT 兜底，可重入）
--   main 楼：1F=0, 5F=18.0（4.5m/层 × 4），6F=22.5；急诊楼 1F=0
-- ---------------------------------------------------------------------------
UPDATE meta.room_layout SET floor_z = 18.0, ceiling_h = 3.6
  WHERE building_id = 'main' AND floor = '5' AND floor_z = 0.0;

UPDATE meta.room_layout SET floor_z = 22.5, ceiling_h = 4.5
  WHERE building_id = 'main' AND floor = '6' AND room_type = 'operating_room'
    AND floor_z = 0.0;
UPDATE meta.room_layout SET floor_z = 22.5, ceiling_h = 3.6
  WHERE building_id = 'main' AND floor = '6' AND room_type <> 'operating_room'
    AND floor_z = 0.0;

UPDATE meta.room_layout SET floor_z = 0.0, ceiling_h = 3.6
  WHERE building_id = 'er-building' AND floor = '1' AND floor_z = 0.0;

-- 【远期路线图】后续迁移将增加：
--   - bed_layout_3d（单床三维坐标，对接穿戴 UWB 实时定位）；
--   - equipment_live_3d（IoT 设备三维心跳表，对接 WebSocket 推送——本期不碰 WS）；
--   - bim_model_registry（IFC/GLB 模型版本与租户隔离）。
