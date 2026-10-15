/**
 * 健澜科技 jlmedaios - 急诊分诊智能助手右侧面板（M121-A，依据宪法第七章 Doctor MUSE）
 *
 * 急诊分诊台 / 急诊医生工作站右侧轻量助手面板：
 *   分级校核建议 → 处置去向（分区/等待时限/绿色通道）→ 主诉相关既往史 → 相似病例经验。
 *
 * 依据宪法第七章（Doctor MUSE）：
 *   - 面板为「分级校核与经验提示」，最终分级与处置决策由分诊护士 / 急诊医生确认；
 *   - 患者姓名等标识由后端聚合器脱敏后下发，前端不再加工明文；
 *   - 面板窄幅固定于右侧、低饱和阴影，不抢占分诊主流程焦点。
 *
 * 三态完备：loading（骨架屏）/ error（告警 + 重试）/ empty（未选患者引导）。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Skeleton, Tag, Typography } from 'antd';
import { get } from '@/api/client';

const { Text } = Typography;

/* ------------------------- 与 BFF 聚合器对齐的类型 ------------------------- */

type EmergencyTriageLevel = 1 | 2 | 3 | 4 | 5;

interface HistoryItem {
  date: string;
  dept: string;
  diagnosis: string;
  outcome: string | null;
  related: boolean;
}

interface SimilarCaseItem {
  caseId: string;
  title: string;
  diagnosis: string;
  suggestion: string;
  score: number;
}

interface LevelSuggestion {
  assignedLevel: EmergencyTriageLevel;
  suggestedLevel: EmergencyTriageLevel;
  action: 'upgrade' | 'maintain';
  reasons: string[];
  text: string;
}

interface Disposition {
  level: EmergencyTriageLevel;
  zone: string;
  waitMinutes: number;
  greenChannel: boolean;
  label: string;
  note: string;
}

interface EmergencyTriageAssistantView {
  history: HistoryItem[];
  similarCases: SimilarCaseItem[];
  levelSuggestion: LevelSuggestion;
  disposition: Disposition;
  demo?: boolean;
  updatedAt?: string;
}

/** 分级建议 → antd Alert type 映射（依据宪法第七章：上调建议置顶红警） */
const suggestionAlertType: Record<LevelSuggestion['action'], 'error' | 'success'> = {
  upgrade: 'error',
  maintain: 'success',
};

interface EmergencyAssistantPanelProps {
  /** 本次就诊患者 ID；缺省时取 URL query 的 patientId */
  patientId?: string;
  /** 分诊台已给定级别（1-5），缺省取 URL query 的 level */
  level?: EmergencyTriageLevel;
}

/** 从 URL query 兜底读取 patientId / level */
function readQuery(): { patientId: string; level: string } {
  if (typeof window === 'undefined') return { patientId: '', level: '3' };
  const q = new URLSearchParams(window.location.search);
  return {
    patientId: q.get('patientId')?.trim() ?? '',
    level: q.get('level')?.trim() || '3',
  };
}

/**
 * EmergencyAssistantPanel：急诊分诊台右侧智能助手面板。
 * 依据宪法第七章：只做分级校核与经验提示，所有临床结论由医生本人确认。
 */
export default function EmergencyAssistantPanel(props: EmergencyAssistantPanelProps = {}) {
  const fallback = readQuery();
  const patientId = props.patientId?.trim() || fallback.patientId;
  const level = props.level ?? (Number(fallback.level) as EmergencyTriageLevel);

  const [data, setData] = useState<EmergencyTriageAssistantView | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const view = await get<EmergencyTriageAssistantView>('/api/v1/assistant/emergency', {
        patientId,
        level: String(level),
      });
      setData(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : '智能助手加载失败');
    } finally {
      setLoading(false);
    }
  }, [patientId, level]);

  useEffect(() => {
    void load();
  }, [load]);

  const suggestion = data?.levelSuggestion;
  const disposition = data?.disposition;

  return (
    <aside
      aria-label="急诊分诊智能助手"
      style={{
        position: 'fixed',
        top: 'var(--jl-header-height, 56px)',
        right: 0,
        bottom: 0,
        width: 360,
        maxWidth: '40vw',
        background: '#fff',
        borderLeft: '1px solid var(--jl-border, #e8ecf1)',
        boxShadow: '-4px 0 16px rgba(10, 77, 140, 0.08)',
        overflowY: 'auto',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 面板头：深海蓝 VI（--jl-primary #0a4d8c） */}
      <div
        style={{
          background: 'var(--jl-primary, #0a4d8c)',
          color: '#fff',
          padding: '12px 16px',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Text strong style={{ color: '#fff', fontSize: 15 }}>急诊分诊助手</Text>
        <div><Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Doctor MUSE · 分级校核提示（依据宪法第七章）</Text></div>
      </div>

      <div style={{ padding: 12 }}>
        {/* empty 态：未选择就诊患者 */}
        {!patientId && (
          <Empty
            description="未选择就诊患者，请先在急诊分诊列表中选中一位患者"
            style={{ marginTop: 48 }}
          />
        )}

        {/* loading 态 */}
        {patientId && loading && <Skeleton active paragraph={{ rows: 6 }} />}

        {/* error 态 */}
        {patientId && !loading && error && (
          <Alert
            type="error"
            showIcon
            message="智能助手加载失败"
            description={error}
            action={<Button size="small" danger onClick={() => void load()}>重试</Button>}
          />
        )}

        {/* 内容态 */}
        {patientId && !loading && !error && data && (
          <>
            {/* ① 分级校核建议（上调建议置顶红警） */}
            {suggestion && (
              <Alert
                type={suggestionAlertType[suggestion.action]}
                showIcon
                style={{ marginBottom: 8 }}
                message={suggestion.text}
                description={
                  suggestion.reasons.length > 0 ? (
                    <ul style={{ margin: '4px 0 0', paddingLeft: 16, fontSize: 12 }}>
                      {suggestion.reasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  ) : undefined
                }
              />
            )}

            {/* ② 处置去向 */}
            {disposition && (
              <div
                style={{
                  border: '1px solid var(--jl-border, #e8ecf1)',
                  borderRadius: 6,
                  padding: 8,
                  marginBottom: 12,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>处置去向</Text>
                  {disposition.greenChannel ? (
                    <Tag color="red">绿色通道</Tag>
                  ) : (
                    <Tag color="default">常规通道</Tag>
                  )}
                </div>
                <div style={{ marginTop: 4, fontSize: 13 }}>{disposition.label}</div>
                <div style={{ fontSize: 12 }}>{disposition.note}</div>
              </div>
            )}

            {/* ③ 主诉相关既往史（后端已把相关条目置顶） */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>既往史匹配</Text>
              {data.history.length === 0 && (
                <div><Text type="secondary" style={{ fontSize: 12 }}>暂无既往就诊记录</Text></div>
              )}
              {data.history.map((h, i) => (
                <div
                  key={`${h.date}-${i}`}
                  style={{
                    border: '1px solid var(--jl-border, #e8ecf1)',
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 13 }}>{h.diagnosis}</Text>
                    {h.related && <Tag color="orange">本次相关</Tag>}
                  </div>
                  <div style={{ fontSize: 12 }}>
                    <Text type="secondary">{h.date} {h.dept}</Text>
                    {h.outcome ? <Text type="secondary"> · {h.outcome}</Text> : null}
                  </div>
                </div>
              ))}
            </div>

            {/* ④ 相似病例经验推荐（后端已按匹配分降序） */}
            <div>
              <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>相似病例经验</Text>
              {data.similarCases.length === 0 && (
                <div><Text type="secondary" style={{ fontSize: 12 }}>暂无相似病例经验</Text></div>
              )}
              {data.similarCases.map((exp) => (
                <div
                  key={exp.caseId}
                  style={{
                    border: '1px solid var(--jl-border, #e8ecf1)',
                    borderRadius: 6,
                    padding: 8,
                    marginTop: 6,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 13 }}>{exp.title}</Text>
                    <Tag color="geekblue">匹配 {exp.score}</Tag>
                  </div>
                  <div><Text type="secondary" style={{ fontSize: 12 }}>{exp.diagnosis}</Text></div>
                  <div style={{ fontSize: 12 }}>{exp.suggestion}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
