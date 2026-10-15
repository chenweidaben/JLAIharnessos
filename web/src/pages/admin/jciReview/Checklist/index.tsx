/**
 * 健澜科技 jlmedaios - M141-A 三甲评审准备页（质量与安全，仅 admin）
 *
 * 展示 BFF /api/v1/admin/review/checklist 的七大类别核心条款：
 * 医院功能与任务 / 医疗质量安全管理 / 护理质量管理 / 药事管理 /
 * 院感管理 / 病案管理 / 医院管理。红黄绿三态标签 + 证据链 + 差距整改清单。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无评审条款）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Spin, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type ReviewStatus = 'met' | 'improving' | 'unmet';

interface EvidenceItem {
  type: 'document' | 'meeting' | 'data' | 'audit';
  ref: string;
}

interface Criterion {
  id: string;
  category: string;
  code: string;
  title: string;
  description: string;
  status: ReviewStatus;
  ownerDept: string;
  priority: 'high' | 'medium' | 'low';
  evidence: EvidenceItem[];
}

interface GapItem {
  criterionId: string;
  title: string;
  categoryName: string;
  status: ReviewStatus;
  ownerDept: string;
  priority: 'high' | 'medium' | 'low';
  evidenceCount: number;
  recommendation: string;
}

interface GapReport {
  totalCriteria: number;
  counts: Record<ReviewStatus, number>;
  passRate: number;
  overall: 'green' | 'yellow' | 'red';
  byCategory: Array<{ category: string; categoryName: string; total: number; met: number; improving: number; unmet: number; rate: number }>;
  gaps: GapItem[];
}

interface ChecklistResp {
  checklist: Criterion[];
  gapReport: GapReport;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

/** 红黄绿三态元数据 */
const STATUS_META: Record<ReviewStatus, { color: string; text: string; tag: 'success' | 'warning' | 'error' }> = {
  met: { color: '#52c41a', text: '已达标', tag: 'success' },
  improving: { color: '#faad14', text: '待改进', tag: 'warning' },
  unmet: { color: '#ff4d4f', text: '未达标', tag: 'error' },
};

const PRIORITY_META: Record<'high' | 'medium' | 'low', { text: string; color: string }> = {
  high: { text: '高优先', color: '#ff4d4f' },
  medium: { text: '中优先', color: '#faad14' },
  low: { text: '低优先', color: '#8c8c8c' },
};

function LightBulb({ status }: { status: ReviewStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      style={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        background: meta.color,
        boxShadow: `0 0 6px ${meta.color}`,
        marginRight: 8,
      }}
    />
  );
}

export default function JciReviewChecklistPage() {
  const [data, setData] = useState<ChecklistResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/review/checklist');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as ChecklistResp);
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

  /** 按类别分组（顺序与评审手册章节一致） */
  const grouped = useMemo(() => {
    if (!data) return [];
    const order = [...(data.gapReport?.byCategory ?? [])];
    const map = new Map<string, Criterion[]>();
    for (const c of data.checklist) {
      const list = map.get(c.category) ?? [];
      list.push(c);
      map.set(c.category, list);
    }
    return order.map((cat) => ({
      name: cat.categoryName,
      rate: cat.rate,
      items: map.get(cat.category) ?? [],
    }));
  }, [data]);

  const report = data?.gapReport;
  const overall = report?.overall ?? 'green';

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
          三甲评审准备 · 检查清单
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          七大类别核心条款红黄绿台账 · 仅 admin 可见 · 已达标率 {report?.passRate ?? '-'}%
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在聚合评审条款台账…" />
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

        {/* empty 态：成功返回但无条款 */}
        {!loading && !error && (!data || !data.checklist || data.checklist.length === 0) && (
          <Alert type="info" showIcon message="暂无评审条款。评审办初始化核心条款目录后将自动展示。" />
        )}

        {!loading && !error && data && data.checklist.length > 0 && report && (
          <>
            {/* 整体结论横幅 */}
            <Card style={{ marginBottom: 16 }}>
              <Row align="middle" gutter={24}>
                <Col>
                  <span style={{ marginRight: 12 }}>整体结论</span>
                  <LightBulb status={overall === 'green' ? 'met' : overall === 'yellow' ? 'improving' : 'unmet'} />
                  <Tag color={STATUS_META[overall === 'green' ? 'met' : overall === 'yellow' ? 'improving' : 'unmet'].tag} style={{ fontSize: 16, padding: '4px 16px' }}>
                    {STATUS_META[overall === 'green' ? 'met' : overall === 'yellow' ? 'improving' : 'unmet'].text}
                  </Tag>
                </Col>
                <Col>
                  <Tag color="success">已达标 {report.counts.met}</Tag>
                </Col>
                <Col>
                  <Tag color="warning">待改进 {report.counts.improving}</Tag>
                </Col>
                <Col>
                  <Tag color="error">未达标 {report.counts.unmet}</Tag>
                </Col>
                <Col flex="auto" style={{ textAlign: 'right' }}>
                  <Text type="secondary">条款总数 {report.totalCriteria}</Text>
                </Col>
              </Row>
            </Card>

            {/* 差距整改清单 */}
            {report.gaps.length > 0 && (
              <Card title={`差距整改清单（${report.gaps.length} 项）`} style={{ marginBottom: 16 }}>
                <List
                  dataSource={report.gaps}
                  renderItem={(g) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            <LightBulb status={g.status} />
                            {g.criterionId} · {g.title}
                            <Tag style={{ marginLeft: 8 }} color={STATUS_META[g.status].tag}>
                              {STATUS_META[g.status].text}
                            </Tag>
                            <Tag color={PRIORITY_META[g.priority].color} style={{ marginLeft: 4 }}>
                              {PRIORITY_META[g.priority].text}
                            </Tag>
                          </span>
                        }
                        description={
                          <span>
                            {g.categoryName} · 责任科室 {g.ownerDept} · 已留痕证据 {g.evidenceCount} 条
                            <br />
                            <Text type="secondary">建议：{g.recommendation}</Text>
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            )}

            {/* 七大类别条款台账 */}
            {grouped.map((g) => (
              <Card
                key={g.name}
                title={
                  <span>
                    {g.name}
                    <Tag color={g.rate >= 90 ? 'success' : g.rate >= 60 ? 'warning' : 'error'} style={{ marginLeft: 8 }}>
                    已达标率 {g.rate}%
                    </Tag>
                  </span>
                }
                style={{ marginBottom: 16 }}
              >
                <List
                  dataSource={g.items}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <span>
                            <LightBulb status={item.status} />
                            {item.id}（{item.code}）· {item.title}
                            <Tag style={{ marginLeft: 8 }} color={STATUS_META[item.status].tag}>
                              {STATUS_META[item.status].text}
                            </Tag>
                          </span>
                        }
                        description={
                          <span>
                            {item.description}
                            <br />
                            <Text type="secondary">责任科室：{item.ownerDept}</Text>
                            {item.evidence.map((e, idx) => (
                              <div key={idx} style={{ marginTop: 2 }}>
                                <Tag>{e.type === 'document' ? '制度文件' : e.type === 'meeting' ? '会议纪要' : e.type === 'data' ? '监测数据' : '内审记录'}</Tag>
                                <Text type="secondary">{e.ref}</Text>
                              </div>
                            ))}
                          </span>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            ))}
          </>
        )}
      </Content>
    </Layout>
  );
}
