/**
 * 健澜科技 jlmedaios - M150-D UI 一致性与无障碍报告页（仅 admin）
 *
 * 【UI 一致性与无障碍】展示：
 *  - 一致性五维度（深海蓝 VI 色值 / 按钮尺寸 / 字体大小 / 间距 / 图标风格）得分与违规清单；
 *  - 无障碍四维度（WCAG AA 颜色对比度 / 键盘导航 / 屏幕阅读器标签 / 表单 label 关联）。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * 【持续优化】接入真实前端静态扫描器后，本页无需改动，随 BFF 返回体自动升级。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF UiConsistencyView 对齐的类型 ---------------- */

type CheckStatus = 'pass' | 'warn' | 'fail';

interface ConsistencyFinding {
  element: string;
  message: string;
  expected: string;
  actual: string;
}

interface ConsistencyDimension {
  key: string;
  label: string;
  status: CheckStatus;
  checked: number;
  violations: number;
  score: number;
  findings: ConsistencyFinding[];
}

interface ConsistencyReport {
  dimensions: ConsistencyDimension[];
  totalChecked: number;
  totalViolations: number;
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface ContrastPairCheck {
  foreground: string;
  background: string;
  usage: string;
  ratio: number;
  required: number;
  pass: boolean;
}

interface A11yFinding {
  dimension: string;
  element: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}

interface AccessibilityReport {
  contrast: {
    requiredRatio: number;
    pairs: ContrastPairCheck[];
    passCount: number;
    failCount: number;
  };
  keyboard: {
    tabbableElements: number;
    missingFocusRing: number;
    focusTrapsOk: boolean;
    findings: A11yFinding[];
  };
  screenReader: {
    totalInteractive: number;
    missingLabel: number;
    findings: A11yFinding[];
  };
  formLabel: {
    totalFields: number;
    unassociated: number;
    findings: A11yFinding[];
  };
  score: number;
  grade: 'A' | 'B' | 'C' | 'D';
}

interface UiConsistencyView {
  consistency: ConsistencyReport;
  accessibility: AccessibilityReport;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 等级 → 颜色 */
function gradeColor(grade: string): string {
  return grade === 'A' ? '#3f8600' : grade === 'B' ? '#1e6fbf' : grade === 'C' ? '#d48806' : '#cf1322';
}

/** 维度状态 → Tag 颜色 */
function statusTag(status: CheckStatus): { color: string; text: string } {
  if (status === 'pass') return { color: 'success', text: '达标' };
  if (status === 'warn') return { color: 'warning', text: '偏差' };
  return { color: 'error', text: '违规' };
}

export default function UiConsistencyPage() {
  const [data, setData] = useState<UiConsistencyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/ui/consistency');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as UiConsistencyView);
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

  const consistency = data?.consistency;
  const a11y = data?.accessibility;

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
          UI 一致性与无障碍报告
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M150-D】深海蓝 VI 五维度一致性 · WCAG AA 对比度 · 键盘导航 · 屏幕阅读器 · 表单 label · 仅 admin
          可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载 UI 一致性报告中…" />
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
          <Alert type="info" showIcon message="暂无 UI 一致性数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="一致性健康分"
                    value={consistency?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: gradeColor(consistency?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="一致性等级"
                    value={consistency?.grade ?? '-'}
                    valueStyle={{ color: gradeColor(consistency?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="无障碍健康分"
                    value={a11y?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: gradeColor(a11y?.grade ?? 'D') }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="一致性违规合计"
                    value={consistency?.totalViolations ?? 0}
                    valueStyle={{ color: (consistency?.totalViolations ?? 0) > 0 ? '#cf1322' : '#3f8600' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 一致性五维度 */}
            <Card title="UI 一致性五维度" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                {(consistency?.dimensions ?? []).map((d) => {
                  const tag = statusTag(d.status);
                  return (
                    <Col span={12} key={d.key}>
                      <Card type="small" size="small">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text strong>{d.label}</Text>
                          <Tag color={tag.color}>{tag.text}</Tag>
                        </div>
                        <Progress percent={d.score} size="small" strokeColor={VI.accent} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          巡检 {d.checked} 项 · 违规 {d.violations} 项
                        </Text>
                        {d.findings.length > 0 && (
                          <List
                            size="small"
                            style={{ marginTop: 8 }}
                            dataSource={d.findings}
                            renderItem={(f) => (
                              <List.Item style={{ padding: '4px 0' }}>
                                <Text style={{ fontSize: 12 }}>
                                  <Tag>{f.element}</Tag>
                                  {f.message}（实际 {f.actual}，规范 {f.expected}）
                                </Text>
                              </List.Item>
                            )}
                          />
                        )}
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </Card>

            {/* WCAG AA 对比度 */}
            <Card title={`颜色对比度（WCAG AA 正文 ≥ ${a11y?.contrast.requiredRatio ?? 4.5}:1）`} style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.foreground}-${r.background}`}
                pagination={false}
                dataSource={a11y?.contrast.pairs ?? []}
                columns={[
                  { title: '配色', dataIndex: 'foreground', width: 140, render: (_: unknown, row: ContrastPairCheck) => (
                    <span>
                      <Tag color={row.foreground} style={{ marginRight: 4 }}>
                        A
                      </Tag>
                      {row.foreground} on {row.background}
                    </span>
                  ) },
                  { title: '用途', dataIndex: 'usage' },
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

            {/* 键盘 / 读屏 / 表单 label */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card title="键盘导航" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Tab 可达 {a11y?.keyboard.tabbableElements ?? 0} · 缺焦点环{' '}
                    {a11y?.keyboard.missingFocusRing ?? 0} · 焦点陷阱{' '}
                    {a11y?.keyboard.focusTrapsOk ? '就位' : '缺失'}
                  </Text>
                  <List
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={a11y?.keyboard.findings ?? []}
                    renderItem={(f) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text style={{ fontSize: 12 }}>
                          <Tag color={f.severity === 'error' ? 'red' : 'orange'}>{f.element}</Tag>
                          {f.message}
                        </Text>
                      </List.Item>
                    )}
                    locale={{ emptyText: '无键盘导航问题' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="屏幕阅读器标签" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    交互元素 {a11y?.screenReader.totalInteractive ?? 0} · 缺可访问名称{' '}
                    {a11y?.screenReader.missingLabel ?? 0}
                  </Text>
                  <List
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={a11y?.screenReader.findings ?? []}
                    renderItem={(f) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text style={{ fontSize: 12 }}>
                          <Tag color="red">{f.element}</Tag>
                          {f.message}
                        </Text>
                      </List.Item>
                    )}
                    locale={{ emptyText: '读屏标签齐全' }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="表单 label 关联" size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    字段 {a11y?.formLabel.totalFields ?? 0} · 未关联{' '}
                    {a11y?.formLabel.unassociated ?? 0}
                  </Text>
                  <List
                    size="small"
                    style={{ marginTop: 8 }}
                    dataSource={a11y?.formLabel.findings ?? []}
                    renderItem={(f) => (
                      <List.Item style={{ padding: '4px 0' }}>
                        <Text style={{ fontSize: 12 }}>
                          <Tag color="red">{f.element}</Tag>
                          {f.message}
                        </Text>
                      </List.Item>
                    )}
                    locale={{ emptyText: 'label 全部关联' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* 修复建议汇总 */}
            <Card title="修复建议">
              <List
                size="small"
                dataSource={[
                  '违规色统一收敛到深海蓝三色板（#0A2540 / #1E5F8C / #4A90D9），删除业务侧私有色值',
                  '按钮高度/字号只保留三档：24h/12px、32h/14px、40h/16px',
                  '图标统一 @ant-design/icons 家族与 12/16/20/24px 刻度，移除 react-icons 混用',
                  '强调色链接 #4A90D9 on 白底对比度不足，加深至辅色 #1E5F8C 或加粗',
                  '图标按钮一律补 aria-label；表单 label htmlFor 与 input id 一一对应',
                  '模态弹窗补焦点陷阱与 Esc 关闭，全局补 :focus-visible 焦点环',
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
