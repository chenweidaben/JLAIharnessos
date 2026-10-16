/**
 * ============================================================================
 * AI 辅助诊断深化·更多病种 V2（M174-C）：诊断深化聚合器
 * ----------------------------------------------------------------------------
 * 【持续优化与新场景】
 *   在 M163-C（神经/泌尿/血液/风湿免疫 16 病种初版）与 M168-A
 *   （消化/呼吸/心血管/内分泌 17 病种）基础上，对「神经系统 / 泌尿系统 /
 *    血液系统 / 风湿免疫」四大系统的 16 个临床高频病种做 V2 级深化，
 *   输出三件套：
 *     - expandDiagnosisLibraryV2：内置 16 种为底座，合并外部追加病种（去重）；
 *     - improveDifferentialDiagnosisV2：症状/病史/化验联合推理，化验阳性加分、
 *       方向矛盾扣分，并扫描神经/出血/尿潴留等高风险红旗信号；
 *     - suggestTreatmentPlanV2：按诊断反查一线/备选/对症药物、生活方式、
 *       监测与特殊人群注意事项，并结合年龄/性别/妊娠/合并症给个体化提示。
 *
 * 内置病种（16 种）：
 *   神经：脑梗死 / 脑出血 / 癫痫 / 帕金森病
 *   泌尿：慢性肾病 / 尿路感染 / 肾结石 / 前列腺增生
 *   血液：贫血 / 白血病 / 淋巴瘤 / 凝血障碍
 *   风湿免疫：类风湿关节炎 / 系统性红斑狼疮 / 干燥综合征 / 强直性脊柱炎
 *
 * 医疗安全红线（AI 只是辅助，最终由医生确认）：
 *   - 所有输出均为规则引擎启发式建议，不构成诊断结论；
 *   - 返回体固定携带 disclaimer「辅助诊断，最终由医生确认」；
 *   - 纯函数、无 I/O、无随机业务逻辑（generatedAt 取当前时间），不落库、不写 SQL；
 *   - 药物剂量与禁忌仅作方向性提示，具体处方须由执业医师根据患者实际开具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 专科归属（V2 四大系统） */
export type V2Specialty = '神经' | '泌尿' | '血液' | '风湿免疫';

/** 性别 */
export type V2Gender = 'male' | 'female' | '';

/** 生命体征 */
export interface V2Vitals {
  temperature?: number;
  systolic?: number;
  diastolic?: number;
  heartRate?: number;
  spo2?: number;
  bmi?: number;
}

/** 患者特征 */
export interface V2PatientFeatures {
  age?: number;
  gender?: V2Gender;
  vitals?: V2Vitals;
  /** 合并症，如 ['高血压', '糖尿病', '心房颤动', '慢性肾病'] */
  comorbidities?: string[];
  /** 是否妊娠/哺乳 */
  pregnant?: boolean;
}

/** 单条症状 */
export interface V2SymptomInput {
  name: string;
  onset?: string;
}

/** 化验结果 */
export interface V2LabResult {
  name: string;
  value?: number;
  unit?: string;
  abnormal?: 'high' | 'low' | 'normal' | 'positive' | 'negative';
}

/* ---------------------------------------------------------------------------
 * 内置病种规则库（启发式权重，非确诊）
 * ------------------------------------------------------------------------ */
interface V2ExpectedLab {
  kw: string;
  abnormal: 'high' | 'low' | 'positive';
  label: string;
  weight: number;
}

interface V2TreatmentMed {
  name: string;
  role: '一线' | '备选' | '对症';
  note: string;
}

interface V2DiseaseRule {
  diagnosis: string;
  icd10: string;
  specialty: V2Specialty;
  symptoms: Array<{ kw: string; weight: number; label: string }>;
  vitals?: Array<{
    field: keyof V2Vitals;
    op: '>=' | '<=';
    threshold: number;
    weight: number;
    label: string;
  }>;
  ageBand?: { minAge: number; maxAge: number; weight: number; label: string };
  history: Array<{ kw: string; weight: number; label: string }>;
  expectedLabs: V2ExpectedLab[];
  treatment: {
    meds: V2TreatmentMed[];
    lifestyle: string[];
    monitoring: string[];
    specialPopulation: string;
  };
  discriminators: Array<{ with: string; how: string }>;
}

const BUILTIN_DISEASES_V2: V2DiseaseRule[] = [
  /* ===================== 神经系统 ===================== */
  {
    diagnosis: '脑梗死(急性缺血性卒中)',
    icd10: 'I63.900',
    specialty: '神经',
    symptoms: [
      { kw: '偏瘫', weight: 0.5, label: '单侧肢体无力/偏瘫' },
      { kw: '口角歪斜', weight: 0.45, label: '中枢性面舌瘫' },
      { kw: '言语不清', weight: 0.4, label: '失语/构音障碍' },
      { kw: '突发', weight: 0.3, label: '症状突发达峰' },
      { kw: '视物模糊', weight: 0.2, label: '偏盲/视物模糊' },
    ],
    vitals: [
      { field: 'systolic', op: '>=', threshold: 140, weight: 0.1, label: '常伴血压升高' },
    ],
    ageBand: { minAge: 50, maxAge: 150, weight: 0.1, label: '中老年好发' },
    history: [
      { kw: '高血压', weight: 0.25, label: '高血压' },
      { kw: '糖尿病', weight: 0.15, label: '糖尿病' },
      { kw: '房颤', weight: 0.3, label: '心房颤动(心源性栓塞)' },
      { kw: '高血脂', weight: 0.1, label: '动脉粥样硬化' },
    ],
    expectedLabs: [
      { kw: 'ct', abnormal: 'low', label: '头颅 CT 排除出血(低密度灶)', weight: 0.25 },
      { kw: '血糖', abnormal: 'high', label: '应激性高血糖', weight: 0.05 },
    ],
    treatment: {
      meds: [
        { name: '静脉 rt-PA/尿激酶溶栓(时间窗内)', role: '一线', note: '发病 4.5h 内评估适应证' },
        { name: '血管内取栓(大血管闭塞)', role: '一线', note: '前循环大血管闭塞可延长至 24h' },
        { name: '阿司匹林 ± 氯吡格雷', role: '一线', note: '不溶栓者尽早抗血小板' },
        { name: '他汀(阿托伐他汀)', role: '一线', note: '稳定斑块、二级预防' },
      ],
      lifestyle: ['戒烟限酒', '低盐低脂饮食', '早期康复训练(良肢位/吞咽评估)', '控制血压血糖血脂'],
      monitoring: ['NIHSS 评分动态', '发病 24h 复查头颅 CT(防出血转化)', '吞咽功能筛查(防误吸)', '颈动脉超声/影像病因评估'],
      specialPopulation: '老年患者溶栓出血风险高需严格评分；孕妇/哺乳期卒中由神经科与产科协同；合并房颤者二级预防需抗凝。',
    },
    discriminators: [
      { with: '脑出血', how: '脑出血起病更急、头痛呕吐重、血压更高，头颅 CT 见高密度出血灶；脑梗死 CT 早期可正常或低密度灶' },
      { with: '短暂性脑缺血发作(TIA)', how: 'TIA 症状多在 1h 内完全缓解、无责任病灶；脑梗死症状持续且影像有梗死灶' },
    ],
  },
  {
    diagnosis: '脑出血(自发性)',
    icd10: 'I61.900',
    specialty: '神经',
    symptoms: [
      { kw: '头痛', weight: 0.4, label: '突发剧烈头痛' },
      { kw: '呕吐', weight: 0.35, label: '喷射性呕吐(颅内压增高)' },
      { kw: '偏瘫', weight: 0.35, label: '偏瘫/偏身感觉障碍' },
      { kw: '意识', weight: 0.3, label: '意识障碍/嗜睡' },
      { kw: '高血压', weight: 0.25, label: '活动/情绪激动中起病' },
    ],
    vitals: [
      { field: 'systolic', op: '>=', threshold: 160, weight: 0.2, label: '血压显著升高' },
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '交感兴奋' },
    ],
    history: [{ kw: '高血压', weight: 0.35, label: '长期未控制高血压(最常见病因)' }],
    expectedLabs: [
      { kw: 'ct', abnormal: 'high', label: '头颅 CT 高密度出血灶', weight: 0.45 },
    ],
    treatment: {
      meds: [
        { name: '静脉降压(尼卡地平/乌拉地尔)', role: '一线', note: '收缩压逐步降至 140mmHg 左右，避免骤降' },
        { name: '甘露醇/高渗盐水', role: '一线', note: '控制脑水肿、降颅压' },
        { name: '神经外科血肿清除/引流', role: '一线', note: '出血量/部位符合手术指征时' },
        { name: '纠正凝血(维生素 K/鱼精蛋白)', role: '备选', note: '抗凝相关脑出血' },
      ],
      lifestyle: ['急性期绝对卧床、避免情绪激动', '严格控制血压', '稳定后早期康复'],
      monitoring: ['头颅 CT 动态评估血肿扩大', '意识/瞳孔/GCS', '血压波动', '电解质与肾功能'],
      specialPopulation: '老年脑溢血后并发症(肺炎/深静脉血栓)多；孕妇需排除子痫前期；禁用溶栓与抗凝至病情稳定。',
    },
    discriminators: [
      { with: '脑梗死', how: '脑梗死多在安静下起病、头痛轻；脑出血活动中起病、头痛呕吐重、CT 高密度' },
      { with: '蛛网膜下腔出血', how: '蛛网膜下腔出血为爆炸样头痛、颈强直，CT 见脑沟裂积血，常为动脉瘤破裂' },
    ],
  },
  {
    diagnosis: '癫痫(反复发作性)',
    icd10: 'G40.900',
    specialty: '神经',
    symptoms: [
      { kw: '抽搐', weight: 0.5, label: '肢体抽搐/阵挛' },
      { kw: '意识丧失', weight: 0.4, label: '发作性意识丧失' },
      { kw: '口吐白沫', weight: 0.3, label: '口吐白沫' },
      { kw: '舌咬伤', weight: 0.35, label: '舌咬伤' },
      { kw: '尿失禁', weight: 0.25, label: '大小便失禁' },
      { kw: '失神', weight: 0.25, label: '短暂愣神/失神发作' },
    ],
    history: [
      { kw: '脑外伤', weight: 0.15, label: '既往脑外伤/卒中' },
      { kw: '脑炎', weight: 0.15, label: '中枢神经系统感染史' },
      { kw: '癫痫', weight: 0.3, label: '既往癫痫史' },
    ],
    expectedLabs: [
      { kw: '脑电图', abnormal: 'high', label: 'EEG 痫样放电', weight: 0.35 },
    ],
    treatment: {
      meds: [
        { name: '左乙拉西坦 / 丙戊酸钠', role: '一线', note: '广谱抗癫痫药，按发作类型选择' },
        { name: '卡马西平 / 奥卡西平', role: '一线', note: '部分性发作首选' },
        { name: '地西泮静脉推注', role: '对症', note: '癫痫持续状态抢救' },
      ],
      lifestyle: ['规律作息、避免熬夜与饮酒', '避免驾驶/高空作业/游泳独处', '按时服药不可自行停药'],
      monitoring: ['发作频率与形式记录', '血药浓度(必要时)', '肝肾功能(丙戊酸钠等)', '脑电图随访'],
      specialPopulation: '育龄女性避免丙戊酸钠(致畸)；老年患者注意药物相互作用；妊娠需神经科与产科共同管理。',
    },
    discriminators: [
      { with: '晕厥', how: '晕厥多有体位诱因、前驱黑蒙、无抽搐舌咬伤，恢复快；癫痫抽搐持续、可有舌咬伤尿失禁' },
      { with: '癔症/心因性发作', how: '心因性发作无意识丧失、瞳孔正常、EEG 无痫样放电，多有情绪诱因' },
    ],
  },
  {
    diagnosis: '帕金森病',
    icd10: 'G20.900',
    specialty: '神经',
    symptoms: [
      { kw: '静止性震颤', weight: 0.5, label: '静止性震颤(搓丸样)' },
      { kw: '肌张力', weight: 0.4, label: '肌张力增高(铅管/齿轮样)' },
      { kw: '动作迟缓', weight: 0.4, label: '动作迟缓/面具脸' },
      { kw: '步态', weight: 0.35, label: '慌张步态/起步困难' },
      { kw: '手抖', weight: 0.2, label: '单手起病、静止时明显' },
    ],
    ageBand: { minAge: 55, maxAge: 150, weight: 0.15, label: '中老年好发' },
    history: [],
    expectedLabs: [],
    treatment: {
      meds: [
        { name: '左旋多巴/苄丝肼(美多芭)', role: '一线', note: '症状最显著改善剂，按症状波动调量' },
        { name: '普拉克索/罗匹尼罗(多巴胺受体激动剂)', role: '一线', note: '年轻患者或早期单用' },
        { name: '恩他卡朋', role: '备选', note: '延长左旋多巴作用时间' },
        { name: '苯海索', role: '备选', note: '震颤明显的年轻患者，老年慎用(认知)' },
      ],
      lifestyle: ['规律运动(步态/平衡训练)', '均衡饮食、防体位性低血压', '防跌倒环境改造'],
      monitoring: ['UPDRS 评分', '剂末现象/异动症', '认知与情绪(抑郁)', '跌倒风险'],
      specialPopulation: '老年患者抗胆碱药易致认知障碍/幻觉；避免突然停药(恶性综合征)；体位性低血压者起床宜慢。',
    },
    discriminators: [
      { with: '特发性震颤', how: '特发性震颤为姿势性/动作性震颤、饮酒后减轻、无肌强直与动作迟缓；帕金森为静止性震颤' },
      { with: '血管性帕金森综合征', how: '血管性帕金森有卒中史、下肢为主、对左旋多巴反应差；帕金森病上肢起病、对美多芭反应好' },
    ],
  },

  /* ===================== 泌尿系统 ===================== */
  {
    diagnosis: '慢性肾脏病(CKD)',
    icd10: 'N18.900',
    specialty: '泌尿',
    symptoms: [
      { kw: '水肿', weight: 0.35, label: '颜面/下肢凹陷性水肿' },
      { kw: '泡沫尿', weight: 0.35, label: '尿中泡沫增多(蛋白尿)' },
      { kw: '乏力', weight: 0.2, label: '乏力/贫血貌' },
      { kw: '夜尿', weight: 0.25, label: '夜尿增多' },
      { kw: '腰痛', weight: 0.1, label: '腰部不适' },
    ],
    history: [
      { kw: '糖尿病', weight: 0.3, label: '糖尿病(糖尿病肾病)' },
      { kw: '高血压', weight: 0.25, label: '高血压肾损害' },
      { kw: '肾炎', weight: 0.2, label: '慢性肾小球肾炎史' },
    ],
    expectedLabs: [
      { kw: '肌酐', abnormal: 'high', label: '血肌酐升高/eGFR 下降', weight: 0.4 },
      { kw: '蛋白尿', abnormal: 'positive', label: '尿蛋白阳性', weight: 0.35 },
      { kw: '尿素氮', abnormal: 'high', label: 'BUN 升高', weight: 0.15 },
      { kw: '血红蛋白', abnormal: 'low', label: '肾性贫血', weight: 0.15 },
    ],
    treatment: {
      meds: [
        { name: 'ACEI/ARB(普利/沙坦类)', role: '一线', note: '降压降蛋白，监测肌酐与钾' },
        { name: 'SGLT2i(达格列净/恩格列净)', role: '一线', note: '延缓肾病进展，无论糖尿病与否' },
        { name: '促红细胞生成素/罗沙司他', role: '备选', note: '肾性贫血' },
        { name: '碳酸钙/司维拉姆', role: '备选', note: '高磷血症管理' },
      ],
      lifestyle: ['优质低蛋白饮食(0.6~0.8g/kg/d)', '低盐(<5g/d)', '控制血压<130/80', '避免肾毒性药物(NSAIDs/不明中药)'],
      monitoring: ['肾功能(肌酐/eGFR)与电解质', '尿蛋白定量', '血红蛋白/铁代谢', '钙磷PTH(CKD-MBD)'],
      specialPopulation: '老年患者用药按 eGFR 调整；孕妇 CKD 需肾内与产科协同；终末期评估透析/肾移植指征。',
    },
    discriminators: [
      { with: '肾病综合征', how: '肾病综合征以大量蛋白尿(>3.5g/d)、低白蛋白血症、高度水肿为特征；CKD 为慢性肾功能渐进性下降' },
      { with: '甲状腺功能减退', how: '甲减水肿为非凹陷性黏液性水肿、TSH 升高；CKD 水肿为凹陷性、伴肌酐升高与蛋白尿' },
    ],
  },
  {
    diagnosis: '尿路感染(急性膀胱炎/肾盂肾炎)',
    icd10: 'N39.000',
    specialty: '泌尿',
    symptoms: [
      { kw: '尿频', weight: 0.4, label: '尿频' },
      { kw: '尿急', weight: 0.4, label: '尿急' },
      { kw: '尿痛', weight: 0.45, label: '尿痛/灼热感' },
      { kw: '腰痛', weight: 0.3, label: '腰痛(肾盂肾炎)' },
      { kw: '发热', weight: 0.3, label: '发热寒战(上尿路感染)' },
      { kw: '血尿', weight: 0.15, label: '肉眼血尿' },
    ],
    vitals: [{ field: 'temperature', op: '>=', threshold: 37.5, weight: 0.15, label: '发热(肾盂肾炎)' }],
    history: [
      { kw: '糖尿病', weight: 0.1, label: '糖尿病(易感)' },
      { kw: '妊娠', weight: 0.1, label: '妊娠(易感)' },
    ],
    expectedLabs: [
      { kw: '白细胞尿', abnormal: 'high', label: '尿白细胞升高/脓尿', weight: 0.3 },
      { kw: '尿培养', abnormal: 'positive', label: '尿培养阳性', weight: 0.35 },
    ],
    treatment: {
      meds: [
        { name: '磷霉素氨丁三醇 / 呋喃妥因', role: '一线', note: '下尿路感染短程 3~5 天' },
        { name: '左氧氟沙星/头孢类', role: '一线', note: '肾盂肾炎或上尿路感染者按药敏' },
        { name: '对乙酰氨基酚', role: '对症', note: '退热镇痛' },
      ],
      lifestyle: ['多饮水(>2000mL/d)', '及时排尿、避免憋尿', '注意会阴部清洁'],
      monitoring: ['症状 48~72h 评估', '尿培养与药敏(复杂/反复者)', '疗程结束后复查尿常规'],
      specialPopulation: '孕妇避免喹诺酮/四环素，首选头孢/磷霉素；老年无症状菌尿一般不治疗；糖尿病者警惕气肿性肾盂肾炎。',
    },
    discriminators: [
      { with: '尿路结石', how: '结石为腰腹绞痛、放射至腹股沟、镜下/肉眼血尿，无明显尿频尿急尿痛；感染以刺激征为主' },
      { with: '前列腺炎', how: '前列腺炎为会阴部不适、排尿踌躇、前列腺压痛；膀胱炎以膀胱刺激征为主，尿三杯可定位' },
    ],
  },
  {
    diagnosis: '肾结石(上尿路结石)',
    icd10: 'N20.000',
    specialty: '泌尿',
    symptoms: [
      { kw: '腰痛', weight: 0.45, label: '腰腹部绞痛' },
      { kw: '绞痛', weight: 0.45, label: '突发绞痛向腹股沟/会阴部放射' },
      { kw: '血尿', weight: 0.35, label: '镜下/肉眼血尿' },
      { kw: '恶心', weight: 0.2, label: '恶心呕吐' },
      { kw: '尿频', weight: 0.1, label: '结石近膀胱段伴刺激征' },
    ],
    history: [
      { kw: '痛风', weight: 0.15, label: '高尿酸/痛风(尿酸结石)' },
      { kw: '饮水少', weight: 0.1, label: '饮水少/久坐' },
    ],
    expectedLabs: [
      { kw: '红细胞', abnormal: 'high', label: '尿红细胞升高', weight: 0.3 },
      { kw: '尿酸', abnormal: 'high', label: '血尿酸升高(尿酸盐结石)', weight: 0.15 },
    ],
    treatment: {
      meds: [
        { name: 'NSAIDs(双氯芬酸钠/吲哚美辛)', role: '一线', note: '镇痛首选' },
        { name: '坦索罗辛(α受体阻滞剂)', role: '一线', note: '促进输尿管结石排出' },
        { name: '体外冲击波碎石/输尿管镜', role: '备选', note: '较大/嵌顿结石' },
      ],
      lifestyle: ['每日饮水 2500~3000mL', '适量运动(跳跃助排石)', '草酸钙结石限菠菜/浓茶；尿酸结石低嘌呤'],
      monitoring: ['泌尿系超声/KUB 平片', '肾功能(梗阻积水)', '结石成分分析(预防复发)'],
      specialPopulation: '孕妇避免放射检查(以超声为主)、避免 NSAIDs(孕中晚期)；老年/肾功能不全者镇痛选对乙酰氨基酚。',
    },
    discriminators: [
      { with: '尿路感染', how: '感染以膀胱刺激征+发热脓尿为主；结石为绞痛放射+血尿，影像可见结石影' },
      { with: '急性阑尾炎', how: '阑尾炎为转移性右下腹痛、麦氏点压痛、无血尿；结石为腰绞痛放射腹股沟、血尿阳性' },
    ],
  },
  {
    diagnosis: '良性前列腺增生(BPH)',
    icd10: 'N40.000',
    specialty: '泌尿',
    symptoms: [
      { kw: '尿频', weight: 0.3, label: '尿频、夜尿增多' },
      { kw: '排尿踌躇', weight: 0.4, label: '排尿等待/踌躇' },
      { kw: '尿线细', weight: 0.4, label: '尿线变细、无力' },
      { kw: '尿不尽', weight: 0.3, label: '尿不尽感/残余尿' },
    ],
    ageBand: { minAge: 50, maxAge: 150, weight: 0.2, label: '老年男性好发' },
    history: [],
    expectedLabs: [
      { kw: 'psa', abnormal: 'high', label: 'PSA 轻度升高(需排除前列腺癌)', weight: 0.1 },
    ],
    treatment: {
      meds: [
        { name: '坦索罗辛/特拉唑嗪(α1受体阻滞剂)', role: '一线', note: '快速改善排尿症状，注意体位性低血压' },
        { name: '非那雄胺/度他雄胺(5α还原酶抑制剂)', role: '一线', note: '缩小前列腺体积，长期使用' },
        { name: '经尿道前列腺电切(TURP)', role: '备选', note: '药物无效/反复尿潴留/出血' },
      ],
      lifestyle: ['睡前限水、避免饮酒/咖啡因', '定时排尿、避免憋尿', '盆底肌训练'],
      monitoring: ['IPSS 评分', '残余尿测定', 'PSA(45 岁以上筛查前列腺癌)', '尿流率'],
      specialPopulation: '老年患者 α 阻滞剂注意跌倒；孕妇/女性不适用；合并青光眼/肾功能不全者需评估。',
    },
    discriminators: [
      { with: '前列腺癌', how: '前列腺癌 PSA 显著升高、直肠指检硬结、影像学异常；BPH 为弥漫增大、PSA 轻中度升高' },
      { with: '神经源性膀胱', how: '神经源性膀胱有糖尿病/脊髓病变史、尿流动力学异常；BPH 为老年男性梗阻症状、前列腺增大' },
    ],
  },

  /* ===================== 血液系统 ===================== */
  {
    diagnosis: '贫血(缺铁性/失血性)',
    icd10: 'D64.900',
    specialty: '血液',
    symptoms: [
      { kw: '乏力', weight: 0.4, label: '乏力活动后心悸' },
      { kw: '面色苍白', weight: 0.4, label: '面色/睑结膜苍白' },
      { kw: '头晕', weight: 0.25, label: '头晕耳鸣' },
      { kw: '脱发', weight: 0.15, label: '脱发/指甲匙状(缺铁)' },
      { kw: '黑便', weight: 0.25, label: '黑便/月经过多(失血病因)' },
    ],
    expectedLabs: [
      { kw: '血红蛋白', abnormal: 'low', label: 'Hb 降低', weight: 0.45 },
      { kw: '铁蛋白', abnormal: 'low', label: '血清铁蛋白降低(缺铁)', weight: 0.3 },
      { kw: 'mcv', abnormal: 'low', label: 'MCV 减小(小细胞低色素)', weight: 0.2 },
    ],
    history: [
      { kw: '月经过多', weight: 0.2, label: '月经过多(女性缺铁常见)' },
      { kw: '黑便', weight: 0.2, label: '消化道慢性失血' },
    ],
    treatment: {
      meds: [
        { name: '口服铁剂(琥珀酸亚铁/多糖铁)', role: '一线', note: '餐后服、配维C促吸收，疗程 4~6 个月' },
        { name: '静脉铁剂(蔗糖铁)', role: '备选', note: '口服不耐受/吸收障碍' },
        { name: '叶酸/维生素 B12', role: '备选', note: '巨幼细胞性贫血时' },
        { name: '病因治疗(止血/胃肠镜)', role: '一线', note: '寻找并去除失血病因' },
      ],
      lifestyle: ['红肉/动物肝脏/蛋黄(食补)', '茶与钙制剂间隔 2h 服用', '纠正偏食'],
      monitoring: ['血常规(Hb/MCV)', '网织红(补铁后反应)', '铁蛋白/血清铁', '便潜血/胃肠镜(找病因)'],
      specialPopulation: '孕妇缺铁性贫血需积极补铁(预防早产低体重)；老年贫血须排查消化道肿瘤；铁剂便秘常见。',
    },
    discriminators: [
      { with: '慢性病性贫血', how: '慢性病贫血有慢性感染/肿瘤/风湿病基础、铁蛋白正常或偏高、TIBC 低；缺铁性贫血铁蛋白低' },
      { with: '溶血性贫血', how: '溶血伴黄疸、脾大、网织红显著升高、LDH/间接胆红素升高；缺铁性为小细胞低色素、无黄疸' },
    ],
  },
  {
    diagnosis: '急性白血病',
    icd10: 'C95.900',
    specialty: '血液',
    symptoms: [
      { kw: '发热', weight: 0.3, label: '发热(感染)' },
      { kw: '出血', weight: 0.35, label: '皮肤瘀斑/牙龈出血' },
      { kw: '乏力', weight: 0.3, label: '进行性乏力(贫血)' },
      { kw: '淋巴结肿大', weight: 0.25, label: '淋巴结/肝脾肿大' },
      { kw: '骨痛', weight: 0.2, label: '骨关节痛' },
    ],
    expectedLabs: [
      { kw: '白细胞', abnormal: 'high', label: '外周血白细胞(可高可低)', weight: 0.2 },
      { kw: '血红蛋白', abnormal: 'low', label: '贫血', weight: 0.2 },
      { kw: '血小板', abnormal: 'low', label: '血小板减少', weight: 0.3 },
      { kw: '原始细胞', abnormal: 'positive', label: '骨髓/外周血原始细胞', weight: 0.4 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: '联合化疗(DA/VP 方案)', role: '一线', note: '按 FAB/免疫分型个体化' },
        { name: '靶向药(酪氨酸激酶抑制剂/ATR 拮抗剂)', role: '备选', note: '伴特定融合基因者' },
        { name: '成分输血/G-CSF', role: '对症', note: '纠正贫血/血小板减少与粒缺' },
        { name: '异基因造血干细胞移植', role: '备选', note: '高危/缓解后根治性策略' },
      ],
      lifestyle: ['层流病房、保护性隔离', '口腔/肛周护理防感染', '加强营养'],
      monitoring: ['骨髓穿刺与流式(疗效评估)', '血常规动态', '感染征象(发热即培养)', '肿瘤溶解综合征(尿酸/钾/磷)'],
      specialPopulation: '老年患者化疗耐受性差、需减量；孕妇白血病需血液科与产科协同；粒缺发热为急症。',
    },
    discriminators: [
      { with: '类白血病反应', how: '类白反应有严重感染/肿瘤基础、NAP 积分高、无原始细胞、病因去除后恢复；白血病骨髓原始细胞≥20%' },
      { with: '再生障碍性贫血', how: '再障为三系减少但无肝脾淋巴结肿大、骨髓增生低下无原始细胞；白血病有原始细胞浸润' },
    ],
  },
  {
    diagnosis: '淋巴瘤(霍奇金/非霍奇金)',
    icd10: 'C85.900',
    specialty: '血液',
    symptoms: [
      { kw: '淋巴结肿大', weight: 0.5, label: '无痛性进行性淋巴结肿大' },
      { kw: '发热', weight: 0.25, label: '不明原因发热(B 症状)' },
      { kw: '盗汗', weight: 0.25, label: '夜间盗汗' },
      { kw: '消瘦', weight: 0.25, label: '半年体重下降>10%' },
      { kw: '皮肤瘙痒', weight: 0.15, label: '皮肤瘙痒' },
    ],
    expectedLabs: [
      { kw: '乳酸脱氢酶', abnormal: 'high', label: 'LDH 升高(肿瘤负荷)', weight: 0.2 },
      { kw: 'β2微球蛋白', abnormal: 'high', label: 'β2-MG 升高', weight: 0.15 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: 'ABVD / CHOP 方案化疗 ± 靶向(利妥昔单抗)', role: '一线', note: '按病理类型与分期' },
        { name: '受累野放疗', role: '备选', note: '早期局限病变' },
        { name: '造血干细胞移植', role: '备选', note: '复发/难治高危者' },
      ],
      lifestyle: ['治疗期防感染', '加强营养与休息', '长期随访第二肿瘤'],
      monitoring: ['淋巴结活检/免疫组化(确诊)', 'PET-CT 分期与疗效', '血常规/肝肾功能', '心脏功能(蒽环类)'],
      specialPopulation: '年轻女性霍奇金淋巴瘤需评估生育力保存；孕妇淋巴瘤治疗需多学科；老年患者化疗耐受性差。',
    },
    discriminators: [
      { with: '淋巴结结核', how: '结核性淋巴结炎有结核中毒症状、PPD/IGRA 阳性、病理见干酪样坏死；淋巴瘤为无痛性进行性肿大、病理见 R-S 细胞/淋巴瘤细胞' },
      { with: '转移性淋巴结肿大', how: '转移癌有原发肿瘤灶、淋巴结质地硬固定、病理见转移癌细胞；淋巴瘤为系统性淋巴造血系统肿瘤' },
    ],
  },
  {
    diagnosis: '凝血障碍(获得性/维生素K缺乏)',
    icd10: 'D68.900',
    specialty: '血液',
    symptoms: [
      { kw: '瘀斑', weight: 0.4, label: '皮肤瘀斑/出血点' },
      { kw: '牙龈出血', weight: 0.3, label: '牙龈/鼻出血' },
      { kw: '黑便', weight: 0.25, label: '消化道出血' },
      { kw: '术后渗血', weight: 0.2, label: '术后/外伤后出血不止' },
    ],
    history: [
      { kw: '华法林', weight: 0.3, label: '服用华法林(抗凝过量)' },
      { kw: '肝病', weight: 0.2, label: '严重肝病(凝血因子合成减少)' },
      { kw: '抗生素', weight: 0.15, label: '长期抗生素(肠道菌群紊乱维K缺乏)' },
    ],
    expectedLabs: [
      { kw: '凝血酶原时间', abnormal: 'high', label: 'PT/INR 延长', weight: 0.4 },
      { kw: 'aptt', abnormal: 'high', label: 'APTT 延长(内源途径)', weight: 0.25 },
      { kw: '纤维蛋白原', abnormal: 'low', label: '纤维蛋白原降低(DIC)', weight: 0.15 },
    ],
    treatment: {
      meds: [
        { name: '维生素 K1', role: '一线', note: '华法林过量/维 K 缺乏' },
        { name: '新鲜冰冻血浆(FFP)', role: '一线', note: '紧急纠正凝血因子' },
        { name: '凝血酶原复合物(PCC)', role: '备选', note: '华法林相关严重出血' },
        { name: '血小板输注', role: '对症', note: '合并血小板减少' },
      ],
      lifestyle: ['避免外伤与剧烈运动', '避免 NSAIDs/阿司匹林', '规律口腔护理'],
      monitoring: ['PT/INR、APTT 动态', '出血征象', 'D-二聚体/纤维蛋白原(排查 DIC)', '肝功能'],
      specialPopulation: '孕妇凝血障碍需产科协同；新生儿出血症需常规补充维 K；老年多重用药注意抗凝药叠加。',
    },
    discriminators: [
      { with: '特发性血小板减少性紫癜(ITP)', how: 'ITP 以血小板减少为主、PT/APTT 正常、巨核细胞成熟障碍；凝血障碍以凝血因子异常为主、PT/APTT 延长' },
      { with: '过敏性紫癜', how: '过敏性紫癜为可触性紫癜、对称分布于下肢、血小板正常、伴关节/腹痛/肾损害；凝血障碍为自发性出血、PT/APTT 异常' },
    ],
  },

  /* ===================== 风湿免疫 ===================== */
  {
    diagnosis: '类风湿关节炎(RA)',
    icd10: 'M05.900',
    specialty: '风湿免疫',
    symptoms: [
      { kw: '关节痛', weight: 0.3, label: '对称性多关节肿痛' },
      { kw: '晨僵', weight: 0.45, label: '晨僵>1 小时' },
      { kw: '掌指', weight: 0.4, label: '掌指/近端指间/腕关节受累' },
      { kw: '关节畸形', weight: 0.2, label: '晚期手指尺偏/天鹅颈畸形' },
    ],
    ageBand: { minAge: 30, maxAge: 70, weight: 0.1, label: '中年女性好发' },
    history: [],
    expectedLabs: [
      { kw: '类风湿因子', abnormal: 'positive', label: 'RF 阳性', weight: 0.25 },
      { kw: '抗ccp', abnormal: 'positive', label: '抗 CCP 抗体(更特异)', weight: 0.35 },
      { kw: '血沉', abnormal: 'high', label: 'ESR/CRP 升高(活动期)', weight: 0.2 },
    ],
    treatment: {
      meds: [
        { name: '甲氨蝶呤(MTX)', role: '一线', note: '锚定药，联合叶酸' },
        { name: '来氟米特/羟氯喹/柳氮磺吡啶', role: '一线', note: '传统 DMARDs 联合' },
        { name: 'TNF-α/IL-6 受体抑制剂(生物制剂)', role: '备选', note: '传统 DMARDs 不佳者' },
        { name: 'NSAIDs / 小剂量激素', role: '对症', note: '快速抗炎镇痛' },
      ],
      lifestyle: ['急性期关节制动、缓解期适度活动', '戒烟(加重病情)', '关节功能锻炼'],
      monitoring: ['DAS28 活动度评分', 'ESR/CRP', 'MTX 者血常规/肝功能', '关节超声/影像(骨侵蚀)'],
      specialPopulation: '孕妇禁用 MTX/来氟米特，首选羟氯喹/硫唑嘌呤；老年患者注意感染与骨质疏松；结核/乙肝筛查后方可用生物制剂。',
    },
    discriminators: [
      { with: '骨关节炎', how: '骨关节炎为老年负重关节(膝/髋)、活动后痛、晨僵<30min、RF/抗CCP 阴性；RA 为小关节对称、晨僵长、抗体阳性' },
      { with: '痛风', how: '痛风为单关节突发、第一跖趾关节、血尿酸高；RA 为多关节对称、慢性病程、抗CCP 阳性' },
    ],
  },
  {
    diagnosis: '系统性红斑狼疮(SLE)',
    icd10: 'M32.900',
    specialty: '风湿免疫',
    symptoms: [
      { kw: '皮疹', weight: 0.35, label: '蝶形红斑/面部皮疹' },
      { kw: '光过敏', weight: 0.3, label: '日光过敏' },
      { kw: '关节痛', weight: 0.3, label: '多关节痛(非侵蚀性)' },
      { kw: '脱发', weight: 0.15, label: '脱发/口腔溃疡' },
      { kw: '水肿', weight: 0.2, label: '水肿(狼疮肾)' },
      { kw: '发热', weight: 0.15, label: '反复发热' },
    ],
    ageBand: { minAge: 15, maxAge: 45, weight: 0.15, label: '育龄女性好发' },
    history: [],
    expectedLabs: [
      { kw: 'ana', abnormal: 'positive', label: 'ANA 阳性(筛查)', weight: 0.35 },
      { kw: 'dsdna', abnormal: 'positive', label: '抗 dsDNA(特异)', weight: 0.35 },
      { kw: '补体', abnormal: 'low', label: '补体 C3/C4 降低(活动期)', weight: 0.25 },
      { kw: '蛋白尿', abnormal: 'positive', label: '尿蛋白(狼疮肾)', weight: 0.2 },
    ],
    treatment: {
      meds: [
        { name: '羟氯喹', role: '一线', note: '基础用药，长期' },
        { name: '糖皮质激素(泼尼松)', role: '一线', note: '按活动度调整，渐减量' },
        { name: '吗替麦考酚酯/环磷酰胺', role: '一线', note: '狼疮肾/重症' },
        { name: '贝利尤单抗/泰它西普', role: '备选', note: '生物制剂' },
      ],
      lifestyle: ['严格防晒(防晒霜/长袖)', '避免日晒与劳累', '预防感染', '避孕(活动期不宜妊娠)'],
      monitoring: ['抗 dsDNA/补体(活动度)', '尿常规/24h 尿蛋白(肾)', '血常规', '血沉/CRP', '激素相关不良反应'],
      specialPopulation: '育龄女性妊娠需在病情稳定半年以上、停用致畸药；孕妇 SLE 复发风险高；激素长期使用防骨质疏松。',
    },
    discriminators: [
      { with: '类风湿关节炎', how: 'RA 以小关节侵蚀性破坏为主、无蝶形红斑与 ANA/dsDNA；SLE 有多系统损害、抗体谱广泛' },
      { with: '原发性肾小球肾炎', how: '原发性肾炎无皮疹/光过敏/自身抗体；狼疮肾有 SLE 多系统表现与 ANA/dsDNA 阳性' },
    ],
  },
  {
    diagnosis: '干燥综合征',
    icd10: 'M35.000',
    specialty: '风湿免疫',
    symptoms: [
      { kw: '口干', weight: 0.45, label: '口干、吞咽干性食物需水' },
      { kw: '眼干', weight: 0.45, label: '眼干异物感/泪少' },
      { kw: '腮腺', weight: 0.25, label: '反复腮腺肿大' },
      { kw: '关节痛', weight: 0.15, label: '轻度关节痛' },
      { kw: '龋齿', weight: 0.2, label: '多发龋齿(猖獗齿)' },
    ],
    ageBand: { minAge: 35, maxAge: 70, weight: 0.1, label: '中年女性好发' },
    history: [],
    expectedLabs: [
      { kw: 'ana', abnormal: 'positive', label: 'ANA 阳性', weight: 0.2 },
      { kw: 'ssa', abnormal: 'positive', label: '抗 SSA/SSB 抗体', weight: 0.4 },
      { kw: '类风湿因子', abnormal: 'positive', label: 'RF 可阳性', weight: 0.1 },
    ],
    treatment: {
      meds: [
        { name: '人工泪液/人工唾液', role: '一线', note: '对症替代治疗' },
        { name: '毛果芸香碱(促泌剂)', role: '备选', note: '改善口干眼干' },
        { name: '羟氯喹', role: '一线', note: '伴关节痛/系统受累' },
        { name: '糖皮质激素/免疫抑制剂', role: '备选', note: '合并内脏受累(肺/肾/神经)' },
      ],
      lifestyle: ['少量多次饮水、忌辛辣', '注意口腔卫生(防龋齿)', '环境加湿', '避免抗胆碱/致干药物'],
      monitoring: ['眼科(泪液分泌/角膜染色)', '口腔(唾液流率/龋齿)', '抗 SSA/SSB', '脏器受累(肺/肾/血液)'],
      specialPopulation: '孕妇 SSA/SSB 阳性可致新生儿狼疮/房室传导阻滞，需产科密切监护；老年患者防误吸。',
    },
    discriminators: [
      { with: '老年性/药物性口干', how: '老年性口干无眼干与自身抗体；干燥综合征抗 SSA/SSB 阳性、伴系统性表现' },
      { with: '糖尿病', how: '糖尿病为多饮多尿、血糖升高；干燥综合征以口干眼干为主、血糖正常' },
    ],
  },
  {
    diagnosis: '强直性脊柱炎(AS)',
    icd10: 'M45.900',
    specialty: '风湿免疫',
    symptoms: [
      { kw: '腰背痛', weight: 0.4, label: '慢性腰背痛' },
      { kw: '晨僵', weight: 0.35, label: '晨起腰背部僵硬' },
      { kw: '夜间痛', weight: 0.3, label: '夜间痛、活动后缓解' },
      { kw: '髋部', weight: 0.25, label: '髋部/臀部交替痛' },
      { kw: '脊柱', weight: 0.2, label: '脊柱活动受限(晚期竹节变)' },
    ],
    ageBand: { minAge: 15, maxAge: 40, weight: 0.2, label: '青年男性好发' },
    expectedLabs: [
      { kw: 'hla-b27', abnormal: 'positive', label: 'HLA-B27 阳性', weight: 0.3 },
      { kw: '血沉', abnormal: 'high', label: 'ESR/CRP 升高(活动期)', weight: 0.2 },
    ],
    history: [],
    treatment: {
      meds: [
        { name: 'NSAIDs(塞来昔布/双氯芬酸)', role: '一线', note: '首选，规律使用' },
        { name: 'TNF-α/IL-17 抑制剂(生物制剂)', role: '一线', note: 'NSAIDs 不佳者' },
        { name: '柳氮磺吡啶', role: '备选', note: '以外周关节受累为主' },
      ],
      lifestyle: ['规律脊柱/胸廓功能锻炼', '睡硬板床、低枕', '戒烟', '避免久坐'],
      monitoring: ['BASDAI/BASFI 活动度与功能', 'ESR/CRP', '骶髂关节 MRI/影像', '脊柱活动度(枕墙距/胸廓活动)'],
      specialPopulation: '年轻男性需长期管理防脊柱强直；孕妇生物制剂需选择胎盘透过少的药物；NSAIDs 注意胃肠与心血管风险。',
    },
    discriminators: [
      { with: '腰椎间盘突出', how: '椎间盘突出为单侧根性痛、直腿抬高试验阳性、活动后加重；AS 为炎性下腰痛、晨僵、休息加重活动缓解、骶髂关节炎' },
      { with: '弥漫性特发性骨肥厚(DISH)', how: 'DISH 为老年、椎体前外侧流注骨化但骶髂关节正常；AS 骶髂关节侵蚀/强直、HLA-B27 阳性' },
    ],
  },
];

/* ------------------------------ 工具函数 ------------------------------ */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const DISCLAIMER_V2 =
  '本建议由 AI 规则引擎基于症状/病史/化验启发式生成，仅供临床参考，不构成诊断结论；辅助诊断，最终由医生确认。';

function textOfSymptomsV2(symptoms: Array<{ name: string; onset?: string }>): string {
  return (symptoms ?? [])
    .map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`)
    .join(' ')
    .toLowerCase();
}

function textOfHistoryV2(history: string[] | { chronicDiseases?: string[]; notes?: string }): string {
  if (Array.isArray(history)) return history.join(' ').toLowerCase();
  const h = history ?? {};
  return [...(h.chronicDiseases ?? []), h.notes ?? ''].join(' ').toLowerCase();
}

function labTextV2(labs: V2LabResult[]): Array<{ kw: string; abnormal: string; name: string }> {
  return (labs ?? []).map((l) => ({
    kw: (l?.name ?? '').toLowerCase(),
    abnormal: (l?.abnormal ?? '').toLowerCase(),
    name: l?.name ?? '',
  }));
}

function matchLabV2(
  labs: Array<{ kw: string; abnormal: string; name: string }>,
  expected: V2ExpectedLab,
): { hit: boolean; conflict: boolean; label: string } {
  for (const l of labs) {
    if (l.kw.includes(expected.kw)) {
      if (l.abnormal === expected.abnormal) return { hit: true, conflict: false, label: expected.label };
      if (l.abnormal === 'normal' || l.abnormal === 'negative' || l.abnormal === 'low') {
        return { hit: false, conflict: true, label: expected.label };
      }
    }
  }
  return { hit: false, conflict: false, label: expected.label };
}

/* ===========================================================================
 * 1. expandDiagnosisLibraryV2 —— 病种库 V2 扩展
 * ======================================================================== */
export interface ExpandedDiseaseMetaV2 {
  diagnosis: string;
  icd10: string;
  specialty: V2Specialty;
}

export interface ExpandedLibraryV2 {
  total: number;
  bySpecialty: Record<V2Specialty, number>;
  diseases: ExpandedDiseaseMetaV2[];
  added: number;
  disclaimer: string;
}

/**
 * 病种库 V2 扩展（纯函数）：
 *   以内置 16 种（神经/泌尿/血液/风湿免疫）为底座，合并外部追加病种
 *   （按 diagnosis 名去重）。
 *
 * 【持续优化与新场景】后续新增专科病种可经 newDiseases 入参追加注册。
 *
 * @param newDiseases 外部追加病种元数据
 */
export function expandDiagnosisLibraryV2(
  newDiseases: Array<Partial<V2DiseaseRule> & { diagnosis: string; icd10?: string; specialty?: V2Specialty }> = [],
): ExpandedLibraryV2 {
  const base: V2DiseaseRule[] = BUILTIN_DISEASES_V2;
  const seen = new Set(base.map((d) => d.diagnosis));
  const merged: V2DiseaseRule[] = [...base];
  let added = 0;

  for (const nd of newDiseases ?? []) {
    const name = (nd?.diagnosis ?? '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    merged.push({
      diagnosis: name,
      icd10: nd.icd10 ?? 'R69.x00',
      specialty: nd.specialty ?? '神经',
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

  const bySpecialty: Record<V2Specialty, number> = {
    神经: 0,
    泌尿: 0,
    血液: 0,
    风湿免疫: 0,
  };
  for (const d of merged) bySpecialty[d.specialty] += 1;

  return {
    total: merged.length,
    bySpecialty,
    diseases: merged.map((d) => ({ diagnosis: d.diagnosis, icd10: d.icd10, specialty: d.specialty })),
    added,
    disclaimer: DISCLAIMER_V2,
  };
}

/* ===========================================================================
 * 2. improveDifferentialDiagnosisV2 —— 鉴别诊断 V2
 * ======================================================================== */
export interface DifferentialCandidateV2 {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: V2Specialty;
  likelihood: number;
  evidence: string[];
  labEvidence: string[];
  discriminators: Array<{ with: string; how: string }>;
}

export interface DifferentialResultV2 {
  candidates: DifferentialCandidateV2[];
  alerts: string[];
  generatedAt: string;
  disclaimer: string;
}

/**
 * 鉴别诊断 V2（纯函数）：
 *   同时考虑症状、病史、化验结果。化验阳性/阴性修正候选可能性；
 *   化验方向与预期矛盾时扣分。并扫描神经/出血/尿潴留等高风险红旗。
 */
export function improveDifferentialDiagnosisV2(
  symptoms: Array<{ name: string; onset?: string }> = [],
  history: string[] | { chronicDiseases?: string[]; notes?: string } = [],
  labResults: V2LabResult[] = [],
): DifferentialResultV2 {
  const symText = textOfSymptomsV2(symptoms);
  const histText = textOfHistoryV2(history);
  const labs = labTextV2(labResults);

  interface Scored {
    rule: V2DiseaseRule;
    score: number;
    evidence: string[];
    labEvidence: string[];
  }
  const scored: Scored[] = [];

  for (const rule of BUILTIN_DISEASES_V2) {
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
      const m = matchLabV2(labs, el);
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

  const candidates: DifferentialCandidateV2[] = scored.slice(0, 6).map((s, i) => ({
    rank: i + 1,
    diagnosis: s.rule.diagnosis,
    icd10: s.rule.icd10,
    specialty: s.rule.specialty,
    likelihood: round2(Math.max(0.05, Math.min(0.95, 0.15 + s.score * 0.35))),
    evidence: s.evidence,
    labEvidence: s.labEvidence,
    discriminators: s.rule.discriminators,
  }));

  // 红旗扫描（V2 四大系统）
  const alerts: string[] = [];
  if (/偏瘫|口角歪斜|言语不清|突发/.test(symText)) {
    alerts.push('突发局灶神经体征(偏瘫/口角歪斜/言语不清)：警惕急性脑卒中，立即头颅 CT 并评估溶栓/取栓时间窗。');
  }
  if (/剧烈头痛|呕吐/.test(symText) && (/高血压|意识/.test(symText))) {
    alerts.push('突发剧烈头痛伴呕吐/意识改变：警惕脑出血/蛛网膜下腔出血，立即头颅 CT。');
  }
  if (/抽搐/.test(symText) && /意识丧失/.test(symText)) {
    alerts.push('抽搐伴意识丧失：若持续>5 分钟为癫痫持续状态，立即地西泮静推并保护气道。');
  }
  if (/腰痛|绞痛/.test(symText) && /血尿/.test(symText)) {
    alerts.push('腰腹绞痛伴血尿：警惕上尿路结石梗阻，评估有无感染/肾功能损害。');
  }
  if (/发热/.test(symText) && (/瘀斑|出血/.test(symText))) {
    alerts.push('发热伴皮肤瘀斑/出血：警惕急性白血病/感染相关凝血障碍，紧急血常规+凝血功能。');
  }
  if (/腰痛/.test(symText) && /尿频|尿急/.test(symText) && /发热/.test(symText)) {
    alerts.push('腰痛伴膀胱刺激征+发热：警惕急性肾盂肾炎/尿源性脓毒症，尽早抗感染。');
  }
  if (alerts.length === 0) alerts.push('未识别到紧急红旗信号，仍以执业医师面诊为准。');

  return {
    candidates,
    alerts,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER_V2,
  };
}

/* ===========================================================================
 * 3. suggestTreatmentPlanV2 —— 治疗方案 V2
 * ======================================================================== */
export interface TreatmentPlanV2 {
  diagnosis: string;
  icd10: string;
  specialty: V2Specialty;
  meds: V2TreatmentMed[];
  lifestyle: string[];
  monitoring: string[];
  specialPopulation: string;
  personalizedNotes: string[];
  generatedAt: string;
  disclaimer: string;
}

/**
 * 治疗方案 V2（纯函数）：
 *   按诊断名（或 ICD10）反查内置治疗方案，并结合患者特征（年龄/性别/
 *   合并症/妊娠）给出个体化注意事项。
 */
export function suggestTreatmentPlanV2(
  diagnosis: string,
  patientFeatures: V2PatientFeatures = {},
): TreatmentPlanV2 {
  const key = (diagnosis ?? '').trim().toLowerCase();
  const rule = BUILTIN_DISEASES_V2.find(
    (r) => r.diagnosis.toLowerCase() === key || r.icd10.toLowerCase() === key,
  );

  const feat = patientFeatures ?? {};
  const age = Number.isFinite(feat.age) ? Math.floor(feat.age ?? 0) : 0;
  const comorbid = (feat.comorbidities ?? []).join(' ');

  const personalizedNotes: string[] = [];
  if (!rule) {
    personalizedNotes.push(`未在 V2 病种库中匹配到「${diagnosis}」，请补充诊断名或由临床医师个体化制定方案。`);
  } else {
    if (age >= 65) {
      personalizedNotes.push(`老年患者(${age} 岁)：起始剂量宜小、缓慢滴定，重点防跌倒/低血压/肾功能损伤。`);
    }
    if (feat.pregnant) {
      personalizedNotes.push('妊娠/哺乳期：所有用药须经产科评估，避免妊娠禁忌药物(如甲氨蝶呤/丙戊酸钠/喹诺酮)。');
    }
    if (/肾|慢性肾病|ckd|肌酐/.test(comorbid)) {
      personalizedNotes.push('合并慢性肾病：经肾排泄药物需按 eGFR 调整剂量，监测肌酐/电解质。');
    }
    if (/肝|肝硬化/.test(comorbid)) {
      personalizedNotes.push('合并肝病：经肝代谢/凝血相关药物需减量，监测肝功能与凝血。');
    }
    if (/抗凝|华法林|阿司匹林|出血/.test(comorbid)) {
      personalizedNotes.push('合并抗凝/出血风险：NSAIDs、抗血小板药需谨慎，评估出血预防。');
    }
    if (/高血压|糖尿病|房颤/.test(comorbid)) {
      personalizedNotes.push('合并脑血管病危险因素：神经科相关疾病需同步管理血压/血糖/血脂与抗栓。');
    }
    if (personalizedNotes.length === 0) {
      personalizedNotes.push('无特殊个体化提示，按指南常规方案执行。');
    }
  }

  return {
    diagnosis: rule?.diagnosis ?? (diagnosis ?? ''),
    icd10: rule?.icd10 ?? 'R69.x00',
    specialty: rule?.specialty ?? '神经',
    meds: rule ? rule.treatment.meds.map((m) => ({ ...m })) : [],
    lifestyle: rule ? [...rule.treatment.lifestyle] : [],
    monitoring: rule ? [...rule.treatment.monitoring] : [],
    specialPopulation: rule?.treatment.specialPopulation ?? '需个体化评估。',
    personalizedNotes,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER_V2,
  };
}

/** 内置 V2 病种库规模（运营/统计用） */
export const BUILTIN_DISEASE_COUNT_V2 = BUILTIN_DISEASES_V2.length;
