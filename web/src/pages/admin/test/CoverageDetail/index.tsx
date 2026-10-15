/**
 * 健澜科技 jlmedaios - M151-A 覆盖率明细页（90%+ 冲刺·函数级缺口定位，仅 admin）
 *
 * 【质量补齐与新场景】
 *
 * 直读 BFF GET /api/v1/admin/test/coverage/detailed 返回的
 *   { report: DetailedCoverage, verification: ThresholdResult }：
 *  - 顶部深海蓝横幅：行级门禁结论与整体行 / 分支覆盖率；
 *  - 指标卡：考核文件数 / 总行数 / 已覆盖行 / 缺口行 / 行覆盖率 / 分支覆盖率；
 *  - 门禁校验区：verifyCoverageThreshold 的 pass / delta / 还需补测行数 / 建议；
 *  - 五桶行级分桶卡（doctor / nurse / pharma / admin / other），各带进度条；
 *  - 重点文件钻取：securityBaselineAggregator（120 行缺口）与 backupAggregator
 *    （110 行缺口）的函数段明细表，hot 段（缺口 ≥15 行）红色置顶标识；
 *  - 优先级缺口表：按缺口行数降序。
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

/** 业务模块桶（与 BFF coverageDetailAggregator CoverageModule 对齐） */
type CoverageModule = 'doctor' | 'nurse' | 'pharma' | 'admin' | 'other';

interface SegmentCoverage {
  name: string;
  label: string;
  lines: number;
  coveredLines: number;
  uncoveredLines: number;
  lineRate: number;
  hot: boolean;
}

interface FileCoverageDetail {
  path: string;
  module: CoverageModule;
  lines: number;
  coveredLines: number;
  uncoveredLines: number;
  lineRate: number;
  branchRate: number;
  focus: boolean;
  segments: SegmentCoverage[];
  gapLocalization: string[];
}

interface ModuleLineStat {
  module: CoverageModule;
  label: string;
  files: number;
  lines: number;
  coveredLines: number;
  uncoveredLines: number;
  lineRate: number;
  meetsGate: boolean;
}

/** 与 BFF getDetailedCoverage 输出对齐 */
interface DetailedCoverage {
  generatedAt: string;
  targetThreshold: number;
  totalFiles: number;
  totalLines: number;
  coveredLines: number;
  uncoveredLines: number;
  lineRate: number;
  branchRate: number;
  gateOk: boolean;
  byModule: Record<CoverageModule, ModuleLineStat>;
  files: FileCoverageDetail[];
  priorityGaps: FileCoverageDetail[];
  focusFiles: { securityBaseline: FileCoverageDetail; backup: FileCoverageDetail };
}

/** 与 BFF verifyCoverageThreshold 输出对齐 */
interface ThresholdResult {
  threshold: number;
  currentRate: number;
  pass: boolean;
  delta: number;
  modulesBelow: CoverageModule[];
  linesNeeded: number;
  recommendation: string;
}

/** BFF 路由返回的信封 */
interface CoverageDetailPayload {
  report: DetailedCoverage;
  verification: ThresholdResult;
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

function shortName(path: string): string {
  return path.split('/').pop() ?? path;
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('zh-CN');
}

/** 函数段明细表列 */
const segmentColumns: ColumnsType<SegmentCoverage> = [
  {
    title: '函数段',
    dataIndex: 'label',
    key: 'label',
    render: (label: string, r) => (
      <span>
        <code style={{ fontSize: 12, marginRight: 8 }}>{r.name}</code>
        {label}
        {r.hot && (
          <Tag color="red" style={{ marginLeft: 8 }}>
            热区
          </Tag>
        )}
      </span>
    ),
  },
  { title: '总行', dataIndex: 'lines', key: 'lines', width: 80 },
  { title: '已覆盖', dataIndex: 'coveredLines', key: 'coveredLines', width: 90 },
  {
    title: '缺口',
    dataIndex: 'uncoveredLines',
    key: 'uncoveredLines',
    width: 90,
    render: (n: number) => (
      <span style={{ color: n > 0 ? VI.fail : undefined, fontWeight: n > 0 ? 600 : 400 }}>
        {n}
      </span>
    ),
  },
  {
    title: '段覆盖率',
    dataIndex: 'lineRate',
    key: 'lineRate',
    width: 220,
    render: (rate: number) => (
      <Progress
        percent={fmtPct(rate)}
        size="small"
        status={rate >= 0.9 ? 'success' : 'exception'}
      />
    ),
  },
];

/** 优先级缺口表列 */
const gapColumns: ColumnsType<FileCoverageDetail> = [
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
    render: (path: string) => <code style={{ fontSize: 12 }}>{shortName(path)}</code>,
  },
  {
    title: '总行',
    dataIndex: 'lines',
    key: 'lines',
    width: 80,
  },
  {
    title: '缺口行',
    dataIndex: 'uncoveredLines',
    key: 'uncoveredLines',
    width: 100,
    render: (n: number) => <Tag color={n >= 100 ? 'red' : n >= 20 ? 'orange' : 'default'}>{n}</Tag>,
  },
  {
    title: '行覆盖率',
    dataIndex: 'lineRate',
    key: 'lineRate',
    width: 220,
    render: (rate: number) => (
      <Progress
        percent={fmtPct(rate)}
        size="small"
        status={rate >= 0.9 ? 'success' : 'exception'}
      />
    ),
  },
];

/** 重点文件钻取卡片 */
function FocusFileCard({ title, file }: { title: string; file: FileCoverageDetail }) {
  return (
    <Card
      size="small"
      title={
        <span>
          {title}
          <Tag color="red" style={{ marginLeft: 8 }}>
            缺口 {file.uncoveredLines} 行
          </Tag>
          <Tag style={{ marginLeft: 8 }}>
            行覆盖率 {fmtPct(file.lineRate)}%
          </Tag>
        </span>
      }
      style={{ marginBottom: 16 }}
    >
      <Paragraph style={{ marginBottom: 12 }}>
        <code style={{ fontSize: 12 }}>{file.path}</code>
      </Paragraph>
      <Table<SegmentCoverage>
        rowKey={(r) => r.name}
        columns={segmentColumns}
        dataSource={file.segments}
        pagination={false}
        size="small"
      />
    </Card>
  );
}

export default function CoverageDetailPage() {
  const [data, setData] = useState<CoverageDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/coverage/detailed');
      const json = await await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as CoverageDetailPayload);
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

  const report = data?.report;
  const verification = data?.verification;
  const ratePct = report ? fmtPct(report.lineRate) : 0;
  const targetPct = verification ? Math.round(verification.threshold * 100) : 90;

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
          覆盖率明细 · 函数级缺口定位（90%+ 冲刺）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          行 / 分支覆盖率钻取 · 重点：安全基线 120 行 · 备份恢复 110 行 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在计算覆盖率明细…" />
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

        {!loading && !error && report && verification && (
          <>
            {/* 门禁校验横幅 */}
            <Alert
              type={verification.pass ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                verification.pass
                  ? `门禁通过：整体行覆盖率 ${ratePct}% ≥ ${targetPct}%`
                  : `门禁未达：当前 ${ratePct}% < ${targetPct}%，还差 ${fmtPct(
                      verification.delta,
                    )} 个百分点`
              }
              description={
                <div>
                  {verification.recommendation}
                  {verification.modulesBelow.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      未达标核心桶：
                      {verification.modulesBelow.map((m) => (
                        <Tag key={m} color="red" style={{ marginLeft: 4 }}>
                          {MODULE_LABEL[m]}
                        </Tag>
                      ))}
                    </div>
                  )}
                </div>
              }
            />

            {/* 核心指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <Statistic title="考核文件" value={report.totalFiles} suffix="个" />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="总行数" value={report.totalLines} />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="已覆盖行"
                    value={report.coveredLines}
                    valueStyle={{ color: VI.pass }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic
                    title="缺口行"
                    value={report.uncoveredLines}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card title="行覆盖率">
                  <Progress
                    percent={ratePct}
                    size="small"
                    status={verification.pass ? 'success' : 'exception'}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card title="分支覆盖率">
                  <Progress percent={fmtPct(report.branchRate)} size="small" />
                </Card>
              </Col>
            </Row>

            {/* 五桶行级分桶 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {MODULE_ORDER.map((m) => {
                const s = report.byModule[m];
                const pct = fmtPct(s.lineRate);
                return (
                  <Col span={m === 'other' ? 5 : 4} key={m}>
                    <Card size="small">
                      <Statistic
                        title={
                          <span>
                            {s.label}{' '}
                            <Tag color={s.meetsGate ? 'green' : 'red'}>
                              {s.meetsGate ? '达标' : '缺口'}
                            </Tag>
                          </span>
                        }
                        value={s.coveredLines}
                        suffix={
                          <span style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
                            / {s.lines} 行
                          </span>
                        }
                      />
                      <Progress
                        percent={pct}
                        size="small"
                        status={s.meetsGate ? 'success' : 'exception'}
                      />
                    </Card>
                  </Col>
                );
              })}
            </Row>

            {/* 重点文件函数级钻取 */}
            <Card title="重点补测文件 · 函数段缺口定位" style={{ marginBottom: 16 }}>
              <FocusFileCard title="安全基线" file={report.focusFiles.securityBaseline} />
              <FocusFileCard title="备份恢复" file={report.focusFiles.backup} />
            </Card>

            {/* 优先级缺口表 */}
            <Card
              title={`优先级缺口（${report.priorityGaps.length}）· 还需补测 ${verification.linesNeeded} 行达 ${targetPct}%`}
              style={{ marginBottom: 16 }}
            >
              <Table<FileCoverageDetail>
                rowKey={(r) => r.path}
                columns={gapColumns}
                dataSource={report.priorityGaps}
                pagination={false}
                size="small"
              />
            </Card>

            <Paragraph type="secondary" style={{ textAlign: 'center' }}>
              生成于 {fmtTime(report.generatedAt)} · 杭州健澜科技有限公司 · 质量补齐与新场景
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
