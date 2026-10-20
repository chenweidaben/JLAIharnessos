/** 健澜科技 jlmedaios - 租户切换审计（M262 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty,  Spin, Tag, Timeline } from 'antd';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Audit { time: string; fromTenant: string; toTenant: string; operator: string }
interface Data {
  currentTenant: { id: string; name: string };
  switchableTenants: { id: string; name: string }[];
  auditRecords: Audit[];
}
export default function TenantsSwitchPage() {
  usePageTitle('租户切换');
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/tenants/switch').then((r) => r.json())
      .then((j) => { if (alive) setData(j.data as Data); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  return (
    <PageContainer title="租户切换审计">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        {data ? (
          <>
            <Card style={{ marginBottom: 16 }}>
              <div>当前租户：<Tag color="purple">{data.currentTenant.name}</Tag></div>
              <div style={{ marginTop: 8 }}>可切换：{data.switchableTenants.map((t) => <Tag key={t.id} color="blue" style={{ marginLeft: 4 }}>{t.name}</Tag>)}</div>
            </Card>
            <Card title="切换记录">
              {data.auditRecords.length === 0 ? <Empty description="无切换记录" /> : (
                <Timeline items={data.auditRecords.map((a) => ({
                  color: 'blue',
                  children: <div><strong>{a.time}</strong> {a.fromTenant} → {a.toTenant}（{a.operator}）</div>,
                }))} />
              )}
            </Card>
          </>
        ) : <Card><Empty description="暂无数据" /></Card>}
      </Spin>
    </PageContainer>
  );
}
