/**
 * 健澜科技 jlmedaios - 待配药任务屏（M21-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { usePharmacyTaskStore } from '@/store/pharmacyTaskStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function PharmacyTaskPage() {
  const { dbUp, items, loading, error, checkHealth, load, complete } = usePharmacyTaskStore();
  usePermission();
  useEffect(() => { void checkHealth().then(() => load()); }, [checkHealth, load]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>待配药任务</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>待配药任务</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <List
          loading={loading}
          dataSource={items}
          renderItem={(it) => (
            <List.Item actions={[<Button size="small" type="primary" onClick={() => void complete(it.id)}>完成配药</Button>]}>
              <List.Item.Meta
                title={<span>处方 {it.prescriptionId.slice(0, 8)}… <Tag color="orange">{it.status}</Tag></span>}
                description={`患者 ${it.patientId.slice(0, 8)}… · ${new Date(it.createdAt).toLocaleString()}`}
              />
            </List.Item>
          )}
        />
      </Content>
    </Layout>
  );
}
