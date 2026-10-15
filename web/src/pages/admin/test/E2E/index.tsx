/**
 * 健澜科技 jlmedaios - M137-D 关键业务流程 E2E 红绿报告页（仅 admin，测试覆盖率冲刺）
 *
 * 直读 BFF GET /api/v1/admin/test/e2e 返回的 E2EReport：
 *  - 顶部深海蓝横幅：整体门禁结论（全绿放行 / 存在红项流程）；
 *  - 指标卡：流程数 / 全绿流程 / 红流程 / 流程通过率 / 步骤通过率 / 平均耗时；
 *  - 四条关键主链路卡片（门诊 / 住院 / 处方审核 / Personal Agent），展示步骤绿红；
 *  - 红区置顶列出失败流程；全部流程明细展开为逐步骤绿/红标签 + 耗时。
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

/** 与 BFF e2eTestAggregator E2EStepResult 对齐 */
interface E2EStepResult {
  key: string;
  label: string;
  actor: string;
  action: string;
  ok: boolean;
  elapsedMs: number;
  note?: string;
}

/** 与 BFF runE2ETestFlow 输出对齐 */
interface E2EResult {
  flowName: string;
  label: string;
  ok: boolean;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  elapsedMs: number;
  steps: E2EStepResult[];
  note?: string;
}

/** 与 BFF generateE2EReport 输出对齐 */
interface E2EReport {
  generatedAt: string;
  totalFlows: number;
  passedFlows: number;
  failedFlows: number;
  totalSteps: number;
  passedSteps: number;
  failedSteps: number;
  flowPassRate: number;
  stepPassRate: number;
  ok: boolean;
  avgFlowElapsedMs: number;
  failures: E2EResult[];
  results: E2EResult[];
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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/** 单步明细列定义 */
const stepColumns: ColumnsType<E2EStepResult> = [
  {
    title: '状态',
    dataIndex: 'ok',
    key: 'ok',
    width: 80,
    render: (ok: boolean) =>
      ok ? <Tag color="green">通过</Tag> : <Tag color="red">失败</Tag>,
  },
  { title: '步骤', dataIndex: 'label', key: 'label', width: 110 },
  { title: '角色', dataIndex: 'actor', key: 'actor', width: 130 },
  {
    title: '模拟用户操作',
    dataIndex: 'action',
    key: 'action',
    render: (action: string, row) => (
      <span>
        <div>{action}</div>
        {row.note ? (
          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>{row.note}</div>
        ) : null}
      </span>
    ),
  },
  { title: '耗时(ms)', dataIndex: 'elapsedMs', key: 'elapsedMs', width: 100 },
];

export default function E2EPage() {
  const [data, setData] = useState<E2EReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/e2e');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as E2EReport);
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
  const flowPct = data ? Math.round(data.flowPassRate * 10000) / 100 : 0;
  const stepPct = data ? Math.round(data.stepPassRate * 10000) / 100 : 0;

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
          关键业务流程 E2E 测试
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          测试覆盖率冲刺 · 生产就绪质量门禁 · 仅 admin 可见 · 覆盖 门诊 / 住院 /
          处方审核 / Personal Agent 四条主链路
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在执行关键业务流程 E2E…" />
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
                    {gateOk ? '全绿放行' : `存在 ${data.failedFlows} 条红流程`}
                  </Tag>
                </Col>
                <Col>
                  <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: 12 }}>
                    生成于 {fmtTime(data.generatedAt)}
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
                  <Statistic title="流程总数" value={data.totalFlows} suffix="条" />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="全绿流程"
                    value={data.passedFlows}
                    valueStyle={{ color: VI.pass }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="红流程"
                    value={data.failedFlows}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card title="流程通过率">
                  <Progress
                    percent={flowPct}
                    size="small"
                    status={gateOk ? 'success' : 'exception'}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card title="步骤通过率">
                  <Progress
                    percent={stepPct}
                    size="small"
                    status={gateOk ? 'success' : 'exception'}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="平均流程耗时" value={data.avgFlowElapsedMs} suffix="ms" />
                </Card>
              </Col>
            </Row>

            {/* 红区：失败流程置顶 */}
            {data.failures.length > 0 && (
              <Card
                title={
                  <span style={{ color: VI.fail }}>
                    失败流程（{data.failures.length}）
                  </span>
                }
                style={{ marginBottom: 16, borderColor: VI.fail }}
              >
                <List
                  dataSource={data.failures}
                  renderItem={(f) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            <Tag color="red">红</Tag> {f.label}
                            <span style={{ marginLeft: 12, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                              步 {f.passedSteps}/{f.totalSteps} 通过
                            </span>
                          </span>
                        }
                        description={f.note ?? f.steps.find((s) => !s.ok)?.note}
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 四条主链路逐流程卡片 */}
            <Row gutter={[16, 16]}>
              {data.results.map((flow) => (
                <Col span={12} key={flow.flowName}>
                  <Card
                    size="small"
                    title={
                      <span>
                        <Tag color={flow.ok ? 'green' : 'red'}>
                          {flow.ok ? '绿' : '红'}
                        </Tag>
                        {flow.label}
                      </span>
                    }
                    extra={
                      <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                        {flow.passedSteps}/{flow.totalSteps} 步 · {flow.elapsedMs}ms
                      </span>
                    }
                  >
                    <Table<E2EStepResult>
                      rowKey={(s) => s.key}
                      columns={stepColumns}
                      dataSource={flow.steps}
                      pagination={false}
                      size="small"
                    />
                  </Card>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
