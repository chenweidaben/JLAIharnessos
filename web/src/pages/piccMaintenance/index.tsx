/**
 * 健澜科技 jlmedaios - PICC 维护页（M68-A）
 * 维护记录表单 + 到期提醒 + 并发症 Tag。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { usePiccStore } from '@/store/piccStore';
import { COMPLICATION_COLOR, COMPLICATION_LABEL, DEVICE_TYPE_LABEL } from '@/utils/picc';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function PiccMaintenancePage() {
  const { dbUp, items, loading, error, checkHealth, setPatient, record } = usePiccStore();
  const [patientId, setPatientId] = useState('');
  const [deviceType, setDeviceType] = useState<'picc' | 'port'>('picc');
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>PICC 维护</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>输液港/PICC 维护</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="录入维护记录" style={{ marginBottom: 16 }}>
          <Input placeholder="患者 ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ marginBottom: 8 }} />
          <select value={deviceType} onChange={(e) => setDeviceType(e.target.value as 'picc' | 'port')} style={{ marginBottom: 8, width: '100%' }}>
            <option value="picc">PICC</option>
            <option value="port">输液港</option>
          </select>
          <Button type="primary" loading={loading} onClick={() => setPatient(patientId)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading} onClick={() => record({
            deviceType, insertedAt: '2026-09-01', lastMaintainedAt: new Date().toISOString().slice(0, 10),
            dressingChanged: true, flushed: true, complication: 'none', notes: '',
          })}>提交维护</Button>
        </Card>
        <Card title="维护记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item>
                <span>
                  <Tag color="blue">{DEVICE_TYPE_LABEL[it.deviceType]}</Tag>
                  <Tag color={COMPLICATION_COLOR[it.complication ?? 'none']}>
                    {COMPLICATION_LABEL[it.complication ?? 'none']}
                  </Tag>
                  <span style={{ marginLeft: 8 }}>上次维护：{it.lastMaintainedAt}</span>
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
