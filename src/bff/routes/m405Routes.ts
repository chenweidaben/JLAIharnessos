/**
 * 健澜科技 jlmedaios - M405 P1 业务扩展：患者360深度打磨（详情版）
 *
 * 患者档案详情/就诊记录详情/过敏史详情/用药史详情/检验汇总详情/影像汇总详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/patient/profile-detail - 患者档案详情 5 条 */
async function handlePatientProfileDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPD-001', patient: '患者张***（ID: P-2020-001）', basicInfo: '基本信息：姓名：张***；性别：男；年龄：55 岁；出生日期：1971-03-15；民族：汉族；婚姻状况：已婚；职业：公务员', contactInfo: '联系方式：手机：138****1234；邮箱：zhang***@163.com；住址：杭州市西湖区文三路 *** 号', insuranceInfo: '医保信息：医保类型：职工医保；医保卡号：3301**********1234；参保地：杭州市', familyHistory: '家庭史：1. 父亲：已故（冠心病）；2. 母亲：健在（高血压）；3. 哥哥：健在（糖尿病）；4. 子女：1 子（健在，健康）' },
    { id: 'PPD-002', patient: '患者李***（ID: P-2020-002）', basicInfo: '基本信息：姓名：李***；性别：女；年龄：45 岁；出生日期：1981-06-20；民族：汉族；婚姻状况：已婚；职业：教师', contactInfo: '联系方式：手机：139****5678；邮箱：li***@126.com；住址：杭州市拱墅区莫干山路 *** 号', insuranceInfo: '医保信息：医保类型：居民医保；医保卡号：3301**********5678；参保地：杭州市', familyHistory: '家庭史：1. 父亲：健在（健康）；2. 母亲：健在（健康）；3. 妹妹：健在（健康）；4. 子女：1 女（健在，健康）' },
    { id: 'PPD-003', patient: '患者王***（ID: P-2020-003）', basicInfo: '基本信息：姓名：王***；性别：男；年龄：60 岁；出生日期：1966-01-10；民族：汉族；婚姻状况：已婚；职业：退休', contactInfo: '联系方式：手机：137****9012；邮箱：wang***@qq.com；住址：杭州市上城区解放路 *** 号', insuranceInfo: '医保信息：医保类型：职工医保；医保卡号：3301**********9012；参保地：杭州市', familyHistory: '家庭史：1. 父亲：已故（胃癌）；2. 母亲：已故（高血压）；3. 弟弟：健在（冠心病）；4. 子女：1 子（健在，健康）' },
    { id: 'PPD-004', patient: '患者刘***（ID: P-2020-004）', basicInfo: '基本信息：姓名：刘***；性别：女；年龄：30 岁；出生日期：1996-08-15；民族：汉族；婚姻状况：已婚；职业：公司职员', contactInfo: '联系方式：手机：136****3456；邮箱：liu***@sina.com；住址：杭州市滨江区江南大道 *** 号', insuranceInfo: '医保信息：医保类型：职工医保；医保卡号：3301**********3456；参保地：杭州市', familyHistory: '家庭史：1. 父亲：健在（健康）；2. 母亲：健在（健康）；3. 姐姐：健在（健康）；4. 子女：1 子（健在，2 岁）' },
    { id: 'PPD-005', patient: '患者陈***（ID: P-2020-005）', basicInfo: '基本信息：姓名：陈***；性别：男；年龄：65 岁；出生日期：1961-05-25；民族：汉族；婚姻状况：已婚；职业：退休', contactInfo: '联系方式：手机：135****7890；邮箱：chen***@163.com；住址：杭州市余杭区文一西路 *** 号', insuranceInfo: '医保信息：医保类型：职工医保；医保卡号：3301**********7890；参保地：杭州市', familyHistory: '家庭史：1. 父亲：已故（肺癌）；2. 母亲：已故（健康）；3. 妹妹：健在（乳腺癌术后）；4. 子女：1 女（健在，健康）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/visits-detail - 就诊记录详情 5 条 */
async function handlePatientVisitsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PVD-001', patient: '患者张***（ID: P-2020-001）', visitDetails: '就诊明细：1. 2026-10-15 心内科门诊（主诉：反复胸闷、胸痛 1 周）；2. 2026-10-15 心内科入院（CCU 监护病房）；3. 2026-10-16 冠状动脉造影 + 支架植入术；4. 2026-10-25 心内科出院（治愈）', diagnosis: '诊断：1. 冠心病不稳定型心绞痛；2. 高血压病 1 级（很高危）', prescription: '处方：1. 阿司匹林 100mg 每日 1 次；2. 阿托伐他汀 20mg 每晚 1 次；3. 单硝酸异山梨酯 20mg 每日 2 次', cost: '费用：总费用 3.5 万元（医保统筹支付 2.8 万元，个人自付 0.7 万元）' },
    { id: 'PVD-002', patient: '患者李***（ID: P-2020-002）', visitDetails: '就诊明细：1. 2026-10-18 普外科门诊（主诉：体检发现胆囊结石 1 周）；2. 2026-10-19 普外科入院（普外-12 床）；3. 2026-10-20 腹腔镜胆囊切除术；4. 2026-10-25 普外科出院（治愈）', diagnosis: '诊断：胆囊结石伴慢性胆囊炎', prescription: '处方：1. 头孢呋辛酯 250mg 每日 2 次（术后预防感染，疗程 5 天）；2. 清淡饮食，避免油腻食物', cost: '费用：总费用 1.5 万元（医保统筹支付 1.0 万元，个人自付 0.5 万元）' },
    { id: 'PVD-003', patient: '患者王***（ID: P-2020-003）', visitDetails: '就诊明细：1. 2026-10-16 消化内科门诊（主诉：反复上腹痛 3 个月，伴黑便 1 周）；2. 2026-10-16 消化内科入院（消化-08 床）；3. 2026-10-17 胃镜检查（胃溃疡 A1 期）；4. 2026-10-26 消化内科出院（好转）', diagnosis: '诊断：1. 胃溃疡（A1 期，伴上消化道出血）；2. 幽门螺杆菌阳性', prescription: '处方：1. 奥美拉唑 20mg 每日 1 次（疗程 4 周）；2. 铝碳酸镁 1g 每日 3 次（餐后）', cost: '费用：总费用 0.8 万元（医保统筹支付 0.6 万元，个人自付 0.2 万元）' },
    { id: 'PVD-004', patient: '患者刘***（ID: P-2020-004）', visitDetails: '就诊明细：1. 2026-10-18 妇产科门诊（主诉：宫内妊娠 39 周，产检）；2. 2026-10-18 妇产科入院（产科-05 床）；3. 2026-10-18 剖宫产术（男婴，体重 3500g）；4. 2026-10-23 妇产科出院（治愈）', diagnosis: '诊断：宫内妊娠 39 周，剖宫产分娩', prescription: '处方：1. 头孢呋辛酯 250mg 每日 2 次（术后预防感染，疗程 5 天）；2. 益母草颗粒 1 袋每日 3 次（促进子宫复旧）', cost: '费用：总费用 1.0 万元（医保统筹支付 0.7 万元，个人自付 0.3 万元）' },
    { id: 'PVD-005', patient: '患者陈***（ID: P-2020-005）', visitDetails: '就诊明细：1. 2026-10-19 骨科门诊（主诉：右小腿外伤后疼痛、肿胀 2 小时）；2. 2026-10-19 骨科入院（骨科-15 床）；3. 2026-10-19 X 线检查（右胫骨骨折）；4. 2026-10-20 骨折切开复位内固定术；5. 2026-10-30 骨科出院（好转）', diagnosis: '诊断：右胫骨骨折（闭合性）', prescription: '处方：1. 头孢呋辛酯 250mg 每日 2 次（术后预防感染，疗程 5 天）；2. 塞来昔布 200mg 每日 1 次（术后镇痛，必要时）', cost: '费用：总费用 2.0 万元（医保统筹支付 1.5 万元，个人自付 0.5 万元）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/allergies-detail - 过敏史详情 5 条 */
async function handlePatientAllergiesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAD-001', patient: '患者张***（ID: P-2020-001）', allergenDetails: '过敏原明细：1. 青霉素（药物过敏）；2. 头孢类（药物过敏）；3. 海鲜（食物过敏）', reactions: '反应：1. 青霉素：皮疹、瘙痒（轻度）；2. 头孢类：皮疹、瘙痒（轻度）；3. 海鲜：腹痛、腹泻、皮疹（中度）', severity: '严重程度：1. 青霉素：轻度（皮疹，无呼吸困难）；2. 头孢类：轻度（皮疹，无呼吸困难）；3. 海鲜：中度（腹痛、腹泻、皮疹，无过敏性休克）', discoveryTime: '发现时间：1. 青霉素：2010 年（感冒输液时发现）；2. 头孢类：2015 年（支气管炎服药时发现）；3. 海鲜：2005 年（食用虾后发现）' },
    { id: 'PAD-002', patient: '患者李***（ID: P-2020-002）', allergenDetails: '过敏原明细：1. 花粉（吸入性过敏）；2. 尘螨（吸入性过敏）', reactions: '反应：1. 花粉：打喷嚏、流鼻涕、眼睛瘙痒（轻度）；2. 尘螨：打喷嚏、流鼻涕、咳嗽（轻度）', severity: '严重程度：1. 花粉：轻度（季节性鼻炎，无哮喘）；2. 尘螨：轻度（常年性鼻炎，无哮喘）', discoveryTime: '发现时间：1. 花粉：2018 年（春季开花时发现）；2. 尘螨：2020 年（晨起打喷嚏时发现）' },
    { id: 'PAD-003', patient: '患者王***（ID: P-2020-003）', allergenDetails: '过敏原明细：1. 阿司匹林（药物过敏）', reactions: '反应：阿司匹林：哮喘发作（呼吸困难、喘息）', severity: '严重程度：阿司匹林：中度（哮喘发作，无过敏性休克）', discoveryTime: '发现时间：阿司匹林：2012 年（冠心病服药时发现，阿司匹林哮喘）' },
    { id: 'PAD-004', patient: '患者刘***（ID: P-2020-004）', allergenDetails: '过敏原明细：1. 芒果（食物过敏）', reactions: '反应：芒果：口唇瘙痒、皮疹（轻度）', severity: '严重程度：芒果：轻度（口唇瘙痒、皮疹，无腹痛腹泻）', discoveryTime: '发现时间：芒果：2019 年（食用芒果后发现）' },
    { id: 'PAD-005', patient: '患者陈***（ID: P-2020-005）', allergenDetails: '过敏原明细：无（患者无已知过敏原）', reactions: '反应：无', severity: '严重程度：无', discoveryTime: '发现时间：无' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/medications-detail - 用药史详情 5 条 */
async function handlePatientMedicationsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PMD-001', patient: '患者张***（ID: P-2020-001）', medicationDetails: '药品明细：1. 阿司匹林肠溶片（100mg）；2. 阿托伐他汀钙片（20mg）；3. 单硝酸异山梨酯缓释片（20mg）', dosage: '剂量：1. 阿司匹林：100mg/次；2. 阿托伐他汀：20mg/次；3. 单硝酸异山梨酯：20mg/次', usage: '用法：1. 阿司匹林：每次 1 片，每日 1 次（晚餐后）；2. 阿托伐他汀：每次 1 片，每晚 1 次；3. 单硝酸异山梨酯：每次 1 片，每日 2 次（早晚）', medicationTime: '用药时间：1. 阿司匹林：2026-10-16 至今（术后开始，长期服用）；2. 阿托伐他汀：2026-10-16 至今（术后开始，长期服用）；3. 单硝酸异山梨酯：2026-10-16 至今（术后开始，长期服用）' },
    { id: 'PMD-002', patient: '患者李***（ID: P-2020-002）', medicationDetails: '药品明细：1. 头孢呋辛酯片（250mg）', dosage: '剂量：1. 头孢呋辛酯：250mg/次', usage: '用法：1. 头孢呋辛酯：每次 1 片，每日 2 次（餐后）', medicationTime: '用药时间：1. 头孢呋辛酯：2026-10-20 至 2026-10-25（术后预防感染，疗程 5 天）' },
    { id: 'PMD-003', patient: '患者王***（ID: P-2020-003）', medicationDetails: '药品明细：1. 奥美拉唑肠溶胶囊（20mg）；2. 铝碳酸镁咀嚼片（0.5g）', dosage: '剂量：1. 奥美拉唑：20mg/次；2. 铝碳酸镁：0.5g/次', usage: '用法：1. 奥美拉唑：每次 1 粒，每日 1 次（晨起空腹）；2. 铝碳酸镁：每次 1 片，每日 3 次（餐后 1-2 小时咀嚼）', medicationTime: '用药时间：1. 奥美拉唑：2026-10-16 至今（疗程 4 周）；2. 铝碳酸镁：2026-10-16 至今（疗程 4 周）' },
    { id: 'PMD-004', patient: '患者刘***（ID: P-2020-004）', medicationDetails: '药品明细：1. 头孢呋辛酯片（250mg）；2. 益母草颗粒（15g）', dosage: '剂量：1. 头孢呋辛酯：250mg/次；2. 益母草：15g/次', usage: '用法：1. 头孢呋辛酯：每次 1 片，每日 2 次（餐后）；2. 益母草：每次 1 袋，每日 3 次（温开水冲服）', medicationTime: '用药时间：1. 头孢呋辛酯：2026-10-18 至 2026-10-23（术后预防感染，疗程 5 天）；2. 益母草：2026-10-18 至 2026-10-23（促进子宫复旧，疗程 5 天）' },
    { id: 'PMD-005', patient: '患者陈***（ID: P-2020-005）', medicationDetails: '药品明细：1. 头孢呋辛酯片（250mg）；2. 塞来昔布胶囊（200mg）', dosage: '剂量：1. 头孢呋辛酯：250mg/次；2. 塞来昔布：200mg/次', usage: '用法：1. 头孢呋辛酯：每次 1 片，每日 2 次（餐后）；2. 塞来昔布：每次 1 粒，每日 1 次（餐后，必要时）', medicationTime: '用药时间：1. 头孢呋辛酯：2026-10-20 至 2026-10-25（术后预防感染，疗程 5 天）；2. 塞来昔布：2026-10-20 至今（术后镇痛，必要时使用）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/labs-detail - 检验汇总详情 5 条 */
async function handlePatientLabsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PLD-001', patient: '患者张***（ID: P-2020-001）', itemDetails: '检验项目明细：1. 血常规（2026-10-15）；2. 生化全套（2026-10-15）；3. 心肌酶谱（2026-10-15）', resultTrends: '结果趋势：1. 血常规：白细胞 6.5 × 10⁹/L（正常），血红蛋白 150 g/L（正常），血小板 200 × 10⁹/L（正常）；2. 生化全套：ALT 30 U/L（正常），Cr 70 μmol/L（正常），GLU 5.5 mmol/L（正常），TC 4.5 mmol/L（正常）；3. 心肌酶谱：CK-MB 30 U/L ↑（偏高），cTnI 0.5 ng/ml ↑（偏高），Myo 100 ng/ml ↑（偏高）', abnormalFlags: '异常标志：心肌酶谱异常（CK-MB、cTnI、Myo 均偏高，提示急性心肌梗死）', doctor: '管床医生：王***（主任医师，心内科）' },
    { id: 'PLD-002', patient: '患者李***（ID: P-2020-002）', itemDetails: '检验项目明细：1. 血常规（2026-10-19）；2. 生化全套（2026-10-19）', resultTrends: '结果趋势：1. 血常规：白细胞 6.0 × 10⁹/L（正常），血红蛋白 130 g/L（正常），血小板 200 × 10⁹/L（正常）；2. 生化全套：ALT 25 U/L（正常），Cr 50 μmol/L（正常），GLU 5.0 mmol/L（正常），TC 4.0 mmol/L（正常）', abnormalFlags: '异常标志：全部正常（无异常指标）', doctor: '管床医生：刘***（副主任医师，普外科）' },
    { id: 'PLD-003', patient: '患者王***（ID: P-2020-003）', itemDetails: '检验项目明细：1. 血常规（2026-10-16）；2. 生化全套（2026-10-16）；3. 粪便潜血（2026-10-16）', resultTrends: '结果趋势：1. 血常规：白细胞 7.0 × 10⁹/L（正常），血红蛋白 100 g/L ↓（偏低，贫血），血小板 200 × 10⁹/L（正常）；2. 生化全套：ALT 30 U/L（正常），Cr 60 μmol/L（正常），GLU 5.5 mmol/L（正常）；3. 粪便潜血：阳性（+）', abnormalFlags: '异常标志：1. 血红蛋白 100 g/L ↓（偏低，提示贫血）；2. 粪便潜血阳性（+，提示消化道出血）', doctor: '管床医生：陈***（主任医师，消化内科）' },
    { id: 'PLD-004', patient: '患者刘***（ID: P-2020-004）', itemDetails: '检验项目明细：1. 血常规（2026-10-18）；2. 生化全套（2026-10-18）', resultTrends: '结果趋势：1. 血常规：白细胞 8.0 × 10⁹/L（正常），血红蛋白 110 g/L ↓（轻度贫血，妊娠生理性），血小板 200 × 10⁹/L（正常）；2. 生化全套：ALT 20 U/L（正常），Cr 40 μmol/L（正常），GLU 5.0 mmol/L（正常）', abnormalFlags: '异常标志：血红蛋白 110 g/L ↓（轻度贫血，妊娠生理性，无需特殊处理）', doctor: '管床医生：赵***（副主任医师，妇产科）' },
    { id: 'PLD-005', patient: '患者陈***（ID: P-2020-005）', itemDetails: '检验项目明细：1. 血常规（2026-10-19）；2. 生化全套（2026-10-19）；3. 凝血功能（2026-10-19）', resultTrends: '结果趋势：1. 血常规：白细胞 7.0 × 10⁹/L（正常），血红蛋白 140 g/L（正常），血小板 200 × 10⁹/L（正常）；2. 生化全套：ALT 25 U/L（正常），Cr 60 μmol/L（正常），GLU 5.5 mmol/L（正常）；3. 凝血功能：PT 12.0 秒（正常），INR 1.0（正常），APTT 35 秒（正常），FIB 3.0 g/L（正常）', abnormalFlags: '异常标志：全部正常（无异常指标）', doctor: '管床医生：孙***（副主任医师，骨科）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/patient/imaging-detail - 影像汇总详情 5 条 */
async function handlePatientImagingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PImD-001', patient: '患者张***（ID: P-2020-001）', itemDetails: '检查项目明细：1. 心电图（2026-10-15）；2. 胸部 CT 平扫（2026-10-15）；3. 冠状动脉造影（2026-10-16）', diagnosisConclusions: '诊断结论：1. 心电图：急性前壁心肌梗死（V1-V4 导联 ST 段抬高）；2. 胸部 CT：右肺上叶磨玻璃结节（8mm，良性可能性大）；3. 冠状动脉造影：左前降支近段狭窄 90%（已行支架植入术）', doctor: '影像科医生：王***（主治医师）；心内科医生：李***（主任医师）', time: '时间：1. 心电图：2026-10-15 11:00:00；2. 胸部 CT：2026-10-15 14:00:00；3. 冠状动脉造影：2026-10-16 10:00:00' },
    { id: 'PImD-002', patient: '患者李***（ID: P-2020-002）', itemDetails: '检查项目明细：1. 腹部超声（2026-10-18）', diagnosisConclusions: '诊断结论：腹部超声：胆囊结石（15mm），慢性胆囊炎静止期', doctor: '超声科医生：刘***（主治医师）', time: '时间：腹部超声：2026-10-18 09:00:00' },
    { id: 'PImD-003', patient: '患者王***（ID: P-2020-003）', itemDetails: '检查项目明细：1. 胃镜（2026-10-17）', diagnosisConclusions: '诊断结论：胃镜：胃窦部溃疡（A1 期），幽门螺杆菌阳性', doctor: '消化内科医生：陈***（主任医师）', time: '时间：胃镜：2026-10-17 10:00:00' },
    { id: 'PImD-004', patient: '患者刘***（ID: P-2020-004）', itemDetails: '检查项目明细：1. 产科超声（2026-10-18）', diagnosisConclusions: '诊断结论：产科超声：宫内妊娠 39 周，胎位不正（臀位），羊水量正常', doctor: '超声科医生：赵***（主治医师）', time: '时间：产科超声：2026-10-18 08:00:00' },
    { id: 'PImD-005', patient: '患者陈***（ID: P-2020-005）', itemDetails: '检查项目明细：1. 右小腿 X 线（2026-10-19）；2. 右小腿 X 线（2026-10-20，术后复查）', diagnosisConclusions: '诊断结论：1. 右小腿 X 线（术前）：右胫骨中段横行骨折；2. 右小腿 X 线（术后）：骨折复位良好，内固定（钢板 + 螺钉）位置满意', doctor: '影像科医生：孙***（主治医师）', time: '时间：1. 术前 X 线：2026-10-19 15:00:00；2. 术后 X 线：2026-10-20 16:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m405Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/patient/profile-detail', handle: handlePatientProfileDetail, auth: true },
  { method: 'GET', path: '/api/v1/patient/visits-detail', handle: handlePatientVisitsDetail, auth: true },
  { method: 'GET', path: '/api/v1/patient/allergies-detail', handle: handlePatientAllergiesDetail, auth: true },
  { method: 'GET', path: '/api/v1/patient/medications-detail', handle: handlePatientMedicationsDetail, auth: true },
  { method: 'GET', path: '/api/v1/patient/labs-detail', handle: handlePatientLabsDetail, auth: true },
  { method: 'GET', path: '/api/v1/patient/imaging-detail', handle: handlePatientImagingDetail, auth: true },
];
