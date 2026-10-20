/**
 * 健澜科技 jlmedaios - M135-B 前端 UI 一致性检查报告页（仅 admin，质量门禁工具）
 *
 * 展示深海蓝 VI 合规巡检结果：颜色 / 字号 / 间距三维度问题清单、
 * VI 色板参考、严重度统计。三态：loading / error（可重试）/ 数据态。
 * 视觉：深海蓝 VI（#0A2540 → #1E5F8C 渐变头部）。
 *
 * 【生产就绪质量门禁】本页与 BFF aggregators/uiConsistencyAggregator.ts 输出对齐。
 *
 * v5.0试点扩展（M184空壳崩溃修复）：/api/v1/admin/ui-consistency 未上线（404）时，
 * 前端自动回退 BASELINE_ISSUES 内置基线并展示黄色友好提示，不白屏。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------------------------------------------ *
 * 与 BFF uiConsistencyAggregator 对齐的类型与 VI 常量
 * ------------------------------------------------------------------ */

type IssueSeverity = 'error' | 'warning' | 'info';
type IssueCategory = 'color' | 'fontSize' | 'spacing';

interface Issue {
  id: string;
  severity: IssueSeverity;
  category: IssueCategory;
  component: string;
  message: string;
  expected: string;
  actual: string;
  suggestion: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  primary: '#0A2540',
  secondary: '#1E5F8C',
  accent: '#4A90D9',
  bg: '#F5F7FA',
};

const FONT_SIZE_SCALE = [12, 14, 16, 20, 24, 30, 36];
const SPACING_SCALE = [4, 8, 12, 16, 24, 32, 48, 64];

/** 离线基线（与 generateUIIssueList 对齐，BFF 未上线时兜底展示） */
const BASELINE_ISSUES: Issue[] = [
  {
    id: 'ui-color-LegacyHeader-1',
    severity: 'error',
    category: 'color',
    component: 'LegacyHeader',
    message: '颜色 #2E7D32 不在深海蓝 VI 色板内',
    expected: '#0A2540 / #1E5F8C / #4A90D9',
    actual: '#2E7D32',
    suggestion: '改用主色 #0A2540、辅色 #1E5F8C 或强调色 #4A90D9',
  },
  {
    id: 'ui-fontSize-LegacyHeader-2',
    severity: 'warning',
    category: 'fontSize',
    component: 'LegacyHeader',
    message: '字号 18px 不在统一刻度内',
    expected: '12 / 14 / 16 / 20 / 24 / 30 / 36 px',
    actual: '18px',
    suggestion: '就近收敛为 20px（统一字号刻度）',
  },
  {
    id: 'ui-spacing-LegacyHeader-3',
    severity: 'warning',
    category: 'spacing',
    component: 'LegacyHeader',
    message: '间距 10px 不在 4px 网格内',
    expected: '4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px',
    actual: '10px',
    suggestion: '就近收敛为 12px（统一间距网格）',
  },
  {
    id: 'ui-color-OldButton-4',
    severity: 'error',
    category: 'color',
    component: 'OldButton',
    message: '颜色 #C2185B 不在深海蓝 VI 色板内',
    expected: '#0A2540 / #1E5F8C / #4A90D9',
    actual: '#C2185B',
    suggestion: '改用主色 #0A2540、辅色 #1E5F8C 或强调色 #4A90D9',
  },
  {
    id: 'ui-fontSize-OldButton-5',
    severity: 'warning',
    category: 'fontSize',
    component: 'OldButton',
    message: '字号 13px 不在统一刻度内',
    expected: '12 / 14 / 16 / 20 / 24 / 30 / 36 px',
    actual: '13px',
    suggestion: '就近收敛为 14px（统一字号刻度）',
  },
  {
    id: 'ui-spacing-OldButton-6',
    severity: 'warning',
    category: 'spacing',
    component: 'OldButton',
    message: '间距 6px 不在 4px 网格内',
    expected: '4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px',
    actual: '6px',
    suggestion: '就近收敛为 8px（统一间距网格）',
  },
  {
    id: 'ui-spacing-StatTile-7',
    severity: 'warning',
    category: 'spacing',
    component: 'StatTile',
    message: '间距 20px 不在 4px 网格内',
    expected: '4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px',
    actual: '20px',
    suggestion: '就近收敛为 24px（统一间距网格）',
  },
  {
    id: 'ui-spacing-FormRow-8',
    severity: 'warning',
    category: 'spacing',
    component: 'FormRow',
    message: '间距 14px 不在 4px 网格内',
    expected: '4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 px',
    actual: '14px',
    suggestion: '就近收敛为 16px（统一间距网格）',
  },
];

const SEVERITY_META: Record<IssueSeverity, { color: string; text: string }> = {
  error: { color: 'error', text: '违规' },
  warning: { color: 'warning', text: '偏差' },
  info: { color: 'default', text: '提示' },
};

const CATEGORY_META: Record<IssueCategory, { color: string; text: string }> = {
  color: { color: 'geekblue', text: '颜色' },
  fontSize: { color: 'purple', text: '字号' },
  spacing: { color: 'cyan', text: '间距' },
};

function Swatch({ hex, label }: { hex: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 6,
          background: hex,
          border: '1px solid rgba(0,0,0,0.1)',
        }}
      />
      <div>
        <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>{label}</div>
        <div style={{ fontFamily: 'monospace', fontSize: 12 }}>{hex}</div>
      </div>
    </div>
  );
}

export default function UIConsistencyPage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [usingBaseline, setUsingBaseline] = useState(false);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/ui-consistency');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '加载失败');
      setIssues((json.data?.issues as Issue[]) ?? []);
      setUsingBaseline(false);
    } catch (e) {
      // BFF 巡检端点未上线时，回退到内置基线，保证页面可演示
      setIssues(BASELINE_ISSUES);
      setUsingBaseline(true);
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const stats = useMemo(() => {
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const colorCount = issues.filter((i) => i.category === 'color').length;
    const fontSizeCount = issues.filter((i) => i.category === 'fontSize').length;
    const spacingCount = issues.filter((i) => i.category === 'spacing').length;
    return { total: issues.length, errorCount, warningCount, colorCount, fontSizeCount, spacingCount };
  }, [issues]);

  const columns: ColumnsType<Issue> = [
    {
      title: '严重度',
      dataIndex: 'severity',
      width: 90,
      render: (s: IssueSeverity) => <Tag color={SEVERITY_META[s].color}>{SEVERITY_META[s].text}</Tag>,
    },
    {
      title: '维度',
      dataIndex: 'category',
      width: 80,
      render: (c: IssueCategory) => <Tag color={CATEGORY_META[c].color}>{CATEGORY_META[c].text}</Tag>,
    },
    { title: '组件', dataIndex: 'component', width: 140 },
    { title: '问题', dataIndex: 'message' },
    {
      title: '规范值',
      dataIndex: 'expected',
      width: 220,
      render: (v: string) => <Text type="success">{v}</Text>,
    },
    {
      title: '实际值',
      dataIndex: 'actual',
      width: 100,
      render: (v: string) => <Text type="danger">{v}</Text>,
    },
    { title: '修复建议', dataIndex: 'suggestion' },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.primary} 0%, ${VI.secondary} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          UI 一致性检查报告
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          生产就绪质量门禁 · 仅 admin 可见 · 深海蓝 VI 合规巡检（颜色 / 字号 / 间距）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在巡检前端 VI 一致性…" />
          </div>
        )}

        {/* 错误 / 基线提示 */}
        {!loading && error && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message={`实时巡检暂不可用（${error}），当前展示内置基线数据`}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {!loading && (
          <>
            {/* VI 规范参考 */}
            <Card title="深海蓝 VI 规范" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <Swatch hex={VI.primary} label="主色 Primary" />
                </Col>
                <Col span={6}>
                  <Swatch hex={VI.secondary} label="辅色 Secondary" />
                </Col>
                <Col span={6}>
                  <Swatch hex={VI.accent} label="强调色 Accent" />
                </Col>
                <Col span={6}>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>
                    字号刻度：{FONT_SIZE_SCALE.join(' / ')} px
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)', marginTop: 8 }}>
                    间距网格：{SPACING_SCALE.join(' / ')} px
                  </div>
                </Col>
              </Row>
            </Card>

            {/* 统计概览 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>问题总数</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: VI.primary }}>{stats.total}</div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>违规 error</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#CF1322' }}>{stats.errorCount}</div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>偏差 warning</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#D48806' }}>{stats.warningCount}</div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>颜色类</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: VI.accent }}>{stats.colorCount}</div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>字号类</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#722ED1' }}>{stats.fontSizeCount}</div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.65)' }}>间距类</div>
                  <div style={{ fontSize: 28, fontWeight: 600, color: '#08979C' }}>{stats.spacingCount}</div>
                </Card>
              </Col>
            </Row>

            {/* 问题清单 */}
            <Card
              title={usingBaseline ? '违规清单（内置基线）' : '违规清单'}
              extra={<Button size="small" onClick={load}>刷新巡检</Button>}
            >
              <Table<Issue>
                rowKey="id"
                columns={columns}
                dataSource={issues}
                pagination={false}
                size="middle"
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
