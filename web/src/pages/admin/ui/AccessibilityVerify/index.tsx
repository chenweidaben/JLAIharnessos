/**
 * 健澜科技 jlmedaios - M151-B UI 无障碍对比度修复验证报告页（仅 admin）
 *
 * 【质量补齐与新场景】展示 M150-D 暴露的两处对比度违规的修复与复验：
 *  - 修复映射：强调色 #4A90D9→#2E6FB5、次要文字 #8C8C8C→#595959（修复前后对比度对照）；
 *  - 合规复验：修复后色板在全部使用场景（正文 / 反白按钮）下的 WCAG AA ≥ 4.5:1 判定。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部），新色值保持深海蓝调性。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF AccessibilityVerifyView 对齐的类型 ---------------- */

interface PaletteFix {
  role: 'accent' | 'secondaryText';
  label: string;
  from: string;
  to: string;
  background: string;
  beforeRatio: number;
  afterRatio: number;
  required: number;
  fixed: boolean;
  note: string;
}

interface FixedPalette {
  standard: string;
  requiredRatio: number;
  fixes: PaletteFix[];
  allFixed: boolean;
  copyright: string;
}

interface CompliancePair {
  foreground: string;
  background: string;
  usage: string;
  ratio: number;
  required: number;
  pass: boolean;
}

interface ComplianceResult {
  standard: string;
  requiredRatio: number;
  pairs: CompliancePair[];
  passCount: number;
  failCount: number;
  compliant: boolean;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface AccessibilityVerifyView {
  palette: FixedPalette;
  compliance: ComplianceResult;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#2e6fb5',
  bg: '#f5f7fa',
};

/** 等级 → 颜色 */
function gradeColor(grade: string): string {
  return grade === 'A' ? '#3f8600' : grade === 'B' ? '#2e6fb5' : grade === 'C' ? '#d48806' : '#cf1322';
}

export default function AccessibilityVerifyPage() {
  const [data, setData] = useState<AccessibilityVerifyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/ui/accessibility/verify');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as AccessibilityVerifyView);
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

  const palette = data?.palette;
  const compliance = data?.compliance;

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
          UI 无障碍对比度修复验证
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M151-B】强调色 #4A90D9→#2E6FB5 · 次要文字 #8C8C8C→#595959 · WCAG AA 正文 ≥ 4.5:1 · 仅 admin
          可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载无障碍修复验证报告中…" />
          </div>
        )}

        {/* error 态 */}
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

        {/* empty 态 */}
        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无无障碍验证数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="合规复验得分"
                    value={compliance?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: gradeColor(compliance?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="合规等级"
                    value={compliance?.grade ?? '-'}
                    valueStyle={{ color: gradeColor(compliance?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="全场景达标"
                    value={compliance?.compliant ? '是' : '否'}
                    valueStyle={{ color: compliance?.compliant ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="待修复项"
                    value={(palette?.fixes ?? []).filter((f) => !f.fixed).length}
                    valueStyle={{
                      color: (palette?.fixes ?? []).every((f) => f.fixed) ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 修复映射：旧色 → 新色 */}
            <Card title="对比度修复映射（WCAG AA）" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {(palette?.fixes ?? []).map((f) => (
                  <Col span={12} key={f.role}>
                    <Card size="small">
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text strong>{f.label}</Text>
                        {f.fixed ? <Tag color="success">已达标</Tag> : <Tag color="error">未达标</Tag>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <Tag color={f.from} style={{ color: '#fff', margin: 0 }}>
                          {f.from}
                        </Tag>
                        <Text type="secondary">→</Text>
                        <Tag color={f.to} style={{ color: '#fff', margin: 0 }}>
                          {f.to}
                        </Tag>
                      </div>
                      <Progress
                        percent={Math.min(100, Math.round((f.afterRatio / f.required) * 100))}
                        size="small"
                        strokeColor={VI.accent}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        修复前 {f.beforeRatio}:1 → 修复后 {f.afterRatio}:1（要求 ≥ {f.required}:1）
                      </Text>
                      <div>
                        <Text style={{ fontSize: 12 }}>{f.note}</Text>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 合规复验色对表 */}
            <Card
              title={`修复后色板合规复验（${compliance?.standard ?? 'WCAG AA'} · 正文 ≥ ${compliance?.requiredRatio ?? 4.5}:1）`}
              style={{ marginBottom: 16 }}
            >
              <Table
                rowKey={(r) => `${r.foreground}-${r.background}`}
                pagination={false}
                dataSource={compliance?.pairs ?? []}
                columns={[
                  {
                    title: '配色',
                    dataIndex: 'foreground',
                    width: 160,
                    render: (_: unknown, row: CompliancePair) => (
                      <span>
                        <Tag color={row.foreground} style={{ marginRight: 4, color: row.foreground === '#FFFFFF' ? '#8c8c8c' : '#fff' }}>
                          A
                        </Tag>
                        {row.foreground} on {row.background}
                      </span>
                    ),
                  },
                  { title: '使用场景', dataIndex: 'usage' },
                  {
                    title: '实测对比度',
                    dataIndex: 'ratio',
                    width: 110,
                    render: (v: number) => `${v}:1`,
                  },
                  {
                    title: 'AA 判定',
                    dataIndex: 'pass',
                    width: 100,
                    render: (pass: boolean) =>
                      pass ? <Tag color="success">通过</Tag> : <Tag color="error">未达</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 修复说明 */}
            <Card title="修复说明">
              <List
                size="small"
                dataSource={[
                  '强调色由 #4A90D9 加深为 #2E6FB5（深海蓝调性），白底正文对比度 3.34:1 → 5.18:1，反白按钮同值达标',
                  '次要文字由 #8C8C8C 加深为 #595959（中性灰），白底对比度 3.36:1 → 7.00:1',
                  '全站正文 / 链接 / 反白按钮统一按 WCAG 2.x AA 4.5:1 门禁，后续私有色值收敛到深海蓝三色板',
                  `报告版权：${palette?.copyright ?? '杭州健澜科技有限公司'}`,
                ]}
                renderItem={(item) => <List.Item>· {item}</List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
