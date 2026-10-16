/**
 * ============================================================================
 * AI 能力深化——更多病种与更准诊断（M163-C）：病种扩展聚合器
 * ----------------------------------------------------------------------------
 * 在 M154-A（呼吸/消化/心血管/内分泌 16 病种）基础上，再扩四大专科 16 病种：
 *   神经：脑卒中 / 帕金森病 / 癫痫 / 偏头痛
 *   泌尿：急性肾炎 / 尿路感染 / 肾结石 / 前列腺增生
 *   血液：贫血 / 急性白血病 / 淋巴瘤 / 凝血障碍
 *   风湿免疫：类风湿关节炎 / 系统性红斑狼疮 / 干燥综合征 / 强直性脊柱炎
 *
 * 对外四个纯函数：
 *   - expandDiseaseLibrary(newDiseases)      新病种入库（校验+去重+拒收留痕）
 *   - improveDiagnosisAccuracy(model, fb)    医生反馈回流，置信度/准确率再校准
 *   - addDifferentialDiagnosis(dx, list)     为病种增补鉴别诊断（带鉴别要点）
 *   - suggestFurtherExamination(dx, feat)    按诊断+患者特征推荐进一步检查
 *
 * 医疗安全红线：
 *   - 所有内容为教科书级启发式建议，不构成诊断结论；最终由执业医师确认；
 *   - 【安全与运营】新病种入库必须经医学审核（expandDiseaseLibrary 对缺字段/重复
 *     病种一律拒收并留 rejected 清单，供运营复盘），严禁未审核病种直接上线；
 *   - 纯函数、无 I/O、无随机（仅 generatedAt 取当前时间），不写 SQL、不落库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 专科归属（M163-C 新增四科） */
export type Specialty = '神经' | '泌尿' | '血液' | '风湿免疫';

export type Gender = 'male' | 'female' | '';

/** 检查紧急度 */
export type ExamUrgency = 'stat' | 'urgent' | 'routine';

/** 鉴别诊断条目 */
export interface DifferentialEntry {
  /** 待鉴别的病名 */
  diagnosis: string;
  /** 鉴别要点：如何与主诊断区分 */
  discriminator: string;
}

/** 进一步检查建议（urgency 缺省视为 routine） */
export interface FurtherExam {
  category: '实验室' | '影像' | '特殊检查';
  name: string;
  /** 检查目的/临床意义 */
  purpose: string;
  urgency?: ExamUrgency;
}

/** 内置病种词典条目 */
export interface DiseaseEntry {
  name: string;
  icd10: string;
  specialty: Specialty;
  /** 典型症状（教科书级） */
  typicalSymptoms: string[];
  /** 典型体征 */
  signs: string[];
  /** 红旗症状——提示需紧急处理/排除危重症 */
  redFlags: string[];
  /** 鉴别诊断（带鉴别要点） */
  differential: DifferentialEntry[];
  /** 进一步检查建议 */
  furtherExams: FurtherExam[];
  /** 好发人群说明 */
  populationNote?: string;
}

/* ---------------------------------------------------------------------------
 * 内置医学词典（16 病种）——症状/体征/鉴别/检查均为内科学教科书共识内容，
 * 仅作辅助决策参考，不替代执业医师判断。
 * ------------------------------------------------------------------------ */
export const BASE_DISEASE_LIBRARY: readonly DiseaseEntry[] = [
  // ============================== 神经科 ==============================
  {
    name: '脑卒中',
    icd10: 'I64',
    specialty: '神经',
    typicalSymptoms: [
      '突发一侧肢体无力或麻木',
      '言语含糊或不能理解他人语言',
      '单侧口角歪斜、流涎',
      '突发视物模糊/视野缺损',
      '突发剧烈头痛伴呕吐（出血性多见）',
    ],
    signs: ['偏侧肢体肌力下降', '巴氏征阳性', '面瘫（中枢性）', '共济失调/眩晕'],
    redFlags: ['发病 <4.5 小时溶栓时间窗', '进行性意识障碍', '频繁呕吐提示颅内压增高'],
    differential: [
      { diagnosis: '短暂性脑缺血发作(TIA)', discriminator: '症状 24 小时内完全缓解、不留神经功能缺损' },
      { diagnosis: '低血糖脑病', discriminator: '急查血糖 <3.9mmol/L，补糖后迅速缓解' },
      { diagnosis: '颅内占位/硬膜下血肿', discriminator: '症状渐进加重而非突发，有外伤史' },
    ],
    furtherExams: [
      { category: '影像', name: '头颅 CT（平扫）', purpose: '首选快速区分缺血性与出血性卒中', urgency: 'stat' },
      { category: '影像', name: '头颅 MRI + DWI', purpose: '明确急性缺血灶及其部位范围', urgency: 'urgent' },
      { category: '实验室', name: '急查血糖、凝血四项、电解质', purpose: '排除低血糖并为溶栓/抗凝做准备', urgency: 'stat' },
      { category: '特殊检查', name: '颈动脉+椎动脉超声 / CTA', purpose: '评估颅内外血管狭窄与斑块', urgency: 'routine' },
    ],
    populationNote: '好发于中老年人，常有高血压、糖尿病、房颤、吸烟史',
  },
  {
    name: '帕金森病',
    icd10: 'G20',
    specialty: '神经',
    typicalSymptoms: ['静止性震颤（安静时明显、活动时减轻）', '动作变慢、穿衣洗漱费力', '走路慌张小碎步、转身困难'],
    signs: ['铅管样/齿轮样肌强直', '面具脸', '写字越写越小（小字征）', '体位性前倾'],
    redFlags: ['早期即出现严重痴呆或直立性低血压', '双侧对称起病', '起病急骤（警惕继发性帕金森综合征）'],
    differential: [
      { diagnosis: '特发性震颤', discriminator: '动作/姿势性震颤为主，饮酒后减轻，无肌强直与运动迟缓' },
      { diagnosis: '药物性帕金森综合征', discriminator: '有抗精神病药/甲氧氯普胺等用药史，停药后改善' },
      { diagnosis: '血管性帕金森综合征', discriminator: '有多发腔隙性脑梗死史，下肢症状重、震颤轻' },
    ],
    furtherExams: [
      { category: '影像', name: '头颅 MRI', purpose: '排除脑积水、脑血管病等继发性病因', urgency: 'routine' },
      { category: '实验室', name: '甲状腺功能、肝肾功能', purpose: '鉴别可治疗的继发性震颤病因', urgency: 'routine' },
      { category: '特殊检查', name: '黑质超声 / DAT-SPECT', purpose: '早期不典型病例辅助确诊多巴胺能神经元丢失', urgency: 'routine' },
    ],
    populationNote: '多见于 60 岁以上，起病隐匿、单侧起病渐波及对侧',
  },
  {
    name: '癫痫',
    icd10: 'G40.9',
    specialty: '神经',
    typicalSymptoms: ['发作性意识丧失、四肢抽搐', '发作前可有似曾相识感/视物变形等先兆', '发作后困倦、头痛、一过性肢体无力'],
    signs: ['发作时牙关紧闭、口吐白沫', '舌咬伤', '尿失禁', '发作后 Todd 麻痹（一过性偏瘫）'],
    redFlags: ['发作持续 >5 分钟或反复发作意识未恢复（癫痫持续状态，危及生命）', '首次发作、伴发热/局灶神经体征'],
    differential: [
      { diagnosis: '晕厥', discriminator: '多有久站/诱因、面色苍白出冷汗，无强直阵挛与舌咬伤' },
      { diagnosis: '假性发作（心因性）', discriminator: '发作时 EEG 无痫样放电，有心理诱因、闭眼抵抗睁眼' },
      { diagnosis: '低血糖发作', discriminator: '发作时血糖低、补糖即缓解，无典型抽搐与发作后状态' },
    ],
    furtherExams: [
      { category: '特殊检查', name: '脑电图(EEG，必要时长程视频)', purpose: '捕捉痫样放电、定侧分型', urgency: 'routine' },
      { category: '影像', name: '头颅 MRI（含海马薄层）', purpose: '排查海马硬化、肿瘤、血管畸形等致痫灶', urgency: 'routine' },
      { category: '实验室', name: '发作期即刻血糖、电解质、血钙', purpose: '排除代谢性诱因', urgency: 'urgent' },
    ],
    populationNote: '可起病于任何年龄；部分有家族史或头部外伤/产伤史',
  },
  {
    name: '偏头痛',
    icd10: 'G43.9',
    specialty: '神经',
    typicalSymptoms: ['单侧搏动性头痛', '畏光、畏声', '恶心甚至呕吐', '发作前 10~30 分钟可有闪光/暗点等视觉先兆'],
    signs: ['发作期不愿活动、喜静卧暗室', '颞部血管压痛', '神经系统查体无阳性体征'],
    redFlags: ['一生中最剧烈的雷击样头痛（警惕蛛网膜下腔出血）', '头痛伴发热颈强直', '50 岁后新发头痛伴体重下降'],
    differential: [
      { diagnosis: '紧张性头痛', discriminator: '双侧紧箍样、轻中度、与情绪疲劳相关，无畏光呕吐' },
      { diagnosis: '丛集性头痛', discriminator: '眼眶周围剧烈、成簇发作，伴流泪鼻塞，男性多见' },
      { diagnosis: '蛛网膜下腔出血', discriminator: '突发炸裂样剧痛、颈强直、CT/腰穿见血，属急症' },
    ],
    furtherExams: [
      { category: '影像', name: '头颅 CT/MRI', purpose: '首次或不典型头痛排除颅内占位与出血', urgency: 'routine' },
      { category: '实验室', name: '血沉、C 反应蛋白', purpose: '50 岁以上新发头痛排除颞动脉炎等炎症性病因', urgency: 'routine' },
    ],
    populationNote: '青年女性多见，可有家族史，诱因包括月经、睡眠不足、红酒奶酪',
  },

  // ============================== 肾内科/泌尿外科 ==============================
  {
    name: '急性肾炎',
    icd10: 'N00',
    specialty: '泌尿',
    typicalSymptoms: ['眼睑/双下肢水肿', '尿色变红（肉眼血尿）', '尿量减少', '头晕（血压升高所致）'],
    signs: ['凹陷性水肿', '血压升高', '肾区轻叩击痛'],
    redFlags: ['短期内尿量明显减少至无尿（急性肾损伤）', '剧烈头痛视物模糊（高血压脑病）'],
    differential: [
      { diagnosis: '尿路感染', discriminator: '以尿频尿急尿痛为主，无水肿/高血压/大量蛋白尿' },
      { diagnosis: '肾病综合征', discriminator: '以大量蛋白尿、低白蛋白血症、高度水肿为核心' },
      { diagnosis: '狼疮性肾炎', discriminator: '育龄女性、伴皮疹/关节痛/多系统受累，自身抗体阳性' },
    ],
    furtherExams: [
      { category: '实验室', name: '尿常规 + 尿沉渣', purpose: '识别血尿、蛋白尿、红细胞管型', urgency: 'urgent' },
      { category: '实验室', name: '肾功能（肌酐/eGFR）、补体 C3/C4', purpose: '评估肾功能；补体下降支持链球菌感染后肾炎' },
      { category: '实验室', name: '抗链球菌溶血素 O(ASO)、抗核抗体谱', purpose: '追溯前驱感染并排除狼疮等继发性肾炎' },
      { category: '影像', name: '泌尿系超声', purpose: '评估双肾大小结构、排除梗阻' },
    ],
    populationNote: '儿童青少年多见，发病前 1~3 周常有扁桃体炎/皮肤化脓感染',
  },
  {
    name: '尿路感染',
    icd10: 'N39.0',
    specialty: '泌尿',
    typicalSymptoms: ['尿频、尿急、尿痛', '下腹部坠胀不适', '尿液浑浊伴异味'],
    signs: ['耻骨上区压痛', '上尿路感染时肾区叩击痛', '体温升高'],
    redFlags: ['高热寒战、腰痛明显（急性肾盂肾炎/尿源性脓毒症）', '妊娠期尿路感染', '糖尿病患者发热（警惕气肿性肾盂肾炎）'],
    differential: [
      { diagnosis: '泌尿系结核', discriminator: '慢性顽固膀胱刺激征、抗生素无效、晨尿找抗酸杆菌' },
      { diagnosis: '前列腺炎', discriminator: '会阴腰骶部不适、前列腺压痛、前列腺液异常' },
      { diagnosis: '间质性膀胱炎', discriminator: '慢性盆腔疼痛、尿培养阴性、膀胱充盈痛' },
    ],
    furtherExams: [
      { category: '实验室', name: '尿常规 + 尿沉渣', purpose: '白细胞/亚硝酸盐快速筛查', urgency: 'routine' },
      { category: '实验室', name: '清洁中段尿培养 + 药敏', purpose: '明确致病菌并指导抗生素选择' },
      { category: '影像', name: '泌尿系超声', purpose: '反复发作/男性/复杂病例排除结石、梗阻、畸形' },
    ],
    populationNote: '女性远多于男性；好发于性生活活跃期、妊娠期、前列腺增生者',
  },
  {
    name: '肾结石',
    icd10: 'N20.0',
    specialty: '泌尿',
    typicalSymptoms: ['一侧腰腹部突发绞痛、向腹股沟/大腿内侧放射', '血尿（肉眼或镜下）', '伴恶心呕吐、出冷汗'],
    signs: ['痛苦辗转体位（与急腹症静卧拒动相反）', '肾区叩击痛阳性'],
    redFlags: ['孤立肾/双侧结石伴无尿', '高热脓尿（结石梗阻合并感染，需紧急减压）', '持续少尿（梗阻性肾病）'],
    differential: [
      { diagnosis: '急性胆囊炎/胆石症', discriminator: '右上腹痛、Murphy 征阳性、向右肩放射，超声见胆囊结石' },
      { diagnosis: '急性阑尾炎', discriminator: '转移性右下腹痛、麦氏点压痛反跳痛，无血尿' },
      { diagnosis: '肾动脉栓塞/主动脉夹层', discriminator: '剧痛伴休克体征，血管 CT 造影鉴别（高危）' },
    ],
    furtherExams: [
      { category: '影像', name: '泌尿系超声', purpose: '快速识别结石、肾盂积水', urgency: 'urgent' },
      { category: '影像', name: '非增强泌尿系 CT(NCCT)', purpose: '精确定位结石大小位置、鉴别阴性结石', urgency: 'urgent' },
      { category: '实验室', name: '尿常规、肾功能', purpose: '血尿筛查与梗阻性肾功能评估' },
      { category: '实验室', name: '血钙、尿酸', purpose: '筛查代谢性结石病因（甲旁亢、高尿酸尿）' },
    ],
    populationNote: '青壮年多见，高温少饮水、高盐高蛋白饮食者高发',
  },
  {
    name: '前列腺增生',
    icd10: 'N40',
    specialty: '泌尿',
    typicalSymptoms: ['进行性排尿费力、尿线变细', '夜尿次数增多', '排尿踌躇、尿后滴沥', '尿不尽感'],
    signs: ['直肠指检前列腺增大、中央沟变浅', '残余尿增多', '充盈性膀胱'],
    redFlags: ['完全尿潴留、下腹胀痛难忍', '无痛性肉眼血尿（警惕合并前列腺癌/膀胱癌）', '充溢性尿失禁伴肾功能恶化'],
    differential: [
      { diagnosis: '前列腺癌', discriminator: 'PSA 升高、指检硬结、前列腺 MRI/穿刺确诊' },
      { diagnosis: '神经源性膀胱', discriminator: '有糖尿病/脊髓病变史，尿流动力学提示逼尿肌无力' },
      { diagnosis: '尿道狭窄', discriminator: '有尿道外伤/留置导尿/淋病史，尿线细如线' },
    ],
    furtherExams: [
      { category: '特殊检查', name: '直肠指检(DRE)', purpose: '了解前列腺大小质地、有无硬结', urgency: 'routine' },
      { category: '影像', name: '泌尿系超声 + 残余尿测定', purpose: '评估前列腺体积、残余尿与肾积水' },
      { category: '实验室', name: '血清 PSA', purpose: '与前列腺癌鉴别（50 岁以上必查）' },
      { category: '特殊检查', name: '尿流率测定', purpose: '客观评估排尿梗阻程度' },
    ],
    populationNote: '50 岁以上男性高发，发病率随年龄递增',
  },

  // ============================== 血液科 ==============================
  {
    name: '贫血',
    icd10: 'D64.9',
    specialty: '血液',
    typicalSymptoms: ['乏力、活动后心慌气短', '面色、甲床、睑结膜苍白', '头晕耳鸣、注意力下降', '食欲差'],
    signs: ['睑结膜苍白', '匙状甲（缺铁性）', '黄疸（溶血性贫血）', '舌乳头萎缩（巨幼细胞性）'],
    redFlags: ['进行性面色苍白伴皮肤瘀斑出血点（警惕再障/白血病）', '浓茶色尿（急性血管内溶血）', '贫血伴呼吸困难心率快（重度失代偿）'],
    differential: [
      { diagnosis: '肾性贫血', discriminator: '慢性肾病病史、EPO 减少，肾功能异常' },
      { diagnosis: '慢性病性贫血', discriminator: '有慢性感染/肿瘤/风湿病史，铁蛋白正常或升高' },
      { diagnosis: '甲状腺功能减退', discriminator: '怕冷、水肿、TSH 升高，轻中度正细胞贫血' },
    ],
    furtherExams: [
      { category: '实验室', name: '血常规 + 网织红细胞计数', purpose: '确定贫血类型（小细胞/大细胞/正细胞）与骨髓红系反应', urgency: 'urgent' },
      { category: '实验室', name: '外周血涂片', purpose: '观察红细胞形态、幼稚细胞、寄生虫' },
      { category: '实验室', name: '血清铁、铁蛋白、总铁结合力', purpose: '鉴别缺铁性与慢性病性贫血' },
      { category: '实验室', name: '维生素 B12、叶酸', purpose: '诊断巨幼细胞性贫血' },
      { category: '实验室', name: '便潜血', purpose: '排查慢性消化道失血（男性绝经后女性缺铁必查）' },
    ],
    populationNote: '育龄女性、婴幼儿、老年人多见；长期素食/慢性失血者高发',
  },
  {
    name: '急性白血病',
    icd10: 'C95.0',
    specialty: '血液',
    typicalSymptoms: ['进行性乏力苍白', '反复发热（感染或肿瘤热）', '皮肤瘀斑、牙龈出血、鼻出血', '骨痛尤以胸骨压痛'],
    signs: ['胸骨中下段压痛', '淋巴结肿大、肝脾肿大', '牙龈增生（急单）', '皮肤浸润结节'],
    redFlags: ['颅内出血、头痛呕吐意识障碍（白细胞淤滞/出血急症）', '高热不退伴血压下降（脓毒症）', '双眼突出绿色瘤'],
    differential: [
      { diagnosis: '类白血病反应', discriminator: '有严重感染/肿瘤背景，NAP 升高、幼稚细胞比例低，原发病控制后恢复' },
      { diagnosis: '再生障碍性贫血', discriminator: '三系减少但无肝脾淋巴结肿大、骨髓增生低下无原始细胞' },
      { diagnosis: '传染性单核细胞增多症', discriminator: 'EBV 感染、异型淋巴细胞<20%、嗜异凝集阳性，自限性' },
    ],
    furtherExams: [
      { category: '实验室', name: '血常规 + 外周血涂片', purpose: '发现原始/幼稚细胞、评估贫血与血小板', urgency: 'stat' },
      { category: '特殊检查', name: '骨髓穿刺 + 活检', purpose: '确诊依据：原始细胞比例 ≥20%', urgency: 'urgent' },
      { category: '特殊检查', name: '流式细胞免疫分型', purpose: '区分淋系/髓系、明确亚型' },
      { category: '实验室', name: '融合基因/染色体（如 BCR-ABL、PML-RARA）', purpose: '分型、预后分层与靶向用药指导' },
    ],
    populationNote: '儿童急性淋巴细胞白血病最多见；成人以急粒为主',
  },
  {
    name: '淋巴瘤',
    icd10: 'C85.9',
    specialty: '血液',
    typicalSymptoms: ['无痛性颈部/腋下/腹股沟淋巴结进行性肿大', '不明原因发热 >38℃', '夜间盗汗', '半年体重下降 >10%（B 症状）'],
    signs: ['淋巴结质韧、活动度可、晚期融合', '肝脾肿大', '皮肤瘙痒（霍奇金病）'],
    redFlags: ['纵隔大包块伴上腔静脉压迫（面颈肿胀、呼吸困难）', '腹腔大包块', '血细胞三系进行性下降'],
    differential: [
      { diagnosis: '淋巴结结核', discriminator: '颈部淋巴结粘连成块、破溃、PPD/IGRA 阳性、抗结核有效' },
      { diagnosis: '转移性淋巴结癌', discriminator: '质地坚硬固定、可找到原发灶（鼻咽/甲状腺/乳腺/胃）' },
      { diagnosis: '反应性淋巴结增生', discriminator: '有邻近感染灶、肿大有压痛、抗感染后缩小' },
    ],
    furtherExams: [
      { category: '特殊检查', name: '淋巴结完整活检（病理+免疫组化）', purpose: '确诊与分型金标准，忌细针抽吸', urgency: 'urgent' },
      { category: '实验室', name: 'LDH、β2 微球蛋白', purpose: '肿瘤负荷与预后指标' },
      { category: '影像', name: '全身 PET-CT', purpose: '分期、探测结外受累病灶' },
      { category: '特殊检查', name: '骨髓穿刺 + 活检', purpose: '判断骨髓是否受累（分期）' },
    ],
    populationNote: '可发生于各年龄；免疫缺陷/EBV/幽门螺杆菌感染相关',
  },
  {
    name: '凝血障碍',
    icd10: 'D68.9',
    specialty: '血液',
    typicalSymptoms: ['轻微外伤后出血不止', '深部肌肉血肿、关节腔反复出血', '皮肤瘀斑范围大', '拔牙/手术后出血迁延'],
    signs: ['关节肿胀畸形（血友病性关节病）', '深部组织血肿', '手术切口渗血不止'],
    redFlags: ['颅内出血、咽喉部/颈部血肿压迫气道', '消化道大出血', '外伤后无法控制的渗血'],
    differential: [
      { diagnosis: '血小板减少性紫癜', discriminator: '以皮肤针尖样出血点、黏膜出血为主，APTT 正常而血小板低' },
      { diagnosis: '维生素 K 缺乏/肝病凝血异常', discriminator: 'PT 延长为主、有肝病或胆道梗阻/营养不良史' },
      { diagnosis: '血管性血友病(vWD)', discriminator: '女性月经过多为主、出血时间延长、vWF 因子缺乏' },
    ],
    furtherExams: [
      { category: '实验室', name: '凝血四项（PT/APTT/TT/FIB）', purpose: '初筛内/外源凝血途径缺陷', urgency: 'urgent' },
      { category: '实验室', name: '血小板计数、出血时间', purpose: '与血小板性出血鉴别' },
      { category: '实验室', name: '凝血因子活性（Ⅷ/Ⅸ/vWF）', purpose: '确诊血友病及分型' },
    ],
    populationNote: '血友病为 X 连锁隐性遗传，男性发病；获得性者可见于肝病、DIC、抗凝治疗',
  },

  // ============================== 风湿免疫科 ==============================
  {
    name: '类风湿关节炎',
    icd10: 'M06.9',
    specialty: '风湿免疫',
    typicalSymptoms: ['对称性双手小关节肿痛', '晨起关节僵硬 >1 小时、活动后缓解', '逐渐出现关节变形'],
    signs: ['掌指/近端指间关节梭形肿胀', '尺侧偏斜、天鹅颈/纽扣花畸形', '类风湿结节（鹰嘴附近）'],
    redFlags: ['关节外表现：皮下结节、肺间质病变、巩膜炎、周围神经病变', '短期内关节迅速破坏'],
    differential: [
      { diagnosis: '骨关节炎', discriminator: '中老年、负重关节及远端指间关节受累、晨僵 <30 分钟' },
      { diagnosis: '银屑病关节炎', discriminator: '远端指间关节为主、有银屑病皮疹/指甲顶针样凹陷' },
      { diagnosis: '痛风', discriminator: '急性单关节炎、第一跖趾关节红肿热痛、血尿酸高' },
    ],
    furtherExams: [
      { category: '实验室', name: '类风湿因子(RF)、抗 CCP 抗体', purpose: '抗 CCP 特异性高，提示侵蚀风险', urgency: 'routine' },
      { category: '实验室', name: '血沉、C 反应蛋白', purpose: '评估疾病活动度' },
      { category: '影像', name: '双手 + 双足 X 线', purpose: '关节间隙狭窄、骨侵蚀评估分期' },
    ],
    populationNote: '中年女性多见，女:男 ≈ 3:1，有遗传易感倾向',
  },
  {
    name: '系统性红斑狼疮',
    icd10: 'M32.9',
    specialty: '风湿免疫',
    typicalSymptoms: ['面部蝶形红斑', '日晒后皮疹加重（光敏感）', '反复口腔溃疡、脱发', '多关节痛', '发热、乏力'],
    signs: ['颧部跨越鼻梁蝶形红斑', '盘状红斑', '关节肿胀', '下肢水肿（狼疮肾）', '浆膜腔积液'],
    redFlags: ['进行性少尿、水肿（狼疮肾炎致肾衰）', '头痛精神异常癫痫（神经精神狼疮）', '血小板严重减少致出血'],
    differential: [
      { diagnosis: '类风湿关节炎', discriminator: '关节侵蚀畸形为主，无蝶形红斑与多系统受累，抗 dsDNA 阴性' },
      { diagnosis: '原发性肾小球肾炎', discriminator: '以肾脏表现为孤立核心，无皮疹/血液学/免疫学多系统证据' },
      { diagnosis: '药物性狼疮', discriminator: '有肼屈嗪/普鲁卡因胺/异烟肼用药史，抗组蛋白抗体阳性、停药缓解' },
    ],
    furtherExams: [
      { category: '实验室', name: '抗核抗体(ANA)、抗 dsDNA、抗 Sm', purpose: 'ANA 筛查、抗 dsDNA 与抗 Sm 特异性诊断', urgency: 'urgent' },
      { category: '实验室', name: '补体 C3/C4、血常规、尿常规', purpose: '补体下降提示活动；监测肾与血液系统受累' },
      { category: '特殊检查', name: '肾穿刺活检', purpose: '尿蛋白/肾损时明确病理分型指导治疗' },
    ],
    populationNote: '育龄女性高发，女:男 ≈ 9:1',
  },
  {
    name: '干燥综合征',
    icd10: 'M35.0',
    specialty: '风湿免疫',
    typicalSymptoms: ['口干、吞咽干性食物需水送服', '眼干磨砂感、泪少', '腮腺反复肿大', '关节隐痛'],
    signs: ['猖獗齿（多个龋齿）', '舌面干裂少津', '泪液分泌减少', '紫癜样皮疹'],
    redFlags: ['单克隆免疫球蛋白升高、腮腺进行性肿大变硬（警惕淋巴瘤转化）', '肺间质病变、肾小管酸中毒'],
    differential: [
      { diagnosis: '糖尿病', discriminator: '多饮多尿消瘦、血糖升高，无眼干与自身抗体异常' },
      { diagnosis: '药物性口干', discriminator: '有抗胆碱能/抗组胺/抗抑郁药用药史，停药改善' },
      { diagnosis: 'HIV/丙型肝炎相关口干', discriminator: '感染筛查阳性，可伴腮腺肿大' },
    ],
    furtherExams: [
      { category: '实验室', name: '抗 SSA/Ro、抗 SSB/La 抗体', purpose: '诊断特异性指标', urgency: 'routine' },
      { category: '特殊检查', name: 'Schirmer 试验、角膜荧光染色', purpose: '客观评估泪液分泌功能' },
      { category: '特殊检查', name: '唇腺活检', purpose: '局灶性淋巴细胞浸润为确诊依据' },
      { category: '实验室', name: '唾液流率、免疫球蛋白', purpose: '评估唾液腺功能与高丙球血症' },
    ],
    populationNote: '中年女性多见，可继发于类风湿/狼疮等其他结缔组织病',
  },
  {
    name: '强直性脊柱炎',
    icd10: 'M45.9',
    specialty: '风湿免疫',
    typicalSymptoms: ['下腰背痛、晨起僵硬', '夜间痛醒、活动后反而减轻', '病程渐出现脊柱活动受限', '臀部交替性疼痛（骶髂关节）'],
    signs: ['骶髂关节压痛', '脊柱前屈后伸侧屈活动度下降', '胸廓扩张度减小', '晚期驼背畸形'],
    redFlags: ['急性虹膜炎反复发作（眼部受累）', '主动脉瓣关闭不全/心脏传导异常', '马尾综合征（大小便障碍）'],
    differential: [
      { diagnosis: '腰椎间盘突出症', discriminator: '神经根性腿痛、直腿抬高试验阳性、无晨僵与骶髂关节炎' },
      { diagnosis: '弥漫性特发性骨肥厚(DISH)', discriminator: '老年男性、韧带骨化但骶髂关节正常、HLA-B27 阴性' },
      { diagnosis: '髂骨致密性骨炎', discriminator: '育龄经产女性、髂骨侧硬化而关节间隙正常、B27 阴性' },
    ],
    furtherExams: [
      { category: '影像', name: '骶髂关节 MRI（首选）', purpose: '早期发现骶髂关节炎（骨髓水肿）', urgency: 'routine' },
      { category: '影像', name: '骶髂关节 X 线/CT', purpose: '分级骶髂关节侵蚀与硬化融合' },
      { category: '实验室', name: 'HLA-B27、血沉、C 反应蛋白', purpose: 'B27 辅助诊断；活动度评估' },
    ],
    populationNote: '青年男性多见（15~35 岁），与 HLA-B27 强相关，有家族聚集',
  },
];

/* ---------------------------------------------------------------------------
 * 工具：归一化病名（去空白、全半角括号归一），便于去重匹配
 * ------------------------------------------------------------------------ */
function normalizeName(name: string): string {
  return (name ?? '')
    .toString()
    .replace(/\s+/g, '')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .trim();
}

function cloneEntry(e: DiseaseEntry): DiseaseEntry {
  return {
    ...e,
    typicalSymptoms: [...e.typicalSymptoms],
    signs: [...e.signs],
    redFlags: [...e.redFlags],
    differential: e.differential.map((d) => ({ ...d })),
    furtherExams: e.furtherExams.map((f) => ({ ...f })),
  };
}

/* ===========================================================================
 * 1) expandDiseaseLibrary —— 新病种入库（带医学审核校验与拒收留痕）
 * ======================================================================== */
export interface ExpandedDiseaseLibrary {
  /** 合并后的完整病种库（基础 16 病种 + 通过校验的新病种） */
  library: DiseaseEntry[];
  /** 本次成功入库的病种 */
  added: DiseaseEntry[];
  /** 本次被拒收的病种及原因（【安全与运营】留痕，供医学委员会复核） */
  rejected: Array<{ name: string; reason: string }>;
  /** 入库后病种总数 */
  total: number;
  disclaimer: string;
}

/**
 * 将新病种追加到内置病种库。
 * 【安全与运营】任何新病种必须满足：病名/ICD-10/专科/至少 1 条典型症状齐备，
 * 且不得与库内已有病种重名；否则拒收并记录原因，严禁带病上线。
 */
export function expandDiseaseLibrary(newDiseases?: Array<Partial<DiseaseEntry>>): ExpandedDiseaseLibrary {
  const library: DiseaseEntry[] = BASE_DISEASE_LIBRARY.map(cloneEntry);
  const added: DiseaseEntry[] = [];
  const rejected: Array<{ name: string; reason: string }> = [];
  const known = new Set(library.map((d) => normalizeName(d.name)));

  const list = Array.isArray(newDiseases) ? newDiseases : [];
  for (const raw of list) {
    const name = (raw?.name ?? '').toString().trim();
    const icd10 = (raw?.icd10 ?? '').toString().trim();
    const specialty = raw?.specialty;
    const symptoms = Array.isArray(raw?.typicalSymptoms) ? raw.typicalSymptoms.filter(Boolean) : [];

    if (!name) {
      rejected.push({ name: '(未命名病种)', reason: '缺少病名，拒绝入库' });
      continue;
    }
    if (!icd10) {
      rejected.push({ name, reason: '缺少 ICD-10 编码，拒绝入库（须经病案编码校对）' });
      continue;
    }
    const validSpecialty: Specialty[] = ['神经', '泌尿', '血液', '风湿免疫'];
    if (!specialty || !validSpecialty.includes(specialty)) {
      rejected.push({ name, reason: `专科「${String(specialty)}」不在 M163-C 范围内，拒绝入库` });
      continue;
    }
    if (symptoms.length === 0) {
      rejected.push({ name, reason: '至少需提供 1 条典型症状，拒绝入库（医学审核不通过）' });
      continue;
    }
    const key = normalizeName(name);
    if (known.has(key)) {
      rejected.push({ name, reason: '与库内已有病种重名，拒绝重复入库' });
      continue;
    }

    const entry: DiseaseEntry = {
      name,
      icd10,
      specialty,
      typicalSymptoms: symptoms.map(String),
      signs: Array.isArray(raw?.signs) ? raw.signs.map(String) : [],
      redFlags: Array.isArray(raw?.redFlags) ? raw.redFlags.map(String) : [],
      differential: Array.isArray(raw?.differential)
        ? raw.differential.map((d) => ({ diagnosis: String(d?.diagnosis ?? ''), discriminator: String(d?.discriminator ?? '') }))
        : [],
      furtherExams: Array.isArray(raw?.furtherExams)
        ? raw.furtherExams.map((f) => ({
            category: (f?.category ?? '实验室') as FurtherExam['category'],
            name: String(f?.name ?? ''),
            purpose: String(f?.purpose ?? ''),
            urgency: (f?.urgency ?? 'routine') as ExamUrgency,
          }))
        : [],
      populationNote: raw?.populationNote,
    };
    known.add(key);
    library.push(entry);
    added.push(entry);
  }

  return {
    library,
    added,
    rejected,
    total: library.length,
    disclaimer: '病种库内容为教科书级辅助参考，所有新增病种须经医学委员会审核后方可用于临床。',
  };
}

/* ===========================================================================
 * 2) improveDiagnosisAccuracy —— 医生反馈回流再校准
 * ======================================================================== */
/** 当前模型中每个病种的既有统计 */
export interface ModelDiseaseStat {
  disease: string;
  /** 既有准确率 0~1 */
  accuracy: number;
  /** 既有样本量 */
  sampleCount: number;
}

/** 单条医生反馈：医生最终诊断是否命中 AI 建议 */
export interface FeedbackRecord {
  disease: string;
  /** AI 建议是否正确（医生最终诊断与 AI 一致为 true） */
  correct: boolean;
  /** 医生最终诊断（留痕） */
  doctorFinalDiagnosis?: string;
}

export interface RecalibratedDisease {
  disease: string;
  priorAccuracy: number;
  /** 再校准后准确率（贝叶斯合并，向 0.5~0.98 收敛） */
  accuracy: number;
  sampleCount: number;
  /** 与既有准确率的漂移量 */
  drift: number;
}

export interface AccuracyImprovementResult {
  updated: RecalibratedDisease[];
  /** 准确率低于 0.6 的病种清单（【安全与运营】需人工复核/重训） */
  reviewList: string[];
  /** 本次纳入统计的反馈条数 */
  feedbackCount: number;
  disclaimer: string;
}

/**
 * 用医生「采纳/修改/驳回」反馈对 AI 诊断准确率做增量再校准：
 *   新准确率 = (既有准确率×既有样本 + 正确条数) / (既有样本 + 反馈条数)
 * 小样本病种向基线 0.65 收缩（避免过拟合少量反馈），并钳制在 [0.5, 0.98]。
 */
export function improveDiagnosisAccuracy(
  currentModel?: ModelDiseaseStat[],
  feedbackData?: FeedbackRecord[],
): AccuracyImprovementResult {
  const model = Array.isArray(currentModel) ? currentModel : [];
  const feedback = Array.isArray(feedbackData) ? feedbackData : [];

  // 按病种聚合反馈
  const fbMap = new Map<string, { correct: number; total: number }>();
  for (const fb of feedback) {
    const key = normalizeName(fb?.disease ?? '');
    if (!key) continue;
    const cur = fbMap.get(key) ?? { correct: 0, total: 0 };
    cur.total += 1;
    if (fb.correct) cur.correct += 1;
    fbMap.set(key, cur);
  }

  const updated: RecalibratedDisease[] = [];
  const seen = new Set<string>();

  for (const stat of model) {
    const key = normalizeName(stat?.disease ?? '');
    if (!key) continue;
    seen.add(key);
    const prior = Math.min(0.98, Math.max(0.5, Number(stat?.accuracy) || 0.65));
    const priorN = Math.max(0, Number(stat?.sampleCount) || 0);
    const fb = fbMap.get(key) ?? { correct: 0, total: 0 };

    // 贝叶斯合并：既有样本量越大，少量反馈越不会造成剧烈漂移
    let merged = (prior * priorN + fb.correct) / Math.max(1, priorN + fb.total);
    // 冷启动收缩：模型内全新病种（priorN=0）反馈不足 5 条时向弱先验 0.65
    // 收缩 30%，避免仅凭 1~2 条反馈就把准确率拉满或拉穿
    if (priorN === 0 && fb.total < 5) {
      merged = merged * 0.7 + 0.65 * 0.3;
    }
    merged = Math.min(0.98, Math.max(0.5, merged));

    updated.push({
      disease: stat.disease,
      priorAccuracy: Number(prior.toFixed(4)),
      accuracy: Number(merged.toFixed(4)),
      sampleCount: priorN + fb.total,
      drift: Number((merged - prior).toFixed(4)),
    });
  }

  // 反馈中出现、但模型里还没有的新病种：以 0.65 弱先验收缩起步
  for (const [key, fb] of fbMap) {
    if (seen.has(key)) continue;
    let acc = fb.total > 0 ? fb.correct / fb.total : 0.65;
    if (fb.total < 5) {
      acc = acc * 0.7 + 0.65 * 0.3; // 冷启动收缩，与上方一致
    }
    acc = Math.min(0.98, Math.max(0.5, acc));
    updated.push({
      disease: key,
      priorAccuracy: 0.65,
      accuracy: Number(acc.toFixed(4)),
      sampleCount: fb.total,
      drift: Number((acc - 0.65).toFixed(4)),
    });
  }

  const reviewList = updated.filter((u) => u.accuracy < 0.6).map((u) => u.disease);

  return {
    updated: updated.sort((a, b) => a.accuracy - b.accuracy),
    reviewList,
    feedbackCount: feedback.length,
    disclaimer: '再校准结果为统计参考，低准确率病种须由医学团队人工复核反馈样本后再上线。',
  };
}

/* ===========================================================================
 * 3) addDifferentialDiagnosis —— 为指定病种增补鉴别诊断
 * ======================================================================== */
export interface DifferentialAttachResult {
  /** 是否在库内命中该病种 */
  matched: boolean;
  /** 更新后的病种条目副本（纯函数，不改原词典） */
  entry: DiseaseEntry | null;
  /** 因校验被忽略的条目 */
  skipped: Array<{ diagnosis: string; reason: string }>;
  disclaimer: string;
}

/**
 * 为库内某病种追加鉴别诊断条目（自动去重、要求鉴别要点非空）。
 * 未命中病种时返回 matched=false 的安全骨架，不抛异常。
 */
export function addDifferentialDiagnosis(
  disease: string,
  differentialList?: DifferentialEntry[],
): DifferentialAttachResult {
  const key = normalizeName(disease ?? '');
  const found = BASE_DISEASE_LIBRARY.find((d) => normalizeName(d.name) === key);

  if (!found) {
    return {
      matched: false,
      entry: null,
      skipped: [],
      disclaimer: `未在 M163-C 病种库中找到「${disease ?? ''}」，未做任何修改。`,
    };
  }

  const entry = cloneEntry(found);
  const knownDx = new Set(entry.differential.map((d) => normalizeName(d.diagnosis)));
  const skipped: Array<{ diagnosis: string; reason: string }> = [];

  for (const item of Array.isArray(differentialList) ? differentialList : []) {
    const dx = (item?.diagnosis ?? '').toString().trim();
    const disc = (item?.discriminator ?? '').toString().trim();
    if (!dx) {
      skipped.push({ diagnosis: '(空)', reason: '鉴别诊断病名为空，跳过' });
      continue;
    }
    if (!disc) {
      skipped.push({ diagnosis: dx, reason: '缺少鉴别要点，跳过（鉴别诊断必须说明如何区分）' });
      continue;
    }
    if (knownDx.has(normalizeName(dx))) {
      skipped.push({ diagnosis: dx, reason: '与现有鉴别诊断重复，跳过' });
      continue;
    }
    knownDx.add(normalizeName(dx));
    entry.differential.push({ diagnosis: dx, discriminator: disc });
  }

  return {
    matched: true,
    entry,
    skipped,
    disclaimer: '鉴别诊断仅供问诊思路参考，最终鉴别结论由执业医师综合判断。',
  };
}

/* ===========================================================================
 * 4) suggestFurtherExamination —— 按诊断+患者特征推荐进一步检查
 * ======================================================================== */
export interface PatientExamFeatures {
  age?: number;
  gender?: Gender;
  /** 是否存在红旗症状（存在则把 routine 提升为 urgent） */
  hasRedFlag?: boolean;
  /** 已完成的检查名（避免重复开单） */
  completedExams?: string[];
}

export interface SuggestedExam {
  category: '实验室' | '影像' | '特殊检查';
  name: string;
  purpose: string;
  urgency: ExamUrgency;
  /** 因患者特征附加的提示 */
  note?: string;
}

export interface FurtherExamResult {
  diagnosis: string;
  icd10: string;
  specialty: Specialty | null;
  exams: SuggestedExam[];
  /** 红旗症状提示 */
  redFlagWarnings: string[];
  disclaimer: string;
}

/**
 * 依据病种词典推荐进一步检查：
 *   - 患者有红旗症状时，routine 项升级为 urgent；
 *   - 已完成的检查自动剔除，避免重复开单（运营效率）；
 *   - 高龄患者卒中类诊断强制提示急诊影像优先级。
 */
export function suggestFurtherExamination(
  diagnosis: string,
  patientFeatures?: PatientExamFeatures,
): FurtherExamResult {
  const key = normalizeName(diagnosis ?? '');
  const found = BASE_DISEASE_LIBRARY.find((d) => normalizeName(d.name) === key);
  const feat = patientFeatures ?? {};

  if (!found) {
    return {
      diagnosis: diagnosis ?? '',
      icd10: '',
      specialty: null,
      exams: [],
      redFlagWarnings: [],
      disclaimer: `病种「${diagnosis ?? ''}」不在 M163-C 内置库，请转人工完善病史后开具检查。`,
    };
  }

  const completed = new Set((feat.completedExams ?? []).map((s) => normalizeName(s)));
  const hasRedFlag = feat.hasRedFlag === true;
  const isElderly = (feat.age ?? 0) >= 65;

  const exams: SuggestedExam[] = [];
  for (const ex of found.furtherExams) {
    if (completed.has(normalizeName(ex.name))) continue; // 【运营】不重复开单
    let urgency: ExamUrgency = ex.urgency ?? 'routine';
    const notes: string[] = [];
    if (hasRedFlag && urgency === 'routine') {
      urgency = 'urgent';
      notes.push('存在红旗症状，提升紧急度');
    }
    // 【安全与运营】高龄疑似脑卒中，急诊影像必须最先完成
    if (found.name === '脑卒中' && isElderly && ex.category === '影像') {
      urgency = 'stat';
      notes.push('高龄患者，卒中影像按卒中绿色通道 stat 执行');
    }
    exams.push({ ...ex, urgency, note: notes.length ? notes.join('；') : undefined });
  }

  // 按紧急度排序：stat > urgent > routine
  const order: Record<ExamUrgency, number> = { stat: 0, urgent: 1, routine: 2 };
  exams.sort((a, b) => order[a.urgency] - order[b.urgency]);

  return {
    diagnosis: found.name,
    icd10: found.icd10,
    specialty: found.specialty,
    exams,
    redFlagWarnings: hasRedFlag ? [...found.redFlags] : [],
    disclaimer: '检查建议为辅助决策清单，最终开单与判读由执业医师负责；疑诊急危重症请立即急诊处理。',
  };
}
