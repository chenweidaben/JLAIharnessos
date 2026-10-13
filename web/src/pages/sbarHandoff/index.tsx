/**
 * 健澜科技 jlmedaios - SBAR 转运交接页（M73-A）
 * SBAR 四段表单 + 接收确认按钮 + 状态流转。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Input, Layout, List, Tag, Typography } from 'antd';
import { usePermission } from '@/router/guards';
import { useSbarStore } from '@/store/sbarStore';
import { SBAR_STATUS_COLOR, SBAR_STATUS_LABEL } from '@/utils/sbar';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function SbarHandoffPage() {
  const { dbUp, items, loading, error, checkHealth, setVisit, create, receive, close } = useSbarStore();
  const [visitId, setVisitId] = useState('');
  const [fromUnit, setFromUnit] = useState('');
  const [toUnit, setToUnit] = useState('');
  const [situation, setSituation] = useState('');
  const [background, setBackground] = useState('');
  const [assessment, setAssessment] = useState('');
  const [recommendation, setRecommendation] = useState('');
  usePermission();
  useEffect(() => { void checkHealth(); }, [checkHealth]);

  if (dbUp === false) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Header><Title level={4} style={{ color: '#fff' }}>转运交接 SBAR</Title></Header>
        <Content style={{ padding: 24, opacity: 0.4 }}><Alert type="error" showIcon message="数据库连接异常" /></Content>
      </Layout>
    );
  }
  if (dbUp === null) return null;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>院内转运交接 SBAR</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Card title="发起交接" style={{ marginBottom: 16 }}>
          <Input placeholder="就诊 ID" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ marginBottom: 8 }} />
          <Input placeholder="转出科室" value={fromUnit} onChange={(e) => setFromUnit(e.target.value)} style={{ marginBottom: 8, marginRight: 8, width: 200 }} />
          <Input placeholder="转入科室" value={toUnit} onChange={(e) => setToUnit(e.target.value)} style={{ marginBottom: 8, width: 200 }} />
          <Input.TextArea placeholder="S 现状" value={situation} onChange={(e) => setSituation(e.target.value)} style={{ marginBottom: 8 }} />
          <Input.TextArea placeholder="B 背景" value={background} onChange={(e) => setBackground(e.target.value)} style={{ marginBottom: 8 }} />
          <Input.TextArea placeholder="A 评估" value={assessment} onChange={(e) => setAssessment(e.target.value)} style={{ marginBottom: 8 }} />
          <Input.TextArea placeholder="R 建议" value={recommendation} onChange={(e) => setRecommendation(e.target.value)} style={{ marginBottom: 8 }} />
          <Button type="primary" loading={loading} onClick={() => setVisit(visitId)}>查询</Button>
          <Button style={{ marginLeft: 8 }} loading={loading}
            onClick={() => create({ fromUnit, toUnit, situation, background, assessment, recommendation })}>
            发起交接
          </Button>
        </Card>
        <Card title="交接记录">
          <List
            loading={loading}
            dataSource={items}
            renderItem={(it) => (
              <List.Item
                actions={[
                  ...(it.status === 'pending'
                    ? [<Button key="r" size="small" type="primary" onClick={() => receive(it.id)}>接收确认</Button>]
                    : []),
                  ...(it.status === 'received'
                    ? [<Button key="c" size="small" onClick={() => close(it.id)}>关闭</Button>]
                    : []),
                ]}
              >
                <span>
                  <Tag color={SBAR_STATUS_COLOR[it.status]}>{SBAR_STATUS_LABEL[it.status]}</Tag>
                  <span style={{ marginLeft: 8 }}>{it.fromUnit} → {it.toUnit}</span>
                  <span style={{ marginLeft: 8, color: '#666' }}>{it.situation}</span>
                </span>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
