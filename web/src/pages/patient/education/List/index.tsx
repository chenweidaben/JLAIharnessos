/**
 * 健澜科技 jlmedaios - M147-B 患者健康科普页（知识图谱与患者教育）
 *
 * 依据宪法第四十五条：患者有权获得通俗易懂的健康知识。
 * 本页用大白话卡片展示——疾病是怎么回事、回家怎么吃怎么动、药怎么吃、
 * 什么时候再来、出现哪些信号必须马上去医院。
 *
 * 视觉：深海蓝 VI（主色 #0b4f8a），患者端大字易读，三态（loading/error/empty）。
 * 医疗安全：红旗症状卡片强制红色警示，引导急诊 / 120，不做安慰性表达。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

/** 与后端 EducationView 对齐 */
interface MaterialRow {
  id: string | number;
  disease: string;
  category: string;
  title: string;
  content: string;
  isRead: boolean;
  pushedAt: string;
}

interface ReadStats {
  total: number;
  read: number;
  unread: number;
  readRate: number;
}

interface EducationView {
  patientId: string;
  disease: string;
  diseaseLabel: string;
  source: 'db' | 'generated';
  list: MaterialRow[];
  stats: ReadStats;
}

/** 可选疾病（与后端疾病知识库对齐） */
const DISEASE_OPTIONS: { code: string; label: string }[] = [
  { code: 'hypertension', label: '高血压' },
  { code: 'diabetes', label: '糖尿病' },
  { code: 'chd', label: '冠心病' },
  { code: 'asthma', label: '哮喘' },
  { code: 'general', label: '慢病通用' },
];

/** 深海蓝 VI */
const VI = {
  primary: '#0b4f8a',
  primarySoft: '#eaf3fb',
  danger: '#c62828',
  dangerSoft: '#fdecea',
  text: '#222',
  sub: '#888',
};

/** 从 URL 取 patientId，缺省 demo 号 */
function usePatientId(): string {
  return useMemo(() => {
    const url = new URL(window.location.href);
    return url.searchParams.get('patientId') || 'P-DEMO';
  }, []);
}

/** 单张科普卡片：红旗症状红色警示，其余深海蓝 */
function EducationCard({ row }: { row: MaterialRow }) {
  const isRed = row.category === 'redflags';
  const color = isRed ? VI.danger : VI.primary;
  const bg = isRed ? VI.dangerSoft : VI.primarySoft;
  return (
    <div
      style={{
        background: bg,
        borderLeft: `6px solid ${color}`,
        borderRadius: 10,
        padding: '16px 18px',
        marginBottom: 12,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span
          style={{
            fontSize: 13,
            color,
            background: '#fff',
            border: `1px solid ${color}`,
            borderRadius: 999,
            padding: '2px 10px',
          }}
        >
          {row.category === 'basics' && '疾病基础知识'}
          {row.category === 'diet' && '饮食注意'}
          {row.category === 'exercise' && '运动建议'}
          {row.category === 'medication' && '用药指导'}
          {row.category === 'followup' && '何时复诊'}
          {row.category === 'redflags' && '红旗症状 · 立即就医'}
        </span>
        {row.isRead && <span style={{ fontSize: 13, color: VI.sub }}>已读</span>}
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color, marginTop: 10 }}>{row.title}</div>
      <div style={{ fontSize: 17, color: VI.text, marginTop: 8, lineHeight: 1.7 }}>
        {row.content}
      </div>
      <div style={{ fontSize: 13, color: VI.sub, marginTop: 8 }}>
        {new Date(row.pushedAt).toLocaleString('zh-CN', { hour12: false })}
      </div>
    </div>
  );
}

export default function PatientEducationListPage() {
  const patientId = usePatientId();
  const [disease, setDisease] = useState<string>('hypertension');
  const [data, setData] = useState<EducationView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pushing, setPushing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/patient/education?patientId=${encodeURIComponent(patientId)}`,
      );
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '加载失败');
      setData(json.data as EducationView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    load();
  }, [load]);

  /** 为当前选中疾病推送六张科普卡片 */
  const push = useCallback(async () => {
    setPushing(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/patient/education/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId, disease }),
      });
      const json = await res.json();
      if (json?.code !== 0) throw new Error(json?.message || '推送失败');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : '推送失败，请稍后重试');
    } finally {
      setPushing(false);
    }
  }, [patientId, disease, load]);

  if (loading) {
    return <div style={{ padding: 32, fontSize: 20, color: VI.sub }}>加载中，请稍候…</div>;
  }

  if (error) {
    return (
      <div style={{ padding: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 20, color: VI.danger }}>{error}</div>
        <button
          onClick={load}
          style={{ marginTop: 16, fontSize: 18, padding: '10px 28px', borderRadius: 8 }}
        >
          重新加载
        </button>
      </div>
    );
  }

  const stats = data?.stats ?? { total: 0, read: 0, unread: 0, readRate: 0 };

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 26, marginBottom: 4, color: VI.primary }}>我的健康科普</h2>
      <div style={{ fontSize: 15, color: VI.sub, marginBottom: 16 }}>
        大白话讲清楚：这病是咋回事、回家怎么吃怎么动、药怎么吃、什么时候再来、啥信号要立刻上医院
      </div>

      {/* 已读进度条（深海蓝） */}
      <div
        style={{
          background: VI.primarySoft,
          borderRadius: 10,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 15, color: VI.primary }}>
          已读 {stats.read} / {stats.total} 条 · 读完率 {(stats.readRate * 100).toFixed(0)}%
        </div>
        <div
          style={{
            marginTop: 8,
            height: 8,
            background: '#fff',
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${stats.readRate * 100}%`,
              height: '100%',
              background: VI.primary,
            }}
          />
        </div>
      </div>

      {/* 疾病选择 + 推送按钮 */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {DISEASE_OPTIONS.map((d) => (
          <button
            key={d.code}
            onClick={() => setDisease(d.code)}
            style={{
              fontSize: 15,
              padding: '6px 14px',
              borderRadius: 999,
              border: `1px solid ${disease === d.code ? VI.primary : '#ccc'}`,
              background: disease === d.code ? VI.primary : '#fff',
              color: disease === d.code ? '#fff' : VI.text,
              cursor: 'pointer',
            }}
          >
            {d.label}
          </button>
        ))}
        <button
          onClick={push}
          disabled={pushing}
          style={{
            fontSize: 15,
            padding: '6px 18px',
            borderRadius: 999,
            border: 'none',
            background: pushing ? '#9bb8d1' : VI.primary,
            color: '#fff',
            cursor: pushing ? 'not-allowed' : 'pointer',
          }}
        >
          {pushing ? '推送中…' : `推送「${DISEASE_OPTIONS.find((d) => d.code === disease)?.label}」科普`}
        </button>
      </div>

      {/* 卡片列表 */}
      {(data?.list.length ?? 0) === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: VI.sub }}>
          <div style={{ fontSize: 22 }}>还没有科普材料</div>
          <div style={{ fontSize: 16, marginTop: 8 }}>
            点上面的「推送科普」按钮，为自己生成一份大白话健康指南
          </div>
        </div>
      ) : (
        data?.list.map((row) => <EducationCard key={row.id} row={row} />)
      )}

      <div style={{ fontSize: 13, color: VI.sub, marginTop: 16 }}>
        以上内容为健康科普，不能代替医生看病；身体有变化，请及时联系您的主治医生。
        Copyright © 2026 杭州健澜科技有限公司
      </div>
    </div>
  );
}
