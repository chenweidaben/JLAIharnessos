/**
 * 健澜科技 jlmedaios - M170-B 医院数字孪生多建筑页（自学习与数字孪生，仅 admin）
 *
 * 「数字孪生要可视化，不能只是数据」：
 *  - 全院四楼宇 2D 平面孪生图：门诊楼（楼层/科室/诊室/候诊区）、住院楼（楼层/病房/
 *    床位/护士站）、医技楼（检查室/检验室/手术室）、急诊楼（抢救室/留观室/输液室）；
 *    每个分区按人流密度着色（低/中/高/拥挤），SVG 直出，无图表依赖；
 *  - 患者流仿真：按情景（常态/门诊高峰/传染病/批量伤员）画到院-候诊-紧张度曲线；
 *  - 人流密度预测：按小时/天列密度分级与热点分区；
 *  - 患者路线优化：选择起终点分区，Dijkstra 给出最优导诊路径与预计耗时。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示数据 · 纯函数推演，非 WebSocket 实时流」。
 *
 * 【远期】BIM/IFC 3D、WebSocket 增量推送、真实叫号客流自学习校准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type BuildingKind = 'outpatient' | 'inpatient' | 'medical_tech' | 'emergency';
type ZoneType =
  | 'department' | 'clinic_room' | 'waiting_area' | 'ward' | 'bed' | 'nurse_station'
  | 'exam_room' | 'lab_room' | 'operating_room' | 'resus' | 'observation'
  | 'infusion' | 'corridor' | 'other';
type CrowdLevel = 'low' | 'medium' | 'high' | 'crowded';
type FlowScenario = 'normal' | 'morning_peak' | 'epidemic' | 'mass_casualty';
type DensityPeriod = 'hour' | 'day';

interface TwinZone {
  zoneCode: string;
  zoneName: string;
  zoneType: ZoneType;
  floor: string;
  x: number; y: number; w: number; h: number;
  capacity: number;
  crowdBaseline: number;
  crowdLevel: CrowdLevel;
  neighbors: string[];
}
interface MultiBuildingView {
  buildingId: string;
  buildingName: string;
  kind: BuildingKind;
  kindName: string;
  floors: string[];
  zones: TwinZone[];
  summary: {
    floors: number; zones: number;
    totalCapacity: number; totalCrowdBaseline: number; crowdedZones: number;
  };
}
interface MultiBuildingTwin {
  buildings: MultiBuildingView[];
  totalBuildings: number; totalZones: number;
  totalCapacity: number; totalCrowdBaseline: number;
  demo: boolean; generatedAt: string;
}
interface FlowTick { t: string; arrivals: number; waiting: number; served: number; overflow: number; strain: number; }
interface PatientFlowResult {
  building: string; buildingName: string; scenario: FlowScenario; scenarioNote: string;
  ticks: FlowTick[]; peakStrain: number; peakWaiting: number; actions: string[];
}
interface DensityPoint { t: string; crowd: number; level: CrowdLevel; hotZones: string[]; }
interface CrowdDensityResult {
  building: string; buildingName: string; period: DensityPeriod;
  points: DensityPoint[]; peakCrowd: number; note: string;
}
interface OptimizedRoute {
  building: string; buildingName: string; start: string; end: string;
  path: string[]; pathNames: string[]; distance: number; estMinutes: number;
  congestion: 'smooth' | 'moderate' | 'crowded';
}
interface MultiData {
  twin: MultiBuildingTwin;
  flow: PatientFlowResult;
  density: CrowdDensityResult;
  route: OptimizedRoute | null;
  routeError: string;
  focusBuilding: string;
  notice: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = { deep: '#0B2A4A', accent: '#1E5AA8', bg: '#f5f7fa', grid: '#e6ebf2' };

/** 密度分级配色（与后端 crowdLevelOf 阈值对齐） */
const LEVEL_COLOR: Record<CrowdLevel, string> = {
  low: '#52C41A',
  medium: '#ADDB2E',
  high: '#FAAD14',
  crowded: '#CF1322',
};
const LEVEL_LABEL: Record<CrowdLevel, string> = {
  low: '低', medium: '中', high: '高', crowded: '拥挤',
};

const SCENARIO_OPTIONS: { value: FlowScenario; label: string }[] = [
  { value: 'normal', label: '常态运行' },
  { value: 'morning_peak', label: '门诊高峰（周一上午）' },
  { value: 'epidemic', label: '传染病聚集' },
  { value: 'mass_casualty', label: '突发批量伤员' },
];
const PERIOD_OPTIONS: { value: DensityPeriod; label: string }[] = [
  { value: 'hour', label: '按小时（24 点）' },
  { value: 'day', label: '按天（7 天）' },
];

/** 2D 平面网格视口（后端坐标 0..1000） */
const VIEW_W = 1000;
const VIEW_H = 520;

function strainColor(s: number): string {
  if (s >= 80) return '#CF1322';
  if (s >= 60) return '#FA8C16';
  return '#52C41A';
}

/* --------------------------------- 组件 --------------------------------- */

export default function TwinDeepPage() {
  const [data, setData] = useState<MultiData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [scenario, setScenario] = useState<FlowScenario>('normal');
  const [period, setPeriod] = useState<DensityPeriod>('hour');
  const [building, setBuilding] = useState<string>('');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');

  const load = useCallback(async (opts?: {
    sc?: FlowScenario; pe?: DensityPeriod; b?: string; f?: string; t?: string;
  }) => {
    setLoading(true);
    setError('');
    try {
      const qs = new URLSearchParams();
      if (opts?.b) qs.set('building', opts.b);
      qs.set('scenario', opts?.sc ?? scenario);
      qs.set('period', opts?.pe ?? period);
      if (opts?.f && opts?.t) { qs.set('from', opts.f); qs.set('to', opts.t); }
      const resp = await fetch(`/api/v1/admin/digital-twin/multi?${qs.toString()}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '拉取数字孪生多建筑数据失败');
        return;
      }
      setData(json.data as MultiData);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, [scenario, period]);

  useEffect(() => {
    void load({ sc: scenario, pe: period, b: building });
  }, [scenario, period, building, load]);

  // 当前聚焦楼宇（用于起终点下拉）
  const focusView = useMemo(
    () => data?.twin.buildings.find((b) => b.buildingId === data.focusBuilding)
      ?? data?.twin.buildings[0],
    [data],
  );
  const zoneOptions = useMemo(
    () => (focusView?.zones ?? []).map((z) => ({ value: z.zoneCode, label: `${z.floor}F · ${z.zoneName}` })),
    [focusView],
  );

  const maxStrain = useMemo(
    () => (data ? Math.max(50, data.flow.peakStrain) : 100),
    [data],
  );

  const runRoute = useCallback(() => {
    if (!from || !to) return;
    void load({ sc: scenario, pe: period, b: building, f: from, t: to });
  }, [from, to, scenario, period, building, load]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            数字孪生 · 多建筑与仿真
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            门诊楼 / 住院楼 / 医技楼 / 急诊楼 2D 可视化 · 患者流仿真 · 人流密度预测 · 路线优化
            {data?.twin.demo ? '（演示数据）' : ''} · 仅系统管理员可见
          </Paragraph>
        </div>

        <Alert
          type="info"
          showIcon
          message="数字孪生以「可视化平面 + 纯函数推演」呈现：四楼宇分区按人流密度着色；远期接入 BIM/IFC 3D 与真实叫号客流自学习校准（本期不碰 WebSocket）。"
          style={{ marginBottom: 16 }}
        />

        {/* 全局筛选 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Text strong style={{ color: VI.deep }}>楼宇：</Text>
            <Select
              allowClear
              placeholder="全院（四楼宇）"
              style={{ width: 160 }}
              value={building || undefined}
              onChange={(v) => { setBuilding(v ?? ''); setFrom(''); setTo(''); }}
              options={(data?.twin.buildings ?? []).map((b) => ({
                value: b.buildingId, label: `${b.kindName}（${b.buildingId}）`,
              }))}
            />
            <Text strong style={{ color: VI.deep }}>情景：</Text>
            <Select value={scenario} options={SCENARIO_OPTIONS} style={{ width: 200 }} onChange={(v) => setScenario(v as FlowScenario)} />
            <Text strong style={{ color: VI.deep }}>密度粒度：</Text>
            <Select value={period} options={PERIOD_OPTIONS} style={{ width: 160 }} onChange={(v) => setPeriod(v as DensityPeriod)} />
          </Space>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="构建多建筑数字孪生…" />
          </div>
        )}
        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void load()}>重试</Button>} />
        )}

        {!loading && !error && data && (
          <>
            {/* 全院总览 KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={12} sm={5}><Statistic title="楼宇数" value={data.twin.totalBuildings} suffix="栋" /></Col>
              <Col xs={12} sm={5}><Statistic title="分区数" value={data.twin.totalZones} suffix="个" /></Col>
              <Col xs={12} sm={5}><Statistic title="总容量" value={data.twin.totalCapacity} suffix="人次" /></Col>
              <Col xs={12} sm={5}><Statistic title="基线人流" value={data.twin.totalCrowdBaseline} suffix="人/时" /></Col>
              <Col xs={24} sm={4}>
                <Space direction="vertical" size={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>密度图例</Text>
                  <Space size={4} wrap>
                    {(Object.keys(LEVEL_COLOR) as CrowdLevel[]).map((l) => (
                      <Tag key={l} color={LEVEL_COLOR[l]} style={{ margin: 0 }}>{LEVEL_LABEL[l]}</Tag>
                    ))}
                  </Space>
                </Space>
              </Col>
            </Row>

            {/* 多建筑 2D 平面孪生图 */}
            <Row gutter={[16, 16]}>
              {data.twin.buildings.map((b) => (
                <Col xs={24} lg={12} key={b.buildingId}>
                  <Card
                    title={
                      <span style={{ color: '#fff' }}>
                        {b.buildingName}
                        <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8, fontSize: 12 }}>
                          {b.kind} · {b.summary.floors}F · {b.summary.zones} 分区 · 拥挤 {b.summary.crowdedZones}
                        </Text>
                      </span>
                    }
                    headStyle={{ background: VI.deep }}
                    size="small"
                  >
                    {/* 2D SVG 平面：分区按密度着色 */}
                    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', background: '#fafbfd', border: `1px solid ${VI.grid}`, borderRadius: 4 }}>
                      {b.zones.map((z) => (
                        <g key={z.zoneCode}>
                          <rect
                            x={z.x} y={z.y} width={z.w} height={z.h}
                            rx={6}
                            fill={LEVEL_COLOR[z.crowdLevel]}
                            fillOpacity={0.28}
                            stroke={LEVEL_COLOR[z.crowdLevel]}
                            strokeWidth={2}
                          />
                          <text x={z.x + 8} y={z.y + 20} fontSize={15} fill={VI.deep} fontWeight={600}>
                            {z.zoneName}
                          </text>
                          <text x={z.x + 8} y={z.y + 38} fontSize={11} fill="#666">
                            {z.floor}F · {z.crowdBaseline}人/时
                          </text>
                        </g>
                      ))}
                    </svg>
                    <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0, fontSize: 12 }}>
                      容量 {b.summary.totalCapacity} · 基线人流 {b.summary.totalCrowdBaseline} 人/时
                    </Paragraph>
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 患者流仿真 */}
            <Card
              style={{ marginTop: 16 }}
              title={<span style={{ color: '#fff' }}>患者流仿真 · {data.flow.buildingName}</span>}
              headStyle={{ background: VI.accent }}
            >
              <Paragraph type="secondary">{data.flow.scenarioNote}</Paragraph>
              <Row gutter={16} style={{ marginBottom: 8 }}>
                <Col span={6}><Statistic title="峰值紧张度" value={data.flow.peakStrain} suffix="%" valueStyle={{ color: strainColor(data.flow.peakStrain) }} /></Col>
                <Col span={6}><Statistic title="峰值候诊" value={data.flow.peakWaiting} suffix="人" /></Col>
              </Row>
              {/* 紧张度条带（纯 CSS） */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, padding: '8px 0' }}>
                {data.flow.ticks.map((s) => (
                  <div key={s.t} style={{ flex: 1, textAlign: 'center' }}>
                    <div
                      title={`${s.t} 到院${s.arrivals} 候诊${s.waiting} 溢出${s.overflow} 紧张度${s.strain}%`}
                      style={{
                        height: `${(s.strain / maxStrain) * 100}%`,
                        background: strainColor(s.strain),
                        borderRadius: '4px 4px 0 0', minHeight: 4, opacity: 0.85,
                      }}
                    />
                    <Text style={{ fontSize: 10, color: '#888' }}>{s.t.slice(0, 5)}</Text>
                  </div>
                ))}
              </div>
              <List
                size="small"
                header={<Text strong style={{ color: VI.deep }}>处置建议</Text>}
                dataSource={data.flow.actions}
                renderItem={(a) => <List.Item><Text>· {a}</Text></List.Item>}
              />
            </Card>

            {/* 密度预测 + 路线优化 */}
            <Row gutter={16} style={{ marginTop: 16 }}>
              <Col xs={24} lg={12}>
                <Card
                  title={<span style={{ color: '#fff' }}>人流密度预测 · {data.density.buildingName}</span>}
                  headStyle={{ background: VI.deep }}
                  size="small"
                >
                  <Paragraph type="secondary" style={{ fontSize: 12 }}>{data.density.note} · 峰值 {data.density.peakCrowd} 人</Paragraph>
                  <div style={{ overflowX: 'auto', maxHeight: 320, overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ position: 'sticky', top: 0, background: VI.bg }}>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>时段</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>在院人数</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>等级</th>
                          <th style={{ padding: '4px 8px', textAlign: 'left' }}>热点分区</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.density.points.map((p) => (
                          <tr key={p.t} style={{ borderBottom: `1px solid ${VI.grid}` }}>
                            <td style={{ padding: '4px 8px' }}>{p.t}</td>
                            <td style={{ padding: '4px 8px' }}>{p.crowd}</td>
                            <td style={{ padding: '4px 8px' }}>
                              <Tag color={LEVEL_COLOR[p.level]}>{LEVEL_LABEL[p.level]}</Tag>
                            </td>
                            <td style={{ padding: '4px 8px', color: '#555' }}>{p.hotZones.join('、')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </Col>

              <Col xs={24} lg={12}>
                <Card
                  title={<span style={{ color: '#fff' }}>患者路线优化 · {focusView?.buildingName ?? ''}</span>}
                  headStyle={{ background: VI.accent }}
                  size="small"
                >
                  <Space wrap style={{ marginBottom: 12 }}>
                    <Select
                      showSearch placeholder="起点分区" style={{ width: 200 }}
                      value={from || undefined} options={zoneOptions}
                      onChange={(v) => setFrom(v as string)}
                    />
                    <Select
                      showSearch placeholder="终点分区" style={{ width: 200 }}
                      value={to || undefined} options={zoneOptions}
                      onChange={(v) => setTo(v as string)}
                    />
                    <Button type="primary" style={{ background: VI.deep }} disabled={!from || !to} onClick={runRoute}>
                      寻路
                    </Button>
                  </Space>

                  {data.routeError && <Alert type="warning" showIcon message={data.routeError} style={{ marginBottom: 8 }} />}

                  {data.route ? (
                    <>
                      <Row gutter={12}>
                        <Col span={8}><Statistic title="预计步行" value={data.route.estMinutes} suffix="分钟" /></Col>
                        <Col span={8}><Statistic title="路径代价" value={data.route.distance} /></Col>
                        <Col span={8}>
                          <Text type="secondary">拥堵等级：</Text>
                          <Tag color={data.route.congestion === 'crowded' ? 'red' : data.route.congestion === 'moderate' ? 'orange' : 'green'}>
                            {data.route.congestion === 'crowded' ? '拥挤' : data.route.congestion === 'moderate' ? '适中' : '畅通'}
                          </Tag>
                        </Col>
                      </Row>
                      <Paragraph style={{ marginTop: 12, marginBottom: 0 }}>
                        <Text strong style={{ color: VI.deep }}>导诊路径：</Text>
                      </Paragraph>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
                        {(data.route?.pathNames ?? []).map((n, i) => (
                          <span key={`${n}-${i}`}>
                            <Tag color={VI.accent} style={{ margin: 0 }}>{n}</Tag>
                            {i < (data.route?.pathNames?.length ?? 0) - 1 && <Text type="secondary"> → </Text>}
                          </span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <Paragraph type="secondary">
                      选择同楼内起点与终点分区，系统按「最短 + 避堵」给出导诊路径（Dijkstra，边权含拥挤惩罚）。
                    </Paragraph>
                  )}
                </Card>
              </Col>
            </Row>

            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center', fontSize: 12 }}>
              {data.notice}
            </Paragraph>
          </>
        )}

        <Paragraph type="secondary" style={{ marginTop: 8, textAlign: 'center' }}>
          © {new Date().getFullYear()} 杭州健澜科技有限公司 · 自学习与数字孪生（多建筑 / 患者流 / 密度预测 / 路线优化）
        </Paragraph>
      </Content>
    </Layout>
  );
}
