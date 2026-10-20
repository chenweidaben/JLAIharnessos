/** 健澜科技 jlmedaios - 租户配置（M261 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Descriptions, Empty, Spin, Tag } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Data {
  tenantId: string; isolationStrategy: string; isolationOptions: string[];
  cacheStrategy: string; rateLimit: { requestsPerMin: number; concurrentConn: number; burst: number };
}
export default function TenantsConfigPage() {
  usePageTitle('租户配置');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/config').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="租户配置（TNT-001）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <Card>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="隔离策略" span={2}><Tag color="purple">{data.isolationStrategy}</Tag></Descriptions.Item>
              <Descriptions.Item label="可选策略" span={2}>{data.isolationOptions.map((o) => <Tag key={o} style={{ margin: 2 }}>{o}</Tag>)}</Descriptions.Item>
              <Descriptions.Item label="缓存策略" span={2}>{data.cacheStrategy}</Descriptions.Item>
              <Descriptions.Item label="每分钟请求">{data.rateLimit.requestsPerMin}</Descriptions.Item>
              <Descriptions.Item label="并发连接">{data.rateLimit.concurrentConn}</Descriptions.Item>
              <Descriptions.Item label="突发上限" span={2}>{data.rateLimit.burst}</Descriptions.Item>
            </Descriptions>
          </Card>
        ) : <Card><Empty description="暂无配置" /></Card>}
      </Spin>
    </PageContainer>
  );
}
