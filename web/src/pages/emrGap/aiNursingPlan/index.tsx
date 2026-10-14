/**
 * 健澜科技 jlmedaios - M90-B AI护理计划推荐页（路由路径 /nursing/ai-plan）
 * 诊断输入 + 规则引擎推荐护理条目 + 风险分级 + 采纳落库。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { usePermission } from '@/router/guards';
import { useAiNursingPlanStore } from '@/store/aiNursingPlanStore';
import type { NursingPlanItem } from '@/services/api/aiNursingPlan';

const { Header, Content } = Layout;
const { TextArea } = Input;
const { Title, Text } = Typography;

const RISK_META: Record<string, { color: string; label: string }> = {
  low: { color: 'green', label: '低风险' },
  medium: { color: 'orange', label: '中风险' },
  high: { color: 'red', label: '高风险' },
};

const STATUS_META: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: '待采纳' },
  accepted: { color: 'green', label: '已采纳' },
  rejected: { color: 'default', label: '已驳回' },
};

const columns: ColumnsType<NursingPlanItem> = [
  { title: '护理条目', dataIndex: 'item', key: 'item' },
  { title: '类别', dataIndex: 'category', key: 'category', width: 160,
    render: (v: string) => <Tag>{v}</Tag> },
];

export default function AiNursingPlanPage() {
  const { record, generating, acting, error, generate, accept, reset } =
    useAiNursingPlanStore();
  const { hasPermission } = usePermission();

  const [visitIdInput, setVisitIdInput] = useState('');
  const [diagnosis, setDiagnosis] = useState('');

  const canView = hasPermission('ai_nursing_plan:view');

  const doGenerate = () => {
    const v = visitIdInput.trim();
    if (!v) return;
    void generate(v, diagnosis.trim()).catch(() => undefined);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>AI护理计划推荐</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card title="患者信息与诊断" style={{ marginBottom: 16 }}>
          <Input
            placeholder="请输入就诊号 visitId"
            value={visitIdInput}
            onChange={(e) => setVisitIdInput(e.target.value)}
            style={{ width: 280, marginRight: 8, marginBottom: 8 }}
            allowClear
          />
          <TextArea
            placeholder="请输入诊断，如：肺炎 / 术后康复（留空将推荐通用监测包）"
            rows={3}
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            style={{ marginBottom: 8 }}
          />
          {canView ? (
            <>
              <Button type="primary" loading={generating} onClick={doGenerate}>
                生成护理计划
              </Button>
              <Button style={{ marginLeft: 8 }} onClick={reset}>重置</Button>
            </>
          ) : (
            <span style={{ color: '#999' }}>无AI护理计划推荐权限</span>
          )}
        </Card>

        {!record ? (
          <Card><Empty description="输入就诊号与诊断后，点击「生成护理计划」" /></Card>
        ) : (
          <Card
            title="推荐护理计划"
            extra={(
              <span>
                <Tag color={RISK_META[record.riskLevel]?.color}>
                  {RISK_META[record.riskLevel]?.label ?? record.riskLevel}
                </Tag>
                <Tag color={STATUS_META[record.status]?.color}>
                  {STATUS_META[record.status]?.label ?? record.status}
                </Tag>
              </span>
            )}
          >
            <p style={{ marginBottom: 12 }}>
              <Text strong>就诊号：</Text>{record.visitId}
              <Text strong style={{ marginLeft: 24 }}>诊断：</Text>{record.diagnosis || '（未填写）'}
            </p>
            <Table
              rowKey={(r) => `${r.category}-${r.item}`}
              columns={columns}
              dataSource={record.plan}
              pagination={false}
              size="middle"
            />
            {record.status === 'pending' && canView && (
              <div style={{ marginTop: 12 }}>
                <Button type="primary" loading={acting} onClick={() => void accept().catch(() => undefined)}>
                  采纳
                </Button>
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
