/**
 * 健澜科技 jlmedaios - 门诊医生智能助手右侧面板（依据宪法第七章 Doctor MUSE 医生个人智能体）
 *
 * 门诊医生工作站右侧轻量助手面板：
 *   顶部医疗安全预警 → 患者摘要 → 本科室相似病例经验推荐 → 科室隶属路径。
 *
 * 依据宪法第七章（Doctor MUSE）：
 *   - 面板为「经验提示」，不替代医生诊断与处方决策权；
 *   - 患者姓名等标识由后端聚合器脱敏后下发，前端不再加工明文；
 *   - 面板窄幅固定于右侧、低饱和阴影，不抢占开诊主流程焦点。
 *
 * 三态完备：loading（骨架屏）/ error（告警 + 重试）/ empty（未选患者引导）。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Empty, Skeleton, Tag, Typography } from 'antd';
import { get } from '@/api/client';

const { Text } = Typography;

/* ------------------------- 与 BFF 聚合器对齐的类型 ------------------------- */

interface PatientSummary {
  name: string;
  ageText: string;
  gender: string;
  chronicTags: string[];
  lastVisit: string | null;
  hasAllergy: boolean;
}

interface DoctorExperienceItem {
  caseId: string;
  title: string;
  diagnosis: string;
  suggestion: string;
  score: number;
}

interface DeptPath {
  deptCode: string;
  deptName: string;
  ancestors: string[];
  pathText: string;
}

interface AssistantWarning {
  level: 'critical' | 'high' | 'info';
  type: string;
  message: string;
}

interface AssistantOutpatientView {
  patientSummary: PatientSummary;
  doctorExperience: DoctorExperienceItem[];
  deptPath: DeptPath;
  warnings: AssistantWarning[];
  demo?: boolean;
  updatedAt?: string;
}

/** 预警级别 → antd Alert type 映射（依据宪法第七章：危急值置顶红警） */
const warningType: Record<AssistantWarning['level'], 'error' | 'warning' | 'info'> = {
  critical: 'error',
  high: 'warning',
  info: 'info',
};

interface OutpatientAssistantPanelProps {
  /** 本次就诊患者 ID；缺省时取 URL query 的 patientId */
  patientId?: string;
  /** 出诊科室编码，透传后端聚合 */
  deptCode?: string;
}

/** 从 URL query 兜底读取 patientId */
function readPatientIdFromQuery(): string {
  if (typeof window === 'undefined') return '';
  return new URLSearchParams(window.location.search).get('patientId')?.trim() ?? '';
}

/**
 * OutpatientAssistantPanel：门诊医生右侧智能助手面板。
 * 依据宪法第七章：只做提示与摘要聚合，所有临床结论由医生本人确认。
 */
export default function OutpatientAssistantPanel(props: OutpatientAssistantPanelProps = {}) {
  const patientId = props.patientId?.trim() || readPatientIdFromQuery();
  const deptCode = props.deptCode;

  const [data, setData] = useState<AssistantOutpatientView | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const view = await get<AssistantOutpatientView>('/api/v1/assistant/outpatient', {
        patientId,
        ...(deptCode ? { deptCode } : {}),
      });
      setData(view);
    } catch (err) {
      setError(err instanceof Error ? err.message : '智能助手加载失败');
    } finally {
      setLoading(false);
    }
  }, [patientId, deptCode]);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = data?.patientSummary;

  return (
    <aside
      aria-label="门诊医生智能助手"
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
        <Text strong style={{ color: '#fff', fontSize: 15 }}>智能助手</Text>
        <div><Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>Doctor MUSE · 门诊上下文提示（依据宪法第七章）</Text></div>
      </div>

      <div style={{ padding: 12 }}>
        {/* empty 态：未选择就诊患者 */}
        {!patientId && (
          <Empty
            description="未选择就诊患者，请先在门诊列表中选中一位患者"
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
            {/* ① 安全预警（危急值置顶） */}
            {data.warnings.map((w, i) => (
              <Alert
                key={`${w.type}-${i}`}
                type={warningType[w.level]}
                showIcon
                style={{ marginBottom: 8 }}
                message={w.message}
              />
            ))}

            {/* ② 患者摘要（姓名已脱敏） */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>患者摘要</Text>
              <div style={{ marginTop: 4 }}>
                <Text strong>{summary?.name ?? '待确认患者'}</Text>
                <Text type="secondary">　{summary?.gender} · {summary?.ageText}</Text>
              </div>
              <div style={{ marginTop: 4 }}>
                {(summary?.chronicTags ?? []).map((t) => (
                  <Tag key={t} color="blue" style={{ marginBottom: 4 }}>{t}</Tag>
                ))}
              </div>
              {summary?.lastVisit && (
                <Text type="secondary" style={{ fontSize: 12 }}>最近就诊：{summary.lastVisit}</Text>
              )}
            </div>

            {/* ③ 相似病例经验推荐（后端已按匹配分降序） */}
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>经验推荐</Text>
              {data.doctorExperience.length === 0 && (
                <div><Text type="secondary" style={{ fontSize: 12 }}>暂无本科室相似病例经验</Text></div>
              )}
              {data.doctorExperience.map((exp) => (
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

            {/* ④ 科室路径 */}
            <div>
              <Text strong style={{ color: 'var(--jl-primary, #0a4d8c)' }}>科室路径</Text>
              <div style={{ marginTop: 4 }}>
                <Text style={{ fontSize: 12 }}>{data.deptPath.pathText}</Text>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
