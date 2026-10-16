/**
 * 健澜科技 jlmedaios - M161-A 医院数字孪生深化页（实时推送与仿真，仅 admin）
 *
 * 功能：
 *  - 实时推送模拟：前端 setInterval 定时拉取 GET /digital-twin/stream（定时快照），
 *    对比版本号 version 增量刷新；同一轮询窗口版本恒定，稳定不断线（不引入 WS）；
 *  - 实时态总览：四态汇总、占用率、演示时钟、增量事件流滚动提示；
 *  - 流程仿真：选择三情景（门诊高峰 / 批量伤员 / 手术室故障）POST /simulate，
 *    展示到院/候诊/收治/急诊占用/紧张度曲线与处置建议；
 *  - 资源预测：床位/医师/护士/手术室/抢救位需求曲线 + 相对常态的峰值缺口。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 患者位置仅 P-xxxx 脱敏标识；显式标注「演示数据 · 定时快照轮询」。
 *
 * 【远期深化】WebSocket/MQTT 长连接增量推送、3D BIM 可视化、仿真参数真实校准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Timeline,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type DeepFlowScenario = 'opd_peak' | 'mass_casualty' | 'or_failure';
type PredictPeriod = 'hour' | 'day' | 'week';

interface TwinStreamEvent {
  seq: number;
  roomId: string;
  type: 'bed_change' | 'alert' | 'equipment';
  message: string;
}

interface TwinStreamSnapshot {
  buildingId: string;
  buildingName: string;
  floor: string | null;
  version: number;
  clockMinutes: number;
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    maintenance: number;
    occupancyRate: number;
  };
  events: TwinStreamEvent[];
  pushedAt: string;
  demo: boolean;
  notice?: string;
}

interface FlowStep {
  t: string;
  arrivals: number;
  waiting: number;
  admitted: number;
  erBedsUsed: number;
  strain: number;
}

interface HospitalFlowResult {
  scenario: DeepFlowScenario;
  scenarioNote: string;
  steps: FlowStep[];
  peakStrain: number;
  actions: string[];
}

interface ResourceNeedPoint {
  t: string;
  beds: number;
  physicians: number;
  nurses: number;
  orRooms: number;
  erResus: number;
}

interface ResourceNeedResult {
  period: PredictPeriod;
  scenario: DeepFlowScenario;
  points: ResourceNeedPoint[];
  gap: { beds: number; physicians: number; nurses: number; orRooms: number; erResus: number };
  note: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

/** 轮询间隔（毫秒）：定时快照模拟实时推送；与后端轮询窗口配合稳定不断线 */
const POLL_INTERVAL_MS = 5000;

const SCENARIO_OPTIONS: { value: DeepFlowScenario; label: string }[] = [
  { value: 'opd_peak', label: '门诊高峰（周一上午）' },
  { value: 'mass_casualty', label: '突发公共卫生事件（批量伤员）' },
  { value: 'or_failure', label: '设备故障（手术室临时不可用）' },
];

const PERIOD_OPTIONS: { value: PredictPeriod; label: string }[] = [
  { value: 'hour', label: '按小时' },
  { value: 'day', label: '按天' },
  { value: 'week', label: '按周' },
];

const EVENT_COLOR: Record<TwinStreamEvent['type'], string> = {
  bed_change: 'blue',
  alert: 'red',
  equipment: 'cyan',
};

/** 紧张度配色 */
function strainColor(s: number): string {
  if (s >= 80) return '#CF1322';
  if (s >= 60) return '#FA8C16';
  return '#52C41A';
}

/** 把演示分钟数格式化为 HH:mm */
function fmtClock(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/* --------------------------------- 组件 --------------------------------- */

export default function DigitalTwinDeepPage() {
  const [snapshot, setSnapshot] = useState<TwinStreamSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [polling, setPolling] = useState(true);

  // 仿真区状态
  const [scenario, setScenario] = useState<DeepFlowScenario>('opd_peak');
  const [period, setPeriod] = useState<PredictPeriod>('day');
  const [flow, setFlow] = useState<HospitalFlowResult | null>(null);
  const [forecast, setForecast] = useState<ResourceNeedResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [simError, setSimError] = useState('');

  // 用 ref 记录上一次版本号，便于展示「是否有增量」
  const lastVersion = useRef<number>(0);

  /* ------------------------------ 拉取定时快照 ------------------------------ */
  const loadSnapshot = useCallback(async () => {
    try {
      const resp = await fetch('/api/v1/admin/digital-twin/stream?building=main&floor=6');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '拉取实时快照失败');
        return;
      }
      const data = json.data as TwinStreamSnapshot;
      lastVersion.current = data.version;
      setSnapshot(data);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSnapshot();
    if (!polling) return;
    const timer = setInterval(() => void loadSnapshot(), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadSnapshot, polling]);

  /* ------------------------------ 运行仿真 ------------------------------ */
  const runSimulate = useCallback(async (sc: DeepFlowScenario, pe: PredictPeriod) => {
    setSimLoading(true);
    setSimError('');
    try {
      const resp = await fetch('/api/v1/admin/digital-twin/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario: sc, period: pe }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setSimError(json.message || '仿真失败');
        return;
      }
      setFlow(json.data.flow as HospitalFlowResult);
      setForecast(json.data.forecast as ResourceNeedResult);
    } catch (e) {
      setSimError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setSimLoading(false);
    }
  }, []);

  // 首次进入或情景/周期变化时自动跑一次
  useEffect(() => {
    void runSimulate(scenario, period);
  }, [scenario, period, runSimulate]);

  const summary = snapshot?.summary;

  // 流程表用的最大紧张度（用于条带高度归一）
  const maxStrain = useMemo(() => (flow ? Math.max(50, flow.peakStrain) : 100), [flow]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            数字孪生深化 · 实时推送与仿真
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            定时快照轮询模拟实时推送（非 WebSocket）/ 门诊流程仿真 / 资源需求预测 · 仅系统管理员可见
            {snapshot?.demo ? '（演示数据）' : ''}
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="本期以「定时快照 + 版本号」轮询模拟稳定实时推送，不引入 WebSocket；远期深化再切长连接增量推送。"
          style={{ marginBottom: 16 }}
        />

        {/* ===================== 实时推送模拟区 ===================== */}
        <Card
          title={
            <span style={{ color: '#fff' }}>
              实时态（{snapshot?.buildingName ?? '门诊住院综合楼'} · 6F）
              <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                版本 v{lastVersion.current} · {snapshot ? fmtClock(snapshot.clockMinutes) : '--:--'}
              </Text>
            </span>
          }
          headStyle={{ background: VI.deep }}
          extra={
            <Space>
              <Button size="small" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
                onClick={() => setPolling((p) => !p)}>
                {polling ? '暂停轮询' : '恢复轮询'}
              </Button>
              <Button size="small" style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none' }}
                onClick={() => void loadSnapshot()}>
                立即刷新
              </Button>
            </Space>
          }
        >
          {loading && (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Spin size="large" tip="拉取实时快照中…" />
            </div>
          )}

          {!loading && error && (
            <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void loadSnapshot()}>重试</Button>} />
          )}

          {!loading && !error && summary && (
            <Row gutter={16}>
              <Col xs={12} sm={4}>
                <Statistic title="床位数" value={summary.totalBeds} suffix="张" />
              </Col>
              <Col xs={12} sm={4}>
                <Statistic title="空 / 占 / 隔离 / 维护" value={`${summary.available} / ${summary.occupied} / ${summary.isolation} / ${summary.maintenance}`} />
              </Col>
              <Col xs={12} sm={4}>
                <Statistic title="占用率" value={summary.occupancyRate} suffix="%" precision={1} />
              </Col>
              <Col xs={12} sm={4}>
                <Statistic title="事件数" value={snapshot?.events.length ?? 0} suffix="条" />
              </Col>
              <Col xs={24} sm={8}>
                <Text strong style={{ color: VI.deep }}>增量事件流：</Text>
                {snapshot && snapshot.events.length > 0 ? (
                  <Timeline
                    style={{ marginTop: 8 }}
                    items={snapshot.events.slice(0, 5).map((ev) => ({
                      color: EVENT_COLOR[ev.type],
                      children: <Text style={{ fontSize: 12 }}>{ev.message}</Text>,
                    }))}
                  />
                ) : (
                  <Paragraph type="secondary" style={{ marginTop: 8, fontSize: 12 }}>
                    当前快照周期无关键事件。
                  </Paragraph>
                )}
              </Col>
            </Row>
          )}
        </Card>

        {/* ===================== 流程仿真区 ===================== */}
        <Card
          style={{ marginTop: 16 }}
          title={<span style={{ color: '#fff' }}>就诊流程仿真</span>}
          headStyle={{ background: VI.accent }}
          extra={
            <Space>
              <Select
                value={scenario}
                options={SCENARIO_OPTIONS}
                style={{ width: 220 }}
                onChange={(v) => setScenario(v as DeepFlowScenario)}
              />
              <Select
                value={period}
                options={PERIOD_OPTIONS}
                style={{ width: 110 }}
                onChange={(v) => setPeriod(v as PredictPeriod)}
              />
            </Space>
          }
        >
          {simError && <Alert type="error" showIcon message={simError} style={{ marginBottom: 12 }} />}
          {simLoading && (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <Spin size="large" tip="仿真计算中…" />
            </div>
          )}

          {!simLoading && flow && (
            <>
              <Paragraph type="secondary">{flow.scenarioNote}</Paragraph>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={6}>
                  <Statistic title="峰值紧张度" value={flow.peakStrain} suffix="%"
                    valueStyle={{ color: strainColor(flow.peakStrain) }} />
                </Col>
              </Row>

              {/* 紧张度条带（纯 CSS，无图表依赖） */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, padding: '8px 0' }}>
                {flow.steps.map((s) => (
                  <div key={s.t} style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      title={`${s.t} 到院${s.arrivals} 候诊${s.waiting} 紧张度${s.strain}%`}
                      style={{
                        height: `${(s.strain / maxStrain) * 100}%`,
                        background: strainColor(s.strain),
                        borderRadius: '4px 4px 0 0',
                        minHeight: 4,
                        opacity: 0.85,
                      }}
                    />
                    <Text style={{ fontSize: 10, color: '#888' }}>{s.t.slice(0, 5)}</Text>
                  </div>
                ))}
              </div>

              <List
                size="small"
                header={<Text strong style={{ color: VI.deep }}>处置建议</Text>}
                dataSource={flow.actions}
                renderItem={(a) => <List.Item><Text>· {a}</Text></List.Item>}
                style={{ marginTop: 8 }}
              />
            </>
          )}
        </Card>

        {/* ===================== 资源预测区 ===================== */}
        {!simLoading && forecast && (
          <Card
            style={{ marginTop: 16 }}
            title={<span style={{ color: '#fff' }}>资源需求预测</span>}
            headStyle={{ background: VI.deep }}
          >
            <Paragraph type="secondary">{forecast.note}</Paragraph>
            <Row gutter={16} style={{ marginBottom: 12 }}>
              <Col span={4}><Statistic title="床位缺口" value={forecast.gap.beds} suffix="床" /></Col>
              <Col span={4}><Statistic title="医师缺口" value={forecast.gap.physicians} suffix="人" /></Col>
              <Col span={4}><Statistic title="护士缺口" value={forecast.gap.nurses} suffix="人" /></Col>
              <Col span={4}><Statistic title="手术室缺口" value={forecast.gap.orRooms} suffix="间" /></Col>
              <Col span={4}><Statistic title="抢救位缺口" value={forecast.gap.erResus} suffix="位" /></Col>
            </Row>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: VI.bg }}>
                    <th style={thStyle}>时间</th>
                    <th style={thStyle}>床位</th>
                    <th style={thStyle}>医师</th>
                    <th style={thStyle}>护士</th>
                    <th style={thStyle}>手术室</th>
                    <th style={thStyle}>抢救位</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.points.map((p) => (
                    <tr key={p.t} style={{ borderBottom: `1px solid ${VI.grid}` }}>
                      <td style={tdStyle}>{p.t}</td>
                      <td style={tdStyle}>{p.beds}</td>
                      <td style={tdStyle}>{p.physicians}</td>
                      <td style={tdStyle}>{p.nurses}</td>
                      <td style={tdStyle}>{p.orRooms}</td>
                      <td style={tdStyle}>{p.erResus}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {/* 页脚版权 */}
        <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
          © {new Date().getFullYear()} 杭州健澜科技有限公司 · 数字孪生深化（远期：WebSocket 实时推送 / 3D BIM）
        </Paragraph>
      </Content>
    </Layout>
  );
}

const thStyle: CSSProperties = {
  padding: '6px 8px',
  textAlign: 'left',
  color: '#0B2A4A',
  borderBottom: '2px solid #e6ebf2',
};
const tdStyle: CSSProperties = {
  padding: '6px 8px',
  color: '#333',
};
