/**
 * 健澜科技 jlmedaios — M182-B 测试覆盖率缺口修复页（输血/医保/药事，仅 admin）
 *
 * 【v5.0启动】
 *
 * 直读 BFF GET /api/v1/admin/test/coverage-fix 返回的
 *   { gaps: CoverageGapReport, plan: CoverageFixPlan, verify: CoverageVerifyResult }：
 *  - 顶部深海蓝横幅：修复前/后全仓行率、是否达成 ≥99%；
 *  - 三域汇总卡：输血管理 / 医保管理 / 药事管理 各自缺口行数；
 *  - 九大模块缺口表：行率、未覆盖行数、风险、缺口描述；
 *  - 补测用例表：场景、技术分类、覆盖行数（严格对齐缺口，不凑数）；
 *  - 修复复验：逐模块补测后行率（→100%）、达标判定、字母等级。
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

/* -------------------- 与 BFF 类型对齐（纯结构镜像，不引后端包） -------------------- */

type ClinicalDomain = 'transfusion' | 'insurance' | 'pharmacy';
type FixTechnique = 'state_machine' | 'boundary' | 'exception' | 'permission' | 'degradation';

interface CoverageGapItem {
  domain: ClinicalDomain;
  label: string;
  file: string;
  uncoveredLines: number;
  currentRate: number;
  risk: 1 | 2 | 3;
  description: string;
}

interface CoverageGapReport {
  totalRepoLines: number;
  coveredRepoLines: number;
  currentRepoRate: number;
  targetRate: number;
  modules: CoverageGapItem[];
  byDomain: Array<{ domain: ClinicalDomain; label: string; modules: number; uncoveredLines: number }>;
  totalUncoveredLines: number;
  alreadyPass: boolean;
  copyright: string;
}

interface CoverageFixCase {
  file: string;
  domain: ClinicalDomain;
  id: string;
  scenario: string;
  technique: FixTechnique;
  lines: number;
  testFile: string;
}

interface CoverageFixPlan {
  cases: CoverageFixCase[];
  caseCount: number;
  totalFixedLines: number;
  estimatedRateAfter: number;
  reachesTarget: boolean;
  copyright: string;
}

interface ModuleVerifyResult {
  domain: ClinicalDomain;
  label: string;
  file: string;
  totalLines: number;
  coveredBefore: number;
  fixedLines: number;
  coveredAfter: number;
  rateAfter: number;
  gapClosed: boolean;
}

interface CoverageVerifyResult {
  totalRepoLines: number;
  coveredBefore: number;
  coveredAfter: number;
  rateBefore: number;
  rateAfter: number;
  targetRate: number;
  modules: ModuleVerifyResult[];
  allGapsClosed: boolean;
  pass: boolean;
  linesShort: number;
  grade: 'A' | 'B' | 'C' | 'D';
  copyright: string;
}

interface CoverageFixPayload {
  gaps: CoverageGapReport;
  plan: CoverageFixPlan;
  verify: CoverageVerifyResult;
  generatedAt: number;
}

/* -------------------- 深海蓝 VI 色板与字典 -------------------- */

const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
  pass: '#52c41a',
  fail: '#ff4d4f',
  warn: '#faad14',
};

const DOMAIN_COLOR: Record<ClinicalDomain, string> = {
  transfusion: 'volcano',
  insurance: 'geekblue',
  pharmacy: 'green',
};

const DOMAIN_LABEL: Record<ClinicalDomain, string> = {
  transfusion: '输血管理',
  insurance: '医保管理',
  pharmacy: '药事管理',
};

const TECH_LABEL: Record<FixTechnique, string> = {
  state_machine: '状态机',
  boundary: '边界条件',
  exception: '异常拦截',
  permission: '权限边界',
  degradation: '降级路径',
};

function fmtPct(rate: number): string {
  return (Math.round(rate * 10000) / 100).toFixed(2);
}

/* -------------------- 缺口表列 -------------------- */

const gapColumns: ColumnsType<CoverageGapItem> = [
  {
    title: '业务域',
    dataIndex: 'domain',
    key: 'domain',
    width: 100,
    render: (d: ClinicalDomain) => <Tag color={DOMAIN_COLOR[d]}>{DOMAIN_LABEL[d]}</Tag>,
  },
  { title: '模块', dataIndex: 'label', key: 'label', width: 180 },
  {
    title: '当前行率',
    dataIndex: 'currentRate',
    key: 'currentRate',
    width: 110,
    render: (r: number) => (
      <span style={{ color: r < 0.95 ? VI.fail : VI.warn }}>{fmtPct(r)}%</span>
    ),
  },
  {
    title: '缺口行',
    dataIndex: 'uncoveredLines',
    key: 'uncoveredLines',
    width: 90,
    sorter: (a, b) => a.uncoveredLines - b.uncoveredLines,
    render: (n: number) => <span style={{ color: VI.fail }}>{n}</span>,
  },
  {
    title: '风险',
    dataIndex: 'risk',
    key: 'risk',
    width: 70,
    render: (r: 1 | 2 | 3) => (
      <Tag color={r === 3 ? 'red' : r === 2 ? 'orange' : 'default'}>P{r === 3 ? 0 : 1}</Tag>
    ),
  },
  { title: '缺口描述', dataIndex: 'description', key: 'description', ellipsis: true },
];

/* -------------------- 补测用例表列 -------------------- */

const caseColumns: ColumnsType<CoverageFixCase> = [
  { title: '用例', dataIndex: 'id', key: 'id', width: 180, ellipsis: true },
  {
    title: '业务域',
    dataIndex: 'domain',
    key: 'domain',
    width: 100,
    render: (d: ClinicalDomain) => <Tag color={DOMAIN_COLOR[d]}>{DOMAIN_LABEL[d]}</Tag>,
  },
  { title: '补测场景', dataIndex: 'scenario', key: 'scenario', ellipsis: true },
  {
    title: '技术',
    dataIndex: 'technique',
    key: 'technique',
    width: 100,
    render: (t: FixTechnique) => <Tag>{TECH_LABEL[t]}</Tag>,
  },
  {
    title: '覆盖行',
    dataIndex: 'lines',
    key: 'lines',
    width: 80,
    render: (n: number) => <span style={{ color: VI.accent }}>{n}</span>,
  },
];

/* -------------------- 复验表列 -------------------- */

const verifyColumns: ColumnsType<ModuleVerifyResult> = [
  { title: '模块', dataIndex: 'label', key: 'label', width: 180 },
  {
    title: '修复前',
    key: 'before',
    width: 100,
    render: (_: unknown, r: ModuleVerifyResult) =>
      `${Math.round((r.coveredBefore / r.totalLines) * 1000) / 10}%`,
  },
  { title: '补测行', dataIndex: 'fixedLines', key: 'fixedLines', width: 80 },
  {
    title: '修复后',
    key: 'after',
    width: 110,
    render: (_: unknown, r: ModuleVerifyResult) => (
      <span style={{ color: r.gapClosed ? VI.pass : VI.fail }}>{fmtPct(r.rateAfter)}%</span>
    ),
  },
  {
    title: '缺口闭合',
    dataIndex: 'gapClosed',
    key: 'gapClosed',
    width: 100,
    render: (ok: boolean) => <Tag color={ok ? 'success' : 'error'}>{ok ? '已闭合' : '未闭合'}</Tag>,
  },
];

/* -------------------- 主页面 -------------------- */

export default function CoverageFixPage() {
  const [data, setData] = useState<CoverageFixPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/test/coverage-fix');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as CoverageFixPayload);
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

  const gaps = data?.gaps;
  const plan = data?.plan;
  const verify = data?.verify;

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
          测试覆盖率缺口修复 · 输血 / 医保 / 药事（M182-B）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          缺口识别 → 真实补测 → 复验闭环 · 目标整体行率 ≥ 99% · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在计算覆盖率修复闭环…" />
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

        {!loading && !error && gaps && plan && verify && (
          <>
            {/* 顶部结论横幅 */}
            <Alert
              type={verify.pass ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                verify.pass
                  ? `复验通过：整体行率 ${fmtPct(verify.rateAfter)}% ≥ 99%（等级 ${verify.grade}）`
                  : `未达标：整体行率 ${fmtPct(verify.rateAfter)}%，距目标还差 ${verify.linesShort} 行`
              }
              description={`修复前 ${fmtPct(verify.rateBefore)}% → 修复后 ${fmtPct(verify.rateAfter)}%；${
                verify.allGapsClosed ? '九大模块缺口已全部闭合' : '仍有模块缺口未闭合'
              }`}
            />

            {/* 核心指标 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <Statistic title="修复前行率" value={fmtPct(verify.rateBefore)} suffix="%" />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="修复后行率"
                    value={fmtPct(verify.rateAfter)}
                    suffix="%"
                    valueStyle={{ color: verify.pass ? VI.pass : VI.warn }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="缺口合计"
                    value={gaps.totalUncoveredLines}
                    valueStyle={{ color: VI.fail }}
                  />
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <Statistic
                    title="补测用例"
                    value={plan.caseCount}
                    suffix={`条 / ${plan.totalFixedLines} 行`}
                    valueStyle={{ color: VI.accent }}
                  />
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <Statistic title="复验等级" value={verify.grade} valueStyle={{ color: VI.accent }} />
                </Card>
              </Col>
            </Row>

            {/* 三域汇总卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {gaps.byDomain.map((d) => (
                <Col span={8} key={d.domain}>
                  <Card size="small">
                    <Statistic
                      title={
                        <span>
                          <Tag color={DOMAIN_COLOR[d.domain]}>{d.label}</Tag>
                          {d.modules} 个模块
                        </span>
                      }
                      value={d.uncoveredLines}
                      suffix={<span style={{ fontSize: 12 }}>行缺口</span>}
                    />
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 九大模块缺口表 */}
            <Card title={`模块缺口识别（${gaps.modules.length} 个高危闭环模块）`} style={{ marginBottom: 16 }}>
              <Table
                rowKey="file"
                columns={gapColumns}
                dataSource={gaps.modules}
                pagination={false}
                size="small"
              />
            </Card>

            {/* 补测用例表 */}
            <Card
              title={`补测用例（${plan.caseCount} 条 · 覆盖 ${plan.totalFixedLines} 行，严格对齐缺口不凑数）`}
              style={{ marginBottom: 16 }}
            >
              <Table
                rowKey="id"
                columns={caseColumns}
                dataSource={plan.cases}
                pagination={{ pageSize: 10, showSizeChanger: false }}
                size="small"
              />
            </Card>

            {/* 复验表 */}
            <Card title="逐模块修复复验（补测后行率 → 100%）">
              <Table
                rowKey="file"
                columns={verifyColumns}
                dataSource={verify.modules}
                pagination={false}
                size="small"
              />
              <Progress
                percent={Math.round(
                  (verify.modules.filter((m) => m.gapClosed).length /
                    Math.max(1, verify.modules.length)) *
                    100,
                )}
                size="small"
                style={{ marginTop: 16 }}
                format={() => '模块缺口闭合率'}
              />
            </Card>

            <Paragraph style={{ marginTop: 16, fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>
              报告口径：全仓 {gaps.totalRepoLines} 行 · 已覆盖 {verify.coveredAfter} 行 · 版权
              {gaps.copyright}
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
