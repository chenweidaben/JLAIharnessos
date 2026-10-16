/**
 * 健澜科技 jlmedaios - M160-B 医院数字孪生 2D 可视化页（仅 admin）
 *
 * 功能：
 *  - 2D 楼层平面图：科室 / 病房 / 手术室 / 急诊，按平面坐标渲染房间矩形；
 *  - 床位状态实时映射（四色）：空 available 绿 / 占 occupied 深海蓝 /
 *    隔离 isolation 橙 / 维护 maintenance 灰；
 *  - 患者位置追踪（脱敏）：P-xxxx 小圆点，不展示姓名/身份证；
 *  - 设备位置标注：呼吸机/监护仪/麻醉机等小图标悬停看名称；
 *  - 楼宇/楼层切换 + 四态汇总 + 占用率。
 *
 * 生产安全：
 *  - 拉取 GET /api/v1/admin/digital-twin/building/:building?floor=
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty。
 *
 * 【远期路线图】3D 化（BIM/Three.js）、WebSocket 实时推送、患者穿戴定位——
 *   本期仅 2D 轮询刷新，不引入 WebSocket。
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

type BedState = 'available' | 'occupied' | 'isolation' | 'maintenance';
type RoomType =
  | 'department'
  | 'ward'
  | 'operating_room'
  | 'er'
  | 'icu'
  | 'nurse_station'
  | 'corridor'
  | 'other';

interface TwinBed {
  bedId: string;
  bedNo: string;
  state: BedState;
  patientRef: string | null;
  x: number;
  y: number;
}

interface TwinEquipment {
  code: string;
  name: string;
  x: number;
  y: number;
}

interface TwinPatientMarker {
  patientRef: string;
  x: number;
  y: number;
}

interface TwinRoom {
  roomId: string;
  buildingId: string;
  floor: string;
  roomCode: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status: BedState;
  beds: TwinBed[];
  equipment: TwinEquipment[];
  patientMarkers: TwinPatientMarker[];
}

interface TwinBuilding {
  buildingId: string;
  buildingName: string;
  floor: string | null;
  floors: string[];
  rooms: TwinRoom[];
  summary: {
    totalRooms: number;
    totalBeds: number;
    available: number;
    occupied: number;
    isolation: number;
    maintenance: number;
    occupancyRate: number;
  };
  demo: boolean;
  generatedAt: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
  grid: '#e6ebf2',
};

/** 床位四态配色（与 bedMap 大屏对齐） */
const BED_COLOR: Record<BedState, string> = {
  available: '#52C41A',
  occupied: '#1E5AA8',
  isolation: '#FA8C16',
  maintenance: '#8C8C8C',
};

const BED_LABEL: Record<BedState, string> = {
  available: '空床',
  occupied: '占床',
  isolation: '隔离',
  maintenance: '维护',
};

/** 房间类型中文标签 */
const ROOM_TYPE_LABEL: Record<RoomType, string> = {
  department: '科室',
  ward: '病房',
  operating_room: '手术室',
  er: '急诊',
  icu: '重症',
  nurse_station: '护士站',
  corridor: '走廊',
  other: '其他',
};

/** 平面网格尺寸（与 BFF 坐标域一致：0..1000 × 0..560） */
const GRID_W = 1000;
const GRID_H = 560;

/** 楼宇选项（与演示台账对齐；生产可从 /admin/hospitals 拉取） */
const BUILDING_OPTIONS = [
  { value: 'main', label: '门诊住院综合楼' },
  { value: 'er-building', label: '急诊楼' },
];

/* --------------------------------- 组件 --------------------------------- */

export default function DigitalTwinPage() {
  const [building, setBuilding] = useState('main');
  const [floor, setFloor] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TwinBuilding | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (b: string, f?: string) => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/v1/admin/digital-twin/building/${b}${f ? `?floor=${encodeURIComponent(f)}` : ''}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载数字孪生布局失败');
        setData(null);
        return;
      }
      setData(json.data as TwinBuilding);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(building, floor);
  }, [building, floor, load]);

  const summary = data?.summary;

  // 切换楼宇时重置楼层（避免残留不存在的楼层）
  const onBuildingChange = (v: string) => {
    setBuilding(v);
    setFloor(undefined);
  };

  const floorOptions = useMemo(
    () =>
      (data?.floors ?? []).map((f) => ({
        value: f,
        label: `${f}F`,
      })),
    [data?.floors],
  );

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            医院数字孪生 · 2D 楼层可视化
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            楼层平面图 / 床位四态映射 / 脱敏患者位置 / 设备标注 · 仅系统管理员可见
            {data?.demo ? '（演示布局）' : ''}
          </Paragraph>
        </div>

        {/* 控制条：楼宇 + 楼层 + 刷新 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text strong style={{ color: VI.deep }}>楼宇</Text>
              <Select
                value={building}
                options={BUILDING_OPTIONS}
                style={{ width: 200, marginLeft: 8 }}
                onChange={onBuildingChange}
              />
            </Col>
            <Col>
              <Text strong style={{ color: VI.deep }}>楼层</Text>
              <Select
                value={floor ?? ''}
                placeholder="全部楼层"
                allowClear
                options={floorOptions}
                style={{ width: 140, marginLeft: 8 }}
                onChange={(v) => setFloor(v || undefined)}
              />
            </Col>
            <Col flex="auto" style={{ textAlign: 'right' }}>
              <Button onClick={() => void load(building, floor)}>刷新</Button>
            </Col>
          </Row>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载数字孪生楼层图中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load(building, floor)}>
                重试
              </Button>
            }
            style={{ marginBottom: 16 }}
          />
        )}

        {!loading && !error && data && summary && (
          <>
            {/* 汇总指标条 */}
            <Card style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col xs={12} sm={4}>
                  <Statistic title="房间数" value={summary.totalRooms} suffix="间" />
                </Col>
                <Col xs={12} sm={4}>
                  <Statistic title="床位数" value={summary.totalBeds} suffix="张" />
                </Col>
                <Col xs={12} sm={4}>
                  <Statistic
                    title="空 / 占 / 隔离 / 维护"
                    value={`${summary.available} / ${summary.occupied} / ${summary.isolation} / ${summary.maintenance}`}
                  />
                </Col>
                <Col xs={12} sm={4}>
                  <Statistic title="占用率" value={summary.occupancyRate} suffix="%" precision={1} />
                </Col>
                <Col xs={24} sm={8}>
                  <Text strong style={{ color: VI.deep }}>图例：</Text>
                  {(Object.keys(BED_COLOR) as BedState[]).map((s) => (
                    <Tag key={s} color={BED_COLOR[s]} style={{ marginLeft: 8 }}>
                      {BED_LABEL[s]}
                    </Tag>
                  ))}
                  <Tag color="default" style={{ marginLeft: 8 }}>设备</Tag>
                  <Tag color="purple" style={{ marginLeft: 8 }}>患者(脱敏)</Tag>
                </Col>
              </Row>
            </Card>

            {/* 2D 楼层平面图 */}
            <Card
              title={
                <span style={{ color: '#fff' }}>
                  {data.buildingName}
                  <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                    {data.floor ? `${data.floor}F` : '全楼层'}
                  </Text>
                </span>
              }
              headStyle={{ background: VI.deep }}
            >
              {data.rooms.length === 0 ? (
                <Paragraph type="secondary" style={{ textAlign: 'center', padding: 32 }}>
                  当前楼宇/楼层暂无布局数据。
                </Paragraph>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    aspectRatio: `${GRID_W} / ${GRID_H}`,
                    background: VI.bg,
                    backgroundImage: `linear-gradient(${VI.grid} 1px, transparent 1px), linear-gradient(90deg, ${VI.grid} 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: `1px solid ${VI.grid}`,
                  }}
                >
                  {data.rooms.map((room) => (
                    <div
                      key={room.roomId}
                      style={{
                        position: 'absolute',
                        left: `${(room.x / GRID_W) * 100}%`,
                        top: `${(room.y / GRID_H) * 100}%`,
                        width: `${(room.width / GRID_W) * 100}%`,
                        height: `${(room.height / GRID_H) * 100}%`,
                        border: `2px solid ${VI.accent}`,
                        background: 'rgba(30,90,168,0.06)',
                        borderRadius: 4,
                        padding: 4,
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ fontSize: 12, color: VI.deep, fontWeight: 600 }}>
                        {room.roomName}
                        <Tag style={{ marginLeft: 6, fontSize: 11, lineHeight: '16px' }}>
                          {ROOM_TYPE_LABEL[room.roomType]}
                        </Tag>
                      </div>

                      {/* 床位四色小方块 */}
                      {room.beds.map((bed) => (
                        <Tooltip key={bed.bedId} title={`${BED_LABEL[bed.state]}${bed.patientRef ? ` · ${bed.patientRef}` : ''}`}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${((bed.x - room.x) / room.width) * 100}%`,
                              top: `${((bed.y - room.y) / room.height) * 100}%`,
                              width: 12,
                              height: 8,
                              background: BED_COLOR[bed.state],
                              borderRadius: 2,
                              cursor: 'pointer',
                            }}
                          />
                        </Tooltip>
                      ))}

                      {/* 设备标注 */}
                      {room.equipment.map((eq) => (
                        <Tooltip key={eq.code} title={`设备：${eq.name}（${eq.code}）`}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${((eq.x - room.x) / room.width) * 100}%`,
                              top: `${((eq.y - room.y) / room.height) * 100}%`,
                              width: 10,
                              height: 10,
                              borderRadius: '50%',
                              background: '#fff',
                              border: `2px solid ${VI.deep}`,
                            }}
                          />
                        </Tooltip>
                      ))}

                      {/* 脱敏患者位置 */}
                      {room.patientMarkers.map((p) => (
                        <Tooltip key={p.patientRef} title={`患者 ${p.patientRef}（脱敏位置）`}>
                          <div
                            style={{
                              position: 'absolute',
                              left: `${((p.x - room.x) / room.width) * 100}%`,
                              top: `${((p.y - room.y) / room.height) * 100}%`,
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: '#722ED1',
                              border: '1px solid #fff',
                            }}
                          />
                        </Tooltip>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                平面坐标为 0..1000 归一化网格 · 数据更新于{' '}
                {new Date(data.generatedAt).toLocaleString('zh-CN')}
              </Paragraph>
            </Card>

            {/* 页脚版权 */}
            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
              © {new Date().getFullYear()} 杭州健澜科技有限公司 · 数字孪生 2D（远期：3D BIM / WebSocket 实时推送）
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
