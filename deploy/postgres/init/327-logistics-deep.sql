-- ============================================================================
-- 健澜科技 jlmedaios - 医院全场景后勤智能化任务表（M162-D）【医院全场景】
--
-- 【业务目标】后勤派单要高效，不能推诿。
--   M142-D（282-logistics.sql）解决的是「报修工单要跟踪到完成」；本版向全场景延伸，
--   把医院后勤四大域全部收敛到同一张任务表，派单一键直达责任班组：
--     维修报修：水电 / 空调 / 设备 / 家具
--     被服管理：洗涤 / 更换 / 盘点
--     餐饮配送：患者餐 / 员工餐
--     保洁管理：区域划分 / 频次 / 检查
--   每单落库时由系统按类型自动分派到固定班组（handler_team），不存在「电话打过去
--   说不归我管」的推诿空间；location_x / location_y 为院内网格坐标，供
--   optimizeLogisticsRoute 做最近邻路线优化，保洁/送餐一次巡线跑完。
--
-- 与 M142 的关系：
--   clinical.logistics_request / clinical.logistics_task 仍是「报修工单 + 派工流水」；
--   本表 hospital_ops.logistics_task 是全场景后勤任务主表（维修/被服/餐饮/保洁），
--   两表口径互不覆盖，本脚本幂等执行不影响既有表。
--
-- 类别枚举（SQL 用英文 slug，注释对应 aggregator 的中文枚举）：
--   category:
--     maintenance_repair 维修报修        water_electric 水电 / hvac 空调 /
--                                       equipment 设备 / furniture 家具
--     linen              被服管理        washing 洗涤 / changing 更换 / stocktaking 盘点
--     catering           餐饮配送        patient_meal 患者餐 / staff_meal 员工餐
--     cleaning           保洁管理        zone_layout 区域划分 / frequency 频次 / inspection 检查
--   status:
--     assigned 已派单（系统自动派单完成，直达责任班组）
--     processing 处理中
--     done 已完成
--
-- 幂等：重复执行不会报错、不会清空已有数据。
-- 不触碰 WebSocket：本版仅做拉取式 REST，实时推送留待后续。
--
-- Copyright (c) 2026 杭州健澜科技有限公司
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS hospital_ops;

-- ----------------------------------------------------------------------------
-- 全场景后勤任务主表（logistics_task）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS hospital_ops.logistics_task (
  id                     uuid PRIMARY KEY,
  -- 任务大类：维修报修 / 被服管理 / 餐饮配送 / 保洁管理
  category               text NOT NULL
                         CHECK (category IN
                           ('maintenance_repair','linen','catering','cleaning')),
  -- 任务子类（12 种）：水电/空调/设备/家具/洗涤/更换/盘点/患者餐/员工餐/区域划分/频次/检查
  task_type              text NOT NULL
                         CHECK (task_type IN
                           ('water_electric','hvac','equipment','furniture',
                            'washing','changing','stocktaking',
                            'patient_meal','staff_meal',
                            'zone_layout','frequency','inspection')),
  -- 任务地点，如 住院部 3 病区 / 急诊一楼大厅 / 营养食堂
  location               text NOT NULL,
  -- 院内网格坐标（0~100）：由 location 确定性散列得出，路线优化的距离矩阵输入
  location_x             numeric(5,1) NOT NULL DEFAULT 0,
  location_y             numeric(5,1) NOT NULL DEFAULT 0,
  description            text NOT NULL DEFAULT '',
  -- 系统自动派单落点班组：派单高效、不推诿，无需人工二次转手
  handler_team           text NOT NULL,
  -- 优先级：P1 紧急（水电/空调/设备/患者餐）/ P2 常规 / P3 可延后
  priority               text NOT NULL DEFAULT 'P2'
                         CHECK (priority IN ('P1','P2','P3')),
  status                 text NOT NULL DEFAULT 'assigned'
                         CHECK (status IN ('assigned','processing','done')),
  -- 该类任务标准响应时限（分钟）；完成时长未超 eta 即视为准时
  eta_minutes            integer NOT NULL DEFAULT 60
                         CHECK (eta_minutes > 0),
  estimated_duration_min integer NOT NULL DEFAULT 60
                         CHECK (estimated_duration_min > 0),
  -- 派单时间 = 创建时间（自动派单零等待，杜绝推诿）
  dispatched_at          timestamptz NOT NULL DEFAULT now(),
  completed_at           timestamptz NULL,
  actual_duration_min    integer NULL CHECK (actual_duration_min > 0),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE hospital_ops.logistics_task IS
  '医院全场景后勤任务（M162-D）：维修报修/被服/餐饮/保洁一键自动派单到责任班组，路线优化+效率分析，派单高效不推诿';
COMMENT ON COLUMN hospital_ops.logistics_task.handler_team IS
  '自动派单落点班组：按 task_type 路由表直派，不经过人工转手，杜绝「不归我管」';
COMMENT ON COLUMN hospital_ops.logistics_task.location_x IS
  '院内网格横坐标：路线优化（optimizeLogisticsRoute）的距离矩阵输入';
COMMENT ON COLUMN hospital_ops.logistics_task.eta_minutes IS
  '标准响应时限（分钟）：completed_at - dispatched_at 未超该值即判准时';

-- 主管看板：按状态过滤待办，未完成任务按优先级升序（P1 先跑）
CREATE INDEX IF NOT EXISTS idx_logistics_task_status_priority
  ON hospital_ops.logistics_task (status, priority)
  WHERE status <> 'done';

-- 按大类统计效率（getLogisticsEfficiency 的 byCategory 口径）
CREATE INDEX IF NOT EXISTS idx_logistics_task_category_created
  ON hospital_ops.logistics_task (category, created_at DESC);

-- 路线优化：保洁/送餐巡线按坐标拉取当日未完成任务
CREATE INDEX IF NOT EXISTS idx_logistics_task_coords
  ON hospital_ops.logistics_task (location_x, location_y)
  WHERE status <> 'done';
