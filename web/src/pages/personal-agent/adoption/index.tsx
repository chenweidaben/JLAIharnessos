/**
 * 健澜科技 jlmedaios - Doctor MUSE 推荐效果追踪页（M183-A）
 *
 * 展示当前医生在指定时间窗口内的 AI 推荐采纳率、修改率、拒绝率，
 * 并列出低采纳推荐类型，指导 Personal Agent 持续优化推荐质量。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Card,
  Col,
  Layout,
  List,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0A2540',
  mid: '#1E5F8C',
  accent: '#4A90D9',
  bg: '#f5f7fa',
};

/** 后端返回的采纳率统计 */
interface AdoptionStats {
  doctorId: string;
  totalResolved: number;
  adoptedCount: number;
  modifiedCount: number;
  rejectedCount: number;
  pendingCount: number;
  adoptionRate: number | null;
  modificationRate: number | null;
  rejectionRate: number | null;
  byType: Array<{
    suggestionType: string;
    total: number;
    adopted: number;
    modified: number;
    rejected: number;
    pending: number;
    rate: number | null;
  }>;
  lowAdoption: Array<{
    suggestionType: string;
    resolved: number;
    rate: number;
    suggestion: string;
  }>;
  windowDays: number;
  degraded?: boolean;
  message?: string;
}

/** 采纳率等级颜色 */
function rateColor(rate: number | null): string {
  if (rate === null) return '#8c8c8c';
  if (rate >= 0.7) return '#52c41a';
  if (rate >= 0.4) return '#faad14';
  return '#f5222d';
}

/** 采纳率等级文案 */
function rateLabel(rate: number | null): string {
  if (rate === null) return '样本不足';
  if (rate >= 0.7) return '优秀';
  if (rate >= 0.4) return '待提升';
  return '低采纳';
}

export default function PersonalAgentAdoptionPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<AdoptionStats | null>(null);
  const [days, setDays] = useState(30);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const resp = await get<AdoptionStats>('/api/v1/personal-agent/adoption-stats', {
          query: { days: String(days) },
        });
        if (!cancelled) setStats(resp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [days]);

  const typeColumns: ColumnsType<AdoptionStats['byType'][number]> = [
    { title: '推荐类型', dataIndex: 'suggestionType', key: 'suggestionType' },
    { title: '总数', dataIndex: 'total', key: 'total', width: 80 },
    { title: '采纳', dataIndex: 'adopted', key: 'adopted', width: 80, render: (v: number) => <Tag color="green">{v}</Tag> },
    { title: '修改', dataIndex: 'modified', key: 'modified', width: 80, render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '拒绝', dataIndex: 'rejected', key: 'rejected', width: 80, render: (v: number) => <Tag color="red">{v}</Tag> },
    { title: '待处置', dataIndex: 'pending', key: 'pending', width: 80, render: (v: number) => <Tag color="default">{v}</Tag> },
    {
      title: '采纳率',
      dataIndex: 'rate',
      key: 'rate',
      width: 120,
      render: (v: number | null) => (
        <Text strong style={{ color: rateColor(v) }}>
          {v === null ? '—' : `${(v * 100).toFixed(0)}%`}
        </Text>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            Doctor MUSE 推荐效果追踪
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            让每条 AI 推荐都有反馈——采纳率、修改率、拒绝率一目了然，低采纳类型自动识别。
          </Paragraph>
        </div>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Text>时间窗口：</Text>
            </Col>
            <Col>
              <Select
                value={days}
                onChange={(v) => setDays(v)}
                options={[
                  { value: 7, label: '最近 7 天' },
                  { value: 30, label: '最近 30 天' },
                  { value: 90, label: '最近 90 天' },
                ]}
              />
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载推荐效果数据…" />
          </div>
        )}

        {error && (
          <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />
        )}

        {!loading && !error && stats && (
          <>
            {stats.degraded && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message={stats.message ?? '数据库暂不可用'}
              />
            )}

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="总推荐数（已闭环）"
                    value={stats.totalResolved}
                    valueStyle={{ color: VI.mid }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="采纳率"
                    value={stats.adoptionRate === null ? '—' : `${(stats.adoptionRate * 100).toFixed(1)}%`}
                    valueStyle={{ color: rateColor(stats.adoptionRate) }}
                    suffix={<Tag color={rateColor(stats.adoptionRate)}>{rateLabel(stats.adoptionRate)}</Tag>}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="修改率"
                    value={stats.modificationRate === null ? '—' : `${(stats.modificationRate * 100).toFixed(1)}%`}
                    valueStyle={{ color: '#4A90D9' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card>
                  <Statistic
                    title="拒绝率"
                    value={stats.rejectionRate === null ? '—' : `${(stats.rejectionRate * 100).toFixed(1)}%`}
                    valueStyle={{ color: '#f5222d' }}
                  />
                </Card>
              </Col>
            </Row>

            <Card
              title={<Text strong style={{ color: VI.deep }}>按推荐类型分布</Text>}
              style={{ marginBottom: 16 }}
            >
              <Table
                rowKey="suggestionType"
                columns={typeColumns}
                dataSource={stats.byType}
                pagination={false}
                size="small"
              />
            </Card>

            <Card
              title={<Text strong style={{ color: VI.deep }}>低采纳推荐识别（采纳率 &lt; 50%）</Text>}
            >
              {stats.lowAdoption.length === 0 ? (
                <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  暂无低采纳推荐类型——推荐质量良好。
                </Paragraph>
              ) : (
                <List
                  size="small"
                  dataSource={stats.lowAdoption}
                  renderItem={(item) => (
                    <List.Item>
                      <Space size="middle" style={{ width: '100%' }}>
                        <Tag color="red" style={{ minWidth: 80, textAlign: 'center' }}>
                          {item.suggestionType}
                        </Tag>
                        <Text strong style={{ color: '#f5222d', width: 80 }}>
                          {(item.rate * 100).toFixed(0)}%
                        </Text>
                        <Text type="secondary">{item.suggestion}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
