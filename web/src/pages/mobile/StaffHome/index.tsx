/**
 * 健澜科技 jlmedaios - 医生移动工作站首页（M158-B，v4.x近期）
 *
 * 真·移动端，不是 PC 缩小版：
 *  - 单手可达：主操作区集中在屏幕下半部，触摸目标 ≥56px，正文 16px+；
 *  - 一屏四区：今日待办（待审医嘱/待查房/待病历）→ 分管患者（我管的+今日新收）
 *    → 快速操作（写交班/下医嘱/开检查大按钮）→ 消息通知（危急值/会诊/审批）；
 *  - 深海蓝 VI 头图，危急值红色角标、会诊橙色、审批蓝色，扫一眼即知轻重；
 *  - 进入页面即向后端登记一次 Web 推送令牌（localStorage 持久化伪令牌），
 *    失败静默（不阻塞首页渲染）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Spin } from 'antd';
import { get, post } from '@/services/request';

/** 与 BFF buildMobileStaffHome 输出对齐。 */
interface StaffTodo {
  key: string;
  label: string;
  count: number;
  target: string;
  urgent?: boolean;
}
interface MobilePatient {
  visitId: string;
  nameMasked: string;
  bedNo: string;
  group: 'mine' | 'new_today';
  acuity: number;
  hint?: string;
}
interface StaffQuickAction {
  key: string;
  label: string;
  desc: string;
  icon: string;
  target: string;
}
interface StaffNotification {
  key: string;
  type: string;
  title: string;
  preview: string;
  level: 'high' | 'mid' | 'low';
  time: string;
  actionTarget: string;
}
interface MobileHomeView {
  staffId: string;
  role: string;
  roleLabel: string;
  greeting: string;
  todos: StaffTodo[];
  todoTotal: number;
  patientGroups: { mine: MobilePatient[]; newToday: MobilePatient[] };
  quickActions: StaffQuickAction[];
  notifications: StaffNotification[];
}

/** 深海蓝 VI 色板（与品牌主色一致）。 */
const VI = {
  deepSea: '#0A2540',
  deepSea2: '#123C6E',
  bright: '#2E7DD1',
  bgSoft: '#EAF2FA',
  textMain: '#0A2540',
  textSub: '#5B7290',
  danger: '#D64545',
  warn: '#E08A1E',
  ok: '#2E7DD1',
  line: '#E1EBF5',
} as const;

/** 通知等级 → 左侧色条。 */
const LEVEL_BAR: Record<string, string> = {
  high: VI.danger,
  mid: VI.warn,
  low: VI.bright,
};

/** 图标键 → 字符映射（移动端轻量，不引入图标库依赖）。 */
const ICON_GLYPH: Record<string, string> = {
  swap: '🔄',
  'file-done': '📋',
  audit: '🩺',
  calendar: '📅',
  rounds: '🚶',
  chart: '✏️',
};

/** 待办 key → 图标。 */
const TODO_ICON: Record<string, string> = {
  order_review: '📋',
  rounds: '🚶',
  chart: '✏️',
};

/** 取/建本设备 Web 推送伪令牌（localStorage 持久化，跨会话稳定）。 */
function ensureWebToken(): string {
  const KEY = 'jl_mobile_web_token';
  try {
    const existing = window.localStorage.getItem(KEY);
    if (existing) return existing;
    const t = `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(KEY, t);
    return t;
  } catch {
    return `web-${Date.now().toString(36)}`;
  }
}

export default function MobileStaffHome() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<MobileHomeView | null>(null);

  /** 登记推送令牌（失败静默，不阻塞首页）。 */
  const registerPush = useCallback(() => {
    try {
      void post('/mobile/push/register', {
        deviceToken: ensureWebToken(),
        platform: 'web',
      }).catch(() => undefined);
    } catch {
      /* 忽略 */
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // baseURL 已带 /api/v1，此处只传业务路径
      const data = await get<MobileHomeView>('/mobile/staff/home');
      setView(data);
    } catch {
      setView(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    registerPush();
  }, [load, registerPush]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!view) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="首页加载失败，下拉或稍后重试" />
      </div>
    );
  }

  const mine = view.patientGroups?.mine ?? [];
  const newToday = view.patientGroups?.newToday ?? [];

  return (
    <div style={{ padding: 16, paddingBottom: 32, background: '#F4F8FC', minHeight: '100%', fontSize: 16 }}>
      {/* 深海蓝头图：问候 + 角色 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deepSea} 0%, ${VI.deepSea2} 100%)`,
          borderRadius: 16,
          padding: '22px 18px',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700 }}>{view.greeting}，医生</div>
        <div style={{ fontSize: 14, opacity: 0.85, marginTop: 6 }}>
          {view.roleLabel} · 今日还有 {view.todoTotal} 项待处理
        </div>
      </div>

      {/* 今日待办：三张大卡片 */}
      <Section title="今日待办">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {view.todos.map((t) => (
            <button
              key={t.key}
              data-testid={`m-todo-${t.key}`}
              type="button"
              onClick={() => navigate(t.target)}
              style={{
                background: '#fff',
                border: '1px solid ' + VI.line,
                borderRadius: 14,
                padding: '14px 8px',
                minHeight: 88,
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 6 }}>{TODO_ICON[t.key] ?? '📌'}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: VI.textMain }}>{t.label}</div>
              {t.count > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 22,
                    height: 22,
                    borderRadius: 11,
                    background: t.urgent ? VI.danger : VI.bright,
                    color: '#fff',
                    fontSize: 13,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0 6px',
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </Section>

      {/* 分管患者：我管的 + 今日新收 */}
      <Section title="分管患者">
        {mine.length === 0 && newToday.length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px dashed ' + VI.line,
              borderRadius: 14,
              padding: '28px 12px',
              color: VI.textSub,
              fontSize: 15,
              textAlign: 'center',
            }}
          >
            今日暂无分管患者
          </div>
        ) : (
          <>
            {newToday.length > 0 && (
              <PatientGroup label="今日新收" patients={newToday} color={VI.warn} onNavigate={navigate} />
            )}
            {mine.length > 0 && (
              <PatientGroup label="我管的" patients={mine} color={VI.bright} onNavigate={navigate} />
            )}
          </>
        )}
      </Section>

      {/* 快速操作：写交班 / 下医嘱 / 开检查（单手大按钮） */}
      <Section title="快速操作">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {view.quickActions.map((a) => (
            <button
              key={a.key}
              data-testid={`m-quick-${a.key}`}
              type="button"
              onClick={() => navigate(a.target)}
              style={{
                background: `linear-gradient(160deg, ${VI.deepSea2} 0%, ${VI.bright} 100%)`,
                border: 'none',
                borderRadius: 14,
                color: '#fff',
                padding: '16px 8px',
                minHeight: 96,
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 6 }}>{ICON_GLYPH[a.icon] ?? '🔹'}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{a.label}</div>
            </button>
          ))}
        </div>
      </Section>

      {/* 消息通知：危急值 / 会诊 / 审批 */}
      <Section title="消息通知">
        {view.notifications.filter((n) => n.preview).length === 0 ? (
          <div
            style={{
              background: '#fff',
              border: '1px solid ' + VI.line,
              borderRadius: 14,
              padding: '18px 14px',
              color: VI.textSub,
              fontSize: 15,
            }}
          >
            暂无危急值、会诊或审批消息
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {view.notifications
              .filter((n) => n.preview)
              .map((n) => (
                <button
                  key={n.key}
                  data-testid={`m-notice-${n.key}`}
                  type="button"
                  onClick={() => navigate(n.actionTarget)}
                  style={{
                    background: '#fff',
                    border: '1px solid ' + VI.line,
                    borderLeft: `4px solid ${LEVEL_BAR[n.level] ?? VI.bright}`,
                    borderRadius: 12,
                    padding: '14px 14px',
                    minHeight: 64,
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 700, color: VI.textMain }}>
                    {n.title}
                    <span style={{ float: 'right', fontSize: 13, color: VI.textSub, fontWeight: 400 }}>
                      {n.time}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, color: VI.textSub, lineHeight: 1.4 }}>{n.preview}</div>
                </button>
              ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ------------------------------ 子组件 ------------------------------ */

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 17, fontWeight: 700, color: VI.textMain, margin: '4px 4px 10px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function PatientGroup({
  label,
  patients,
  color,
  onNavigate,
}: {
  label: string;
  patients: MobilePatient[];
  color: string;
  onNavigate: (t: string) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          fontSize: 13,
          color: VI.textSub,
          margin: '0 4px 6px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span style={{ width: 4, height: 14, background: color, borderRadius: 2, display: 'inline-block' }} />
        {label} · {patients.length} 人
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {patients.map((p) => (
          <button
            key={p.visitId}
            type="button"
            onClick={() => onNavigate(`/m/patients/${p.visitId}`)}
            style={{
              background: '#fff',
              border: '1px solid ' + VI.line,
              borderRadius: 12,
              padding: '12px 14px',
              minHeight: 56,
              textAlign: 'left',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  minWidth: 44,
                  height: 24,
                  borderRadius: 6,
                  background: VI.bgSoft,
                  color: VI.textMain,
                  fontSize: 14,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 6px',
                }}
              >
                {p.bedNo}
              </span>
              <span style={{ fontSize: 16, fontWeight: 600, color: VI.textMain }}>{p.nameMasked}</span>
              {p.hint && (
                <span style={{ fontSize: 13, color: VI.textSub }}>{p.hint}</span>
              )}
            </div>
            {p.acuity >= 4 && (
              <span style={{ fontSize: 13, color: VI.danger, fontWeight: 700 }}>重</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
