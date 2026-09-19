/**
 * 健澜科技数智医院智能体 - 处方药品Mock数据
 *
 * 内置常用药品说明书目录（通用名）及处方Mock数据/内存存储。
 * 所有数据均为虚构，仅供工具开发与测试使用，不构成临床用药依据。
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

// 相对日期工具复用：处方开立/审核时间相对今天动态生成，避免 time-bomb 硬编码
import { mockDateTime } from '../patient-service/patientServiceData.js';

// ============================================================================
// 药品说明书目录
// ============================================================================

/** 药品说明书信息 */
export interface DrugInfo {
  /** 药品通用名 */
  genericName: string;
  /** 别名/简称（用于处方模糊匹配） */
  aliases: string[];
  /** 药理分类 */
  category: string;
  /** 剂型 */
  dosageForm: string;
  /** 规格 */
  specification: string;
  /** 适应症 */
  indication: string;
  /** 用法用量 */
  dosage: string;
  /** 常见不良反应 */
  adverseReactions: string[];
  /** 禁忌症 */
  contraindications: string[];
  /** 注意事项 */
  precautions: string[];
  /** 主要药物相互作用 */
  interactions: string[];
  /** 医保类别 */
  insurance: '甲类' | '乙类' | '丙类';
  /** 单价（元，按最小单位/片/支计，用于费用预估） */
  unitPrice: number;
}

/** 常用药品说明书目录（15+种，均为通用名） */
export const DRUG_CATALOG: DrugInfo[] = [
  {
    genericName: '阿司匹林肠溶片',
    aliases: ['阿司匹林', 'aspirin', '拜阿司匹灵'],
    category: '抗血小板药',
    dosageForm: '肠溶片',
    specification: '100mg',
    indication:
      '降低急性心肌梗死疑似患者的发病风险；预防心肌梗死复发；中风的二级预防；短暂性脑缺血发作（TIA）；降低稳定性和不稳定性心绞痛患者的发病风险；心血管危险因素（糖尿病、高血压、肥胖等）的一级预防。',
    dosage: '成人常用量：75-100mg，每日一次，口服。急性冠脉综合征起始负荷量300mg嚼服。',
    adverseReactions: [
      '胃肠道不适（恶心、呕吐、腹痛）',
      '消化道出血、溃疡',
      '出血倾向（皮肤瘀斑、牙龈出血）',
      '过敏反应（皮疹、哮喘）',
      '肝肾功能损害（大剂量）',
    ],
    contraindications: [
      '对阿司匹林或其他水杨酸类药物过敏者',
      '活动性消化道溃疡/出血',
      '出血体质、严重肝肾功能衰竭',
      '妊娠最后三个月',
      '儿童和青少年病毒感染伴发热时慎用（Reye综合征）',
    ],
    precautions: [
      '与抗凝药/抗血小板药联用增加出血风险',
      '择期手术前5-7天停药',
      '长期使用应定期监测血常规、便潜血',
      '饮酒可增加胃肠道出血风险',
    ],
    interactions: [
      '与氯吡格雷联用：双联抗血小板，出血风险增加2-3倍',
      '与华法林联用：禁忌，严重出血风险',
      '与甲氨蝶呤联用：增加甲氨蝶呤毒性',
      '与其他NSAIDs联用：增加消化道不良反应',
    ],
    insurance: '甲类',
    unitPrice: 0.35,
  },
  {
    genericName: '氯吡格雷片',
    aliases: ['氯吡格雷', '波立维', 'clopidogrel'],
    category: '抗血小板药',
    dosageForm: '片剂',
    specification: '75mg',
    indication:
      '用于预防动脉粥样硬化血栓形成事件：近期心肌梗死、近期缺血性卒中或确诊外周动脉性疾病患者；急性冠脉综合征患者（与阿司匹林联用）。',
    dosage: '成人常用量：75mg，每日一次，口服。急性冠脉综合征起始负荷量300-600mg，之后75mg qd。',
    adverseReactions: [
      '出血（皮肤瘀斑、鼻出血、消化道出血）',
      '腹泻、腹痛、消化不良',
      '皮疹',
      '血小板减少（罕见）',
    ],
    contraindications: ['对本品成分过敏', '活动性出血（消化性溃疡、颅内出血等）', '严重肝功能损伤'],
    precautions: [
      '择期手术前应停用5-7天',
      '出血性疾病患者慎用',
      '与质子泵抑制剂（奥美拉唑）联用降低疗效，优先选泮托拉唑',
      'CYP2C19慢代谢者疗效降低',
    ],
    interactions: [
      '与阿司匹林联用：双联抗血小板，出血风险增加',
      '与奥美拉唑/埃索美拉唑联用：抑制氯吡格雷活化',
      '与华法林联用：增加出血风险',
      '与NSAIDs联用：增加胃肠道出血风险',
    ],
    insurance: '乙类',
    unitPrice: 2.8,
  },
  {
    genericName: '阿托伐他汀钙片',
    aliases: ['阿托伐他汀', '立普妥', 'atorvastatin'],
    category: '调脂药（他汀类）',
    dosageForm: '片剂',
    specification: '20mg',
    indication:
      '高胆固醇血症、混合型高脂血症；冠心病或冠心病等危症（如糖尿病）合并高胆固醇血症患者，降低非致死性心肌梗死、致死性和非致死性卒中、血运重建、心绞痛住院风险。',
    dosage: '成人常用起始量10-20mg，每日一次，晚餐时或睡前口服。可增至80mg qd。',
    adverseReactions: [
      '肌痛、关节痛',
      '转氨酶升高',
      '胃肠道不适',
      '横纹肌溶解（罕见）',
      '血糖轻度升高',
    ],
    contraindications: [
      '活动性肝脏疾病',
      '对本品过敏',
      '妊娠及哺乳期妇女',
      '不明原因转氨酶持续升高超过3倍正常上限',
    ],
    precautions: [
      '用药前及用药后4-12周监测肝功能',
      '出现肌痛、肌无力应查CK',
      '与CYP3A4强抑制剂（克拉霉素、伊曲康唑）联用增加肌病风险',
      '大量西柚汁可升高血药浓度',
    ],
    interactions: [
      '与克拉霉素/伊曲康唑联用：血药浓度升高4-5倍，横纹肌溶解风险',
      '与环孢素联用：禁忌',
      '与吉非贝齐联用：增加肌病风险',
      '与华法林联用：可轻度增强抗凝',
    ],
    insurance: '乙类',
    unitPrice: 1.5,
  },
  {
    genericName: '美托洛尔缓释片',
    aliases: ['美托洛尔', '倍他乐克', 'metoprolol'],
    category: 'β受体阻滞剂',
    dosageForm: '缓释片',
    specification: '47.5mg',
    indication:
      '高血压、心绞痛、伴有左心室收缩功能异常的症状稳定的慢性心力衰竭、心肌梗死的二级预防、快速性心律失常。',
    dosage: '高血压：47.5-95mg qd。心绞痛：47.5-142.5mg qd。应个体化滴定，不可骤然停药。',
    adverseReactions: [
      '心动过缓、心悸',
      '头晕、乏力',
      '四肢发凉',
      '支气管痉挛（哮喘患者）',
      '影响糖代谢，掩盖低血糖症状',
      '房室传导阻滞',
    ],
    contraindications: [
      '心源性休克',
      '病态窦房结综合征',
      '二度及以上房室传导阻滞',
      '不稳定的、失代偿性心力衰竭',
      '有症状的心动过缓或低血压',
      '严重支气管哮喘/COPD',
    ],
    precautions: [
      '不可骤然停药，须在2周内逐渐减量',
      '糖尿病患者注意掩盖低血糖症状',
      '外周血管疾病患者可能加重症状',
      '手术前应告知麻醉医师',
    ],
    interactions: [
      '与维拉帕米/地尔硫卓联用：可致心动过缓、低血压',
      '与胰岛素/口服降糖药联用：掩盖低血糖症状',
      '与地高辛联用：减慢房室传导',
      '与非甾体抗炎药联用：减弱降压作用',
    ],
    insurance: '甲类',
    unitPrice: 1.2,
  },
  {
    genericName: '氨氯地平片',
    aliases: ['氨氯地平', '络活喜', 'amlodipine'],
    category: '钙通道阻滞剂',
    dosageForm: '片剂',
    specification: '5mg',
    indication:
      '高血压（单独或与其他抗高血压药合用）；慢性稳定性心绞痛；血管痉挛性心绞痛（变异型心绞痛）；经血管造影证实的冠心病。',
    dosage: '成人起始5mg qd，最大10mg qd。老年、肝功能不全者起始2.5mg qd。',
    adverseReactions: ['脚踝水肿', '面部潮红', '头痛、头晕', '心悸', '牙龈增生', '低血压'],
    contraindications: ['对二氢吡啶类钙拮抗剂过敏', '严重低血压', '重度主动脉瓣狭窄', '心源性休克'],
    precautions: [
      '肝功能不全患者需减量',
      '开始治疗或加量后可能出现心绞痛/心梗加重',
      '与β受体阻滞剂合用可致严重低血压',
      '孕妇及哺乳期慎用',
    ],
    interactions: [
      '与辛伐他汀联用：增加辛伐他汀暴露，建议辛伐他汀≤20mg',
      '与CYP3A4强抑制剂（伊曲康唑、克拉霉素）联用：血药浓度升高',
      '与葡萄柚汁同服：升高血药浓度',
      '与咪贝地尔联用：禁忌',
    ],
    insurance: '甲类',
    unitPrice: 0.5,
  },
  {
    genericName: '左氧氟沙星片',
    aliases: ['左氧氟沙星', 'levofloxacin', '可乐必妥'],
    category: '喹诺酮类抗菌药',
    dosageForm: '片剂',
    specification: '0.5g',
    indication:
      '敏感菌引起的呼吸道感染、泌尿系统感染、生殖系统感染、皮肤软组织感染、肠道感染等社区获得性感染。',
    dosage:
      '成人常用0.5g，每日一次口服。根据感染部位和肾功能调整疗程。肾功能不全（CrCl<50ml/min）需减量。',
    adverseReactions: [
      '胃肠道反应（恶心、腹泻）',
      '肌腱炎/肌腱断裂（尤其跟腱）',
      'QT间期延长',
      '中枢神经系统兴奋（失眠、焦虑、癫痫）',
      '光敏反应',
      '血糖紊乱',
      '周围神经病变',
    ],
    contraindications: [
      '对喹诺酮类药物过敏',
      '18岁以下患者',
      '妊娠及哺乳期妇女',
      '有喹诺酮类药物相关肌腱病变史',
      '已知QT间期延长或低钾血症',
    ],
    precautions: [
      '用药期间避免暴晒',
      '肾功能不全需调整剂量',
      '老年、合用糖皮质激素者肌腱断裂风险增加',
      '重症肌无力患者可能加重',
      '避免与延长QT间期药物联用',
    ],
    interactions: [
      '与含铝/镁抗酸药、铁剂、锌剂同服：需间隔2小时',
      '与非甾体抗炎药联用：增加中枢兴奋和抽搐风险',
      '与华法林联用：增强抗凝作用',
      '与降糖药联用：引起血糖紊乱',
      '与延长QT药物联用：增加心律失常风险',
    ],
    insurance: '甲类',
    unitPrice: 1.8,
  },
  {
    genericName: '奥美拉唑肠溶胶囊',
    aliases: ['奥美拉唑', '洛赛克', 'omeprazole'],
    category: '质子泵抑制剂（PPI）',
    dosageForm: '肠溶胶囊',
    specification: '20mg',
    indication:
      '胃溃疡、十二指肠溃疡、应激性溃疡、反流性食管炎、卓-艾综合征（胃泌素瘤）；与适当抗菌药物联合根除幽门螺杆菌。',
    dosage:
      '消化性溃疡：20mg qd，晨起吞服，疗程2-8周。根除Hp：20mg bid，联合两种抗生素，疗程10-14天。反流性食管炎：20-60mg qd。',
    adverseReactions: [
      '头痛、腹泻、恶心、腹痛',
      '便秘、腹胀',
      '长期使用：维生素B12吸收障碍、骨质疏松、肠道菌群紊乱',
      '低镁血症',
      '间质性肾炎（罕见）',
    ],
    contraindications: ['对本品或苯并咪唑类化合物过敏', '与奈非那韦等HIV蛋白酶抑制剂联用'],
    precautions: [
      '怀疑胃溃疡时应先排除恶性肿瘤',
      '长期使用应监测镁、维生素B12、骨密度',
      '肝肾功能不全无需调整剂量',
      '肠溶胶囊不可咀嚼或压碎',
    ],
    interactions: [
      '与氯吡格雷联用：抑制CYP2C19，降低氯吡格雷抗血小板疗效',
      '与华法林联用：可能延长INR',
      '与地西泮、苯妥英联用：升高血药浓度',
      '与伊曲康唑/酮康唑联用：降低吸收',
      '与甲氨蝶呤联用：增加甲氨蝶呤毒性',
    ],
    insurance: '甲类',
    unitPrice: 0.6,
  },
  {
    genericName: '二甲双胍片',
    aliases: ['二甲双胍', 'metformin', '格华止'],
    category: '双胍类降糖药',
    dosageForm: '片剂',
    specification: '0.5g',
    indication:
      '首选用于单纯饮食控制及体育锻炼治疗无效的2型糖尿病，特别是肥胖的2型糖尿病；可与磺脲类或胰岛素合用。',
    dosage: '起始0.5g每日1-2次，随餐服用；渐增至常规量1.5-2g/日，最大2.55g/日。缓释片可每日一次。',
    adverseReactions: [
      '胃肠道反应（腹泻、恶心、腹胀）',
      '金属味、食欲减退',
      '乳酸性酸中毒（罕见但严重）',
      '维生素B12吸收减少（长期使用）',
      '低血糖（单用少见）',
    ],
    contraindications: [
      '肾功能不全（eGFR<30ml/min/1.73m²）',
      '急性/慢性代谢性酸中毒',
      '严重感染、缺氧、重大手术',
      '酗酒',
      '维生素B12、叶酸缺乏未纠正',
      '妊娠及哺乳期',
    ],
    precautions: [
      '造影检查前后需停用（eGFR 30-60者造影前48h停用，造影后48h复查肾功能正常后恢复）',
      '长期使用监测维生素B12',
      '出现呕吐、脱水应及时停药',
      '肾功能需定期监测',
    ],
    interactions: [
      '与碘造影剂联用：增加乳酸性酸中毒风险',
      '与酒精联用：增加乳酸酸中毒风险',
      '与西咪替丁联用：升高二甲双胍血药浓度',
      '与华法林联用：增强抗凝',
      '与噻嗪类利尿剂联用：升高血糖',
    ],
    insurance: '甲类',
    unitPrice: 0.25,
  },
  {
    genericName: '门冬胰岛素注射液',
    aliases: ['胰岛素', '门冬胰岛素', 'insulin', '诺和锐'],
    category: '胰岛素类似物（速效）',
    dosageForm: '注射液',
    specification: '3ml:300单位',
    indication:
      '用于糖尿病的治疗，包括1型糖尿病和需要胰岛素控制的2型糖尿病；皮下注射，紧邻餐前给药，必要时可在餐后立即给药。',
    dosage:
      '个体化剂量，通常0.3-1.0单位/kg/日。餐前皮下注射，注射后10分钟内进食。可与中/长效胰岛素联合。',
    adverseReactions: [
      '低血糖（最常见）',
      '注射部位反应（红肿、瘙痒、脂肪萎缩）',
      '体重增加',
      '过敏反应',
      '低钾血症',
    ],
    contraindications: ['低血糖发作时', '对本品或其他成分过敏'],
    precautions: [
      '用药后须按时进餐，避免低血糖',
      '驾车或操作机械者注意低血糖',
      '肝肾功能不全需减量',
      '注射部位应轮换',
      '剂量改变、运动、饮食变化需监测血糖',
      '不可静脉推注门冬胰岛素笔芯',
    ],
    interactions: [
      '与口服降糖药联用：增强降糖作用',
      '与β受体阻滞剂联用：掩盖低血糖症状',
      '与糖皮质激素/噻嗪类利尿剂联用：升高血糖，需加量',
      '与酒精联用：增强并延长低血糖',
      '与奥曲肽/达那唑联用：影响血糖',
    ],
    insurance: '乙类',
    unitPrice: 68.0,
  },
  {
    genericName: '头孢呋辛酯片',
    aliases: ['头孢呋辛', '西力欣', 'cefuroxime'],
    category: '第二代头孢菌素',
    dosageForm: '片剂',
    specification: '0.25g',
    indication:
      '溶血性链球菌、肺炎球菌、流感嗜血杆菌等敏感菌所致的呼吸道、耳鼻喉、泌尿系统、皮肤软组织感染；儿童急性中耳炎。',
    dosage:
      '成人一般感染：0.25g bid；较重下呼吸道感染：0.5g bid。一般疗程7天。餐后服用以增加吸收。',
    adverseReactions: [
      '胃肠道反应（腹泻、恶心）',
      '伪膜性肠炎（罕见）',
      '过敏（皮疹、瘙痒）',
      '肝酶一过性升高',
      '血液系统异常（嗜酸性粒细胞增多）',
      '二重感染',
    ],
    contraindications: ['对头孢菌素类抗生素过敏', '有青霉素过敏性休克史者慎用/禁用'],
    precautions: [
      '严重肾功能不全需减量',
      '与青霉素类存在部分交叉过敏',
      '长期使用监测肝肾功能及凝血功能',
      '片剂不可用于咀嚼吞咽困难者',
      '服药期间及停药后1周避免饮酒（双硫仑样反应）',
    ],
    interactions: [
      '与强效利尿剂（呋塞米）联用：增加肾毒性风险',
      '与丙磺舒联用：升高血药浓度',
      '与口服避孕药联用：可能降低避孕效果',
      '与酒精同服：双硫仑样反应',
    ],
    insurance: '甲类',
    unitPrice: 1.1,
  },
  {
    genericName: '布洛芬缓释胶囊',
    aliases: ['布洛芬', 'ibuprofen', '芬必得'],
    category: '非甾体抗炎药（NSAIDs）',
    dosageForm: '缓释胶囊',
    specification: '0.3g',
    indication:
      '缓解轻至中度疼痛如头痛、关节痛、偏头痛、牙痛、肌肉痛、痛经；普通感冒或流感引起的发热。',
    dosage: '成人一次0.3g，一日2次（早晚各一次），口服。建议餐后服用。',
    adverseReactions: [
      '胃肠道不适（胃痛、恶心、溃疡、出血）',
      '头晕、头痛',
      '皮疹',
      '肾功能损害',
      '肝功能异常',
      '心血管血栓事件风险（长期大剂量）',
    ],
    contraindications: [
      '对本品或其他NSAIDs过敏',
      '活动性消化道溃疡/出血',
      '冠状动脉搭桥手术围手术期疼痛',
      '严重心力衰竭',
      '严重肝肾功能不全',
      '妊娠最后三个月',
    ],
    precautions: [
      '避免与其他NSAIDs/阿司匹林同用',
      '有消化道溃疡史者慎用，建议联用PPI',
      '高血压、心衰患者注意水钠潴留',
      '老年患者减量',
      '不可长期自行服用（解热≤3天，止痛≤5天）',
    ],
    interactions: [
      '与阿司匹林/氯吡格雷联用：增加出血风险',
      '与华法林联用：增强抗凝，出血风险',
      '与ACEI/ARB联用：降低降压并增加肾损伤',
      '与糖皮质激素联用：增加消化道出血',
      '与锂剂/甲氨蝶呤联用：升高其血药浓度',
    ],
    insurance: '甲类',
    unitPrice: 0.4,
  },
  {
    genericName: '氨溴索口服液',
    aliases: ['氨溴索', 'ambroxol', '沐舒坦'],
    category: '祛痰药',
    dosageForm: '口服溶液',
    specification: '100ml:0.6g',
    indication:
      '伴有痰液分泌不正常及排痰功能不良的急性、慢性呼吸道疾病，如慢性支气管炎急性加重、喘息型支气管炎、支气管扩张及支气管哮喘的祛痰治疗。',
    dosage: '成人及12岁以上：每次30mg（10ml），每日3次；长期使用可减至每日2次。餐后服用。',
    adverseReactions: [
      '轻微胃肠道不适（胃部灼热、恶心）',
      '皮疹',
      '罕见过敏反应',
      '口腔和气道分泌增加',
    ],
    contraindications: ['对本品过敏者'],
    precautions: [
      '应避免与中枢性镇咳药（右美沙芬）同用，以免稀释痰液堵塞气道',
      '孕妇（尤其前3个月）及哺乳期慎用',
      '胃溃疡患者慎用',
      '本品含山梨醇，果糖不耐受者注意',
    ],
    interactions: [
      '与抗生素（阿莫西林、头孢呋辛、红霉素）联用：可升高抗生素在肺组织浓度',
      '与中枢性镇咳药联用：痰液潴留风险',
    ],
    insurance: '甲类',
    unitPrice: 0.9,
  },
  {
    genericName: '硝苯地平控释片',
    aliases: ['硝苯地平', 'nifedipine', '拜新同'],
    category: '钙通道阻滞剂',
    dosageForm: '控释片',
    specification: '30mg',
    indication: '高血压、冠心病（慢性稳定型心绞痛，劳力性心绞痛）。',
    dosage: '成年人通常每日一次，每次30mg，口服。控释片须整片吞服，勿咬、嚼。',
    adverseReactions: [
      '面部潮红、头痛',
      '脚踝水肿',
      '心悸、心动过速',
      '牙龈增生',
      '便秘',
      '低血压',
    ],
    contraindications: [
      '对硝苯地平或二氢吡啶类过敏',
      '心源性休克',
      'Kock小囊（回肠造瘘）',
      '妊娠20周内及哺乳期',
      '重度主动脉瓣狭窄、不稳定型心绞痛',
    ],
    precautions: [
      '控释片不可掰开或嚼碎',
      '肝功能不全者需减量',
      '与葡萄柚汁同服升高血药浓度',
      '停药应逐渐减量',
      '血压正常的冠心病患者血压可能降低',
    ],
    interactions: [
      '与β受体阻滞剂联用：可致严重低血压、心功能抑制',
      '与葡萄柚汁同服：血药浓度升高',
      '与地高辛联用：可能升高地高辛浓度',
      '与西沙必利联用：升高硝苯地平浓度',
      '与大环内酯类联用：血药浓度升高',
    ],
    insurance: '乙类',
    unitPrice: 3.2,
  },
  {
    genericName: '缬沙坦胶囊',
    aliases: ['缬沙坦', 'valsartan', '代文'],
    category: '血管紧张素Ⅱ受体拮抗剂（ARB）',
    dosageForm: '胶囊',
    specification: '80mg',
    indication:
      '轻、中度原发性高血压；心力衰竭（降低心血管死亡和心衰住院风险）；急性心肌梗死后合并心衰/左心室功能不全。',
    dosage: '高血压：80mg qd，可增至160mg qd，最大320mg/日。可与其他降压药合用。',
    adverseReactions: [
      '头晕',
      '体位性低血压',
      '高钾血症',
      '肾功能恶化（双侧肾动脉狭窄者）',
      '咳嗽（较ACEI少见）',
      '疲劳',
    ],
    contraindications: [
      '对本品过敏',
      '妊娠中晚期',
      '严重肝功能损伤、胆汁性肝硬化和胆汁淤积',
      '糖尿病患者联用阿利吉仑',
      '重度肾功能损害（CrCl<10）慎用',
    ],
    precautions: [
      '开始用药或加量后监测血压和肾功能、血钾',
      '钠缺乏或血容量不足者应先纠正',
      '双侧肾动脉狭窄患者禁用',
      '手术前24小时停药',
      '不可补钾或联用保钾利尿剂而不监测血钾',
    ],
    interactions: [
      '与保钾利尿剂/补钾剂联用：增加高钾血症',
      '与锂剂联用：升高锂血药浓度',
      '与NSAIDs联用：降低降压并增加肾损伤',
      '与ACEI联用：增加高钾血症和肾损害（一般不推荐）',
      '与阿利吉仑联用：糖尿病患者禁忌',
    ],
    insurance: '乙类',
    unitPrice: 2.0,
  },
  {
    genericName: '华法林钠片',
    aliases: ['华法林', 'warfarin'],
    category: '口服抗凝药（维生素K拮抗剂）',
    dosageForm: '片剂',
    specification: '2.5mg',
    indication:
      '预防和治疗深静脉血栓形成及肺栓塞；预防心房颤动、心脏瓣膜置换术后的心源性血栓栓塞（卒中、体循环栓塞）；心肌梗死后的辅助治疗。',
    dosage:
      '个体化为基础，通常起始2.5-3mg qd，根据INR调整剂量。目标INR一般2.0-3.0（机械瓣2.5-3.5）。',
    adverseReactions: [
      '出血（最主要风险：皮肤瘀斑、牙龈出血、消化道/颅内出血）',
      '恶心、腹泻',
      '皮肤坏死（罕见，蛋白C/S缺乏）',
      '紫趾综合征',
      '肝功能异常',
    ],
    contraindications: [
      '活动性出血或有出血倾向',
      '严重高血压未控制',
      '近期颅脑/眼科/脊髓手术',
      '中枢神经系统或眼部肿瘤',
      '主动脉夹层、动脉瘤',
      '妊娠（可致胎儿畸形）',
      '严重肝肾功能不全',
    ],
    precautions: [
      '必须定期监测INR，目标2.0-3.0',
      '告知患者出血征象，出现黑便、血尿、头痛立即就医',
      '与众多药物、食物相互作用，新增/停用药物须监测',
      '富含维生素K食物（菠菜、西兰花）应相对定量',
      '外伤、手术、拔牙前需停药并桥接',
    ],
    interactions: [
      '与阿司匹林/氯吡格雷联用：禁忌，出血风险增加4-6倍',
      '与广谱抗生素联用：抑制肠道菌群，增强抗凝',
      '与胺碘酮联用：显著增强抗凝',
      '与糖皮质激素联用：增加出血',
      '与银杏叶/丹参等中药联用：增加出血',
      '富含维生素K食物：减弱抗凝',
    ],
    insurance: '甲类',
    unitPrice: 0.18,
  },
];

/**
 * 按药品通用名/别名模糊匹配药品
 * @param name - 药品名称
 * @returns 匹配的药品信息，未找到返回undefined
 */
export function findDrugInfo(name: string): DrugInfo | undefined {
  const normalized = name.trim();
  return DRUG_CATALOG.find(
    (drug) =>
      drug.genericName.includes(normalized) ||
      normalized.includes(drug.genericName) ||
      drug.aliases.some((alias) => normalized.includes(alias) || alias.includes(normalized)),
  );
}

/**
 * 根据药品名称与数量计算费用预估
 * @param drugName - 药品名称
 * @param quantity - 数量
 * @returns 费用（元），未匹配药品返回0并标记unknown
 */
export function estimateDrugFee(
  drugName: string,
  quantity: number,
): {
  fee: number;
  matched: boolean;
  unitPrice: number | null;
} {
  const drug = findDrugInfo(drugName);
  if (!drug) return { fee: 0, matched: false, unitPrice: null };
  return { fee: drug.unitPrice * quantity, matched: true, unitPrice: drug.unitPrice };
}

// ============================================================================
// 处方Mock数据与内存存储
// ============================================================================

/** 处方明细项 */
export interface PrescriptionItem {
  drugName: string;
  specification: string;
  dosage: string;
  frequency: string;
  days: number;
  quantity: number;
  usage: string;
}

/** 处方状态 */
export type PrescriptionStatus = '待审核' | '已审核' | '已发药' | '已驳回' | '已退回';

/** 处方记录 */
export interface MockPrescription {
  prescriptionId: string;
  patientId: string;
  encounterId: string;
  prescriptionType: '西药' | '中成药' | '中药饮片';
  status: PrescriptionStatus;
  items: PrescriptionItem[];
  diagnosis: string | null;
  doctorId: string;
  doctorName: string;
  pharmacist: string | null;
  totalFee: number;
  safetyCheckSummary: string;
  createdAt: string;
  auditedAt: string | null;
  auditComment: string | null;
}

/** 种子处方数据 */
export const SEED_PRESCRIPTIONS: MockPrescription[] = [
  {
    prescriptionId: 'RX20260912001',
    patientId: 'P2026090001',
    encounterId: 'E20260912001',
    prescriptionType: '西药',
    status: '已审核',
    items: [
      {
        drugName: '阿司匹林肠溶片',
        specification: '100mg',
        dosage: '100mg',
        frequency: 'qd',
        days: 30,
        quantity: 30,
        usage: '口服，每日一次，每次1片',
      },
      {
        drugName: '阿托伐他汀钙片',
        specification: '20mg',
        dosage: '20mg',
        frequency: 'qn',
        days: 30,
        quantity: 30,
        usage: '口服，每晚一次，每次1片',
      },
    ],
    diagnosis: '冠状动脉粥样硬化性心脏病、不稳定型心绞痛',
    doctorId: 'D0001',
    doctorName: '王主任',
    pharmacist: '药师-赵',
    totalFee: 28.5,
    safetyCheckSummary: '无严重风险；阿司匹林与氯吡格雷双联抗血小板为已知治疗方案',
    createdAt: mockDateTime(-7, 10, 20),
    auditedAt: mockDateTime(-7, 10, 45),
    auditComment: '审核通过，用药合理',
  },
  {
    prescriptionId: 'RX20260910002',
    patientId: 'P2026090002',
    encounterId: 'E20260910004',
    prescriptionType: '西药',
    status: '待审核',
    items: [
      {
        drugName: '左氧氟沙星片',
        specification: '0.5g',
        dosage: '0.5g',
        frequency: 'qd',
        days: 7,
        quantity: 7,
        usage: '口服，每日一次，每次1片',
      },
      {
        drugName: '氨溴索口服液',
        specification: '100ml:0.6g',
        dosage: '30mg',
        frequency: 'tid',
        days: 7,
        quantity: 1,
        usage: '口服，每日三次，每次10ml',
      },
    ],
    diagnosis: '社区获得性肺炎、慢性阻塞性肺疾病急性加重',
    doctorId: 'D0002',
    doctorName: '陈医生',
    pharmacist: null,
    totalFee: 25.5,
    safetyCheckSummary: '磺胺过敏已记录，未使用磺胺类药物；左氧氟沙星肾功能需评估',
    createdAt: mockDateTime(-6, 9, 10),
    auditedAt: null,
    auditComment: null,
  },
  {
    prescriptionId: 'RX20260911003',
    patientId: 'P2026090003',
    encounterId: 'E20260911007',
    prescriptionType: '西药',
    status: '已发药',
    items: [
      {
        drugName: '奥美拉唑肠溶胶囊',
        specification: '20mg',
        dosage: '20mg',
        frequency: 'bid',
        days: 14,
        quantity: 28,
        usage: '口服，每日两次，每次1粒，餐前',
      },
    ],
    diagnosis: '急性胃炎、幽门螺杆菌感染',
    doctorId: 'D0003',
    doctorName: '刘医生',
    pharmacist: '药师-钱',
    totalFee: 16.8,
    safetyCheckSummary: '无严重风险',
    createdAt: mockDateTime(-8, 15, 0),
    auditedAt: mockDateTime(-8, 15, 20),
    auditComment: '审核通过',
  },
];

/**
 * 处方内存存储（模块级，供创建/审核/查询工具共享）。
 * 从种子数据初始化，创建处方时追加。
 */
export const PRESCRIPTION_STORE: MockPrescription[] = [...SEED_PRESCRIPTIONS];
