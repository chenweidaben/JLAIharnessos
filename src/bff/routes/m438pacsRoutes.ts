/**
 * 健澜科技 jlmedaios - 影像 PACS 深度（radiology）
 *
 * 检查登记/影像序列/阳性率统计/危急发现/影像质控
 * （reports-detail 影像报告已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/radiology/registrations - 检查登记（检查号/患者/部位/设备/预约时间）5 条 */
async function handleRadRegistrations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RRG-001', examNo: '检查号：EXAM-20261020-011（胸部 CT 平扫）', patient: '患者：张***（男，65 岁，心内科）', site: '部位：胸部（肺窗+纵隔窗）', device: '设备：64 排螺旋 CT（GE Revolution）', apptTime: '预约时间：2026-10-20 14:00（已签到候检）' },
    { id: 'RRG-002', examNo: '检查号：EXAM-20261020-012（头颅 MRI）', patient: '患者：李***（女，58 岁，神经内科）', site: '部位：头颅（T1/T2/DWI 序列）', device: '设备：1.5T MRI（Siemens Avanto）', apptTime: '预约时间：2026-10-20 15:30' },
    { id: 'RRG-003', examNo: '检查号：EXAM-20261020-013（下肢 DR 正侧位）', patient: '患者：王***（男，72 岁，骨科术后）', site: '部位：左膝关节（正位+侧位）', device: '设备：DR 数字 X 线机（Canon）', apptTime: '预约时间：2026-10-20 11:20（已完成检查）' },
    { id: 'RRG-004', examNo: '检查号：EXAM-20261020-014（腹部超声）', patient: '患者：陈***（男，45 岁，普外科）', site: '部位：肝胆胰脾（腹部彩超）', device: '设备：彩色多普勒超声（Philips）', apptTime: '预约时间：2026-10-20 16:10' },
    { id: 'RRG-005', examNo: '检查号：EXAM-20261020-015（乳腺钼靶）', patient: '患者：赵***（女，48 岁，体检）', site: '部位：双侧乳腺（MLO+CC 位）', device: '设备：乳腺钼靶机（Hologic）', apptTime: '预约时间：2026-10-21 09:00（待检）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/series-detail - 影像序列（检查号/序列名/层厚/模态/状态）5 条 */
async function handleRadSeries(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RRS-001', examNo: '检查号：EXAM-20261020-011（胸部 CT）', seriesName: '序列名：Axial Lung 薄层（肺窗轴位）', sliceThick: '层厚：1.25mm（薄层重建）', modality: '模态：CT（64 排）', status: '状态：已传输 PACS，可调阅' },
    { id: 'RRS-002', examNo: '检查号：EXAM-20261020-011（胸部 CT）', seriesName: '序列名：Axial Mediastinum（纵隔窗轴位）', sliceThick: '层厚：5.0mm', modality: '模态：CT（64 排）', status: '状态：已传输 PACS' },
    { id: 'RRS-003', examNo: '检查号：EXAM-20261020-012（头颅 MRI）', seriesName: '序列名：DWI 弥散加权（b=1000）', sliceThick: '层厚：5.0mm', modality: '模态：MRI（1.5T）', status: '状态：已传输 PACS' },
    { id: 'RRS-004', examNo: '检查号：EXAM-20261020-012（头颅 MRI）', seriesName: '序列名：T2-FLAIR 液体衰减反转恢复', sliceThick: '层厚：5.0mm', modality: '模态：MRI（1.5T）', status: '状态：已传输 PACS' },
    { id: 'RRS-005', examNo: '检查号：EXAM-20261020-013（膝关节 DR）', seriesName: '序列名：Knee AP + Lateral（正侧位）', sliceThick: '层厚：DR 平片（无层厚概念）', modality: '模态：DR（数字 X 线）', status: '状态：已传输 PACS' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/positive-rate - 阳性率统计（部位/检查数/阳性数/阳性率/月份）5 条 */
async function handleRadPositiveRate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RPR-001', site: '部位：胸部 CT（肺结节筛查）', examCount: '检查数：486 例', positiveCount: '阳性数：162 例（结节/炎症/占位）', rate: '阳性率：33.3%', month: '月份：2026-09' },
    { id: 'RPR-002', site: '部位：头颅 MRI（卒中/占位）', examCount: '检查数：214 例', positiveCount: '阳性数：98 例（梗死/占位/出血）', rate: '阳性率：45.8%', month: '月份：2026-09' },
    { id: 'RPR-003', site: '部位：膝关节 DR（骨关节）', examCount: '检查数：352 例', positiveCount: '阳性数：141 例（退变/骨折/积液）', rate: '阳性率：40.1%', month: '月份：2026-09' },
    { id: 'RPR-004', site: '部位：腹部超声（肝胆胰脾）', examCount: '检查数：528 例', positiveCount: '阳性数：206 例（结石/囊肿/脂肪肝）', rate: '阳性率：39.0%', month: '月份：2026-09' },
    { id: 'RPR-005', site: '部位：乳腺钼靶（筛查）', examCount: '检查数：186 例', positiveCount: '阳性数：29 例（结节/钙化/BI-RADS≥4）', rate: '阳性率：15.6%', month: '月份：2026-09' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/critical-findings - 危急发现（检查号/发现/程度/报告时间/通知状态）5 条 */
async function handleRadCriticalFindings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RCF-001', examNo: '检查号：EXAM-20261020-011（胸部 CT）', finding: '发现：右肺上叶占位伴纵隔淋巴结肿大，高度怀疑恶性', severity: '程度：危急（需紧急临床干预）', reportTime: '报告时间：2026-10-20 14:48:20', notify: '通知状态：已电话通知开单医生+临床科主任，记录留痕' },
    { id: 'RCF-002', examNo: '检查号：EXAM-20261020-012（头颅 MRI）', finding: '发现：左侧大脑中动脉供血区急性弥散受限（急性脑梗死）', severity: '程度：危急（时间窗内，需溶栓评估）', reportTime: '报告时间：2026-10-20 16:05:12', notify: '通知状态：已立即通知神经内科卒中团队，启动绿通' },
    { id: 'RCF-003', examNo: '检查号：EXAM-20261019-088（胸部 CT）', finding: '发现：大量胸腔积液伴肺压缩（气胸待排）', severity: '程度：危急', reportTime: '报告时间：2026-10-19 22:30:44', notify: '通知状态：已通知急诊值班医生，已留观处理' },
    { id: 'RCF-004', examNo: '检查号：EXAM-20261020-013（膝关节 DR）', finding: '发现：胫骨平台骨折伴移位（术后复查新发）', severity: '程度：紧急（非生命危急，需骨科处置）', reportTime: '报告时间：2026-10-20 11:35:08', notify: '通知状态：已通知骨科值班医生，已记录' },
    { id: 'RCF-005', examNo: '检查号：EXAM-20261018-066（头颅 CT）', finding: '发现：硬膜下血肿（慢性，中线轻度移位）', severity: '程度：紧急（需神经外科评估）', reportTime: '报告时间：2026-10-18 10:12:30', notify: '通知状态：已通知神经外科，已转科观察' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/quality-control - 影像质控（质控项/甲片率/废片率/技师/月份）5 条 */
async function handleRadQualityControl(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RQC-001', qcItem: '质控项：DR 甲级片率（影像质量评级）', gradeARate: '甲片率：96.8%（甲级片占比）', rejectRate: '废片率：0.6%（重拍/废弃占比）', tech: '技师：钱***（放射科技师）', month: '月份：2026-09' },
    { id: 'RQC-002', qcItem: '质控项：CT 扫描规范（层厚/定位/伪影）', gradeARate: '甲片率：97.5%', rejectRate: '废片率：0.4%', tech: '技师：孙***（放射科技师）', month: '月份：2026-09' },
    { id: 'RQC-003', qcItem: '质控项：MRI 图像质量（伪影/运动/序列完整）', gradeARate: '甲片率：95.2%', rejectRate: '废片率：1.1%（运动伪影重扫）', tech: '技师：李***（MRI 技师）', month: '月份：2026-09' },
    { id: 'RQC-004', qcItem: '质控项：超声图像留图（切面/测量规范）', gradeARate: '甲片率：94.6%', rejectRate: '废片率：0.8%', tech: '技师/医师：周***（超声科）', month: '月份：2026-09' },
    { id: 'RQC-005', qcItem: '质控项：钼靶体位规范（压迫/体位对称）', gradeARate: '甲片率：93.9%', rejectRate: '废片率：1.5%（体位不当重拍）', tech: '技师：吴***（钼靶技师）', month: '月份：2026-09' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m438pacsRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/radiology/registrations', handle: handleRadRegistrations, auth: true },
  { method: 'GET', path: '/api/v1/radiology/series-detail', handle: handleRadSeries, auth: true },
  { method: 'GET', path: '/api/v1/radiology/positive-rate', handle: handleRadPositiveRate, auth: true },
  { method: 'GET', path: '/api/v1/radiology/critical-findings', handle: handleRadCriticalFindings, auth: true },
  { method: 'GET', path: '/api/v1/radiology/quality-control', handle: handleRadQualityControl, auth: true },
];
