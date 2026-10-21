/**
 * 健澜科技 jlmedaios - M526 新标准 P0：患者/就诊队列字典 + 评估量表选项字典 3 端点
 *
 * patient/queue 患者/就诊队列（前端 Select 远程搜索）；
 * dict/scales 评估量表元数据列表（10 个量表）；
 * dict/scale/:scaleKey 单个量表选项明细（非法 key 返回 404）。
 *
 * 字段铁律：枚举英文 key、number、boolean、ISO8601；字典选项内 label 中文用于 key↔label 映射（字典职责允许）。
 * 与 M525 /nursing-care/*、M524 /order/*、M522/M523 /dict/* 已有域区分（本批为 dict/scales、dict/scale/* 新路径）；不碰 /outpatient/*。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

// ============================== 1. 患者/就诊队列内存池（15 条） ==============================

type VisitType = 'outpatient' | 'inpatient' | 'emergency' | 'daySurgery';
type QueueStatus = 'waiting' | 'inTreatment' | 'finished';
type Gender = 'male' | 'female';

interface QueuePatient {
  id: string;
  patientId: string;
  visitId: string;
  visitNo: string;
  name: string;
  gender: Gender;
  age: number;
  bedNo: string | null;
  deptCode: string;
  deptName: string;
  diagnosis: string;
  icd10: string;
  visitType: VisitType;
  wardCode: string | null;
  status: QueueStatus;
}

const QUEUE_POOL: QueuePatient[] = [
  { id: 'Q-001', patientId: 'P10001', visitId: 'V2026102101', visitNo: 'ZY20261021001', name: '张建国', gender: 'male', age: 68, bedNo: '3床', deptCode: 'CARD', deptName: '心血管内科', diagnosis: '急性 ST 段抬高型心肌梗死', icd10: 'I21.0', visitType: 'inpatient', wardCode: 'CARD-W1', status: 'inTreatment' },
  { id: 'Q-002', patientId: 'P10002', visitId: 'V2026102102', visitNo: 'ZY20261021002', name: '李淑芬', gender: 'female', age: 62, bedNo: '12床', deptCode: 'SURG', deptName: '普外科', diagnosis: '急性阑尾炎', icd10: 'K35.9', visitType: 'inpatient', wardCode: 'SURG-W2', status: 'waiting' },
  { id: 'Q-003', patientId: 'P10003', visitId: 'V2026102103', visitNo: 'ZY20261021003', name: '王志强', gender: 'male', age: 85, bedNo: '8床', deptCode: 'ORTHO', deptName: '骨科', diagnosis: '股骨颈骨折', icd10: 'S72.001', visitType: 'inpatient', wardCode: 'ORTHO-W1', status: 'inTreatment' },
  { id: 'Q-004', patientId: 'P10004', visitId: 'V2026102104', visitNo: 'ZY20261021004', name: '赵桂兰', gender: 'female', age: 55, bedNo: '15床', deptCode: 'RESP', deptName: '呼吸内科', diagnosis: '社区获得性肺炎', icd10: 'J15.901', visitType: 'inpatient', wardCode: 'RESP-W1', status: 'finished' },
  { id: 'Q-005', patientId: 'P10005', visitId: 'V2026102105', visitNo: 'ZY20261021005', name: '陈小明', gender: 'male', age: 48, bedNo: '6床', deptCode: 'ENDO', deptName: '内分泌科', diagnosis: '2型糖尿病', icd10: 'E11.900', visitType: 'inpatient', wardCode: 'ENDO-W1', status: 'inTreatment' },
  { id: 'Q-006', patientId: 'P10006', visitId: 'V2026102106', visitNo: 'ZY20261021006', name: '刘玉兰', gender: 'female', age: 39, bedNo: '21床', deptCode: 'OBGYN', deptName: '妇产科', diagnosis: '孕38周待产', icd10: 'O80.900', visitType: 'inpatient', wardCode: 'OBGYN-W1', status: 'waiting' },
  { id: 'Q-007', patientId: 'P10007', visitId: 'V2026102107', visitNo: 'ZY20261021007', name: '孙立军', gender: 'male', age: 57, bedNo: '10床', deptCode: 'SURG', deptName: '普外科', diagnosis: '腹股沟疝', icd10: 'K40.900', visitType: 'inpatient', wardCode: 'SURG-W1', status: 'inTreatment' },
  { id: 'Q-008', patientId: 'P10008', visitId: 'V2026102108', visitNo: 'ZY20261021008', name: '周春梅', gender: 'female', age: 66, bedNo: '18床', deptCode: 'CARD', deptName: '心血管内科', diagnosis: '原发性高血压', icd10: 'I10.900', visitType: 'inpatient', wardCode: 'CARD-W2', status: 'finished' },
  { id: 'Q-009', patientId: 'P10009', visitId: 'V2026102109', visitNo: 'MZ20261021009', name: '张伟', gender: 'male', age: 45, bedNo: null, deptCode: 'CARD', deptName: '心血管内科', diagnosis: '胸痛待查', icd10: 'R07.400', visitType: 'outpatient', wardCode: null, status: 'waiting' },
  { id: 'Q-010', patientId: 'P10010', visitId: 'V2026102110', visitNo: 'MZ20261021110', name: '王芳', gender: 'female', age: 33, bedNo: null, deptCode: 'OBGYN', deptName: '妇产科', diagnosis: '孕前检查', icd10: 'Z32.200', visitType: 'outpatient', wardCode: null, status: 'waiting' },
  { id: 'Q-011', patientId: 'P10011', visitId: 'V2026102111', visitNo: 'MZ20261021011', name: '李强', gender: 'male', age: 2, bedNo: null, deptCode: 'PEDIA', deptName: '儿科', diagnosis: '急性上呼吸道感染', icd10: 'J06.900', visitType: 'outpatient', wardCode: null, status: 'inTreatment' },
  { id: 'Q-012', patientId: 'P10012', visitId: 'V2026102112', visitNo: 'MZ20261021012', name: '赵敏', gender: 'female', age: 50, bedNo: null, deptCode: 'RESP', deptName: '呼吸内科', diagnosis: '慢性咳嗽', icd10: 'R05.900', visitType: 'outpatient', wardCode: null, status: 'finished' },
  { id: 'Q-013', patientId: 'P10013', visitId: 'V2026102113', visitNo: 'JZ20261021013', name: '马海涛', gender: 'male', age: 63, bedNo: null, deptCode: 'EMERG', deptName: '急诊科', diagnosis: '急性胸痛', icd10: 'R07.400', visitType: 'emergency', wardCode: null, status: 'inTreatment' },
  { id: 'Q-014', patientId: 'P10014', visitId: 'V2026102114', visitNo: 'JZ20261021014', name: '钱大伟', gender: 'male', age: 35, bedNo: null, deptCode: 'EMERG', deptName: '急诊科', diagnosis: '腹部外伤', icd10: 'S39.900', visitType: 'emergency', wardCode: null, status: 'waiting' },
  { id: 'Q-015', patientId: 'P10015', visitId: 'V2026102115', visitNo: 'MR20261021015', name: '孙悦', gender: 'female', age: 28, bedNo: null, deptCode: 'SURG', deptName: '普外科', diagnosis: '脂肪瘤切除', icd10: 'D17.900', visitType: 'daySurgery', wardCode: null, status: 'waiting' },
];

/** GET /api/v1/patient/queue?keyword= 患者/就诊队列：keyword 非空按姓名/就诊号/患者号/就诊号模糊匹配，空返回前 5，最多 5 条 */
async function handlePatientQueue(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const keyword = (c.query.get('keyword') ?? '').trim().toLowerCase();
  const matched = keyword
    ? QUEUE_POOL.filter((p) =>
        [p.name, p.visitNo, p.patientId, p.visitId]
          .some((field) => field.toLowerCase().includes(keyword)),
      )
    : QUEUE_POOL;
  const items = matched.slice(0, 5);
  return json(ok({ items, totalCount: matched.length }));
}

// ============================== 2. 评估量表元数据（10 个） ==============================

interface ScaleLevel {
  levelCode: string;
  label: string;
  minScore: number;
  maxScore: number;
  color: 'green' | 'blue' | 'yellow' | 'orange' | 'red' | 'purple';
}

interface ScaleMeta {
  scaleKey: 'asa' | 'rass' | 'aldrete' | 'braden' | 'morse' | 'nrs' | 'nrs2002' | 'barthel' | 'erTriage' | 'ais';
  title: string;
  itemCount: number;
  minScore: number;
  maxScore: number;
  levels: ScaleLevel[];
}

const SCALES_META: ScaleMeta[] = [
  {
    scaleKey: 'asa',
    title: 'ASA 麻醉风险分级',
    itemCount: 6,
    minScore: 1,
    maxScore: 6,
    levels: [
      { levelCode: 'ASA1', label: 'Ⅰ级 正常健康', minScore: 1, maxScore: 1, color: 'green' },
      { levelCode: 'ASA2', label: 'Ⅱ级 轻度系统性疾病', minScore: 2, maxScore: 2, color: 'blue' },
      { levelCode: 'ASA3', label: 'Ⅲ级 重度系统性疾病', minScore: 3, maxScore: 3, color: 'yellow' },
      { levelCode: 'ASA4', label: 'Ⅳ级 危及生命', minScore: 4, maxScore: 4, color: 'orange' },
      { levelCode: 'ASA5', label: 'Ⅴ级 濒死状态', minScore: 5, maxScore: 5, color: 'red' },
      { levelCode: 'ASA6', label: 'Ⅵ级 脑死亡器官捐献', minScore: 6, maxScore: 6, color: 'purple' },
    ],
  },
  {
    scaleKey: 'rass',
    title: 'RASS 镇静躁动评分',
    itemCount: 10,
    minScore: -5,
    maxScore: 4,
    levels: [
      { levelCode: 'deepSedation', label: '深度镇静', minScore: -5, maxScore: -3, color: 'purple' },
      { levelCode: 'lightSedation', label: '轻度镇静/嗜睡', minScore: -2, maxScore: -1, color: 'blue' },
      { levelCode: 'calm', label: '平静合作', minScore: 0, maxScore: 0, color: 'green' },
      { levelCode: 'restless', label: '不安', minScore: 1, maxScore: 1, color: 'yellow' },
      { levelCode: 'agitated', label: '躁动', minScore: 2, maxScore: 2, color: 'orange' },
      { levelCode: 'combative', label: '非常躁动/攻击性', minScore: 3, maxScore: 4, color: 'red' },
    ],
  },
  {
    scaleKey: 'aldrete',
    title: 'Aldrete 离室评分',
    itemCount: 5,
    minScore: 0,
    maxScore: 10,
    levels: [
      { levelCode: 'ready', label: '≥9 可离室', minScore: 9, maxScore: 10, color: 'green' },
      { levelCode: 'observe', label: '7-8 留观观察', minScore: 7, maxScore: 8, color: 'orange' },
      { levelCode: 'monitor', label: '<7 继续监护', minScore: 0, maxScore: 6, color: 'red' },
    ],
  },
  {
    scaleKey: 'braden',
    title: 'Braden 压疮风险评分',
    itemCount: 6,
    minScore: 6,
    maxScore: 23,
    levels: [
      { levelCode: 'noRisk', label: '15-23 无风险', minScore: 15, maxScore: 23, color: 'green' },
      { levelCode: 'mild', label: '13-14 轻度风险', minScore: 13, maxScore: 14, color: 'yellow' },
      { levelCode: 'moderate', label: '10-12 中度风险', minScore: 10, maxScore: 12, color: 'orange' },
      { levelCode: 'high', label: '≤9 高危', minScore: 6, maxScore: 9, color: 'red' },
    ],
  },
  {
    scaleKey: 'morse',
    title: 'Morse 跌倒风险评分',
    itemCount: 6,
    minScore: 0,
    maxScore: 125,
    levels: [
      { levelCode: 'low', label: '0-24 低危', minScore: 0, maxScore: 24, color: 'green' },
      { levelCode: 'moderate', label: '25-44 中危', minScore: 25, maxScore: 44, color: 'orange' },
      { levelCode: 'high', label: '≥45 高危', minScore: 45, maxScore: 125, color: 'red' },
    ],
  },
  {
    scaleKey: 'nrs',
    title: 'NRS 数字疼痛评分',
    itemCount: 11,
    minScore: 0,
    maxScore: 10,
    levels: [
      { levelCode: 'none', label: '0 无痛', minScore: 0, maxScore: 0, color: 'green' },
      { levelCode: 'mild', label: '1-3 轻度疼痛', minScore: 1, maxScore: 3, color: 'yellow' },
      { levelCode: 'moderate', label: '4-6 中度疼痛', minScore: 4, maxScore: 6, color: 'orange' },
      { levelCode: 'severe', label: '7-10 重度疼痛', minScore: 7, maxScore: 10, color: 'red' },
    ],
  },
  {
    scaleKey: 'nrs2002',
    title: 'NRS2002 营养风险筛查',
    itemCount: 3,
    minScore: 0,
    maxScore: 7,
    levels: [
      { levelCode: 'noRisk', label: '<3 无营养风险', minScore: 0, maxScore: 2, color: 'green' },
      { levelCode: 'positive', label: '≥3 营养风险阳性', minScore: 3, maxScore: 7, color: 'red' },
    ],
  },
  {
    scaleKey: 'barthel',
    title: 'Barthel 日常生活能力指数',
    itemCount: 10,
    minScore: 0,
    maxScore: 100,
    levels: [
      { levelCode: 'independent', label: '61-100 生活自理', minScore: 61, maxScore: 100, color: 'green' },
      { levelCode: 'mild', label: '41-60 轻度依赖', minScore: 41, maxScore: 60, color: 'yellow' },
      { levelCode: 'moderate', label: '21-40 中度依赖', minScore: 21, maxScore: 40, color: 'orange' },
      { levelCode: 'severe', label: '0-20 重度依赖', minScore: 0, maxScore: 20, color: 'red' },
    ],
  },
  {
    scaleKey: 'erTriage',
    title: '急诊预检分诊分级',
    itemCount: 5,
    minScore: 1,
    maxScore: 5,
    levels: [
      { levelCode: 'level1', label: 'Ⅰ级 濒危', minScore: 1, maxScore: 1, color: 'red' },
      { levelCode: 'level2', label: 'Ⅱ级 危重', minScore: 2, maxScore: 2, color: 'orange' },
      { levelCode: 'level3', label: 'Ⅲ级 急症', minScore: 3, maxScore: 3, color: 'yellow' },
      { levelCode: 'level4', label: 'Ⅳ级 亚急症', minScore: 4, maxScore: 4, color: 'green' },
      { levelCode: 'level5', label: 'Ⅴ级 非急症', minScore: 5, maxScore: 5, color: 'blue' },
    ],
  },
  {
    scaleKey: 'ais',
    title: 'AIS 简明损伤定级',
    itemCount: 6,
    minScore: 1,
    maxScore: 6,
    levels: [
      { levelCode: 'level1', label: '1 轻伤', minScore: 1, maxScore: 1, color: 'green' },
      { levelCode: 'level2', label: '2 轻度重伤', minScore: 2, maxScore: 2, color: 'green' },
      { levelCode: 'level3', label: '3 中度重伤', minScore: 3, maxScore: 3, color: 'yellow' },
      { levelCode: 'level4', label: '4 重度重伤', minScore: 4, maxScore: 4, color: 'orange' },
      { levelCode: 'level5', label: '5 危重重伤', minScore: 5, maxScore: 5, color: 'red' },
      { levelCode: 'level6', label: '6 致命伤', minScore: 6, maxScore: 6, color: 'purple' },
    ],
  },
];

/** GET /api/v1/dict/scales 评估量表元数据列表 */
async function handleDictScales(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({ items: SCALES_META, totalCount: SCALES_META.length }));
}

// ============================== 3. 单量表选项明细 ==============================

interface ScaleOption {
  key: string;
  label: string;
  score: number;
  description: string;
}

interface ScaleDetail {
  scaleKey: string;
  title: string;
  items: ScaleOption[];
  scoreRules: { minScore: number; maxScore: number; levels: ScaleLevel[] };
  bodyParts?: { key: string; label: string }[];
}

const SCALE_DETAILS: Record<string, ScaleDetail> = {
  asa: {
    scaleKey: 'asa',
    title: 'ASA 麻醉风险分级',
    items: [
      { key: 'asa1', label: 'Ⅰ级 正常健康', score: 1, description: '体格健康，发育营养良好，各器官功能正常' },
      { key: 'asa2', label: 'Ⅱ级 轻度系统性疾病', score: 2, description: '除外科疾病外，有轻度并存疾病，功能代偿健全' },
      { key: 'asa3', label: 'Ⅲ级 重度系统性疾病', score: 3, description: '并存病情严重，体力活动受限，但尚能应付日常活动' },
      { key: 'asa4', label: 'Ⅳ级 危及生命', score: 4, description: '并存病严重，丧失日常活动能力，经常面临生命威胁' },
      { key: 'asa5', label: 'Ⅴ级 濒死状态', score: 5, description: '无论手术与否，难以存活 24 小时以内的濒死患者' },
      { key: 'asa6', label: 'Ⅵ级 脑死亡器官捐献', score: 6, description: '已宣告脑死亡，拟行器官捐献手术' },
    ],
    scoreRules: { minScore: 1, maxScore: 6, levels: SCALES_META[0].levels },
  },
  rass: {
    scaleKey: 'rass',
    title: 'RASS 镇静躁动评分',
    items: [
      { key: 'rass-5', label: '-5 不能唤醒', score: -5, description: '对刺激无反应，深镇静状态' },
      { key: 'rass-4', label: '-4 对刺激有反应', score: -4, description: '对躯体刺激有微弱反应，不能交流' },
      { key: 'rass-3', label: '-3 仅对刺激有反应', score: -3, description: '仅对强烈刺激有反应，刺激停止后即入睡' },
      { key: 'rass-2', label: '-2 轻度镇静', score: -2, description: '对轻叩呼名有反应，可短暂注视' },
      { key: 'rass-1', label: '-1 嗜睡', score: -1, description: '唤之能睁眼注视，反应稍迟钝' },
      { key: 'rass0', label: '0 平静合作', score: 0, description: '清醒自然，安静配合' },
      { key: 'rass1', label: '+1 不安', score: 1, description: '焦虑但动作无攻击性' },
      { key: 'rass2', label: '+2 躁动', score: 2, description: '频繁躁动，需约束' },
      { key: 'rass3', label: '+3 非常躁动', score: 3, description: '试图拔管，需保护性约束' },
      { key: 'rass4', label: '+4 有攻击性', score: 4, description: '明显攻击性，对抗医护人员' },
    ],
    scoreRules: { minScore: -5, maxScore: 4, levels: SCALES_META[1].levels },
  },
  aldrete: {
    scaleKey: 'aldrete',
    title: 'Aldrete 离室评分',
    items: [
      { key: 'activity2', label: '活动能力 2 分', score: 2, description: '能按指令活动四肢，自主活动不受限' },
      { key: 'activity1', label: '活动能力 1 分', score: 1, description: '能活动 2 个肢体' },
      { key: 'activity0', label: '活动能力 0 分', score: 0, description: '不能活动肢体' },
      { key: 'breath2', label: '呼吸 2 分', score: 2, description: '能深呼吸并咳嗽' },
      { key: 'breath1', label: '呼吸 1 分', score: 1, description: '呼吸受限或浅呼吸' },
      { key: 'breath0', label: '呼吸 0 分', score: 0, description: '无自主呼吸' },
      { key: 'circulation2', label: '循环 2 分', score: 2, description: '血压/心率较基础值波动 <20%' },
      { key: 'circulation1', label: '循环 1 分', score: 1, description: '波动 20%-49%' },
      { key: 'circulation0', label: '循环 0 分', score: 0, description: '波动 ≥50%' },
      { key: 'conscious2', label: '意识 2 分', score: 2, description: '完全清醒，呼之即应' },
      { key: 'conscious1', label: '意识 1 分', score: 1, description: '呼名能反应' },
      { key: 'conscious0', label: '意识 0 分', score: 0, description: '无意识' },
      { key: 'spo2_2', label: 'SpO₂ 2 分', score: 2, description: '呼吸室内空气 SpO₂ ≥92%' },
      { key: 'spo2_1', label: 'SpO₂ 1 分', score: 1, description: '需鼻导管吸氧 SpO₂ ≥92%' },
      { key: 'spo2_0', label: 'SpO₂ 0 分', score: 0, description: '吸氧下 SpO₂ <90%' },
    ],
    scoreRules: { minScore: 0, maxScore: 10, levels: SCALES_META[2].levels },
  },
  braden: {
    scaleKey: 'braden',
    title: 'Braden 压疮风险评分',
    items: [
      { key: 'sensation4', label: '感觉 4 分 完全正常', score: 4, description: '对指令能正常响应，感觉无障碍' },
      { key: 'sensation3', label: '感觉 3 分 轻度受限', score: 3, description: '对疼痛刺激有反应但表达受限' },
      { key: 'sensation2', label: '感觉 2 分 重度受限', score: 2, description: '仅对疼痛刺激有反应' },
      { key: 'sensation1', label: '感觉 1 分 丧失', score: 1, description: '对疼痛刺激无反应' },
      { key: 'moisture4', label: '潮湿 4 分 很少潮湿', score: 4, description: '皮肤每周潮湿 1-2 次' },
      { key: 'moisture3', label: '潮湿 3 分 偶尔潮湿', score: 3, description: '皮肤每日潮湿一次' },
      { key: 'moisture2', label: '潮湿 2 分 经常潮湿', score: 2, description: '皮肤每班潮湿一次' },
      { key: 'moisture1', label: '潮湿 1 分 持续潮湿', score: 1, description: '皮肤持续处于潮湿状态' },
      { key: 'activity4', label: '活动力 4 分 经常行走', score: 4, description: '每天室外行走至少两次' },
      { key: 'activity3', label: '活动力 3 分 偶尔行走', score: 3, description: '偶尔短距离行走' },
      { key: 'activity2', label: '活动力 2 分 卧床', score: 2, description: '不能离床活动' },
      { key: 'activity1', label: '活动力 1 分 坐位', score: 1, description: '不能站立或行走' },
      { key: 'mobility4', label: '活动能力 4 分 不受限', score: 4, description: '能独立改变身体位置' },
      { key: 'mobility3', label: '活动能力 3 分 轻度受限', score: 3, description: '能轻微自主改变体位' },
      { key: 'mobility2', label: '活动能力 2 分 重度受限', score: 2, description: '每次需他人协助才能翻身' },
      { key: 'mobility1', label: '活动能力 1 分 不能移动', score: 1, description: '完全不能改变体位' },
      { key: 'nutrition4', label: '营养 4 分 良好', score: 4, description: '每餐进食足量食物' },
      { key: 'nutrition3', label: '营养 3 分 可能不足', score: 3, description: '进食量略低于推荐量' },
      { key: 'nutrition2', label: '营养 2 分 不足', score: 2, description: '进食一半以下或流质为主' },
      { key: 'nutrition1', label: '营养 1 分 极差', score: 1, description: '不能进食，存在恶病质' },
      { key: 'friction4', label: '摩擦与剪切力 4 分 无危险', score: 4, description: '移动时皮肤不滑动，有足够支撑' },
      { key: 'friction3', label: '摩擦与剪切力 3 分 有潜在危险', score: 3, description: '移动时皮肤轻度滑动' },
      { key: 'friction1', label: '摩擦与剪切力 1 分 有危险', score: 1, description: '身体在床上滑动，需多次协助' },
    ],
    scoreRules: { minScore: 6, maxScore: 23, levels: SCALES_META[3].levels },
  },
  morse: {
    scaleKey: 'morse',
    title: 'Morse 跌倒风险评分',
    items: [
      { key: 'fall_history0', label: '跌倒史 0 分 无', score: 0, description: '近 3 个月无跌倒史' },
      { key: 'fall_history25', label: '跌倒史 25 分 有', score: 25, description: '近 3 个月有跌倒史' },
      { key: 'secondary_diag0', label: '次要诊断 0 分 无', score: 0, description: '无次要诊断' },
      { key: 'secondary_diag15', label: '次要诊断 15 分 有', score: 15, description: '病历记录 ≥2 个次要诊断' },
      { key: 'ambulance0', label: '助行工具 0 分 无/卧床/轮椅', score: 0, description: '卧床、轮椅或由他人支撑' },
      { key: 'ambulance15', label: '助行工具 15 分 家具支撑', score: 15, description: '扶床栏、桌椅等行走' },
      { key: 'ambulance30', label: '助行工具 30 分 拐杖/助行器', score: 30, description: '使用拐杖、手杖或助行器' },
      { key: 'iv_0', label: '静脉输液 0 分 无', score: 0, description: '无静脉内置管路' },
      { key: 'iv_20', label: '静脉输液 20 分 有', score: 20, description: '留置静脉输液/管路' },
      { key: 'gait10', label: '步态 10 分 虚弱', score: 10, description: '行走时步履蹒跚、扶物' },
      { key: 'gait20', label: '步态 20 分 障碍', score: 20, description: '步态严重异常或不能行走' },
      { key: 'gait0', label: '步态 0 分 正常/卧床/轮椅', score: 0, description: '步态正常或卧床轮椅' },
      { key: 'cognition15', label: '认知状态 15 分 高估能力', score: 15, description: '自负行动能力，忘记自身受限' },
      { key: 'cognition0', label: '认知状态 0 分 正常', score: 0, description: '了解自身活动受限程度' },
    ],
    scoreRules: { minScore: 0, maxScore: 125, levels: SCALES_META[4].levels },
  },
  nrs: {
    scaleKey: 'nrs',
    title: 'NRS 数字疼痛评分',
    items: [
      { key: 'nrs0', label: '0 无痛', score: 0, description: '面部表情放松，无疼痛' },
      { key: 'nrs1', label: '1 轻度疼痛', score: 1, description: '表情略紧张，轻微不适' },
      { key: 'nrs2', label: '2 轻度疼痛', score: 2, description: '表情紧张，可忍受' },
      { key: 'nrs3', label: '3 轻度疼痛', score: 3, description: '皱眉，不适明显' },
      { key: 'nrs4', label: '4 中度疼痛', score: 4, description: '咬牙，需安静休息' },
      { key: 'nrs5', label: '5 中度疼痛', score: 5, description: '皱眉咬牙，辗转不安' },
      { key: 'nrs6', label: '6 中度疼痛', score: 6, description: '面部痛苦，出汗' },
      { key: 'nrs7', label: '7 重度疼痛', score: 7, description: '呻吟，难以忍受' },
      { key: 'nrs8', label: '8 重度疼痛', score: 8, description: '哭泣，需镇痛处理' },
      { key: 'nrs9', label: '9 重度疼痛', score: 9, description: '大哭，躁动不安' },
      { key: 'nrs10', label: '10 最痛', score: 10, description: '无法忍受的剧痛' },
    ],
    scoreRules: { minScore: 0, maxScore: 10, levels: SCALES_META[5].levels },
  },
  nrs2002: {
    scaleKey: 'nrs2002',
    title: 'NRS2002 营养风险筛查',
    items: [
      { key: 'nutrition3', label: '营养状态 3 分 营养良好', score: 3, description: '近 3 个月进食无减少' },
      { key: 'nutrition2', label: '营养状态 2 分 轻度受损', score: 2, description: '进食量减少 25%-50%' },
      { key: 'nutrition1', label: '营养状态 1 分 中度受损', score: 1, description: '进食量减少 50%-75%' },
      { key: 'nutrition0', label: '营养状态 0 分 重度受损', score: 0, description: '进食量减少 >75% 或流质/禁食' },
      { key: 'severity3', label: '疾病严重度 3 分 重症', score: 3, description: 'ICU、大手术后、严重感染等高分解代谢' },
      { key: 'severity2', label: '疾病严重度 2 分 中度', score: 2, description: '大手术、慢性疾病急性发作等' },
      { key: 'severity1', label: '疾病严重度 1 分 轻度', score: 1, description: '慢性疾病合并并发症' },
      { key: 'severity0', label: '疾病严重度 0 分 正常', score: 0, description: '营养需要量同正常人' },
      { key: 'age1', label: '年龄 1 分 ≥70 岁', score: 1, description: '年龄 ≥70 岁加 1 分' },
      { key: 'age0', label: '年龄 0 分 <70 岁', score: 0, description: '年龄 <70 岁不加分' },
    ],
    scoreRules: { minScore: 0, maxScore: 7, levels: SCALES_META[6].levels },
  },
  barthel: {
    scaleKey: 'barthel',
    title: 'Barthel 日常生活能力指数',
    items: [
      { key: 'eat10', label: '进食 10 分 独立', score: 10, description: '能独立进食，无需协助' },
      { key: 'eat5', label: '进食 5 分 需协助', score: 5, description: '需他人协助取食或切割' },
      { key: 'eat0', label: '进食 0 分 依赖', score: 0, description: '完全依赖喂食' },
      { key: 'bath5', label: '洗澡 5 分 独立', score: 5, description: '能独立完成洗澡' },
      { key: 'bath0', label: '洗澡 0 分 依赖', score: 0, description: '需他人协助洗澡' },
      { key: 'grooming5', label: '修饰 5 分 独立', score: 5, description: '洗脸、刷牙、梳头、剃须独立完成' },
      { key: 'grooming0', label: '修饰 0 分 依赖', score: 0, description: '需他人协助' },
      { key: 'dressing10', label: '穿衣 10 分 独立', score: 10, description: '能独立穿衣脱衣系扣' },
      { key: 'dressing5', label: '穿衣 5 分 需协助', score: 5, description: '穿脱衣需一半协助' },
      { key: 'dressing0', label: '穿衣 0 分 依赖', score: 0, description: '完全依赖他人穿衣' },
      { key: 'bowel10', label: '大便控制 10 分 自理', score: 10, description: '能完全控制大便' },
      { key: 'bowel5', label: '大便控制 5 分 偶尔失禁', score: 5, description: '每周偶尔失禁 1 次' },
      { key: 'bowel0', label: '大便控制 0 分 失禁', score: 0, description: '失禁或需灌肠' },
      { key: 'bladder10', label: '小便控制 10 分 自理', score: 10, description: '能完全控制小便' },
      { key: 'bladder5', label: '小便控制 5 分 偶尔失禁', score: 5, description: '每日偶尔失禁 <1 次' },
      { key: 'bladder0', label: '小便控制 0 分 失禁/导尿', score: 0, description: '失禁或留置导尿' },
      { key: 'toilet10', label: '如厕 10 分 独立', score: 10, description: '独立完成如厕、穿脱衣物、清洁' },
      { key: 'toilet5', label: '如厕 5 分 需协助', score: 5, description: '需他人部分协助' },
      { key: 'toilet0', label: '如厕 0 分 依赖', score: 0, description: '完全依赖他人' },
      { key: 'transfer15', label: '床椅转移 15 分 独立', score: 15, description: '独立完成床椅转移' },
      { key: 'transfer10', label: '床椅转移 10 分 少量协助', score: 10, description: '需一人少量协助' },
      { key: 'transfer5', label: '床椅转移 5 分 大量协助', score: 5, description: '需一人大量协助或二人协助' },
      { key: 'transfer0', label: '床椅转移 0 分 依赖', score: 0, description: '不能坐起，完全依赖搬运' },
      { key: 'walk15', label: '平地行走 15 分 独立', score: 15, description: '平地行走 45m 独立' },
      { key: 'walk10', label: '平地行走 10 分 辅助器具', score: 10, description: '借助助行器等行走 45m' },
      { key: 'walk0', label: '平地行走 0 分 轮椅/不能', score: 0, description: '不能行走或仅靠轮椅' },
      { key: 'stairs10', label: '上下楼梯 10 分 独立', score: 10, description: '独立上下一层楼梯' },
      { key: 'stairs5', label: '上下楼梯 5 分 需协助', score: 5, description: '需他人协助或携带扶手' },
      { key: 'stairs0', label: '上下楼梯 0 分 不能', score: 0, description: '不能上下楼梯' },
    ],
    scoreRules: { minScore: 0, maxScore: 100, levels: SCALES_META[7].levels },
  },
  erTriage: {
    scaleKey: 'erTriage',
    title: '急诊预检分诊分级',
    items: [
      { key: 'level1', label: 'Ⅰ级 濒危', score: 1, description: '立即抢救，生命体征不稳定，如心跳骤停、严重创伤大出血' },
      { key: 'level2', label: 'Ⅱ级 危重', score: 2, description: '10 分钟内就诊，生命体征有风险，如急性胸痛、意识障碍' },
      { key: 'level3', label: 'Ⅲ级 急症', score: 3, description: '30 分钟内就诊，生命体征尚稳定但急性症状，如高热、腹痛' },
      { key: 'level4', label: 'Ⅳ级 亚急症', score: 4, description: '60 分钟内就诊，一般急性不适，如轻度外伤、皮疹' },
      { key: 'level5', label: 'Ⅴ级 非急症', score: 5, description: '按序候诊，慢性问题或健康咨询' },
    ],
    scoreRules: { minScore: 1, maxScore: 5, levels: SCALES_META[8].levels },
  },
  ais: {
    scaleKey: 'ais',
    title: 'AIS 简明损伤定级',
    items: [
      { key: 'ais1', label: '1 轻伤', score: 1, description: '轻微损伤，不需要治疗或仅需简单处理' },
      { key: 'ais2', label: '2 轻度重伤', score: 2, description: '轻度重伤，需门诊处理，短期可恢复' },
      { key: 'ais3', label: '3 中度重伤', score: 3, description: '中度重伤，需住院治疗，不危及生命' },
      { key: 'ais4', label: '4 重度重伤', score: 4, description: '重度重伤，有生命危险，可能存活' },
      { key: 'ais5', label: '5 危重重伤', score: 5, description: '危重重伤，存活概率较低' },
      { key: 'ais6', label: '6 致命伤', score: 6, description: '致命伤，目前医疗条件下无法救治' },
    ],
    scoreRules: { minScore: 1, maxScore: 6, levels: SCALES_META[9].levels },
    bodyParts: [
      { key: 'head', label: '头颈部（颅脑/颈椎/面颌）' },
      { key: 'neck', label: '颈部（颈椎/软组织）' },
      { key: 'chest', label: '胸部（胸廓/心肺/大血管）' },
      { key: 'abdomen', label: '腹部（腹腔脏器/腹膜后）' },
      { key: 'extremity', label: '四肢/骨盆（骨骼/关节/血管神经）' },
      { key: 'external', label: '体表（皮肤/软组织/烧伤）' },
    ],
  },
};

/** GET /api/v1/dict/scale/:scaleKey 单个量表选项明细；非法 key 返回 404 */
async function handleDictScaleDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const scaleKey = (c.params.scaleKey ?? '').trim();
  const detail = SCALE_DETAILS[scaleKey];
  if (!detail) {
    return json({ code: 404, message: 'scale not found' }, 404);
  }
  return json(ok(detail));
}

export const m526Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/queue', handle: handlePatientQueue, auth: true },
  { method: 'GET', path: '/api/v1/dict/scales', handle: handleDictScales, auth: true },
  { method: 'GET', path: '/api/v1/dict/scale/:scaleKey', handle: handleDictScaleDetail, auth: true },
];
