/**
 * 健澜科技 jlmedaios - M123-B 脱敏配置管理页（仅 admin）
 *
 * 【生产安全加固】
 *  - 展示后端固化的脱敏规则、角色可见性策略与脱敏样例；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading（加载中）/ error（失败可重试）/ empty（规则为空兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF getMaskConfigSnapshot 输出对齐 */
interface MaskConfigSnapshot {
  rules: Array<{ field: string; type: 'name' | 'idCard' | 'phone' | 'address' }>;
  rolePolicy: Record<
    string,
    { masked: boolean; description: string }
  >;
  samples: {
    name: { input: string; masked: string };
    idCard: { input: string; masked: string };
    phone: { input: string; masked: string };
    address: { input: string; masked: string };
  };
  updatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

const TYPE_LABEL: Record<string, { label: string; color: string }> = {
  name: { label: '姓名', color: 'geekblue' },
  idCard: { label: '证件号', color: 'volcano' },
  phone: { label: '手机号', color: 'orange' },
  address: { label: '地址', color: 'purple' },
};

export default function MaskConfigPage() {
  const [data, setData] = useState<MaskConfigSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/mask-config');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载脱敏配置失败');
        setData(null);
        return;
      }
      setData(json.data as MaskConfigSnapshot);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        <div
          style={{
            borderLeft: `4px solid ${VI.deep}`,
            paddingLeft: 12,
            marginBottom: 8,
          }}
        >
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            敏感数据脱敏配置
          </Title>
          <Paragraph type="secondary">
            仅系统管理员可见；规则在后端固化，变更需走代码评审与发版流程。
          </Paragraph>
        </div>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载脱敏配置中…" />
          </div>
        )}

        {/* error 态 */}
        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={load}>
                重试
              </Button>
            }
          />
        )}

        {/* empty 态 */}
        {!loading && !error && (!data || data.rules.length === 0) && (
          <Alert type="info" showIcon message="暂无脱敏规则，待安全团队下发后自动展示。" />
        )}

        {/* 主内容 */}
        {!loading && !error && data && data.rules.length > 0 && (
          <>
            <Paragraph type="secondary">
              配置更新时间：{new Date(data.updatedAt).toLocaleString('zh-CN')}
            </Paragraph>

            <Card
              title="脱敏字段规则"
              style={{ marginBottom: 16 }}
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Table
                rowKey="field"
                size="small"
                pagination={false}
                dataSource={data.rules}
                columns={[
                  { title: '字段名', dataIndex: 'field' },
                  {
                    title: '敏感类型',
                    dataIndex: 'type',
                    render: (t: string) => {
                      const meta = TYPE_LABEL[t] ?? { label: t, color: 'default' };
                      return <Tag color={meta.color}>{meta.label}</Tag>;
                    },
                  },
                ]}
              />
            </Card>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={24}>
                <Card
                  title="角色可见性策略"
                  headStyle={{ background: VI.deep, color: '#fff' }}
                >
                  <Row gutter={[16, 16]}>
                    {Object.entries(data.rolePolicy).map(([role, policy]) => (
                      <Col key={role} span={12}>
                        <Card
                          size="small"
                          style={{
                            borderLeft: `3px solid ${policy.masked ? VI.accent : '#52c41a'}`,
                          }}
                        >
                          <Text strong style={{ color: VI.deep }}>
                            {role}
                          </Text>
                          <Tag
                            color={policy.masked ? 'blue' : 'green'}
                            style={{ marginLeft: 8 }}
                          >
                            {policy.masked ? '按规则脱敏' : '全量可见'}
                          </Tag>
                          <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                            {policy.description}
                          </Paragraph>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>

            <Card
              title="脱敏样例（生产安全加固）"
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Table
                rowKey="type"
                size="small"
                pagination={false}
                dataSource={[
                  { type: '姓名', ...data.samples.name },
                  { type: '证件号', ...data.samples.idCard },
                  { type: '手机号', ...data.samples.phone },
                  { type: '地址', ...data.samples.address },
                ]}
                columns={[
                  { title: '类型', dataIndex: 'type' },
                  { title: '原始值', dataIndex: 'input' },
                  {
                    title: '脱敏后',
                    dataIndex: 'masked',
                    render: (v: string) => (
                      <Text strong style={{ color: VI.accent }}>
                        {v}
                      </Text>
                    ),
                  },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
