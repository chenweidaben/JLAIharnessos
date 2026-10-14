/**
 * 健澜科技 jlmedaios - AI 原生 · 鉴别诊断建议（M88-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 *   GET  /api/v1/diagnosis-suggestions?visitId=        历史建议列表
 *   POST /api/v1/diagnosis-suggestions/suggest          AI 鉴别诊断（权限 ai_diagnosis:view）
 *   POST /api/v1/diagnosis-suggestions/:id/review       采纳/退回建议
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Radio, Space, Spin, Table, Tag, Typography, message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useDiagnosisStore, type DiagnosisSuggestion } from '@/store/aiNativeStore';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const STATUS_TAG: Record<DiagnosisSuggestion['status'], { color: string; text: string }> = {
  pending: { color: 'orange', text: '待审核' },
  accepted: { color: 'green', text: '已采纳' },
  rejected: { color: 'red', text: '已退回' },
};

export default function DiagnosisSuggestionPage() {
  const { list, loading, submitting, error, load, suggest, review } = useDiagnosisStore();
  const { hasPermission } = usePermission();

  const [visitId, setVisitId] = useState('');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [symptomsText, setSymptomsText] = useState('');
  const [picked, setPicked] = useState<Record<string, string>>({});

  const canView = hasPermission('ai_diagnosis:view');

  const handleLoad = () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    void load(visitId);
  };

  const handleSuggest = async () => {
    if (!visitId) { message.warning('请先输入就诊号 visitId'); return; }
    const symptoms = symptomsText.split(/[,，]/).map((s) => s.trim()).filter(Boolean);
    const rec = await suggest({ visitId, chiefComplaint, symptoms });
    if (rec) message.success('AI 鉴别诊断完成，请主治医师确认');
  };

  const doReview = async (rec: DiagnosisSuggestion, accepted: boolean) => {
    const selected = accepted ? (picked[rec.id] ?? rec.suggestions[0]?.diagnosis) : undefined;
    await review(rec.id, accepted, selected);
    if (visitId) await load(visitId);
    message.success(accepted ? `已采纳诊断：${selected}` : '已退回该建议');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0B3D6B' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>鉴别诊断建议（AI）</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="病情信息" size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Input placeholder="就诊号 visitId" value={visitId} onChange={(e) => setVisitId(e.target.value)} style={{ width: 220 }} allowClear />
            <Input placeholder="主诉，如 胸痛 2 小时" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} style={{ width: 240 }} allowClear />
            <Input placeholder="症状（逗号分隔），如 出汗, 胸闷" value={symptomsText} onChange={(e) => setSymptomsText(e.target.value)} style={{ width: 260 }} allowClear />
          </Space>
          <div style={{ marginTop: 12 }}>
            <Space>
              <Button onClick={handleLoad}>加载历史</Button>
              <Button type="primary" loading={submitting} disabled={!canView} onClick={handleSuggest}>AI 鉴别诊断</Button>
            </Space>
          </div>
          {!canView && <Text type="secondary" style={{ fontSize: 12 }}>（当前账号无 ai_diagnosis:view 权限）</Text>}
        </Card>

        <Spin spinning={loading}>
          {list.length === 0 ? (
            <Card size="small"><Empty description="暂无鉴别诊断建议，填写主诉与症状后点击「AI 鉴别诊断」" /></Card>
          ) : (
            list.map((rec) => {
              const st = STATUS_TAG[rec.status];
              const cols: ColumnsType<DiagnosisSuggestion['suggestions'][number]> = [
                { title: '鉴别诊断', dataIndex: 'diagnosis' },
                { title: 'ICD-10', dataIndex: 'icd10', width: 120, render: (v: string) => <Tag>{v}</Tag> },
                {
                  title: '置信度', dataIndex: 'confidence', width: 120,
                  render: (v: number) => `${(v * 100).toFixed(0)}%`,
                },
              ];
              return (
                <Card
                  key={rec.id} size="small" style={{ marginBottom: 12 }}
                  title={
                    <span>
                      主诉：{rec.chiefComplaint || '-'}
                      <Tag color={st.color} style={{ marginLeft: 8 }}>{st.text}</Tag>
                    </span>
                  }
                >
                  <Space size={[4, 4]} style={{ marginBottom: 8 }} wrap>
                    {rec.symptoms.map((s) => <Tag key={s}>{s}</Tag>)}
                    {rec.selectedDiagnosis && <Tag color="green">医师确诊：{rec.selectedDiagnosis}</Tag>}
                  </Space>
                  <Table rowKey="diagnosis" size="small" pagination={false} dataSource={rec.suggestions} columns={cols} />
                  {rec.status === 'pending' && (
                    <div style={{ marginTop: 12 }}>
                      <Paragraph style={{ marginBottom: 4 }}><Text strong>选择采纳的诊断：</Text></Paragraph>
                      <Radio.Group
                        value={picked[rec.id] ?? rec.suggestions[0]?.diagnosis}
                        onChange={(e) => setPicked((p) => ({ ...p, [rec.id]: e.target.value }))}
                      >
                        <Space direction="vertical">
                          {rec.suggestions.map((s) => (
                            <Radio key={s.diagnosis} value={s.diagnosis}>{s.diagnosis}（{s.icd10}，置信度 {(s.confidence * 100).toFixed(0)}%）</Radio>
                          ))}
                        </Space>
                      </Radio.Group>
                      <div style={{ marginTop: 8 }}>
                        <Space>
                          <Button type="primary" size="small" onClick={() => void doReview(rec, true)}>采纳该诊断</Button>
                          <Button danger size="small" onClick={() => void doReview(rec, false)}>退回</Button>
                        </Space>
                      </div>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
