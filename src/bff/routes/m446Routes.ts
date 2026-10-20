/**
 * 健澜科技 jlmedaios - M446 超声/心电/内镜/病理/医技预约深度
 *
 * 超声检查 / 心电诊断 / 内镜报告 / 病理诊断 / 医技预约
 * （pathology/specimens 病理送检已存在，此处不重复）。
 * 聚焦医技检查，不重复 PACS 影像、LIS 检验口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/ultrasound/exams - 超声检查（检查号/部位/超声所见/诊断/报告医生）5 条 */
async function handleUsExams(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'USE-001', examNo: '检查号：US-20261020-01（腹部超声）', site: '部位：肝胆胰脾双肾（腹部常规）', findings: '超声所见：肝实质回声均匀，胆囊壁稍毛糙，未见结石影，脾胰双肾未见明显占位', diagnosis: '诊断：慢性胆囊炎（轻度），余腹部脏器未见明显异常', reporter: '报告医生：超声科 周*** 主治医师' },
    { id: 'USE-002', examNo: '检查号：US-20261020-02（产科 NT/胎儿超声）', site: '部位：中晚孕胎儿系统超声（大排畸）', findings: '超声所见：胎儿生长参数符合孕周，胎心胎动可见，羊水清，脐带血流正常', diagnosis: '诊断：宫内单活胎，胎儿目前未见明显结构畸形（建议系统随访）', reporter: '报告医生：超声科 王*** 副主任医师' },
    { id: 'USE-003', examNo: '检查号：US-20261019-03（甲状腺超声）', site: '部位：甲状腺 + 颈部淋巴结', findings: '超声所见：甲状腺右叶低回声结节（TI-RADS 4a 类，约 8mm），边界欠清', diagnosis: '诊断：甲状腺右叶结节（建议穿刺活检明确性质），余甲状腺未见异常', reporter: '报告医生：超声科 周*** 主治医师' },
    { id: 'USE-004', examNo: '检查号：US-20261019-04（血管超声）', site: '部位：双下肢动静脉（深静脉通畅度）', findings: '超声所见：下肢动脉内膜轻度增厚，管腔通畅；深静脉回流通畅，未见血栓', diagnosis: '诊断：下肢动脉轻度粥样硬化，深静脉未见血栓', reporter: '报告医生：超声科 李*** 主治医师' },
    { id: 'USE-005', examNo: '检查号：US-20261018-05（泌尿系超声）', site: '部位：双肾、输尿管、膀胱（泌尿系）', findings: '超声所见：右肾集合系统轻度分离，膀胱充盈可，壁光滑，未见占位', diagnosis: '诊断：右肾轻度积水（建议排查梗阻原因），余未见异常', reporter: '报告医生：超声科 王*** 副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/cardiology/ecg - 心电诊断（患者/心律/异常诊断/心电图医生/时间）5 条 */
async function handleEcgDiagnosis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ECG-001', patient: '患者：张***（男，65 岁，冠心病）', rhythm: '心律：窦性心律，心率 68 次/分', abnormal: '异常诊断：窦性心律，偶发房性早搏，ST-T 段轻度改变（建议结合临床）', doctor: '心电图医生：功能科 钱*** 主治医师', time: '时间：2026-10-20 09:12:30' },
    { id: 'ECG-002', patient: '患者：李***（女，58 岁，糖尿病）', rhythm: '心律：窦性心律，心率 76 次/分，心律齐', abnormal: '异常诊断：窦性心律，大致正常心电图（未见明显缺血改变）', doctor: '心电图医生：钱*** 主治医师', time: '时间：2026-10-20 10:05:18' },
    { id: 'ECG-003', patient: '患者：王***（男，72 岁，骨科术后）', rhythm: '心律：心房颤动，心室率 88 次/分（快室率倾向）', abnormal: '异常诊断：心房颤动（快心室率），建议心内科评估抗凝与节律控制', doctor: '心电图医生：孙*** 副主任医师', time: '时间：2026-10-19 15:40:52' },
    { id: 'ECG-004', patient: '患者：陈***（男，45 岁，普外科）', rhythm: '心律：窦性心动过缓，心率 52 次/分，不齐', abnormal: '异常诊断：窦性心动过缓伴不齐（多为生理性，建议动态心电图排查）', doctor: '心电图医生：钱*** 主治医师', time: '时间：2026-10-19 11:22:40' },
    { id: 'ECG-005', patient: '患者：赵***（女，32 岁，产科产后）', rhythm: '心律：窦性心律，心率 82 次/分', abnormal: '异常诊断：窦性心律，正常范围心电图（未见病理改变）', doctor: '心电图医生：孙*** 副主任医师', time: '时间：2026-10-18 16:30:05' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/endoscopy/reports - 内镜报告（检查号/镜种/所见/诊断/活检标记）5 条 */
async function handleEndoReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ENR-001', examNo: '检查号：ENDO-20261020-01（胃镜）', scope: '镜种：电子胃镜（上消化道内镜）', findings: '所见：食管黏膜光滑，胃窦黏膜散在糜烂，幽门开闭正常，十二指肠球部未见溃疡', diagnosis: '诊断：慢性非萎缩性胃炎伴胃窦糜烂（Hp 待检）', biopsy: '活检标记：胃窦糜烂处取活检 2 块（送病理）' },
    { id: 'ENR-002', examNo: '检查号：ENDO-20261020-02（结肠镜）', scope: '镜种：电子结肠镜（下消化道内镜）', findings: '所见：结肠各段黏膜光滑，血管纹理清晰，直肠未见异常，未见息肉及占位', diagnosis: '诊断：结直肠未见明显器质性病变（结肠镜阴性）', biopsy: '活检标记：无活检（阴性检查）' },
    { id: 'ENR-003', examNo: '检查号：ENDO-20261019-03（胃镜复查）', scope: '镜种：电子胃镜', findings: '所见：食管下段可见条索状糜烂（反流性食管炎 LA-B 级），贲门松弛', diagnosis: '诊断：反流性食管炎（LA-B）、反流性胃炎，建议规范抑酸治疗', biopsy: '活检标记：糜烂处活检 2 块（送病理）' },
    { id: 'ENR-004', examNo: '检查号：ENDO-20261019-04（十二指肠镜/ERCP 备）', scope: '镜种：十二指肠镜（胆道评估）', findings: '所见：乳头形态正常，胆管显影，未见充盈缺损，胰管显影良好', diagnosis: '诊断：胆总管未见结石占位（ERCP 评估阴性）', biopsy: '活检标记：无活检（治疗性检查评估）' },
    { id: 'ENR-005', examNo: '检查号：ENDO-20261018-05（无痛胃肠镜联合）', scope: '镜种：无痛胃镜 + 无痛结肠镜联合检查', findings: '所见：胃体小弯侧息肉一枚（约 6mm），结肠乙状结肠黏膜正常', diagnosis: '诊断：胃体息肉（建议内镜下切除送检），余阴性', biopsy: '活检标记：息肉标记已定位，拟 EMR 切除（活检 1 块）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/pathology/diagnoses - 病理诊断（标本号/HE诊断/免疫组化/病理医生/签发）5 条 */
async function handlePathDiagnoses(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAD-001', specimenNo: '标本号：SP-20261019-01（胃镜活检）', heDx: 'HE 诊断：（胃窦）慢性萎缩性胃炎伴肠上皮化生（轻中度），局部腺体增生', ihc: '免疫组化：P53(弱+)、Ki-67(15%+)，未见明确异型增生', pathologist: '病理医生：病理科 郑*** 主治医师', issue: '签发：已签发报告（2026-10-20，双人复核）' },
    { id: 'PAD-002', specimenNo: '标本号：SP-20261018-02（甲状腺结节穿刺）', heDx: 'HE 诊断：（甲状腺右叶结节穿刺）涂片见淋巴细胞背景，少量滤泡上皮，建议随访', ihc: '免疫组化：（必要时）Tg 染色（本次未做）', pathologist: '病理医生：郑*** 主治医师', issue: '签发：已签发（建议结合超声 TI-RADS 随访）' },
    { id: 'PAD-003', specimenNo: '标本号：SP-20261017-03（乳腺切除标本）', heDx: 'HE 诊断：（乳腺）浸润性导管癌，组织学Ⅱ级，脉管未见癌栓', ihc: '免疫组化：ER(+)85%、PR(+)70%、HER2(1+)、Ki-67(25%+)（分子分型：Luminal A 型倾向）', pathologist: '病理医生：陈*** 副主任医师（科主任复核）', issue: '签发：已签发（供临床制定内分泌/靶向方案）' },
    { id: 'PAD-004', specimenNo: '标本号：SP-20261019-04（结肠息肉切除）', heDx: 'HE 诊断：（乙状结肠）增生性息肉，腺体无异型增生，切缘阴性', ihc: '免疫组化：无（良性息肉，未加做）', pathologist: '病理医生：郑*** 主治医师', issue: '签发：已签发（良性，定期肠镜随访）' },
    { id: 'PAD-005', specimenNo: '标本号：SP-20261020-05（皮肤肿物切除）', heDx: 'HE 诊断：（背部皮肤）皮内痣，真皮层痣细胞巢，未见恶变', ihc: '免疫组化：无（良性，未加做）', pathologist: '病理医生：陈*** 副主任医师', issue: '签发：待签发（HE 切片已阅，待免疫组化补报）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tech/appointments - 医技预约（项目/患者/设备/时段/检查科室/状态）5 条 */
async function handleTechAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TAP-001', project: '项目：腹部彩色多普勒超声', patient: '患者：张***（男，65 岁，心内科）', device: '设备：彩超机 GE LOGIQ E10（超声 1 号机）', slot: '时段：2026-10-21 08:30-08:50', dept: '检查科室：超声科（1 号检查室）', status: '状态：已预约（待检查，已短信通知）' },
    { id: 'TAP-002', project: '项目：24 小时动态心电图（Holter）', patient: '患者：王***（男，72 岁，房颤评估）', device: '设备：动态心电记录仪（HOLTER-03）', slot: '时段：2026-10-21 09:00 佩戴，24h 后回传', dept: '检查科室：功能科（心电诊断室）', status: '状态：已预约（待佩戴）' },
    { id: 'TAP-003', project: '项目：无痛结肠镜（息肉切除 EMR）', patient: '患者：陈***（男，45 岁，胃体息肉）', device: '设备：奥林巴斯 CV-290 结肠镜（内镜 2 号）', slot: '时段：2026-10-22 10:00-10:40（需肠道准备）', dept: '检查科室：消化内镜中心（治疗室 2）', status: '状态：已预约（术前签字/禁食已告知）' },
    { id: 'TAP-004', project: '项目：胸部 CT 平扫（随访复查）', patient: '患者：李***（女，58 岁，糖尿病合并肺结节）', device: '设备：西门子 64 排 CT（CT-1 号）', slot: '时段：2026-10-21 14:20-14:30', dept: '检查科室：放射科（CT 室）', status: '状态：待确认（预约待排，等科室号源）' },
    { id: 'TAP-005', project: '项目：甲状腺细针穿刺（FNAC）', patient: '患者：刘***（女，40 岁，TI-RADS 4a 结节）', device: '设备：超声引导穿刺套件（超声 + 细针）', slot: '时段：2026-10-22 09:30-09:50（局麻）', dept: '检查科室：超声科（介入穿刺室）', status: '状态：已预约（凝血/传染病筛查已完成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m446Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/ultrasound/exams', handle: handleUsExams, auth: true },
  { method: 'GET', path: '/api/v1/cardiology/ecg', handle: handleEcgDiagnosis, auth: true },
  { method: 'GET', path: '/api/v1/endoscopy/reports', handle: handleEndoReports, auth: true },
  { method: 'GET', path: '/api/v1/pathology/diagnoses', handle: handlePathDiagnoses, auth: true },
  { method: 'GET', path: '/api/v1/tech/appointments', handle: handleTechAppointments, auth: true },
];
