/** 健澜科技 jlmedaios - 数据脱敏配置（M258 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, List, Spin, Switch, Tag, Typography } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Rule { field: string; method: string; pattern: string; applicableRoles: string[] }
interface Data { enabled: boolean; effectiveAt: string; rules: Rule[]; hashFields: string[]; note: string }
export default function SecurityDataMaskPage() {
  usePageTitle('数据脱敏配置');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/data-mask').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="数据脱敏配置">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
                <span>脱敏总开关：<Switch checked={data.enabled} disabled /></span>
                <span>生效时间：<Tag color="blue">{data.effectiveAt}</Tag></span>
              </div>
              <Typography.Paragraph style={{ marginTop: 16, color: '#666' }}>{data.note}</Typography.Paragraph>
            </Card>
            <Card title="脱敏规则" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.rules}
                renderItem={(r) => (
                  <List.Item>
                    <span style={{ minWidth: 120 }}><Tag color="purple">{r.field}</Tag></span>
                    <Tag color="blue">{r.method}</Tag>
                    <span style={{ margin: '0 16px' }}>示例：<code>{r.pattern}</code></span>
                    <span>适用角色：{r.applicableRoles.map((x) => <Tag key={x} color="default" style={{ marginLeft: 4 }}>{x}</Tag>)}</span>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="哈希字段（不可逆）">
              {data.hashFields.map((f) => <Tag key={f} color="red" style={{ margin: 4 }}>{f}</Tag>)}
            </Card>
          </>
        ) : <Card><Empty description="暂无配置" /></Card>}
      </Spin>
    </PageContainer>
  );
}
