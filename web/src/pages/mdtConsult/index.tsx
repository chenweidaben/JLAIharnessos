/**
 * 健澜科技 jlmedaios - MDT 会诊页（M66-A）
 * 申请表单 + 排期 + 纪要录入 + 结论。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useMdtStore } from '@/store/mdtStore';
import { STATUS_COLOR, STATUS_LABEL } from '@/utils/mdt';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function MdtConsultPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, create, schedule, minutes } = useMdtStore();
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  usePermission();
  const qs = new URLSearchParams(window.location.search);
  const visitId = qs.get('visitId') ?? '';
  useEffect(() => { void checkHealth().then(() => setVisit(visitId)); }, [checkHealth, setVisit, visitId]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>MDT 会诊</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>多学科会诊 MDT</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="发起 MDT" style={{ marginBottom: 16 }}>
          <Input placeholder="会诊标题" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <Input.TextArea placeholder="会诊理由" value={reason} onChange={(e) => setReason(e.target.value)} style={{ marginBottom: 8 }} />
          <Button type="primary" loading={loading} onClick={() => create({ title, reason, departments: [] })}>提交申请</Button>
        </Card>
        <Card title="会诊记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={it.status === 'requested'
                  ? [<Button key="s" size="small" onClick={() => schedule(it.id, new Date().toISOString())}>排期</Button>]
                  : it.status === 'scheduled'
                    ? [<Button key="m" size="small" onClick={() => minutes(it.id, '讨论充分', '建议综合治疗')}>录纪要</Button>]
                    : []}
              >
                <span>
                  {it.title}
                  <Tag color={STATUS_COLOR[it.status]}>{STATUS_LABEL[it.status]}</Tag>
                  {it.conclusion && <span style={{ marginLeft: 8 }}>结论：{it.conclusion}</span>}
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
