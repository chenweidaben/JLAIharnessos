/**
 * 健澜科技 jlmedaios - M171-C 医院后勤智能化深化·智能派单与调度页（科研教学后勤，仅 admin）
 *
 * 后勤派单要高效，不能推诿：
 *  - 维修派单：技能匹配 + 距离最近 + 紧急优先；
 *  - 被服配送：科室需求 + 库存 + 路线优化；
 *  - 餐饮配送：患者餐 + 禁忌饮食 + 准时送达；
 *  - 保洁调度：区域划分 + 频次优化 + 人员排班。
 *
 * 本页内置一组示范工单/人员/车辆数据，POST 到 /api/v1/logistics/deep-dispatch，
 * 实时展示自动派单结果、未派单原因（杜绝无理由滞留）、车辆路线、需求预测与满意度闭环。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useMemo, useState } from 'react';
import {
  Alert, Button, Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF logisticsDeep 输出对齐的类型 ---------------- */

type TaskType = 'repair' | 'linen' | 'meal' | 'cleaning';

interface Assignment {
  taskId: string;
  taskType: TaskType;
  taskTypeLabel: string;
  locationName: string;
  priority: number;
  resourceId: string;
  resourceName: string;
  score: number;
  distanceM: number;
  etaMin: number;
  rationale: string;
}
interface Unassigned { taskId: string; taskType: TaskType; locationName: string; reason: string; }
interface DispatchResult {
  assignments: Assignment[];
  unassigned: Unassigned[];
  resourceLoad: Record<string, number>;
  avgResponseM: number;
  mealOnTimeRate: number;
}
interface VehicleRoute {
  vehicleId: string; vehicleName: string;
  stops: { taskId: string; locationName: string; qty: number }[];
  totalDistanceM: number; loadQty: number; feasible: boolean;
}
interface RouteResult {
  routes: VehicleRoute[]; totalDistanceM: number;
  infeasible: { taskId: string; reason: string }[];
}
interface DemandItem { label: string; baseline: number; factor: number; trend: number; predicted: number; }
interface DemandResult { items: DemandItem[]; totalPredicted: number; peakLabel: string; }
interface SatisfactionReport {
  totalTasks: number; feedbackCount: number; avgRating: number;
  onTimeRate: number; slaRate: number; complaintRate: number;
  byType: Partial<Record<TaskType, { count: number; avgRating: number; onTimeRate: number }>>;
  atRisk: { taskId: string; rating: number; complaint: boolean }[];
}
interface DeepDispatchData {
  summary: { taskCount: number; resourceCount: number; assignedCount: number; unassignedCount: number };
  dispatch: DispatchResult | null;
  route: RouteResult | null;
  demand: DemandResult | null;
  satisfaction: SatisfactionReport | null;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

const TYPE_TAG: Record<TaskType, string> = {
  repair: 'blue', linen: 'cyan', meal: 'orange', cleaning: 'green',
};
const TYPE_LABEL: Record<TaskType, string> = {
  repair: '维修', linen: '被服', meal: '餐饮', cleaning: '保洁',
};

/* ---------------- 内置示范数据（科研教学后勤·2000 床规模） ---------------- */

const DEMO_BODY = {
  tasks: [
    { id: 'T-1001', type: 'repair', locationName: '外科三病区 302 病房', x: 120, y: 300, priority: 5, demandQty: 1, requiredSkills: ['electrician'] },
    { id: 'T-1002', type: 'repair', locationName: '住院部电梯间', x: 0, y: 0, priority: 4, demandQty: 1, requiredSkills: ['hvac'] },
    { id: 'T-1003', type: 'repair', locationName: '检验科冷库', x: 400, y: 200, priority: 3, demandQty: 1, requiredSkills: ['plumber'] },
    { id: 'T-2001', type: 'linen', locationName: '内科病区', x: 80, y: 120, priority: 2, demandQty: 60 },
    { id: 'T-2002', type: 'linen', locationName: '妇科病区', x: 300, y: 150, priority: 2, demandQty: 40 },
    { id: 'T-3001', type: 'meal', locationName: '消化内科 12 床', x: 60, y: 200, priority: 3, demandQty: 1, dueMinute: 480, dietaryRestrictions: ['diabetes'] },
    { id: 'T-3002', type: 'meal', locationName: '普外科 08 床', x: 220, y: 260, priority: 3, demandQty: 1, dueMinute: 480 },
    { id: 'T-4001', type: 'cleaning', locationName: '门诊大厅', x: 100, y: 50, priority: 2, demandQty: 800 },
    { id: 'T-4002', type: 'cleaning', locationName: '急诊留观区', x: 350, y: 90, priority: 4, demandQty: 300 },
  ] as const,
  resources: [
    { id: 'R-01', name: '王师傅（电工）', type: 'repair', x: 100, y: 280, skills: ['electrician', 'hvac'] },
    { id: 'R-02', name: '李师傅（管道）', type: 'repair', x: 380, y: 210, skills: ['plumber'] },
    { id: 'L-01', name: '被服组·小张', type: 'linen', x: 20, y: 100 },
    { id: 'L-02', name: '被服组·小赵', type: 'linen', x: 250, y: 130 },
    { id: 'M-01', name: '送餐·小孙', type: 'meal', x: 50, y: 180, handlesDietary: true },
    { id: 'M-02', name: '送餐·小周', type: 'meal', x: 200, y: 240 },
    { id: 'C-01', name: '保洁·吴姐', type: 'cleaning', x: 90, y: 60 },
    { id: 'C-02', name: '保洁·郑姐', type: 'cleaning', x: 330, y: 80 },
  ],
  constraints: { maxLoadPerResource: 8, speedMpm: 60, linenInventory: { bed_linen: 120 } },
  vehicles: [
    { id: 'V-1', name: '被服车·东', x: 0, y: 0, capacity: 100 },
    { id: 'V-2', name: '被服车·西', x: 0, y: 0, capacity: 100 },
  ],
  demandPeriods: [
    { label: '周一', baseline: 120 }, { label: '周二', baseline: 100 },
    { label: '周三', baseline: 105 }, { label: '周四', baseline: 110 },
    { label: '周五', baseline: 130 }, { label: '周六', baseline: 70 },
    { label: '周日', baseline: 60 },
  ],
  seasonality: { factors: { 周一: 1.15, 周五: 1.1, 周六: 0.6, 周日: 0.55 }, trend: 1.02 },
  completedTasks: [
    { id: 'T-9001', type: 'repair', onTime: true, withinSla: true },
    { id: 'T-9002', type: 'repair', onTime: true, withinSla: true },
    { id: 'T-9003', type: 'repair', onTime: false, withinSla: false },
    { id: 'T-9004', type: 'linen', onTime: true, withinSla: true },
    { id: 'T-9005', type: 'linen', onTime: true, withinSla: true },
    { id: 'T-9006', type: 'meal', onTime: true, withinSla: true },
    { id: 'T-9007', type: 'meal', onTime: false, withinSla: true },
    { id: 'T-9008', type: 'cleaning', onTime: true, withinSla: true },
  ],
  feedback: [
    { taskId: 'T-9001', rating: 5 }, { taskId: 'T-9002', rating: 4 },
    { taskId: 'T-9003', rating: 2, complaint: true },
    { taskId: 'T-9004', rating: 5 }, { taskId: 'T-9005', rating: 4 },
    { taskId: 'T-9006', rating: 5 }, { taskId: 'T-9007', rating: 3 },
    { taskId: 'T-9008', rating: 5 },
  ],
};

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (data.code !== 0) throw new Error(data.message || '调度计算失败');
  return data.data as T;
}

export default function LogisticsDeepPage() {
  const [data, setData] = useState<DeepDispatchData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const d = await postJson<DeepDispatchData>('/api/v1/logistics/deep-dispatch', DEMO_BODY);
      setData(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : '调度计算失败');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const demandOption = useMemo(() => {
    const items = data?.demand?.items ?? [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['历史基期', '预测需求'], bottom: 0 },
      grid: { left: 40, right: 16, top: 24, bottom: 40 },
      xAxis: { type: 'category', data: items.map((i) => i.label), axisLabel: { color: VI.deep } },
      yAxis: { type: 'value' },
      series: [
        { name: '历史基期', type: 'bar' as const, data: items.map((i) => i.baseline), itemStyle: { color: VI.accentSoft } },
        { name: '预测需求', type: 'bar' as const, data: items.map((i) => i.predicted), itemStyle: { color: VI.accent } },
      ],
    };
  }, [data]);

  const dispatch = data?.dispatch ?? null;
  const route = data?.route ?? null;
  const demand = data?.demand ?? null;
  const satisfaction = data?.satisfaction ?? null;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>后勤智能派单与调度</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          科研教学后勤 · 技能匹配派单 / 路线优化 / 需求预测 / 满意度闭环（派单要高效，不能推诿）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col span={16}>
              <Paragraph style={{ margin: 0, color: '#666' }}>
                基于内置示范工单（维修/被服/餐饮/保洁）一键触发深度调度，结果实时计算。
              </Paragraph>
            </Col>
            <Col span={8} style={{ textAlign: 'right' }}>
              <Button type="primary" size="large" loading={loading} onClick={run}>
                开始智能调度
              </Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在派单与排路线…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={run}>重试</Button>} />
        )}

        {!loading && !error && data && (
          <>
            {/* KPI */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card><Statistic title="工单总数" value={data.summary.taskCount} valueStyle={{ color: VI.deep }} /></Card>
              </Col>
              <Col span={4}>
                <Card><Statistic title="已派单" value={data.summary.assignedCount} valueStyle={{ color: '#3f9d63' }} /></Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="未派单(原因)" value={data.summary.unassignedCount}
                    valueStyle={{ color: data.summary.unassignedCount > 0 ? '#d4483e' : '#3f9d63' }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card><Statistic title="平均响应距离" value={dispatch?.avgResponseM ?? 0} suffix="m" valueStyle={{ color: VI.deep }} /></Card>
              </Col>
              <Col span={4}>
                <Card><Statistic title="餐饮准时率" value={`${((dispatch?.mealOnTimeRate ?? 1) * 100).toFixed(0)}%`} valueStyle={{ color: VI.deep }} /></Card>
              </Col>
              <Col span={4}>
                <Card><Statistic title="满意度均分" value={satisfaction?.avgRating ?? 0} suffix="/5" valueStyle={{ color: VI.deep }} /></Card>
              </Col>
            </Row>

            {/* 派单明细 */}
            <Card title="深度派单结果（技能匹配 + 距离最近 + 紧急优先）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="taskId"
                pagination={false}
                size="small"
                dataSource={dispatch?.assignments ?? []}
                columns={[
                  { title: '工单', dataIndex: 'taskId', width: 90 },
                  { title: '类型', dataIndex: 'taskType', width: 80, render: (t: TaskType) => <Tag color={TYPE_TAG[t]}>{TYPE_LABEL[t]}</Tag> },
                  { title: '地点', dataIndex: 'locationName' },
                  { title: '紧急', dataIndex: 'priority', width: 60, render: (v: number) => '★'.repeat(v) },
                  { title: '派给', dataIndex: 'resourceName', width: 150 },
                  { title: '距离(m)', dataIndex: 'distanceM', width: 80 },
                  { title: '到场(分)', dataIndex: 'etaMin', width: 80 },
                  { title: '派单理由', dataIndex: 'rationale' },
                ]}
              />
            </Card>

            {/* 未派单原因 —— 杜绝推诿 */}
            {dispatch && dispatch.unassigned.length > 0 && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={`${dispatch.unassigned.length} 条工单暂无法派单（须人工介入，不允许无理由滞留）`}
                description={
                  <Table
                    rowKey="taskId" pagination={false} size="small"
                    dataSource={dispatch.unassigned}
                    columns={[
                      { title: '工单', dataIndex: 'taskId', width: 90 },
                      { title: '类型', dataIndex: 'taskType', width: 80, render: (t: TaskType) => <Tag color={TYPE_TAG[t]}>{TYPE_LABEL[t]}</Tag> },
                      { title: '地点', dataIndex: 'locationName', width: 200 },
                      { title: '滞留原因', dataIndex: 'reason' },
                    ]}
                  />
                }
              />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              {/* 车辆路线 */}
              <Col span={12}>
                <Card title="被服/餐饮配送路线（最近邻 + 容量）" style={{ height: '100%' }}>
                  <Table
                    rowKey="vehicleId" pagination={false} size="small"
                    dataSource={route?.routes ?? []}
                    columns={[
                      { title: '车辆', dataIndex: 'vehicleName' },
                      { title: '停靠点', dataIndex: 'stops', render: (s: { locationName: string }[]) => s.map((x) => x.locationName).join(' → ') || '—' },
                      { title: '里程(m)', dataIndex: 'totalDistanceM', width: 90 },
                      { title: '装载', dataIndex: 'loadQty', width: 70 },
                    ]}
                  />
                </Card>
              </Col>
              {/* 需求预测 */}
              <Col span={12}>
                <Card title={`下周后勤需求预测（高峰：${demand?.peakLabel ?? '-'}）`} style={{ height: '100%' }}>
                  <ReactECharts option={demandOption} style={{ height: 280 }} notMerge />
                </Card>
              </Col>
            </Row>

            {/* 满意度 */}
            {satisfaction && (
              <Card title="满意度闭环（准时率 / SLA / 投诉率 / 回访清单）">
                <Row gutter={16} style={{ marginBottom: 12 }}>
                  <Col span={5}><Statistic title="评价均分" value={satisfaction.avgRating} suffix="/5" /></Col>
                  <Col span={5}><Statistic title="准时率" value={`${(satisfaction.onTimeRate * 100).toFixed(0)}%`} /></Col>
                  <Col span={5}><Statistic title="SLA 达成率" value={`${(satisfaction.slaRate * 100).toFixed(0)}%`} /></Col>
                  <Col span={5}><Statistic title="投诉率" value={`${(satisfaction.complaintRate * 100).toFixed(0)}%`} /></Col>
                  <Col span={4}><Statistic title="待回访" value={satisfaction.atRisk.length} /></Col>
                </Row>
                <Table
                  rowKey="taskId" pagination={false} size="small"
                  dataSource={satisfaction.atRisk}
                  columns={[
                    { title: '工单', dataIndex: 'taskId', width: 120 },
                    { title: '评分', dataIndex: 'rating', width: 100, render: (v: number) => <Tag color={v <= 2 ? 'red' : 'orange'}>{v} 分</Tag> },
                    { title: '是否投诉', dataIndex: 'complaint', width: 100, render: (v: boolean) => (v ? <Tag color="red">投诉</Tag> : <Tag>低分</Tag>) },
                  ]}
                />
              </Card>
            )}
          </>
        )}
      </Content>
    </Layout>
  );
}
