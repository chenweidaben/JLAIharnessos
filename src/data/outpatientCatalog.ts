/**
 * 健澜科技 jlmedaios - 门诊参考主数据（服务端）
 *
 * 提供 ICD-10 字典、检验/检查/治疗项目目录、检验套餐、处方与病历模板。
 *
 * 数据定位（务必如实区分）：
 *  - 这些是"院内项目主数据 / 临床知识参考"，由 BFF 统一返回，不是患者业务数据。
 *  - 药品目录走 PostgreSQL（clinical.drug_catalog，见 drugRepo），不在本模块。
 *  - 在生产医院，检验/检查/治疗项目主数据应由 HIS/LIS/PACS 通过集成接口同步
 *    （见二期 HIS/EMR/LIS/PACS 真实对接）；当前开源构建以本模块作为"项目主数据
 *    参考适配器"，避免前端硬编码。患者相关的交易数据（医嘱/处方/病历/诊断/对话）
 *    全部真实落 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型（与 web/src/types/outpatient 对齐）                            */
/* ------------------------------------------------------------------ */

export interface IcdDiagnosis {
  code: string;
  name: string;
  category: string;
}

export interface LabTestItem {
  itemId: string;
  name: string;
  code: string;
  pinyin: string;
  specimen: string;
  price: number;
  turnaroundHours: number;
  fasting: boolean;
  note?: string;
  clinicalSignificance?: string;
}

export interface LabPanel {
  panelId: string;
  name: string;
  itemIds: string[];
  price: number;
  note?: string;
}

export interface ImagingItem {
  itemId: string;
  name: string;
  modality: 'CT' | 'MRI' | 'DR' | 'US' | '内镜' | 'ECG' | '其他';
  pinyin: string;
  price: number;
  waitHours: number;
  needsContrast: boolean;
  note?: string;
}

export interface TreatmentItem {
  treatmentId: string;
  name: string;
  pinyin: string;
  price: number;
  durationMin: number;
  note?: string;
}

export interface PrescriptionTemplateLine {
  drugId: string;
  dose: number;
  doseUnit: string;
  frequency: string;
  route: string;
  days: number;
  instruction: string;
}

export interface PrescriptionTemplate {
  templateId: string;
  name: string;
  type: 'western' | 'chinese_patent' | 'chinese_herbal' | 'external';
  indication: string;
  lines: PrescriptionTemplateLine[];
}

export interface MedicalRecordTemplate {
  templateId: string;
  name: string;
  scope: 'personal' | 'dept' | 'common';
  content: Record<string, string>;
}

/* ------------------------------------------------------------------ */
/* ICD-10                                                              */
/* ------------------------------------------------------------------ */

export const ICD_CATALOG: IcdDiagnosis[] = [
  { code: 'I10.x00', name: '原发性高血压', category: '循环系统' },
  { code: 'I11.900', name: '高血压性心脏病', category: '循环系统' },
  { code: 'I20.000', name: '不稳定型心绞痛', category: '循环系统' },
  { code: 'I20.900', name: '心绞痛', category: '循环系统' },
  { code: 'I21.400', name: '非 ST 段抬高型心肌梗死', category: '循环系统' },
  { code: 'I25.100', name: '冠状动脉粥样硬化性心脏病', category: '循环系统' },
  { code: 'I25.200', name: '陈旧性心肌梗死', category: '循环系统' },
  { code: 'I44.200', name: '房室传导阻滞', category: '循环系统' },
  { code: 'I48.x00', name: '心房颤动', category: '循环系统' },
  { code: 'I49.900', name: '心律失常', category: '循环系统' },
  { code: 'I50.900', name: '心力衰竭', category: '循环系统' },
  { code: 'I50.100', name: '左心衰竭', category: '循环系统' },
  { code: 'I63.900', name: '脑梗死', category: '循环系统' },
  { code: 'I67.200', name: '脑动脉硬化', category: '循环系统' },
  { code: 'E11.900', name: '2 型糖尿病', category: '内分泌' },
  { code: 'E11.400', name: '2 型糖尿病伴神经系统并发症', category: '内分泌' },
  { code: 'E11.500', name: '2 型糖尿病伴周围循环并发症', category: '内分泌' },
  { code: 'E78.500', name: '高脂血症', category: '内分泌' },
  { code: 'E03.900', name: '甲状腺功能减退', category: '内分泌' },
  { code: 'E05.900', name: '甲状腺功能亢进', category: '内分泌' },
  { code: 'J18.900', name: '肺炎', category: '呼吸系统' },
  { code: 'J40.x00', name: '急性支气管炎', category: '呼吸系统' },
  { code: 'J45.900', name: '支气管哮喘', category: '呼吸系统' },
  { code: 'J44.900', name: '慢性阻塞性肺疾病', category: '呼吸系统' },
  { code: 'J20.900', name: '急性上呼吸道感染', category: '呼吸系统' },
  { code: 'R07.400', name: '胸痛', category: '症状体征' },
  { code: 'R00.200', name: '心悸', category: '症状体征' },
  { code: 'R42.x00', name: '头晕', category: '症状体征' },
  { code: 'R51.x00', name: '头痛', category: '症状体征' },
  { code: 'R06.000', name: '呼吸困难', category: '症状体征' },
  { code: 'K29.500', name: '慢性胃炎', category: '消化系统' },
  { code: 'K25.900', name: '消化性溃疡', category: '消化系统' },
  { code: 'K59.000', name: '便秘', category: '消化系统' },
  { code: 'N18.900', name: '慢性肾脏病', category: '泌尿系统' },
  { code: 'N39.000', name: '尿路感染', category: '泌尿系统' },
  { code: 'M54.500', name: '腰痛', category: '肌肉骨骼' },
  { code: 'M25.500', name: '关节痛', category: '肌肉骨骼' },
  { code: 'M47.800', name: '颈椎病', category: '肌肉骨骼' },
  { code: 'M51.200', name: '腰椎间盘突出', category: '肌肉骨骼' },
  { code: 'F32.900', name: '抑郁状态', category: '精神心理' },
  { code: 'F41.900', name: '焦虑状态', category: '精神心理' },
  { code: 'G43.900', name: '偏头痛', category: '神经系统' },
  { code: 'G44.200', name: '紧张性头痛', category: '神经系统' },
  { code: 'L23.900', name: '过敏性皮炎', category: '皮肤' },
  { code: 'Z00.000', name: '一般体格检查', category: '健康查体' },
  { code: 'Z71.200', name: '健康咨询', category: '健康查体' },
  { code: 'I26.900', name: '肺栓塞', category: '循环系统' },
  { code: 'I27.900', name: '肺动脉高压', category: '循环系统' },
  { code: 'D64.900', name: '贫血', category: '血液系统' },
  { code: 'D50.900', name: '缺铁性贫血', category: '血液系统' },
  { code: 'J30.900', name: '过敏性鼻炎', category: '呼吸系统' },
  { code: 'I83.900', name: '下肢静脉曲张', category: '循环系统' },
];

/* ------------------------------------------------------------------ */
/* 检验                                                                */
/* ------------------------------------------------------------------ */

export const LAB_CATALOG: LabTestItem[] = [
  { itemId: 'L001', name: '血常规（五分类）', code: 'LAB-CBC', pinyin: 'xcg', specimen: 'EDTA抗凝血', price: 25, turnaroundHours: 2, fasting: false, note: '无需空腹', clinicalSignificance: '评估感染、贫血、血小板' },
  { itemId: 'L002', name: '尿常规', code: 'LAB-URINE', pinyin: 'ng', specimen: '随机尿', price: 12, turnaroundHours: 1, fasting: false, note: '清洁中段尿', clinicalSignificance: '泌尿系感染、肾功筛查' },
  { itemId: 'L003', name: '粪便常规+隐血', code: 'LAB-FOB', pinyin: 'fb', specimen: '粪便', price: 18, turnaroundHours: 2, fasting: false, note: '标本新鲜', clinicalSignificance: '消化道出血筛查' },
  { itemId: 'L004', name: '肝功能全套', code: 'LAB-LFT', pinyin: 'ggnq', specimen: '空腹血清', price: 65, turnaroundHours: 4, fasting: true, note: '空腹 8 小时', clinicalSignificance: '肝损伤、黄疸评估' },
  { itemId: 'L005', name: '肾功能（肌酐/尿素/尿酸）', code: 'LAB-RFT', pinyin: 'sng', specimen: '空腹血清', price: 35, turnaroundHours: 3, fasting: true, note: '空腹', clinicalSignificance: '肾功能评估、造影前必查' },
  { itemId: 'L006', name: '空腹血糖', code: 'LAB-FBG', pinyin: 'kft', specimen: '血清', price: 8, turnaroundHours: 1, fasting: true, note: '空腹 8 小时', clinicalSignificance: '糖尿病诊断与监测' },
  { itemId: 'L007', name: '糖化血红蛋白', code: 'LAB-HbA1c', pinyin: 'hbdb', specimen: '全血', price: 45, turnaroundHours: 24, fasting: false, note: '无需空腹', clinicalSignificance: '近 3 月血糖平均水平' },
  { itemId: 'L008', name: '血脂四项', code: 'LAB-LIPID', pinyin: 'xzsx', specimen: '空腹血清', price: 40, turnaroundHours: 4, fasting: true, note: '空腹 12 小时', clinicalSignificance: '高脂血症评估' },
  { itemId: 'L009', name: '电解质（钾钠氯钙）', code: 'LAB-ES', pinyin: 'djz', specimen: '血清', price: 22, turnaroundHours: 1, fasting: false, clinicalSignificance: '心律失常、利尿剂监测' },
  { itemId: 'L010', name: '凝血四项（PT/APTT/TT/FIB）', code: 'LAB-Coag', pinyin: 'nx', specimen: '枸橼酸化血浆', price: 55, turnaroundHours: 3, fasting: false, clinicalSignificance: '抗凝治疗监测、出血风险' },
  { itemId: 'L011', name: '心肌酶谱（CK/CK-MB/LDH）', code: 'LAB-CK', pinyin: 'xjmp', specimen: '血清', price: 48, turnaroundHours: 2, fasting: false, clinicalSignificance: '心肌损伤辅助诊断' },
  { itemId: 'L012', name: '肌钙蛋白 I（cTnI）', code: 'LAB-cTnI', pinyin: 'jgdb', specimen: '血清', price: 65, turnaroundHours: 1, fasting: false, clinicalSignificance: '心肌损伤金指标' },
  { itemId: 'L013', name: 'B 型脑钠肽（BNP）', code: 'LAB-BNP', pinyin: 'bnp', specimen: '血浆', price: 120, turnaroundHours: 2, fasting: false, clinicalSignificance: '心衰严重程度评估' },
  { itemId: 'L014', name: 'D-二聚体', code: 'LAB-DD', pinyin: 'eerjt', specimen: '血浆', price: 75, turnaroundHours: 2, fasting: false, clinicalSignificance: '肺栓塞/DIC 筛查' },
  { itemId: 'L015', name: '甲状腺功能三项', code: 'LAB-TF3', pinyin: 'jzxgn', specimen: '血清', price: 120, turnaroundHours: 24, fasting: false, clinicalSignificance: '甲亢/甲减筛查' },
  { itemId: 'L016', name: '甲状腺功能五项', code: 'LAB-TF5', pinyin: 'jzxgn5', specimen: '血清', price: 180, turnaroundHours: 24, fasting: false, clinicalSignificance: '甲状腺疾病鉴别' },
  { itemId: 'L017', name: '肿瘤标志物五项', code: 'LAB-TM5', pinyin: 'zlbz', specimen: '血清', price: 220, turnaroundHours: 24, fasting: false, clinicalSignificance: '肿瘤筛查（非确诊）' },
  { itemId: 'L018', name: 'C 反应蛋白（CRP）', code: 'LAB-CRP', pinyin: 'crp', specimen: '血清', price: 30, turnaroundHours: 1, fasting: false, clinicalSignificance: '炎症活动度' },
  { itemId: 'L019', name: '降钙素原（PCT）', code: 'LAB-PCT', pinyin: 'jgsy', specimen: '血清', price: 120, turnaroundHours: 2, fasting: false, clinicalSignificance: '细菌感染严重程度' },
  { itemId: 'L020', name: '糖化白蛋白', code: 'LAB-GA', pinyin: 'thbdb', specimen: '血清', price: 60, turnaroundHours: 24, fasting: false, clinicalSignificance: '近 2 周血糖水平' },
  { itemId: 'L021', name: '空腹胰岛素', code: 'LAB-INS', pinyin: 'kfyds', specimen: '血清', price: 55, turnaroundHours: 24, fasting: true, note: '空腹', clinicalSignificance: '胰岛素抵抗评估' },
  { itemId: 'L022', name: '同型半胱氨酸', code: 'LAB-Hcy', pinyin: 'txbga', specimen: '血清', price: 80, turnaroundHours: 24, fasting: false, clinicalSignificance: '心脑血管风险因子' },
  { itemId: 'L023', name: '血气分析', code: 'LAB-ABG', pinyin: 'qx', specimen: '动脉血', price: 120, turnaroundHours: 0.5, fasting: false, note: '床边检测', clinicalSignificance: '呼吸衰竭评估' },
  { itemId: 'L024', name: '乙肝五项', code: 'LAB-HBV5', pinyin: 'yxwx', specimen: '血清', price: 60, turnaroundHours: 24, fasting: false, clinicalSignificance: '乙肝感染筛查' },
  { itemId: 'L025', name: '丙肝抗体', code: 'LAB-HCV', pinyin: 'bkg', specimen: '血清', price: 45, turnaroundHours: 24, fasting: false, clinicalSignificance: '丙肝感染筛查' },
  { itemId: 'L026', name: 'HIV 抗原抗体联合检测', code: 'LAB-HIV', pinyin: 'hiv', specimen: '血清', price: 80, turnaroundHours: 24, fasting: false, clinicalSignificance: '术前/输血前筛查' },
  { itemId: 'L027', name: '梅毒螺旋体抗体', code: 'LAB-TP', pinyin: 'mdt', specimen: '血清', price: 50, turnaroundHours: 24, fasting: false, clinicalSignificance: '术前/输血前筛查' },
  { itemId: 'L028', name: '血沉（ESR）', code: 'LAB-ESR', pinyin: 'xc', specimen: '枸橼酸化血浆', price: 15, turnaroundHours: 4, fasting: false, clinicalSignificance: '炎症活动度' },
  { itemId: 'L029', name: '类风湿因子（RF）', code: 'LAB-RF', pinyin: 'lfyz', specimen: '血清', price: 35, turnaroundHours: 24, fasting: false, clinicalSignificance: '类风湿关节炎筛查' },
  { itemId: 'L030', name: '抗 O（ASO）', code: 'LAB-ASO', pinyin: 'kaso', specimen: '血清', price: 30, turnaroundHours: 24, fasting: false, clinicalSignificance: '链球菌感染后状态' },
  { itemId: 'L031', name: '尿微量白蛋白/肌酐比', code: 'LAB-ACR', pinyin: 'nwdb', specimen: '随机尿', price: 50, turnaroundHours: 24, fasting: false, note: '晨尿最佳', clinicalSignificance: '早期肾损伤' },
  { itemId: 'L032', name: '24 小时尿蛋白定量', code: 'LAB-UP24', pinyin: 'ndb', specimen: '24h 尿', price: 60, turnaroundHours: 48, fasting: false, note: '留取 24h 尿', clinicalSignificance: '肾病综合征评估' },
  { itemId: 'L033', name: '电解质+肾功能+血糖+血脂（生化全套）', code: 'LAB-BIO', pinyin: 'shtq', specimen: '空腹血清', price: 180, turnaroundHours: 4, fasting: true, note: '空腹 12 小时', clinicalSignificance: '住院/体检大生化' },
  { itemId: 'L034', name: '肌红蛋白（Myo）', code: 'LAB-Myo', pinyin: 'jhdb', specimen: '血清', price: 45, turnaroundHours: 1, fasting: false, clinicalSignificance: '早期心肌损伤' },
  { itemId: 'L035', name: '妊娠试验（尿 HCG）', code: 'LAB-HCG', pinyin: 'rsy', specimen: '尿', price: 15, turnaroundHours: 0.5, fasting: false, clinicalSignificance: '妊娠诊断（育龄女性必查）' },
  { itemId: 'L036', name: '维生素 D（25-OH-VD）', code: 'LAB-VD', pinyin: 'wssd', specimen: '血清', price: 90, turnaroundHours: 48, fasting: false, clinicalSignificance: '骨代谢评估' },
  { itemId: 'L037', name: '铁代谢四项', code: 'LAB-Fe', pinyin: 'tdx', specimen: '血清', price: 110, turnaroundHours: 24, fasting: false, clinicalSignificance: '贫血病因鉴别' },
  { itemId: 'L038', name: '尿培养+药敏', code: 'LAB-UC', pinyin: 'npy', specimen: '清洁尿', price: 120, turnaroundHours: 72, fasting: false, note: '抗生素前留取', clinicalSignificance: '尿路感染病原学' },
  { itemId: 'L039', name: '血培养（需氧+厌氧）', code: 'LAB-BC', pinyin: 'xpy', specimen: '静脉血', price: 150, turnaroundHours: 120, fasting: false, note: '寒战/发热时双瓶', clinicalSignificance: '菌血症诊断' },
  { itemId: 'L040', name: 'D-二聚体+凝血（血栓套餐）', code: 'LAB-THR', pinyin: 'xstc', specimen: '枸橼酸化血浆', price: 130, turnaroundHours: 2, fasting: false, clinicalSignificance: '静脉血栓评估' },
];

export const LAB_PANELS: LabPanel[] = [
  { panelId: 'LP01', name: '血常规+CRP', itemIds: ['L001', 'L018'], price: 55, note: '发热/感染首选' },
  { panelId: 'LP02', name: '生化全套', itemIds: ['L033'], price: 180, note: '空腹 12 小时' },
  { panelId: 'LP03', name: '心梗三项', itemIds: ['L012', 'L011', 'L034'], price: 158, note: '胸痛急诊首选' },
  { panelId: 'LP04', name: '糖尿病套餐', itemIds: ['L006', 'L007', 'L020', 'L021'], price: 205, note: '空腹' },
  { panelId: 'LP05', name: '甲状腺功能全套', itemIds: ['L016'], price: 180 },
  { panelId: 'LP06', name: '术前四项', itemIds: ['L024', 'L025', 'L026', 'L027'], price: 235, note: '术前必查' },
  { panelId: 'LP07', name: '血栓风险套餐', itemIds: ['L040', 'L010'], price: 185 },
];

/* ------------------------------------------------------------------ */
/* 检查                                                                */
/* ------------------------------------------------------------------ */

export const IMAGING_CATALOG: ImagingItem[] = [
  { itemId: 'I001', name: '胸部正位片（DR）', modality: 'DR', pinyin: 'xbz', price: 80, waitHours: 1, needsContrast: false, note: '去除胸前金属物品' },
  { itemId: 'I002', name: '胸部 CT 平扫', modality: 'CT', pinyin: 'xcb', price: 280, waitHours: 4, needsContrast: false, note: '去除金属饰物' },
  { itemId: 'I003', name: '胸部 CT 增强', modality: 'CT', pinyin: 'xbzq', price: 580, waitHours: 24, needsContrast: true, note: '需肾功能及碘过敏评估' },
  { itemId: 'I004', name: '头颅 CT 平扫', modality: 'CT', pinyin: 'tnb', price: 280, waitHours: 2, needsContrast: false, note: '急诊优先' },
  { itemId: 'I005', name: '头颅 CT 增强', modality: 'CT', pinyin: 'tnzq', price: 580, waitHours: 24, needsContrast: true, note: '需肾功能及碘过敏评估' },
  { itemId: 'I006', name: '头颅 MRI 平扫', modality: 'MRI', pinyin: 'tnmri', price: 680, waitHours: 48, needsContrast: false, note: '去除所有金属物品，禁忌：体内金属植入物' },
  { itemId: 'I007', name: '头颅 MRI 增强', modality: 'MRI', pinyin: 'tnmrizq', price: 1180, waitHours: 72, needsContrast: true, note: '需肾功能及钆过敏评估' },
  { itemId: 'I008', name: '颈椎 MRI', modality: 'MRI', pinyin: 'jzmri', price: 680, waitHours: 48, needsContrast: false, note: '去除金属物品' },
  { itemId: 'I009', name: '腰椎 MRI', modality: 'MRI', pinyin: 'yzmri', price: 680, waitHours: 48, needsContrast: false, note: '去除金属物品' },
  { itemId: 'I010', name: '冠状动脉 CTA', modality: 'CT', pinyin: 'gdmcta', price: 1580, waitHours: 48, needsContrast: true, note: '需肾功能、碘过敏评估，控制心率' },
  { itemId: 'I011', name: '腹部超声', modality: 'US', pinyin: 'fbc', price: 120, waitHours: 2, needsContrast: false, note: '空腹 8 小时' },
  { itemId: 'I012', name: '甲状腺超声', modality: 'US', pinyin: 'jzxcs', price: 100, waitHours: 2, needsContrast: false },
  { itemId: 'I013', name: '心脏超声（彩超）', modality: 'US', pinyin: 'xzcs', price: 180, waitHours: 4, needsContrast: false },
  { itemId: 'I014', name: '颈动脉超声', modality: 'US', pinyin: 'jdmcs', price: 150, waitHours: 4, needsContrast: false },
  { itemId: 'I015', name: '泌尿系超声', modality: 'US', pinyin: 'mnxcs', price: 120, waitHours: 2, needsContrast: false, note: '检查前憋尿' },
  { itemId: 'I016', name: '心电图（静息）', modality: 'ECG', pinyin: 'xdt', price: 25, waitHours: 0.2, needsContrast: false },
  { itemId: 'I017', name: '24 小时动态心电图（Holter）', modality: 'ECG', pinyin: 'holter', price: 180, waitHours: 24, needsContrast: false, note: '佩带 24 小时避免洗澡' },
  { itemId: 'I018', name: '运动负荷心电图', modality: 'ECG', pinyin: 'ydh', price: 80, waitHours: 2, needsContrast: false, note: '餐后 2 小时' },
  { itemId: 'I019', name: '胃镜', modality: '内镜', pinyin: 'wj', price: 350, waitHours: 48, needsContrast: false, note: '空腹 8 小时，停用抗凝药需评估' },
  { itemId: 'I020', name: '肠镜', modality: '内镜', pinyin: 'cj', price: 450, waitHours: 72, needsContrast: false, note: '肠道准备，停用抗凝药需评估' },
  { itemId: 'I021', name: '消化内镜（无痛）', modality: '内镜', pinyin: 'wtwj', price: 800, waitHours: 72, needsContrast: false, note: '需麻醉评估，禁食禁水' },
  { itemId: 'I022', name: '冠状动脉造影（介入）', modality: 'CT', pinyin: 'gdmzy', price: 3500, waitHours: 24, needsContrast: true, note: '住院手术，需肾功能评估' },
  { itemId: 'I023', name: '骨密度检测', modality: '其他', pinyin: 'gmd', price: 120, waitHours: 4, needsContrast: false },
  { itemId: 'I024', name: '肺功能检查', modality: '其他', pinyin: 'fgn', price: 150, waitHours: 4, needsContrast: false, note: '需配合吹气动作' },
  { itemId: 'I025', name: '24 小时动态血压', modality: '其他', pinyin: 'hdyx', price: 120, waitHours: 24, needsContrast: false, note: '佩带 24 小时' },
  { itemId: 'I026', name: '腹部 CT 平扫', modality: 'CT', pinyin: 'fbt', price: 280, waitHours: 4, needsContrast: false, note: '空腹 4 小时' },
  { itemId: 'I027', name: '腹部 CT 增强', modality: 'CT', pinyin: 'fbzq', price: 580, waitHours: 24, needsContrast: true, note: '需肾功能及碘过敏评估' },
  { itemId: 'I028', name: '乳腺超声', modality: 'US', pinyin: 'rxcs', price: 110, waitHours: 2, needsContrast: false },
];

/* ------------------------------------------------------------------ */
/* 治疗                                                                */
/* ------------------------------------------------------------------ */

export const TREATMENT_CATALOG: TreatmentItem[] = [
  { treatmentId: 'T001', name: '雾化吸入治疗', pinyin: 'whxr', price: 35, durationMin: 20, note: '呼吸科常用' },
  { treatmentId: 'T002', name: '心电监护', pinyin: 'xdjh', price: 50, durationMin: 60, note: '卧床患者' },
  { treatmentId: 'T003', name: '静脉输液（普通）', pinyin: 'jmss', price: 25, durationMin: 60 },
  { treatmentId: 'T004', name: '换药', pinyin: 'hy', price: 30, durationMin: 15 },
  { treatmentId: 'T005', name: '理疗（中频）', pinyin: 'll', price: 45, durationMin: 30 },
  { treatmentId: 'T006', name: '氧气吸入', pinyin: 'yq', price: 20, durationMin: 30 },
  { treatmentId: 'T007', name: '血糖监测', pinyin: 'xtjc', price: 10, durationMin: 5 },
];

/* ------------------------------------------------------------------ */
/* 模板                                                                */
/* ------------------------------------------------------------------ */

export const PRESCRIPTION_TEMPLATES: PrescriptionTemplate[] = [
  {
    templateId: 'PT01', name: '冠心病二级预防基础方', type: 'western',
    indication: '冠状动脉粥样硬化性心脏病',
    lines: [
      { drugId: 'D001', dose: 100, doseUnit: 'mg', frequency: 'qd', route: 'po', days: 30, instruction: '饭后服用，长期维持' },
      { drugId: 'D003', dose: 20, doseUnit: 'mg', frequency: 'qn', route: 'po', days: 30, instruction: '睡前服用，监测肝功' },
      { drugId: 'D004', dose: 47.5, doseUnit: 'mg', frequency: 'qd', route: 'po', days: 30, instruction: '晨起服用，监测心率' },
    ],
  },
  {
    templateId: 'PT02', name: '高血压二联方案', type: 'western',
    indication: '原发性高血压',
    lines: [
      { drugId: 'D005', dose: 5, doseUnit: 'mg', frequency: 'qd', route: 'po', days: 30, instruction: '晨起服用' },
      { drugId: 'D006', dose: 80, doseUnit: 'mg', frequency: 'qd', route: 'po', days: 30, instruction: '与进餐无关' },
    ],
  },
  {
    templateId: 'PT03', name: '2 型糖尿病口服方案', type: 'western',
    indication: '2 型糖尿病',
    lines: [
      { drugId: 'D009', dose: 0.5, doseUnit: 'g', frequency: 'bid', route: 'po', days: 30, instruction: '餐中服用' },
      { drugId: 'D047', dose: 10, doseUnit: 'mg', frequency: 'qd', route: 'po', days: 30, instruction: '晨起服用，多饮水' },
    ],
  },
  {
    templateId: 'PT04', name: '上呼吸道感染对症', type: 'western',
    indication: '急性上呼吸道感染',
    lines: [
      { drugId: 'D021', dose: 0.5, doseUnit: 'g', frequency: 'prn', route: 'po', days: 3, instruction: '发热 >38.5℃ 时服用' },
      { drugId: 'D025', dose: 10, doseUnit: 'ml', frequency: 'tid', route: 'po', days: 5, instruction: '饭后服用' },
    ],
  },
  {
    templateId: 'PT05', name: '冠心病中成药辅助', type: 'chinese_patent',
    indication: '冠状动脉粥样硬化性心脏病',
    lines: [
      { drugId: 'D036', dose: 10, doseUnit: '丸', frequency: 'tid', route: 'po', days: 14, instruction: '舌下含服或饭后服用' },
    ],
  },
];

export const RECORD_TEMPLATES: MedicalRecordTemplate[] = [
  {
    templateId: 'RT01', name: '心内科门诊通用模板', scope: 'dept',
    content: {
      presentIllness: '患者因【起病时间】出现【主要症状】，【诱因】下加重/缓解，【伴随症状】，【诊疗经过】。',
      physicalExam: 'T ℃，P 次/分，R 次/分，BP / mmHg。神志清，心肺腹（详见体格检查）。',
      healthEducation: '低盐低脂饮食，规律作息，监测血压心率，不适随诊。',
    },
  },
  {
    templateId: 'RT02', name: '胸痛门诊模板', scope: 'personal',
    content: {
      physicalExam: '生命体征平稳，心肺听诊详见专项。',
      treatment: '完善心电图、心肌酶谱，必要时冠脉 CTA。',
    },
  },
];

/* ------------------------------------------------------------------ */
/* 查询辅助                                                            */
/* ------------------------------------------------------------------ */

export function searchIcd(keyword: string, limit = 20): IcdDiagnosis[] {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return ICD_CATALOG.slice(0, limit);
  return ICD_CATALOG.filter(
    (d) => d.name.toLowerCase().includes(kw) || d.code.toLowerCase().includes(kw),
  ).slice(0, limit);
}

/** 本科室常见诊断（取常用前 10） */
export const COMMON_DIAGNOSES: IcdDiagnosis[] = ICD_CATALOG.slice(0, 10);
