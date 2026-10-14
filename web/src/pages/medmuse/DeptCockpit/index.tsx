/**
 * 健澜科技 jlmedaios - MEDMUSE 科主任 agent 驾驶舱
 *
 * 四张深海蓝 KPI 卡片（#0A2540 标题 / #4A90D9 强调）+ 医疗质量预警列表 Table。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import {
  Alert, Badge, Button, Card, Col, Empty, Layout, Row, Table, Tag, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';
import { usePermission } from '@/router/guards';
import { useDeptCockpitStore } from '@/store/deptCockpitStore';
import type { DeptWarning } from '@/services/api/deptCockpit';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板 */
const DEEP_BG = '#0A2540';
const ACCENT = '#4A90D9';

const SEVERITY_TAG: Record<string, { color: string; label: string }> = {
  error: { color: 'red', label: '严重' },
  warning: { color: 'orange', label: '警告' },
  info: { color: 'blue', label: '提示' },
};

interface KpiCardSpec {
  key: string;
  label: string;
  unit: string;
  render: (k: NonNullable<ReturnType<typeof useDeptCockpitStore.getState>['data']>['kpis']) => string;
}

const KPI_CARDS: KpiCardSpec[] = [
  { key: 'turnover', label: '床位周转率', unit: '次/日', render: (k) => (k.bedTurnoverRate == null ? '-' : k.bedTurnoverRate.toFixed(2)) },
  { key: 'lod', label: '平均住院日', unit: '天', render: (k) => (k.avgLod == null ? '-' : k.avgLod.toFixed(1)) },
  { key: 'cost', label: '次均费用', unit: '元', render: (k) => (k.avgCost == null ? '-' : k.avgCost.toLocaleString('zh-CN')) },
  { key: 'gradeA', label: '甲级病历率', unit: '', render: (k) => (k.gradeARate == null ? '-' : `${(k.gradeARate * 100).toFixed(0)}%`) },
];

export default function DeptCockpitPage() {
  const { data, loading, error, load } = useDeptCockpitStore();
  const { hasPermission } = usePermission();

  useEffect(() => {
    void load();
  }, [load]);

  const warnings = data?.warnings ?? [];

  const columns: ColumnsType<DeptWarning> = [
    { title: '预警项', dataIndex: 'item', key: 'item' },
    {
      title: '严重度', dataIndex: 'severity', key: 'severity', width: 120,
      render: (v: string) => {
        const t = SEVERITY_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    { title: '建议动作', dataIndex: 'suggestion', key: 'suggestion' },
  ];

  const canView = hasPermission('dept_cockpit:view');

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: DEEP_BG, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>科主任 agent 驾驶舱</Title>
        <div>
          {data?.demo && <Badge count="演示数据" style={{ background: '#faad14', marginRight: 12 }} overflowCount={99} />}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load()}>刷新</Button>
        </div>
      </Header>
      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {!canView && (
          <Alert type="warning" showIcon style={{ marginBottom: 16 }} message="缺少 dept_cockpit:view 权限，无法查看驾驶舱" />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          {KPI_CARDS.map((c) => (
            <Col xs={24} sm={12} md={6} key={c.key}>
              <Card bodyStyle={{ background: DEEP_BG, borderRadius: 8 }} style={{ background: DEEP_BG }}>
                <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14 }}>{c.label}</Text>
                <div style={{ marginTop: 8 }}>
                  <span style={{ color: ACCENT, fontSize: 32, fontWeight: 700 }}>
                    {data ? c.render(data.kpis) : '-'}
                  </span>
                  {data && data.kpis[c.key as keyof typeof data.kpis] != null && (
                    <span style={{ color: 'rgba(255,255,255,0.45)', marginLeft: 8 }}>{c.unit}</span>
                  )}
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        <Card
          title={
            <span style={{ color: DEEP_BG }}>
              医疗质量预警
              {data && <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>{data.deptName} · {data.date}</Text>}
            </span>
          }
        >
          <Table<DeptWarning>
            rowKey="id" size="middle" loading={loading} columns={columns} dataSource={warnings}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无预警" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
