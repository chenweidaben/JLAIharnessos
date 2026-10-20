/**
 * 健澜科技 jlmedaios - 全院床位图（护理大屏）
 *
 * 按科室/楼层分组的床位网格：空床=绿 / 占床=蓝 / 隔离=橙 / 维护=灰。
 * 点击床位弹出患者详情 Drawer（脱敏）。无真实床位时由后端返回 demo:true 演示行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Descriptions, Drawer, Layout, Space, Spin, Table, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { groupBedsByRoom, useBedMapStore } from '@/store/bedMapStore';
import {
  BED_STATUS_COLOR,
  BED_STATUS_LABEL,
  type BedMapRow,
  type BedMapStatus,
  type RoomGroup,
} from '@/types/bedMap';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

interface WardSection {
  wardName: string;
  department: string;
  floors: { floor: string; rooms: RoomGroup[] }[];
}

/** 把房间组再按科室（病区）-> 楼层聚合，供大屏分块渲染。 */
function groupByWard(groups: RoomGroup[]): WardSection[] {
  const wards = new Map<string, WardSection>();
  for (const g of groups) {
    let w = wards.get(g.wardName);
    if (!w) {
      w = { wardName: g.wardName, department: g.department, floors: [] };
      wards.set(g.wardName, w);
    }
    let floorBlock = w.floors.find((f) => f.floor === g.floor);
    if (!floorBlock) {
      floorBlock = { floor: g.floor, rooms: [] };
      w.floors.push(floorBlock);
    }
    floorBlock.rooms.push(g);
  }
  return [...wards.values()];
}

/* ------------------------------------------------------------------ */
/* v5.0试点扩展（M197护士药师工作流）：床位患者详情 Drawer               */
/* 点击占床床位时，在 Drawer 中补 入院/当前诊断 / 护理等级 / 今日医嘱 5 条 */
/* / 24h 体温·血压·心率三联体征曲线（SVG，无新增图表依赖）              */
/* ------------------------------------------------------------------ */
interface BedOrder {
  content: string;
  execTime: string;
  status: '待执行' | '已执行' | '执行中';
}

interface BedClinical {
  admissionDiagnosis: string;
  currentDiagnosis: string;
  nursingLevel: string;
  vitals: { temp: string; hr: string; bp: string; rr: string; updatedAt: string };
  /** 24h 体温序列（每 2h 一个点，共 12 个采样点） */
  tempSeries: number[];
  /** 24h 收缩压序列（mmHg） */
  sbpSeries: number[];
  /** 24h 心率序列（次/分） */
  hrSeries: number[];
  /** 今日医嘱 5 条（DEMO mock） */
  todayOrders: BedOrder[];
}

const MOCK_ADMISSION_DIAGNOSES = [
  '社区获得性肺炎（右肺中叶）', '2型糖尿病伴血糖控制不佳',
  '冠状动脉粥样硬化性心脏病 不稳定型心绞痛', '高血压病3级（很高危）',
  '急性化脓性阑尾炎 术后第3天', '脑梗死恢复期（左侧肢体乏力）',
];
const MOCK_CURRENT_DIAGNOSES = [
  '社区获得性肺炎（治疗中）', '2型糖尿病 血糖趋于平稳',
  '冠心病 心绞痛缓解期', '高血压病3级 血压控制中',
  '阑尾切除术后 切口愈合良好', '脑梗死恢复期 康复训练中',
];
const MOCK_NURSING_LEVELS = ['特级护理', '一级护理', '二级护理', '三级护理'];

/** v5.0试点扩展（M197护士药师工作流）：今日医嘱 mock 词表（每床确定性取 5 条） */
const MOCK_ORDER_POOL: Omit<BedOrder, 'status'>[] = [
  { content: '头孢呋辛钠 1.5g ivgtt q12h', execTime: '08:00 / 20:00' },
  { content: '0.9% 氯化钠 100ml ivgtt qd', execTime: '09:00' },
  { content: '阿司匹林肠溶片 100mg po qd', execTime: '07:30（饭后）' },
  { content: '二甲双胍片 0.5g po tid', execTime: '08:00 / 12:00 / 18:00（餐中）' },
  { content: '心电监护 q4h', execTime: '06:00 / 10:00 / 14:00 / 18:00 / 22:00' },
  { content: '雾化吸入 氨溴索 30mg bid', execTime: '10:00 / 16:00' },
  { content: '测指尖血糖 ac + hs', execTime: '07:00 / 11:00 / 17:00 / 22:00' },
  { content: '物理降温（体温>38.5℃时）', execTime: '按需' },
];

/** 依据 bedId 确定性生成 DEMO 临床详情（待后端聚合器接入真实体征后替换）。 */
function mockClinicalDetail(bed: BedMapRow): BedClinical | null {
  if (!bed.patient) return null;
  let h = 0;
  for (const ch of bed.bedId) h = (h * 31 + ch.charCodeAt(0)) % 997;
  const admissionDiagnosis = MOCK_ADMISSION_DIAGNOSES[h % MOCK_ADMISSION_DIAGNOSES.length];
  const currentDiagnosis = MOCK_CURRENT_DIAGNOSES[h % MOCK_CURRENT_DIAGNOSES.length];
  const nursingLevel = MOCK_NURSING_LEVELS[(h >> 3) % MOCK_NURSING_LEVELS.length];
  const base = 36.3 + (h % 5) * 0.18;
  const tempSeries = Array.from({ length: 12 }, (_, i) =>
    +(base + Math.sin(i / 1.8) * 0.25 + ((h + i) % 3) * 0.06).toFixed(1),
  );
  const sbpSeries = Array.from({ length: 12 }, (_, i) =>
    Math.round(118 + Math.sin(i / 2.2 + h) * 8 + ((h + i) % 4) * 2),
  );
  const hrSeries = Array.from({ length: 12 }, (_, i) =>
    Math.round(76 + Math.cos(i / 1.6 + h) * 9 + ((h + i) % 3) * 2),
  );
  // v5.0试点扩展（M197护士药师工作流）：今日医嘱 5 条（按 bedId hash 确定性切片 + 状态轮换）
  const statusCycle: BedOrder['status'][] = ['已执行', '执行中', '待执行', '已执行', '待执行'];
  const start = h % (MOCK_ORDER_POOL.length - 5 + 1);
  const todayOrders = Array.from({ length: 5 }, (_, i) => ({
    ...MOCK_ORDER_POOL[(start + i) % MOCK_ORDER_POOL.length],
    status: statusCycle[(h + i) % statusCycle.length],
  }));
  return {
    admissionDiagnosis,
    currentDiagnosis,
    nursingLevel,
    vitals: {
      temp: `${(tempSeries[tempSeries.length - 1]).toFixed(1)} ℃`,
      hr: `${hrSeries[hrSeries.length - 1]} 次/分`,
      bp: `${sbpSeries[sbpSeries.length - 1]}/${70 + (h % 12)} mmHg`,
      rr: `${16 + (h % 6)} 次/分`,
      updatedAt: '今日 06:00',
    },
    tempSeries,
    sbpSeries,
    hrSeries,
    todayOrders,
  };
}

/** 通用 24h 体征折线图（手写 SVG，无新增图表依赖）。 */
function VitalsCurve({
  series,
  min,
  max,
  unit,
  color,
}: {
  series: number[];
  min: number;
  max: number;
  unit: string;
  color: string;
}) {
  const W = 520;
  const H = 110;
  const padX = 36;
  const padY = 12;
  const n = series.length;
  const x = (i: number) => padX + (i * (W - padX * 2)) / (n - 1);
  const y = (v: number) => padY + ((max - v) * (H - padY * 2)) / (max - min);
  const points = series.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const gridStep = (max - min) / 3;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#fafafa', borderRadius: 6 }}>
      {[min + gridStep, min + gridStep * 2, min + gridStep * 3].map((g) => (
        <g key={g}>
          <line x1={padX} x2={W - padX} y1={y(g)} y2={y(g)} stroke="#eee" />
          <text x={4} y={y(g) + 3} fontSize={9} fill="#999">{Math.round(g)}</text>
        </g>
      ))}
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      {series.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r={2.5} fill={color} />
      ))}
      <text x={W - padX - 20} y={H - 2} fontSize={9} fill="#999">{unit}</text>
    </svg>
  );
}

function BedTile({ bed, onClick }: { bed: BedMapRow; onClick: (b: BedMapRow) => void }) {
  const color = BED_STATUS_COLOR[bed.status];
  return (
    <div
      onClick={() => onClick(bed)}
      title={`${bed.roomNo}-${bed.bedNo}床 · ${BED_STATUS_LABEL[bed.status]}`}
      style={{
        width: 72,
        height: 60,
        borderRadius: 8,
        background: color,
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        fontWeight: 600,
      }}
    >
      <span style={{ fontSize: 16 }}>{bed.bedNo}</span>
      <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.9 }}>床</span>
    </div>
  );
}

const ORDER_STATUS_COLOR: Record<BedOrder['status'], string> = {
  已执行: 'green',
  执行中: 'blue',
  待执行: 'orange',
};

export default function BedMapPage() {
  const { loading, error, demo, rows, summary, updatedAt, load } = useBedMapStore();
  usePermission();
  const [selected, setSelected] = useState<BedMapRow | null>(null);

  useEffect(() => { void load(); }, [load]);

  const groups = useMemo(() => groupBedsByRoom(rows), [rows]);
  const wards = useMemo(() => groupByWard(groups), [groups]);
  // v5.0试点扩展（M197护士药师工作流）：占床患者详情（诊断/护理等级/今日医嘱/三联体征曲线）
  const clinicalDetail = selected ? mockClinicalDetail(selected) : null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>全院床位图</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {demo && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="当前为演示数据"
            description="未检索到真实床位，展示内置演示行（覆盖空/占/隔离/维护四态）。"
          />
        )}

        <Space size="large" style={{ marginBottom: 16 }} wrap>
          {/* 图例 */}
          {(Object.keys(BED_STATUS_LABEL) as BedMapStatus[]).map((s) => (
            <Space key={s} size={6}>
              <span style={{
                display: 'inline-block', width: 14, height: 14,
                borderRadius: 3, background: BED_STATUS_COLOR[s],
              }} />
              <Text>{BED_STATUS_LABEL[s]}</Text>
            </Space>
          ))}
          {summary && (
            <Text type="secondary">
              共 {summary.total} 床｜空 {summary.available}｜占 {summary.occupied}
              ｜隔离 {summary.isolation}｜维护 {summary.maintenance}
            </Text>
          )}
          {updatedAt && <Text type="secondary">更新于 {new Date(updatedAt).toLocaleTimeString()}</Text>}
        </Space>

        <Spin spinning={loading}>
          {wards.map((w) => (
            <Card
              key={w.wardName}
              size="small"
              style={{ marginBottom: 16 }}
              title={<Space><Text strong>{w.wardName}</Text><Tag>{w.department}</Tag></Space>}
            >
              {w.floors.map((f) => (
                <div key={f.floor} style={{ marginBottom: 12 }}>
                  <Text type="secondary" style={{ marginBottom: 8, display: 'inline-block' }}>
                    {f.floor} 楼
                  </Text>
                  <Space size={16} wrap>
                    {f.rooms.map((room) => (
                      <div key={room.key} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{room.roomNo} 房</Text>
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          {room.beds.map((bed) => (
                            <BedTile key={bed.bedId} bed={bed} onClick={setSelected} />
                          ))}
                        </div>
                      </div>
                    ))}
                  </Space>
                </div>
              ))}
            </Card>
          ))}
        </Spin>
      </Content>

      {/* v5.0试点扩展（M197护士药师工作流）：床位患者详情 Drawer（由 M190 Modal 升级） */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        width={640}
        title={selected ? `${selected.roomNo}-${selected.bedNo} 床 · 患者详情` : ''}
      >
        {selected && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Space>
              <Tag color={BED_STATUS_COLOR[selected.status]}>
                {BED_STATUS_LABEL[selected.status]}
              </Tag>
              <Text type="secondary">{selected.wardName} · {selected.department}</Text>
            </Space>
            {selected.patient ? (
              <>
                {/* 患者基本信息 */}
                <Descriptions size="small" column={2} bordered title="患者基本信息">
                  <Descriptions.Item label="床号">{selected.roomNo}-{selected.bedNo}</Descriptions.Item>
                  <Descriptions.Item label="姓名">{selected.patient.name}</Descriptions.Item>
                  <Descriptions.Item label="性别">{selected.patient.gender}</Descriptions.Item>
                  <Descriptions.Item label="年龄">
                    {selected.patient.age != null ? `${selected.patient.age} 岁` : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="住院号" span={2}>
                    {selected.patient.patientId}
                  </Descriptions.Item>
                </Descriptions>

                {/* v5.0试点扩展（M197护士药师工作流）：入院诊断 + 当前诊断 + 护理等级 Tag */}
                {clinicalDetail && (
                  <>
                    <Descriptions size="small" column={1} bordered title="诊断与护理等级">
                      <Descriptions.Item label="入院诊断">
                        {clinicalDetail.admissionDiagnosis}
                      </Descriptions.Item>
                      <Descriptions.Item label="当前诊断">
                        <Text strong>{clinicalDetail.currentDiagnosis}</Text>
                      </Descriptions.Item>
                      <Descriptions.Item label="护理等级">
                        <Tag
                          color={
                            clinicalDetail.nursingLevel === '特级护理' ? 'red'
                            : clinicalDetail.nursingLevel === '一级护理' ? 'orange'
                            : clinicalDetail.nursingLevel === '二级护理' ? 'blue'
                            : 'default'
                          }
                        >
                          {clinicalDetail.nursingLevel}
                        </Tag>
                      </Descriptions.Item>
                    </Descriptions>

                    {/* v5.0试点扩展（M197护士药师工作流）：今日医嘱 5 条（医嘱内容/执行时间/状态） */}
                    <Card size="small" title="今日医嘱（DEMO mock 5 条）">
                      <Table
                        rowKey={(r) => r.content}
                        size="small"
                        pagination={false}
                        dataSource={clinicalDetail.todayOrders}
                        columns={[
                          { title: '医嘱内容', dataIndex: 'content', key: 'content' },
                          { title: '执行时间', dataIndex: 'execTime', key: 'execTime', width: 180 },
                          {
                            title: '状态', dataIndex: 'status', key: 'status', width: 90,
                            render: (v: BedOrder['status']) => (
                              <Tag color={ORDER_STATUS_COLOR[v]}>{v}</Tag>
                            ),
                          },
                        ]}
                      />
                    </Card>

                    {/* v5.0试点扩展（M197护士药师工作流）：24h 体征趋势（体温/血压/心率 SVG 折线图） */}
                    <Card size="small" title={`24h 体征趋势（最近采样：${clinicalDetail.vitals.updatedAt}）`}>
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            体温（℃）｜当前 {clinicalDetail.vitals.temp}
                          </Text>
                          <VitalsCurve series={clinicalDetail.tempSeries} min={36.0} max={38.5} unit="℃" color="#e0432f" />
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            收缩压（mmHg）｜当前 {clinicalDetail.vitals.bp}
                          </Text>
                          <VitalsCurve series={clinicalDetail.sbpSeries} min={90} max={160} unit="mmHg" color="#1E5F8C" />
                        </div>
                        <div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            心率（次/分）｜当前 {clinicalDetail.vitals.hr}
                          </Text>
                          <VitalsCurve series={clinicalDetail.hrSeries} min={50} max={120} unit="bpm" color="#4A90D9" />
                        </div>
                      </Space>
                    </Card>
                  </>
                )}
              </>
            ) : (
              <Text type="secondary">
                {selected.status === 'maintenance' ? '该床维护中，暂不可用。' : '该床空闲。'}
              </Text>
            )}
          </Space>
        )}
      </Drawer>
    </Layout>
  );
}
