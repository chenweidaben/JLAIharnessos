/**
 * 护理评估汇总纯函数（M30-A）。
 * 把各模块最新值聚合成卡片摘要，生成 needsAttention 标记。
 */

export interface EvalSummaryInput {
  nutrition?: { totalScore: number; nutritionRisk: boolean } | null;
  pain?: { score: number; level: string } | null;
  risk?: { bradenLevel?: string; morseLevel?: string } | null;
  tubeCount?: number;
  ioBalance?: number;
  openTaskCount?: number;
}

export interface EvalSummary {
  nutritionRisk: boolean;
  painSevere: boolean;
  riskHigh: boolean;
  tubeCount: number;
  ioBalance: number;
  openTaskCount: number;
  needsAttention: boolean;
  flags: string[];
}

export function buildEvalSummary(inp: EvalSummaryInput): EvalSummary {
  const flags: string[] = [];
  if (inp.nutrition?.nutritionRisk) flags.push('nutrition_risk');
  if (inp.pain && inp.pain.score >= 4) flags.push('pain_analgesia');
  if (inp.risk?.bradenLevel === 'high' || inp.risk?.morseLevel === 'high') flags.push('fall_pressure_risk');
  if ((inp.openTaskCount ?? 0) > 0) flags.push('open_intervention_tasks');
  return {
    nutritionRisk: inp.nutrition?.nutritionRisk ?? false,
    painSevere: (inp.pain?.score ?? 0) >= 7,
    riskHigh: inp.risk?.bradenLevel === 'high' || inp.risk?.morseLevel === 'high',
    tubeCount: inp.tubeCount ?? 0,
    ioBalance: inp.ioBalance ?? 0,
    openTaskCount: inp.openTaskCount ?? 0,
    needsAttention: flags.length > 0,
    flags,
  };
}
