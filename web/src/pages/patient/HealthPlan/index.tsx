/**
 * 健澜科技 jlmedaios - 患者端 · 个性化健康计划页（M160-D · 患者健康管理深化）
 *
 * 【个性化，不一刀切】按患者本人的慢病组合与健康目标，展示因人而异的
 * 五件套：运动建议 / 饮食建议 / 用药提醒 / 复查计划 / 红旗症状预警，
 * 并支持一键上报运动与用药进度，给出漏药预警与计划完成度。
 *
 * 深海蓝 VI（#0b4f8a 主色），三态 loading / error / empty，内联样式零额外
 * 依赖，最小触控目标 44px，不触碰 WebSocket。
 *
 * 远期路线图：接入可穿戴设备后进度自动采集，并支持患者一键反馈「太难 /
 * 太轻松」触发计划动态调整，与家庭医生共享同一计划视图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';

/* ------------------------------------------------------------------ */
/* 与 BFF 聚合结果对齐的类型                                            */
/* ------------------------------------------------------------------ */

interface ExercisePlan {
  weeklyMinutes: number;
  types: string[];
  perSessionMinutes: number;
  intensity: '温和' | '中等' | '中高';
  cautions: string[];
}
interface DietPlan {
  dailyKcal: number;
  macros: { carbs: number; protein: number; fat: number };
  emphasize: string[];
  restrict: string[];
}
interface MedicationReminder {
  name: string;
  timing: string;
  missedDoseAlertAfter: number;
}
interface FollowupPlan {
  nextAt: string;
  items: string[];
  intervalDays: number;
}
interface RedFlag {
  symptom: string;
  trigger: string;
  action: string;
}
interface HealthProgress {
  weeklyExerciseMinutes: number;
  dietAdherence: number;
  medicationAdherence: number;
  missedDoses: number;
  activityCount: number;
}
interface PatientHealthPlan {
  planId: string;
  patientId: string;
  version: number;
  chronicConditions: string[];
  goals: string[];
  exercise: ExercisePlan;
  diet: DietPlan;
  medication: MedicationReminder[];
  followup: FollowupPlan;
  redFlags: RedFlag[];
  progress: HealthProgress;
  lastAdjustReason: string | null;
}

/* ------------------------------------------------------------------ */
/* 深海蓝 VI 色板                                                       */
/* ------------------------------------------------------------------ */

const DEEP_SEA = '#0b4f8a';
const DEEP_SEA_DARK = '#083d6b';
const BG = '#f5f7fa';
const CARD = '#ffffff';
const RED = '#b71c1c';
const RED_BG = '#fdecea';
const ORANGE = '#bf360c';
const ORANGE_BG = '#fff3e0';
const OK = '#1b5e20';
const OK_BG = '#e8f5e9';

const CARD_STYLE: React.CSSProperties = {
  background: CARD,
  borderRadius: 12,
  padding: '16px',
  marginBottom: 12,
  boxShadow: '0 1px 3px rgba(11,79,138,0.08)',
};

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: DEEP_SEA,
  margin: '0 0 10px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const CHIP: React.CSSProperties = {
  display: 'inline-block',
  background: '#e8f1fa',
  color: DEEP_SEA,
  borderRadius: 999,
  padding: '2px 10px',
  fontSize: 12,
  marginRight: 6,
  marginBottom: 4,
};

const BUTTON: React.CSSProperties = {
  minHeight: 44,
  fontSize: 15,
  fontWeight: 600,
  borderRadius: 10,
  border: 'none',
  padding: '10px 16px',
  cursor: 'pointer',
};

const CONDITION_LABEL: Record<string, string> = {
  hypertension: '高血压',
  diabetes: '糖尿病',
  chd: '冠心病',
  obesity: '肥胖',
  copd: '慢阻肺',
};
const GOAL_LABEL: Record<string, string> = {
  weight_loss: '减重',
  blood_pressure_control: '血压达标',
  glucose_control: '血糖达标',
  fitness: '体能提升',
  sleep_improve: '改善睡眠',
};

/* ------------------------------------------------------------------ */
/* 组件                                                                */
/* ------------------------------------------------------------------ */

export default function HealthPlanPage(): React.JSX.Element {
  const [plan, setPlan] = useState<PatientHealthPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<string[]>([]);
  const patientId = 'demo-patient';

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/patient/health-plan/${patientId}?chronicConditions=hypertension,diabetes&goals=weight_loss,glucose_control`,
      );
      const json = await res.json();
      if (json.code !== 0) throw new Error(json.message || '加载失败');
      setPlan(json.data as PatientHealthPlan);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const track = useCallback(
    async (activity: { type: 'exercise' | 'diet' | 'medication'; minutes?: number; onTime?: boolean }) => {
      if (!plan) return;
      const res = await fetch('/api/v1/patient/health-plan/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId: plan.planId, activity }),
      });
      const json = await res.json();
      if (json.code === 0) {
        setPlan(json.data.plan as PatientHealthPlan);
        setAlerts(json.data.alerts as string[]);
      }
    },
    [plan],
  );

  if (loading) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', color: DEEP_SEA, padding: 40 }}>正在生成您的个性化健康计划…</div>
      </PageShell>
    );
  }
  if (error || !plan) {
    return (
      <PageShell>
        <div style={{ textAlign: 'center', padding: 40, color: RED }}>
          {error ?? '暂无健康计划'}
          <div>
            <button style={{ ...BUTTON, background: DEEP_SEA, color: '#fff', marginTop: 12 }} onClick={load}>
              重新加载
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  const p = plan.progress;
  const exercisePct = Math.min(100, Math.round((p.weeklyExerciseMinutes / plan.exercise.weeklyMinutes) * 100));

  return (
    <PageShell>
      {/* 头部 */}
      <div style={{ ...CARD_STYLE, background: `linear-gradient(135deg, ${DEEP_SEA}, ${DEEP_SEA_DARK})`, color: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>我的个性化健康计划</div>
        <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
          版本 v{plan.version} · 按您的慢病与目标定制，不一刀切
        </div>
        <div style={{ marginTop: 10 }}>
          {plan.chronicConditions.map((c) => (
            <span key={c} style={{ ...CHIP, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              {CONDITION_LABEL[c] ?? c}
            </span>
          ))}
          {plan.goals.map((g) => (
            <span key={g} style={{ ...CHIP, background: 'rgba(255,255,255,0.18)', color: '#fff' }}>
              目标：{GOAL_LABEL[g] ?? g}
            </span>
          ))}
        </div>
      </div>

      {/* 进度 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>本周进度</div>
        <ProgressBar label={`运动 ${p.weeklyExerciseMinutes}/${plan.exercise.weeklyMinutes} 分钟`} pct={exercisePct} />
        <ProgressBar label={`饮食依从 ${Math.round(p.dietAdherence * 100)}%`} pct={Math.round(p.dietAdherence * 100)} />
        <ProgressBar label={`用药依从 ${Math.round(p.medicationAdherence * 100)}%`} pct={Math.round(p.medicationAdherence * 100)} />
        {p.missedDoses > 0 && (
          <div style={{ ...alertBox(ORANGE_BG, ORANGE), marginTop: 8 }}>近 3 天漏药 {p.missedDoses} 次，请按时服药</div>
        )}
        {alerts.map((a) => (
          <div key={a} style={{ ...alertBox(RED_BG, RED), marginTop: 8 }}>{a}</div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <button style={{ ...BUTTON, background: DEEP_SEA, color: '#fff' }} onClick={() => track({ type: 'exercise', minutes: 30 })}>
            打卡运动 30 分钟
          </button>
          <button style={{ ...BUTTON, background: OK_BG, color: OK }} onClick={() => track({ type: 'medication', onTime: true })}>
            已按时服药
          </button>
          <button style={{ ...BUTTON, background: OK_BG, color: OK }} onClick={() => track({ type: 'diet', onTime: true })}>
            今日饮食达标
          </button>
        </div>
      </div>

      {/* 运动建议 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>
          🏃 运动建议
          <span style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>
            {plan.exercise.weeklyMinutes} 分钟/周 · {plan.exercise.intensity}
          </span>
        </div>
        <div>{plan.exercise.types.map((t) => <span key={t} style={CHIP}>{t}</span>)}</div>
        <div style={{ fontSize: 13, color: '#555', marginTop: 8 }}>每次约 {plan.exercise.perSessionMinutes} 分钟</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#666' }}>
          {plan.exercise.cautions.map((c) => <li key={c}>{c}</li>)}
        </ul>
      </div>

      {/* 饮食建议 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>
          🥗 饮食建议
          <span style={{ fontSize: 12, fontWeight: 400, color: '#666' }}>约 {plan.diet.dailyKcal} kcal/天</span>
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 8 }}>
          碳水 {plan.diet.macros.carbs}% · 蛋白 {plan.diet.macros.protein}% · 脂肪 {plan.diet.macros.fat}%
        </div>
        <div style={{ fontSize: 13, color: OK }}>宜：{plan.diet.emphasize.join('、')}</div>
        <div style={{ fontSize: 13, color: RED, marginTop: 4 }}>忌：{plan.diet.restrict.join('、')}</div>
      </div>

      {/* 用药提醒 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>💊 用药提醒</div>
        {plan.medication.length === 0 ? (
          <div style={{ fontSize: 13, color: '#888' }}>当前无规律用药</div>
        ) : (
          plan.medication.map((m) => (
            <div key={m.name} style={{ fontSize: 13, padding: '6px 0', borderBottom: '1px dashed #eee' }}>
              <b>{m.name}</b> · {m.timing}
              <div style={{ color: ORANGE, fontSize: 12 }}>连续漏药 {m.missedDoseAlertAfter} 次将预警</div>
            </div>
          ))
        )}
      </div>

      {/* 复查计划 */}
      <div style={CARD_STYLE}>
        <div style={SECTION_TITLE}>📅 复查计划</div>
        <div style={{ fontSize: 14, color: DEEP_SEA, fontWeight: 600 }}>下次复查：{plan.followup.nextAt}</div>
        <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13, color: '#555' }}>
          {plan.followup.items.map((it) => <li key={it}>{it}</li>)}
        </ul>
      </div>

      {/* 红旗症状 */}
      <div style={{ ...CARD_STYLE, border: `1px solid ${RED}`, background: RED_BG }}>
        <div style={{ ...SECTION_TITLE, color: RED }}>🚨 红旗症状 · 出现请立即就医</div>
        {plan.redFlags.map((f) => (
          <div key={f.symptom} style={{ fontSize: 13, marginBottom: 8 }}>
            <div style={{ fontWeight: 600, color: RED }}>{f.symptom}</div>
            <div style={{ color: '#555' }}>{f.trigger}</div>
            <div style={{ color: '#333' }}>→ {f.action}</div>
          </div>
        ))}
      </div>

      {plan.lastAdjustReason && (
        <div style={{ ...CARD_STYLE, background: OK_BG, fontSize: 12, color: OK }}>
          最近调整：{plan.lastAdjustReason}
        </div>
      )}
    </PageShell>
  );
}

/* ------------------------------------------------------------------ */
/* 辅助小组件                                                           */
/* ------------------------------------------------------------------ */

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 560, margin: '0 auto', background: BG, minHeight: '100vh', padding: 12 }}>
      {children}
    </div>
  );
}

function ProgressBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 13, color: '#444', marginBottom: 4 }}>{label}</div>
      <div style={{ background: '#e5ebf2', borderRadius: 999, height: 8 }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, pct))}%`,
            background: DEEP_SEA,
            height: 8,
            borderRadius: 999,
            transition: 'width .3s',
          }}
        />
      </div>
    </div>
  );
}

function alertBox(bg: string, color: string): React.CSSProperties {
  return { background: bg, color, borderRadius: 8, padding: '8px 10px', fontSize: 13 };
}
