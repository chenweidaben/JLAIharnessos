/**
 * 健澜科技 jlmedaios - 病历质控知识图谱 V14（M465-D，M465 收官）
 *
 * 纯数据知识链：缺陷类型→原因→整改措施→关联缺陷。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 缺陷节点 */
export interface DefectNodeV14 {
  defectType: string;
  causes: string[];
  remedies: string[];
  relatedDefects: string[];
}

/** 内置质控知识图谱（4 个核心缺陷节点） */
export const QC_GRAPH_V14: DefectNodeV14[] = [
  {
    defectType: "主诉缺失",
    causes: ["医生问诊不充分", "模板未配置主诉必填字段"],
    remedies: ["补充主诉内容后重新提交", "检查模板字段配置并设为必填"],
    relatedDefects: ["现病史过短"],
  },
  {
    defectType: "现病史过短",
    causes: ["医生书写不规范", "缺乏结构化引导"],
    remedies: ["按模板扩充现病史内容", "使用 AI 辅助生成草稿"],
    relatedDefects: ["主诉缺失"],
  },
  {
    defectType: "诊断不规范",
    causes: ["未使用标准术语", "ICD 编码错误或缺失"],
    remedies: ["使用标准术语词库统一表述", "核对 ICD-10 编码准确性"],
    relatedDefects: ["时限超时"],
  },
  {
    defectType: "时限超时",
    causes: ["医生工作量大书写延迟", "系统提醒不及时"],
    remedies: ["启动 SLA 实时预警", "科室质控员督促整改"],
    relatedDefects: ["诊断不规范"],
  },
];

/**
 * 查询关联缺陷类型。
 *
 * @param defectType 缺陷类型
 * @returns 关联缺陷列表（未命中返回空数组）
 */
export function findRelatedDefects(defectType: string): string[] {
  const node = QC_GRAPH_V14.find((n) => n.defectType === defectType);
  return node ? node.relatedDefects : [];
}

/**
 * 查询整改措施建议。
 *
 * @param defectType 缺陷类型
 * @returns 整改措施列表（未命中返回空数组）
 */
export function getRemediationAdvice(defectType: string): string[] {
  const node = QC_GRAPH_V14.find((n) => n.defectType === defectType);
  return node ? node.remedies : [];
}
