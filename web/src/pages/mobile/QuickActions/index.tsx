/**
 * 健澜科技 jlmedaios - 医生移动端快捷操作首页（M128-B）
 *
 * 大按钮快捷操作：按登录角色（医生/护士/药师）从 BFF 拉取已鉴权的操作列表，
 * 深海蓝 VI 大宫格渲染，点击直达对应移动业务页。
 *
 * 移动端+性能优化：
 *  - 列表为小体量静态目录，组件内按角色缓存，不重复请求；
 *  - 纯展示型大按钮，使用 CSS Grid 等宽排布，避免重排抖动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empty, Spin } from 'antd';
import { get } from '@/services/request';

/** 与 BFF buildMobileQuickActions 输出对齐。 */
interface QuickAction {
  key: string;
  label: string;
  desc: string;
  icon: string;
  target: string;
  perm?: string;
}

interface QuickActionsView {
  role: string;
  actions: QuickAction[];
}

/** 深海蓝 VI 色板（与品牌主色一致）。 */
const VI = {
  deepSea: '#0A2540',
  deepSea2: '#123C6E',
  bright: '#2E7DD1',
  bgSoft: '#EAF2FA',
  textMain: '#0A2540',
  textSub: '#5B7290',
} as const;

/** 图标键 → 字符映射（移动端轻量，不引入图标库依赖）。 */
const ICON_GLYPH: Record<string, string> = {
  'calendar-check': '📅',
  'file-done': '📋',
  audit: '✅',
  edit: '✏️',
  swap: '🔄',
  warning: '⚠️',
  care: '🩺',
  shield: '🛡️',
};

const ROLE_LABEL: Record<string, string> = {
  doctor: '医生工作台',
  nurse: '护士工作台',
  pharmacist: '药师工作台',
};

export default function MobileQuickActions() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<QuickActionsView>({ role: '', actions: [] });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // baseURL 已带 /api/v1，此处只传业务路径
      const data = await get<QuickActionsView>('/mobile/quick-actions');
      setView(data);
    } catch {
      // request 层已统一 toast，此处仅落空态
      setView({ role: '', actions: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ padding: 16, background: '#F4F8FC', minHeight: '100%' }}>
      {/* 深海蓝头图 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deepSea} 0%, ${VI.deepSea2} 100%)`,
          borderRadius: 16,
          padding: '20px 18px',
          color: '#fff',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 700 }}>快捷操作</div>
        <div style={{ fontSize: 13, opacity: 0.85, marginTop: 6 }}>
          {view.role ? ROLE_LABEL[view.role] ?? '医护工作台' : '工作台'} · 常用功能一键直达
        </div>
      </div>

      {view.actions.length === 0 ? (
        <Empty description="当前角色暂无可快捷操作项" style={{ marginTop: 60 }} />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {view.actions.map((a) => (
            <button
              key={a.key}
              data-testid={`m-quick-action-${a.key}`}
              type="button"
              onClick={() => navigate(a.target)}
              style={{
                background: '#fff',
                border: '1px solid #E1EBF5',
                borderRadius: 14,
                padding: '18px 14px',
                textAlign: 'left',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(10,37,64,0.06)',
                minHeight: 128,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: VI.bgSoft,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  marginBottom: 10,
                }}
              >
                {ICON_GLYPH[a.icon] ?? '🔹'}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: VI.textMain }}>{a.label}</div>
              <div
                style={{
                  fontSize: 12,
                  color: VI.textSub,
                  marginTop: 4,
                  lineHeight: 1.4,
                }}
              >
                {a.desc}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
