/**
 * 健澜科技 jlmedaios - 多语言支持框架 · 语言切换器（M151-C）
 *
 * 顶部右侧的语言切换按钮：
 *   - 在 中文(zh-CN) / English(en-US) 之间切换；
 *   - 切换后从 GET /api/v1/i18n?locale=xxx 拉取整包文案，
 *     持久化到 localStorage，并广播 window 事件 jl:locale-change，
 *     供应用内其它组件响应；
 *   - 不写死文案：语言列表由接口 supportedLocales 驱动，可扩展新语言。
 *
 * 深海蓝 VI：主色 #0B2A4A（深海蓝），悬停 #123E6B，文字 #E8F0FA。
 * 注释标注「质量补齐与新场景」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'jl.locale';
const EVENT_NAME = 'jl:locale-change';

/** 深海蓝 VI 色板（质量补齐与新场景） */
const VI = {
  deepSea: '#0B2A4A',
  deepSeaHover: '#123E6B',
  text: '#E8F0FA',
  border: 'rgba(232,240,250,0.35)',
} as const;

interface LocaleOption {
  value: string;
  label: string;
}

/** 兜底语言选项（接口未返回时使用；正常以接口 supportedLocales 为准） */
const FALLBACK_OPTIONS: LocaleOption[] = [
  { value: 'zh-CN', label: '中文' },
  { value: 'en-US', label: 'English' },
];

function readInitialLocale(): string {
  if (typeof window === 'undefined') return 'zh-CN';
  return window.localStorage.getItem(STORAGE_KEY) || 'zh-CN';
}

export const LanguageSwitcher: React.FC = () => {
  const [locale, setLocale] = useState<string>(readInitialLocale);
  const [options, setOptions] = useState<LocaleOption[]>(FALLBACK_OPTIONS);
  const [open, setOpen] = useState<boolean>(false);

  // 首次挂载：拉取支持的语言列表（可扩展，不写死）
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/v1/i18n?locale=${encodeURIComponent(locale)}`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        const supported: string[] = json?.data?.supportedLocales ?? [];
        if (supported.length > 0) {
          setOptions(
            supported.map((v) => ({
              value: v,
              label: v === 'zh-CN' ? '中文' : v === 'en-US' ? 'English' : v,
            })),
          );
        }
      })
      .catch(() => {
        /* 接口不可用时回退到内置两种语言，不阻断页面 */
      });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const changeTo = (next: string) => {
    setLocale(next);
    setOpen(false);
    window.localStorage.setItem(STORAGE_KEY, next);
    // 广播语言变更，供应用内组件响应（质量补齐与新场景）
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { locale: next } }));
    // 拉取对应语言文案（切换即时生效）
    fetch(`/api/v1/i18n?locale=${encodeURIComponent(next)}`).catch(() => undefined);
  };

  const currentLabel =
    options.find((o) => o.value === locale)?.label ?? locale;

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        marginLeft: 12,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          background: VI.deepSea,
          color: VI.text,
          border: `1px solid ${VI.border}`,
          borderRadius: 6,
          padding: '4px 12px',
          fontSize: 13,
          cursor: 'pointer',
          lineHeight: '20px',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = VI.deepSeaHover)}
        onMouseLeave={(e) => (e.currentTarget.style.background = VI.deepSea)}
      >
        {currentLabel} ▾
      </button>

      {open && (
        <ul
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: 4,
            minWidth: 96,
            background: VI.deepSea,
            border: `1px solid ${VI.border}`,
            borderRadius: 6,
            listStyle: 'none',
            margin: 0,
            padding: '4px 0',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
          }}
        >
          {options.map((o) => (
            <li key={o.value}>
              <button
                type="button"
                role="option"
                aria-selected={o.value === locale}
                onClick={() => changeTo(o.value)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'transparent',
                  color: o.value === locale ? '#ffffff' : VI.text,
                  border: 'none',
                  padding: '6px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: o.value === locale ? 600 : 400,
                }}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LanguageSwitcher;
