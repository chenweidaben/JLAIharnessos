/**
 * 健澜科技 jlmedaios - M161-D 医院资源智能调配页（管理驾驶舱，仅 admin）
 *
 * 一页看清床位 / 手术室 / 人员三类资源的调配方案：
 *   - 顶部大数字：床位预测占用率 / 手术室利用率 / 人员公平分 / 当前瓶颈；
 *   - 床位调配：过载借床、闲置支援、特殊床位预留的结论；
 *   - 手术室排程：急诊插队后的连台时间表、总等待与空台；
 *   - 人员匹配：对症上岗名单 + 公平派工留痕（本周已加班少者优先，触及上限自动跳过）。
 *
 * 【核心原则】资源调配要公平，不能有人总加班——页面对加班上限被突破者单独标红。
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI。
 * 【远期深化】接入床位/手术/排班表后，本页数据自动切换为真实调配方案。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

interface BedAllocation {
  deptName: string;
  currentUtilization: number;
  projectedUtilization: number;
  targetUtilization: number;
  requestedBeds: number;
  spareBeds: number;
  specialBedsNeeded: number;
  transfers: Array<{ fromDept: string; toDept: string; beds: number; reason: string }>;
  notes: string[];
}

interface OrOptimize {
  schedule: Array<{ surgeryId: string; roomId: string; startMin: number; endMin: number; waitMin: number }>;
  deferred: Array<{ surgeryId: string; urgency: string }>;
  totalWaitMin: number;
  makespanMin: number;
  idleMin: number;
  utilization: number;
}

interface StaffAssign {
  requiredSkill: string;
  shift: string;
  assignments: Array<{
    staffId: string;
    name: string;
    skillMatched: boolean;
    assignedHours: number;
    projectedOvertimeHours: number;
    atLimit: boolean;
  }>;
  fairnessScore: number;
  overloadedStaff: string[];
  unmetDemand: number;
}

interface Utilization {
  period: string;
  bedUtilization: number;
  orUtilization: number;
  staffUtilization: number;
  overallScore: number;
  bottleneck: 'beds' | 'or' | 'staff' | 'balanced';
}

interface OptimizeResult {
  bed: BedAllocation;
  or: OrOptimize;
  staff: StaffAssign;
  utilization: Utilization;
  fairnessNote: string;
  demo: boolean;
  notice?: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 当日分钟 → HH:MM */
function fmtMin(m: number): string {
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

const BOTTLENECK_LABEL: Record<Utilization['bottleneck'], string> = {
  beds: '床位紧张',
  or: '手术室紧张',
  staff: '人员紧张',
  balanced: '整体均衡',
};

export default function ResourceOptimizePage() {
  const [data, setData] = useState<OptimizeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/resource/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: true }),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '生成调配方案失败');
        setData(null);
        return;
      }
      setData(json.data as OptimizeResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

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
          医院资源智能调配 · 公平排班驾驶舱
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          床位利用率最大化（&gt;85%）· 手术室连台提效 · 人员对症上岗 · 加班摊薄到最少者——不让任何人总加班
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在生成资源调配方案…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && <Alert type="info" showIcon message="暂无调配方案。" />}

        {!loading && !error && data && (
          <>
            {data.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={data.notice || '当前为演示模式数据。'}
              />
            )}

            {/* 汇总大数字 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>床位预测占用率</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: VI.deep }}>
                      {(data.bed.projectedUtilization * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      借床 {data.bed.requestedBeds} · 可支援 {data.bed.spareBeds}
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>手术室利用率</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: VI.accent }}>
                      {(data.or.utilization * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      总等待 {data.or.totalWaitMin}min · 空台 {data.or.idleMin}min
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>人员派工公平分</div>
                    <div style={{ fontSize: 36, fontWeight: 700, color: VI.deep }}>
                      {data.staff.fairnessScore.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                      / 1.00（越接近 1 越公平）
                    </div>
                  </div>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>当前瓶颈</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: '#f5222d' }}>
                      {BOTTLENECK_LABEL[data.utilization.bottleneck]}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>综合负载 {data.utilization.overallScore.toFixed(2)}</div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 三维利用率进度条 */}
            <Card title="资源利用率体检" size="small" style={{ marginBottom: 16 }}>
              <Row gutter={24}>
                <Col span={8}>
                  <div style={{ marginBottom: 4 }}>床位占用率</div>
                  <Progress percent={Math.round(data.utilization.bedUtilization * 1000) / 10} strokeColor={VI.accent} />
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 4 }}>手术室利用率</div>
                  <Progress percent={Math.round(data.utilization.orUtilization * 1000) / 10} strokeColor={VI.accent} />
                </Col>
                <Col span={8}>
                  <div style={{ marginBottom: 4 }}>人员工时利用率</div>
                  <Progress percent={Math.round(data.utilization.staffUtilization * 1000) / 10} strokeColor={VI.accent} />
                </Col>
              </Row>
            </Card>

            {/* 床位调配 */}
            <Card title={`床位调配方案 · ${data.bed.deptName}`} size="small" style={{ marginBottom: 16 }}>
              {data.bed.notes.map((n, i) => (
                <div key={i} style={{ marginBottom: 6, fontSize: 13 }}>
                  <Tag color={VI.accent}>{i === 0 ? '结论' : '提示'}</Tag>
                  {n}
                </div>
              ))}
              {data.bed.transfers.length > 0 && (
                <Table
                  style={{ marginTop: 12 }}
                  rowKey={(r) => `${r.fromDept}-${r.toDept}-${r.beds}`}
                  pagination={false}
                  size="small"
                  dataSource={data.bed.transfers}
                  columns={[
                    { title: '转出科室', dataIndex: 'fromDept', width: 140 },
                    { title: '支援去向', dataIndex: 'toDept', width: 160 },
                    { title: '床位数', dataIndex: 'beds', width: 90 },
                    { title: '原因', dataIndex: 'reason' },
                  ]}
                />
              )}
            </Card>

            {/* 手术室排程 */}
            <Card title="手术室连台排程（急诊优先插队）" size="small" style={{ marginBottom: 16 }}>
              <Table
                rowKey="surgeryId"
                pagination={false}
                size="small"
                dataSource={data.or.schedule}
                columns={[
                  { title: '手术号', dataIndex: 'surgeryId', width: 100 },
                  { title: '房间', dataIndex: 'roomId', width: 90 },
                  {
                    title: '时段',
                    render: (_: unknown, r: { startMin: number; endMin: number }) =>
                      `${fmtMin(r.startMin)} - ${fmtMin(r.endMin)}` as unknown,
                  },
                  {
                    title: '等待',
                    dataIndex: 'waitMin',
                    width: 90,
                    render: (v: number) => (v > 0 ? <Tag color="orange">+{v}min</Tag> : <Tag color="green">准点</Tag>),
                  },
                ]}
              />
              {data.or.deferred.length > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="warning"
                  showIcon
                  message={`${data.or.deferred.length} 台手术排不进当日窗口，建议顺延或加开房间`}
                />
              )}
            </Card>

            {/* 人员匹配 + 公平提示 */}
            <Card title={`人员对症上岗 · ${data.staff.requiredSkill} / ${data.staff.shift} 班`} size="small">
              <Alert type="info" showIcon style={{ marginBottom: 12 }} message={data.fairnessNote} />
              <Table
                rowKey="staffId"
                pagination={false}
                size="small"
                dataSource={data.staff.assignments}
                columns={[
                  { title: '员工', dataIndex: 'name', width: 120 },
                  {
                    title: '技能匹配',
                    dataIndex: 'skillMatched',
                    width: 100,
                    render: (v: boolean) => (v ? <Tag color="green">对症</Tag> : <Tag color="red">不对症</Tag>),
                  },
                  { title: '本次工时(h)', dataIndex: 'assignedHours', width: 110 },
                  {
                    title: '派工后累计加班(h)',
                    dataIndex: 'projectedOvertimeHours',
                    width: 160,
                    render: (v: number) => (
                      <span style={{ color: v >= 8 ? '#f5222d' : VI.deep, fontWeight: 600 }}>{v}</span>
                    ),
                  },
                ]}
              />
              {data.staff.overloadedStaff.length > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="error"
                  showIcon
                  message="以下员工已逼近/超过本周加班上限，系统已自动跳过、未再压派（需主管安排调休）："
                  description={data.staff.overloadedStaff.join('；')}
                />
              )}
              {data.staff.unmetDemand > 0 && (
                <Alert
                  style={{ marginTop: 12 }}
                  type="warning"
                  showIcon
                  message={`仍有 ${data.staff.unmetDemand} 个班次需求未被满足，建议启动备班或跨科支援。`}
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
