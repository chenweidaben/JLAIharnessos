/**
 * 健澜科技 jlmedaios - M122-D 管理员反馈分析面板
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 把分散的患者评价聚合成科室排名、高频问题与改进方向，驱动服务持续改进。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无评价数据）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Layout, List, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF analyzePatientFeedback 输出对齐 */
interface FeedbackAnalysis {
  deptSatisfactionRank: Array<{ deptCode: string; avgRating: number; count: number }>;
  topIssues: Array<{ key: string; label: string; count: number }>;
  improvementAreas: Array<{ area: string; label: string; count: number }>;
  total: number;
  overallAvg: number;
}

export default function FeedbackAnalysisPage() {
  const [data, setData] = useState<FeedbackAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/feedback/analysis');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as FeedbackAnalysis);
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

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1080, margin: '0 auto' }}>
        <Title level={3}>患者反馈分析</Title>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载反馈分析中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={load}>重试</Button>}
          />
        )}

        {/* empty 态 */}
        {!loading && !error && (!data || data.total === 0) && (
          <Alert type="info" showIcon message="暂无患者评价数据，待患者就诊后提交评价后自动生成分析。" />
        )}

        {!loading && !error && data && data.total > 0 && (
          <>
            <Paragraph type="secondary">
              共 {data.total} 条评价，总体均分 {data.overallAvg} / 5
            </Paragraph>

            <Card title="科室满意度排名" style={{ marginBottom: 16 }}>
              <Table
                rowKey="deptCode"
                pagination={false}
                dataSource={data.deptSatisfactionRank}
                columns={[
                  { title: '科室', dataIndex: 'deptCode' },
                  {
                    title: '平均分',
                    dataIndex: 'avgRating',
                    render: (v: number) => (
                      <Tag color={v >= 4 ? 'green' : v >= 3 ? 'orange' : 'red'}>{v}</Tag>
                    ),
                  },
                  { title: '评价数', dataIndex: 'count' },
                ]}
              />
            </Card>

            <Card title="高频问题" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.topIssues}
                locale={{ emptyText: '暂未提取到高频问题' }}
                renderItem={(item) => (
                  <List.Item>
                    <span style={{ fontSize: 16 }}>{item.label}</span>
                    <Tag color="red">命中 {item.count} 条</Tag>
                  </List.Item>
                )}
              />
            </Card>

            <Card title="改进方向（来自低分反馈）">
              <List
                dataSource={data.improvementAreas}
                locale={{ emptyText: '暂无需要改进的方向' }}
                renderItem={(item) => (
                  <List.Item>
                    <span style={{ fontSize: 16 }}>{item.label}</span>
                    <Tag color="orange">{item.count} 条低分反馈</Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
