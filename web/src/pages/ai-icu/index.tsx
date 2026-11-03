/**
 * 健澜AI原生医院操作系统OS - AI 重症监护台
 * ICU 床位总览（SOFA/脓毒症风险/呼吸机模式/AI建议）+ 单床生命体征趋势与 qSOFA/镇静 AI 建议 + AI 预警
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Modal, Progress, Row, Select, Spin, Statistic, Tag, message } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

type SepsisRisk = 'low' | 'medium' | 'high';

interface IcuBed {
  bedId: string;
  patientId: string;
  patientName: string;
  sofaScore: number;
  sepsisRisk: SepsisRisk;
  ventilatorMode: string;
  aiSuggestion: string;
  updatedAt: string;
}

interface TrendPoint {
  t: string;
  hr: number;
  bp: number;
  spo2: number;
  rr: number;
  temp: number;
}

interface SepsisFactor {
  factor: string;
  contribution: number;
  detail: string;
}

interface BedMonitor {
  bedId: string;
  provider?: string;
  stub?: boolean;
  message?: string;
  trends: TrendPoint[];
  sepsisScreen: { qsofa: number; lac: string; riskScore: number; suggestion: string } | null;
  sedation: { rass: number; aiAdvised: string } | null;
  explainability: { sepsisFactors: SepsisFactor[]; sedationBasis: string } | null;
}

interface AiAlert {
  alertId: string;
  level: 'info' | 'warning' | 'critical';
  message: string;
  suggestedAction: string;
  stub?: boolean;
  explain?: { reason: string; contributingFactors: string[] } | null;
}

const demoBeds: IcuBed[] = [
  { bedId: 'ICU-A-01', patientId: 'P-1001', patientName: '张**', sofaScore: 6, sepsisRisk: 'high', ventilatorMode: 'SIMV-PC', aiSuggestion: '脓毒症风险升高，建议复查乳酸并评估液体复苏', updatedAt: '2026-11-04 04:20' },
  { bedId: 'ICU-A-02', patientId: 'P-1002', patientName: '李**', sofaScore: 3, sepsisRisk: 'low', ventilatorMode: 'PSV', aiSuggestion: '生命体征平稳，维持现有镇静深度', updatedAt: '2026-11-04 04:21' },
  { bedId: 'ICU-B-01', patientId: 'P-1003', patientName: '王**', sofaScore: 8, sepsisRisk: 'high', ventilatorMode: 'A/C VC', aiSuggestion: 'SOFA 进行性升高，建议升级有创监测并复查感染指标', updatedAt: '2026-11-04 04:19' },
  { bedId: 'ICU-B-02', patientId: 'P-1004', patientName: '赵**', sofaScore: 2, sepsisRisk: 'low', ventilatorMode: 'CPAP', aiSuggestion: '脱机条件接近，可尝试 SBT 自主呼吸试验', updatedAt: '2026-11-04 04:22' },
  { bedId: 'ICU-C-01', patientId: 'P-1005', patientName: '刘**', sofaScore: 5, sepsisRisk: 'medium', ventilatorMode: 'BiPAP', aiSuggestion: 'RASS 偏浅，警惕躁动拔管风险，建议适度加深镇静', updatedAt: '2026-11-04 04:20' },
];

const riskTag: Record<SepsisRisk, { color: string; text: string }> = {
  low: { color: 'green', text: '脓毒症低危' },
  medium: { color: 'orange', text: '脓毒症中危' },
  high: { color: 'red', text: '脓毒症高危' },
};

const alertTag = {
  info: { color: 'blue', text: '信息' },
  warning: { color: 'orange', text: '警告' },
  critical: { color: 'red', text: '危急' },
} as const;

/** 手写 SVG 折线图 */
function MiniLine({ data, color, min, max, unit }: { data: number[]; color: string; min: number; max: number; unit: string }) {
  const w = 480;
  const h = 120;
  const pad = 6;
  const range = Math.max(max - min, 1);
  const pts = data.map((v, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = pad + (1 - (Math.min(Math.max(v, min), max) - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 120 }}>
      <polyline points={pts.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke={color} strokeWidth={2} />
      {data.length > 0 && (
        <text x={w - 4} y={14} textAnchor="end" fontSize={11} fill={color}>
          {unit}
        </text>
      )}
      <path d={path} fill="none" stroke="transparent" />
    </svg>
  );
}

function TrendChart({ label, data, color, min, max, unit }: { label: string; data: number[]; color: string; min: number; max: number; unit: string }) {
  return (
    <Card size="small" title={label} style={{ marginBottom: 12 }}>
      <MiniLine data={data} color={color} min={min} max={max} unit={unit} />
      <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
        最近：{data[data.length - 1] ?? '--'} {unit} · 共 {data.length} 点（每 15 分钟）
      </div>
    </Card>
  );
}

export default function AiIcuMonitorPage() {
  usePageTitle('AI 重症监护台');
  const [beds, setBeds] = useState<IcuBed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [current, setCurrent] = useState<IcuBed | null>(null);
  const [monitor, setMonitor] = useState<BedMonitor | null>(null);
  const [monitorLoading, setMonitorLoading] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alert, setAlert] = useState<AiAlert | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);
  const [provider, setProvider] = useState<'demo' | 'llm-stub'>('demo');

  const loadBeds = useCallback(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/v1/ai-icu/beds')
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const items = j.data?.items;
        setBeds(Array.isArray(items) && items.length > 0 ? items : demoBeds);
      })
      .catch((e: Error) => { if (!alive) return; setError(e.message); setBeds(demoBeds); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const cleanup = loadBeds();
    return cleanup;
  }, [loadBeds]);

  const openDetail = async (bed: IcuBed) => {
    setCurrent(bed);
    setDetailOpen(true);
    setMonitorLoading(true);
    setMonitor(null);
    try {
      const r = await fetch(`/api/v1/ai-icu/beds/${bed.bedId}/monitor?provider=${provider}`);
      const j = await r.json();
      if (j.data) setMonitor(j.data as BedMonitor);
    } catch {
      message.error('监护详情加载失败');
    } finally {
      setMonitorLoading(false);
    }
  };

  const triggerAlert = async (bed: IcuBed) => {
    setAlertOpen(true);
    setAlertLoading(true);
    setAlert(null);
    try {
      const r = await fetch(`/api/v1/ai-icu/beds/${bed.bedId}/alerts?provider=${provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const j = await r.json();
      if (j.data) setAlert(j.data as AiAlert);
    } catch {
      message.error('AI 预警生成失败');
    } finally {
      setAlertLoading(false);
    }
  };

  const providerExtra = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 13, color: '#666' }}>预测模型</span>
      <Select
        value={provider}
        style={{ width: 160 }}
        onChange={(v) => {
          setProvider(v as 'demo' | 'llm-stub');
          if (v === 'llm-stub') message.info('llm-stub：需接入真实模型服务，当前返回占位');
        }}
        options={[
          { value: 'demo', label: 'demo（规则模拟）' },
          { value: 'llm-stub', label: 'llm-stub（待接入）' },
        ]}
      />
    </div>
  );

  return (
    <PageContainer title="AI 重症监护台" description="ICU 床位实时监护：SOFA 评分 / 脓毒症风险 / 呼吸机模式 / AI 建议与预警" extra={providerExtra}>
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Row gutter={[16, 16]}>
          {beds.map((bed) => {
            const rt = riskTag[bed.sepsisRisk];
            return (
              <Col xs={24} sm={12} xl={8} key={bed.bedId}>
                <Card
                  hoverable
                  title={<span style={{ fontSize: 14 }}>{bed.bedId} · {bed.patientName}</span>}
                  extra={<Tag color={rt.color}>{rt.text}</Tag>}
                  onClick={() => void openDetail(bed)}
                >
                  <Statistic title="SOFA 评分" value={bed.sofaScore} valueStyle={{ fontSize: 28, color: bed.sofaScore >= 6 ? '#cf1322' : bed.sofaScore >= 3 ? '#d46b08' : '#3f8600' }} />
                  <div style={{ marginTop: 8 }}>
                    <Tag>呼吸机 {bed.ventilatorMode}</Tag>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 12, color: '#555', minHeight: 36 }}>
                    AI 建议：{bed.aiSuggestion}
                  </div>
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#999' }}>更新 {bed.updatedAt}</span>
                    <Button size="small" danger onClick={(e) => { e.stopPropagation(); void triggerAlert(bed); }}>
                      AI 预警
                    </Button>
                  </div>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Spin>

      <Modal
        title={`AI 监护详情 - ${current?.bedId ?? ''}（${current?.patientName ?? ''}）`}
        open={detailOpen}
        width={760}
        onCancel={() => setDetailOpen(false)}
        footer={<Button onClick={() => setDetailOpen(false)}>关闭</Button>}
        destroyOnClose
      >
        <Spin spinning={monitorLoading}>
          {monitor?.stub ? (
            <Alert type="warning" showIcon message="需接入真实模型服务" description="当前选择 llm-stub，预测接口尚未接入院内大模型或评分模型。请切换 demo 查看模拟结果，或联系算法团队完成生产接入。" />
          ) : monitor && (
            <>
              <Row gutter={12}>
                <Col span={12}>
                  <TrendChart label="心率 HR (次/分)" data={monitor.trends.map((t) => t.hr)} color="#cf1322" min={50} max={140} unit="bpm" />
                </Col>
                <Col span={12}>
                  <TrendChart label="血压 MAP (mmHg)" data={monitor.trends.map((t) => t.bp)} color="#d46b08" min={60} max={140} unit="mmHg" />
                </Col>
                <Col span={12}>
                  <TrendChart label="血氧 SpO₂ (%)" data={monitor.trends.map((t) => t.spo2)} color="#3f8600" min={85} max={100} unit="%" />
                </Col>
                <Col span={12}>
                  <TrendChart label="呼吸 RR (次/分)" data={monitor.trends.map((t) => t.rr)} color="#096dd9" min={8} max={35} unit="/min" />
                </Col>
              </Row>
              {monitor.sepsisScreen && (
                <Card size="small" title="脓毒症筛查（qSOFA）" style={{ marginBottom: 12 }}>
                  <Row gutter={16}>
                    <Col span={8}><Statistic title="qSOFA 评分" value={monitor.sepsisScreen.qsofa} /></Col>
                    <Col span={8}><Statistic title="血乳酸 Lac" value={monitor.sepsisScreen.lac} /></Col>
                    <Col span={8}><Statistic title="AI 风险分" value={monitor.sepsisScreen.riskScore} /></Col>
                  </Row>
                  <div style={{ marginTop: 8, fontSize: 13 }}>AI 建议：{monitor.sepsisScreen.suggestion}</div>
                </Card>
              )}
              {monitor.sedation && (
                <Card size="small" title="镇静镇痛 AI 建议" style={{ marginBottom: 12 }}>
                  <Statistic title="当前 RASS 评分" value={monitor.sedation.rass} />
                  <div style={{ marginTop: 8, fontSize: 13 }}>{monitor.sedation.aiAdvised}</div>
                </Card>
              )}
              {monitor.explainability && (monitor.explainability.sepsisFactors.length > 0 || monitor.explainability.sedationBasis) && (
                <Card size="small" title="模型解释（可解释性）">
                  {monitor.explainability.sepsisFactors.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>脓毒症风险因素 Top{monitor.explainability.sepsisFactors.length}</div>
                      {monitor.explainability.sepsisFactors.map((f, idx) => (
                        <div key={idx} style={{ marginBottom: 8 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 2 }}>
                            <span><Tag color={idx === 0 ? 'red' : idx === 1 ? 'orange' : 'default'}>{f.factor}</Tag>{f.detail}</span>
                            <span style={{ color: '#666' }}>贡献 {f.contribution}</span>
                          </div>
                          <Progress percent={f.contribution} showInfo={false} strokeColor={idx === 0 ? '#cf1322' : idx === 1 ? '#d46b08' : '#bfbfbf'} size="small" />
                        </div>
                      ))}
                    </div>
                  )}
                  {monitor.explainability.sedationBasis && (
                    <div style={{ fontSize: 12, color: '#555', borderTop: '1px dashed #eee', paddingTop: 8 }}>
                      <span style={{ fontWeight: 600 }}>镇静建议依据：</span>{monitor.explainability.sedationBasis}
                    </div>
                  )}
                </Card>
              )}
            </>
          )}
        </Spin>
      </Modal>

      <Modal
        title="AI 预警"
        open={alertOpen}
        footer={<Button type="primary" onClick={() => setAlertOpen(false)}>知道了</Button>}
        onCancel={() => setAlertOpen(false)}
        destroyOnClose
      >
        <Spin spinning={alertLoading}>
          {alert?.stub ? (
            <Alert type="warning" showIcon message="需接入真实模型服务" description="当前选择 llm-stub，预警判定尚未接入院内大模型。请切换 demo 查看模拟预警。" />
          ) : alert ? (
            <>
              <p>
                <Tag color={alertTag[alert.level].color}>{alertTag[alert.level].text}</Tag>
                <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>{alert.alertId}</span>
              </p>
              <p style={{ fontWeight: 600 }}>{alert.message}</p>
              <Alert type={alert.level === 'critical' ? 'error' : alert.level === 'warning' ? 'warning' : 'info'} showIcon message="建议处置" description={alert.suggestedAction} style={{ marginBottom: 12 }} />
              {alert.explain && (
                <Card size="small" title="预警判定理由">
                  <div style={{ fontSize: 13, marginBottom: 8 }}>{alert.explain.reason}</div>
                  {alert.explain.contributingFactors.length > 0 && (
                    <div>
                      <span style={{ fontSize: 12, color: '#666' }}>贡献因素：</span>
                      {alert.explain.contributingFactors.map((f, i) => (
                        <Tag key={i} style={{ marginTop: 4 }}>{f}</Tag>
                      ))}
                    </div>
                  )}
                </Card>
              )}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 20 }}>生成中...</div>
          )}
        </Spin>
      </Modal>
    </PageContainer>
  );
}
