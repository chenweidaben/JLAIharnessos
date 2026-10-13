/**
 * 健澜科技 jlmedaios - 急诊留观登记页（M74-A）
 * 留观登记 + 滞留计时 + 转归。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Select, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useEdObsStore } from '@/store/edObservationStore';
import { DISPOSITION_LABEL, hoursSince, TRIAGE_LABEL } from '@/utils/edObservation';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function EdObservationPage() {
  const { dbUp, items, loading, error, checkHealth, setPatient, register, close } = useEdObsStore();
  const [patientId, setPatientId] = useState('');
  const [triageLevel, setTriageLevel] = useState('III');
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>急诊留观</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>急诊留观登记</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="登记留观" style={{ marginBottom: 16 }}>
          <Input placeholder="患者 ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ marginBottom: 8 }} />
          <Select value={triageLevel} onChange={setTriageLevel} style={{ width: 160, marginBottom: 8 }} options={[
            { value: 'I', label: 'I 级 危' }, { value: 'II', label: 'II 级 急' },
            { value: 'III', label: 'III 级 急症' }, { value: 'IV', label: 'IV 级 非急症' },
            { value: 'V', label: 'V 级 非急' },
          ]} />
          <Button type="primary" loading={loading} onClick={() => setPatient(patientId)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading} onClick={() => register({ triageLevel })}>登记留观</Button>
        </Card>
        <Card title="留观记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => {
              const hrs = hoursSince(it.enteredAt);
              return (
                <List.Item
                  actions={it.status === 'observing'
                    ? [
                        <Button key="d" size="small" type="primary" onClick={() => close(it.id, 'discharged')}>离院</Button>,
                        <Button key="a" size="small" onClick={() => close(it.id, 'admitted')}>收住院</Button>,
                      ]
                    : []}
                >
                  <span>
                    <Tag color="blue">{TRIAGE_LABEL[it.triageLevel]}</Tag>
                    <span style={{ marginLeft: 8 }}>已留观 {hrs.toFixed(1)} 小时</span>
                    {hrs > 24 && <Tag color="red" style={{ marginLeft: 8 }}>滞留预警</Tag>}
                    {it.status === 'closed' && <Tag color="green" style={{ marginLeft: 8 }}>{DISPOSITION_LABEL[it.disposition ?? 'discharged']}</Tag>}
                  </span>
                </List.Item>
              );
            }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
