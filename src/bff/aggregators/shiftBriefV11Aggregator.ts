/**
 * 健澜科技 jlmedaios - NURSE_MUSE 主动式交接班简报 V11 纯函数（M293-B）
 *
 * buildShiftBriefV11 / prioritizeShiftV11 / formatShiftBriefV11
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 交接班条目 */
export interface ShiftItemV11 {
  id: string;
  category: "nightEvent" | "pressureRisk" | "ivTask" | "bed" | "handover";
  title: string;
  priority: number;
}

export interface ShiftBedV11 {
  bedId: string;
  patientId: string;
}

export interface IvTaskV11 {
  taskId: string;
  bedId: string;
  drug: string;
}

export interface PressureRiskV11 {
  riskId: string;
  bedId: string;
  level: "high" | "medium" | "low";
}

export interface NightEventV11 {
  eventId: string;
  title: string;
}

export interface HandoverItemV11 {
  itemId: string;
  title: string;
}

/** 交接班简报 */
export interface ShiftBriefV11 {
  nurseId: string;
  items: ShiftItemV11[];
  bedCount: number;
  ivCount: number;
  pressureHighCount: number;
  nightEventCount: number;
  handoverCount: number;
}

const PRIORITY_MAP: Record<ShiftItemV11["category"], number> = {
  nightEvent: 1,
  pressureRisk: 2,
  ivTask: 3,
  bed: 4,
  handover: 5,
};

/**
 * 交接班简报聚合 V11（纯函数）：合并五类输入为统一条目。
 *
 * @param nurseId 护士ID
 * @param beds 分管床位
 * @param ivTasks 输液任务
 * @param pressureRisks 压疮风险
 * @param nightEvents 夜间异常事件
 * @param handoverItems 待交接事项
 * @returns 简报
 */
export function buildShiftBriefV11(
  nurseId: string,
  beds: ShiftBedV11[],
  ivTasks: IvTaskV11[],
  pressureRisks: PressureRiskV11[],
  nightEvents: NightEventV11[],
  handoverItems: HandoverItemV11[],
): ShiftBriefV11 {
  const items: ShiftItemV11[] = [
    ...nightEvents.map((e): ShiftItemV11 => ({
      id: e.eventId,
      category: "nightEvent",
      title: e.title,
      priority: PRIORITY_MAP.nightEvent,
    })),
    ...pressureRisks.map((r): ShiftItemV11 => ({
      id: r.riskId,
      category: "pressureRisk",
      title: `压疮风险（${r.bedId}）${r.level === "high" ? "[高危]" : ""}`,
      priority: PRIORITY_MAP.pressureRisk,
    })),
    ...ivTasks.map((t): ShiftItemV11 => ({
      id: t.taskId,
      category: "ivTask",
      title: `输液 ${t.drug}（${t.bedId}）`,
      priority: PRIORITY_MAP.ivTask,
    })),
    ...beds.map((b): ShiftItemV11 => ({
      id: b.bedId,
      category: "bed",
      title: `床位 ${b.bedId}（${b.patientId}）`,
      priority: PRIORITY_MAP.bed,
    })),
    ...handoverItems.map((h): ShiftItemV11 => ({
      id: h.itemId,
      category: "handover",
      title: h.title,
      priority: PRIORITY_MAP.handover,
    })),
  ];
  return {
    nurseId,
    items,
    bedCount: beds.length,
    ivCount: ivTasks.length,
    pressureHighCount: pressureRisks.filter((r) => r.level === "high").length,
    nightEventCount: nightEvents.length,
    handoverCount: handoverItems.length,
  };
}

/**
 * 交接班排序 V11（纯函数）：nightEvent > pressureRisk > ivTask > bed > handover。
 *
 * @param items 条目列表
 * @returns 排序后条目
 */
export function prioritizeShiftV11(items: ShiftItemV11[]): ShiftItemV11[] {
  return [...items].sort((a, b) => a.priority - b.priority);
}

/**
 * 人话交接班 V11（纯函数）：含关键数字。
 *
 * @param brief 简报
 * @returns 文本
 */
export function formatShiftBriefV11(brief: ShiftBriefV11): string {
  return (
    `交班提示：${brief.nurseId} 分管${brief.bedCount}张床，` +
    `${brief.nightEventCount}条夜间异常，${brief.pressureHighCount}例压疮高危，` +
    `${brief.ivCount}条输液待执行，另有${brief.handoverCount}项待交接。`
  );
}
