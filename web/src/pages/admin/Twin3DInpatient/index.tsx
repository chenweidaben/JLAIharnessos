/**
 * 健澜科技 jlmedaios - v5.0启动 数字孪生 3D 住院试点页（M182-D，仅 admin）
 *
 * 【v5.0 路线图 · 数字孪生 3D 深化】先住院试点，不做全院重建：
 *  - 住院楼 3D 楼层图：病房 / 护士站 / 治疗室 / 配药室；
 *  - 床位状态 3D 实时映射（四色）：空 绿 / 占 深海蓝 / 隔离 橙 / 出院准备 青；
 *  - 护士站工作负荷监控：当前待执行医嘱 / 待执行护理任务 / 负荷等级；
 *  - 患者流动仿真：入院 → 住院 → 治疗 → 出院准备 → 出院。
 *
 * 生产安全：
 *  - 拉取 GET /api/v1/admin/digital-twin/v2/inpatient（?action=twin|beds|flow&scenario=）
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 不引入 Three.js：用 SVG 画楼层图与床位散点，零新增依赖。
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
  Row,
  Select,
  Spin,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type InpatientBedState = 'available' | 'occupied' | 'isolation' | 'discharge_ready';
type InpatientRoomType = 'ward' | 'nurse_station' | 'treatment_room' | 'dispensing_room' | 'corridor';
type InpatientStage = 'admission' | 'inpatient' | 'treatment' | 'discharge_ready' | 'discharge';

interface TwinVec3 { x: number; y: number; z: number; }
interface TwinBox3 { min: TwinVec3; max: TwinVec3; }

interface InpatientBed3D {
  bedId: string;
  bedNo: string;
  state: InpatientBedState;
  patientRef: string | null;
  position: TwinVec3;
  color: string;
}

interface InpatientRoom3D {
  roomId: string;
  floor: string;
  roomCode: string;
  roomName: string;
  roomType: InpatientRoomType;
  deptName: string;
  box: TwinBox3;
  beds: InpatientBed3D[];
}

interface NurseStationLoad {
  stationName: string;
  floor: string;
  deptName: string;
  pendingOrders: number;
  pendingNursingTasks: number;
  staffOnDuty: number;
  loadLevel: 'idle' | 'normal' | 'busy' | 'overload';
  position: TwinVec3;
}

interface InpatientFloor3D {
  floor: string;
  z: number;
  rooms: InpatientRoom3D[];
  nurseStation: NurseStationLoad;
}

interface InpatientTwin {
  buildingId: string;
  buildingName: string;
  pilot: boolean;
  floors: InpatientFloor3D[];
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    dischargeReady: number;
    occupancyRate: number;
  };
  generatedAt: string;
}

interface CensusPoint { t: number; inpatient: number; awaitingDischarge: number; }

interface InpatientFlowResult {
  scenario: 'normal' | 'busy' | 'surge';
  days: number;
  admissionsPerDay: number;
  dischargesPerDay: number;
  avgLOSDays: number;
  censusCurve: CensusPoint[];
  bottleneck: { stage: InpatientStage; avgStayDays: number };
  note: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#0a1929',
  grid: 'rgba(255,255,255,0.06)',
};

/** 床位四态配色（与 BFF 对齐） */
const BED_COLOR: Record<InpatientBedState, string> = {
  available: '#52C41A',
  occupied: '#1E5AA8',
  isolation: '#FA8C16',
  discharge_ready: '#13C2C2',
};

const BED_LABEL: Record<InpatientBedState, string> = {
  available: '空床',
  occupied: '占床',
  isolation: '隔离',
  discharge_ready: '出院准备',
};

const ROOM_TYPE_FILL: Record<InpatientRoomType, string> = {
  ward: '#143d6b',
  nurse_station: '#1E5AA8',
  treatment_room: '#0f5f6b',
  dispensing_room: '#2a6db0',
  corridor: 'transparent',
};

const ROOM_TYPE_LABEL: Record<InpatientRoomType, string> = {
  ward: '病房',
  nurse_station: '护士站',
  treatment_room: '治疗室',
  dispensing_room: '配药室',
  corridor: '走廊',
};

const LOAD_TAG: Record<NurseStationLoad['loadLevel'], string> = {
  idle: 'green',
  normal: 'blue',
  busy: 'orange',
  overload: 'red',
};

const LOAD_LABEL: Record<NurseStationLoad['loadLevel'], string> = {
  idle: '空闲',
  normal: '正常',
  busy: '繁忙',
  overload: '过载',
};

const FLOOR_OPTIONS = [
  { value: '7', label: '7F · 心血管内科病区' },
  { value: '8', label: '8F · 普通外科病区' },
];

const SCENARIO_OPTIONS = [
  { value: 'normal', label: '常态' },
  { value: 'busy', label: '忙碌' },
  { value: 'surge', label: '高峰' },
];

const STAGE_LABEL: Record<InpatientStage, string> = {
  admission: '入院',
  inpatient: '住院',
  treatment: '治疗',
  discharge_ready: '出院准备',
  discharge: '出院',
};

/** SVG 世界画布（与 BFF 网格 0..1000 × 0..560 对齐） */
const WORLD = { w: 1000, h: 560 };

/* --------------------------------- 组件 --------------------------------- */

export default function Twin3DInpatientPage() {
  const [floor, setFloor] = useState<string>('7');
  const [twin, setTwin] = useState<InpatientTwin | null>(null);
  const [flow, setFlow] = useState<InpatientFlowResult | null>(null);
  const [scenario, setScenario] = useState<'normal' | 'busy' | 'surge'>('normal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTwin = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/digital-twin/v2/inpatient');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载住院 3D 数字孪生失败');
        setTwin(null);
        return;
      }
      setTwin(json.data as InpatientTwin);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setTwin(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFlow = useCallback(async (sc: 'normal' | 'busy' | 'surge') => {
    try {
      const resp = await fetch(
        `/api/v1/admin/digital-twin/v2/inpatient?action=flow&scenario=${encodeURIComponent(sc)}`,
      );
      const json = await resp.json();
      if (json.code === 0) setFlow(json.data as InpatientFlowResult);
    } catch {
      /* 仿真面板失败不阻断主视图 */
    }
  }, []);

  useEffect(() => {
    void loadTwin();
  }, [loadTwin]);

  useEffect(() => {
    void loadFlow(scenario);
  }, [scenario, loadFlow]);

  const currentFloor = useMemo(
    () => twin?.floors.find((f) => f.floor === floor) ?? twin?.floors[0] ?? null,
    [twin, floor],
  );

  // 在院曲线 → SVG polyline points
  const curvePoints = useMemo(() => {
    if (!flow || flow.censusCurve.length === 0) return '';
    const maxCount = Math.max(
      10,
      ...flow.censusCurve.map((p) => p.inpatient + p.awaitingDischarge),
    );
    return flow.censusCurve
      .map((p) => {
        const sx = (p.t / (flow.days - 1)) * 960 + 20;
        const sy = 120 - ((p.inpatient + p.awaitingDischarge) / maxCount) * 100;
        return `${sx},${sy}`;
      })
      .join(' ');
  }, [flow]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            数字孪生 3D · 住院试点
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            住院楼楼层图 / 床位四态 3D 映射 / 护士站工作负荷 / 入院→出院流仿真 · v5.0 先住院试点，不做全院重建
            {twin ? `（${twin.buildingName}）` : ''}
          </Paragraph>
        </div>

        {/* 控制条 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong style={{ color: VI.deep }}>楼层</Text>
              <Select
                value={floor}
                options={FLOOR_OPTIONS}
                style={{ width: 220, marginLeft: 8 }}
                onChange={setFloor}
              />
            </Col>
            <Col>
              <Text strong style={{ color: VI.deep }}>仿真情景</Text>
              <Select
                value={scenario}
                options={SCENARIO_OPTIONS}
                style={{ width: 140, marginLeft: 8 }}
                onChange={setScenario}
              />
            </Col>
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Button onClick={() => void loadTwin()}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载住院 3D 数字孪生中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void loadTwin()}>
                重试
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {!loading && !error && twin && currentFloor && (
          <>
            {/* 汇总指标条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={12} sm={4}>
                  <Statistic title="房间数" value={twin.summary.totalRooms} suffix="间" />
                </Col>
                <Col xs={12} sm={4}>
                  <Statistic title="床位数" value={twin.summary.totalBeds} suffix="张" />
                </Col>
                <Col xs={12} sm={5}>
                  <Statistic
                    title="空 / 占 / 隔离 / 出院准备"
                    value={`${twin.summary.available} / ${twin.summary.occupied} / ${twin.summary.isolation} / ${twin.summary.dischargeReady}`}
                  />
                </Col>
                <Col xs={12} sm={4}>
                  <Statistic title="全院占用率" value={twin.summary.occupancyRate} suffix="%" precision={1} />
                </Col>
                <Col xs={24} sm={7}>
                  <Text strong style={{ color: VI.deep }}>图例：</Text>
                  {(Object.keys(BED_COLOR) as InpatientBedState[]).map((s) => (
                    <Tag key={s} color={BED_COLOR[s]} style={{ marginLeft: 8 }}>
                      {BED_LABEL[s]}
                    </Tag>
                  ))}
                </Col>
              </Row>
            </Card>

            {/* 护士站工作负荷监控 */}
            <Card title={<span style={{ color: '#fff' }}>护士站工作负荷监控</span>}
              headStyle={{ background: VI.deep }} bodyStyle={{ background: VI.bg }}
              style={{ marginBottom: 16 }}
            >
              <Row gutter={16}>
                <Col xs={24} sm={8}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16 }}>
                    <Text style={{ color: '#fff' }} strong>{currentFloor.nurseStation.stationName}</Text>
                    <div style={{ marginTop: 12 }}>
                      <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>待执行医嘱</span>}
                        valueStyle={{ color: '#fff' }} value={currentFloor.nurseStation.pendingOrders} suffix="条" />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Statistic title={<span style={{ color: 'rgba(255,255,255,0.65)' }}>待执行护理任务</span>}
                        valueStyle={{ color: '#fff' }} value={currentFloor.nurseStation.pendingNursingTasks} suffix="项" />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ color: 'rgba(255,255,255,0.65)' }}>在岗护士 {currentFloor.nurseStation.staffOnDuty} 人 · </Text>
                      <Tag color={LOAD_TAG[currentFloor.nurseStation.loadLevel]}>
                        {LOAD_LABEL[currentFloor.nurseStation.loadLevel]}
                      </Tag>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={16}>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.75)', marginBottom: 8 }}>
                    负荷口径：任务强度 =（待执行医嘱 × 0.5 + 护理任务）÷ 在岗护士；
                    &lt;3 空闲 / &lt;6 正常 / &lt;10 繁忙 / ≥10 过载。
                  </Paragraph>
                  <Paragraph style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 0 }}>
                    {currentFloor.floor}F · {currentFloor.nurseStation.deptName} —— 超负荷时建议调度增援或加快出院准备周转。
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            {/* 3D 楼层图 */}
            <Card
              title={
                <span style={{ color: '#fff' }}>
                  {twin.buildingName}
                  <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                    {currentFloor.floor}F · 楼层图（病房/护士站/治疗室/配药室）
                  </Text>
                </span>
              }
              headStyle={{ background: VI.deep }}
              bodyStyle={{ background: VI.bg, padding: 16 }}
            >
              <div style={{ width: '100%', overflow: 'auto' }}>
                <svg viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} width="100%"
                  style={{ maxHeight: 520, background: `linear-gradient(180deg, #0a1929 0%, #0f2f52 100%)` }}>
                  <defs>
                    <pattern id="ip-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <path d="M 40 0 L 0 0 0 40" fill="none" stroke={VI.grid} strokeWidth="1" />
                    </pattern>
                  </defs>
                  <rect width={WORLD.w} height={WORLD.h} fill="url(#ip-grid)" />

                  {/* 房间块 */}
                  {currentFloor.rooms.map((room) => {
                    const { min, max } = room.box;
                    return (
                      <g key={room.roomId}>
                        <rect
                          x={min.x} y={min.y} width={max.x - min.x} height={max.y - min.y}
                          fill={ROOM_TYPE_FILL[room.roomType]} stroke="#5B9BD5" strokeWidth="1" opacity="0.92"
                        />
                        <text x={(min.x + max.x) / 2} y={min.y + 18} fill="#fff" fontSize="12"
                          textAnchor="middle" fontWeight="600">
                          {room.roomName}
                        </text>
                        <text x={(min.x + max.x) / 2} y={min.y + 32} fill="rgba(255,255,255,0.6)" fontSize="9"
                          textAnchor="middle">
                          {ROOM_TYPE_LABEL[room.roomType]}
                        </text>
                      </g>
                    );
                  })}

                  {/* 床位散点 */}
                  {currentFloor.rooms.flatMap((room) =>
                    room.beds.map((bed) => (
                      <Tooltip key={bed.bedId} title={`${room.roomName} · ${bed.bedNo}床 · ${BED_LABEL[bed.state]}${bed.patientRef ? ` · ${bed.patientRef}` : ''}`}>
                        <circle cx={bed.position.x} cy={bed.position.y} r="5"
                          fill={bed.color} stroke="#fff" strokeWidth="1" />
                      </Tooltip>
                    )),
                  )}
                </svg>
              </div>
              <Paragraph style={{ marginTop: 12, marginBottom: 0, color: 'rgba(255,255,255,0.5)' }}>
                数据更新于 {new Date(twin.generatedAt).toLocaleString('zh-CN')} · 患者位置仅脱敏标识 P-xxxx
              </Paragraph>
            </Card>

            {/* 住院流仿真 */}
            <Card style={{ marginTop: 16 }} title="患者流动仿真（入院 → 住院 → 治疗 → 出院准备 → 出院）">
              {flow ? (
                <Row gutter={16}>
                  <Col xs={24} sm={6}>
                    <Statistic title="日均入院" value={flow.admissionsPerDay} suffix="人" precision={1} />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic title="日均出院" value={flow.dischargesPerDay} suffix="人" precision={1} />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic title="平均住院日" value={flow.avgLOSDays} suffix="天" precision={1} />
                  </Col>
                  <Col xs={24} sm={6}>
                    <Statistic title="瓶颈阶段" value={STAGE_LABEL[flow.bottleneck.stage]}
                      suffix={`${flow.bottleneck.avgStayDays}天`} />
                  </Col>
                  <Col span={24}>
                    <div style={{ marginTop: 16 }}>
                      <Text strong style={{ color: VI.deep }}>30 天在院人数曲线：</Text>
                      <svg viewBox="0 0 1000 140" width="100%" style={{ background: '#f5f7fa', borderRadius: 8 }}>
                        <polyline points={curvePoints} fill="none" stroke={VI.accent} strokeWidth="2" />
                      </svg>
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                        {flow.note}
                      </Paragraph>
                    </div>
                  </Col>
                </Row>
              ) : (
                <Spin size="small" />
              )}
            </Card>

            {/* 页脚版权 */}
            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
              © {new Date().getFullYear()} 杭州健澜科技有限公司 · 数字孪生 3D 住院试点（远期：BIM/IFC 模型 + WebSocket 实时推送）
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
