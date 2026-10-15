/**
 * 健澜科技 jlmedaios - M142-A 体检报告页（预防保健与患者服务）
 *
 * 设计原则：让普通人“看得懂”。不堆医学术语 ——
 *   - 顶部一句话总结这次体检整体怎么样；
 *   - 每个项目给“大白话解释”，异常项自动标红；
 *   - 每项附上可执行的生活方式 / 就医建议（如“血压偏高，建议低盐饮食 + 复查”）。
 *
 * 数据：GET /api/v1/patient/checkup/:id?checkupId=...（与 healthCheckupAggregator 输出对齐）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Input, Layout, Row, Spin, Statistic, Tag, Typography } from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 与 BFF healthCheckupAggregator 输出对齐 */
type CheckupFlag = 'N' | 'H' | 'L' | 'A';
interface CheckupResult {
  id: string;
  checkupId: string;
  item: string;
  value: number;
  unit: string;
  refRange: string;
  flag: CheckupFlag;
  abnormal: boolean;
  plainText: string;
  advice: string;
  recordedAt: string;
}
interface CheckupReport {
  checkupId: string;
  checkupNo: string;
  patientId: string;
  packageName: string;
  summary: string;
  totalItems: number;
  normalCount: number;
  abnormalCount: number;
  results: CheckupResult[];
  abnormalItems: CheckupResult[];
  overallAdvice: string;
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = { deep: '#0a2540', mid: '#123a5e', accent: '#1e6fbf', bg: '#f5f7fa', abnormal: '#d4380d' };

const FLAG_LABEL: Record<CheckupFlag, { text: string; color: string }> = {
  N: { text: '正常', color: 'green' },
  H: { text: '偏高', color: 'red' },
  L: { text: '偏低', color: 'orange' },
  A: { text: '异常', color: 'red' },
};

/** 从 URL 取 checkupId（?id= 或 ?checkupId=），便于管理端按报告号调阅 */
function readInitialId(): string {
  try {
    const q = new URLSearchParams(window.location.search);
    return q.get('checkupId') ?? q.get('id') ?? '';
  } catch {
    return '';
  }
}

export default function HealthCheckupReportPage() {
  const [id, setId] = useState<string>(() => readInitialId());
  const [inputId, setInputId] = useState<string>(() => readInitialId());
  const [report, setReport] = useState<CheckupReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (checkupId: string) => {
    if (!checkupId) {
      setError('请输入体检单 ID 后查询');
      setReport(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const resp = await fetch(`/api/v1/patient/checkup/${encodeURIComponent(checkupId)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '报告加载失败');
        setReport(null);
        return;
      }
      setReport(json.data as CheckupReport);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const abnormalItems = useMemo(() => report?.abnormalItems ?? [], [report]);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>体检报告（通俗版）</Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          预防保健与患者服务 · 我们把医学术语翻译成了大白话，异常项已标红并附建议
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
        {/* 查询条 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={12} align="middle">
            <Col flex="auto">
              <Input
                placeholder="输入体检单 ID（如 ord_xxx），或在 URL 加 ?checkupId=..."
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                onPressEnter={() => setId(inputId.trim())}
              />
            </Col>
            <Col>
              <Button type="primary" onClick={() => setId(inputId.trim())}>查询报告</Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在生成通俗版报告…" />
          </div>
        )}
        {!loading && error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}

        {!loading && !error && report && (
          <>
            {/* 一句话总结 */}
            <Alert
              type={report.abnormalCount > 0 ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 16, fontSize: 15 }}
              message={
                <span>
                  <Text strong>{report.packageName}</Text>
                  <span style={{ margin: '0 12px', color: 'rgba(0,0,0,0.45)' }}>
                    体检号 {report.checkupNo}
                  </span>
                </span>
              }
              description={report.summary}
            />

            {/* 概览数字 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card><Statistic title="检查项目" value={report.totalItems} suffix="项" /></Card>
              </Col>
              <Col span={8}>
                <Card><Statistic title="正常" value={report.normalCount} valueStyle={{ color: '#3f8600' }} suffix="项" /></Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="需要关注"
                    value={report.abnormalCount}
                    valueStyle={{ color: VI.abnormal }}
                    suffix="项"
                  />
                </Card>
              </Col>
            </Row>

            {/* 异常项：红色卡片 + 大白话 + 建议 */}
            {abnormalItems.length > 0 && (
              <Card
                title={<span style={{ color: VI.abnormal }}>⚠ 需要您关注的项目（{abnormalItems.length}）</span>}
                style={{ marginBottom: 16, borderColor: '#ffbb96' }}
              >
                <Row gutter={[16, 16]}>
                  {abnormalItems.map((r) => (
                    <Col span={24} key={r.id}>
                      <Card
                        size="small"
                        style={{ borderLeft: `4px solid ${VI.abnormal}`, background: '#fff7f5' }}
                      >
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Text strong style={{ fontSize: 16 }}>{r.item}</Text>
                            <Tag color={FLAG_LABEL[r.flag].color} style={{ marginLeft: 8 }}>
                              {FLAG_LABEL[r.flag].text}
                            </Tag>
                          </Col>
                          <Col>
                            <Text strong style={{ color: VI.abnormal, fontSize: 18 }}>
                              {r.value} {r.unit}
                            </Text>
                            <Text type="secondary" style={{ marginLeft: 8 }}>参考 {r.refRange || '—'}</Text>
                          </Col>
                        </Row>
                        <Paragraph style={{ margin: '8px 0 4px' }}>{r.plainText}</Paragraph>
                        <Paragraph style={{ margin: 0 }}>
                          <Text type="secondary">建议：</Text>
                          <Text style={{ color: VI.abnormal }}>{r.advice}</Text>
                        </Paragraph>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* 全部项目清单（正常项） */}
            <Card title={`全部检查项（${report.results.length}）`} style={{ marginBottom: 16 }}>
              {report.results.length === 0 && <Text type="secondary">暂无结果。</Text>}
              {report.results.map((r) => (
                <Row
                  key={r.id}
                  style={{
                    padding: '10px 0',
                    borderBottom: '1px solid #f0f0f0',
                    color: r.abnormal ? VI.abnormal : 'inherit',
                  }}
                  justify="space-between"
                >
                  <Col>
                    <Text strong>{r.item}</Text>
                    <Tag color={FLAG_LABEL[r.flag].color} style={{ marginLeft: 8 }}>
                      {FLAG_LABEL[r.flag].text}
                    </Tag>
                  </Col>
                  <Col>
                    {r.value} {r.unit}
                    <Text type="secondary" style={{ marginLeft: 8 }}>参考 {r.refRange || '—'}</Text>
                  </Col>
                </Row>
              ))}
            </Card>

            {/* 总体建议 */}
            <Alert type="info" showIcon message="给您的总体建议" description={report.overallAdvice} />
          </>
        )}
      </Content>
    </Layout>
  );
}
