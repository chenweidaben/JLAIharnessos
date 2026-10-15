/**
 * 健澜科技 jlmedaios - M130-D 手术排班优化甘特图日历（管理端）
 *
 * 交互：
 *   1) 顶部「运行优化」按钮 → POST /api/v1/admin/surgery/schedule/optimize；
 *   2) 甘特图：纵轴=手术间，横轴=当日时间轴（08:00-17:00），色条=一台手术；
 *   3) 急诊红 / 择期蓝，按科室着色；悬浮显示术式 / 医生 / 起止；
 *   4) 指标卡：利用率 / 已排 / 未排 / 急诊优先命中。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import { Button, Card, Col, Layout, message, Row, Select, Space, Statistic, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF surgeryScheduleAggregator 输出对齐 */
interface Assignment {
  requestId: string;
  roomId: string;
  roomName: string;
  date: string;
  startMin: number;
  endMin: number;
  surgeonId: string;
  procedure: string;
  department: string;
  surgeryType: 'elective' | 'emergency';
}
interface Unassigned {
  requestId: string;
  reason: string;
}
interface ScheduleMetrics {
  totalRequests: number;
  assignedCount: number;
  unassignedCount: number;
  emergencyAssigned: number;
  electiveAssigned: number;
  utilizationRate: number;
  roomsUsed: number;
  sameDeptClusterCount: number;
}
interface OptimizeResult {
  assignments: Assignment[];
  unassigned: Unassigned[];
  conflicts: { kind: string; date: string; detail: string }[];
  metrics: ScheduleMetrics;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

/** 科室配色（择期块） */
const DEPT_COLOR: Record<string, string> = {
  普外科: '#1e6fbf',
  骨科: '#2a9d8f',
  甲乳外科: '#e9c46a',
  泌尿外科: '#6a4c93',
  妇产科: '#e07a5f',
  眼科: '#577590',
  急诊外科: '#d62828',
};

const DAY_START = 8 * 60; // 480
const DAY_END = 17 * 60; // 1020
const DAY_SPAN = DAY_END - DAY_START;

function minToLabel(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** 演示用手术间 */
const DEMO_ROOMS = [
  { roomId: 'OR1', name: '一号手术间', openMin: DAY_START, closeMin: DAY_END },
  { roomId: 'OR2', name: '二号手术间', openMin: DAY_START, closeMin: DAY_END },
  { roomId: 'OR3', name: '三号手术间', openMin: DAY_START, closeMin: DAY_END },
  { roomId: 'OR-ER', name: '急诊手术间', openMin: DAY_START, closeMin: DAY_END, isEmergency: true },
];

/** 演示待排申请 */
function demoRequests(date: string) {
  return [
    { id: 'R-001', surgeryType: 'elective' as const, procedure: '腹腔镜胆囊切除术', department: '普外科', surgeonId: 'S-张', durationMin: 90, preferredDate: date },
    { id: 'R-002', surgeryType: 'elective' as const, procedure: '腹股沟疝修补术', department: '普外科', surgeonId: 'S-张', durationMin: 60, preferredDate: date },
    { id: 'R-003', surgeryType: 'elective' as const, procedure: '全膝关节置换术', department: '骨科', surgeonId: 'S-王', durationMin: 120, preferredDate: date },
    { id: 'R-004', surgeryType: 'elective' as const, procedure: '甲状腺次全切除术', department: '甲乳外科', surgeonId: 'S-李', durationMin: 90, preferredDate: date },
    { id: 'R-005', surgeryType: 'emergency' as const, procedure: '急诊阑尾切除术', department: '急诊外科', surgeonId: 'S-赵', durationMin: 60, preferredDate: date },
  ];
}

async function runOptimize(date: string): Promise<OptimizeResult> {
  const resp = await fetch('/api/v1/admin/surgery/schedule/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: demoRequests(date),
      availableRooms: DEMO_ROOMS,
      surgeonAvailability: [],
    }),
  });
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '优化计算失败');
  return body.data as OptimizeResult;
}

export default function SurgerySchedulePage() {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OptimizeResult | null>(null);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const r = await runOptimize(date);
      setResult(r);
      if (r.conflicts.length > 0) message.warning(`检测到 ${r.conflicts.length} 处冲突，请复核`);
      else message.success(`优化完成：已排 ${r.metrics.assignedCount} 台 / 共 ${r.metrics.totalRequests} 台`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '优化计算失败');
    } finally {
      setLoading(false);
    }
  };

  /** 当前日期的甘特行：每间一行 */
  const ganttRows = useMemo(() => {
    if (!result) return [];
    const dayItems = result.assignments.filter((a) => a.date === date);
    return DEMO_ROOMS.map((room) => ({
      room,
      items: dayItems.filter((a) => a.roomId === room.roomId),
    }));
  }, [result, date]);

  const timeTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let m = DAY_START; m <= DAY_END; m += 60) ticks.push(m);
    return ticks;
  }, []);

  return (
    <Layout style={{ background: VI.bg, minHeight: '100vh' }}>
      <Content style={{ padding: 24 }}>
        {/* 深海蓝渐变头部 */}
        <div
          style={{
            background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 16,
            color: '#fff',
          }}
        >
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            手术排班优化 · 甘特图日历
          </Title>
          <Paragraph style={{ color: VI.accentSoft, margin: '4px 0 0' }}>
            急诊优先 · 医生不冲突 · 同类集中 · 利用率最大化（M130-D 核心业务深化）
          </Paragraph>
        </div>

        {/* 控制条 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <span>排班日期：</span>
            <Select value={date} onChange={setDate} style={{ width: 160 }} options={[{ value: date, label: date }]} />
            <Button type="primary" loading={loading} onClick={handleOptimize} style={{ background: VI.accent, borderColor: VI.accent }}>
              运行优化
            </Button>
          </Space>
        </Card>

        {/* 指标卡 */}
        {result && (
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={5}>
              <Card size="small"><Statistic title="已排台数" value={result.metrics.assignedCount} suffix={`/ ${result.metrics.totalRequests}`} /></Card>
            </Col>
            <Col span={5}>
              <Card size="small"><Statistic title="手术室利用率" value={result.metrics.utilizationRate} precision={1} suffix="%" /></Card>
            </Col>
            <Col span={5}>
              <Card size="small"><Statistic title="急诊优先" value={result.metrics.emergencyAssigned} suffix="台" valueStyle={{ color: '#d62828' }} /></Card>
            </Col>
            <Col span={5}>
              <Card size="small"><Statistic title="未排" value={result.metrics.unassignedCount} valueStyle={{ color: result.metrics.unassignedCount > 0 ? '#d62828' : undefined }} /></Card>
            </Col>
            <Col span={4}>
              <Card size="small"><Statistic title="占用手术间" value={result.metrics.roomsUsed} suffix="间" /></Card>
            </Col>
          </Row>
        )}

        {/* 甘特图 */}
        <Card title={`手术间甘特图 · ${date}`} size="small">
          {!result && <Paragraph type="secondary">点击「运行优化」生成排程方案。</Paragraph>}
          {result && (
            <div style={{ overflowX: 'auto' }}>
              {/* 时间轴表头 */}
              <div style={{ display: 'flex', marginLeft: 140, position: 'relative', height: 24 }}>
                {timeTicks.map((t) => (
                  <span
                    key={t}
                    style={{
                      position: 'absolute',
                      left: `${((t - DAY_START) / DAY_SPAN) * 100}%`,
                      transform: 'translateX(-50%)',
                      fontSize: 12,
                      color: VI.accentSoft,
                    }}
                  >
                    {minToLabel(t)}
                  </span>
                ))}
              </div>
              {/* 每间一行 */}
              {ganttRows.map(({ room, items }) => (
                <div key={room.roomId} style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ width: 132, fontSize: 13, color: VI.deep }}>{room.name}</div>
                  <div style={{ flex: 1, position: 'relative', height: 44, background: '#eef2f7', borderRadius: 6 }}>
                    {items.map((a) => {
                      const left = ((a.startMin - DAY_START) / DAY_SPAN) * 100;
                      const width = ((a.endMin - a.startMin) / DAY_SPAN) * 100;
                      const color =
                        a.surgeryType === 'emergency'
                          ? '#d62828'
                          : DEPT_COLOR[a.department] ?? VI.accent;
                      return (
                        <div
                          key={a.requestId}
                          title={`${a.procedure}\n${a.department} · ${a.surgeonId}\n${minToLabel(a.startMin)}-${minToLabel(a.endMin)}`}
                          style={{
                            position: 'absolute',
                            left: `${left}%`,
                            width: `${width}%`,
                            top: 4,
                            bottom: 4,
                            background: color,
                            borderRadius: 4,
                            color: '#fff',
                            fontSize: 11,
                            padding: '2px 6px',
                            overflow: 'hidden',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {a.procedure}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 未排清单 */}
        {result && result.unassigned.length > 0 && (
          <Card title="未排台次" size="small" style={{ marginTop: 16 }}>
            {result.unassigned.map((u) => (
              <Tag key={u.requestId} color="warning">
                {u.requestId}：{u.reason}
              </Tag>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
