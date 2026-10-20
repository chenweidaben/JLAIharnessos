/** 健澜科技 jlmedaios - 剂量调整建议（M245 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Col, Empty, List, Row, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { drug: string; adjustment: string }
interface Data { liverImpairment: Row[]; renalImpairment: Row[] }
export default function CdsDoseAdjustmentPage() {
  usePageTitle('剂量调整建议');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/dose-adjustment').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="CDS 剂量调整建议">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Row gutter={16}>
            <Col span={12}>
              <Card title="肝功能不全">
                <List size="small" dataSource={data.liverImpairment} renderItem={(r) => (
                  <List.Item><Tag color="orange">{r.drug}</Tag><span style={{ marginLeft: 8 }}>{r.adjustment}</span></List.Item>
                )} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="肾功能不全">
                <List size="small" dataSource={data.renalImpairment} renderItem={(r) => (
                  <List.Item><Tag color="blue">{r.drug}</Tag><span style={{ marginLeft: 8 }}>{r.adjustment}</span></List.Item>
                )} />
              </Card>
            </Col>
          </Row>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
