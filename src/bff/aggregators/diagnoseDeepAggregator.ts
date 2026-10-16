/**
 * ============================================================================
 * AI 辅助诊断深化·更多病种与鉴别诊断（M168-A）：诊断深化聚合器
 * ----------------------------------------------------------------------------
 * 【AI深化与智能运营】
 *   在 M154-A（16 病种 Top5）与 M163-C（神经/泌尿/血液/风湿免疫 16 病种）
 *   基础上，继续向「消化 / 呼吸 / 心血管 / 内分泌」四大系统深耕，新增 17 个
 *   临床高频病种，并补齐三件事：
 *     - expandDiagnosisLibrary：病种库可动态扩展（内置 17 种 + 外部追加）；
 *     - improveDifferentialDiagnosis：结合症状/病史/化验结果做鉴别诊断深化，
 *       化验阳性/阴性会直接修正候选可能性；
 *     - suggestTreatmentPlan：按诊断反查一线/备选/生活方式/监测与特殊人群
 *       （老年、妊娠、肝肾功能不全）注意事项；
 *     - checkDiagnosisConsistency：对「医生已下诊断」与症状/化验做一致性核查，
 *       给出支持证据、缺失证据与矛盾点，提示是否需要进一步检查或修正诊断。
 *
 * 内置病种（17 种）：
 *   消化：病毒性肝炎 / 肝硬化失代偿 / 消化性溃疡 / 急性胰腺炎 / 急性胆囊炎
 *   呼吸：支气管哮喘 / 慢性阻塞性肺疾病 / 肺栓塞 / 胸腔积液
 *   心血管：慢性心力衰竭 / 心律失常(房颤) / 心肌病 / 主动脉夹层
 *   内分泌：甲状腺功能亢进 / 甲状腺功能减退 / 肥胖症 / 痛风
 *
 * 医疗安全红线（AI 只是辅助，最终由医生确认）：
 *   - 所有输出均为规则引擎启发式建议，不构成诊断结论；
 *   - 返回体固定携带 disclaimer「辅助诊断，最终由医生确认」；
 *   - 纯函数、无 I/O、无随机（generatedAt 取当前时间），不落库、不写 SQL；
 *   - 药物剂量与禁忌仅作方向性提示，具体处方须由执业医师根据患者实际开具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 专科归属 */
export type DeepSpecialty = '消化' | '呼吸' | '心血管' | '内分泌';

/** 性别 */
export type DeepGender = 'male' | 'female' | '';

/** 生命体征 */
export interface DeepVitals {
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  /** BMI kg/m² */
  bmi?: number;
}

/** 患者特征 */
export interface DeepPatientFeatures {
  age?: number;
  gender?: DeepGender;
  vitals?: DeepVitals;
  /** 合并症，如 ['高血压', '糖尿病', '慢性肾病'] */
  comorbidities?: string[];
  /** 是否妊娠 */
  pregnant?: boolean;
}

/** 单条症状 */
export interface DeepSymptomInput {
  name: string;
  onset?: string;
}

/** 化验结果 */
export interface DeepLabResult {
  /** 化验名，如「丙氨酸氨基转移酶(ALT)」「D-二聚体」「血尿酸」 */
  name: string;
  /** 数值（如无则留空，仅靠 abnormal 判断） */
  value?: number;
  unit?: string;
  /** 异常方向 */
  abnormal?: 'high' | 'low' | 'normal' | 'positive' | 'negative';
}

/* ---------------------------------------------------------------------------
 * 内置病种规则库（启发式权重，非确诊）
 * ------------------------------------------------------------------------ */
interface ExpectedLab {
  /** 化验名关键词 */
  kw: string;
  abnormal: 'high' | 'low' | 'positive';
  label: string;
  /** 命中时给鉴别诊断加的权重 */
  weight: number;
}

interface TreatmentMed {
  name: string;
  role: '一线' | '备选' | '对症';
  note: string;
}

interface DiseaseRule {
  diagnosis: string;
  icd10: string;
  specialty: DeepSpecialty;
  symptoms: Array<{ kw: string; weight: number; label: string }>;
  vitals?: Array<{
    field: keyof DeepVitals;
    op: '>=' | '<=';
    threshold: number;
    weight: number;
    label: string;
  }>;
  ageBand?: { minAge: number; maxAge: number; weight: number; label: string };
  history: Array<{ kw: string; weight: number; label: string }>;
  expectedLabs: ExpectedLab[];
  treatment: {
    meds: TreatmentMed[];
    lifestyle: string[];
    monitoring: string[];
    specialPopulation: string;
  };
  /** 与易混淆疾病的鉴别要点 */
  discriminators: Array<{ with: string; how: string }>;
}

const BUILTIN_DISEASES: DiseaseRule[] = [
  // ===================== 消化系统 =====================
  {
    diagnosis: '病毒性肝炎(乙型/丙型)',
    icd10: 'B18.100',
    specialty: '消化',
    symptoms: [
      { kw: '乏力', weight: 0.25, label: '乏力纳差' },
      { kw: '黄疸', weight: 0.5, label: '皮肤巩膜黄染' },
      { kw: '肝区', weight: 0.35, label: '肝区隐痛/不适' },
      { kw: '尿色', weight: 0.25, label: '尿色加深如浓茶' },
      { kw: '恶心', weight: 0.15, label: '恶心厌油' },
    ],
    expectedLabs: [
      { kw: 'alt', abnormal: 'high', label: 'ALT 显著升高', weight: 0.35 },
      { kw: 'ast', abnormal: 'high', label: 'AST 升高', weight: 0.25 },
      { kw: '胆红素', abnormal: 'high', label: '总胆红素升高', weight: 0.2 },
      { kw: 'hbsag', abnormal: 'positive', label: 'HBsAg 阳性', weight: 0.4 },
      { kw: 'hcv', abnormal: 'positive', label: '抗-HCV 阳性', weight: 0.35 },
    ],
    history: [
      { kw: '乙肝', weight: 0.3, label: '乙肝携带/既往史' },
      { kw: '丙肝', weight: 0.3, label: '丙肝史' },
      { kw: '输血', weight: 0.1, label: '输血/血制品史' },
    ],
    treatment: {
      meds: [
        { name: '恩替卡韦/替诺福韦(乙肝)', role: '一线', note: '抗病毒，需长期抑制病毒复制' },
        { name: '索磷布韦/维帕他韦(丙肝)', role: '一线', note: 'DAA 方案，疗程通常 8~12 周' },
        { name: '还原型谷胱甘肽/多烯磷脂酰胆碱', role: '对症', note: '保肝降酶辅助' },
      ],
      lifestyle: ['严格戒酒', '避免肝损药物(中药/不明保健品)', '清淡饮食、保证休息'],
      monitoring: ['肝功能(ALT/AST/胆红素/白蛋白)', 'HBV-DNA 或 HCV-RNA 病毒载量', '肝脏超声/肝纤维化扫描'],
      specialPopulation: '妊娠乙肝需孕晚期评估病毒载量，必要时替诺福韦母婴阻断；哺乳期避免经肝损药物。',
    },
    discriminators: [
      { with: '药物性肝损伤', how: '药物性肝炎有近期新药/保健品服用史，停药后肝功可恢复，病毒标志物阴性' },
      { with: '肝硬化', how: '肝硬化多有慢性肝病史，伴门脉高压(腹水/脾大/食管胃底静脉曲张)，白蛋白明显降低' },
    ],
  },
  {
    diagnosis: '肝硬化失代偿期',
    icd10: 'K74.100',
    specialty: '消化',
    symptoms: [
      { kw: '腹水', weight: 0.5, label: '腹胀腹水' },
      { kw: '水肿', weight: 0.25, label: '下肢水肿' },
      { kw: '黄疸', weight: 0.3, label: '黄疸' },
      { kw: '呕血', weight: 0.4, label: '呕血/黑便(静脉曲张破裂)' },
      { kw: '肝掌', weight: 0.3, label: '肝掌/蜘蛛痣' },
      { kw: '嗜睡', weight: 0.25, label: '嗜睡/行为异常(肝性脑病)' },
    ],
    expectedLabs: [
      { kw: '白蛋白', abnormal: 'low', label: '白蛋白降低(<35g/L)', weight: 0.35 },
      { kw: 'alt', abnormal: 'high', label: 'ALT/AST 升高', weight: 0.2 },
      { kw: '胆红素', abnormal: 'high', label: '胆红素升高', weight: 0.2 },
      { kw: '血小板', abnormal: 'low', label: '血小板减少(脾亢)', weight: 0.25 },
      { kw: '凝血酶原', abnormal: 'high', label: 'PT 延长', weight: 0.2 },
    ],
    history: [
      { kw: '乙肝', weight: 0.3, label: '慢性乙肝' },
      { kw: '丙肝', weight: 0.25, label: '慢性丙肝' },
      { kw: '饮酒', weight: 0.25, label: '长期饮酒' },
    ],
    treatment: {
      meds: [
        { name: '螺内酯 ± 呋塞米', role: '一线', note: '利尿消腹水，体重下降 0.5kg/天 左右为宜' },
        { name: '恩替卡韦/替诺福韦(乙肝相关)', role: '一线', note: '病因治疗' },
        { name: '乳果糖', role: '对症', note: '防治肝性脑病，酸化肠道' },
        { name: '普萘洛尔/卡维地洛', role: '备选', note: '降低门脉压力、预防出血' },
      ],
      lifestyle: ['低盐饮食(<2g 钠/天)', '软食/防硬食物刺破曲张静脉', '严格戒酒、避免非甾体抗炎药'],
      monitoring: ['体重/腹围', '血氨(肝性脑病)', '肾功能与电解质(利尿剂耐受)', '胃镜筛查静脉曲张'],
      specialPopulation: '老年患者利尿需防低钠/肾前性肾损伤；消化道出血史者慎用 NSAIDs；终末期评估肝移植指征。',
    },
    discriminators: [
      { with: '结核性腹膜炎', how: '结核性腹膜炎腹水为渗出液、ADA 升高，无慢性肝病史与门脉高压体征' },
      { with: '右心衰竭', how: '心衰性腹水伴颈静脉怒张、肝颈回流征阳性、BNP 升高，肝脏为淤血性而非硬变' },
    ],
  },
  {
    diagnosis: '消化性溃疡(胃/十二指肠)',
    icd10: 'K27.900',
    specialty: '消化',
    symptoms: [
      { kw: '上腹痛', weight: 0.4, label: '慢性周期性上腹痛' },
      { kw: '空腹痛', weight: 0.4, label: '空腹痛/夜间痛(十二指肠)' },
      { kw: '餐后痛', weight: 0.35, label: '餐后半小时痛(胃溃疡)' },
      { kw: '黑便', weight: 0.3, label: '黑便/便潜血阳性' },
      { kw: '反酸', weight: 0.2, label: '反酸嗳气' },
    ],
    expectedLabs: [
      { kw: '便潜血', abnormal: 'positive', label: '便潜血阳性', weight: 0.3 },
      { kw: 'hp', abnormal: 'positive', label: '幽门螺杆菌阳性', weight: 0.35 },
      { kw: '血红蛋白', abnormal: 'low', label: '慢性失血致贫血', weight: 0.2 },
    ],
    history: [
      { kw: 'nsaid', weight: 0.25, label: '长期服用阿司匹林/NSAIDs' },
      { kw: '吸烟', weight: 0.1, label: '吸烟' },
    ],
    treatment: {
      meds: [
        { name: '艾司奥美拉唑/雷贝拉唑(PPI)', role: '一线', note: '抑酸，胃溃疡 6~8 周、十二指肠 4~6 周' },
        { name: 'PPI + 铋剂 + 两种抗生素(根除 Hp)', role: '一线', note: 'Hp 阳性者四联疗法 14 天' },
        { name: '铝碳酸镁/硫糖铝', role: '对症', note: '黏膜保护' },
      ],
      lifestyle: ['规律进餐、避免辛辣刺激', '戒烟酒、停用不必要 NSAIDs', '避免熬夜与精神紧张'],
      monitoring: ['疗程结束后复查胃镜(胃溃疡必须复查)', 'Hp 根除后 4 周复查 C13/C14 呼气试验'],
      specialPopulation: '老年/抗凝(阿司匹林)患者出血风险高，需评估继续抗血小板的获益与风险；孕哺期首选 PPI 为奥美拉唑相对安全。',
    },
    discriminators: [
      { with: '慢性胃炎', how: '胃炎无典型周期性节律痛、胃镜无黏膜缺损；溃疡有明确凹脐覆白苔' },
      { with: '胃癌', how: '胃癌疼痛无规律、进行性消瘦、大便潜血持续阳性，胃镜活检可鉴别' },
    ],
  },
  {
    diagnosis: '急性胰腺炎',
    icd10: 'K85.900',
    specialty: '消化',
    symptoms: [
      { kw: '腹痛', weight: 0.3, label: '中上腹持续性剧痛' },
      { kw: '腰背部', weight: 0.45, label: '向腰背部放射' },
      { kw: '呕吐', weight: 0.3, label: '频繁呕吐不缓解' },
      { kw: '饮酒', weight: 0.2, label: '饮酒/暴饮暴食后' },
      { kw: '发热', weight: 0.15, label: '发热' },
    ],
    vitals: [
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
      { field: 'temperature', op: '>=', threshold: 37.5, weight: 0.1, label: '发热' },
    ],
    expectedLabs: [
      { kw: '淀粉酶', abnormal: 'high', label: '血淀粉酶≥3 倍上限', weight: 0.4 },
      { kw: '脂肪酶', abnormal: 'high', label: '脂肪酶升高(更特异)', weight: 0.4 },
      { kw: '血钙', abnormal: 'low', label: '低血钙(重症预后差)', weight: 0.15 },
    ],
    history: [
      { kw: '胆结石', weight: 0.25, label: '胆源性(胆囊/胆管结石)' },
      { kw: '饮酒', weight: 0.2, label: '酒精性' },
    ],
    treatment: {
      meds: [
        { name: '禁食 + 静脉补液', role: '一线', note: '重度患者早期液体复苏，目前倾向早期肠内营养' },
        { name: '生长抑素/奥曲肽', role: '一线', note: '抑制胰酶分泌' },
        { name: '哌替啶/布桂嗪镇痛', role: '对症', note: '禁用吗啡(可致 Oddi 括约肌痉挛)' },
        { name: '头孢类 + 甲硝唑', role: '备选', note: '胆源性或重症感染时使用' },
      ],
      lifestyle: ['急性期禁食禁水', '恢复后严格限酒、低脂饮食', '胆源性者择期胆囊切除'],
      monitoring: ['淀粉酶/脂肪酶动态', '血钙/血糖/乳酸(严重度)', '腹部 CT 评估坏死', '尿量与循环'],
      specialPopulation: '老年重症胰腺炎死亡率高，需 ICU 监护；孕妇急性胰腺炎需产科与消化协同。',
    },
    discriminators: [
      { with: '消化道溃疡穿孔', how: '穿孔有膈下游离气体、板状腹，淀粉酶一般不超过 3 倍；胰腺炎淀粉酶/脂肪酶显著升高' },
      { with: '急性胆囊炎', how: '胆囊炎右上腹为主、Murphy 征阳性，无腰背部放射及显著淀粉酶升高' },
    ],
  },
  {
    diagnosis: '急性胆囊炎',
    icd10: 'K81.000',
    specialty: '消化',
    symptoms: [
      { kw: '右上腹痛', weight: 0.5, label: '右上腹绞痛/持续性痛' },
      { kw: '恶心', weight: 0.2, label: '恶心呕吐' },
      { kw: '发热', weight: 0.25, label: '发热' },
      { kw: '油腻', weight: 0.25, label: '油腻饮食诱发' },
      { kw: '右肩', weight: 0.2, label: '向右肩背放射' },
    ],
    vitals: [{ field: 'temperature', op: '>=', threshold: 37.5, weight: 0.1, label: '发热' }],
    expectedLabs: [
      { kw: '白细胞', abnormal: 'high', label: 'WBC 升高', weight: 0.25 },
      { kw: 'alt', abnormal: 'high', label: 'ALT/ALP 升高(胆道梗阻)', weight: 0.2 },
    ],
    history: [{ kw: '胆结石', weight: 0.3, label: '胆囊结石史' }],
    treatment: {
      meds: [
        { name: '头孢类/喹诺酮 + 甲硝唑', role: '一线', note: '覆盖革兰阴性菌与厌氧菌' },
        { name: '山莨菪碱/间苯三酚', role: '对症', note: '解痉镇痛' },
      ],
      lifestyle: ['急性期禁食、静脉营养', '缓解后低脂饮食', '择期腹腔镜胆囊切除'],
      monitoring: ['体温/WBC', '腹部超声(胆囊壁厚度/结石)', '胆红素/ALP(胆管梗阻)'],
      specialPopulation: '老年患者症状不典型，可无发热但坏疽穿孔风险高；糖尿病患者感染易扩散。',
    },
    discriminators: [
      { with: '急性胰腺炎', how: '胰腺炎腹痛向腰背放射、淀粉酶显著升高；胆囊炎 Murphy 征阳性' },
      { with: '消化性溃疡', how: '溃疡为慢性节律痛，与油腻饮食无关，超声无胆囊炎症征象' },
    ],
  },

  // ===================== 呼吸系统 =====================
  {
    diagnosis: '支气管哮喘',
    icd10: 'J45.900',
    specialty: '呼吸',
    symptoms: [
      { kw: '喘息', weight: 0.5, label: '反复发作性喘息' },
      { kw: '呼吸困难', weight: 0.25, label: '呼气性呼吸困难' },
      { kw: '夜间', weight: 0.2, label: '夜间/接触过敏原后发作' },
      { kw: '咳嗽', weight: 0.15, label: '咳嗽变异性哮喘' },
    ],
    vitals: [{ field: 'spo2', op: '<=', threshold: 93, weight: 0.15, label: '发作时低氧' }],
    expectedLabs: [
      { kw: '嗜酸', abnormal: 'high', label: '嗜酸性粒细胞升高', weight: 0.25 },
      { kw: 'ige', abnormal: 'high', label: '总 IgE 升高', weight: 0.2 },
    ],
    history: [
      { kw: '哮喘', weight: 0.35, label: '既往哮喘史' },
      { kw: '过敏', weight: 0.2, label: '过敏性鼻炎/湿疹' },
    ],
    treatment: {
      meds: [
        { name: '吸入性糖皮质激素(布地奈德/氟替卡松)', role: '一线', note: '长期控制基础用药' },
        { name: '短效 β2 激动剂(沙丁胺醇)', role: '一线', note: '急性缓解按需使用' },
        { name: '孟鲁司特', role: '备选', note: '合并过敏性鼻炎/运动性哮喘' },
        { name: '全身激素(泼尼松)', role: '对症', note: '中重度急性发作短期使用' },
      ],
      lifestyle: ['避免过敏原(尘螨/花粉/冷空气)', '戒烟、避免二手烟', '规律运动、流感疫苗接种'],
      monitoring: ['峰流速(PEF)日记', 'ACT 哮喘控制评分', '定期肺功能复查'],
      specialPopulation: '妊娠哮喘需持续控制(未控制哮喘危害大于激素)，首选吸入剂型；老年患者注意 β 激动剂心悸。',
    },
    discriminators: [
      { with: '慢性阻塞性肺疾病', how: 'COPD 多为长期吸烟中老年、持续气流受限不可逆；哮喘有过敏史、发作性、可逆' },
      { with: '心源性哮喘(左心衰)', how: '心源性哮喘有夜间阵发性呼吸困难、粉红色泡沫痰、BNP 升高，坐起后缓解' },
    ],
  },
  {
    diagnosis: '慢性阻塞性肺疾病(急性加重)',
    icd10: 'J44.100',
    specialty: '呼吸',
    symptoms: [
      { kw: '咳痰', weight: 0.25, label: '长期慢性咳痰' },
      { kw: '气促', weight: 0.4, label: '活动后气促进行性加重' },
      { kw: '呼吸困难', weight: 0.2, label: '呼吸困难' },
      { kw: '吸烟', weight: 0.15, label: '长期重度吸烟' },
    ],
    vitals: [
      { field: 'spo2', op: '<=', threshold: 92, weight: 0.2, label: 'SpO₂≤92%' },
    ],
    ageBand: { minAge: 50, maxAge: 150, weight: 0.1, label: '中老年好发' },
    expectedLabs: [
      { kw: '动脉血气', abnormal: 'high', label: 'PaCO₂ 升高(Ⅱ型呼衰)', weight: 0.25 },
    ],
    history: [
      { kw: 'copd', weight: 0.35, label: '既往 COPD' },
      { kw: '吸烟', weight: 0.2, label: '长期吸烟' },
    ],
    treatment: {
      meds: [
        { name: '长效支气管扩张剂(LABA+LAMA)', role: '一线', note: '稳定期基础治疗' },
        { name: '短效 β2 激动剂 + 异丙托溴铵雾化', role: '一线', note: '急性加重期' },
        { name: '全身激素(甲泼尼龙)', role: '一线', note: '急性加重短期 5 天' },
        { name: '抗生素(阿莫西林克拉维酸)', role: '备选', note: '痰量增多/脓痰时使用' },
        { name: '长期家庭氧疗', role: '一线', note: '慢性呼衰者 ≥15h/天' },
      ],
      lifestyle: ['彻底戒烟(最重要干预)', '康复训练(缩唇/腹式呼吸)', '流感/肺炎球菌疫苗'],
      monitoring: ['肺功能 FEV1/FVC 与 FEV1%', '动脉血气(CO₂ 潴留)', 'mMRC/CAT 评分'],
      specialPopulation: '老年患者慎用镇静药防呼吸抑制；Ⅱ型呼衰低流量吸氧(1~2L/min)，避免高浓度氧加重 CO₂ 潴留。',
    },
    discriminators: [
      { with: '支气管哮喘', how: '哮喘年轻/过敏体质、发作性可逆；COPD 中老年吸烟、持续气流受限' },
      { with: '肺炎', how: '肺炎急性起病、发热脓痰、影像实变；COPD 为慢性基础上急性加重' },
    ],
  },
  {
    diagnosis: '急性肺栓塞',
    icd10: 'I26.900',
    specialty: '呼吸',
    symptoms: [
      { kw: '呼吸困难', weight: 0.45, label: '突发不明原因呼吸困难' },
      { kw: '胸痛', weight: 0.3, label: '胸膜性胸痛' },
      { kw: '咯血', weight: 0.4, label: '咯血' },
      { kw: '晕厥', weight: 0.25, label: '晕厥/低血压' },
    ],
    vitals: [
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.15, label: '心动过速' },
      { field: 'spo2', op: '<=', threshold: 93, weight: 0.2, label: '低氧' },
    ],
    expectedLabs: [
      { kw: 'd-二聚体', abnormal: 'high', label: 'D-二聚体升高', weight: 0.3 },
      { kw: '血气', abnormal: 'low', label: '低氧/低碳酸血症', weight: 0.15 },
    ],
    history: [
      { kw: '手术', weight: 0.15, label: '近期手术/卧床' },
      { kw: '肿瘤', weight: 0.1, label: '肿瘤高凝状态' },
      { kw: '下肢静脉', weight: 0.2, label: '下肢深静脉血栓史' },
      { kw: '妊娠', weight: 0.1, label: '妊娠/产褥期' },
    ],
    treatment: {
      meds: [
        { name: '低分子肝素', role: '一线', note: '初始抗凝，桥接口服抗凝' },
        { name: '利伐沙班/阿哌沙班(DOAC)', role: '一线', note: '无需常规监测 INR' },
        { name: '华法林', role: '备选', note: '合并严重肾功能不全/机械瓣患者' },
        { name: 'rt-PA 溶栓', role: '对症', note: '高危(休克/低血压)患者评估后使用' },
      ],
      lifestyle: ['术后/卧床早期下床活动', '长途旅行定时活动下肢', '戒烟、控制体重'],
      monitoring: ['生命体征/血氧', 'D-二聚体动态', '抗凝出血风险', '下肢静脉超声随访'],
      specialPopulation: '孕妇抗凝首选低分子肝素(DOAC 致畸)；老年/肾功能不全需调整剂量；活动性出血为抗凝禁忌。',
    },
    discriminators: [
      { with: '急性冠脉综合征', how: 'ACS 心电图 ST-T 动态演变、肌钙蛋白升高；肺栓塞 CTPA 见充盈缺损、心电图 SⅠQⅢTⅢ' },
      { with: '主动脉夹层', how: '夹层为撕裂样胸背痛向腹部移行、双上肢血压差>20mmHg，CTA 见内膜片' },
    ],
  },
  {
    diagnosis: '胸腔积液',
    icd10: 'J90.x00',
    specialty: '呼吸',
    symptoms: [
      { kw: '呼吸困难', weight: 0.4, label: '患侧呼吸困难' },
      { kw: '胸痛', weight: 0.25, label: '刺痛/随呼吸加重' },
      { kw: '咳嗽', weight: 0.15, label: '干咳' },
      { kw: '发热', weight: 0.2, label: '发热(感染性)' },
      { kw: '消瘦', weight: 0.2, label: '消瘦盗汗(结核/肿瘤)' },
    ],
    vitals: [{ field: 'spo2', op: '<=', threshold: 93, weight: 0.15, label: '低氧(中大量积液)' }],
    expectedLabs: [],
    history: [
      { kw: '结核', weight: 0.25, label: '结核史/接触史' },
      { kw: '肿瘤', weight: 0.2, label: '肿瘤史' },
      { kw: '心衰', weight: 0.2, label: '心衰(漏出液)' },
    ],
    treatment: {
      meds: [
        { name: '胸腔穿刺抽液/闭式引流', role: '一线', note: '缓解压迫、送检明确性质' },
        { name: '异烟肼+利福平+乙胺丁醇+吡嗪酰胺', role: '一线', note: '结核性胸膜炎抗结核治疗' },
        { name: '利尿剂', role: '备选', note: '心衰相关性漏出液' },
      ],
      lifestyle: ['戒烟、加强营养', '结核性者规范抗结核 6~9 个月', '肿瘤性者抗肿瘤治疗'],
      monitoring: ['胸片/超声评估积液量', '胸水常规/生化/细胞学/ADA', '原发灶追踪'],
      specialPopulation: '老年患者抽液不宜过快过多(<1000mL/次)防复张性肺水肿；孕妇尽量避免放射检查，以超声为主。',
    },
    discriminators: [
      { with: '气胸', how: '气胸患侧叩鼓音、气管向健侧移位，X 线见无肺纹理透光影；积液为浊音、气管向健侧移位' },
      { with: '慢性阻塞性肺疾病', how: 'COPD 为弥漫性通气障碍，无单侧叩浊与积液影像' },
    ],
  },

  // ===================== 心血管系统 =====================
  {
    diagnosis: '慢性心力衰竭',
    icd10: 'I50.900',
    specialty: '心血管',
    symptoms: [
      { kw: '呼吸困难', weight: 0.4, label: '活动后气促/夜间阵发性呼吸困难' },
      { kw: '端坐呼吸', weight: 0.4, label: '端坐呼吸' },
      { kw: '水肿', weight: 0.35, label: '下肢凹陷性水肿' },
      { kw: '咳', weight: 0.15, label: '咳粉红色泡沫痰(急性左心衰)' },
      { kw: '乏力', weight: 0.15, label: '乏力运动耐量下降' },
    ],
    vitals: [
      { field: 'spo2', op: '<=', threshold: 93, weight: 0.15, label: '低氧' },
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
    ],
    expectedLabs: [
      { kw: 'bnp', abnormal: 'high', label: 'BNP/NT-proBNP 升高', weight: 0.4 },
      { kw: '肌钙蛋白', abnormal: 'high', label: '肌钙蛋白轻度升高(心肌损伤)', weight: 0.15 },
    ],
    history: [
      { kw: '高血压', weight: 0.2, label: '高血压性心脏病' },
      { kw: '冠心病', weight: 0.2, label: '缺血性心肌病' },
      { kw: '糖尿病', weight: 0.1, label: '糖尿病' },
    ],
    treatment: {
      meds: [
        { name: 'ARNI(沙库巴曲缬沙坦)/ACEI/ARB', role: '一线', note: '改善预后基石' },
        { name: 'β 受体阻滞剂(美托洛尔缓释片)', role: '一线', note: '心衰稳定后起始、逐步滴定' },
        { name: '醛固酮受体拮抗剂(螺内酯)', role: '一线', note: '加用改善预后' },
        { name: 'SGLT2i(达格列净/恩格列净)', role: '一线', note: '无论糖尿病与否均推荐' },
        { name: '袢利尿剂(呋塞米)', role: '对症', note: '缓解淤血症状、容量管理' },
      ],
      lifestyle: ['限盐(<5g/天)限水', '每日体重监测(晨起空腹)', '适度活动、避免过劳与情绪激动', '戒烟酒'],
      monitoring: ['体重/水肿', 'BNP/NT-proBNP', '心脏超声 EF', '电解质与肾功能(RAAS/利尿剂)'],
      specialPopulation: '老年患者起始剂量减半、缓慢加量；肾功能不全者监测肌酐与钾；孕妇心衰需产科协同。',
    },
    discriminators: [
      { with: '支气管哮喘', how: '哮喘有过敏/喘息史、无夜间阵发性呼吸困难与 BNP 升高；心衰有心脏病史、端坐呼吸' },
      { with: '慢性阻塞性肺疾病', how: 'COPD 有长期吸烟史、低氧伴 CO₂ 潴留；心衰 BNP 升高、湿啰音与下肢水肿' },
    ],
  },
  {
    diagnosis: '心律失常(心房颤动)',
    icd10: 'I48.900',
    specialty: '心血管',
    symptoms: [
      { kw: '心悸', weight: 0.5, label: '心悸/心慌' },
      { kw: '脉搏不齐', weight: 0.35, label: '脉搏短绌/绝对不齐' },
      { kw: '黑蒙', weight: 0.25, label: '黑蒙' },
      { kw: '晕厥', weight: 0.25, label: '晕厥' },
      { kw: '胸闷', weight: 0.15, label: '胸闷' },
    ],
    vitals: [{ field: 'heartRate', op: '>=', threshold: 110, weight: 0.15, label: '心率>110(快速心室率)' }],
    expectedLabs: [
      { kw: '甲状腺', abnormal: 'high', label: '甲亢(排查可逆病因)', weight: 0.15 },
    ],
    history: [
      { kw: '高血压', weight: 0.15, label: '高血压' },
      { kw: '甲亢', weight: 0.15, label: '甲亢史' },
      { kw: '冠心病', weight: 0.1, label: '冠心病' },
    ],
    treatment: {
      meds: [
        { name: 'β 受体阻滞剂/地尔硫卓', role: '一线', note: '控制心室率' },
        { name: '利伐沙班/达比加群/华法林', role: '一线', note: 'CHA₂DS₂-VASc≥2(男)/≥3(女)抗凝' },
        { name: '胺碘酮', role: '备选', note: '转复窦律(结构性心脏病可用)' },
        { name: '射频消融', role: '备选', note: '症状性阵发性房颤一线根治性策略' },
      ],
      lifestyle: ['避免咖啡因/酒精/熬夜', '控制体重、治疗睡眠呼吸暂停', '规律监测脉搏与血压'],
      monitoring: ['12 导联心电图/动态心电图', 'CHA₂DS₂-VASc 与 HAS-BLED 评分', 'INR(华法林者)'],
      specialPopulation: '老年患者抗凝首选 DOAC(按肾功能)；孕妇禁用华法林(致畸)，可用低分子肝素；肥厚型心肌病合并房颤需积极抗凝。',
    },
    discriminators: [
      { with: '频发室性早搏', how: '早搏为联律间期固定的提前搏动，房颤为绝对不齐、无 P 波；心电图可鉴别' },
      { with: '甲状腺功能亢进', how: '甲亢为病因(可继发房颤)，甲功 TSH 低、FT3/FT4 高，治疗甲亢后房颤可转复' },
    ],
  },
  {
    diagnosis: '心肌病(扩张型/肥厚型)',
    icd10: 'I42.900',
    specialty: '心血管',
    symptoms: [
      { kw: '呼吸困难', weight: 0.3, label: '进行性呼吸困难' },
      { kw: '水肿', weight: 0.25, label: '下肢水肿' },
      { kw: '心悸', weight: 0.2, label: '心悸' },
      { kw: '晕厥', weight: 0.3, label: '活动后晕厥(高危)' },
      { kw: '家族', weight: 0.25, label: '猝死家族史' },
    ],
    expectedLabs: [
      { kw: 'bnp', abnormal: 'high', label: 'BNP 升高', weight: 0.25 },
      { kw: '肌钙蛋白', abnormal: 'high', label: '肌钙蛋白升高(心肌损伤)', weight: 0.15 },
    ],
    history: [{ kw: '家族', weight: 0.25, label: '家族性心肌病/猝死史' }],
    treatment: {
      meds: [
        { name: 'ARNI/ACEI + β 阻滞剂 + MRA + SGLT2i', role: '一线', note: '扩张型心肌病指南四联改善预后' },
        { name: '非二氢吡啶钙拮抗剂(维拉帕米)', role: '备选', note: '肥厚型梗阻性心肌病改善舒张' },
        { name: 'ICD 植入', role: '备选', note: '猝死高危一级/二级预防' },
      ],
      lifestyle: ['避免竞技性/剧烈运动', '限制饮酒(酒精性心肌病)', '家族成员基因筛查'],
      monitoring: ['心脏超声(EF/室壁厚度)', '动态心电图(室速)', 'BNP', '猝死风险分层'],
      specialPopulation: '肥厚型心肌病患者避免使用增强心肌收缩力药物(洋地黄/多巴胺)；孕妇围产期心肌病需产科协同。',
    },
    discriminators: [
      { with: '冠心病缺血性心肌病', how: '冠心病有典型心绞痛/既往心梗，冠脉造影见狭窄；心肌病为心肌本身病变、冠脉无明显狭窄' },
      { with: '瓣膜性心脏病', how: '瓣膜病有明确心脏杂音与超声瓣膜结构异常，而非心肌本身运动异常' },
    ],
  },
  {
    diagnosis: '主动脉夹层',
    icd10: 'I71.000',
    specialty: '心血管',
    symptoms: [
      { kw: '撕裂', weight: 0.5, label: '突发撕裂样胸背痛' },
      { kw: '胸痛', weight: 0.3, label: '胸痛达峰极快(数分钟)' },
      { kw: '背痛', weight: 0.3, label: '向腹部/腰部移行' },
      { kw: '高血压', weight: 0.25, label: '既往高血压控制不佳' },
    ],
    vitals: [
      { field: 'systolic', op: '>=', threshold: 180, weight: 0.25, label: '血压显著升高' },
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
    ],
    expectedLabs: [],
    history: [{ kw: '高血压', weight: 0.3, label: '长期未控制高血压' }],
    treatment: {
      meds: [
        { name: '静脉 β 阻滞剂(艾司洛尔/美托洛尔)', role: '一线', note: '首选，先降心率<60 次/分' },
        { name: '静脉硝普钠/尼卡地平', role: '一线', note: '血压仍高时联合，目标 SBP 100~120' },
        { name: '急诊外科/介入修复', role: '一线', note: 'Stanford A 型必须手术；B 型可腔内修复' },
      ],
      lifestyle: ['严格控制血压', '避免剧烈运动与情绪激动', '定期主动脉影像随访'],
      monitoring: ['有创动脉压', '双上肢血压差(>20mmHg 提示)', '主动脉 CTA 确诊', '器官灌注(肾/肠/肢体)'],
      specialPopulation: '孕妇(尤其产前)为高危人群，需多学科协同；老年患者血管脆性高，镇痛同时控制血压。',
    },
    discriminators: [
      { with: '急性心肌梗死', how: '心梗胸痛逐渐加重(数分钟到数小时)、心电图动态演变、肌钙蛋白升高；夹层 CTA 见内膜片' },
      { with: '急性肺栓塞', how: '肺栓塞以呼吸困难/咯血/低氧为主，无撕裂样背痛与双上肢血压差' },
    ],
  },

  // ===================== 内分泌系统 =====================
  {
    diagnosis: '甲状腺功能亢进(Graves 病)',
    icd10: 'E05.900',
    specialty: '内分泌',
    symptoms: [
      { kw: '心悸', weight: 0.3, label: '心悸' },
      { kw: '多汗', weight: 0.35, label: '怕热多汗' },
      { kw: '消瘦', weight: 0.3, label: '食欲亢进但消瘦' },
      { kw: '手抖', weight: 0.35, label: '双手细震颤' },
      { kw: '突眼', weight: 0.4, label: '突眼/眼睑退缩' },
      { kw: '易怒', weight: 0.15, label: '情绪易怒' },
    ],
    vitals: [{ field: 'heartRate', op: '>=', threshold: 100, weight: 0.15, label: '静息心动过速' }],
    expectedLabs: [
      { kw: 'tsh', abnormal: 'low', label: 'TSH 降低', weight: 0.4 },
      { kw: 'ft3', abnormal: 'high', label: 'FT3/FT4 升高', weight: 0.4 },
      { kw: 'trab', abnormal: 'positive', label: 'TRAb 阳性(Graves)', weight: 0.25 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: '甲巯咪唑', role: '一线', note: '抗甲状腺药物，疗程 12~18 个月' },
        { name: '普萘洛尔', role: '对症', note: '控制心悸/手抖，起始短期使用' },
        { name: '¹³¹I 治疗', role: '备选', note: '药物复发/过敏/中老年合并心脏病者' },
        { name: '甲状腺次全切除', role: '备选', note: '巨大甲状腺压迫/疑恶性者' },
      ],
      lifestyle: ['低碘饮食(忌海带/紫菜/加碘盐)', '休息、避免精神刺激', '戒烟(加重突眼)'],
      monitoring: ['甲功(TSH/FT3/FT4)调整剂量', '血常规与肝功能(甲巯咪唑副作用)', '突眼度评估'],
      specialPopulation: '妊娠甲亢首选丙硫氧嘧啶(孕早期)或甲巯咪唑，需严格控制以防流产/胎儿甲亢；哺乳期可低剂量甲巯咪唑。',
    },
    discriminators: [
      { with: '单纯性焦虑', how: '焦虑无甲功异常、无突眼与高代谢综合征，TSH/FT3/FT4 正常' },
      { with: '桥本甲状腺炎(一过性甲亢期)', how: '桥本甲亢期 TPOAb/TgAb 阳性、摄碘率低，多为自限性' },
    ],
  },
  {
    diagnosis: '甲状腺功能减退(桥本)',
    icd10: 'E03.900',
    specialty: '内分泌',
    symptoms: [
      { kw: '乏力', weight: 0.4, label: '乏力嗜睡' },
      { kw: '怕冷', weight: 0.45, label: '怕冷少汗' },
      { kw: '水肿', weight: 0.3, label: '颜面黏液性水肿' },
      { kw: '便秘', weight: 0.25, label: '便秘' },
      { kw: '脱发', weight: 0.2, label: '脱发/皮肤干燥' },
      { kw: '体重', weight: 0.2, label: '体重增加' },
    ],
    expectedLabs: [
      { kw: 'tsh', abnormal: 'high', label: 'TSH 升高', weight: 0.4 },
      { kw: 'ft4', abnormal: 'low', label: 'FT4 降低', weight: 0.35 },
      { kw: 'tpoab', abnormal: 'positive', label: 'TPOAb 阳性(桥本)', weight: 0.25 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: '左甲状腺素(L-T4)', role: '一线', note: '晨起空腹半小时服用，从小剂量起始逐渐加量' },
      ],
      lifestyle: ['规律作息、注意保暖', '适量补碘(非过量)', '低脂饮食(常伴血脂异常)'],
      monitoring: ['甲功(TSH/FT4)调量期 4~6 周复查', '血脂(治疗后复查)', '妊娠需 TSH 更严格控制'],
      specialPopulation: '孕妇 TSH 目标按孕周分层(早期<2.5mIU/L)；老年/冠心病患者起始剂量宜小、缓慢加量防诱发心绞痛。',
    },
    discriminators: [
      { with: '慢性肾炎', how: '肾炎有蛋白尿/血尿、肾性水肿为凹陷性；甲减为黏液性(非凹陷)、TSH 升高' },
      { with: '抑郁症', how: '抑郁无 TSH 升高与黏液性水肿；甲减可有抑郁表现，但甲功异常为客观证据' },
    ],
  },
  {
    diagnosis: '肥胖症(BMI≥28)',
    icd10: 'E66.900',
    specialty: '内分泌',
    symptoms: [
      { kw: '体重', weight: 0.3, label: '体重明显增加' },
      { kw: '腰围', weight: 0.25, label: '男性腰围≥90/女性≥85cm' },
      { kw: '打鼾', weight: 0.25, label: '打鼾/睡眠呼吸暂停' },
      { kw: '气促', weight: 0.15, label: '活动后气促' },
    ],
    vitals: [
      { field: 'bmi', op: '>=', threshold: 28, weight: 0.5, label: 'BMI≥28' },
    ],
    expectedLabs: [
      { kw: '血糖', abnormal: 'high', label: '血糖/糖化升高', weight: 0.2 },
      { kw: '甘油三酯', abnormal: 'high', label: '甘油三酯升高', weight: 0.15 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: '司美格鲁肽/利拉鲁肽(GLP-1 RA)', role: '一线', note: '在生活方式基础上 BMI≥28 或≥24 伴合并症' },
        { name: '奥利司他', role: '备选', note: '脂肪酶抑制剂，随餐服用' },
        { name: '代谢手术(袖状胃)', role: '备选', note: 'BMI≥32.5 或≥27.5 伴严重合并症、保守治疗失败' },
      ],
      lifestyle: ['低热量均衡饮食(每日缺口 500~750kcal)', '中等强度有氧运动 150~300min/周', ' resistance training 增肌', '睡眠 7~8h'],
      monitoring: ['体重/腰围/血压', '血糖/糖化/血脂/肝功', 'BMI 与合并症(糖尿病/高血压/OSA)'],
      specialPopulation: '孕妇/哺乳期不推荐减重药物；青少年以生活方式为主；老年防肌少症，减重不宜过快。',
    },
    discriminators: [
      { with: '库欣综合征', how: '库欣为向心性肥胖、紫纹、高血压、高血糖，血/尿皮质醇升高；单纯肥胖为均匀性' },
      { with: '甲状腺功能减退', how: '甲减伴怕冷/便秘/TSH 升高；肥胖症甲功正常，为热量摄入过多所致' },
    ],
  },
  {
    diagnosis: '痛风(急性关节炎期)',
    icd10: 'M10.000',
    specialty: '内分泌',
    symptoms: [
      { kw: '关节痛', weight: 0.3, label: '单关节红肿热痛' },
      { kw: '跖趾', weight: 0.5, label: '第一跖趾关节突发剧痛' },
      { kw: '夜间', weight: 0.2, label: '夜间/凌晨痛醒' },
      { kw: '发热', weight: 0.15, label: '低热' },
      { kw: '饮酒', weight: 0.2, label: '饮酒/高嘌呤饮食后诱发' },
    ],
    expectedLabs: [
      { kw: '尿酸', abnormal: 'high', label: '血尿酸升高(>420μmol/L)', weight: 0.4 },
      { kw: '白细胞', abnormal: 'high', label: 'WBC 轻度升高(炎症)', weight: 0.1 },
    ],
    history: [
      { kw: '痛风', weight: 0.35, label: '既往痛风发作' },
      { kw: '高血压', weight: 0.1, label: '高血压(常伴代谢综合征)' },
    ],
    treatment: {
      meds: [
        { name: 'NSAIDs(依托考昔/塞来昔布)', role: '一线', note: '急性期首选，尽早足量' },
        { name: '秋水仙碱', role: '一线', note: '急性期小剂量使用，发作 24h 内最佳' },
        { name: '糖皮质激素', role: '备选', note: 'NSAIDs/秋水仙碱不耐受者' },
        { name: '别嘌醇/非布司他', role: '一线', note: '缓解期降尿酸，目标<360μmol/L' },
      ],
      lifestyle: ['低嘌呤饮食(忌动物内脏/海鲜/浓汤)', '严格戒酒(啤酒/白酒)', '每日饮水 2000mL 以上', '控制体重'],
      monitoring: ['血尿酸(降尿酸期每 2~4 周)', '肾功能(别嘌醇/非布司他)', '关节超声/双能 CT 评估尿酸盐结晶'],
      specialPopulation: '老年/肾功能不全者 NSAIDs 慎用、秋水仙碱减量；孕妇哺乳期急性期首选小剂量泼尼松；别嘌醇汉族人建议 HLA-B*5801 筛查防严重皮疹。',
    },
    discriminators: [
      { with: '化脓性关节炎', how: '化脓性关节炎全身中毒症状重、关节液培养阳性、血尿酸不高；痛风以第一跖趾关节突发、高尿酸' },
      { with: '假性痛风(焦磷酸钙沉积)', how: '假性痛风好发于膝等大关节、X 线见软骨钙化，血尿酸可正常' },
    ],
  },
];

/* ------------------------------ 工具函数 ------------------------------ */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `deepv2_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

const DISCLAIMER =
  '本建议由 AI 规则引擎基于症状/病史/化验启发式生成，仅供临床参考，不构成诊断结论；辅助诊断，最终由医生确认。';

function textOfSymptoms(symptoms: Array<{ name: string; onset?: string }>): string {
  return (symptoms ?? [])
    .map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`)
    .join(' ')
    .toLowerCase();
}

function textOfHistory(history: string[] | { chronicDiseases?: string[]; notes?: string }): string {
  if (Array.isArray(history)) return history.join(' ').toLowerCase();
  const h = history ?? {};
  return [...(h.chronicDiseases ?? []), h.notes ?? ''].join(' ').toLowerCase();
}

function labText(labs: DeepLabResult[]): Array<{ kw: string; abnormal: string; name: string }> {
  return (labs ?? []).map((l) => ({
    kw: (l?.name ?? '').toLowerCase(),
    abnormal: (l?.abnormal ?? '').toLowerCase(),
    name: l?.name ?? '',
  }));
}

/** 化验是否命中某条 expectedLab（名称关键词 + 异常方向） */
function matchLab(
  labs: Array<{ kw: string; abnormal: string; name: string }>,
  expected: ExpectedLab,
): { hit: boolean; conflict: boolean; label: string } {
  for (const l of labs) {
    if (l.kw.includes(expected.kw)) {
      if (l.abnormal === expected.abnormal) return { hit: true, conflict: false, label: expected.label };
      // 有该化验但方向相反（预期高/阳性，实际正常/低/阴性）—— 矛盾信号
      if (l.abnormal === 'normal' || l.abnormal === 'negative' || l.abnormal === 'low') {
        return { hit: false, conflict: true, label: expected.label };
      }
    }
  }
  return { hit: false, conflict: false, label: expected.label };
}

/* ===========================================================================
 * 1. expandDiagnosisLibrary —— 病种库继续扩展
 * ======================================================================== */
export interface ExpandedDiseaseMeta {
  diagnosis: string;
  icd10: string;
  specialty: DeepSpecialty;
}

export interface ExpandedLibrary {
  /** 合并后的全量病种数 */
  total: number;
  /** 各专科病种数 */
  bySpecialty: Record<DeepSpecialty, number>;
  /** 全部病种元数据 */
  diseases: ExpandedDiseaseMeta[];
  /** 本次外部追加数 */
  added: number;
  disclaimer: string;
}

/**
 * 病种库扩展（纯函数）：
 *   以内置 17 种为底座，合并外部追加的病种（按 diagnosis 名去重）。
 *
 * @param newDiseases 外部追加病种元数据；可携带 treatment / expectedLabs 等
 *                    丰富字段（本函数只做登记与去重，不做临床推理）。
 */
export function expandDiagnosisLibrary(
  newDiseases: Array<Partial<DiseaseRule> & { diagnosis: string; icd10?: string; specialty?: DeepSpecialty }> = [],
): ExpandedLibrary {
  const base: DiseaseRule[] = BUILTIN_DISEASES;
  const seen = new Set(base.map((d) => d.diagnosis));
  const merged: DiseaseRule[] = [...base];
  let added = 0;

  for (const nd of newDiseases ?? []) {
    const name = (nd?.diagnosis ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    merged.push({
      diagnosis: name,
      icd10: nd.icd10 ?? 'R69.x00',
      specialty: nd.specialty ?? '消化',
      symptoms: nd.symptoms ?? [],
      vitals: nd.vitals,
      ageBand: nd.ageBand,
      history: nd.history ?? [],
      expectedLabs: nd.expectedLabs ?? [],
      treatment: nd.treatment ?? {
        meds: [],
        lifestyle: [],
        monitoring: [],
        specialPopulation: '需个体化评估。',
      },
      discriminators: nd.discriminators ?? [],
    });
    added += 1;
  }

  const bySpecialty: Record<DeepSpecialty, number> = {
    消化: 0,
    呼吸: 0,
    心血管: 0,
    内分泌: 0,
  };
  for (const d of merged) bySpecialty[d.specialty] += 1;

  return {
    total: merged.length,
    bySpecialty,
    diseases: merged.map((d) => ({ diagnosis: d.diagnosis, icd10: d.icd10, specialty: d.specialty })),
    added,
    disclaimer: DISCLAIMER,
  };
}

/* ===========================================================================
 * 2. improveDifferentialDiagnosis —— 鉴别诊断深化
 * ======================================================================== */
export interface DifferentialCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: DeepSpecialty;
  /** 综合可能性 0~1 */
  likelihood: number;
  /** 支持证据 */
  evidence: string[];
  /** 化验命中证据 */
  labEvidence: string[];
  /** 与易混淆疾病的鉴别要点 */
  discriminators: Array<{ with: string; how: string }>;
}

export interface DifferentialResult {
  candidates: DifferentialCandidate[];
  /** 红旗/危急提示 */
  alerts: string[];
  generatedAt: string;
  disclaimer: string;
}

/**
 * 鉴别诊断深化（纯函数）：
 *   同时考虑症状、病史、化验结果。化验阳性/阴性会直接修正候选可能性；
 *   化验方向与预期矛盾时扣分。
 *
 * @param symptoms 症状列表
 * @param history  既往病史（数组或带 chronicDiseases 的对象）
 * @param labResults 化验结果
 */
export function improveDifferentialDiagnosis(
  symptoms: Array<{ name: string; onset?: string }> = [],
  history: string[] | { chronicDiseases?: string[]; notes?: string } = [],
  labResults: DeepLabResult[] = [],
): DifferentialResult {
  const symText = textOfSymptoms(symptoms);
  const histText = textOfHistory(history);
  const labs = labText(labResults);

  interface Scored {
    rule: DiseaseRule;
    score: number;
    evidence: string[];
    labEvidence: string[];
  }
  const scored: Scored[] = [];

  for (const rule of BUILTIN_DISEASES) {
    let score = 0.1;
    const evidence: string[] = [];
    const labEvidence: string[] = [];

    for (const s of rule.symptoms) {
      if (symText.includes(s.kw)) {
        score += s.weight;
        evidence.push(`症状：${s.label}`);
      }
    }
    for (const h of rule.history) {
      if (histText.includes(h.kw)) {
        score += h.weight;
        evidence.push(`病史：${h.label}`);
      }
    }
    for (const el of rule.expectedLabs) {
      const m = matchLab(labs, el);
      if (m.hit) {
        score += el.weight;
        labEvidence.push(`化验：${el.label}(+)`);
      } else if (m.conflict) {
        score -= el.weight * 0.8;
        labEvidence.push(`化验：${el.label}(−，与预期方向矛盾)`);
      }
    }

    if (evidence.length > 0 || labEvidence.length > 0) {
      scored.push({ rule, score, evidence, labEvidence });
    }
  }
  scored.sort((a, b) => b.score - a.score);

  const candidates: DifferentialCandidate[] = scored.slice(0, 6).map((s, i) => ({
    rank: i + 1,
    diagnosis: s.rule.diagnosis,
    icd10: s.rule.icd10,
    specialty: s.rule.specialty,
    likelihood: round2(Math.max(0.05, Math.min(0.95, 0.15 + s.score * 0.35))),
    evidence: s.evidence,
    labEvidence: s.labEvidence,
    discriminators: s.rule.discriminators,
  }));

  // 红旗扫描
  const alerts: string[] = [];
  if (/撕裂/.test(symText) && /胸/.test(symText)) {
    alerts.push('突发撕裂样胸背痛：警惕主动脉夹层，立即 CTA 评估并控制血压/心率。');
  }
  if (/呼吸困难/.test(symText) && (/咯血/.test(symText) || /突发/.test(symText))) {
    alerts.push('突发呼吸困难伴咯血/低氧：警惕肺栓塞，建议 D-二聚体与 CTPA。');
  }
  if (/呕血/.test(symText) || (/黑便/.test(symText))) {
    alerts.push('呕血/黑便：警惕消化道出血，评估血流动力学稳定性。');
  }
  if (/晕厥/.test(symText) && (/心悸/.test(symText) || /胸痛/.test(symText))) {
    alerts.push('晕厥伴心悸/胸痛：警惕恶性心律失常或心源性晕厥，立即心电图。');
  }
  if (alerts.length === 0) alerts.push('未识别到紧急红旗信号，仍以执业医师面诊为准。');

  return {
    candidates,
    alerts,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/* ===========================================================================
 * 3. suggestTreatmentPlan —— 治疗方案推荐
 * ======================================================================== */
export interface TreatmentPlan {
  diagnosis: string;
  icd10: string;
  specialty: DeepSpecialty;
  meds: TreatmentMed[];
  lifestyle: string[];
  monitoring: string[];
  specialPopulation: string;
  /** 与患者特征相关的个体化提示 */
  personalizedNotes: string[];
  generatedAt: string;
  disclaimer: string;
}

/**
 * 治疗方案推荐（纯函数）：
 *   按诊断名（或 ICD10）反查内置治疗方案，并结合患者特征（年龄/性别/
 *   合并症/妊娠）给出个体化注意事项。
 *
 * @param diagnosis 诊断名或 ICD10
 * @param patientFeatures 患者特征
 */
export function suggestTreatmentPlan(
  diagnosis: string,
  patientFeatures: DeepPatientFeatures = {},
): TreatmentPlan {
  const key = (diagnosis ?? '').trim().toLowerCase();
  const rule = BUILTIN_DISEASES.find(
    (r) => r.diagnosis.toLowerCase() === key || r.icd10.toLowerCase() === key,
  );

  const feat = patientFeatures ?? {};
  const age = Number.isFinite(feat.age) ? Math.floor(feat.age ?? 0) : 0;
  const comorbid = (feat.comorbidities ?? []).join(' ');

  const personalizedNotes: string[] = [];
  if (!rule) {
    personalizedNotes.push(`未在病种库中匹配到「${diagnosis}」，请补充诊断名或由临床医师个体化制定方案。`);
  } else {
    if (age >= 65) {
      personalizedNotes.push(`老年患者(${age} 岁)：起始剂量宜小、缓慢滴定，重点防跌倒/低血压/肾功能损伤。`);
    }
    if (feat.pregnant) {
      personalizedNotes.push('妊娠/哺乳期：所有用药须经产科评估，避免妊娠期禁忌药物。');
    }
    if (/肾|慢性肾病|ckd/.test(comorbid)) {
      personalizedNotes.push('合并慢性肾病：经肾排泄药物需调整剂量，监测肌酐/eGFR。');
    }
    if (/肝病|肝硬化/.test(comorbid)) {
      personalizedNotes.push('合并肝病：经肝代谢药物需减量，监测肝功能。');
    }
    if (/出血|抗凝|华法林|阿司匹林/.test(comorbid)) {
      personalizedNotes.push('合并出血/抗凝风险：NSAIDs、抗血小板药需谨慎，评估消化道出血预防。');
    }
    if (personalizedNotes.length === 0) {
      personalizedNotes.push('无特殊个体化提示，按指南常规方案执行。');
    }
  }

  return {
    diagnosis: rule?.diagnosis ?? (diagnosis ?? ''),
    icd10: rule?.icd10 ?? 'R69.x00',
    specialty: rule?.specialty ?? '消化',
    meds: rule ? rule.treatment.meds.map((m) => ({ ...m })) : [],
    lifestyle: rule ? [...rule.treatment.lifestyle] : [],
    monitoring: rule ? [...rule.treatment.monitoring] : [],
    specialPopulation: rule?.treatment.specialPopulation ?? '需个体化评估。',
    personalizedNotes,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/* ===========================================================================
 * 4. checkDiagnosisConsistency —— 诊断一致性检查
 * ======================================================================== */
export interface ConsistencyResult {
  diagnosis: string;
  /** 0~1，越高越一致 */
  score: number;
  consistent: boolean;
  /** 支持该诊断的证据 */
  supporting: string[];
  /** 期望出现但未出现的证据 */
  missing: string[];
  /** 与该诊断矛盾的化验/表现 */
  conflicts: string[];
  /** 建议下一步 */
  recommendation: string;
  generatedAt: string;
  disclaimer: string;
}

/**
 * 诊断一致性检查（纯函数）：
 *   对「医生已下诊断」与症状/化验结果做交叉核查：
 *     - supporting：命中的症状/病史/化验；
 *     - missing  ：该病种 expectedLabs 中关键项目未提供或未异常；
 *     - conflicts：化验方向与预期相反；
 *   综合给出一致/不一致结论与下一步建议。
 *
 * @param diagnosis 已下诊断名或 ICD10
 * @param symptoms  症状列表
 * @param labResults 化验结果
 */
export function checkDiagnosisConsistency(
  diagnosis: string,
  symptoms: Array<{ name: string; onset?: string }> = [],
  labResults: DeepLabResult[] = [],
): ConsistencyResult {
  const key = (diagnosis ?? '').trim().toLowerCase();
  const rule = BUILTIN_DISEASES.find(
    (r) => r.diagnosis.toLowerCase() === key || r.icd10.toLowerCase() === key,
  );

  const symText = textOfSymptoms(symptoms);
  const labs = labText(labResults);

  const supporting: string[] = [];
  const missing: string[] = [];
  const conflicts: string[] = [];

  if (!rule) {
    return {
      diagnosis: diagnosis ?? '',
      score: 0,
      consistent: false,
      supporting: [],
      missing: [],
      conflicts: [`病种库未收录「${diagnosis}」，无法做一致性核查`],
      recommendation: '请由专科医师结合指南与患者实际评估，或扩充病种库后再核查。',
      generatedAt: new Date().toISOString(),
      disclaimer: DISCLAIMER,
    };
  }

  // 症状匹配
  let symHit = 0;
  for (const s of rule.symptoms) {
    if (symText.includes(s.kw)) {
      supporting.push(`症状：${s.label}`);
      symHit += 1;
    }
  }

  // 化验匹配
  for (const el of rule.expectedLabs) {
    const m = matchLab(labs, el);
    if (m.hit) {
      supporting.push(`化验：${el.label}`);
    } else if (m.conflict) {
      conflicts.push(`化验：${el.label}(实际结果与预期方向相反)`);
    } else if (labs.length > 0) {
      // 已做化验但未包含该项 → 建议补做
      missing.push(`建议补查：${el.label}`);
    }
  }

  // 评分：症状命中权重 + 化验命中权重 - 矛盾扣分
  let score = 0.2;
  for (const s of rule.symptoms) {
    if (symText.includes(s.kw)) score += s.weight * 0.4;
  }
  for (const el of rule.expectedLabs) {
    const m = matchLab(labs, el);
    if (m.hit) score += el.weight * 0.5;
    else if (m.conflict) score -= el.weight * 0.6;
  }
  score = Math.max(0, Math.min(1, score));
  const consistent = score >= 0.5 && conflicts.length === 0;

  let recommendation: string;
  if (consistent) {
    recommendation = '现有症状与化验证据支持该诊断，可按指南继续治疗与随访。';
  } else if (conflicts.length > 0) {
    recommendation = '存在与该诊断矛盾的化验结果，建议复核诊断或进一步检查，避免误诊。';
  } else if (symHit === 0) {
    recommendation = '症状与该病种典型表现不符，建议重新采集病史与查体，或考虑其他诊断。';
  } else {
    recommendation = '证据尚不充分，建议补查缺失化验/影像以确认或修正诊断。';
  }

  return {
    diagnosis: rule.diagnosis,
    score: round2(score),
    consistent,
    supporting,
    missing,
    conflicts,
    recommendation,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/** 内置病种库规模（运营/统计用） */
export const BUILTIN_DISEASE_COUNT = BUILTIN_DISEASES.length;
