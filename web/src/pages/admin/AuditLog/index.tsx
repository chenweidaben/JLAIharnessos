/**
 * 健澜科技 jlmedaios - M123-A 管理员数据访问审计查询页
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 管理员可追溯「谁、何时、从哪台终端、访问了哪个患者的什么资源」，
 * 支撑医疗数据合规与事后责任认定。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无访问记录）。
 * 出参已由 BFF 脱敏（患者号中段、IP 末段打码），页面不二次还原明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Layout,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 深海蓝 VI */
const DEEP_SEA_BLUE = '#0b3d6b';

/** 与 BFF maskDataAccessLog 后的出参对齐（患者号 / IP 已脱敏） */
interface DataAccessLogRow {
  id: number;
  staffId: string;
  staffRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  patientId: string;
  accessedAt: string;
  ipAddress: string;
}

interface AuditLogResponse {
  total: number;
  items: DataAccessLogRow[];
}

/** 动作标签配色（深海蓝系 + 风险提示色） */
const ACTION_TAG: Record<string, string> = {
  view: 'blue',
  export: 'red',
  download: 'red',
  print: 'orange',
  edit: 'gold',
};

export default function AuditLogPage() {
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    staffId: '',
    action: '',
    resourceType: '',
    patientId: '',
  });

  const load = async (next?: typeof filters) => {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      const f = next ?? filters;
      if (f.staffId.trim()) q.set('staffId', f.staffId.trim());
      if (f.action) q.set('action', f.action);
      if (f.resourceType.trim()) q.set('resourceType', f.resourceType.trim());
      if (f.patientId.trim()) q.set('patientId', f.patientId.trim());
      const qs = q.toString();
      const resp = await fetch(`/api/v1/admin/audit/logs${qs ? `?${qs}` : ''}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '审计日志加载失败');
        setData(null);
        return;
      }
      setData(json.data as AuditLogResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // 首次进入只加载一次；查询由按钮触发
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: DEEP_SEA_BLUE }}>
          数据访问审计
        </Title>
        <Paragraph type="secondary">
          追溯医务人员对患者敏感数据的每一次访问记录；仅管理员可见，患者号与 IP 已脱敏展示。
        </Paragraph>

        {/* 查询条件 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Form layout="inline" style={{ rowGap: 8 }}>
            <Form.Item label="员工工号">
              <Input
                allowClear
                placeholder="staffId"
                value={filters.staffId}
                onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item label="动作">
              <Select
                allowClear
                placeholder="全部"
                value={filters.action || undefined}
                onChange={(v) => setFilters({ ...filters, action: v ?? '' })}
                style={{ width: 120 }}
                options={[
                  { value: 'view', label: '查看 view' },
                  { value: 'export', label: '导出 export' },
                  { value: 'download', label: '下载 download' },
                  { value: 'print', label: '打印 print' },
                  { value: 'edit', label: '编辑 edit' },
                ]}
              />
            </Form.Item>
            <Form.Item label="资源类型">
              <Input
                allowClear
                placeholder="emr / patient / ..."
                value={filters.resourceType}
                onChange={(e) => setFilters({ ...filters, resourceType: e.target.value })}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item label="患者号">
              <Input
                allowClear
                placeholder="脱敏患者号"
                value={filters.patientId}
                onChange={(e) => setFilters({ ...filters, patientId: e.target.value })}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" style={{ background: DEEP_SEA_BLUE }} onClick={() => void load(filters)}>
                  查询
                </Button>
                <Button
                  onClick={() => {
                    const empty = { staffId: '', action: '', resourceType: '', patientId: '' };
                    setFilters(empty);
                    void load(empty);
                  }}
                >
                  重置
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载审计日志中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={<Button size="small" onClick={() => void load()}>重试</Button>}
          />
        )}

        {/* empty 态 */}
        {!loading && !error && (!data || data.total === 0) && (
          <Alert type="info" showIcon message="暂无数据访问审计记录；医务人员访问患者数据后将自动留痕。" />
        )}

        {/* 数据态 */}
        {!loading && !error && data && data.total > 0 && (
          <Card>
            <Paragraph type="secondary">共 {data.total} 条审计记录（近期窗口内）</Paragraph>
            <Table
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20, showSizeChanger: true }}
              dataSource={data.items}
              columns={[
                { title: '访问时间', dataIndex: 'accessedAt', width: 180 },
                { title: '员工工号', dataIndex: 'staffId', width: 110 },
                { title: '角色', dataIndex: 'staffRole', width: 90 },
                {
                  title: '动作',
                  dataIndex: 'action',
                  width: 100,
                  render: (v: string) => <Tag color={ACTION_TAG[v] ?? 'default'}>{v}</Tag>,
                },
                { title: '资源类型', dataIndex: 'resourceType', width: 110 },
                { title: '资源标识', dataIndex: 'resourceId', width: 120 },
                { title: '患者号（脱敏）', dataIndex: 'patientId', width: 140 },
                { title: '终端 IP（脱敏）', dataIndex: 'ipAddress', width: 130 },
              ]}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
