/**
 * 护理评估汇总纯函数（M30-A + M32-A 手术麻醉块）。
 */

export interface EvalSummaryInput {
  nutrition?: { totalScore: number; nutritionRisk: boolean } | null;
  pain?: { score: number; level: string } | null;
  risk?: { bradenLevel?: string; morseLevel?: string } | null;
  tubeCount?: number;
  ioBalance?: number;
  openTaskCount?: number;
  surgery?: {
    preopComplete?: boolean;
    preopMissing?: string[];
    pacuAldrete?: number | null;
    pacuReady?: boolean;
    followupPending?: number;
    anesthesiaOpenTasks?: number;
  };
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
  surgery: {
    preopComplete: boolean;
    preopMissing: string[];
    pacuAldrete: number | null;
    pacuReady: boolean;
    followupPending: number;
    anesthesiaOpenTasks: number;
  };
}

export function buildEvalSummary(inp: EvalSummaryInput): EvalSummary {
  const flags: string[] = [];
  if (inp.nutrition?.nutritionRisk) flags.push('nutrition_risk');
  if (inp.pain && inp.pain.score >= 4) flags.push('pain_analgesia');
  if (inp.risk?.bradenLevel === 'high' || inp.risk?.morseLevel === 'high') flags.push('fall_pressure_risk');
  if ((inp.openTaskCount ?? 0) > 0) flags.push('open_intervention_tasks');

  const s = inp.surgery ?? {};
  if (s.preopComplete === false) flags.push('preop_incomplete');
  if (s.pacuAldrete != null && !s.pacuReady) flags.push('pacu_not_ready');
  if ((s.followupPending ?? 0) > 0) flags.push('postop_followup_pending');
  if ((s.anesthesiaOpenTasks ?? 0) > 0) flags.push('anesthesia_open_task');

  return {
    nutritionRisk: inp.nutrition?.nutritionRisk ?? false,
    painSevere: (inp.pain?.score ?? 0) >= 7,
    riskHigh: inp.risk?.bradenLevel === 'high' || inp.risk?.morseLevel === 'high',
    tubeCount: inp.tubeCount ?? 0,
    ioBalance: inp.ioBalance ?? 0,
    openTaskCount: inp.openTaskCount ?? 0,
    needsAttention: flags.length > 0,
    flags,
    surgery: {
      preopComplete: s.preopComplete ?? true,
      preopMissing: s.preopMissing ?? [],
      pacuAldrete: s.pacuAldrete ?? null,
      pacuReady: s.pacuReady ?? true,
      followupPending: s.followupPending ?? 0,
      anesthesiaOpenTasks: s.anesthesiaOpenTasks ?? 0,
    },
  };
}
