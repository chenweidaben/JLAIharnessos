/**
 * 健澜科技 jlmedaios - M135-A 全路由冒烟红绿报告页（仅 admin，运维质量门禁）
 *
 * 直读 BFF GET /api/v1/admin/test/smoke 返回的 SmokeReport：
 *  - 顶部深海蓝横幅：整体门禁结论（全绿放行 / 存在红项）；
 *  - 指标卡：总数 / 通过(绿) / 失败(红) / 通过率 / 平均与最大响应时间；
 *  - 六桶分桶卡（public / admin / doctor / nurse / pharma / patient）；
 *  - 失败清单（红区，置顶）；全部路由明细（绿 / 红标签 + 耗时）。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
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

/** 业务角色桶（与 BFF smokeTestAggregator RouteBucket 对齐） */
type RouteBucket = 'public' | 'admin' | 'doctor' | 'nurse' | 'pharma' | 'patient';

interface BucketStat {
  total: number;
  pass: number;
  fail: number;
}

interface SmokeResult {
  method: string;
  path: string;
  url: string;
  bucket: RouteBucket;
  label?: string;
  status: number;
  ok: boolean;
  elapsedMs: number;
  note?: string;
}

/** 与 BFF generateSmokeReport 输出对齐 */
interface SmokeReport {
  generatedAt: string;
  baseUrl: string;
  total: number;
  pass: number;
  fail: number;
  passRate: number;
  ok: boolean;
  avgElapsedMs: number;
  maxElapsedMs: number;
  byBucket: Record<RouteBucket, BucketStat>;
  failures: SmokeResult[];
  results: SmokeResult[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  pass: '#52c41a',
  fail: '#ff4d4f',
};

const BUCKET_LABEL: Record<RouteBucket, string> = {
  public: '公开',
  admin: '系统管理',
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  patient: '患者',
};

const BUCKET_ORDER: RouteBucket[] = ['public', 'admin', 'doctor', 'nurse', 'pharma', 'patient'];

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/** 明细列定义 */
const resultColumns: ColumnsType<SmokeResult> = [
  {
    title: '状态',
    dataIndex: 'ok',
    key: 'ok',
    width: 80,
    render: (ok: boolean) =>
      ok ? <Tag color="green">通过</Tag> : <Tag color="red">失败</Tag>,
  },
  { title: '方法', dataIndex: 'method', key: 'method', width: 70 },
  {
    title: '路由',
    dataIndex: 'path',
    key: 'path',
    render: (path: string, row) => (
      <span>
        {row.label ? <span style={{ marginRight: 8 }}>{row.label}</span> : null}
        <code style={{ fontSize: 12 }}>{path}</code>
      </span>
    ),
  },
  {
    title: '分桶',
    dataIndex: 'bucket',
    key: 'bucket',
    width: 90,
    render: (b: RouteBucket) => <Tag color="blue">{BUCKET_LABEL[b]}</Tag>,
  },
  { title: '状态码', dataIndex: 'status', key: 'status', width: 80 },
  { title: '耗时(ms)', dataIndex: 'elapsedMs', key: 'elapsedMs', width: 100 },
  { title: '备注', dataIndex: 'note', key: 'note', render: (note?: string) => note ?? '—' },
];

export default function SmokePage() {
  const [data, setData] = useState<SmokeReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/smoke');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SmokeReport);
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

  const gateOk = data?.ok ?? false;
  const passRatePct = data ? Math.round(data.passRate * 10000) / 100 : 0;

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
          全路由冒烟测试
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          生产就绪质量门禁 · 仅 admin 可见 · 覆盖 admin / doctor / nurse / pharma /
          patient / public 六桶
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在执行全路由冒烟…" />
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
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>
                    门禁结论
                  </span>
                  <Tag
                    color={gateOk ? 'green' : 'red'}
                    style={{ fontSize: 16, padding: '4px 16px' }}
                  >
                    {gateOk ? '全绿放行' : `存在 ${data.fail} 条红项`}
                  </Tag>
                </Col>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    基准 {data.baseUrl} · 生成于 {fmtTime(data.generatedAt)}
                  </span>
                </Col>
                <Col style={{ marginLeft: 'auto' }}>
                  <Button onClick={load}>重新执行</Button>
                </Col>
              </Row>
            </Card>

            {/* 核心指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <Statistic title="路由总数" value={data.total} suffix="条" />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="通过（绿）"
                    value={data.pass}
                    valueStyle={{ color: VI.pass }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="失败（红）"
                    value={data.fail}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card title="通过率">
                  <Progress
                    percent={passRatePct}
                    size="small"
                    status={gateOk ? 'success' : 'exception'}
                  />
                </Card>
              </Col>
              <Col span={3}>
                <Card>
                  <Statistic title="平均耗时" value={data.avgElapsedMs} suffix="ms" />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="最大耗时" value={data.maxElapsedMs} suffix="ms" />
                </Card>
              </Col>
            </Row>

            {/* 六桶分桶 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {BUCKET_ORDER.map((b) => {
                const s = data.byBucket[b];
                const bucketOk = s.fail === 0;
                return (
                  <Col span={4} key={b}>
                    <Card size="small">
                      <Statistic
                        title={
                          <span>
                            {BUCKET_LABEL[b]}{' '}
                            <Tag color={bucketOk ? 'green' : 'red'}>
                              {bucketOk ? '绿' : '红'}
                            </Tag>
                          </span>
                        }
                        value={s.total}
                        suffix={
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            通 {s.pass} / 败 {s.fail}
                          </span>
                        }
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 失败清单（红区） */}
            {data.failures.length > 0 && (
              <Card
                title={
                  <span style={{ color: VI.fail }}>
                    失败明细（{data.failures.length}）
                  </span>
                }
                style={{ marginBottom: 16, borderColor: VI.fail }}
              >
                <Table<SmokeResult>
                  rowKey={(r) => `${r.method} ${r.path}`}
                  columns={resultColumns}
                  dataSource={data.failures}
                  pagination={false}
                  size="small"
                />
              </Card>
            )}

            {/* 全部路由明细 */}
            <Card title={`全部路由明细（${data.results.length}）`}>
              <Table<SmokeResult>
                rowKey={(r) => `${r.method} ${r.path}`}
                columns={resultColumns}
                dataSource={data.results}
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
