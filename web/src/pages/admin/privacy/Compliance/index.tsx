/**
 * 健澜科技 jlmedaios - M155-B 患者隐私合规页（仅 admin）
 *
 * 【质量与合规】
 *  - 拉取 GET /api/v1/admin/privacy/compliance，展示总体合规结论、得分、
 *    四项检查明细（API 默认脱敏 / 日志不记敏感 / 导出脱敏 / 权限最小化）
 *    与深度脱敏样例；
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态：loading（加载中）/ error（失败可重试）/ empty（报告为空兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, Progress, Row, Spin, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF checkPrivacyCompliance 输出对齐 */
interface ComplianceItem {
  key: string;
  title: string;
  status: 'pass' | 'warn' | 'fail';
  detail: string;
}
interface ComplianceReport {
  overall: 'pass' | 'warn' | 'fail';
  score: number;
  items: ComplianceItem[];
  maskedSamples: {
    name: string;
    idCard: string;
    phone: string;
    address: string;
    diagnosis: string;
  };
  checkedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0B2A4A',
  accent: '#1E5AA8',
  bg: '#f5f7fa',
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  pass: { label: '通过', color: 'green' },
  warn: { label: '待改进', color: 'orange' },
  fail: { label: '不合规', color: 'red' },
};

export default function PrivacyCompliancePage() {
  const [data, setData] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/privacy/compliance');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载隐私合规报告失败');
        setData(null);
        return;
      }
      setData(json.data as ComplianceReport);
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

  const sampleRows = data
    ? [
        { type: '姓名', ...{ input: '张建国', masked: data.maskedSamples.name } },
        { type: '身份证', ...{ input: '330106199001011234', masked: data.maskedSamples.idCard } },
        { type: '手机号', ...{ input: '13812345678', masked: data.maskedSamples.phone } },
        { type: '地址', ...{ input: '杭州市西湖区文三路123号', masked: data.maskedSamples.address } },
        { type: '诊断', ...{ input: '2型糖尿病', masked: data.maskedSamples.diagnosis } },
      ]
    : [];

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
            患者隐私合规
          </Title>
          <Paragraph type="secondary">
            深度脱敏（姓名 / 证件 / 手机 / 地址 / 诊断）· 访问审计 · 合规自检，仅系统管理员可见。
          </Paragraph>
        </div>

        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载隐私合规报告中…" />
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
        {!loading && !error && !data && (
          <Alert type="info" showIcon message="暂无合规报告，待安全团队生成后自动展示。" />
        )}

        {/* 主内容 */}
        {!loading && !error && data && (
          <>
            <Paragraph type="secondary">
              检查时间：{new Date(data.checkedAt).toLocaleString('zh-CN')}
            </Paragraph>

            {/* 总体得分 */}
            <Card
              style={{ marginBottom: 16 }}
              headStyle={{ background: VI.deep, color: '#fff' }}
              title="总体合规结论"
            >
              <Row gutter={16} align="middle">
                <Col span={8}>
                  <Progress
                    type="dashboard"
                    percent={data.score}
                    strokeColor={data.overall === 'pass' ? '#52c41a' : VI.accent}
                    width={140}
                  />
                </Col>
                <Col span={16}>
                  <Paragraph style={{ marginBottom: 8 }}>
                    <Text strong style={{ color: VI.deep }}>
                      合规状态：
                    </Text>
                    <Tag color={STATUS_META[data.overall]?.color ?? 'default'} style={{ marginLeft: 8 }}>
                      {STATUS_META[data.overall]?.label ?? data.overall}
                    </Tag>
                  </Paragraph>
                  <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    所有 API 默认脱敏、日志不记录原始敏感数据、导出数据脱敏、权限最小化四项检查统一收口；
                    审计仅记录「谁 / 什么资源 / 做了什么 / 风险等级」，不落地 PII。
                  </Paragraph>
                </Col>
              </Row>
            </Card>

            {/* 四项检查明细 */}
            <Card
              title="合规检查项"
              style={{ marginBottom: 16 }}
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Row gutter={[16, 16]}>
                {data.items.map((item) => (
                  <Col key={item.key} span={12}>
                    <Card
                      size="small"
                      style={{ borderLeft: `3px solid ${item.status === 'pass' ? '#52c41a' : item.status === 'warn' ? '#faad14' : '#f5222d'}` }}
                    >
                      <Text strong style={{ color: VI.deep }}>
                        {item.title}
                      </Text>
                      <Tag color={STATUS_META[item.status]?.color ?? 'default'} style={{ marginLeft: 8 }}>
                        {STATUS_META[item.status]?.label ?? item.status}
                      </Tag>
                      <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                        {item.detail}
                      </Paragraph>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 深度脱敏样例 */}
            <Card
              title="深度脱敏样例（质量与合规）"
              headStyle={{ background: VI.deep, color: '#fff' }}
            >
              <Table
                rowKey="type"
                size="small"
                pagination={false}
                dataSource={sampleRows}
                columns={[
                  { title: '字段类型', dataIndex: 'type' },
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
