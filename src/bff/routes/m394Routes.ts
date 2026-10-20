/**
 * 健澜科技 jlmedaios - M394 P1 业务扩展：社区医疗深度打磨（详情版）
 *
 * 社区随访详情/家庭病床详情/健康档案详情/老年关怀详情/慢病管理详情/健康教育详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/community/followups-detail - 社区随访详情 5 条 */
async function handleCommunityFollowupsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CFD-001', followupId: 'COM-FLW-2026-1001', resident: '居民张***（65 岁男性，高血压患者，社区慢病随访）', followupContent: '患者血压 145/90 mmHg（偏高），无头晕头痛不适；服药依从性良好（每日规律服药）；生活方式：低盐饮食（每日盐摄入约 5g），每周运动 3 次（每次 30 分钟快走）', doctorSuggestion: '社区医生王***（全科主治医师）建议：继续规律服药，保持低盐饮食（每日盐摄入 < 5g），适当增加运动量；如血压持续升高或出现头晕头痛，请及时就诊', nextTime: '下次随访时间：2026-11-20（1 个月后，常规随访）' },
    { id: 'CFD-002', followupId: 'COM-FLW-2026-1002', resident: '居民李***（60 岁女性，糖尿病患者，社区慢病随访）', followupContent: '患者空腹血糖 7.5 mmol/L（偏高），无多饮多尿不适；服药依从性良好（每日规律服药）；生活方式：糖尿病饮食（控制主食量），每周运动 5 次（每次 30 分钟慢跑）', doctorSuggestion: '社区医生刘***（全科主治医师）建议：继续规律服药，严格控制饮食（主食量每日 < 200g），保持运动习惯；如血糖持续升高或出现低血糖症状，请及时就诊', nextTime: '下次随访时间：2026-11-20（1 个月后，常规随访）' },
    { id: 'CFD-003', followupId: 'COM-FLW-2026-1003', resident: '居民王***（70 岁男性，冠心病术后患者，社区随访）', followupContent: '患者心率 75 次/分（正常），血压 130/80 mmHg（正常）；无胸闷胸痛不适；服药依从性良好（每日规律服药）；生活方式：低脂饮食，每周运动 3 次（每次 20 分钟散步）', doctorSuggestion: '社区医生陈***（全科副主任医师）建议：继续规律服药，保持低脂饮食，适当运动（避免剧烈运动）；如出现胸闷胸痛或心慌，请立即就诊', nextTime: '下次随访时间：2026-10-27（2 周后，术后重点随访）' },
    { id: 'CFD-004', followupId: 'COM-FLW-2026-1004', resident: '居民刘***（55 岁女性，慢阻肺患者，社区随访）', followupContent: '患者血氧饱和度 93%（偏低），无明显呼吸困难；服药依从性良好（每日规律服药 + 吸入剂）；生活方式：戒烟（已戒烟 5 年），注意保暖（避免受凉感冒）', doctorSuggestion: '社区医生赵***（全科主治医师）建议：继续规律服药 + 吸入剂治疗，注意保暖预防感冒，适当进行呼吸功能锻炼；如出现呼吸困难加重或血氧饱和度持续低于 90%，请及时就诊', nextTime: '下次随访时间：2026-11-06（2 周后，慢阻肺稳定期随访）' },
    { id: 'CFD-005', followupId: 'COM-FLW-2026-1005', resident: '居民陈***（50 岁男性，脑卒中后遗症患者，社区康复随访）', followupContent: '患者右侧肢体肌力 4 级（较前改善），可独立行走（无需拐杖）；言语功能基本正常；服药依从性良好（每日规律服药）；康复训练：每日进行肢体功能锻炼 1 小时', doctorSuggestion: '社区医生孙***（全科主治医师）建议：继续规律服药，坚持康复训练（肢体功能锻炼 + 言语训练），注意预防再次脑卒中（控制血压、血糖、血脂）；如出现肢体无力加重或言语不清，请立即就诊', nextTime: '下次随访时间：2026-11-06（2 周后，康复效果评估）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/visits-detail - 家庭病床详情 5 条 */
async function handleCommunityVisitsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CVD-001', resident: '居民张***（75 岁男性，脑卒中后遗症，卧床，家庭病床）', disease: '脑卒中后遗症（右侧偏瘫，卧床）', bedsideCareRecords: '2026-10-20: 护士上门测血压（140/85 mmHg）、血糖（6.5 mmol/L），更换尿管，皮肤护理（无压疮）；2026-10-18: 护士上门测血压（145/90 mmHg），更换尿管，口腔护理；2026-10-16: 医生上门查体，评估康复情况，调整用药方案', doctor: '社区医生王***（全科副主任医师）（每周上门 1 次）；社区护士李***（每周上门 2 次）', status: '家庭病床运行正常（已建床 3 个月，患者病情稳定，无并发症）' },
    { id: 'CVD-002', resident: '居民李***（80 岁女性，骨折术后，卧床，家庭病床）', disease: '股骨颈骨折术后（卧床，需康复）', bedsideCareRecords: '2026-10-20: 护士上门测血压（135/80 mmHg），伤口换药（伤口愈合良好，无感染），协助翻身（预防压疮）；2026-10-18: 护士上门测血压（130/75 mmHg），伤口换药，协助下肢功能锻炼；2026-10-16: 医生上门查体，评估骨折愈合情况，指导康复训练', doctor: '社区医生刘***（全科主治医师）（每周上门 1 次）；社区护士王***（每周上门 2 次）', status: '家庭病床运行正常（已建床 2 个月，伤口愈合良好，康复进展顺利）' },
    { id: 'CVD-003', resident: '居民王***（70 岁男性，晚期肿瘤患者，卧床，家庭病床）', disease: '晚期肺癌（IV 期，卧床，姑息治疗）', bedsideCareRecords: '2026-10-20: 护士上门测血压（110/70 mmHg），疼痛评估（VAS 评分 3 分，轻度疼痛），止痛药物护理；2026-10-18: 护士上门测血压（105/65 mmHg），营养护理（鼻饲喂养），皮肤护理；2026-10-16: 医生上门查体，评估病情，调整止痛方案', doctor: '社区医生陈***（全科副主任医师）（每周上门 2 次）；社区护士赵***（每周上门 3 次）', status: '家庭病床运行正常（已建床 4 个月，患者疼痛控制良好，生活质量尚可）' },
    { id: 'CVD-004', resident: '居民刘***（65 岁女性，慢性心衰患者，半卧床，家庭病床）', disease: '慢性心力衰竭（心功能 III 级，半卧床）', bedsideCareRecords: '2026-10-20: 护士上门测血压（120/75 mmHg），心率（85 次/分），体重（60.5 kg，较前增加 0.5 kg），水肿评估（双下肢轻度水肿）；2026-10-18: 护士上门测血压（115/70 mmHg），心率（80 次/分），指导限制饮水；2026-10-16: 医生上门查体，评估心衰情况，调整利尿剂剂量', doctor: '社区医生赵***（全科主治医师）（每周上门 1 次）；社区护士孙***（每周上门 2 次）', status: '家庭病床运行正常（已建床 3 个月，心衰控制尚可，需密切监测体重变化）' },
    { id: 'CVD-005', resident: '居民陈***（72 岁男性，阿尔茨海默病患者，卧床，家庭病床）', disease: '阿尔茨海默病（中度，卧床，生活不能自理）', bedsideCareRecords: '2026-10-20: 护士上门测血压（130/80 mmHg），进食护理（协助喂食），皮肤护理（无压疮），大小便护理；2026-10-18: 护士上门测血压（125/75 mmHg），认知功能评估（MMSE 评分 12 分，中度认知障碍），安全护理（防跌倒）；2026-10-16: 医生上门查体，评估病情，调整认知改善药物', doctor: '社区医生孙***（全科主治医师）（每周上门 1 次）；社区护士周***（每周上门 3 次）', status: '家庭病床运行正常（已建床 6 个月，患者病情稳定，无并发症，家属照护负担较重）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/health-records-detail - 健康档案详情 5 条 */
async function handleCommunityHealthRecordsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CHRD-001', resident: '居民张***（65 岁男性，高血压患者）', basicInfo: '姓名：张***；性别：男；年龄：65 岁；联系电话：138****5678；家庭住址：杭州市西湖区文三路 XXX 号 XXX 小区 XXX 幢 XXX 室', medicalHistory: '既往病史：高血压（5 年，规律服药）；无糖尿病、冠心病、脑卒中病史；手术史：无；过敏史：无药物过敏', examRecords: '2026-10-01 体检：血压 145/90 mmHg（偏高）；血糖 5.8 mmol/L（正常）；血脂：总胆固醇 5.2 mmol/L（偏高）；心电图：正常；腹部 B 超：轻度脂肪肝', updateTime: '2026-10-20 09:00:00（最近更新时间：社区随访时更新）' },
    { id: 'CHRD-002', resident: '居民李***（60 岁女性，糖尿病患者）', basicInfo: '姓名：李***；性别：女；年龄：60 岁；联系电话：139****8765；家庭住址：杭州市拱墅区莫干山路 XXX 号 XXX 小区 XXX 幢 XXX 室', medicalHistory: '既往病史：2 型糖尿病（3 年，规律服药）；高血压（2 年，规律服药）；无冠心病、脑卒中病史；手术史：胆囊切除术（2018 年）；过敏史：青霉素过敏', examRecords: '2026-10-01 体检：血压 135/80 mmHg（正常）；空腹血糖 7.5 mmol/L（偏高）；糖化血红蛋白 7.2%（偏高）；血脂：甘油三酯 2.0 mmol/L（偏高）；眼底检查：糖尿病视网膜病变（I 期）', updateTime: '2026-10-20 10:00:00（最近更新时间：社区随访时更新）' },
    { id: 'CHRD-003', resident: '居民王***（70 岁男性，冠心病术后患者）', basicInfo: '姓名：王***；性别：男；年龄：70 岁；联系电话：137****4321；家庭住址：杭州市滨江区江南大道 XXX 号 XXX 小区 XXX 幢 XXX 室', medicalHistory: '既往病史：冠心病（5 年，支架植入术后 2 年）；高血压（10 年，规律服药）；糖尿病（3 年，规律服药）；手术史：冠脉支架植入术（2024 年）；过敏史：无药物过敏', examRecords: '2026-10-01 体检：血压 130/80 mmHg（正常）；空腹血糖 6.5 mmol/L（正常）；血脂：低密度脂蛋白 1.8 mmol/L（达标）；心电图：窦性心律，正常；心脏 B 超：左心室射血分数 55%（正常）', updateTime: '2026-10-20 11:00:00（最近更新时间：社区随访时更新）' },
    { id: 'CHRD-004', resident: '居民刘***（55 岁女性，慢阻肺患者）', basicInfo: '姓名：刘***；性别：女；年龄：55 岁；联系电话：136****8765；家庭住址：杭州市余杭区文一西路 XXX 号 XXX 小区 XXX 幢 XXX 室', medicalHistory: '既往病史：慢性阻塞性肺疾病（10 年，规律服药 + 吸入剂）；高血压（3 年，规律服药）；无糖尿病、冠心病病史；手术史：无；过敏史：无药物过敏；吸烟史：已戒烟 5 年（吸烟 20 年，每日 10 支）', examRecords: '2026-10-01 体检：血压 130/80 mmHg（正常）；血氧饱和度 93%（偏低）；肺功能：FEV1/FVC 65%（中度阻塞性通气功能障碍）；胸部 CT：双肺纹理增粗，肺气肿', updateTime: '2026-10-20 14:00:00（最近更新时间：社区随访时更新）' },
    { id: 'CHRD-005', resident: '居民陈***（50 岁男性，脑卒中后遗症患者）', basicInfo: '姓名：陈***；性别：男；年龄：50 岁；联系电话：135****2345；家庭住址：杭州市上城区延安路 XXX 号 XXX 小区 XXX 幢 XXX 室', medicalHistory: '既往病史：脑卒中（1 年，右侧偏瘫，规律服药 + 康复训练）；高血压（10 年，规律服药）；糖尿病（5 年，规律服药）；手术史：无；过敏史：无药物过敏', examRecords: '2026-10-01 体检：血压 135/85 mmHg（正常）；空腹血糖 6.8 mmol/L（正常）；血脂：低密度脂蛋白 2.0 mmol/L（达标）；头颅 CT：左侧基底节区脑软化灶；肢体肌力：右侧上肢 4 级，右侧下肢 4 级', updateTime: '2026-10-20 15:00:00（最近更新时间：社区随访时更新）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/elderly-care-detail - 老年关怀详情 5 条 */
async function handleCommunityElderlyCareDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CECD-001', resident: '居民张***（80 岁女性，独居老人，空巢老人关怀服务）', careContent: '每周上门探望 2 次（周二、周五）；帮助购物（买菜、买药）；陪聊解闷（了解生活需求、心理状态）；检查居家安全（燃气安全、用电安全）', serviceRecords: '2026-10-20: 志愿者上门探望，帮助购买蔬菜和药品，陪聊 30 分钟，检查居家安全（无安全隐患）；2026-10-17: 志愿者上门探望，帮助购买蔬菜，陪聊 20 分钟，检查居家安全（无安全隐患）', frequency: '每周上门 2 次（周二、周五上午）', responsiblePerson: '社区志愿者王***（退休护士，定期上门服务）' },
    { id: 'CECD-002', resident: '居民李***（85 岁男性，独居老人，高龄老人关怀服务）', careContent: '每日电话问候 1 次（上午 10:00）；每周上门探望 3 次（周一、周三、周五）；帮助购物（买菜、买药）；协助就医（陪同到社区卫生服务中心就诊）', serviceRecords: '2026-10-20: 电话问候（老人状态良好）；志愿者上门探望，帮助购买蔬菜和药品，陪同到社区卫生服务中心测血压（145/90 mmHg，偏高）；2026-10-18: 电话问候（老人状态良好）；志愿者上门探望，帮助购买蔬菜，陪聊 30 分钟', frequency: '每日电话问候 1 次；每周上门 3 次（周一、周三、周五上午）', responsiblePerson: '社区志愿者刘***（退休教师，定期上门服务）；社区医生陈***（每周三上门测血压）' },
    { id: 'CECD-003', resident: '居民王***（75 岁女性，慢病老人，老年健康关怀服务）', careContent: '每周上门测血压 1 次（周三上午）；每月上门测血糖 1 次（每月 1 日上午）；用药指导（提醒按时服药）；健康咨询（解答健康疑问）', serviceRecords: '2026-10-18: 社区医生上门测血压（140/85 mmHg，正常），用药指导（提醒按时服用降压药），健康咨询（解答关于饮食调理的疑问）；2026-10-01: 社区医生上门测血糖（6.2 mmol/L，正常），用药指导，健康咨询（解答关于运动锻炼的疑问）', frequency: '每周测血压 1 次（周三上午）；每月测血糖 1 次（每月 1 日上午）', responsiblePerson: '社区医生赵***（全科主治医师，定期上门服务）' },
    { id: 'CECD-004', resident: '居民刘***（90 岁男性，高龄老人，居家养老关怀服务）', careContent: '每日上门送餐 2 次（午餐、晚餐）；每周上门理发 1 次（周四上午）；每周上门洗澡 1 次（周三上午，由护理员协助）；每月上门健康体检 1 次（每月 5 日上午）', serviceRecords: '2026-10-20: 护理员上门送餐（午餐 + 晚餐）；2026-10-19: 护理员上门协助洗澡，更换床单被罩；2026-10-18: 社区医生上门健康体检（血压 130/80 mmHg，心率 75 次/分，血氧饱和度 95%，各项指标正常）', frequency: '每日送餐 2 次；每周理发 1 次；每周洗澡 1 次；每月体检 1 次', responsiblePerson: '社区护理员孙***（专职居家养老护理员）；社区医生周***（全科主治医师，每月上门体检）' },
    { id: 'CECD-005', resident: '居民陈***（78 岁女性，失能老人，居家照护关怀服务）', careContent: '每日上门护理 2 次（上午、下午）；协助进食、穿衣、洗漱；协助大小便（使用纸尿裤）；定期翻身（预防压疮，每 2 小时 1 次，由家属执行）', serviceRecords: '2026-10-20: 护理员上午上门协助进食、穿衣、洗漱；下午上门协助更换纸尿裤、皮肤护理（无压疮）；2026-10-19: 护理员上午上门协助进食、穿衣、洗漱；下午上门协助更换纸尿裤、肢体被动活动（预防关节僵硬）', frequency: '每日上门护理 2 次（上午 9:00、下午 15:00）', responsiblePerson: '社区护理员周***（专职失能老人护理员）；家属（子女，主要照护者，负责翻身等日常照护）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/chronic-disease-detail - 慢病管理详情 5 条 */
async function handleCommunityChronicDiseaseDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CCDD-001', resident: '居民张***（65 岁男性，高血压患者）', disease: '原发性高血压（2 级，中危组，病史 5 年）', monitoringMetrics: '血压监测：每日早晚各测 1 次（家用电子血压计），近 1 周平均血压 140/85 mmHg（控制一般）；心率：平均 70 次/分（正常）；体重：70 kg（稳定）', medicationRecords: '硝苯地平控释片 30mg × 30 片（每日 1 次，每次 1 片，晨起服用）；缬沙坦胶囊 80mg × 28 粒（每日 1 次，每次 1 粒，晨起服用）；服药依从性：良好（每日规律服药，无漏服）', doctor: '社区医生王***（全科副主任医师）（每月随访 1 次，调整治疗方案）' },
    { id: 'CCDD-002', resident: '居民李***（60 岁女性，2 型糖尿病患者）', disease: '2 型糖尿病（病史 3 年，合并高血压）', monitoringMetrics: '血糖监测：每日测 4 次（空腹 + 三餐后 2 小时），近 1 周平均空腹血糖 7.5 mmol/L（控制不佳）；糖化血红蛋白：7.2%（偏高，目标 < 7%）；血压：135/80 mmHg（控制尚可）', medicationRecords: '二甲双胍缓释片 0.5g × 30 片（每日 2 次，每次 2 片，饭中服用）；格列美脲片 2mg × 30 片（每日 1 次，每次 1 片，早餐前服用）；氨氯地平片 5mg × 28 片（每日 1 次，每次 1 片，晨起服用）；服药依从性：良好（每日规律服药，无漏服）', doctor: '社区医生刘***（全科主治医师）（每 2 周随访 1 次，调整降糖方案）' },
    { id: 'CCDD-003', resident: '居民王***（70 岁男性，冠心病术后患者）', disease: '冠心病（支架植入术后 2 年，合并高血压、糖尿病）', monitoringMetrics: '心率监测：每日早晚各测 1 次，近 1 周平均心率 70 次/分（正常）；血压：130/80 mmHg（控制良好）；空腹血糖：6.5 mmol/L（控制良好）；血脂：低密度脂蛋白 1.8 mmol/L（达标，目标 < 1.8 mmol/L）', medicationRecords: '阿司匹林肠溶片 100mg × 30 片（每日 1 次，每次 1 片，晨起服用）；阿托伐他汀钙片 20mg × 28 片（每日 1 次，每次 1 片，睡前服用）；美托洛尔缓释片 47.5mg × 28 片（每日 1 次，每次 1 片，晨起服用）；二甲双胍缓释片 0.5g × 30 片（每日 2 次，每次 1 片，饭中服用）；服药依从性：良好（每日规律服药，无漏服）', doctor: '社区医生陈***（全科副主任医师）（每月随访 1 次，评估术后恢复情况）' },
    { id: 'CCDD-004', resident: '居民刘***（55 岁女性，慢阻肺患者）', disease: '慢性阻塞性肺疾病（中度，病史 10 年，合并高血压）', monitoringMetrics: '血氧饱和度监测：每日早晚各测 1 次（指夹式血氧仪），近 1 周平均血氧饱和度 93%（偏低）；血压：130/80 mmHg（控制良好）；肺功能：FEV1/FVC 65%（中度阻塞性通气功能障碍）', medicationRecords: '布地奈德福莫特罗吸入剂 160/4.5μg × 1 支（每日 2 次，每次 1 吸）；噻托溴铵粉吸入剂 18μg × 1 支（每日 1 次，每次 1 吸）；氨氯地平片 5mg × 28 片（每日 1 次，每次 1 片，晨起服用）；服药依从性：良好（每日规律吸入 + 服药，无漏用）', doctor: '社区医生赵***（全科主治医师）（每 2 周随访 1 次，评估慢阻肺控制情况）' },
    { id: 'CCDD-005', resident: '居民陈***（50 岁男性，脑卒中后遗症患者）', disease: '缺血性脑卒中（发病 1 年，右侧偏瘫，合并高血压、糖尿病）', monitoringMetrics: '血压监测：每日早晚各测 1 次，近 1 周平均血压 135/85 mmHg（控制尚可）；空腹血糖：6.8 mmol/L（控制尚可）；肢体肌力：右侧上肢 4 级，右侧下肢 4 级（较前改善）；日常生活能力：Barthel 指数 80 分（中度依赖）', medicationRecords: '阿司匹林肠溶片 100mg × 30 片（每日 1 次，每次 1 片，晨起服用）；阿托伐他汀钙片 20mg × 28 片（每日 1 次，每次 1 片，睡前服用）；氨氯地平片 5mg × 28 片（每日 1 次，每次 1 片，晨起服用）；二甲双胍缓释片 0.5g × 30 片（每日 2 次，每次 1 片，饭中服用）；服药依从性：良好（每日规律服药，无漏服）', doctor: '社区医生孙***（全科主治医师）（每 2 周随访 1 次，评估康复进展）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/community/education-detail - 健康教育详情 5 条 */
async function handleCommunityEducationDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CED-001', activityName: '高血压防治健康讲座（社区健康教育活动）', topic: '高血压的预防与治疗（如何控制血压、预防并发症）', contentSummary: '1. 高血压的危害（心脑血管疾病风险）；2. 高血压的诊断标准（140/90 mmHg）；3. 高血压的治疗（药物治疗 + 生活方式干预）；4. 高血压的预防（低盐饮食、适量运动、戒烟限酒）', participants: '社区居民 80 人（以高血压患者及家属为主，年龄 45-75 岁）', effectEvaluation: '活动后问卷调查：90% 居民表示学到了高血压防治知识；85% 居民表示会改变不良生活习惯（如减少盐摄入、增加运动）；活动满意度评分 4.5 分（满分 5 分）' },
    { id: 'CED-002', activityName: '糖尿病饮食管理工作坊（社区健康教育活动）', topic: '糖尿病患者的饮食管理（如何控制血糖、合理搭配饮食）', contentSummary: '1. 糖尿病的饮食原则（控制总热量、合理搭配营养素）；2. 主食的选择（粗粮优于细粮，控制主食量）；3. 蔬菜的选择（多吃绿叶蔬菜，少吃淀粉类蔬菜）；4. 水果的选择（选择低糖水果，控制摄入量）；5. 实地练习（如何搭配一日三餐）', participants: '社区糖尿病患者 30 人（以 2 型糖尿病患者为主，年龄 40-70 岁）', effectEvaluation: '活动后实操评估：90% 患者掌握了糖尿病饮食搭配方法；80% 患者表示会按照学到的方法调整饮食；活动满意度评分 4.6 分（满分 5 分）' },
    { id: 'CED-003', activityName: '脑卒中急救知识培训（社区健康教育活动）', topic: '脑卒中的识别与急救（如何快速识别脑卒中、正确拨打 120）', contentSummary: '1. 脑卒中的危害（高致残率、高死亡率）；2. 脑卒中的快速识别（FAST 原则：Face 面部、Arm 手臂、Speech 言语、Time 时间）；3. 脑卒中的急救（立即拨打 120，不要自行服药）；4. 脑卒中的预防（控制血压、血糖、血脂，戒烟限酒）', participants: '社区居民 100 人（以中老年人为主，年龄 35-80 岁）', effectEvaluation: '活动后知识测试：85% 居民正确掌握了脑卒中快速识别方法；90% 居民表示知道如何正确拨打 120；活动满意度评分 4.4 分（满分 5 分）' },
    { id: 'CED-004', activityName: '中医养生保健讲座（社区健康教育活动）', topic: '中医养生保健（四季养生、饮食调养、穴位按摩）', contentSummary: '1. 中医养生的基本理念（天人合一、阴阳平衡）；2. 四季养生要点（春养肝、夏养心、秋养肺、冬养肾）；3. 饮食调养（因人而异、因时制宜）；4. 常用保健穴位按摩（足三里、涌泉穴、合谷穴）', participants: '社区居民 60 人（以中老年女性为主，年龄 45-75 岁）', effectEvaluation: '活动后问卷调查：95% 居民表示对中医养生产生了兴趣；80% 居民表示会尝试学到的养生方法（如穴位按摩）；活动满意度评分 4.7 分（满分 5 分）' },
    { id: 'CED-005', activityName: '老年人防跌倒培训（社区健康教育活动）', topic: '老年人跌倒的预防与急救（如何预防跌倒、跌倒后的正确处理）', contentSummary: '1. 老年人跌倒的危害（骨折、颅脑损伤）；2. 跌倒的危险因素（肌力下降、平衡能力差、居家环境隐患）；3. 跌倒的预防（肌力训练、平衡训练、改善居家环境）；4. 跌倒后的正确处理（不要急于起身，评估伤情，必要时拨打 120）', participants: '社区老年人 50 人（以 65 岁以上老年人为主）', effectEvaluation: '活动后实操练习：90% 老年人掌握了跌倒预防的运动方法；85% 老年人表示会改善居家环境（如安装扶手、清除地面障碍物）；活动满意度评分 4.5 分（满分 5 分）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m394Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/community/followups-detail', handle: handleCommunityFollowupsDetail, auth: true },
  { method: 'GET', path: '/api/v1/community/visits-detail', handle: handleCommunityVisitsDetail, auth: true },
  { method: 'GET', path: '/api/v1/community/health-records-detail', handle: handleCommunityHealthRecordsDetail, auth: true },
  { method: 'GET', path: '/api/v1/community/elderly-care-detail', handle: handleCommunityElderlyCareDetail, auth: true },
  { method: 'GET', path: '/api/v1/community/chronic-disease-detail', handle: handleCommunityChronicDiseaseDetail, auth: true },
  { method: 'GET', path: '/api/v1/community/education-detail', handle: handleCommunityEducationDetail, auth: true },
];
