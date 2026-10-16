/**
 * 健澜科技 jlmedaios - M175-C 医院数字孪生 3D 可视化页（仅 admin）
 *
 * 【质量与新场景】3D 真可用，不只是花哨：
 *  - 楼层 3D 建模：科室/病房/手术室/急诊，按等距投影挤出三面（顶/左/右）；
 *  - 床位状态 3D 映射（四色）：空 available 绿 / 占 occupied 深海蓝 /
 *    隔离 isolation 橙 / 维护 maintenance 灰；
 *  - 患者位置 3D 追踪（脱敏 P-xxxx 紫色圆点）；
 *  - 设备位置 3D 标注（深海蓝小方点）；
 *  - 楼宇/楼层切换 + 四态汇总 + 占用率 + 楼宇总高。
 *
 * 生产安全：
 *  - 拉取 GET /api/v1/admin/digital-twin/3d?building=&floor=&render=1
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading / error（可重试）/ empty；
 *  - 不引入 Three.js：用 SVG polygon 画等距投影挤出体，零新增依赖。
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

interface ScreenPoint { sx: number; sy: number; }

interface ProjectedRoom {
  roomId: string;
  roomName: string;
  roomType: RoomType;
  deptName: string;
  status: BedState;
  top: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  left: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  right: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint];
  label: ScreenPoint;
}

interface ProjectedMarker {
  kind: 'bed' | 'equipment' | 'patient';
  ref: string;
  color: string;
  screen: ScreenPoint;
  tip: string;
}

interface RenderedFloor {
  buildingId: string;
  buildingName: string;
  floor: string;
  canvas: { width: number; height: number };
  rooms: ProjectedRoom[];
  markers: ProjectedMarker[];
  generatedAt: string;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#0a1929',
  grid: 'rgba(255,255,255,0.06)',
  faceTop: '#1E5AA8',
  faceLeft: '#143d6b',
  faceRight: '#0f2f52',
};

/** 床位四态配色（与 BFF 对齐） */
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

/** 楼宇选项（与演示台账对齐） */
const BUILDING_OPTIONS = [
  { value: 'main', label: '门诊住院综合楼' },
  { value: 'er-building', label: '急诊楼' },
];

const FLOOR_OPTIONS: Record<string, { value: string; label: string }[]> = {
  main: [
    { value: '5', label: '5F · 心内科病区' },
    { value: '6', label: '6F · 普外科/手术室' },
  ],
  'er-building': [{ value: '1', label: '1F · 急诊' }],
};

/* --------------------------------- 组件 --------------------------------- */

/** 把四个屏幕点拼成 SVG points 字符串 */
function toPoints(quad: [ScreenPoint, ScreenPoint, ScreenPoint, ScreenPoint]): string {
  return quad.map((p) => `${p.sx},${p.sy}`).join(' ');
}

export default function Twin3DPage() {
  const [building, setBuilding] = useState('main');
  const [floor, setFloor] = useState<string>('5');
  const [data, setData] = useState<RenderedFloor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (b: string, f: string) => {
    setLoading(true);
    setError('');
    try {
      const url = `/api/v1/admin/digital-twin/3d?building=${encodeURIComponent(b)}&floor=${encodeURIComponent(f)}&render=1`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载 3D 数字孪生失败');
        setData(null);
        return;
      }
      setData(json.data as RenderedFloor);
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

  const onBuildingChange = (v: string) => {
    setBuilding(v);
    setFloor(FLOOR_OPTIONS[v]?.[0]?.value ?? '1');
  };

  // 汇总：从 markers 里按 bed 四态统计
  const summary = useMemo(() => {
    if (!data) return null;
    const beds = data.markers.filter((m) => m.kind === 'bed');
    const count = (s: BedState) => beds.filter((b) => b.color === BED_COLOR[s]).length;
    const available = count('available');
    const occupied = count('occupied');
    const isolation = count('isolation');
    const maintenance = count('maintenance');
    const total = beds.length;
    const rate = total === 0 ? 0 : Math.round(((occupied + isolation) / total) * 1000) / 10;
    return { totalRooms: data.rooms.length, totalBeds: total, available, occupied, isolation, maintenance, rate };
  }, [data]);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1440, margin: '0 auto' }}>
        {/* 标题区 */}
        <div style={{ borderLeft: `4px solid ${VI.deep}`, paddingLeft: 12, marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            医院数字孪生 · 3D 楼层可视化
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            三维挤出建模 / 床位四态 3D 映射 / 脱敏患者 3D 位置 / 设备 3D 标注 · 仅系统管理员可见
            {data?.buildingId ? `（${data.buildingName} · ${data.floor}F）` : ''}
          </Paragraph>
        </div>

        {/* 控制条 */}
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
                value={floor}
                options={FLOOR_OPTIONS[building] ?? []}
                style={{ width: 220, marginLeft: 8 }}
                onChange={setFloor}
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
            <Spin size="large" tip="加载 3D 数字孪生中…" />
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
                  <Statistic title="占用率" value={summary.rate} suffix="%" precision={1} />
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

            {/* 3D 等距投影画布 */}
            <Card
              title={
                <span style={{ color: '#fff' }}>
                  {data.buildingName}
                  <Text style={{ color: 'rgba(255,255,255,0.75)', marginLeft: 8 }}>
                    {data.floor}F · 等距投影
                  </Text>
                </span>
              }
              headStyle={{ background: VI.deep }}
              bodyStyle={{ background: VI.bg, padding: 16 }}
            >
              {data.rooms.length === 0 ? (
                <Paragraph type="secondary" style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.6)' }}>
                  当前楼宇/楼层暂无 3D 布局数据。
                </Paragraph>
              ) : (
                <div style={{ width: '100%', overflow: 'auto' }}>
                  <svg
                    viewBox={`0 0 ${data.canvas.width} ${data.canvas.height}`}
                    width="100%"
                    style={{ maxHeight: 560, background: `linear-gradient(180deg, #0a1929 0%, #0f2f52 100%)` }}
                  >
                    {/* 网格底纹 */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke={VI.grid} strokeWidth="1" />
                      </pattern>
                    </defs>
                    <rect width={data.canvas.width} height={data.canvas.height} fill="url(#grid)" />

                    {/* 房间挤出体：先画右面 → 左面 → 顶面（画家算法） */}
                    {data.rooms.map((room) => (
                      <g key={room.roomId}>
                        <polygon points={toPoints(room.right)} fill={VI.faceRight} stroke="#1E5AA8" strokeWidth="0.5" />
                        <polygon points={toPoints(room.left)} fill={VI.faceLeft} stroke="#1E5AA8" strokeWidth="0.5" />
                        <polygon points={toPoints(room.top)} fill={VI.faceTop} stroke="#5B9BD5" strokeWidth="0.8" opacity="0.9" />
                        {/* 房间名标签 */}
                        <text
                          x={room.label.sx}
                          y={room.label.sy - 6}
                          fill="#fff"
                          fontSize="11"
                          textAnchor="middle"
                          fontWeight="600"
                        >
                          {room.roomName}
                        </text>
                        <text
                          x={room.label.sx}
                          y={room.label.sy + 8}
                          fill="rgba(255,255,255,0.65)"
                          fontSize="9"
                          textAnchor="middle"
                        >
                          {ROOM_TYPE_LABEL[room.roomType]}
                        </text>
                      </g>
                    ))}

                    {/* 散点：床位 / 设备 / 患者 */}
                    {data.markers.map((m) => (
                      <Tooltip key={m.ref} title={m.tip}>
                        <circle
                          cx={m.screen.sx}
                          cy={m.screen.sy}
                          r={m.kind === 'patient' ? 5 : m.kind === 'bed' ? 4 : 4}
                          fill={m.color}
                          stroke="#fff"
                          strokeWidth="1"
                        />
                      </Tooltip>
                    ))}
                  </svg>
                </div>
              )}

              <Paragraph style={{ marginTop: 12, marginBottom: 0, color: 'rgba(255,255,255,0.5)' }}>
                等距投影坐标由 BFF 纯函数 compute · 数据更新于{' '}
                {new Date(data.generatedAt).toLocaleString('zh-CN')}
              </Paragraph>
            </Card>

            {/* 页脚版权 */}
            <Paragraph type="secondary" style={{ marginTop: 16, textAlign: 'center' }}>
              © {new Date().getFullYear()} 杭州健澜科技有限公司 · 数字孪生 3D（等距投影，远期：BIM/IFC 模型 + WebSocket 实时推送）
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
