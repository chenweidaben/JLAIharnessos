/**
 * 健澜科技 jlmedaios - 输血反应监控页（M71-A）
 * 反应记录表单 + 严重度 + 阻断标记。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Select, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useTransfusionStore } from '@/store/transfusionReactionStore';
import { REACTION_TYPE_LABEL, SEVERITY_COLOR, SEVERITY_LABEL } from '@/utils/transfusionReaction';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function TransfusionReactionPage() {
  const { dbUp, items, loading, error, checkHealth, setPatient, report } = useTransfusionStore();
  const [patientId, setPatientId] = useState('');
  const [reactionType, setReactionType] = useState('fever');
  const [severity, setSeverity] = useState('mild');
  const [symptoms, setSymptoms] = useState('');
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>输血反应监控</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>输血反应监控</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="记录反应" style={{ marginBottom: 16 }}>
          <Input placeholder="患者 ID" value={patientId} onChange={(e) => setPatientId(e.target.value)} style={{ marginBottom: 8 }} />
          <Select value={reactionType} onChange={setReactionType} style={{ width: 160, marginBottom: 8, marginRight: 8 }} options={[
            { value: 'fever', label: '发热反应' }, { value: 'allergy', label: '过敏反应' },
            { value: 'hemolysis', label: '溶血反应' }, { value: 'taco', label: '循环超负荷' },
            { value: 'other', label: '其他' },
          ]} />
          <Select value={severity} onChange={setSeverity} style={{ width: 120, marginBottom: 8 }} options={[
            { value: 'mild', label: '轻度' }, { value: 'moderate', label: '中度' }, { value: 'severe', label: '重度' },
          ]} />
          <Input.TextArea placeholder="症状描述" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} style={{ marginBottom: 8 }} />
          <Button type="primary" loading={loading} onClick={() => setPatient(patientId)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading} onClick={() => report({ reactionType, severity, symptoms })}>报告反应</Button>
        </Card>
        <Card title="反应记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item>
                <span>
                  <Tag color={SEVERITY_COLOR[it.severity]}>{SEVERITY_LABEL[it.severity]}</Tag>
                  <Tag color="blue">{REACTION_TYPE_LABEL[it.reactionType]}</Tag>
                  <span style={{ marginLeft: 8 }}>{it.symptoms}</span>
                  {it.blocked && <Tag color="red" style={{ marginLeft: 8 }}>已阻断后续输血</Tag>}
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
