/**
 * 健澜科技 jlmedaios — 【AI深化与智能运营】M168-B 医院智能运营预测与调配页（仅 admin）
 *
 * 一页看清未来 N 天运营预测（带 95% 置信区间，不拍脑袋）与手术排程优化结果：
 *   - 门诊量预测：逐日点预测 + 置信区间带（下界 ~ 上界），区间随预测步长变宽；
 *   - 床位需求预测：切换 type=bed 查看，含注入季节系数；
 *   - 手术排程优化：急诊优先 + 长手术优先贪心安放，给出连台时间表与等待/利用率指标；
 *   - 资源调配：按资源轧差给出调拨建议与平衡分。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI。
 * 医疗红线：预测/排程仅为排班辅助参考，不触发诊疗、不直接调号源/床位。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Radio,
  Row,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

interface ForecastPoint {
  date: string;
  value: number;
  lower: number;
  upper: number;
}

interface PredictResult {
  metric: string;
  historyPoints: number;
  forecast: ForecastPoint[];
  residualStd: number;
  confidenceLevel: number;
  degraded: boolean;
  note?: string;
}

interface PredictResponse {
  type: string;
  days: number;
  demo: boolean;
  holidays: string[];
  result: PredictResult;
}

interface Assignment {
  surgeryId: string;
  roomId: string;
  surgeonId: string;
  startMin: number;
  endMin: number;
  waitMin: number;
  urgency: 'emergency' | 'urgent' | 'routine';
}

interface ScheduleResult {
  schedule: Assignment[];
  unassigned: Array<{ surgeryId: string; urgency: string; reason: string }>;
  metrics: {
    assigned: number;
    unassigned: number;
    totalWaitMin: number;
    makespanMin: number;
    idleMin: number;
    roomUtilization: number;
  };
}

interface AllocationResult {
  gaps: Array<{ resource: string; required: number; available: number; net: number; status: string }>;
  transfers: Array<{ resource: string; fromDept: string; toDept: string; amount: number; reason: string }>;
  balanceScore: number;
  unmet: Array<{ resource: string; amount: number }>;
  notes: string[];
}

interface OptimizeResponse {
  schedule: ScheduleResult;
  allocation: AllocationResult | null;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const URGENCY_COLOR: Record<string, string> = {
  emergency: 'red',
  urgent: 'orange',
  routine: 'blue',
};
const URGENCY_LABEL: Record<string, string> = {
  emergency: '急诊',
  urgent: '紧急',
  routine: '常规',
};

export default function OpsPredictPage() {
  const [type, setType] = useState<'outpatient' | 'bed'>('outpatient');
  const [predict, setPredict] = useState<PredictResponse | null>(null);
  const [loadingP, setLoadingP] = useState(true);
  const [errorP, setErrorP] = useState('');

  const [opt, setOpt] = useState<OptimizeResponse | null>(null);
  const [loadingO, setLoadingO] = useState(false);
  const [errorO, setErrorO] = useState('');

  const loadPredict = async (t: 'outpatient' | 'bed') => {
    setLoadingP(true);
    setErrorP('');
    try {
      const resp = await fetch(`/api/v1/admin/ops/predict?type=${t}&days=7`);
      const json = await resp.json();
      if (json.code !== 0) {
        setErrorP(json.message || '预测失败');
        setPredict(null);
        return;
      }
      setPredict(json.data as PredictResponse);
    } catch (e) {
      setErrorP(e instanceof Error ? e.message : '网络异常');
      setPredict(null);
    } finally {
      setLoadingP(false);
    }
  };

  const runOptimize = async () => {
    setLoadingO(true);
    setErrorO('');
    try {
      // 演示用排程输入：4 间手术室 / 3 位医生 / 6 台手术（含 1 台急诊）
      const body = {
        rooms: [
          { id: 'OR-1', specialty: 'general', openMin: 480, closeMin: 1080 },
          { id: 'OR-2', specialty: 'orthopedics', openMin: 480, closeMin: 1080 },
          { id: 'OR-3', specialty: 'general', openMin: 540, closeMin: 1020 },
          { id: 'OR-4', specialty: '*', openMin: 480, closeMin: 1080 },
        ],
        doctors: [
          { id: 'D-王', specialty: 'general', availableMin: 480, availableMax: 1080, maxDailyCases: 3 },
          { id: 'D-李', specialty: 'orthopedics', availableMin: 480, availableMax: 1080, maxDailyCases: 3 },
          { id: 'D-赵', specialty: 'general', availableMin: 540, availableMax: 1080, maxDailyCases: 2 },
        ],
        surgeries: [
          { id: 'S-101', durationMin: 120, urgency: 'routine', specialty: 'general' },
          { id: 'S-102', durationMin: 90, urgency: 'emergency', specialty: 'general' },
          { id: 'S-103', durationMin: 150, urgency: 'routine', specialty: 'orthopedics' },
          { id: 'S-104', durationMin: 60, urgency: 'urgent', specialty: 'general' },
          { id: 'S-105', durationMin: 100, urgency: 'routine', specialty: 'orthopedics' },
          { id: 'S-106', durationMin: 80, urgency: 'routine', specialty: 'general' },
        ],
        demand: [
          { resource: 'beds', required: 210, dept: '普外科' },
          { resource: 'beds', required: 60, dept: '骨科' },
          { resource: 'nurses', required: 40, dept: 'ICU' },
        ],
        supply: [
          { resource: 'beds', available: 180, dept: '普外科' },
          { resource: 'beds', available: 120, dept: '康复科' },
          { resource: 'nurses', available: 35, dept: '全科' },
        ],
      };
      const resp = await fetch('/api/v1/admin/ops/schedule-optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setErrorO(json.message || '排程优化失败');
        setOpt(null);
        return;
      }
      setOpt(json.data as OptimizeResponse);
    } catch (e) {
      setErrorO(e instanceof Error ? e.message : '网络异常');
      setOpt(null);
    } finally {
      setLoadingO(false);
    }
  };

  useEffect(() => {
    void loadPredict('outpatient');
  }, []);

  const result = predict?.result;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院智能运营 · 预测与调配
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          运营预测带 95% 置信区间，不拍脑袋 · 等待最短 / 利用率最高 / 患者体验最优
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* 预测区 */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={
            <Radio.Group
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                void loadPredict(e.target.value);
              }}
              optionType="button"
              buttonStyle="solid"
            >
              <Radio.Button value="outpatient">门诊量预测</Radio.Button>
              <Radio.Button value="bed">床位需求预测</Radio.Button>
            </Radio.Group>
          }
          extra={
            <Button size="small" onClick={() => void loadPredict(type)}>
              刷新
            </Button>
          }
        >
          {loadingP && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Spin size="large" tip="正在计算预测与置信区间…" />
            </div>
          )}
          {!loadingP && errorP && (
            <Alert
              type="error"
              showIcon
              message={errorP}
              action={
                <Button size="small" onClick={() => void loadPredict(type)}>
                  重试
                </Button>
              }
            />
          )}
          {!loadingP && !errorP && predict && result && result.degraded && (
            <Alert type="warning" showIcon message="历史样本不足（<14 天），已降级为空集，不编造数字。" />
          )}
          {!loadingP && !errorP && predict && result && !result.degraded && (
            <>
              {predict.demo && (
                <Alert
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                  message="当前使用内置演示历史序列（未接业务库）。接入真实历史后预测自动切换为真实口径。"
                />
              )}
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>历史样本</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    {result.historyPoints} <span style={{ fontSize: 13 }}>天</span>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>残差标准差 σ</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.accent }}>{result.residualStd}</div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>置信水平</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: VI.deep }}>
                    {(result.confidenceLevel * 100).toFixed(0)}%
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>预测方法</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: VI.mid, marginTop: 8 }}>
                    {result.modelMethod}
                  </div>
                </Col>
              </Row>
              {result.note && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={result.note} />}
              <Table
                rowKey="date"
                size="small"
                pagination={false}
                dataSource={result.forecast}
                columns={[
                  { title: '日期', dataIndex: 'date', width: 130 },
                  {
                    title: '点预测',
                    dataIndex: 'value',
                    width: 100,
                    render: (v: number) => <span style={{ fontWeight: 700, color: VI.deep }}>{v}</span>,
                  },
                  {
                    title: '95% 置信区间',
                    key: 'ci',
                    render: (_: unknown, r: ForecastPoint) => (
                      <span>
                        <Tag color="default">[{r.lower} ~ {r.upper}]</Tag>
                        <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)', marginLeft: 8 }}>
                          带宽 {(r.upper - r.lower).toFixed(1)}
                        </span>
                      </span>
                    ),
                  },
                  {
                    title: '区间可视化',
                    key: 'band',
                    render: (_: unknown, r: ForecastPoint) => {
                      const max = Math.max(...result.forecast.map((p) => p.upper), 1);
                      const left = (r.lower / max) * 100;
                      const width = Math.max(2, ((r.upper - r.lower) / max) * 100);
                      return (
                        <div style={{ position: 'relative', height: 14, background: '#eef3f8', borderRadius: 7 }}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${left}%`,
                              width: `${width}%`,
                              top: 0,
                              bottom: 0,
                              background: VI.accent,
                              opacity: 0.55,
                              borderRadius: 7,
                            }}
                          />
                        </div>
                      );
                    },
                  },
                ]}
              />
            </>
          )}
        </Card>

        {/* 排程优化区 */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title="手术排程优化（急诊优先 · 长手术优先 · 最早可行位）"
          extra={
            <Button type="primary" loading={loadingO} onClick={runOptimize} style={{ background: VI.accent }}>
              {opt ? '重新优化' : '运行排程优化'}
            </Button>
          }
        >
          {loadingO && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Spin size="large" tip="正在求解最优排程…" />
            </div>
          )}
          {!loadingO && errorO && <Alert type="error" showIcon message={errorO} />}
          {!loadingO && !errorO && !opt && (
            <Alert type="info" showIcon message="点击「运行排程优化」，系统将按急诊优先规则给出连台时间表与利用率指标。" />
          )}
          {!loadingO && !errorO && opt && (
            <>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Card size="small">
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>已排 / 未排</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: VI.deep }}>
                      {opt.schedule.metrics.assigned} / {opt.schedule.metrics.unassigned}
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>总等待(min)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#fa8c16' }}>
                      {opt.schedule.metrics.totalWaitMin}
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>当日 makespan</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: VI.accent }}>
                      {fmtMin(opt.schedule.metrics.makespanMin)}
                    </div>
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>手术室利用率</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: VI.deep }}>
                      {(opt.schedule.metrics.roomUtilization * 100).toFixed(0)}%
                    </div>
                  </Card>
                </Col>
              </Row>

              <Progress
                percent={Math.round(opt.schedule.metrics.roomUtilization * 1000) / 10}
                strokeColor={VI.accent}
                style={{ marginBottom: 12 }}
              />

              <Table
                rowKey="surgeryId"
                size="small"
                pagination={false}
                dataSource={opt.schedule.schedule}
                columns={[
                  { title: '手术号', dataIndex: 'surgeryId', width: 100 },
                  {
                    title: '紧急度',
                    dataIndex: 'urgency',
                    width: 90,
                    render: (v: string) => <Tag color={URGENCY_COLOR[v]}>{URGENCY_LABEL[v]}</Tag>,
                  },
                  { title: '房间', dataIndex: 'roomId', width: 80 },
                  { title: '主刀', dataIndex: 'surgeonId', width: 90 },
                  {
                    title: '时段',
                    key: 'time',
                    render: (_: unknown, r: Assignment) => `${fmtMin(r.startMin)} - ${fmtMin(r.endMin)}`,
                  },
                  {
                    title: '等待',
                    dataIndex: 'waitMin',
                    width: 90,
                    render: (v: number) => (v > 0 ? <Tag color="orange">+{v}min</Tag> : <Tag color="green">准点</Tag>),
                  },
                ]}
              />

              {opt.schedule.unassigned.length > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="warning"
                  showIcon
                  message={
                    opt.schedule.unassigned.length + ' 台手术当日窗口排不下，建议顺延或加开房间'
                  }
                  description={opt.schedule.unassigned.map((u) => `${u.surgeryId}：${u.reason}`).join('；')}
                />
              )}

              {opt.allocation && (
                <Card
                  size="small"
                  style={{ marginTop: 16 }}
                  title={`资源调配建议 · 平衡分 ${(opt.allocation.balanceScore * 100).toFixed(0)} / 100`}
                >
                  {opt.allocation.notes.map((n, i) => (
                    <div key={i} style={{ marginBottom: 4, fontSize: 13 }}>
                      <Tag color={VI.accent}>{i === 0 ? '结论' : '提示'}</Tag>
                      {n}
                    </div>
                  ))}
                  {opt.allocation.transfers.length > 0 && (
                    <Table
                      style={{ marginTop: 8 }}
                      rowKey={(r) => `${r.resource}-${r.fromDept}-${r.toDept}-${r.amount}`}
                      size="small"
                      pagination={false}
                      dataSource={opt.allocation.transfers}
                      columns={[
                        { title: '资源', dataIndex: 'resource', width: 90 },
                        { title: '调出', dataIndex: 'fromDept', width: 110 },
                        { title: '调入', dataIndex: 'toDept', width: 110 },
                        { title: '数量', dataIndex: 'amount', width: 80 },
                        { title: '原因', dataIndex: 'reason' },
                      ]}
                    />
                  )}
                  {opt.allocation.unmet.length > 0 && (
                    <Alert
                      style={{ marginTop: 8 }}
                      type="error"
                      showIcon
                      message={
                        '未覆盖缺口：' +
                        opt.allocation.unmet.map((u) => `${u.resource} ${u.amount}`).join('，')
                      }
                    />
                  )}
                </Card>
              )}
            </>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
