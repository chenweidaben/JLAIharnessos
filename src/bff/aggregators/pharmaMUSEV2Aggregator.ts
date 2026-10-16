/**
 * 健澜科技 jlmedaios - Pharma MUSE 药事智能体 V2 纯函数（M185-D）
 *
 * 与已有 pharmaMUSEAggregator.ts 互补，本模块聚焦：
 *   - checkDrugInteraction 药物相互作用检查
 *   - 处方审核/库存预警/经验沉淀
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 已知禁忌对 */
const CONTRAINDICATED_PAIRS: Array<[string, string]> = [
  ['warfarin', 'aspirin'],
  ['simvastatin', 'gemfibrozil'],
  ['metformin', 'contrast_dye'],
];

/** 相互作用警告 */
export interface InteractionAlert {
  drugA: string;
  drugB: string;
  severity: 'contraindicated' | 'caution';
  message: string;
}

/**
 * 检查药物相互作用。
 *
 * @param drugList 药品名称列表（小写英文通用名）
 * @returns 相互作用警告列表
 */
export function checkDrugInteraction(drugList: string[]): InteractionAlert[] {
  const result: InteractionAlert[] = [];
  const lower = drugList.map((d) => d.toLowerCase());

  for (const [a, b] of CONTRAINDICATED_PAIRS) {
    if (lower.includes(a) && lower.includes(b)) {
      result.push({
        drugA: a,
        drugB: b,
        severity: 'contraindicated',
        message: `${a} 与 ${b} 禁忌联用，可能导致严重出血/横纹肌溶解`,
      });
    }
  }

  const statins = lower.filter((d) => d.endsWith('statin'));
  if (statins.length >= 2) {
    result.push({
      drugA: statins[0],
      drugB: statins[1],
      severity: 'caution',
      message: `同时使用 ${statins.length} 种他汀类药物，需评估重复用药`,
    });
  }

  return result;
}

/** 药品库存 */
export interface DrugInventoryV2 {
  drugName: string;
  currentStock: number;
  minStock: number;
  expiryMonths: number;
}

/** 输出 */
export interface PharmaMUSEV2Result {
  pharmacistId: string;
  date: string;
  interactionAlerts: InteractionAlert[];
  inventoryAlerts: Array<{ drugName: string; reason: string; level: 'low' | 'medium' | 'high' }>;
  consultRecommendations: string[];
  caseLibrary: Array<{ caseId: string; prescriptionIssue: string; resolution: string }>;
}

/**
 * 构建 Pharma MUSE V2 药事智能体数据。
 *
 * @param pharmacistId 药师 ID
 * @param date 日期
 * @param prescriptionDrugs 处方药品列表
 * @param inventory 库存列表
 * @returns 药事智能体结果
 */
export function buildPharmaMUSE(
  pharmacistId: string,
  date: string,
  prescriptionDrugs: string[],
  inventory: DrugInventoryV2[],
): PharmaMUSEV2Result {
  const interactionAlerts = checkDrugInteraction(prescriptionDrugs);

  const inventoryAlerts: Array<{ drugName: string; reason: string; level: 'low' | 'medium' | 'high' }> = [];
  for (const item of inventory) {
    if (item.currentStock < item.minStock * 0.5) {
      inventoryAlerts.push({ drugName: item.drugName, reason: '严重低库存', level: 'high' });
    } else if (item.currentStock < item.minStock) {
      inventoryAlerts.push({ drugName: item.drugName, reason: '低库存预警', level: 'medium' });
    }
    if (item.expiryMonths <= 3) {
      inventoryAlerts.push({ drugName: item.drugName, reason: `近效期（${item.expiryMonths}个月）`, level: 'low' });
    }
  }

  const consultRecommendations: string[] = [];
  if (interactionAlerts.some((a) => a.severity === 'contraindicated')) {
    consultRecommendations.push('存在禁忌联用，建议联系医生调整处方');
  }
  if (inventoryAlerts.some((a) => a.level === 'high')) {
    consultRecommendations.push('部分药品严重缺货，建议及时采购');
  }

  return {
    pharmacistId,
    date,
    interactionAlerts,
    inventoryAlerts,
    consultRecommendations,
    caseLibrary: [
      {
        caseId: 'case-001',
        prescriptionIssue: '华法林+阿司匹林联用',
        resolution: '建议停用阿司匹林，换用氯吡格雷',
      },
    ],
  };
}
