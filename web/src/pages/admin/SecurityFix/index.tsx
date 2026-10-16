/**
 * 健澜科技 jlmedaios - M167-A 安全漏洞修复：SQL 注入与 XSS 修复验证页（仅 admin）
 *
 * 【安全修复与质量提升】展示 M166-D 渗透扫描暴露的两类高危项的修复闭环复验：
 *  - SQL 注入：全部聚合器 SQL 已由 ${} 插值 / 拼接收敛为参数化 $n 占位，零插值零拼接；
 *  - XSS：全部用户输出经 escapeHtml() / sanitize() 包裹，dangerouslySetInnerHTML 无原始变量直出。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无数据）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Progress, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF SecurityFixVerifyView 对齐的类型 ---------------- */

interface SqlInjectionFinding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
  pattern: 'template_interpolation' | 'string_concat';
}

interface SqlInjectionVerifyResult {
  standard: string;
  scannedFiles: number;
  scannedStatements: number;
  placeholdersUsed: number;
  findings: SqlInjectionFinding[];
  passed: boolean;
  score: number;
  copyright: string;
}

interface XssFinding {
  file: string;
  line: number;
  snippet: string;
  reason: string;
  rawExpression: string;
}

interface XssVerifyResult {
  standard: string;
  scannedFiles: number;
  scannedDangerously: number;
  escapedCount: number;
  findings: XssFinding[];
  passed: boolean;
  score: number;
  copyright: string;
}

interface SecurityFixVerifyView {
  sqlInjection: SqlInjectionVerifyResult;
  xss: XssVerifyResult;
  allPassed: boolean;
  generatedAt: number;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#2e6fb5',
  bg: '#f5f7fa',
};

/** 合规分 → 颜色 */
function scoreColor(score: number): string {
  if (score >= 90) return '#3f8600';
  if (score >= 70) return '#d48806';
  return '#cf1322';
}

export default function SecurityFixPage() {
  const [data, setData] = useState<SecurityFixVerifyView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/security/verify');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as SecurityFixVerifyView);
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

  const sql = data?.sqlInjection;
  const xss = data?.xss;

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
          安全漏洞修复验证
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          【M167-A】SQL 注入参数化 $n 占位 · XSS 输出 escapeHtml 转义 · 修复闭环复验 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1180, margin: '0 auto' }}>
        {/* loading 态 */}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="执行安全修复复验中…" />
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
          <Alert type="info" showIcon message="暂无安全修复验证数据，稍后刷新即可。" />
        )}

        {!loading && !error && data && (
          <>
            {/* 总览指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="修复闭环"
                    value={data.allPassed ? '已闭环' : '未闭环'}
                    valueStyle={{ color: data.allPassed ? '#3f8600' : '#cf1322' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="SQL 注入合规分"
                    value={sql?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: scoreColor(sql?.score ?? 0) }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="XSS 合规分"
                    value={xss?.score ?? 0}
                    suffix="/100"
                    valueStyle={{ color: scoreColor(xss?.score ?? 0) }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="残留违规"
                    value={(sql?.findings.length ?? 0) + (xss?.findings.length ?? 0)}
                    valueStyle={{
                      color: (sql?.findings.length ?? 0) + (xss?.findings.length ?? 0) === 0 ? '#3f8600' : '#cf1322',
                    }}
                  />
                </Card>
              </Col>
            </Row>

            {/* SQL 注入修复复验 */}
            <Card title={`SQL 注入修复复验（${sql?.standard ?? 'CWE-89'}）`} style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title="审计文件" value={sql?.scannedFiles ?? 0} valueStyle={{ color: VI.accent }} />
                </Col>
                <Col span={6}>
                  <Statistic title="SQL 语句行" value={sql?.scannedStatements ?? 0} valueStyle={{ color: VI.accent }} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="参数化占位 $n"
                    value={sql?.placeholdersUsed ?? 0}
                    valueStyle={{ color: '#3f8600' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="${} 插值/拼接"
                    value={sql?.findings.length ?? 0}
                    valueStyle={{ color: (sql?.findings.length ?? 0) === 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
              </Row>
              <Progress
                percent={sql?.score ?? 0}
                size="small"
                strokeColor={(sql?.findings.length ?? 0) === 0 ? '#3f8600' : '#cf1322'}
              />
              <div style={{ marginTop: 8 }}>
                {(sql?.findings.length ?? 0) === 0 ? (
                  <Tag color="success">全部参数化，零 ${} 插值 / 零字符串拼接</Tag>
                ) : (
                  <Tag color="error">仍有 {sql?.findings.length} 处 SQL 拼接违规待修复</Tag>
                )}
              </div>
            </Card>

            {/* XSS 修复复验 */}
            <Card title={`XSS 修复复验（${xss?.standard ?? 'CWE-79'}）`} style={{ marginBottom: 16 }}>
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col span={6}>
                  <Statistic title="审计文件" value={xss?.scannedFiles ?? 0} valueStyle={{ color: VI.accent }} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="dangerouslySetInnerHTML"
                    value={xss?.scannedDangerously ?? 0}
                    valueStyle={{ color: VI.accent }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic title="escapeHtml 调用" value={xss?.escapedCount ?? 0} valueStyle={{ color: '#3f8600' }} />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="未转义直出"
                    value={xss?.findings.length ?? 0}
                    valueStyle={{ color: (xss?.findings.length ?? 0) === 0 ? '#3f8600' : '#cf1322' }}
                  />
                </Col>
              </Row>
              <Progress
                percent={xss?.score ?? 0}
                size="small"
                strokeColor={(xss?.findings.length ?? 0) === 0 ? '#3f8600' : '#cf1322'}
              />
              <div style={{ marginTop: 8 }}>
                {(xss?.findings.length ?? 0) === 0 ? (
                  <Tag color="success">全部输出经 escapeHtml / sanitize 转义消毒</Tag>
                ) : (
                  <Tag color="error">仍有 {xss?.findings.length} 处未转义直出待修复</Tag>
                )}
              </div>
            </Card>

            {/* 违规清单（若有） */}
            {(sql?.findings.length ?? 0) > 0 && (
              <Card title={`SQL 注入违规清单（${sql?.findings.length}）`} style={{ marginBottom: 16 }}>
                <Table
                  rowKey={(r: SqlInjectionFinding) => `${r.file}:${r.line}`}
                  pagination={{ pageSize: 8, size: 'small' }}
                  dataSource={sql?.findings ?? []}
                  columns={[
                    { title: '文件', dataIndex: 'file', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                    { title: '行', dataIndex: 'line', width: 60 },
                    {
                      title: '证据',
                      dataIndex: 'snippet',
                      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
                    },
                    { title: '原因', dataIndex: 'reason', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                  ]}
                />
              </Card>
            )}

            {(xss?.findings.length ?? 0) > 0 && (
              <Card title={`XSS 违规清单（${xss?.findings.length}）`} style={{ marginBottom: 16 }}>
                <Table
                  rowKey={(r: XssFinding) => `${r.file}:${r.line}`}
                  pagination={{ pageSize: 8, size: 'small' }}
                  dataSource={xss?.findings ?? []}
                  columns={[
                    { title: '文件', dataIndex: 'file', render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text> },
                    { title: '行', dataIndex: 'line', width: 60 },
                    {
                      title: '未转义表达式',
                      dataIndex: 'rawExpression',
                      render: (v: string) => <Text code style={{ fontSize: 11 }}>{v}</Text>,
                    },
                    { title: '原因', dataIndex: 'reason', render: (v: string) => <Text style={{ fontSize: 12 }}>{v}</Text> },
                  ]}
                />
              </Card>
            )}

            {/* 修复说明 */}
            <Card title="修复说明">
              <List
                size="small"
                dataSource={[
                  'SQL 注入：所有聚合器查询已改为参数化预编译占位（PostgreSQL $n），彻底删除 ${} 模板插值与字符串拼接',
                  'XSS：所有用户输出统一经 escapeHtml() 转义，富文本经 DOMPurify.sanitize() 白名单消毒，dangerouslySetInnerHTML 禁止原始变量直出',
                  '本页复验为纯函数确定性扫描，可接入 CI / PR 门禁做增量卡点，防止安全漏洞回潮',
                  `报告版权：${sql?.copyright ?? '杭州健澜科技有限公司'}`,
                ]}
                renderItem={(item) => <List.Item>· {item}</List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
