/**
 * 健澜科技 jlmedaios - AI 原生 · 临床路径推荐（M88-D）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   GET  /api/v1/pathway-recommendations?visitId=      历史路径推荐
 *   POST /api/v1/pathway-recommendations/recommend     AI 路径推荐（权限 ai_pathway:view）
 *   POST /api/v1/pathway-recommendations/:id/accept    采纳路径
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { usePathwayRecStore, type PathwayRec } from '@/store/aiNativeStore';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

const STATUS_TAG: Record<PathwayRec['status'], { color: string; text: string }> = {
  pending: { color: 'orange', text: '待采纳' },
  accepted: { color: 'green', text: '已采纳' },
  rejected: { color: 'red', text: '已退回' },
};

export default function PathwayRecommendationPage() {
  const { list, loading, submitting, error, load, recommend, accept } = usePathwayRecStore();
  const { hasPermission } = usePermission();

  const [visitId, setVisitId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const canView = hasPermission('ai_pathway:view');

  const handleLoad = () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    void load(visitId);
  };

  const handleRecommend = async () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    if (!diagnosis) { message.warning('请输入诊断名称'); return; }
    const rec = await recommend({ visitId, diagnosis });
    if (rec) message.success(`已推荐路径：${rec.pathwayName}`);
  };

  const handleAccept = async (rec: PathwayRec) => {
    await accept(rec.id);
    if (visitId) await load(visitId);
    message.success('已采纳该临床路径');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>临床路径推荐（AI）</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="推荐参数" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input placeholder="就诊号 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 220 }} allowClear />
            <Input placeholder="诊断名称，如 肺炎 / 阑尾炎 / 冠心病" value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 280 }} allowClear />
          </Space>
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button onClick={handleLoad}>加载历史</Button>
              <Button type="primary" loading={submitting} disabled={!canView} onClick={handleRecommend}>推荐临床路径</Button>
            </Space>
          </div>
          {!canView && <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 ai_pathway:view 权限）</Text>}
        </Card>

        <Spin spinning={loading}>
          {list.length === 0 ? (
            <Card size="small"><Empty description="暂无临床路径推荐，输入诊断后点击「推荐临床路径」" /></Card>
          ) : (
            list.map((rec) => {
              const st = STATUS_TAG[rec.status];
              const stepCols: ColumnsType<PathwayRec['steps'][number]> = [
                { title: '日程', dataIndex: 'day', width: 80, render: (v: number) => `第 ${v} 天` },
                { title: '诊疗动作', dataIndex: 'action' },
                { title: '负责角色', dataIndex: 'responsible', width: 140 },
              ];
              return (
                <Card
                  key={rec.id} size="small" style={{ marginBottom: 12 }}
                  title={
                    <span>
                      {rec.pathwayName}
                      {rec.pathwayCode && <Tag style={{ marginLeft: 8 }}>{rec.pathwayCode}</Tag>}
                      <Tag color={st.color} style={{ marginLeft: 8 }}>{st.text}</Tag>
                    </span>
                  }
                  extra={
                    rec.status === 'pending'
                      ? <Button type="primary" size="small" onClick={() => void handleAccept(rec)}>采纳路径</Button>
                      : undefined
                  }
                >
                  <Space size="large" style={{ marginBottom: 12 }}>
                    <Text>诊断：{rec.diagnosis || '-'}</Text>
                    <Text>预期住院：<Text strong>{rec.expectedDays ?? '-'}</Text> 天</Text>
                    <Text>匹配置信度：<Text strong>{((rec.confidence ?? 0) * 100).toFixed(0)}%</Text></Text>
                  </Space>
                  <Table rowKey="day" size="small" pagination={false} dataSource={rec.steps} columns={stepCols} />
                </Card>
              );
            })
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
