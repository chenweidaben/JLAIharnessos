/**
 * 健澜科技 jlmedaios - M167-B 安全漏洞修复（CSRF 与认证绕过）验证页（仅 admin）
 *
 * 【安全修复与质量提升】展示两类高危漏洞的修复与复验：
 *  - CSRF：所有写操作（POST/PUT/DELETE/PATCH）统一经 verifyCsrf() 双重提交 Cookie + Token 校验；
 *  - 认证绕过：所有敏感路由统一加 auth 守卫或 requirePermissionCode 守卫。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF AuthFixView 对齐的类型 ---------------- */

interface CSRFCheckItem {
  method: string;
  path: string;
  label: string;
  protected: boolean;
  guard: 'auth' | 'role' | 'permission';
  remediation?: string;
}

interface CSRFReport {
  standard: string;
  totalEndpoints: number;
  protectedCount: number;
  unprotectedCount: number;
  items: CSRFCheckItem[];
  gaps: CSRFCheckItem[];
  compliant: boolean;
  score: number;
  fixes: string[];
  copyright: string;
}

interface AuthGuardCheckItem {
  method: string;
  path: string;
  label: string;
  authRequired: boolean;
  guardKind: 'none' | 'auth-only' | 'role' | 'permission';
  permissionCode?: string;
  role?: string;
  pass: boolean;
  remediation?: string;
}

interface AuthGuardReport {
  standard: string;
  totalRoutes: number;
  protectedCount: number;
  unprotectedCount: number;
  items: AuthGuardCheckItem[];
  gaps: AuthGuardCheckItem[];
  compliant: boolean;
  score: number;
  fixes: string[];
  copyright: string;
}

interface AuthFixView {
  csrf: CSRFReport;
  authGuards: AuthGuardReport;
  allGreen: boolean;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#2e6fb5',
  bg: '#f5f7fa',
};

/** HTTP 方法 → 颜色 */
function methodColor(method: string): string {
  const m = method.toUpperCase();
  if (m === 'POST') return '#3f8600';
  if (m === 'PUT') return '#d48806';
  if (m === 'DELETE') return '#cf1322';
  if (m === 'PATCH') return '#722ed1';
  return '#2e6fb5';
}

export default function AuthFixPage() {
  const [data, setData] = useState<AuthFixView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/auth-verify');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as AuthFixView);
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

  const csrf = data?.csrf;
  const authGuards = data?.authGuards;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
          padding: '24px 32px',
        }}
      >
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          安全漏洞修复验证（CSRF 与认证绕过）
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M167-B】所有写操作统一 CSRF Token 校验 · 所有敏感路由统一 auth / 权限码守卫 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载安全修复验证报告中…" />
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
          <Alert type="info" showIcon message="暂无安全验证数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="整体状态"
                    value={data.allGreen ? '双绿通过' : '存在漏保'}
                    valueStyle={{ color: data.allGreen ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="CSRF 通过率"
                    value={csrf?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: csrf?.compliant ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="认证守卫通过率"
                    value={authGuards?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: authGuards?.compliant ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="漏保端点总数"
                    value={(csrf?.unprotectedCount ?? 0) + (authGuards?.unprotectedCount ?? 0)}
                    valueStyle={{
                      color:
                        (csrf?.unprotectedCount ?? 0) + (authGuards?.unprotectedCount ?? 0) === 0
                          ? '#3f8600'
                          : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* CSRF 防护验证 */}
            <Card title={`CSRF 防护复验（${csrf?.standard ?? ''}）`} style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={8}>
                  <Statistic title="写操作总数" value={csrf?.totalEndpoints ?? 0} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="受 CSRF 保护"
                    value={csrf?.protectedCount ?? 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="漏保数"
                    value={csrf?.unprotectedCount ?? 0}
                    valueStyle={{ color: csrf?.unprotectedCount ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
              </Row>
              <Progress
                percent={csrf?.score ?? 0}
                strokeColor={csrf?.compliant ? '#3f8600' : '#cf1322'}
                style={{ marginBottom: 16 }}
              />
              <Table
                rowKey={(r) => `${r.method}-${r.path}`}
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={csrf?.items ?? []}
                columns={[
                  {
                    title: '方法',
                    dataIndex: 'method',
                    width: 90,
                    render: (m: string) => (
                      <Tag color={methodColor(m)} style={{ color: '#fff', margin: 0 }}>
                        {m}
                      </Tag>
                    ),
                  },
                  { title: '端点', dataIndex: 'path' },
                  { title: '业务语义', dataIndex: 'label' },
                  {
                    title: '守卫',
                    dataIndex: 'guard',
                    width: 110,
                    render: (g: string) => <Tag>{g}</Tag>,
                  },
                  {
                    title: 'CSRF 判定',
                    dataIndex: 'protected',
                    width: 110,
                    render: (p: boolean) =>
                      p ? <Tag color="success">受保护</Tag> : <Tag color="error">漏保</Tag>,
                  },
                ]}
              />
            </Card>

            {/* 认证守卫验证 */}
            <Card title={`认证守卫复验（${authGuards?.standard ?? ''}）`} style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 12 }}>
                <Col span={8}>
                  <Statistic title="敏感路由总数" value={authGuards?.totalRoutes ?? 0} />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="已加守卫"
                    value={authGuards?.protectedCount ?? 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="漏保数"
                    value={authGuards?.unprotectedCount ?? 0}
                    valueStyle={{ color: authGuards?.unprotectedCount ? '#cf1322' : '#3f8600' }}
                  />
                </Col>
              </Row>
              <Progress
                percent={authGuards?.score ?? 0}
                strokeColor={authGuards?.compliant ? '#3f8600' : '#cf1322'}
                style={{ marginBottom: 16 }}
              />
              <Table
                rowKey={(r) => `${r.method}-${r.path}`}
                size="small"
                pagination={{ pageSize: 8 }}
                dataSource={authGuards?.items ?? []}
                columns={[
                  {
                    title: '方法',
                    dataIndex: 'method',
                    width: 90,
                    render: (m: string) => (
                      <Tag color={methodColor(m)} style={{ color: '#fff', margin: 0 }}>
                        {m}
                      </Tag>
                    ),
                  },
                  { title: '路由', dataIndex: 'path' },
                  { title: '业务语义', dataIndex: 'label' },
                  {
                    title: '登录要求',
                    dataIndex: 'authRequired',
                    width: 90,
                    render: (a: boolean) => (a ? <Tag color="success">必需</Tag> : <Tag color="error">无</Tag>),
                  },
                  {
                    title: '守卫类型',
                    dataIndex: 'guardKind',
                    width: 110,
                    render: (g: string) => <Tag>{g}</Tag>,
                  },
                  {
                    title: '权限码 / 角色',
                    width: 160,
                    render: (_: unknown, row: AuthGuardCheckItem) =>
                      row.permissionCode ? (
                        <Tag color="blue">{row.permissionCode}</Tag>
                      ) : row.role ? (
                        <Tag color="purple">{row.role}</Tag>
                      ) : (
                        '-'
                      ),
                  },
                  {
                    title: '判定',
                    dataIndex: 'pass',
                    width: 100,
                    render: (p: boolean) => (p ? <Tag color="success">通过</Tag> : <Tag color="error">漏保</Tag>),
                  },
                ]}
              />
            </Card>

            {/* 修复说明 */}
            <Row gutter={16}>
              <Col span={12}>
                <Card title="CSRF 修复措施">
                  <List
                    size="small"
                    dataSource={csrf?.fixes ?? []}
                    renderItem={(item) => <List.Item>· {item}</List.Item>}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="认证守卫修复措施">
                  <List
                    size="small"
                    dataSource={authGuards?.fixes ?? []}
                    renderItem={(item) => <List.Item>· {item}</List.Item>}
                  />
                </Card>
              </Col>
            </Row>

            <Card size="small" style={{ marginTop: 16 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                报告版权：{csrf?.copyright ?? '杭州健澜科技有限公司'} · M167-B 安全修复与质量提升
              </Text>
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
