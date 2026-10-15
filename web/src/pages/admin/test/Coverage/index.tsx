/**
 * 健澜科技 jlmedaios - M150-A 测试覆盖率冲刺报告页（80%→90%，仅 admin）
 *
 * 直读 BFF GET /api/v1/admin/test/coverage 返回的 CoverageReport：
 *  - 顶部深海蓝横幅：90% 门禁结论与冲刺进度；
 *  - 指标卡：源文件总数 / 已覆盖 / 未覆盖 / 整体覆盖率 / 距目标缺口；
 *  - 五桶分桶卡（doctor / nurse / pharma / admin / other），各带进度条；
 *  - 缺口区（红区置顶）：按优先级排序的待补测文件，admin/安全域最优先；
 *  - 爬坡趋势：历史 7 周 + 当前快照，直观展示 80%→90% 爬升。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * 持续优化：后续接入 ECharts 趋势折线与行 / 分支覆盖率分层下钻。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  List,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 业务模块桶（与 BFF coverageReportAggregator CoverageModule 对齐） */
type CoverageModule = 'doctor' | 'nurse' | 'pharma' | 'admin' | 'other';

interface ModuleCoverageStat {
  module: CoverageModule;
  label: string;
  total: number;
  covered: number;
  uncovered: number;
  rate: number;
  meetsGate: boolean;
}

interface CoverageFileRecord {
  path: string;
  module: CoverageModule;
  lines: number;
  covered: boolean;
}

interface GapItem {
  path: string;
  module: CoverageModule;
  lines: number;
  priority: number;
  reason: string;
}

interface GapReport {
  targetRate: number;
  currentRate: number;
  gapDelta: number;
  coreGap: boolean;
  modulesBelowTarget: CoverageModule[];
  filesNeeded: number;
  prioritizedGaps: GapItem[];
}

interface CoverageTrendPoint {
  label: string;
  rate: number;
  covered: number;
  total: number;
}

/** 与 BFF generateCoverageReport 输出对齐 */
interface CoverageReport {
  generatedAt: string;
  targetThreshold: number;
  total: number;
  covered: number;
  uncovered: number;
  rate: number;
  gateOk: boolean;
  byModule: Record<CoverageModule, ModuleCoverageStat>;
  files: CoverageFileRecord[];
  gap: GapReport;
  trend: CoverageTrendPoint[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  pass: '#52c41a',
  fail: '#ff4d4f',
  warn: '#faad14',
};

const MODULE_LABEL: Record<CoverageModule, string> = {
  doctor: '医生侧',
  nurse: '护士侧',
  pharma: '药师侧',
  admin: '管理后台',
  other: '其他',
};

const MODULE_ORDER: CoverageModule[] = ['doctor', 'nurse', 'pharma', 'admin', 'other'];

function fmtPct(rate: number): number {
  return Math.round(rate * 10000) / 100;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/** 缺口表列定义 */
const gapColumns: ColumnsType<GapItem> = [
  {
    title: '优先级',
    dataIndex: 'priority',
    key: 'priority',
    width: 90,
    sorter: (a, b) => b.priority - a.priority,
    render: (p: number) => (
      <Tag color={p >= 100 ? 'red' : p >= 70 ? 'orange' : 'default'}>{p} 分</Tag>
    ),
  },
  {
    title: '模块',
    dataIndex: 'module',
    key: 'module',
    width: 90,
    render: (m: CoverageModule) => <Tag color="blue">{MODULE_LABEL[m]}</Tag>,
  },
  {
    title: '待补测源文件',
    dataIndex: 'path',
    key: 'path',
    render: (path: string) => <code style={{ fontSize: 12 }}>{path}</code>,
  },
  { title: '行数', dataIndex: 'lines', key: 'lines', width: 80 },
  {
    title: '说明',
    dataIndex: 'reason',
    key: 'reason',
    render: (reason: string) => <span style={{ color: 'rgba(0,0,0,0.65)' }}>{reason}</span>,
  },
];

export default function CoveragePage() {
  const [data, setData] = useState<CoverageReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/coverage');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as CoverageReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const gateOk = data?.gateOk ?? false;
  const ratePct = data ? fmtPct(data.rate) : 0;
  const targetPct = data ? Math.round(data.targetThreshold * 100) : 90;

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
          测试覆盖率冲刺（80% → {targetPct}%）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          核心四桶（医生 / 护士 / 药师 / 管理后台）≥ {targetPct}% 门禁 · 仅 admin 可见 ·
          确定性模拟基线
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在计算覆盖率冲刺报告…" />
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

        {!loading && !error && data && (
          <>
            {/* 整体门禁结论横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={16}>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>门禁结论</span>
                  <Tag
                    color={gateOk ? 'green' : 'red'}
                    style={{ fontSize: 16, padding: '4px 16px' }}
                  >
                    {gateOk
                      ? `核心四桶全绿（≥${targetPct}%）`
                      : `距 ${targetPct}% 还差 ${fmtPct(data.gap.gapDelta)} 个百分点`}
                  </Tag>
                </Col>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    生成于 {fmtTime(data.generatedAt)}
                  </span>
                </Col>
                <Col style={{ marginLeft: 'auto' }}>
                  <Button onClick={load}>重新计算</Button>
                </Col>
              </Row>
            </Card>

            {/* 核心指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <Statistic title="考核源文件" value={data.total} suffix="个" />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="已覆盖"
                    value={data.covered}
                    valueStyle={{ color: VI.pass }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="未覆盖"
                    value={data.uncovered}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card title={`整体覆盖率（目标 ${targetPct}%）`}>
                  <Progress
                    percent={ratePct}
                    size="small"
                    status={gateOk ? 'success' : 'exception'}
                  />
                </Card>
              </Col>
              <Col span={3}>
                <Card>
                  <Statistic
                    title="还需补测"
                    value={data.gap.filesNeeded}
                    suffix="个"
                    valueStyle={{ color: VI.warn }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 五桶分桶 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {MODULE_ORDER.map((m) => {
                const s = data.byModule[m];
                const pct = fmtPct(s.rate);
                const isCore = m !== 'other';
                return (
                  <Col span={isCore ? 4 : 5} key={m}>
                    <Card size="small">
                      <Statistic
                        title={
                          <span>
                            {s.label}{' '}
                            <Tag color={s.meetsGate ? 'green' : 'red'}>
                              {s.meetsGate ? '达标' : '缺口'}
                            </Tag>
                            {isCore ? null : <Tag color="default">非核心</Tag>}
                          </span>
                        }
                        value={s.covered}
                        suffix={
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            / {s.total} 个
                          </span>
                        }
                      />
                      <Progress
                        percent={pct}
                        size="small"
                        showInfo
                        status={s.meetsGate ? 'success' : 'exception'}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 缺口区（红区，置顶） */}
            <Card
              title={
                <span style={{ color: VI.fail }}>
                  待补测缺口（{data.gap.prioritizedGaps.length}）· 还需 {data.gap.filesNeeded}{' '}
                  个文件达 {targetPct}%
                </span>
              }
              style={{ marginBottom: 16, borderColor: VI.fail }}
            >
              {data.gap.modulesBelowTarget.length > 0 && (
                <Paragraph style={{ marginBottom: 12 }}>
                  未达标核心桶：
                  {data.gap.modulesBelowTarget.map((m) => (
                    <Tag key={m} color="red" style={{ marginRight: 8 }}>
                      {MODULE_LABEL[m]}（{fmtPct(data.byModule[m].rate)}%）
                    </Tag>
                  ))}
                </Paragraph>
              )}
              <Table<GapItem>
                rowKey={(r) => r.path}
                columns={gapColumns}
                dataSource={data.gap.prioritizedGaps}
                pagination={false}
                size="small"
              />
            </Card>

            {/* 爬坡趋势 */}
            <Card title="覆盖率爬坡趋势（80% → 90%）" style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={data.trend}
                renderItem={(p) => (
                  <List.Item>
                    <div style={{ width: '100%' }}>
                      <Row align="middle" gutter={16}>
                        <Col span={5}>
                          <span style={{ color: 'rgba(0,0,0,0.65)' }}>{p.label}</span>
                        </Col>
                        <Col span={15}>
                          <Progress
                            percent={fmtPct(p.rate)}
                            size="small"
                            strokeColor={p.rate >= 0.9 ? VI.pass : VI.accent}
                          />
                        </Col>
                        <Col span={4}>
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            {p.covered}/{p.total} 个
                          </span>
                        </Col>
                      </Row>
                    </div>
                  </List.Item>
                )}
              />
            </Card>

            {/* 全部考核文件明细 */}
            <Card title={`全部考核源文件（${data.files.length}）`}>
              <Table<CoverageFileRecord>
                rowKey={(r) => r.path}
                columns={[
                  {
                    title: '状态',
                    dataIndex: 'covered',
                    key: 'covered',
                    width: 90,
                    render: (covered: boolean) =>
                      covered ? <Tag color="green">已覆盖</Tag> : <Tag color="red">未覆盖</Tag>,
                  },
                  {
                    title: '模块',
                    dataIndex: 'module',
                    key: 'module',
                    width: 90,
                    render: (m: CoverageModule) => <Tag color="blue">{MODULE_LABEL[m]}</Tag>,
                  },
                  {
                    title: '源文件',
                    dataIndex: 'path',
                    key: 'path',
                    render: (path: string) => <code style={{ fontSize: 12 }}>{path}</code>,
                  },
                  { title: '行数', dataIndex: 'lines', key: 'lines', width: 80 },
                ]}
                dataSource={data.files}
                pagination={{ pageSize: 20, showSizeChanger: true }}
                size="small"
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
