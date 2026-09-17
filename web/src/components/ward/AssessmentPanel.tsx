/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 病情评估组件 - 疼痛/营养/压疮/跌倒/DVT/GCS 多量表评估
 */
import { useMemo, useState } from 'react';
import { Button, Card, Empty, Slider, Statistic, Tag, Timeline, message } from 'antd';
import { PlusOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import type { AssessmentRecord, AssessmentType } from '@/types/ward';

interface AssessmentPanelProps {
  records: AssessmentRecord[];
  onAdd: (record: AssessmentRecord) => void;
}

const typeMeta: Record<AssessmentType, { label: string; unit: string; max: number; desc: string }> =
  {
    pain: { label: '疼痛评估 (NRS)', unit: '分', max: 10, desc: '0无痛，10最剧烈' },
    nutrition: { label: '营养风险筛查 (NRS2002)', unit: '分', max: 7, desc: '≥3分提示营养风险' },
    pressure_ulcer: {
      label: '压疮风险 (Braden)',
      unit: '分',
      max: 23,
      desc: '≤18分有风险，≤9分极高危',
    },
    fall_risk: { label: '跌倒风险 (Morse)', unit: '分', max: 125, desc: '≥45分高风险' },
    dvt: { label: '血栓风险 (Caprini)', unit: '分', max: 20, desc: '≥5分极高危' },
    gcs: { label: '意识评估 (GCS)', unit: '分', max: 15, desc: '3-15分，越低越重' },
  };

const riskColor: Record<AssessmentRecord['riskLevel'], string> = {
  none: '#52C41A',
  low: '#1890FF',
  medium: '#FAAD14',
  high: '#FA8C16',
  extreme: '#F5222D',
};

export default function AssessmentPanel({ records, onAdd }: AssessmentPanelProps) {
  const [activeType, setActiveType] = useState<AssessmentType>('pain');
  const [score, setScore] = useState(5);

  const typeRecords = useMemo(
    () => records.filter((r) => r.type === activeType),
    [records, activeType],
  );
  const current = typeRecords[0];
  const meta = typeMeta[activeType];

  const doAssess = () => {
    const rec: AssessmentRecord = {
      id: `AS-NEW-${Date.now()}`,
      patientId: records[0]?.patientId ?? 'P000',
      type: activeType,
      assessTime: new Date().toLocaleString('zh-CN', { hour12: false }),
      assessor: '刘护士',
      conclusion: `本次${meta.label}评分 ${score}${meta.unit}`,
      riskLevel: score >= meta.max * 0.7 ? 'high' : score >= meta.max * 0.4 ? 'medium' : 'low',
      suggestions: ['密切观察', '记录护理单'],
      pain:
        activeType === 'pain'
          ? { score, location: '心前区', nature: '胀痛', analgesia: '暂未用药' }
          : undefined,
      nutrition:
        activeType === 'nutrition'
          ? { score, bmi: 20, weightLossPct: 5, intakePct: 60, severityScore: 1 }
          : undefined,
      pressureUlcer:
        activeType === 'pressure_ulcer'
          ? {
              score,
              perception: 3,
              moisture: 3,
              activity: 2,
              mobility: 2,
              nutrition: 3,
              friction: 2,
            }
          : undefined,
      fall:
        activeType === 'fall_risk'
          ? {
              score,
              fallHistory: 25,
              diagnosis: 0,
              ambulationAid: 0,
              ivTherapy: 0,
              gait: 0,
              cognition: 0,
            }
          : undefined,
      dvt: activeType === 'dvt' ? { score, factors: ['卧床'] } : undefined,
      gcs: activeType === 'gcs' ? { total: score, eye: 4, verbal: 5, motor: 6 } : undefined,
    };
    onAdd(rec);
    message.success(`${meta.label}已记录`);
  };

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center gap-2 border-b border-ink-border p-3">
        <SafetyCertificateOutlined className="text-jl-primary" />
        <span className="font-semibold text-ink-primary">病情动态评估</span>
      </div>
      <div className="p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {(Object.keys(typeMeta) as AssessmentType[]).map((t) => (
            <Button
              key={t}
              size="small"
              type={activeType === t ? 'primary' : 'default'}
              onClick={() => setActiveType(t)}
            >
              {typeMeta[t].label.split(' ')[0]}
            </Button>
          ))}
        </div>

        <Card size="small" title={`${meta.label}（${meta.desc}）`} className="mb-3">
          {current ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Statistic
                title="最新评分"
                value={current.conclusion.match(/\d+/)?.[0] ?? '--'}
                suffix={meta.unit}
              />
              <Statistic
                title="风险等级"
                value={
                  { none: '无', low: '低', medium: '中', high: '高', extreme: '极高' }[
                    current.riskLevel
                  ]
                }
                valueStyle={{ color: riskColor[current.riskLevel] }}
              />
              <Statistic title="评估时间" value={current.assessTime} />
              <div>
                <div className="text-xs text-ink-secondary">护理建议</div>
                {current.suggestions.map((s, i) => (
                  <Tag key={i} color="blue" className="mt-1">
                    {s}
                  </Tag>
                ))}
              </div>
            </div>
          ) : (
            <Empty description="暂无记录" />
          )}

          <div className="mt-4">
            <div className="mb-1 text-xs text-ink-secondary">
              快速复评：拖动滑块评分（当前 {score} 分）
            </div>
            <Slider
              min={0}
              max={meta.max}
              value={score}
              onChange={setScore}
              marks={{ 0: '0', [meta.max]: String(meta.max) }}
            />
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={doAssess}>
              记录本次评估
            </Button>
          </div>
        </Card>

        {/* 历史记录 */}
        <div>
          <div className="mb-2 text-xs font-semibold text-ink-secondary">历史评估趋势</div>
          {typeRecords.length === 0 ? (
            <Empty description="暂无历史记录" />
          ) : (
            <Timeline
              items={typeRecords.map((r) => ({
                color: riskColor[r.riskLevel],
                children: (
                  <div className="text-sm">
                    <span className="font-medium">{r.conclusion}</span>
                    <div className="text-xs text-ink-secondary">
                      {r.assessTime} · {r.assessor}
                    </div>
                  </div>
                ),
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
}
