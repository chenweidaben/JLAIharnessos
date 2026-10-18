/**
 * 健澜科技 jlmedaios - 病历质控培训考核模块 V14 聚合器（M467-D，M467 收官）
 *
 * 纯函数：生成培训课程 + 评分计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 考题 */
export interface TrainingQuestionV14 {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
}

/** 培训课程 */
export interface TrainingModuleV14 {
  courseId: string;
  title: string;
  questions: TrainingQuestionV14[];
}

/** 考核结果 */
export interface ExamResultV14 {
  score: number;
  correctCount: number;
  pass: boolean;
}

/**
 * 生成培训课程（含至少 3 道考题）。
 *
 * @param courseId 课程 ID
 * @returns 培训课程
 */
export function buildTrainingModule(courseId: string): TrainingModuleV14 {
  return {
    courseId,
    title: "病历质控规范培训",
    questions: [
      {
        id: "Q001",
        question: "病历甲级质控要求中，主诉缺失属于哪类缺陷？",
        options: ["阻塞性缺陷", "主要缺陷", "次要缺陷", "无缺陷"],
        answerIndex: 1,
      },
      {
        id: "Q002",
        question: "入院记录应在患者入院后多少小时内完成？",
        options: ["6小时", "12小时", "24小时", "48小时"],
        answerIndex: 2,
      },
      {
        id: "Q003",
        question: "电子病历五级评审要求中，乙级病历的合格率应达到多少？",
        options: ["80%", "85%", "90%", "95%"],
        answerIndex: 3,
      },
    ],
  };
}

/**
 * 逐题对比评分：得分=正确数/总题数×100（四舍五入取整），≥60 及格。
 *
 * @param answers 考生答案数组（选项索引）
 * @param questions 考题数组（含正确答案索引）
 * @returns 考核结果
 */
export function scoreExam(answers: number[], questions: TrainingQuestionV14[]): ExamResultV14 {
  const total = questions.length;
  let correctCount = 0;
  for (let i = 0; i < total; i++) {
    if (answers[i] === questions[i]?.answerIndex) {
      correctCount++;
    }
  }
  const score = total > 0 ? Math.round((correctCount / total) * 100) : 0;
  return { score, correctCount, pass: score >= 60 };
}
