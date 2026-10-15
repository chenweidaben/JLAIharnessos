/**
 * 健澜科技 jlmedaios - M149-A 全路由冒烟测试报告页（仅 admin，生产质量门禁）
 *
 * 直读 BFF GET /api/v1/admin/test/smoke 返回的 SmokeReport：
 *  - 深海蓝横幅：整体门禁结论（无结构漂移 = 放行）；
 *  - 四分类指标卡：通过(绿) / 失败(红) / 需认证(蓝) / 权限不足(橙)；
 *  - 六桶分桶卡：admin / doctor / nurse / pharma / patient / ai；
 *  - 失败清单（红区置顶）+ 全部路由明细表（方法 / 路径 / 桶 / 状态 / 结论标签）。
 *
 * 纯函数语义：BFF 不实际发 HTTP 请求，仅枚举已知路由清单并按鉴权档合成
 * 预期拦截结果（admin→403 权限不足，其余受保护→401 需认证，漂移→500 失败）。
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

/** 四分类结论（与 BFF SmokeStatus 对齐） */
type Verdict = 'pass' | 'auth' | 'forbidden' | 'fail';

/** 六业务桶（M149-A 范围：admin/doctor/nurse/pharma/patient/ai） */
type RouteBucket = 'admin' | 'doctor' | 'nurse' | 'pharma' | 'patient' | 'ai';

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
  status: number;
  ok: boolean;
  elapsedMs: number;
  note?: string;
}

/** 与 BFF generateSmokeReport / smokeAllRoutes 输出对齐 */
interface SmokeReport {
  generatedAt: string;
  baseUrl: string;
  total: number;
  pass: number;
  fail: number;
  auth: number;
  forbidden: number;
  passRate: number;
  ok: boolean;
  avgElapsedMs: number;
  maxElapsedMs: number;
  byBucket: Record<RouteBucket, BucketStat>;
  byVerdict: Record<Verdict, number>;
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
  auth: '#1677ff',
  forbidden: '#fa8c16',
};

const BUCKET_LABEL: Record<RouteBucket, string> = {
  admin: '系统管理',
  doctor: '医生',
  nurse: '护士',
  pharma: '药师',
  patient: '患者',
  ai: 'AI 智能',
};

const BUCKET_ORDER: RouteBucket[] = ['admin', 'doctor', 'nurse', 'pharma', 'patient', 'ai'];

const VERDICT_META: Record<Verdict, { label: string; color: string }> = {
  pass: { label: '通过', color: VI.pass },
  fail: { label: '失败', color: VI.fail },
  auth: { label: '需认证', color: VI.auth },
  forbidden: { label: '权限不足', color: VI.forbidden },
};

/** 按合成状态码归一成四分类 */
function verdictOf(status: number): Verdict {
  if (status >= 200 && status < 300) return 'pass';
  if (status === 401) return 'auth';
  if (status === 403) return 'forbidden';
  return 'fail';
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/** 明细列定义 */
const resultColumns: ColumnsType<SmokeResult> = [
  {
    title: '结论',
    dataIndex: 'status',
    key: 'verdict',
    width: 100,
    render: (status: number) => {
      const v = verdictOf(status);
      const meta = VERDICT_META[v];
      return (
        <Tag color={meta.color} style={{ marginInlineEnd: 0 }}>
          {meta.label}
        </Tag>
      );
    },
  },
  { title: '方法', dataIndex: 'method', key: 'method', width: 70 },
  {
    title: '路由',
    dataIndex: 'path',
    key: 'path',
    render: (path: string) => <code style={{ fontSize: 12 }}>{path}</code>,
  },
  {
    title: '分桶',
    dataIndex: 'bucket',
    key: 'bucket',
    width: 90,
    render: (b: RouteBucket) => <Tag color="blue">{BUCKET_LABEL[b]}</Tag>,
  },
  { title: '状态码', dataIndex: 'status', key: 'status', width: 80 },
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
  const byVerdict = data?.byVerdict ?? { pass: 0, auth: 0, forbidden: 0, fail: 0 };

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
          生产质量门禁 · 仅 admin 可见 · 覆盖 admin / doctor / nurse / pharma / patient /
          ai 六前缀全部路由
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
                  <span style={{ color: 'rgba(0,0,0,0.65)', marginRight: 12 }}>门禁结论</span>
                  <Tag
                    color={gateOk ? 'green' : 'red'}
                    style={{ fontSize: 16, padding: '4px 16px' }}
                  >
                    {gateOk ? '清单健康 · 放行' : `存在 ${data.fail} 条结构漂移`}
                  </Tag>
                </Col>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    基准 {data.baseUrl} · 生成于 {fmtTime(data.generatedAt)}
                  </span>
                </Col>
                <Col style={{ marginLeft: 'auto' }}>
                  <Button type="primary" onClick={load}>
                    重新执行
                  </Button>
                </Col>
              </Row>
            </Card>

            {/* 四分类指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="通过（2xx）"
                    value={byVerdict.pass}
                    valueStyle={{ color: VI.pass }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="需认证（401）"
                    value={byVerdict.auth}
                    valueStyle={{ color: VI.auth }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="权限不足（403）"
                    value={byVerdict.forbidden}
                    valueStyle={{ color: VI.forbidden }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="失败（5xx / 漂移）"
                    value={byVerdict.fail}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 总数提示 */}
            <Card size="small" style={{ marginBottom: 16 }}>
              <span style={{ color: 'rgba(0,0,0,0.65)' }}>
                共扫描 <b>{data.total}</b> 条路由（含全部 HTTP 方法）；401/403 为预期鉴权与
                RBAC 拦截，非故障；仅 5xx / 重复 / 缺前缀计入「失败」。
              </span>
            </Card>

            {/* 六桶分桶 */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
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
                            <Tag color={bucketOk ? 'green' : 'red'}>{bucketOk ? '健康' : '异常'}</Tag>
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
                  <span style={{ color: VI.fail }}>失败明细（{data.failures.length}）</span>
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
