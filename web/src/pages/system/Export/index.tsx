/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理 - 数据导出中心
 * 质控报表 / DRG 结算 / 科室 KPI 三类 CSV 一键导出（深海蓝 VI）。
 * 导出接口返回 text/csv（非统一 JSON 信封），故不走 api/client，
 * 自行带 Authorization 头 fetch 后以 Blob 触发浏览器下载。
 */
import { useState } from 'react';
import { API_BASE_URL } from '@/config';
import { tokenStorage } from '@/utils/auth';

interface ExportItem {
  key: string;
  title: string;
  desc: string;
  /** 相对 baseURL 的路径（base 已含 /api/v1） */
  path: string;
  filename: string;
}

const EXPORTS: ExportItem[] = [
  {
    key: 'qc',
    title: '质控报表',
    desc: '全院病历质控单明细：得分、缺陷数、整改状态与建议（最近 500 单）',
    path: '/export/qc.csv',
    filename: '质控报表.csv',
  },
  {
    key: 'drg',
    title: 'DRG 结算报表',
    desc: 'DRG 分组结算明细：病组、权重、预估付费、实际费用与结余',
    path: '/export/drg.csv',
    filename: 'DRG结算报表.csv',
  },
  {
    key: 'kpi',
    title: '科室 KPI 报表',
    desc: '本科室当日运营指标：床位周转率、平均住院日、次均费用、甲级病历率',
    path: '/export/dept-kpi.csv',
    filename: '科室KPI报表.csv',
  },
];

const VI = {
  primary: '#0a4d8c',
  primaryDark: '#073a6b',
  primaryLight: '#1a6bb8',
  hover: '#1E5F8C',
  bg: '#f4f7fb',
} as const;

export default function ExportCenterPage() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function download(item: ExportItem) {
    setBusy(item.key);
    setError(null);
    try {
      const base = API_BASE_URL.replace(/\/$/, '');
      const token = tokenStorage.getAccessToken();
      const res = await fetch(`${base}${item.path}`, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.status === 401) {
        setError('登录已失效，请重新登录后再导出');
        return;
      }
      if (!res.ok) {
        setError(`导出失败（HTTP ${res.status}），请确认是否具备 ${item.title} 查看权限`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = item.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('网络异常，导出失败，请稍后重试');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ padding: 24, background: VI.bg, minHeight: '100%' }}>
      <div style={{ borderLeft: `4px solid ${VI.primary}`, paddingLeft: 12, marginBottom: 20 }}>
        <h2 style={{ margin: 0, color: VI.primaryDark, fontSize: 20 }}>数据导出中心</h2>
        <p style={{ margin: '6px 0 0', color: '#5a6b7b', fontSize: 13 }}>
          一键导出质控、DRG 结算与科室 KPI 报表（UTF-8 CSV，Excel 可直接打开）
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {EXPORTS.map((item) => (
          <div
            key={item.key}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: 20,
              boxShadow: '0 2px 8px rgba(10,77,140,0.08)',
              borderTop: `3px solid ${VI.primary}`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 8px', color: VI.primaryDark, fontSize: 16 }}>{item.title}</h3>
              <p style={{ margin: '0 0 16px', color: '#6b7c8d', fontSize: 13, lineHeight: 1.6 }}>
                {item.desc}
              </p>
            </div>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => download(item)}
              style={{
                alignSelf: 'flex-start',
                background: busy === item.key ? VI.hover : VI.primary,
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '8px 18px',
                fontSize: 13,
                cursor: busy === null ? 'pointer' : 'not-allowed',
                opacity: busy !== null && busy !== item.key ? 0.6 : 1,
              }}
            >
              {busy === item.key ? '导出中…' : '下载 CSV'}
            </button>
          </div>
        ))}
      </div>

      {error && (
        <div
          style={{
            marginTop: 20,
            padding: '10px 14px',
            background: '#fdecec',
            color: '#b42318',
            borderRadius: 6,
            fontSize: 13,
          }}
        >
          {error}
        </div>
      )}

      <p style={{ marginTop: 24, color: '#9aa8b6', fontSize: 12 }}>
        导出需具备对应模块查看权限；文件由服务端按权限范围生成，不含越权数据。
      </p>
    </div>
  );
}
