/**
 * 健澜科技 jlmedaios - WHO 手术安全核查表页（M82-A）
 * 三阶段勾选卡片 + 缺项标红 + 通过/失败状态。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from 'react';
import { Alert, Button, Card, Checkbox, Input, Layout, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useSurgicalCheckStore } from '@/store/surgicalChecklistStore';
import { missingOf, STATUS_COLOR } from '@/utils/surgicalChecklist';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SurgicalChecklistPage() {
  const { current, loading, error, create, signin, timeout, signout } = useSurgicalCheckStore();
  const [surgeryId, setSurgeryId] = useState('');
  usePermission();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>WHO 手术安全核查表</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="建核查单" style={{ marginBottom: 16 }}>
          <Input placeholder="手术 ID" value={surgeryId} onChange={(e) => setSurgeryId(e.target.value)} style={{ width: 240, marginRight: 8 }} />
          <Button type="primary" loading={loading} onClick={() => create(surgeryId)}>建单</Button>
        </Card>
        {current && (
          <Card title={`状态：${current.status}`} extra={<Tag color={STATUS_COLOR[current.status]}>{current.status}</Tag>} style={{ marginBottom: 16 }}>
            <Checkbox checked={current.patientConfirmed} onChange={() => signin({ patientConfirmed: !current.patientConfirmed })}>患者身份确认</Checkbox>
            <Checkbox checked={current.allergyConfirmed} onChange={() => signin({ allergyConfirmed: !current.allergyConfirmed })} style={{ marginLeft: 16 }}>过敏史确认</Checkbox>
            <Checkbox checked={current.bloodPrepared} onChange={() => signin({ bloodPrepared: !current.bloodPrepared })} style={{ marginLeft: 16 }}>备血完成</Checkbox>
            <Checkbox checked={current.siteMarked} onChange={() => timeout({ siteMarked: !current.siteMarked })} style={{ marginLeft: 16 }}>手术部位标记</Checkbox>
            <Checkbox checked={current.procedureConfirmed} onChange={() => timeout({ procedureConfirmed: !current.procedureConfirmed })} style={{ marginLeft: 16 }}>术式确认</Checkbox>
            <Checkbox checked={current.antibioticGiven} onChange={() => timeout({ antibioticGiven: !current.antibioticGiven })} style={{ marginLeft: 16 }}>抗菌药已给</Checkbox>
            <Checkbox checked={current.instrumentsCounted} onChange={() => signout({ instrumentsCounted: !current.instrumentsCounted })} style={{ marginLeft: 16 }}>器械清点</Checkbox>
            {missingOf(current).length > 0 && (
              <Alert style={{ marginTop: 16 }} type="warning" showIcon message={`缺项：${missingOf(current).join(', ')}`} />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
