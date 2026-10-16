/**
 * 健澜科技 jlmedaios - M173-B 深度代码质量页（仅 admin）
 *
 * 【质量提升与新场景】在 M150-B/M167-D 之上做深度一步，展示五类真扫描结果：
 *  - 函数复杂度：圈复杂度 > 10 的函数清单 + 可落地拆分建议；
 *  - 代码重复：跨文件重复块（归一化指纹归并）；
 *  - 命名规范：snake_case / 类名非 PascalCase 等问题；
 *  - 注释完整性：缺 JSDoc 的导出函数；
 *  - 死代码：未再引用的局部变量 / 零再引用导出。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF codeQualityDeepAggregator 输出对齐的类型 ---------------- */

interface ComplexFunction {
  name: string;
  line: number;
  complexity: number;
  threshold: number;
  over: number;
}

interface NamingIssue {
  name: string;
  kind: 'function' | 'variable' | 'class';
  line: number;
  expected: string;
  reason: string;
}

interface MissingDocIssue {
  name: string;
  line: number;
  kind: 'exported-function' | 'exported-const';
}

interface DeadCodeIssue {
  name: string;
  line: number;
  kind: 'unused-local' | 'unused-export';
}

interface DuplicateOccurrence {
  file: string;
  line: number;
}

interface DuplicateBlock {
  preview: string;
  lines: number;
  occurrences: DuplicateOccurrence[];
}

interface DeepScan {
  file: string;
  summary: { score: number; grade: 'A' | 'B' | 'C' | 'D'; functionCount: number; issueTotal: number };
  complexFunctions: ComplexFunction[];
  namingIssues: NamingIssue[];
  missingDocIssues: MissingDocIssue[];
  deadCodeIssues: DeadCodeIssue[];
  duplicates: DuplicateBlock[];
}

interface RefactorSuggestion {
  name: string;
  line: number;
  currentComplexity: number;
  threshold: number;
  action: string;
  extractAs: string;
  estimatedAfter: number;
}

interface DeepQualityView {
  scan: DeepScan;
  refactor: RefactorSuggestion[];
  duplicates: DuplicateBlock[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const GRADE_COLOR: Record<string, string> = { A: '#3f8600', B: '#1e6fbf', C: '#d48806', D: '#cf1322' };

export default function CodeQualityDeepPage() {
  const [data, setData] = useState<DeepQualityView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/code/deep-quality');
      const body = (await resp.json()) as { code: number; message?: string; data?: DeepQualityView };
      if (body.code !== 0) {
        setError(body.message || '加载失败');
        setData(null);
        return;
      }
      setData(body.data ?? null);
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

  const scan = data?.scan;
  const summary = scan?.summary;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          深度代码质量 · M173-B
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【质量提升与新场景】圈复杂度拆分 · 重复块识别 · 命名规范 · 导出 JSDoc · 死代码
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="深度扫描代码中…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={() => void load()}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无深度扫描结果，稍后刷新即可。" />
        )}

        {!loading && !error && data && summary && scan && (
          <>
            {/* VI 概览卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    质量总分 / 等级
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: GRADE_COLOR[summary.grade] ?? VI.accent }}>
                    {summary.score} 分 · {summary.grade}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    扫描函数数
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: VI.accent }}>
                    {summary.functionCount}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    超复杂度函数（&gt;10）
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: scan.complexFunctions.length ? '#cf1322' : '#3f8600' }}>
                    {scan.complexFunctions.length}
                  </Title>
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Paragraph type="secondary" style={{ marginBottom: 4 }}>
                    问题总数
                  </Paragraph>
                  <Title level={3} style={{ margin: 0, color: summary.issueTotal ? '#d48806' : '#3f8600' }}>
                    {summary.issueTotal}
                  </Title>
                </Card>
              </Col>
            </Row>

            {/* 重构建议（真改问题：给动作） */}
            <Card title="复杂函数重构建议（圈复杂度 > 10 必须拆分）" style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.name}:${r.line}`}
                pagination={false}
                dataSource={data.refactor}
                locale={{ emptyText: '无超复杂度函数，保持红线' }}
                columns={[
                  {
                    title: '函数 / 位置',
                    dataIndex: 'name',
                    width: 220,
                    render: (_: unknown, row: RefactorSuggestion) => (
                      <div>
                        <Text code>{row.name}</Text>
                        <br />
                        <Text type="secondary">line {row.line}</Text>
                      </div>
                    ),
                  },
                  {
                    title: '当前圈复杂度',
                    dataIndex: 'currentComplexity',
                    width: 130,
                    render: (_: unknown, row: RefactorSuggestion) => (
                      <Tag color={row.currentComplexity > row.threshold ? 'red' : 'green'}>
                        {row.currentComplexity}（红线 {row.threshold}）
                      </Tag>
                    ),
                  },
                  { title: '拆分动作', dataIndex: 'action', ellipsis: true },
                  {
                    title: '建议提取为',
                    dataIndex: 'extractAs',
                    width: 200,
                    render: (_: unknown, row: RefactorSuggestion) => <Text code>{row.extractAs}</Text>,
                  },
                  {
                    title: '拆分后预估',
                    dataIndex: 'estimatedAfter',
                    width: 110,
                    render: (_: unknown, row: RefactorSuggestion) => <Text type="secondary">CC ≈ {row.estimatedAfter}</Text>,
                  },
                ]}
              />
            </Card>

            {/* 重复块 */}
            <Card title="跨文件重复代码块" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.duplicates}
                locale={{ emptyText: '未发现跨文件重复块' }}
                renderItem={(block) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          <Tag color="orange">{block.occurrences.length} 处重复</Tag>
                          <Text type="secondary" style={{ marginLeft: 8 }}>
                            {block.lines} 行块
                          </Text>
                        </span>
                      }
                      description={
                        <div>
                          <Text code style={{ fontSize: 12 }}>
                            {block.preview}
                          </Text>
                          <br />
                          {block.occurrences.map((o, idx) => (
                            <Text key={idx} type="secondary" style={{ marginRight: 12 }}>
                              {o.file}:{o.line}
                            </Text>
                          ))}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Row gutter={16}>
              {/* 命名规范 */}
              <Col span={8}>
                <Card title="命名规范问题" size="small" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={scan.namingIssues}
                    locale={{ emptyText: '命名合规' }}
                    renderItem={(it) => (
                      <List.Item>
                        <Text code>{it.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          L{it.line} · {it.expected}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              {/* 注释完整性 */}
              <Col span={8}>
                <Card title="导出函数缺 JSDoc" size="small" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={scan.missingDocIssues}
                    locale={{ emptyText: '导出均有 JSDoc' }}
                    renderItem={(it) => (
                      <List.Item>
                        <Text code>{it.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          L{it.line} · 补 /** ... */ 注释
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              {/* 死代码 */}
              <Col span={8}>
                <Card title="死代码（未使用）" size="small" style={{ marginBottom: 16 }}>
                  <List
                    size="small"
                    dataSource={scan.deadCodeIssues}
                    locale={{ emptyText: '无死代码' }}
                    renderItem={(it) => (
                      <List.Item>
                        <Text code>{it.name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          L{it.line} · {it.kind === 'unused-local' ? '局部变量未引用' : '导出零再引用，确认后删除'}
                        </Text>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
