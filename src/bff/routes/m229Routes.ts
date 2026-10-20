/**
 * 健澜科技 jlmedaios - M229 中医口腔眼科皮肤 + 精神卫生深度
 *
 * 中药处方/针灸/体质辨识 + 口腔就诊/影像 + 眼科检查/手术 + 皮肤科病例 + 精神科就诊/用药
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、中医管理 ==================== */

/** GET /api/v1/tcm/recipes - 中药处方 */
async function handleTcmRecipes(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const recipes = [
    { id: 'TCM-001', patient: '张演示', formula: '六味地黄丸', ingredients: '熟地黄 24g，山茱萸 12g，山药 12g，泽泻 9g，茯苓 9g，牡丹皮 9g', dosage: '每日一剂', decoction: '水煎服，日一剂，分两次温服', doctor: '中医科-陈主任' },
    { id: 'TCM-002', patient: '李患者', formula: '逍遥散', ingredients: '柴胡 9g，当归 9g，白芍 9g，白术 9g，茯苓 9g，炙甘草 6g，薄荷 3g，生姜 3 片', dosage: '每日一剂', decoction: '水煎服，日一剂，分两次温服', doctor: '中医科-王主任' },
    { id: 'TCM-003', patient: '王先生', formula: '四物汤', ingredients: '当归 10g，川芎 6g，白芍 12g，熟地黄 12g', dosage: '每日一剂', decoction: '水煎服，日一剂，分两次温服', doctor: '中医科-刘主任' },
    { id: 'TCM-004', patient: '赵女士', formula: '桂枝汤', ingredients: '桂枝 9g，白芍 9g，生姜 9g，大枣 12 枚，炙甘草 6g', dosage: '每日一剂', decoction: '水煎服，日一剂，分两次温服', doctor: '中医科-陈主任' },
    { id: 'TCM-005', patient: '刘大爷', formula: '归脾汤', ingredients: '白术 9g，茯神 9g，黄芪 12g，龙眼肉 9g，酸枣仁 9g，人参 6g，木香 6g，炙甘草 3g，当归 9g，远志 6g', dosage: '每日一剂', decoction: '水煎服，日一剂，分两次温服', doctor: '中医科-王主任' },
  ];

  return json(ok({ recipes, totalCount: recipes.length }));
}

/** GET /api/v1/tcm/acupuncture - 针灸记录 */
async function handleTcmAcupuncture(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const acupuncture = [
    { id: 'ACU-001', patient: '张演示', acupoints: '足三里、合谷、内关', technique: '平补平泻', retention: 20, efficacy: '好转', doctor: '针灸科-李医生' },
    { id: 'ACU-002', patient: '李患者', acupoints: '百会、风池、太阳', technique: '泻法', retention: 25, efficacy: '好转', doctor: '针灸科-王医生' },
    { id: 'ACU-003', patient: '王先生', acupoints: '足三里、三阴交、关元', technique: '补法', retention: 30, efficacy: '痊愈', doctor: '针灸科-张医生' },
  ];

  return json(ok({ acupuncture, totalCount: acupuncture.length }));
}

/** GET /api/v1/tcm/constitution - 体质辨识 */
async function handleTcmConstitution(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const constitution = [
    { id: 'CON-001', patient: '张演示', type: '气虚质', biasedItems: '易疲乏、气短、自汗', suggestions: '饮食：多食黄芪、大枣；起居：避免过劳；运动：太极拳；情志：保持平和', followUp: '2026-10-15' },
    { id: 'CON-002', patient: '李患者', type: '阳虚质', biasedItems: '怕冷、手足不温、喜热饮食', suggestions: '饮食：多食羊肉、生姜；起居：注意保暖；运动：慢跑；情志：保持积极', followUp: '2026-10-10' },
    { id: 'CON-003', patient: '王先生', type: '阴虚质', biasedItems: '口干咽燥、手足心热、喜冷饮', suggestions: '饮食：多食梨、百合；起居：避免熬夜；运动：太极拳；情志：保持宁静', followUp: '2026-10-18' },
    { id: 'CON-004', patient: '赵女士', type: '痰湿质', biasedItems: '体形肥胖、腹部松软、多汗且黏', suggestions: '饮食：少食肥甘厚味；起居：保持干燥；运动：快走；情志：保持开朗', followUp: '2026-10-05' },
    { id: 'CON-005', patient: '刘大爷', type: '血瘀质', biasedItems: '面色晦暗、易有瘀斑、口唇暗淡', suggestions: '饮食：多食山楂、玫瑰花；起居：避免久坐；运动：舞蹈；情志：保持舒畅', followUp: '2026-10-12' },
  ];

  return json(ok({ constitution, totalCount: constitution.length }));
}

/* ==================== 二、口腔管理 ==================== */

/** GET /api/v1/dental/visits - 口腔就诊 */
async function handleDentalVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'DEN-001', patient: '张演示', complaint: '牙痛', diagnosis: '急性牙髓炎（右下第一磨牙）', treatment: '根管治疗+桩核冠修复', tooth: '46', cost: 1500.00 },
    { id: 'DEN-002', patient: '李患者', complaint: '补牙', diagnosis: '龋齿（左下第二磨牙）', treatment: '树脂充填', tooth: '37', cost: 300.00 },
    { id: 'DEN-003', patient: '王先生', complaint: '拔牙', diagnosis: '智齿阻生（左下第三磨牙）', treatment: '微创拔除', tooth: '38', cost: 500.00 },
    { id: 'DEN-004', patient: '赵女士', complaint: '洗牙', diagnosis: '牙龈炎', treatment: '超声波洁治+抛光', tooth: '全口', cost: 200.00 },
    { id: 'DEN-005', patient: '刘大爷', complaint: '正畸', diagnosis: '牙列不齐（安氏 II 类）', treatment: '固定矫治（金属托槽）', tooth: '全口', cost: 15000.00 },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/** GET /api/v1/dental/xray - 口腔影像 */
async function handleDentalXray(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const xray = [
    { id: 'XRY-001', patient: '张演示', type: '根尖片', time: '2026-10-15', opinion: '右下第一磨牙根尖低密度影，符合急性牙髓炎表现', doctor: '放射科-赵医生' },
    { id: 'XRY-002', patient: '王先生', type: '全景片', time: '2026-10-10', opinion: '左下第三磨牙近中阻生，牙根接近下牙槽神经管', doctor: '放射科-钱医生' },
    { id: 'XRY-003', patient: '刘大爷', type: 'CBCT', time: '2026-10-05', opinion: '上颌前牙区牙槽骨宽度不足，需植骨后种植', doctor: '放射科-孙医生' },
  ];

  return json(ok({ xray, totalCount: xray.length }));
}

/* ==================== 三、眼科管理 ==================== */

/** GET /api/v1/ophthalmology/exams - 眼科检查 */
async function handleOphthalmologyExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const exams = [
    { id: 'OPH-001', patient: '张演示', uncorrectedVA: { left: '0.6', right: '0.5' }, correctedVA: { left: '1.0', right: '1.0' }, intraocularPressure: { left: 15.5, right: 16.0 }, slitLamp: '双眼结膜轻度充血，角膜透明', fundus: '双眼视盘边界清，黄斑中心凹反光存在', diagnosis: '双眼屈光不正（近视）' },
    { id: 'OPH-002', patient: '李患者', uncorrectedVA: { left: '0.3', right: '0.4' }, correctedVA: { left: '0.8', right: '0.8' }, intraocularPressure: { left: 18.5, right: 19.0 }, slitLamp: '双眼晶状体轻度混浊', fundus: '双眼视盘边界清，视网膜平伏', diagnosis: '双眼老年性白内障（初发期）' },
    { id: 'OPH-003', patient: '王先生', uncorrectedVA: { left: '0.8', right: '0.6' }, correctedVA: { left: '1.0', right: '1.0' }, intraocularPressure: { left: 22.5, right: 23.0 }, slitLamp: '前房浅，房角窄', fundus: '双眼视盘 C/D=0.6', diagnosis: '双眼原发性闭角型青光眼（可疑）' },
    { id: 'OPH-004', patient: '赵女士', uncorrectedVA: { left: '1.0', right: '1.0' }, correctedVA: { left: '1.0', right: '1.0' }, intraocularPressure: { left: 15.0, right: 15.5 }, slitLamp: '双眼结膜充血，角膜上皮点状缺损', fundus: '双眼眼底正常', diagnosis: '双眼干眼症' },
    { id: 'OPH-005', patient: '刘大爷', uncorrectedVA: { left: '手动', right: '0.1' }, correctedVA: { left: '手动', right: '0.3' }, intraocularPressure: { left: 14.5, right: 15.0 }, slitLamp: '右眼晶状体混浊（皮质性）', fundus: '右眼黄斑区色素紊乱', diagnosis: '右眼老年性白内障（成熟期）+ 左眼黄斑变性' },
  ];

  return json(ok({ exams, totalCount: exams.length }));
}

/** GET /api/v1/ophthalmology/surgery - 眼科手术 */
async function handleOphthalmologySurgery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const surgery = [
    { id: 'OPS-001', patient: '刘大爷', name: '白内障超声乳化吸除+人工晶体植入', eye: '右眼', iolModel: 'SN60AT（AcrySof）', postopVA: '0.6' },
    { id: 'OPS-002', patient: '王先生', name: '青光眼小梁切除术', eye: '双眼', iolModel: '无', postopVA: { left: '0.8', right: '0.8' } },
    { id: 'OPS-003', patient: '陈患者', name: '玻璃体切割术', eye: '左眼', iolModel: '无', postopVA: '0.3' },
  ];

  return json(ok({ surgery, totalCount: surgery.length }));
}

/* ==================== 四、皮肤管理 ==================== */

/** GET /api/v1/dermatology/cases - 皮肤科病例 */
async function handleDermatologyCases(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const cases = [
    { id: 'DER-001', patient: '张演示', location: '双前臂', morphology: '红斑、丘疹', diagnosis: '湿疹（急性期）', fungalTest: '阴性', treatment: '外用糠酸莫米松乳膏+口服氯雷他定' },
    { id: 'DER-002', patient: '李患者', location: '头皮、四肢伸侧', morphology: '红斑、鳞屑', diagnosis: '寻常型银屑病', fungalTest: '阴性', treatment: '外用卡泊三醇软膏+口服阿维A胶囊' },
    { id: 'DER-003', patient: '王先生', location: '全身散在', morphology: '风团', diagnosis: '急性荨麻疹', fungalTest: '阴性', treatment: '口服西替利嗪+钙剂+维生素C' },
    { id: 'DER-004', patient: '赵女士', location: '左侧胸背部', morphology: '水疱、糜烂', diagnosis: '带状疱疹', fungalTest: '阴性', treatment: '口服伐昔洛韦+外用阿昔洛韦乳膏+营养神经' },
    { id: 'DER-005', patient: '刘大爷', location: '面部、前胸', morphology: '粉刺、丘疹、脓疱', diagnosis: '寻常痤疮（中度）', fungalTest: '阴性', treatment: '外用阿达帕林凝胶+口服多西环素' },
  ];

  return json(ok({ cases, totalCount: cases.length }));
}

/* ==================== 五、精神卫生 ==================== */

/** GET /api/v1/psychiatry/visits - 精神科就诊 */
async function handlePsychiatryVisits(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const visits = [
    { id: 'PSY-001', patient: '张演示', diagnosis: '抑郁症（中度）', scale: { SDS: 65, SAS: 50 }, medication: '舍曲林 50mg qd', risk: { selfHarm: '低', suicide: '低', impulse: '低' } },
    { id: 'PSY-002', patient: '李患者', diagnosis: '焦虑症', scale: { SDS: 50, SAS: 68 }, medication: '阿普唑仑 0.4mg bid', risk: { selfHarm: '低', suicide: '低', impulse: '低' } },
    { id: 'PSY-003', patient: '王先生', diagnosis: '精神分裂症（偏执型）', scale: { PANSS: 85 }, medication: '奥氮平 10mg qn', risk: { selfHarm: '中', suicide: '低', impulse: '中' } },
    { id: 'PSY-004', patient: '赵女士', diagnosis: '双相情感障碍（躁狂相）', scale: { Young: 25 }, medication: '喹硫平 200mg bid + 丙戊酸钠 0.5g bid', risk: { selfHarm: '低', suicide: '低', impulse: '高' } },
    { id: 'PSY-005', patient: '刘大爷', diagnosis: '失眠症', scale: { PSQI: 12 }, medication: '右佐匹克隆 3mg qn', risk: { selfHarm: '低', suicide: '低', impulse: '低' } },
  ];

  return json(ok({ visits, totalCount: visits.length }));
}

/** GET /api/v1/psychiatry/medication - 精神科用药 */
async function handlePsychiatryMedication(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const medication = [
    { id: 'PSM-001', patient: '张演示', drug: '舍曲林', dosage: '50mg qd', compliance: '好', sideEffects: '轻度恶心（用药第 1 周）' },
    { id: 'PSM-002', patient: '王先生', drug: '奥氮平', dosage: '10mg qn', compliance: '一般', sideEffects: '体重增加（3 个月增加 5kg）' },
    { id: 'PSM-003', patient: '赵女士', drug: '喹硫平', dosage: '200mg bid', compliance: '好', sideEffects: '嗜睡（轻度）' },
  ];

  return json(ok({ medication, totalCount: medication.length }));
}

export const m229Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tcm/recipes', handle: handleTcmRecipes, auth: true },
  { method: 'GET', path: '/api/v1/tcm/acupuncture', handle: handleTcmAcupuncture, auth: true },
  { method: 'GET', path: '/api/v1/tcm/constitution', handle: handleTcmConstitution, auth: true },
  { method: 'GET', path: '/api/v1/dental/visits', handle: handleDentalVisits, auth: true },
  { method: 'GET', path: '/api/v1/dental/xray', handle: handleDentalXray, auth: true },
  { method: 'GET', path: '/api/v1/ophthalmology/exams', handle: handleOphthalmologyExams, auth: true },
  { method: 'GET', path: '/api/v1/ophthalmology/surgery', handle: handleOphthalmologySurgery, auth: true },
  { method: 'GET', path: '/api/v1/dermatology/cases', handle: handleDermatologyCases, auth: true },
  { method: 'GET', path: '/api/v1/psychiatry/visits', handle: handlePsychiatryVisits, auth: true },
  { method: 'GET', path: '/api/v1/psychiatry/medication', handle: handlePsychiatryMedication, auth: true },
];
