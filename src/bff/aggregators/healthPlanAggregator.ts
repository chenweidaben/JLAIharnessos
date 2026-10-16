/**
 * 健澜科技 jlmedaios - 个性化健康计划聚合器（M160-D · 患者健康管理深化）
 *
 * 【个性化，不一刀切】按患者慢病组合 + 个人目标，实时推导因人而异的
 * 运动 / 饮食 / 用药提醒 / 复查计划 / 红旗症状预警五件套，
 * 而非给所有患者同一份模板。
 *
 * 三个纯函数：
 *  - buildPersonalizedHealthPlan(patientId, chronicConditions, goals)
 *      依据慢病标签与个人目标生成计划；
 *  - trackHealthProgress(planId, activity)
 *      上报一次运动 / 饮食 / 用药行为，累计近一周依从进度；
 *  - adjustHealthPlan(planId, feedback)
 *      根据患者反馈（太难 / 太轻松 / 不适）动态调整计划强度并版本 +1。
 *
 * 运行时内存计划库（与 userPrefAggregator 一致的纯函数风格），不触碰
 * WebSocket、不新增依赖、不直连数据库；持久化由 deploy/postgres/init/323
 * 下发的 clinical.patient_health_plan 表承担，远期路线图：计划生成后落库。
 *
 * 远期路线图：接入可穿戴设备与 AI 健康大脑后，trackHealthProgress 由
 * 「手动上报」升级为「自动采集 + 趋势预测」，adjustHealthPlan 由「被动反馈」
 * 升级为「主动按周自动调参」，并与家庭医生团队共享同一计划视图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                 */
/* ------------------------------------------------------------------ */

/** 支持的慢病标签（与 clinical.chronic_disease_record.disease 对齐并扩展） */
export type ChronicCondition =
  | 'hypertension' // 高血压
  | 'diabetes' // 2 型糖尿病
  | 'chd' // 冠心病
  | 'obesity' // 肥胖 / 超重
  | 'copd'; // 慢阻肺

/** 患者个人健康目标 */
export type HealthGoal =
  | 'weight_loss' // 减重
  | 'blood_pressure_control' // 血压达标
  | 'glucose_control' // 血糖达标
  | 'fitness' // 体能提升
  | 'sleep_improve'; // 睡眠改善

/** 运动建议 */
export interface ExercisePlan {
  /** 每周目标运动量（分钟/周） */
  weeklyMinutes: number;
  /** 推荐运动类型 */
  types: string[];
  /** 每次时长建议（分钟） */
  perSessionMinutes: number;
  /** 强度描述（温和 / 中等 / 中高） */
  intensity: '温和' | '中等' | '中高';
  /** 禁忌 / 注意事项 */
  cautions: string[];
}

/** 饮食建议 */
export interface DietPlan {
  /** 每日目标热量（kcal） */
  dailyKcal: number;
  /** 三大营养素供能比（%），三者之和 ≈ 100 */
  macros: { carbs: number; protein: number; fat: number };
  /** 重点推荐食物 */
  emphasize: string[];
  /** 限制 / 避免食物 */
  restrict: string[];
}

/** 单条用药提醒 */
export interface MedicationReminder {
  name: string;
  /** 服药时点，如「晨起空腹」「餐前 30 分钟」「睡前」 */
  timing: string;
  /** 漏药预警：连续漏服达到此次数即升级提醒 */
  missedDoseAlertAfter: number;
}

/** 复查计划 */
export interface FollowupPlan {
  /** 下次复查日期（ISO date），由 build 时按基线 + 间隔推算 */
  nextAt: string;
  /** 复查项目 */
  items: string[];
  /** 复查间隔（天） */
  intervalDays: number;
}

/** 红旗症状：出现即立即就医 */
export interface RedFlag {
  symptom: string;
  /** 触发条件说明 */
  trigger: string;
  /** 处置建议 */
  action: string;
}

/** 近一周进度快照 */
export interface HealthProgress {
  /** 本周累计运动分钟数 */
  weeklyExerciseMinutes: number;
  /** 饮食依从率 0~1 */
  dietAdherence: number;
  /** 用药依从率 0~1 */
  medicationAdherence: number;
  /** 近 3 天漏药次数 */
  missedDoses: number;
  /** 累计上报活动条数 */
  activityCount: number;
}

/** 一份完整的个性化健康计划 */
export interface PatientHealthPlan {
  planId: string;
  patientId: string;
  version: number;
  chronicConditions: ChronicCondition[];
  goals: HealthGoal[];
  exercise: ExercisePlan;
  diet: DietPlan;
  medication: MedicationReminder[];
  followup: FollowupPlan;
  redFlags: RedFlag[];
  progress: HealthProgress;
  lastAdjustReason: string | null;
  createdAt: string;
  updatedAt: string;
}

/** trackHealthProgress 上报的一次活动 */
export interface HealthActivity {
  type: 'exercise' | 'diet' | 'medication';
  /** 运动类型活动：本次运动分钟数 */
  minutes?: number;
  /** 用药类型活动：本次是否按时服药 */
  onTime?: boolean;
  /** 饮食类型活动：本次是否依从计划 */
  onPlan?: boolean;
}

/** adjustHealthPlan 的患者反馈 */
export interface HealthPlanFeedback {
  /** 计划难度反馈 */
  difficulty: 'too_hard' | 'too_easy' | 'ok';
  /** 运动中是否有不适 */
  discomfort?: string;
  /** 患者补充说明 */
  notes?: string;
}

/* ------------------------------------------------------------------ */
/* 运行时内存计划库（纯函数风格，便于单测重置）                          */
/* ------------------------------------------------------------------ */

const planStore = new Map<string, PatientHealthPlan>();

/** 测试专用：清空计划库 */
export function __resetHealthPlanStore(): void {
  planStore.clear();
}

function todayPlus(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ------------------------------------------------------------------ */
/* 个性化推导规则库（慢病 × 目标 → 五件套）                              */
/* ------------------------------------------------------------------ */

/** 基线运动：健康成人每周 150 分钟中等强度有氧 */
const BASE_EXERCISE: ExercisePlan = {
  weeklyMinutes: 150,
  types: ['快走', '慢跑', '骑行', '游泳'],
  perSessionMinutes: 30,
  intensity: '中等',
  cautions: ['运动前热身 5~10 分钟', '运动后拉伸，避免骤停'],
};

/** 基线饮食：2000 kcal，碳水 55 / 蛋白 15 / 脂肪 30 */
const BASE_DIET: DietPlan = {
  dailyKcal: 2000,
  macros: { carbs: 55, protein: 15, fat: 30 },
  emphasize: ['全谷物', '新鲜蔬菜', '优质蛋白'],
  restrict: ['含糖饮料', '深加工食品'],
};

/** 慢病专属运动调整 */
function applyChronicExercise(cond: ChronicCondition, ex: ExercisePlan): ExercisePlan {
  switch (cond) {
    case 'hypertension':
      return {
        ...ex,
        types: ['快走', '太极拳', '游泳', '轻松骑行'],
        intensity: '温和',
        cautions: [
          ...ex.cautions,
          '避免憋气用力（如大重量负重）与爆发性运动',
          '运动中自测血压，收缩压 >180 mmHg 暂停运动',
        ],
      };
    case 'diabetes':
      return {
        ...ex,
        types: ['快走', '餐后散步', '固定自行车', '轻量抗阻'],
        // 若已合并高血压等需温和的慢病，保持更保守的强度，不越级
        intensity: ex.intensity === '温和' ? '温和' : '中等',
        perSessionMinutes: 20,
        cautions: [
          ...ex.cautions,
          '避免空腹运动，餐后 1 小时为宜',
          '随身携带糖块，警惕低血糖（出冷汗 / 手抖）',
        ],
      };
    case 'chd':
      return {
        ...ex,
        weeklyMinutes: 90,
        types: ['心脏康复操', '平地快走', '舒缓骑行'],
        intensity: '温和',
        perSessionMinutes: 20,
        cautions: [
          ...ex.cautions,
          '在心脏康复心率区间内运动，不追求大汗',
          '出现胸闷 / 气短立即停止并休息',
        ],
      };
    case 'obesity':
      return {
        ...ex,
        weeklyMinutes: 250,
        types: ['快走', '游泳', '椭圆机', '水中走'],
        intensity: '中等',
        cautions: [
          ...ex.cautions,
          '优先选择对膝关节冲击小的运动',
          '循序渐进，每周增量不超过 10%',
        ],
      };
    case 'copd':
      return {
        ...ex,
        weeklyMinutes: 120,
        types: ['缩唇呼吸训练', '腹式呼吸', '平地慢走', '八段锦'],
        intensity: '温和',
        perSessionMinutes: 15,
        cautions: [...ex.cautions, '血氧饱和度 <90% 或明显气促时停止'],
      };
  }
}

/** 慢病专属饮食调整 */
function applyChronicDiet(cond: ChronicCondition, diet: DietPlan): DietPlan {
  switch (cond) {
    case 'hypertension':
      return {
        ...diet,
        macros: { carbs: 55, protein: 18, fat: 27 },
        emphasize: [...diet.emphasize, '低钠盐', '新鲜蔬果（高钾）', '低脂奶'],
        restrict: [...diet.restrict, '腌制食品', '加工肉', '酱料（每日盐 <5g）'],
      };
    case 'diabetes':
      return {
        ...diet,
        dailyKcal: 1800,
        macros: { carbs: 45, protein: 20, fat: 35 },
        emphasize: [...diet.emphasize, '低升糖指数主食', '绿叶菜', '优质蛋白'],
        restrict: [...diet.restrict, '精制糖', '白米粥', '含糖水果'],
      };
    case 'chd':
      return {
        ...diet,
        dailyKcal: 1800,
        macros: { carbs: 50, protein: 18, fat: 32 },
        emphasize: [...diet.emphasize, '深海鱼（每周 2 次）', '坚果（少量）', '橄榄油'],
        restrict: [...diet.restrict, '动物内脏', '油炸食品', '反式脂肪'],
      };
    case 'obesity':
      return {
        ...diet,
        dailyKcal: 1600,
        macros: { carbs: 45, protein: 25, fat: 30 },
        emphasize: [...diet.emphasize, '高膳食纤维', '高蛋白（增加饱腹感）'],
        restrict: [...diet.restrict, '夜宵', '高脂零食', '酒精'],
      };
    case 'copd':
      return {
        ...diet,
        macros: { carbs: 50, protein: 20, fat: 30 },
        emphasize: [...diet.emphasize, '优质蛋白（防肌少症）', '充足水分'],
        restrict: [...diet.restrict, '产气食物（豆类 / 碳酸饮料，避免腹胀影响呼吸）'],
      };
  }
}

/** 慢病专属用药提醒 */
function chronicMedication(cond: ChronicCondition): MedicationReminder[] {
  switch (cond) {
    case 'hypertension':
      return [
        { name: '降压药（如氨氯地平）', timing: '晨起固定时间', missedDoseAlertAfter: 2 },
      ];
    case 'diabetes':
      return [
        { name: '降糖药（如二甲双胍）', timing: '随餐服用', missedDoseAlertAfter: 2 },
      ];
    case 'chd':
      return [
        { name: '他汀类调脂药', timing: '睡前服用', missedDoseAlertAfter: 3 },
        { name: '抗血小板药（如阿司匹林）', timing: '早餐后', missedDoseAlertAfter: 2 },
      ];
    case 'obesity':
      return [];
    case 'copd':
      return [
        { name: '支气管扩张吸入剂', timing: '晨起 + 睡前规律使用', missedDoseAlertAfter: 2 },
      ];
  }
}

/** 慢病专属复查计划：取已有慢病中最频繁的间隔 */
function chronicFollowup(conds: ChronicCondition[]): FollowupPlan {
  let intervalDays = 365;
  const items = new Set<string>();
  for (const c of conds) {
    switch (c) {
      case 'hypertension':
        intervalDays = Math.min(intervalDays, 90);
        items.add('诊室血压 + 家庭血压日记');
        items.add('肾功能 + 电解质');
        break;
      case 'diabetes':
        intervalDays = Math.min(intervalDays, 90);
        items.add('糖化血红蛋白 HbA1c');
        items.add('空腹血糖 + 餐后 2h 血糖');
        items.add('尿微量白蛋白 / 肌酐比');
        break;
      case 'chd':
        intervalDays = Math.min(intervalDays, 180);
        items.add('血脂四项（重点 LDL-C）');
        items.add('常规心电图');
        break;
      case 'obesity':
        intervalDays = Math.min(intervalDays, 180);
        items.add('体重 / BMI / 腰围');
        items.add('血脂 + 肝功能');
        break;
      case 'copd':
        intervalDays = Math.min(intervalDays, 90);
        items.add('肺功能（FEV1）');
        items.add('血氧饱和度');
        break;
    }
  }
  if (items.size === 0) items.add('年度健康体检');
  return { nextAt: todayPlus(intervalDays), items: [...items], intervalDays };
}

/** 慢病专属红旗症状 */
function chronicRedFlags(conds: ChronicCondition[]): RedFlag[] {
  const flags: RedFlag[] = [];
  if (conds.includes('hypertension')) {
    flags.push({
      symptom: '剧烈头痛 / 视物模糊 / 血压 ≥180/120 mmHg',
      trigger: '自测或诊室血压显著升高伴上述任一症状',
      action: '立即静坐休息并就医，不要自行加药',
    });
  }
  if (conds.includes('diabetes')) {
    flags.push({
      symptom: '出冷汗 / 手抖 / 心慌 / 意识模糊（疑似低血糖）',
      trigger: '用药或运动后出现低血糖症状',
      action: '立即口服 15g 糖块 / 糖水，15 分钟复测血糖，不缓解立即就医',
    });
    flags.push({
      symptom: '持续多饮多尿 / 血糖 ≥16.7 mmol/L / 恶心呕吐',
      trigger: '血糖显著升高伴脱水症状',
      action: '立即就医，警惕酮症酸中毒',
    });
  }
  if (conds.includes('chd')) {
    flags.push({
      symptom: '胸痛持续 >15 分钟，放射至左肩 / 下颌，伴大汗 / 濒死感',
      trigger: '静息或轻活动下出现心绞痛加重',
      action: '立即停止活动、含服硝酸甘油，拨打 120',
    });
  }
  if (flags.length === 0) {
    flags.push({
      symptom: '持续发热 >39℃ / 呼吸困难 / 晕厥',
      trigger: '出现上述任一急性症状',
      action: '立即就医或拨打 120',
    });
  }
  return flags;
}

/* ------------------------------------------------------------------ */
/* 目标层调整：在慢病调整后的基础上，再叠加个人目标                       */
/* ------------------------------------------------------------------ */

function applyGoal(goals: HealthGoal[], plan: PatientHealthPlan): PatientHealthPlan {
  let exercise = plan.exercise;
  let diet = plan.diet;
  for (const g of goals) {
    switch (g) {
      case 'weight_loss':
        exercise = {
          ...exercise,
          weeklyMinutes: Math.round(exercise.weeklyMinutes * 1.25),
          types: exercise.types.includes('椭圆机')
            ? exercise.types
            : [...exercise.types, '椭圆机'],
        };
        diet = { ...diet, dailyKcal: Math.max(diet.dailyKcal - 300, 1200) };
        break;
      case 'blood_pressure_control':
        diet = {
          ...diet,
          restrict: diet.restrict.includes('每日盐 <5g')
            ? diet.restrict
            : [...diet.restrict, '每日盐 <5g'],
        };
        exercise = {
          ...exercise,
          types: exercise.types.includes('太极拳') ? exercise.types : [...exercise.types, '太极拳'],
        };
        break;
      case 'glucose_control':
        exercise = {
          ...exercise,
          types: exercise.types.includes('餐后散步')
            ? exercise.types
            : [...exercise.types, '餐后散步'],
        };
        break;
      case 'fitness':
        exercise = {
          ...exercise,
          weeklyMinutes: exercise.weeklyMinutes + 60,
          types: exercise.types.includes('轻量抗阻') ? exercise.types : [...exercise.types, '轻量抗阻'],
        };
        diet = { ...diet, macros: { ...diet.macros, protein: diet.macros.protein + 5 } };
        break;
      case 'sleep_improve':
        exercise = {
          ...exercise,
          types: exercise.types.includes('八段锦') ? exercise.types : [...exercise.types, '八段锦'],
          cautions: [...exercise.cautions, '睡前 2 小时避免中高强度运动'],
        };
        diet = { ...diet, restrict: [...diet.restrict, '下午后避免浓茶 / 咖啡'] };
        break;
    }
  }
  return { ...plan, exercise, diet };
}

/* ------------------------------------------------------------------ */
/* 导出纯函数                                                           */
/* ------------------------------------------------------------------ */

/**
 * 依据患者慢病组合 + 个人目标，生成一份因人而异的五件套健康计划。
 * 同一患者重复调用不重复生成：已存在则直接返回当前版本。
 */
export function buildPersonalizedHealthPlan(
  patientId: string,
  chronicConditions: ChronicCondition[] = [],
  goals: HealthGoal[] = [],
): PatientHealthPlan {
  const key = patientId || 'anonymous';
  if (planStore.has(key)) return planStore.get(key)!;

  let exercise = { ...BASE_EXERCISE, cautions: [...BASE_EXERCISE.cautions] };
  let diet: DietPlan = {
    ...BASE_DIET,
    macros: { ...BASE_DIET.macros },
    emphasize: [...BASE_DIET.emphasize],
    restrict: [...BASE_DIET.restrict],
  };
  const medications: MedicationReminder[] = [];
  for (const c of chronicConditions) {
    exercise = applyChronicExercise(c, exercise);
    diet = applyChronicDiet(c, diet);
    medications.push(...chronicMedication(c));
  }

  let plan: PatientHealthPlan = {
    planId: `hp_${key}_${Date.now().toString(36)}`,
    patientId: key,
    version: 1,
    chronicConditions: [...chronicConditions],
    goals: [...goals],
    exercise,
    diet,
    medication: medications,
    followup: chronicFollowup(chronicConditions),
    redFlags: chronicRedFlags(chronicConditions),
    progress: {
      weeklyExerciseMinutes: 0,
      dietAdherence: 0,
      medicationAdherence: 1,
      missedDoses: 0,
      activityCount: 0,
    },
    lastAdjustReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  plan = applyGoal(goals, plan);

  planStore.set(key, plan);
  return plan;
}

/**
 * 上报一次健康活动，累计近一周依从进度。纯函数：基于当前计划派生新进度快照。
 * 用药依从率 = 按时服药次数 / 累计用药上报次数；漏药即累计 missedDoses。
 */
export function trackHealthProgress(
  planId: string,
  activity: HealthActivity,
): { plan: PatientHealthPlan; progress: HealthProgress; alerts: string[] } {
  const plan = findPlanById(planId);
  const progress: HealthProgress = { ...plan.progress };
  const alerts: string[] = [];

  if (activity.type === 'exercise') {
    progress.weeklyExerciseMinutes += Math.max(0, Math.round(activity.minutes ?? 0));
  } else if (activity.type === 'diet') {
    // 滑动平均：本次依从与历史依从率按 1:9 融合，避免单次抖动
    progress.dietAdherence = Number(
      (progress.dietAdherence * 0.9 + (activity.onPlan ? 1 : 0) * 0.1).toFixed(2),
    );
  } else if (activity.type === 'medication') {
    const count = progress.activityCount + 1;
    if (activity.onTime) {
      progress.medicationAdherence = Number(
        ((progress.medicationAdherence * (count - 1) + 1) / count).toFixed(2),
      );
    } else {
      progress.medicationAdherence = Number(
        ((progress.medicationAdherence * (count - 1) + 0) / count).toFixed(2),
      );
      progress.missedDoses += 1;
    }
  }
  progress.activityCount += 1;

  // 漏药预警：达到任一用药提醒的阈值即提醒
  const threshold = plan.medication.reduce(
    (min, m) => Math.min(min, m.missedDoseAlertAfter),
    Number.POSITIVE_INFINITY,
  );
  if (progress.missedDoses >= threshold && Number.isFinite(threshold)) {
    alerts.push(
      `连续漏药已达 ${progress.missedDoses} 次，建议尽快补服并联系家庭医生调整服药提醒方式`,
    );
  }

  const updated: PatientHealthPlan = {
    ...plan,
    progress,
    updatedAt: new Date().toISOString(),
  };
  planStore.set(plan.patientId, updated);
  return { plan: updated, progress, alerts };
}

/**
 * 根据患者反馈动态调整计划：
 *  - too_hard：周运动量下调 20%，强度不升反降；
 *  - too_easy：周运动量上调 15%；
 *  - discomfort：记录不适原因，运动量临时下调 10% 并标注注意事项；
 *  - 每次调整 version +1，留痕 lastAdjustReason。
 */
export function adjustHealthPlan(
  planId: string,
  feedback: HealthPlanFeedback,
): PatientHealthPlan {
  const plan = findPlanById(planId);
  const factor =
    feedback.difficulty === 'too_hard'
      ? 0.8
      : feedback.difficulty === 'too_easy'
        ? 1.15
        : feedback.discomfort
          ? 0.9
          : 1;

  let exercise = plan.exercise;
  let cautions = [...plan.exercise.cautions];
  if (factor !== 1) {
    exercise = {
      ...exercise,
      weeklyMinutes: Math.max(30, Math.round(exercise.weeklyMinutes * factor)),
    };
  }
  if (feedback.discomfort) {
    cautions = [...cautions, `近期不适（${feedback.discomfort}）：降低强度并及时复诊评估`];
  }
  const reason =
    feedback.difficulty === 'too_hard'
      ? '患者反馈计划太难，运动量下调 20%'
      : feedback.difficulty === 'too_easy'
        ? '患者反馈计划太轻松，运动量上调 15%'
        : feedback.discomfort
          ? `患者运动不适（${feedback.discomfort}），临时减量 10%`
          : feedback.notes ?? '患者反馈维持原计划';

  const updated: PatientHealthPlan = {
    ...plan,
    exercise: { ...exercise, cautions },
    version: plan.version + 1,
    lastAdjustReason: reason,
    updatedAt: new Date().toISOString(),
  };
  planStore.set(plan.patientId, updated);
  return updated;
}

/** 按 planId 反查计划（planId 内编码 patientId，等价于按患者取最新版） */
function findPlanById(planId: string): PatientHealthPlan {
  for (const plan of planStore.values()) {
    if (plan.planId === planId) return plan;
  }
  throw new Error(`健康计划不存在：${planId}`);
}
