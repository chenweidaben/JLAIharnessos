/**
 * 健澜科技 jlmedaios - CDI 用药审查页（M70-A）
 * 审查列表 + 拦截原因 + 处理。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useCdiStore } from '@/store/cdiStore';
import { REVIEW_TYPE_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from '@/utils/cdi';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CdiReviewPage() {
  const { dbUp, items, loading, error, checkHealth, setPatient, review, resolve } = useCdiStore();
  const [patientId, setPatientId] = useState('');
  const [drugName, setDrugName] = useState('');
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>用药审查 CDI</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>合理用药审查 CDI</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="执行审查" style={{ marginBottom: 16 }}>
          <Input placeholder="患者 ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ marginBottom: 8 }} />
          <Input placeholder="药物名称" value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ marginBottom: 8 }} />
          <Button type="primary" loading={loading} onClick={() => setPatient(patientId)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading} onClick={() => review({ drugName })}>审查</Button>
        </Card>
        <Card title="审查记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={!it.resolved
                  ? [<Button key="r" size="small" type="primary" onClick={() => resolve(it.id)}>标记已处理</Button>]
                  : []}
              >
                <span>
                  <Tag color={SEVERITY_COLOR[it.severity]}>{SEVERITY_LABEL[it.severity]}</Tag>
                  <Tag color="blue">{REVIEW_TYPE_LABEL[it.reviewType]}</Tag>
                  <span style={{ marginLeft: 8 }}>{it.drugName}</span>
                  <span style={{ marginLeft: 8, color: '#666' }}>{it.message}</span>
                  {it.resolved && <Tag color="green" style={{ marginLeft: 8 }}>已处理</Tag>}
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
