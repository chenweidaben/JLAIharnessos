/**
 * 健澜科技 jlmedaios - 患者健康教育聚合器（知识图谱与患者教育）
 *
 * 本模块为「知识图谱与患者教育」的纯函数层：按疾病知识库（高血压 / 糖尿病 /
 * 冠心病 / 哮喘 / 通用）用大白话拼出六张科普卡片——
 *   疾病基础知识 / 饮食注意 / 运动建议 / 用药指导 / 何时复诊 / 红旗症状。
 *
 * 文风红线（生产级）：
 *   - 一律说人话，例如"血压高了就少吃咸的"而不是"限钠摄入"；
 *   - 不堆医学术语，出现术语必须跟一句比方；
 *   - 红旗症状卡片一律引导急诊 / 120，不做"先观察观察"的安慰。
 *
 * 依据宪法第四十五条：患者有权获得通俗易懂的健康知识。
 * 本模块全部为无副作用纯函数，不触库、便于单测；
 * 数据库读写由路由层（routes/patientEducation.ts）负责。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 六大科普栏目：与 medmuse.patient_education_material.category 白名单一一对应 */
export type EducationCategory =
  | 'basics'
  | 'diet'
  | 'exercise'
  | 'medication'
  | 'followup'
  | 'redflags';

/** 单张科普卡片：一个栏目一条，标题通俗、正文说人话 */
export interface EducationSection {
  /** 栏目编码 */
  category: EducationCategory;
  /** 栏目中文名 */
  categoryLabel: string;
  /** 卡片小标题 */
  title: string;
  /** 卡片正文（大白话） */
  body: string;
}

/** generateHealthEducation 的返回：一份完整的疾病健康教育材料 */
export interface Material {
  /** 脱敏患者号 */
  patientId: string;
  /** 疾病编码（输入原样回传，便于路由层落库） */
  disease: string;
  /** 疾病中文名 */
  diseaseLabel: string;
  /** 生成时间（ISO 字符串，纯函数内用调用方传入或当前时间） */
  generatedAt: string;
  /** 六张科普卡片，顺序固定：常识→饮食→运动→用药→复诊→红旗 */
  sections: EducationSection[];
}

/** pushEducationMaterial 的返回：本次个性化推送的结果 */
export interface PushResult {
  patientId: string;
  disease: string;
  diseaseLabel: string;
  /** 本次应推送的卡片数（固定 6） */
  pushedCount: number;
  /** 推送时间（落库 pushed_at 用） */
  pushedAt: string;
  /** 六张科普卡片（路由层逐条 INSERT，冲突由唯一约束兜底） */
  sections: EducationSection[];
  /** 给患者看的一句话推送语 */
  message: string;
}

/** 已读统计入参：路由层从库里捞回来的最小字段 */
export interface ReadStatRow {
  isRead: boolean;
}

/** readStatsOf 的返回：健康科普页头部进度条 */
export interface ReadStats {
  /** 已推送材料总数 */
  total: number;
  /** 已读条数 */
  read: number;
  /** 未读条数 */
  unread: number;
  /** 已读率 [0,1]，保留 4 位小数；无材料时为 0 */
  readRate: number;
}

/** 栏目中文名表（与 category 一一对应，顺序即卡片展示顺序） */
const CATEGORY_LABELS: Record<EducationCategory, string> = {
  basics: '疾病基础知识',
  diet: '饮食注意',
  exercise: '运动建议',
  medication: '用药指导',
  followup: '何时复诊',
  redflags: '红旗症状',
};

/** 疾病知识库：疾病编码 -> 中文名 + 六张卡片正文（大白话） */
interface DiseaseKnowledge {
  label: string;
  cards: Record<Exclude<EducationCategory, never>, { title: string; body: string }>;
}

const DISEASE_KNOWLEDGE: Record<string, DiseaseKnowledge> = {
  // -------------------------------------------------------------------------
  hypertension: {
    label: '高血压',
    cards: {
      basics: {
        title: '血压高是怎么回事',
        body: '高血压就是血管里的压力长期偏高，好比家里水管水压太大。很多人一点感觉都没有，但日子久了会悄悄伤心脏、大脑和肾脏。所以要在家天天量、记下来，别凭"头不晕"判断好不好。',
      },
      diet: {
        title: '吃饭记住一句话：少咸多淡',
        body: '血压高了就少吃咸的——咸菜、腌肉、酱菜、泡面、外卖少碰；做菜最后再放盐，一天一个啤酒瓶盖的盐就够了。新鲜蔬菜、水果、粗粮多吃，肥肉和动物油换成植物油。',
      },
      exercise: {
        title: '动起来，但别猛',
        body: '每周快走或骑车 5 次，每次 30 分钟左右，走到微微出汗、能正常说话就行。别突然猛跑猛练；冬天早上太冷别出门锻炼，等太阳出来再动。',
      },
      medication: {
        title: '降压药要天天吃',
        body: '降压药要天天按时吃，就算量出来血压正常了也不能自己停——一停血压会反弹，比不吃还危险。想加量减量、换药，一定找医生，别自己看着办。',
      },
      followup: {
        title: '什么时候再来医院',
        body: '刚开始调药或者血压忽高忽低时，每 2 到 4 周看一次；血压稳住以后，3 到 6 个月复查一次。来的时候把家里量血压的小本本带上，医生一看就明白。',
      },
      redflags: {
        title: '出现这些情况，马上打 120',
        body: '突然剧烈头痛、看东西发模糊、胸口像被重物压住一样疼、一边手脚没力气或者说话大舌头——别犹豫，立刻打 120，这可能是中风或心梗，耽误不得。',
      },
    },
  },
  // -------------------------------------------------------------------------
  diabetes: {
    label: '糖尿病',
    cards: {
      basics: {
        title: '血糖高是怎么回事',
        body: '糖尿病就是血糖长期偏高，身体里那个管降糖的"钥匙"（胰岛素）不够用了。刚开始可能没啥感觉，但日子久了会伤眼睛、脚和肾。所以要管住嘴、迈开腿、按时查，把血糖稳住。',
      },
      diet: {
        title: '吃饭记住：甜的少碰，主食换粗',
        body: '甜饮料、甜点、蜜饯先放下；白米饭白馒头可以掺一半杂粮。土豆、莲藕、南瓜算主食，吃了它们米饭就要减量。吃饭先吃菜再吃肉最后吃主食，血糖更稳。',
      },
      exercise: {
        title: '饭后走一走，血糖更听话',
        body: '饭后散步 20 到 30 分钟最好。别空腹运动，兜里揣两块方糖或饼干——要是心慌、出冷汗、手抖，就是低血糖了，马上含一块糖。',
      },
      medication: {
        title: '药要按点吃，针头要换',
        body: '口服降糖药按饭点吃，想起来才吃等于白吃；打胰岛素的人要轮换着扎肚子上的位置，针头一次一换，别舍不得。记住：低血糖比高血糖更急，心慌手抖先吃糖再说话。',
      },
      followup: {
        title: '什么时候再来医院',
        body: '刚开始调药时每月查一次空腹和饭后血糖；稳住以后每 3 个月查一次"糖化血红蛋白"（反映近三个月平均血糖），每年查一次眼睛和小便。',
      },
      redflags: {
        title: '出现这些情况，马上去急诊',
        body: '一直口渴、尿特别多、恶心想吐、喘大口气、整个人发蔫——这可能是酮症酸中毒，会出人命的，别在家扛着，立刻去急诊。',
      },
    },
  },
  // -------------------------------------------------------------------------
  chd: {
    label: '冠心病',
    cards: {
      basics: {
        title: '冠心病是怎么回事',
        body: '冠心病就是给心脏供血的血管变窄了，像老水管里结了水垢。累了、急了、扛着风走路时，胸口发闷、像压着一块石头，停下来歇几分钟能缓解——就算缓解了，也得重视。',
      },
      diet: {
        title: '吃得素一点，油换好一点',
        body: '肥肉、动物内脏、油炸食品少碰；油换成橄榄油、菜籽油，一天不超两小勺；盐一天不超 5 克。烟必须戒，酒能不喝就不喝。',
      },
      exercise: {
        title: '能动就别动不动，疼了就停下',
        body: '能散步就别天天坐着，从每天 10 分钟慢慢加到 30 分钟。活动时胸口一疼就立刻停下坐下，别硬撑；冬天冷风里别走快。',
      },
      medication: {
        title: '长期药别自己停，急救药随身带',
        body: '阿司匹林、他汀这类药要长期吃，觉得"自己好了"也不能停；硝酸甘油随身带，胸口压疼时舌下含一片，5 分钟不缓解再含一片，同时叫人打 120。',
      },
      followup: {
        title: '什么时候再来医院',
        body: '刚放了支架或者最近刚发病的，1 个月、3 个月、半年各复查一次心电图和血脂；以后稳定了半年到一年查一次。',
      },
      redflags: {
        title: '出现这些情况，马上打 120',
        body: '胸口压榨样疼超过 15 分钟不缓解、出一身大汗、恶心想吐、感觉自己不行了——这是急性心梗，立刻嚼服 300 毫克阿司匹林并打 120，别自己开车来医院。',
      },
    },
  },
  // -------------------------------------------------------------------------
  asthma: {
    label: '哮喘',
    cards: {
      basics: {
        title: '哮喘是怎么回事',
        body: '哮喘就是气管特别娇气，一遇到冷风、油烟、感冒、灰尘就肿起来变窄，喘气像拉风箱。它不是"矫情"，但规律用药能压得很稳，照样能跑步、能正常生活。',
      },
      diet: {
        title: '躲开让你喘的东西',
        body: '自己吃了会不舒服的东西（常见海鲜、芒果）先别碰；冰饮和辣的少喝少吃；家里别养带毛的宠物，烟味和香水味都算刺激。',
      },
      exercise: {
        title: '大多数运动都能做',
        body: '游泳对哮喘最友好。运动前按医嘱先吸一下"日常保养药"，万一喘起来马上停下、坐直、用急救药，别硬撑着跑完。',
      },
      medication: {
        title: '两种吸入药，别搞混',
        body: '吸入药分两种：一种是"日常保养"的，天天吸，就算不喘也要吸；另一种是"救急"的，只有喘起来才吸。医生说让你天天吸的那种，别等喘了才想起来。',
      },
      followup: {
        title: '什么时候再来医院',
        body: '控制不好、一个月要用好几次急救药，每 2 到 4 周复诊；稳定以后 3 到 6 个月查一次肺功能，医生会根据情况帮你减药或加药。',
      },
      redflags: {
        title: '出现这些情况，立刻去急诊',
        body: '急救药喷了两次还喘、说一句话要换好几口气、嘴唇发紫、走两步就喘不上——这是哮喘急性大发作，会憋出事的，立刻去急诊。',
      },
    },
  },
};

/** 兜底疾病：知识库没收录时给一套通用的健康生活六张卡片 */
const GENERAL_KNOWLEDGE: DiseaseKnowledge = {
  label: '慢病通用',
  cards: {
    basics: {
      title: '得了慢病，记住三句话',
      body: '一是慢病是"管"出来的，不是"熬"出来的；二是药不能自己停；三是小信号别拖。把这三句话贴在冰箱上。',
    },
    diet: {
      title: '吃饭记住：清淡、七分饱',
      body: '少盐少油少糖，多吃新鲜蔬菜，每餐吃到七分饱就放筷子。外卖和应酬能推就推，在家吃饭最养人。',
    },
    exercise: {
      title: '每天动 30 分钟',
      body: '快走、骑车、打太极都行，每周 5 次，每次 30 分钟，微微出汗就好。动的时候身上哪不舒服，就停下来歇。',
    },
    medication: {
      title: '药按点吃，别自己加减',
      body: '药要按时吃，漏了一次别下次加倍补。想停药、换药、加量减量，先问医生。看病时把家里正在吃的所有药列个清单带给医生。',
    },
    followup: {
      title: '什么时候再来医院',
      body: '医生交代的复查时间记在日历上，别等不舒服才来。慢病讲究"平时盯着"，稳定了也要按时复查。',
    },
    redflags: {
      title: '出现这些情况，别扛',
      body: '胸口疼、喘不上气、一侧手脚没力气、说话大舌头、突然剧烈头痛、晕倒——任何一条，立刻打 120。',
    },
  },
};

/** 栏目顺序（与卡片展示、落库 category 白名单一致） */
const CATEGORY_ORDER: EducationCategory[] = [
  'basics',
  'diet',
  'exercise',
  'medication',
  'followup',
  'redflags',
];

/**
 * 查疾病知识库：未收录的疾病编码一律回退到「慢病通用」，
 * 保证任何 disease 入参都能产出完整六张卡片，不会半截返回。
 */
function knowledgeOf(disease: string): DiseaseKnowledge {
  const key = (disease || '').trim().toLowerCase();
  return DISEASE_KNOWLEDGE[key] ?? GENERAL_KNOWLEDGE;
}

/**
 * 纯函数：按患者 + 疾病生成一份完整的健康教育材料。
 *
 * 不修改入参、不触库、不打随机——同一 (patientId, disease) 多次调用结果一致，
 * 便于路由层幂等落库与单测断言。generatedAt 由调用方传入（路由层取当前时间），
 * 保证纯函数在测试中可重复。
 *
 * @param patientId 脱敏患者号（仅原样回传，不做任何身份反查）
 * @param disease   疾病编码（hypertension/diabetes/chd/asthma/其他）
 * @param generatedAt 生成时间（ISO 字符串），缺省取当前时间
 */
export function generateHealthEducation(
  patientId: string,
  disease: string,
  generatedAt?: string,
): Material {
  const knowledge = knowledgeOf(disease);
  const sections: EducationSection[] = CATEGORY_ORDER.map((category) => {
    const card = knowledge.cards[category];
    return {
      category,
      categoryLabel: CATEGORY_LABELS[category],
      title: card.title,
      body: card.body,
    };
  });

  return {
    patientId: (patientId || '').trim(),
    disease: (disease || '').trim().toLowerCase() || 'general',
    diseaseLabel: knowledge.label,
    generatedAt: generatedAt ?? new Date().toISOString(),
    sections,
  };
}

/**
 * 纯函数：为某患者按疾病做一次「个性化推送」——
 * 先调 generateHealthEducation 拼出六张卡片，再折算成路由层可直接逐条 INSERT 的
 * 推送结果。本函数不写库、不发消息，落库与通知由路由层完成。
 *
 * @param patientId 脱敏患者号
 * @param disease   疾病编码
 * @param pushedAt  推送时间（ISO 字符串），缺省取当前时间
 */
export function pushEducationMaterial(
  patientId: string,
  disease: string,
  pushedAt?: string,
): PushResult {
  const material = generateHealthEducation(patientId, disease);
  const at = pushedAt ?? new Date().toISOString();

  return {
    patientId: material.patientId,
    disease: material.disease,
    diseaseLabel: material.diseaseLabel,
    pushedCount: material.sections.length,
    pushedAt: at,
    sections: material.sections,
    message: `已为您推送「${material.diseaseLabel}」健康科普 ${material.sections.length} 条，记得抽空读完，身体有变化随时找医生。`,
  };
}

/**
 * 纯函数：从库里捞回来的已推送行，折算健康科普页头部进度条。
 *
 *   total   = 总行数
 *   read    = is_read = true 的行数
 *   unread  = total - read
 *   readRate = read / total（保留 4 位小数）；无材料时为 0
 *
 * @param rows 已推送材料行（至少含 isRead 字段）
 */
export function readStatsOf(rows: ReadStatRow[]): ReadStats {
  const total = rows.length;
  const read = rows.filter((r) => r.isRead).length;
  const unread = total - read;
  const rate = total > 0 ? Math.round((read / total) * 10000) / 10000 : 0;
  return { total, read, unread, readRate: rate };
}
