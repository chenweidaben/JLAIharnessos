/**
 * 健澜科技 jlmedaios - M403 P1 业务扩展：检验检查深度打磨（详情版）
 *
 * 检验项目详情/检验结果详情/检验报告详情/检查项目详情/检查结果详情/检查报告详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/lab/items-detail - 检验项目详情 5 条 */
async function handleLabItemsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LID-001', itemName: '血常规（五分类）', code: '检验编码：LAB-001（血常规，五分类）', referenceRange: '参考值：白细胞（WBC）4.0-10.0 × 10⁹/L；红细胞（RBC）男性 4.3-5.8 × 10¹²/L，女性 3.8-5.1 × 10¹²/L；血红蛋白（Hb）男性 130-175 g/L，女性 115-150 g/L；血小板（PLT）100-300 × 10⁹/L', method: '方法学：电阻抗法 + 激光散射法（五分类）', price: '价格：20 元/次' },
    { id: 'LID-002', itemName: '生化全套（肝肾功能 + 血糖血脂）', code: '检验编码：LAB-002（生化全套）', referenceRange: '参考值：谷丙转氨酶（ALT）7-40 U/L；谷草转氨酶（AST）13-35 U/L；总胆红素（TBIL）3.4-20.5 μmol/L；肌酐（Cr）男性 57-97 μmol/L，女性 41-73 μmol/L；尿素氮（BUN）2.6-7.5 mmol/L；空腹血糖（GLU）3.9-6.1 mmol/L；总胆固醇（TC）< 5.2 mmol/L；甘油三酯（TG）< 1.7 mmol/L', method: '方法学：酶法 + 比色法（全自动生化分析仪）', price: '价格：150 元/次' },
    { id: 'LID-003', itemName: '凝血功能（凝血四项）', code: '检验编码：LAB-003（凝血四项）', referenceRange: '参考值：凝血酶原时间（PT）11-13 秒；国际标准化比值（INR）0.8-1.2；活化部分凝血活酶时间（APTT）28-40 秒；纤维蛋白原（FIB）2.0-4.0 g/L', method: '方法学：凝固法（全自动凝血分析仪）', price: '价格：80 元/次' },
    { id: 'LID-004', itemName: '心肌酶谱（CK-MB + 肌钙蛋白）', code: '检验编码：LAB-004（心肌酶谱）', referenceRange: '参考值：肌酸激酶同工酶（CK-MB）0-25 U/L；肌钙蛋白 I（cTnI）< 0.04 ng/ml；肌红蛋白（Myo）< 70 ng/ml', method: '方法学：化学发光法（全自动免疫分析仪）', price: '价格：120 元/次' },
    { id: 'LID-005', itemName: '肿瘤标志物（CEA + AFP + CA19-9）', code: '检验编码：LAB-005（肿瘤标志物三项）', referenceRange: '参考值：癌胚抗原（CEA）< 5.0 ng/ml；甲胎蛋白（AFP）< 7.0 ng/ml；糖类抗原 19-9（CA19-9）< 27.0 U/ml', method: '方法学：化学发光法（全自动免疫分析仪）', price: '价格：150 元/次' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/lab/results-detail - 检验结果详情 5 条 */
async function handleLabResultsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LRD-001', patient: '患者张***（55 岁男性，血常规检验结果）', itemDetails: '项目明细：1. 白细胞（WBC）；2. 红细胞（RBC）；3. 血红蛋白（Hb）；4. 血小板（PLT）', resultValues: '结果值：1. 白细胞（WBC）：6.5 × 10⁹/L；2. 红细胞（RBC）：5.0 × 10¹²/L；3. 血红蛋白（Hb）：150 g/L；4. 血小板（PLT）：200 × 10⁹/L', referenceRanges: '参考范围：白细胞 4.0-10.0 × 10⁹/L；红细胞男性 4.3-5.8 × 10¹²/L；血红蛋白男性 130-175 g/L；血小板 100-300 × 10⁹/L', abnormalFlags: '异常标志：全部正常（无异常指标）' },
    { id: 'LRD-002', patient: '患者李***（45 岁女性，生化全套检验结果）', itemDetails: '项目明细：1. 谷丙转氨酶（ALT）；2. 谷草转氨酶（AST）；3. 肌酐（Cr）；4. 空腹血糖（GLU）；5. 总胆固醇（TC）；6. 甘油三酯（TG）', resultValues: '结果值：1. 谷丙转氨酶（ALT）：50 U/L（偏高）；2. 谷草转氨酶（AST）：40 U/L（正常）；3. 肌酐（Cr）：60 μmol/L（正常）；4. 空腹血糖（GLU）：8.5 mmol/L（偏高）；5. 总胆固醇（TC）：6.0 mmol/L（偏高）；6. 甘油三酯（TG）：2.5 mmol/L（偏高）', referenceRanges: '参考范围：ALT 7-40 U/L；AST 13-35 U/L；Cr 女性 41-73 μmol/L；GLU 3.9-6.1 mmol/L；TC < 5.2 mmol/L；TG < 1.7 mmol/L', abnormalFlags: '异常标志：1. ALT 50 U/L ↑（偏高，提示肝功能异常）；2. GLU 8.5 mmol/L ↑（偏高，提示糖尿病）；3. TC 6.0 mmol/L ↑（偏高，提示高脂血症）；4. TG 2.5 mmol/L ↑（偏高，提示高脂血症）' },
    { id: 'LRD-003', patient: '患者王***（60 岁男性，凝血功能检验结果）', itemDetails: '项目明细：1. 凝血酶原时间（PT）；2. 国际标准化比值（INR）；3. 活化部分凝血活酶时间（APTT）；4. 纤维蛋白原（FIB）', resultValues: '结果值：1. 凝血酶原时间（PT）：12.0 秒（正常）；2. 国际标准化比值（INR）：1.0（正常）；3. 活化部分凝血活酶时间（APTT）：35 秒（正常）；4. 纤维蛋白原（FIB）：3.0 g/L（正常）', referenceRanges: '参考范围：PT 11-13 秒；INR 0.8-1.2；APTT 28-40 秒；FIB 2.0-4.0 g/L', abnormalFlags: '异常标志：全部正常（无异常指标）' },
    { id: 'LRD-004', patient: '患者刘***（55 岁男性，心肌酶谱检验结果）', itemDetails: '项目明细：1. 肌酸激酶同工酶（CK-MB）；2. 肌钙蛋白 I（cTnI）；3. 肌红蛋白（Myo）', resultValues: '结果值：1. 肌酸激酶同工酶（CK-MB）：30 U/L（偏高）；2. 肌钙蛋白 I（cTnI）：0.5 ng/ml（偏高）；3. 肌红蛋白（Myo）：100 ng/ml（偏高）', referenceRanges: '参考范围：CK-MB 0-25 U/L；cTnI < 0.04 ng/ml；Myo < 70 ng/ml', abnormalFlags: '异常标志：1. CK-MB 30 U/L ↑（偏高，提示心肌损伤）；2. cTnI 0.5 ng/ml ↑（偏高，提示心肌梗死）；3. Myo 100 ng/ml ↑（偏高，提示心肌损伤）' },
    { id: 'LRD-005', patient: '患者陈***（65 岁男性，肿瘤标志物检验结果）', itemDetails: '项目明细：1. 癌胚抗原（CEA）；2. 甲胎蛋白（AFP）；3. 糖类抗原 19-9（CA19-9）', resultValues: '结果值：1. 癌胚抗原（CEA）：5.0 ng/ml（临界）；2. 甲胎蛋白（AFP）：5.0 ng/ml（正常）；3. 糖类抗原 19-9（CA19-9）：20.0 U/ml（正常）', referenceRanges: '参考范围：CEA < 5.0 ng/ml；AFP < 7.0 ng/ml；CA19-9 < 27.0 U/ml', abnormalFlags: '异常标志：1. CEA 5.0 ng/ml（临界，建议定期复查）；2. AFP 5.0 ng/ml（正常）；3. CA19-9 20.0 U/ml（正常）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/lab/reports-detail - 检验报告详情 5 条 */
async function handleLabReportsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'LRepD-001', reportNo: 'LAB-RPT-2026-001（患者张***，血常规检验报告）', patient: '患者张***（55 岁男性）', itemSummary: '检验项目汇总：血常规（五分类）：白细胞 6.5 × 10⁹/L（正常），红细胞 5.0 × 10¹²/L（正常），血红蛋白 150 g/L（正常），血小板 200 × 10⁹/L（正常）；全部指标正常', doctorOpinion: '医生意见：血常规正常，无贫血、感染、血小板异常；建议：定期体检（每年 1 次）', time: '报告时间：2026-10-20 09:30:00' },
    { id: 'LRepD-002', reportNo: 'LAB-RPT-2026-002（患者李***，生化全套检验报告）', patient: '患者李***（45 岁女性）', itemSummary: '检验项目汇总：生化全套：ALT 50 U/L ↑（偏高），AST 40 U/L（正常），Cr 60 μmol/L（正常），GLU 8.5 mmol/L ↑（偏高），TC 6.0 mmol/L ↑（偏高），TG 2.5 mmol/L ↑（偏高）', doctorOpinion: '医生意见：1. 肝功能异常（ALT 偏高），建议复查肝功能 + 肝炎病毒标志物；2. 血糖偏高，提示糖尿病，建议复查空腹血糖 + 糖化血红蛋白；3. 血脂偏高，提示高脂血症，建议控制饮食 + 运动锻炼', time: '报告时间：2026-10-20 10:00:00' },
    { id: 'LRepD-003', reportNo: 'LAB-RPT-2026-003（患者王***，凝血功能检验报告）', patient: '患者王***（60 岁男性）', itemSummary: '检验项目汇总：凝血功能：PT 12.0 秒（正常），INR 1.0（正常），APTT 35 秒（正常），FIB 3.0 g/L（正常）；全部指标正常', doctorOpinion: '医生意见：凝血功能正常，无出血倾向、血栓风险；建议：术前常规检查，无需特殊处理', time: '报告时间：2026-10-20 10:30:00' },
    { id: 'LRepD-004', reportNo: 'LAB-RPT-2026-004（患者刘***，心肌酶谱检验报告）', patient: '患者刘***（55 岁男性）', itemSummary: '检验项目汇总：心肌酶谱：CK-MB 30 U/L ↑（偏高），cTnI 0.5 ng/ml ↑（偏高），Myo 100 ng/ml ↑（偏高）', doctorOpinion: '医生意见：心肌酶谱异常（CK-MB、cTnI、Myo 均偏高），提示急性心肌梗死；建议：立即行心电图检查 + 冠状动脉造影，明确诊断后立即治疗', time: '报告时间：2026-10-20 11:00:00（急诊报告，30 分钟内出结果）' },
    { id: 'LRepD-005', reportNo: 'LAB-RPT-2026-005（患者陈***，肿瘤标志物检验报告）', patient: '患者陈***（65 岁男性）', itemSummary: '检验项目汇总：肿瘤标志物：CEA 5.0 ng/ml（临界），AFP 5.0 ng/ml（正常），CA19-9 20.0 U/ml（正常）', doctorOpinion: '医生意见：肿瘤标志物基本正常（CEA 临界），建议定期复查（每 3 个月 1 次）；如 CEA 持续升高，需进一步检查（胸部 CT、腹部 CT、胃肠镜等）', time: '报告时间：2026-10-20 11:30:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/items-detail - 检查项目详情 5 条 */
async function handleRadiologyItemsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RID-001', itemName: '胸部 CT 平扫', code: '检查编码：RAD-001（胸部 CT 平扫）', bodyPart: '检查部位：胸部（肺、纵隔、胸膜）', method: '检查方法：多层螺旋 CT（16 排），平扫（不打造影剂），层厚 5 mm', price: '价格：300 元/次' },
    { id: 'RID-002', itemName: '胸部 CT 增强扫描', code: '检查编码：RAD-002（胸部 CT 增强扫描）', bodyPart: '检查部位：胸部（肺、纵隔、胸膜、血管）', method: '检查方法：多层螺旋 CT（16 排），增强扫描（静脉注射碘造影剂 100 ml），动脉期 + 静脉期 + 延迟期', price: '价格：800 元/次' },
    { id: 'RID-003', itemName: '头颅 MRI 平扫', code: '检查编码：RAD-003（头颅 MRI 平扫）', bodyPart: '检查部位：头颅（脑实质、脑室、脑沟）', method: '检查方法：超导磁共振（1.5T），平扫（不打造影剂），T1WI + T2WI + FLAIR + DWI 序列', price: '价格：800 元/次' },
    { id: 'RID-004', itemName: '腹部超声', code: '检查编码：RAD-004（腹部超声）', bodyPart: '检查部位：腹部（肝、胆、胰、脾、肾）', method: '检查方法：彩色多普勒超声（凸阵探头 3.5MHz），空腹检查（禁食 8 小时）', price: '价格：100 元/次' },
    { id: 'RID-005', itemName: '心电图（12 导联）', code: '检查编码：RAD-005（心电图 12 导联）', bodyPart: '检查部位：心脏（12 导联：I、II、III、aVR、aVL、aVF、V1-V6）', method: '检查方法：静息心电图（平卧休息 5 分钟后检查），标准 12 导联', price: '价格：30 元/次' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/results-detail - 检查结果详情 5 条 */
async function handleRadiologyResultsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RResD-001', patient: '患者张***（55 岁男性，胸部 CT 平扫结果）', bodyPart: '检查部位：胸部', imagingFindings: '影像所见：1. 双肺纹理清晰，右肺上叶见一结节（直径约 8mm，磨玻璃样，边界清）；2. 纵隔内未见肿大淋巴结；3. 胸膜无增厚，胸腔无积液；4. 心脏大小形态正常', diagnosisOpinion: '诊断意见：右肺上叶磨玻璃结节（8mm），考虑良性可能性大（炎性结节？）；建议：3 个月后复查胸部 CT，观察结节变化', doctor: '影像科医生王***（主治医师）' },
    { id: 'RResD-002', patient: '患者李***（45 岁女性，腹部超声结果）', bodyPart: '检查部位：腹部', imagingFindings: '影像所见：1. 肝脏大小形态正常，实质回声均匀，未见占位；2. 胆囊大小正常，壁不厚，胆囊内见一强回声光团（直径约 15mm，伴声影）；3. 胰腺大小形态正常，实质回声均匀；4. 脾脏大小正常；5. 双肾大小正常，未见结石、积水', diagnosisOpinion: '诊断意见：胆囊结石（15mm），胆囊炎（壁不厚，考虑慢性胆囊炎静止期）；建议：如无症状，定期复查（每 6 个月 1 次）；如反复胆绞痛，建议手术治疗（腹腔镜胆囊切除术）', doctor: '超声科医生刘***（主治医师）' },
    { id: 'RResD-003', patient: '患者王***（60 岁男性，头颅 MRI 平扫结果）', bodyPart: '检查部位：头颅', imagingFindings: '影像所见：1. 脑实质：双侧基底节区、侧脑室旁见多发腔隙性梗死灶（长 T1、长 T2 信号，FLAIR 高信号）；2. 脑室系统大小正常，脑沟、脑裂增宽（轻度脑萎缩）；3. 中线结构居中', diagnosisOpinion: '诊断意见：1. 多发腔隙性脑梗死（双侧基底节区、侧脑室旁）；2. 轻度脑萎缩；建议：控制血压、血糖、血脂（脑血管病二级预防），定期复查（每 6 个月 1 次）', doctor: '影像科医生陈***（副主任医师）' },
    { id: 'RResD-004', patient: '患者刘***（55 岁男性，心电图结果）', bodyPart: '检查部位：心脏（12 导联）', imagingFindings: '影像所见：1. 窦性心律，心率 75 次/分；2. PR 间期 0.16 秒（正常）；3. QRS 时限 0.08 秒（正常）；4. ST-T 改变：V1-V4 导联 ST 段抬高 0.2-0.4 mV，T 波倒置', diagnosisOpinion: '诊断意见：急性前壁心肌梗死（V1-V4 导联 ST 段抬高）；建议：立即行心肌酶谱检查 + 冠状动脉造影，明确诊断后立即治疗（溶栓或介入治疗）', doctor: '心电图室医生赵***（主治医师）' },
    { id: 'RResD-005', patient: '患者陈***（65 岁男性，胸部 CT 增强扫描结果）', bodyPart: '检查部位：胸部', imagingFindings: '影像所见：1. 右肺上叶见一占位（大小约 3.5cm × 3.0cm，分叶状，边缘毛刺）；2. 增强扫描：占位呈不均匀强化（动脉期 CT 值 60 HU，静脉期 CT 值 40 HU）；3. 纵隔内见肿大淋巴结（1.5cm）；4. 胸膜无增厚，胸腔无积液', diagnosisOpinion: '诊断意见：右肺上叶占位（3.5cm），考虑肺癌（周围型肺癌）；纵隔淋巴结肿大（转移可能）；建议：行肺穿刺活检明确病理诊断，制定治疗方案', doctor: '影像科医生孙***（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/radiology/reports-detail - 检查报告详情 5 条 */
async function handleRadiologyReportsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RRepD-001', reportNo: 'RAD-RPT-2026-001（患者张***，胸部 CT 平扫报告）', patient: '患者张***（55 岁男性）', examinationSummary: '检查摘要：胸部 CT 平扫：右肺上叶磨玻璃结节（8mm），纵隔淋巴结无肿大，胸腔无积液', diagnosisConclusion: '诊断结论：右肺上叶磨玻璃结节（8mm），考虑良性可能性大；建议：3 个月后复查胸部 CT', doctor: '影像科医生王***（主治医师）' },
    { id: 'RRepD-002', reportNo: 'RAD-RPT-2026-002（患者李***，腹部超声报告）', patient: '患者李***（45 岁女性）', examinationSummary: '检查摘要：腹部超声：胆囊结石（15mm），肝脏、胰腺、脾脏、双肾正常', diagnosisConclusion: '诊断结论：胆囊结石（15mm），慢性胆囊炎静止期；建议：定期复查或手术治疗', doctor: '超声科医生刘***（主治医师）' },
    { id: 'RRepD-003', reportNo: 'RAD-RPT-2026-003（患者王***，头颅 MRI 平扫报告）', patient: '患者王***（60 岁男性）', examinationSummary: '检查摘要：头颅 MRI 平扫：多发腔隙性脑梗死（双侧基底节区、侧脑室旁），轻度脑萎缩', diagnosisConclusion: '诊断结论：1. 多发腔隙性脑梗死；2. 轻度脑萎缩；建议：脑血管病二级预防，定期复查', doctor: '影像科医生陈***（副主任医师）' },
    { id: 'RRepD-004', reportNo: 'RAD-RPT-2026-004（患者刘***，心电图报告）', patient: '患者刘***（55 岁男性）', examinationSummary: '检查摘要：心电图 12 导联：窦性心律，V1-V4 导联 ST 段抬高 0.2-0.4 mV，T 波倒置', diagnosisConclusion: '诊断结论：急性前壁心肌梗死；建议：立即心肌酶谱 + 冠状动脉造影，紧急治疗', doctor: '心电图室医生赵***（主治医师）' },
    { id: 'RRepD-005', reportNo: 'RAD-RPT-2026-005（患者陈***，胸部 CT 增强扫描报告）', patient: '患者陈***（65 岁男性）', examinationSummary: '检查摘要：胸部 CT 增强扫描：右肺上叶占位（3.5cm），不均匀强化，纵隔淋巴结肿大（1.5cm）', diagnosisConclusion: '诊断结论：右肺上叶占位（3.5cm），考虑肺癌；纵隔淋巴结肿大（转移可能）；建议：肺穿刺活检明确病理', doctor: '影像科医生孙***（主任医师）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m403Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/lab/items-detail', handle: handleLabItemsDetail, auth: true },
  { method: 'GET', path: '/api/v1/lab/results-detail', handle: handleLabResultsDetail, auth: true },
  { method: 'GET', path: '/api/v1/lab/reports-detail', handle: handleLabReportsDetail, auth: true },
  { method: 'GET', path: '/api/v1/radiology/items-detail', handle: handleRadiologyItemsDetail, auth: true },
  { method: 'GET', path: '/api/v1/radiology/results-detail', handle: handleRadiologyResultsDetail, auth: true },
  { method: 'GET', path: '/api/v1/radiology/reports-detail', handle: handleRadiologyReportsDetail, auth: true },
];
