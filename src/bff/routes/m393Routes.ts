/**
 * 健澜科技 jlmedaios - M393 P1 业务扩展：远程医疗深度打磨（详情版）
 *
 * 远程会诊详情/远程诊断详情/远程监护详情/远程手术详情/远程培训详情/远程设备详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/telemed/remote-consults-detail - 远程会诊详情 5 条 */
async function handleTelemedRemoteConsultsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRCD-001', consultId: 'RCS-2026-1001', patientCondition: '患者张***（65 岁男性，基层医院转诊）主诉：反复胸痛 3 个月，加重 1 周，基层医院诊断为冠心病，但治疗效果不佳（视频会诊）', initiatorDept: '基层医院心内科（杭州市某社区卫生服务中心）', expertOpinion: '浙一医院心内科专家王***（主任医师）意见：患者心电图显示 ST-T 改变，心肌酶谱正常，考虑为不稳定型心绞痛，建议完善冠脉造影检查，明确血管病变情况', conclusion: '会诊结论：建议转至上级医院（浙一医院）完善冠脉造影检查，根据造影结果决定治疗方案（药物保守治疗 / 介入治疗 / 手术治疗）' },
    { id: 'TRCD-002', consultId: 'RCS-2026-1002', patientCondition: '患者李***（55 岁女性，基层医院转诊）主诉：反复头痛头晕 2 个月，伴视物模糊，基层医院诊断为高血压，但血压控制不佳（视频会诊）', initiatorDept: '基层医院神经内科（杭州市某社区卫生服务中心）', expertOpinion: '浙二医院神经内科专家李***（主任医师）意见：患者血压 160/100mmHg，头颅 CT 未见明显异常，考虑为原发性高血压（2 级），建议调整降压药物方案，加强血压监测', conclusion: '会诊结论：建议调整降压药物（加用钙通道阻滞剂），每日监测血压 2 次（早晚），2 周后复诊评估血压控制情况' },
    { id: 'TRCD-003', consultId: 'RCS-2026-1003', patientCondition: '患者王***（70 岁男性，基层医院转诊）主诉：反复咳嗽咳痰 10 年，加重伴呼吸困难 1 周，基层医院诊断为慢阻肺急性加重（视频会诊）', initiatorDept: '基层医院呼吸科（杭州市某社区卫生服务中心）', expertOpinion: '省人民医院呼吸科专家刘***（主任医师）意见：患者血气分析显示 II 型呼吸衰竭，胸部 CT 显示双肺炎症，考虑为慢阻肺急性加重（合并呼吸衰竭），建议无创通气治疗，加强抗感染治疗', conclusion: '会诊结论：建议转至上级医院（省人民医院）呼吸科监护病房，给予无创通气 + 抗感染 + 平喘治疗，密切监测血气分析' },
    { id: 'TRCD-004', consultId: 'RCS-2026-1004', patientCondition: '患者刘***（45 岁女性，基层医院转诊）主诉：反复腹痛腹泻 1 个月，伴体重下降 5kg，基层医院诊断为肠易激综合征，但治疗效果不佳（视频会诊）', initiatorDept: '基层医院消化科（杭州市某社区卫生服务中心）', expertOpinion: '邵逸夫医院消化科专家陈***（主任医师）意见：患者肠镜检查显示结肠息肉（多发），病理为腺瘤性息肉，考虑为结肠息肉（腺瘤性），建议内镜下息肉切除治疗', conclusion: '会诊结论：建议转至上级医院（邵逸夫医院）消化内镜中心，行内镜下息肉切除治疗，术后定期复查肠镜' },
    { id: 'TRCD-005', consultId: 'RCS-2026-1005', patientCondition: '患者陈***（60 岁男性，基层医院转诊）主诉：发现血糖升高 5 年，近期血糖控制不佳，空腹血糖 10.5mmol/L（视频会诊）', initiatorDept: '基层医院内分泌科（杭州市某社区卫生服务中心）', expertOpinion: '省中医院内分泌科专家赵***（主任医师）意见：患者糖化血红蛋白 8.5%，考虑为 2 型糖尿病（血糖控制不佳），建议调整降糖方案，加用胰岛素治疗', conclusion: '会诊结论：建议调整降糖方案（加用基础胰岛素），加强血糖监测（每日 4 次），糖尿病饮食 + 运动治疗，2 周后复诊评估血糖控制情况' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-diagnosis-detail - 远程诊断详情 5 条 */
async function handleTelemedRemoteDiagnosisDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRDD-001', diagnosisId: 'RDG-2026-1001', patientCondition: '患者张***（50 岁男性）主诉：体检发现肺部结节（CT 影像上传），基层医院无法明确诊断（远程影像诊断）', testResults: '胸部 CT 影像：右肺上叶见一结节（直径约 1.5cm），边缘毛糙，有分叶征，考虑为肺癌可能性大', expertDiagnosis: '放射科专家王***（主任医师）远程诊断：右肺上叶结节（肺癌可能性大，建议病理活检明确诊断）', suggestion: '建议转至上级医院胸外科，行 CT 引导下肺穿刺活检，明确病理诊断后制定治疗方案' },
    { id: 'TRDD-002', diagnosisId: 'RDG-2026-1002', patientCondition: '患者李***（45 岁女性）主诉：体检发现乳腺结节（超声影像上传），基层医院无法明确诊断（远程超声诊断）', testResults: '乳腺超声影像：左乳外上象限见一结节（大小约 2.0cm × 1.5cm），边界不清，形态不规则，考虑为乳腺癌可能性大', expertDiagnosis: '超声科专家李***（主任医师）远程诊断：左乳结节（BI-RADS 4c 类，乳腺癌可能性大，建议病理活检明确诊断）', suggestion: '建议转至上级医院乳腺外科，行乳腺结节穿刺活检，明确病理诊断后制定治疗方案' },
    { id: 'TRDD-003', diagnosisId: 'RDG-2026-1003', patientCondition: '患者王***（55 岁男性）主诉：体检发现肝占位（MRI 影像上传），基层医院无法明确诊断（远程影像诊断）', testResults: '腹部 MRI 影像：肝右叶见一占位（大小约 3.0cm × 2.5cm），T2WI 高信号，增强扫描动脉期强化，考虑为肝癌可能性大', expertDiagnosis: '放射科专家刘***（主任医师）远程诊断：肝右叶占位（肝癌可能性大，建议结合 AFP 等肿瘤标志物明确诊断）', suggestion: '建议转至上级医院肝胆外科，完善 AFP、CEA 等肿瘤标志物检查，必要时行肝穿刺活检明确病理诊断' },
    { id: 'TRDD-004', diagnosisId: 'RDG-2026-1004', patientCondition: '患者刘***（60 岁女性）主诉：反复晕厥 3 次（动态心电图上传），基层医院无法明确诊断（远程心电诊断）', testResults: '动态心电图：24 小时内见室性早搏 500 次，其中短阵室速 3 阵（每阵 3-5 个早搏），考虑为恶性心律失常', expertDiagnosis: '心电科专家陈***（主任医师）远程诊断：心律失常（短阵室速，恶性心律失常，建议尽快治疗）', suggestion: '建议转至上级医院心内科，行心脏电生理检查，必要时植入 ICD（埋藏式心脏复律除颤器）' },
    { id: 'TRDD-005', diagnosisId: 'RDG-2026-1005', patientCondition: '患者陈***（35 岁女性）主诉：孕期产检发现胎儿异常（超声影像上传），基层医院无法明确诊断（远程超声诊断）', testResults: '胎儿超声影像：胎儿心脏见室间隔缺损（直径约 0.5cm），考虑为先天性心脏病（室间隔缺损）', expertDiagnosis: '超声科专家赵***（主任医师）远程诊断：胎儿先天性心脏病（室间隔缺损，建议出生后手术治疗）', suggestion: '建议转至上级医院产科 + 小儿心脏外科，定期产检监测胎儿发育情况，出生后根据病情决定手术时机' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-monitoring-detail - 远程监护详情 5 条 */
async function handleTelemedRemoteMonitoringDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRMD-001', monitoringId: 'RMN-2026-1001', patient: '患者张***（65 岁男性，冠心病术后居家监护）', monitoringMetrics: '心率（正常范围：60-100 次/分）；血压（正常范围：90-140/60-90 mmHg）；血氧饱和度（正常范围：≥95%）', alertRecords: '2026-10-20 08:00: 心率 110 次/分（偏高，已通知患者休息）；2026-10-20 12:00: 血压 150/95 mmHg（偏高，已通知患者服药）；2026-10-20 18:00: 血氧饱和度 96%（正常）', doctor: '心内科医生王***（主任医师）（每日远程查看监护数据，发现异常及时处理）' },
    { id: 'TRMD-002', monitoringId: 'RMN-2026-1002', patient: '患者李***（70 岁女性，慢阻肺居家监护）', monitoringMetrics: '血氧饱和度（正常范围：≥90%）；呼吸频率（正常范围：12-20 次/分）；心率（正常范围：60-100 次/分）', alertRecords: '2026-10-20 06:00: 血氧饱和度 88%（偏低，已通知患者吸氧）；2026-10-20 10:00: 呼吸频率 25 次/分（偏高，已通知患者休息）；2026-10-20 16:00: 血氧饱和度 92%（改善）', doctor: '呼吸科医生李***（副主任医师）（每日远程查看监护数据，发现异常及时处理）' },
    { id: 'TRMD-003', monitoringId: 'RMN-2026-1003', patient: '患者王***（55 岁男性，糖尿病居家监护）', monitoringMetrics: '血糖（空腹正常范围：4.4-7.0 mmol/L）；血压（正常范围：90-140/60-90 mmHg）；心率（正常范围：60-100 次/分）', alertRecords: '2026-10-20 07:00: 空腹血糖 8.5 mmol/L（偏高，已通知患者调整饮食）；2026-10-20 12:00: 餐后 2 小时血糖 12.0 mmol/L（偏高，已通知患者加强运动）；2026-10-20 18:00: 血压 130/85 mmHg（正常）', doctor: '内分泌科医生刘***（副主任医师）（每日远程查看监护数据，发现异常及时处理）' },
    { id: 'TRMD-004', monitoringId: 'RMN-2026-1004', patient: '患者刘***（60 岁女性，高血压居家监护）', monitoringMetrics: '血压（正常范围：90-140/60-90 mmHg）；心率（正常范围：60-100 次/分）', alertRecords: '2026-10-20 08:00: 血压 160/100 mmHg（偏高，已通知患者服药）；2026-10-20 14:00: 血压 145/90 mmHg（偏高，已通知患者休息）；2026-10-20 20:00: 血压 135/85 mmHg（正常）', doctor: '心内科医生陈***（主治医师）（每日远程查看监护数据，发现异常及时处理）' },
    { id: 'TRMD-005', monitoringId: 'RMN-2026-1005', patient: '患者陈***（50 岁男性，心衰居家监护）', monitoringMetrics: '体重（正常范围：稳定）；心率（正常范围：60-100 次/分）；血氧饱和度（正常范围：≥95%）；血压（正常范围：90-140/60-90 mmHg）', alertRecords: '2026-10-20 08:00: 体重增加 1.5kg（偏高，已通知患者限制饮水）；2026-10-20 12:00: 心率 105 次/分（偏高，已通知患者服药）；2026-10-20 18:00: 血氧饱和度 94%（偏低，已通知患者吸氧）', doctor: '心内科医生赵***（主任医师）（每日远程查看监护数据，发现异常及时处理）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-surgery-detail - 远程手术详情 5 条 */
async function handleTelemedRemoteSurgeryDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRSD-001', surgeryId: 'RSG-2026-1001', patient: '患者张***（55 岁男性，基层医院腹腔镜胆囊切除术）', surgeryProcess: '基层医院外科医生主刀，上级医院专家远程指导：患者全麻生效后，建立气腹（12mmHg），置入腹腔镜器械，探查胆囊（胆囊结石 + 慢性胆囊炎），分离胆囊管及胆囊动脉，夹闭并切断，切除胆囊，止血，放置引流管，缝合切口', remoteAssistance: '上级医院外科专家王***（主任医师）通过 5G 高清视频远程指导，实时观察手术画面，指导手术操作要点（如胆囊管分离、止血等），手术过程顺利', result: '手术结果：手术成功，用时 90 分钟，术中出血 50ml，无手术并发症；患者术后恢复良好，术后第 3 天出院' },
    { id: 'TRSD-002', surgeryId: 'RSG-2026-1002', patient: '患者李***（60 岁女性，基层医院腹腔镜阑尾切除术）', surgeryProcess: '基层医院外科医生主刀，上级医院专家远程指导：患者全麻生效后，建立气腹（12mmHg），置入腹腔镜器械，探查阑尾（急性阑尾炎），分离阑尾系膜，夹闭阑尾动脉，切除阑尾，残端消毒包埋，止血，缝合切口', remoteAssistance: '上级医院外科专家李***（副主任医师）通过 5G 高清视频远程指导，实时观察手术画面，指导手术操作要点（如阑尾系膜分离、残端处理等），手术过程顺利', result: '手术结果：手术成功，用时 60 分钟，术中出血 20ml，无手术并发症；患者术后恢复良好，术后第 2 天出院' },
    { id: 'TRSD-003', surgeryId: 'RSG-2026-1003', patient: '患者王***（65 岁男性，基层医院股骨颈骨折内固定术）', surgeryProcess: '基层医院骨科医生主刀，上级医院专家远程指导：患者椎管内麻醉生效后，仰卧位，患肢牵引，C 臂透视下定位骨折端，切开复位，置入 3 枚空心螺钉固定，C 臂透视确认位置良好，缝合切口', remoteAssistance: '上级医院骨科专家刘***（主任医师）通过 5G 高清视频远程指导，实时观察手术画面及 C 臂透视影像，指导手术操作要点（如骨折复位、螺钉置入等），手术过程顺利', result: '手术结果：手术成功，用时 120 分钟，术中出血 100ml，无手术并发症；患者术后恢复良好，术后第 7 天扶拐下地活动' },
    { id: 'TRSD-004', surgeryId: 'RSG-2026-1004', patient: '患者刘***（50 岁女性，基层医院甲状腺腺瘤切除术）', surgeryProcess: '基层医院普外科医生主刀，上级医院专家远程指导：患者颈丛麻醉生效后，仰卧位，肩部垫高，颈部切口（沿皮纹），逐层切开，显露甲状腺，探查腺瘤（甲状腺右叶腺瘤，大小约 3.0cm），切除腺瘤，止血，放置引流管，缝合切口', remoteAssistance: '上级医院普外科专家陈***（副主任医师）通过 5G 高清视频远程指导，实时观察手术画面，指导手术操作要点（如喉返神经保护、止血等），手术过程顺利', result: '手术结果：手术成功，用时 90 分钟，术中出血 30ml，无手术并发症（无喉返神经损伤）；患者术后恢复良好，术后第 3 天出院' },
    { id: 'TRSD-005', surgeryId: 'RSG-2026-1005', patient: '患者陈***（45 岁男性，基层医院腹股沟疝修补术）', surgeryProcess: '基层医院普外科医生主刀，上级医院专家远程指导：患者局麻生效后，仰卧位，腹股沟切口，逐层切开，显露疝囊，高位结扎疝囊，置入补片（无张力修补），缝合切口', remoteAssistance: '上级医院普外科专家赵***（主治医师）通过 5G 高清视频远程指导，实时观察手术画面，指导手术操作要点（如疝囊高位结扎、补片放置等），手术过程顺利', result: '手术结果：手术成功，用时 60 分钟，术中出血 10ml，无手术并发症；患者术后恢复良好，术后第 1 天下床活动，术后第 3 天出院' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-training-detail - 远程培训详情 5 条 */
async function handleTelemedRemoteTrainingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRTD-001', trainingName: '远程手术技术培训（腹腔镜手术基础）', lecturer: '上级医院外科专家王***（主任医师）', courseContent: '第 1 章: 腹腔镜手术基本原理（1 学时）；第 2 章: 腹腔镜手术器械介绍（1 学时）；第 3 章: 腹腔镜手术基本操作（2 学时）；第 4 章: 腹腔镜胆囊切除术手术演示（2 学时）', participants: '基层医院外科医生 20 人（杭州市某社区卫生服务中心 + 周边乡镇卫生院）', assessment: '考核方式：理论考试（50%）+ 手术操作评估（50%）；考核结果：18 人通过（通过率 90%），2 人需补考' },
    { id: 'TRTD-002', trainingName: '远程心电诊断培训（常见心律失常诊断）', lecturer: '上级医院心电科专家李***（主任医师）', courseContent: '第 1 章: 心电图基础理论（1 学时）；第 2 章: 常见心律失常心电图特点（2 学时）；第 3 章: 心律失常心电图病例分析（2 学时）；第 4 章: 远程心电诊断系统使用培训（1 学时）', participants: '基层医院内科医生 30 人（杭州市某社区卫生服务中心 + 周边乡镇卫生院）', assessment: '考核方式：理论考试（60%）+ 心电图判读考核（40%）；考核结果：28 人通过（通过率 93%），2 人需补考' },
    { id: 'TRTD-003', trainingName: '远程影像诊断培训（胸部 CT 影像诊断）', lecturer: '上级医院放射科专家刘***（主任医师）', courseContent: '第 1 章: 胸部 CT 影像基础理论（1 学时）；第 2 章: 常见胸部疾病 CT 影像特点（2 学时）；第 3 章: 胸部 CT 影像病例分析（2 学时）；第 4 章: 远程影像诊断系统使用培训（1 学时）', participants: '基层医院放射科医生 15 人（杭州市某社区卫生服务中心 + 周边乡镇卫生院）', assessment: '考核方式：理论考试（60%）+ 影像判读考核（40%）；考核结果：14 人通过（通过率 93%），1 人需补考' },
    { id: 'TRTD-004', trainingName: '远程超声诊断培训（腹部超声诊断）', lecturer: '上级医院超声科专家陈***（主任医师）', courseContent: '第 1 章: 腹部超声基础理论（1 学时）；第 2 章: 常见腹部疾病超声特点（2 学时）；第 3 章: 腹部超声病例分析（2 学时）；第 4 章: 远程超声诊断系统使用培训（1 学时）', participants: '基层医院超声科医生 10 人（杭州市某社区卫生服务中心 + 周边乡镇卫生院）', assessment: '考核方式：理论考试（60%）+ 超声判读考核（40%）；考核结果：10 人全部通过（通过率 100%）' },
    { id: 'TRTD-005', trainingName: '远程慢病管理培训（高血压 + 糖尿病管理）', lecturer: '上级医院心内科 + 内分泌科专家赵*** + 孙***（主任医师）', courseContent: '第 1 章: 高血压诊断与治疗指南解读（2 学时）；第 2 章: 糖尿病诊断与治疗指南解读（2 学时）；第 3 章: 远程慢病管理系统使用培训（1 学时）；第 4 章: 慢病管理病例讨论（1 学时）', participants: '基层医院全科医生 25 人（杭州市某社区卫生服务中心 + 周边乡镇卫生院）', assessment: '考核方式：理论考试（70%）+ 慢病管理方案制定考核（30%）；考核结果：23 人通过（通过率 92%），2 人需补考' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/telemed/remote-equipment-detail - 远程设备详情 5 条 */
async function handleTelemedRemoteEquipmentDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRED-001', equipmentName: '远程会诊终端（高清视频会议系统）', model: '华为 TE20（高清视频会议终端）', parameters: '分辨率：1080P（1920×1080）；帧率：30fps；网络：支持 5G / 宽带；音频：全向麦克风 + 扬声器；视频：高清摄像头（12 倍光学变焦）', status: '运行正常（安装在基层医院会议室，已使用 6 个月，设备状态良好）', maintenanceRecords: '2026-04-01: 首次安装调试（华为工程师上门）；2026-07-01: 季度例行维护（远程升级固件，检查设备状态）；2026-10-01: 季度例行维护（远程升级固件，检查设备状态）' },
    { id: 'TRED-002', equipmentName: '远程心电监护仪（便携式）', model: '飞利浦 HeartStart MRx（便携式心电监护仪）', parameters: '监测参数：心电（12 导联）、心率、血压（无创）、血氧饱和度、呼吸频率；数据传输：支持 5G / WiFi 远程传输；电池续航：8 小时（可更换电池）', status: '运行正常（安装在基层医院急诊科，已使用 3 个月，设备状态良好）', maintenanceRecords: '2026-07-01: 首次安装调试（飞利浦工程师上门）；2026-10-01: 季度例行维护（远程校准设备，检查电池状态）' },
    { id: 'TRED-003', equipmentName: '远程超声诊断系统（便携式）', model: 'GE Voluson e（便携式超声诊断系统）', parameters: '探头：凸阵探头（腹部）+ 线阵探头（浅表）；成像：B 模式 + 彩色多普勒；数据传输：支持 5G / WiFi 远程传输；电池续航：4 小时（可更换电池）', status: '运行正常（安装在基层医院超声科，已使用 4 个月，设备状态良好）', maintenanceRecords: '2026-06-01: 首次安装调试（GE 工程师上门）；2026-09-01: 季度例行维护（远程校准探头，检查设备状态）' },
    { id: 'TRED-004', equipmentName: '远程血压计（家用便携式）', model: '欧姆龙 HEM-7320（家用电子血压计）', parameters: '测量范围：血压 0-299 mmHg；精度：±3 mmHg；数据传输：支持蓝牙 + WiFi 远程传输；电池续航：6 个月（4 节 AA 电池）', status: '运行正常（发放给 100 位高血压患者居家使用，已使用 2 个月，设备状态良好）', maintenanceRecords: '2026-08-01: 发放给患者使用（社区医生上门指导使用方法）；2026-10-01: 远程检查数据传输情况（98 台设备数据传输正常，2 台需更换电池）' },
    { id: 'TRED-005', equipmentName: '远程血糖仪（家用便携式）', model: '罗氏 Accu-Chek Guide（家用血糖测试仪）', parameters: '测量范围：血糖 0.6-33.3 mmol/L；精度：±15%；数据传输：支持蓝牙 + WiFi 远程传输；电池续航：1000 次测量（1 节 CR2032 电池）', status: '运行正常（发放给 50 位糖尿病患者居家使用，已使用 2 个月，设备状态良好）', maintenanceRecords: '2026-08-01: 发放给患者使用（社区医生上门指导使用方法）；2026-10-01: 远程检查数据传输情况（49 台设备数据传输正常，1 台需更换电池）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m393Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/telemed/remote-consults-detail', handle: handleTelemedRemoteConsultsDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-diagnosis-detail', handle: handleTelemedRemoteDiagnosisDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-monitoring-detail', handle: handleTelemedRemoteMonitoringDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-surgery-detail', handle: handleTelemedRemoteSurgeryDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-training-detail', handle: handleTelemedRemoteTrainingDetail, auth: true },
  { method: 'GET', path: '/api/v1/telemed/remote-equipment-detail', handle: handleTelemedRemoteEquipmentDetail, auth: true },
];
