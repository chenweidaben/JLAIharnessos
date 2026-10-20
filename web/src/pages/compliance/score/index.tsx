/** 健澜科技 jlmedaios - 合规评分（M309 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Statistic, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Dim { name: string; score: number; target: number }
interface Data { totalScore: number; grade: string; dimensions: Dim[] }
export default function ComplianceScorePage() {
  usePageTitle('合规评分');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/compliance/score').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="合规评分">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="总分" value={data.totalScore} suffix={<Tag color="gold">{data.grade}</Tag>} /></Card></Col>
              <Col span={16}><Card title="各维度">
                <List size="small" dataSource={data.dimensions} renderItem={(i) => <List.Item><Tag color="purple">{i.name}</Tag> 得分 {i.score} / 目标 {i.target}</List.Item>} />
              </Card></Col>
            </Row>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}