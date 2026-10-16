/**
 * 健澜科技 jlmedaios - M177-B 医院统计上报页（国家口径，仅 admin）
 *
 * 统计上报要国家口径，不能凑数：
 *  - 国家质控数据上报：病案首页 / DRG / DIP / 单病种（病案口径）；
 *  - 医院年报：门诊量 / 住院量 / 手术量 / 收入（年报口径）；
 *  - 绩效考核上报：国考20项指标（国考口径）；
 *  - 院感上报：院感病例 / 暴发事件（院感直报口径）。
 *
 * 生产安全：
 *  - 深海蓝 VI（主色 #0B2A4A，辅色 #1E5AA8）；
 *  - 三态 loading / error（可重试）/ empty；
 *  - 显式标注「演示口径 · 纯函数校验，非 WebSocket 实时流」；
 *  - 国家口径校验不过（errors 非空）后端 422 拒绝，前端不得强提交凑数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Layout,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ------------------------------ 与 BFF 类型对齐 ------------------------------ */

type ReportType = 'national_qc' | 'hospital_annual' | 'performance' | 'infection';

interface ReportTypeItem { code: ReportType; name: string; scope: string; caliber: string; }
interface DeepSystem {
  nationalStandard: string;
  reportTypes: ReportTypeItem[];
  guardrails: string[];
  valueStatement: string;
}
interface StatValidation { valid: boolean; errors: string[]; warnings: string[]; }
interface StatReceipt {
  reportType: ReportType; period: string; batchNo: string; status: 'submitted';
  caliberVersion: string; submittedAt: string; data: Record<string, number | string>;
  validation: StatValidation;
}

/* --------------------------------- 常量 --------------------------------- */

/** 深海蓝 VI 色板 */
const VI = { deep: '#0B2A4A', accent: '#1E5AA8', bg: '#f5f7fa', grid: '#e6ebf2' };

const REPORT_TYPE_OPTIONS: ReportTypeItem[] = [
  { code: 'national_qc', name: '国家质控数据上报', scope: '病案首页 / DRG / DIP / 单病种', caliber: '病案口径' },
  { code: 'hospital_annual', name: '医院年报', scope: '门诊量 / 住院量 / 手术量 / 收入', caliber: '年报口径' },
  { code: 'performance', name: '绩效考核上报', scope: '国考20项指标', caliber: '国考口径' },
  { code: 'infection', name: '院感上报', scope: '院感病例 / 暴发事件', caliber: '院感直报口径' },
];

interface RowRecord { key: string; label: string; value: string; }

/* --------------------------------- 组件 --------------------------------- */

export default function StatReportPage() {
  const [system, setSystem] = useState<DeepSystem | null>(null);
  const [reportType, setReportType] = useState<ReportType>('national_qc');
  const [period, setPeriod] = useState('2026');
  const [rows, setRows] = useState<RowRecord[]>([]);
  const [dataMap, setDataMap] = useState<Record<string, number | string>>({});
  const [receipt, setReceipt] = useState<StatReceipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSystem = useCallback(async () => {
    setError(null);
    try {
      const resp = await fetch('/api/v1/admin/stat/system');
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '加载上报体系失败');
      setSystem(json.data as DeepSystem);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载上报体系失败');
    }
  }, []);

  useEffect(() => { void loadSystem(); }, [loadSystem]);

  const collect = useCallback(async () => {
    setLoading(true); setError(null); setReceipt(null);
    try {
      const qs = new URLSearchParams({ reportType, period });
      const resp = await fetch(`/api/v1/admin/stat/collect?${qs.toString()}`);
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '数据采集失败');
      const d = (json.data ?? {}) as Record<string, number | string>;
      setDataMap(d);
      setRows(Object.entries(d)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => ({ key: k, label: k, value: String(v) })));
    } catch (e) {
      setError(e instanceof Error ? e.message : '数据采集失败');
    } finally { setLoading(false); }
  }, [reportType, period]);

  const submit = useCallback(async () => {
    setSubmitting(true); setError(null);
    try {
      const resp = await fetch('/api/v1/admin/stat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ reportType, period, data: dataMap }),
      });
      const json = await resp.json();
      if (json.code !== 0) throw new Error(json.message || '上报被国家口径校验拒绝');
      setReceipt(json.data as StatReceipt);
    } catch (e) {
      setError(e instanceof Error ? e.message : '上报失败');
    } finally { setSubmitting(false); }
  }, [reportType, period, dataMap]);

  return (
    <Layout style={{ background: VI.bg }}>
      <Content style={{ padding: 24 }}>
        <Title level={3} style={{ color: VI.deep }}>医院统计上报 · 国家口径</Title>
        <Paragraph type="secondary">
          统计上报要国家口径，不能凑数：病案首页 / DRG / DIP / 单病种、医院年报、国考20项、院感直报。
          演示口径 · 纯函数校验，非 WebSocket 实时流。
        </Paragraph>

        {error && (
          <Alert
            type="error" showIcon closable
            message={error} action={<Button size="small" onClick={() => void loadSystem()}>重试</Button>}
            style={{ marginBottom: 16 }}
          />
        )}

        {!system && !error && <Spin style={{ display: 'block', margin: '48px auto' }} />}

        {system && (
          <>
            <Card size="small" style={{ marginBottom: 16, borderLeft: `4px solid ${VI.accent}` }}>
              <Text strong style={{ color: VI.deep }}>{system.nationalStandard}</Text>
              <ul style={{ margin: '8px 0 0', paddingLeft: 20 }}>
                {system.guardrails.map((g) => <li key={g}><Text type="secondary">{g}</Text></li>)}
              </ul>
            </Card>

            <Row gutter={[16, 16]}>
              {system.reportTypes.map((t) => (
                <Col xs={24} sm={12} lg={6} key={t.code}>
                  <Card
                    size="small"
                    style={{ cursor: 'pointer', borderTop: `3px solid ${t.code === reportType ? VI.accent : VI.grid}` }}
                    onClick={() => { setReportType(t.code); setRows([]); setReceipt(null); }}
                  >
                    <Text strong style={{ color: VI.deep }}>{t.name}</Text>
                    <Paragraph type="secondary" style={{ margin: '4px 0 0', fontSize: 12 }}>{t.scope}</Paragraph>
                    <Tag color="blue">{t.caliber}</Tag>
                  </Card>
                </Col>
              ))}
            </Row>

            <Card style={{ marginTop: 16 }} title="采集与提交">
              <Form layout="inline" style={{ marginBottom: 16 }}>
                <Form.Item label="上报期">
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="YYYY / YYYY-MM" style={{ width: 140 }} />
                </Form.Item>
                <Form.Item label="上报类型">
                  <Select value={reportType} onChange={setReportType} style={{ width: 200 }}
                    options={REPORT_TYPE_OPTIONS.map((o) => ({ value: o.code, label: o.name }))} />
                </Form.Item>
                <Form.Item>
                  <Space>
                    <Button onClick={() => void collect()} loading={loading} style={{ background: VI.accent, color: '#fff' }}>
                      按国家口径采集
                    </Button>
                    <Button
                      type="primary" danger={false}
                      disabled={rows.length === 0}
                      loading={submitting}
                      onClick={() => void submit()}
                      style={{ background: VI.deep }}
                    >
                      校验并上报
                    </Button>
                  </Space>
                </Form.Item>
              </Form>

              {rows.length === 0 && !loading && (
                <Alert type="info" showIcon message="尚未采集数据。点击「按国家口径采集」生成上报期数据后再校验上报。" />
              )}

              {rows.length > 0 && (
                <Table
                  size="small" rowKey="key" pagination={false}
                  dataSource={rows}
                  columns={[
                    { title: '口径项', dataIndex: 'label' },
                    { title: '数值', dataIndex: 'value' },
                  ]}
                />
              )}

              {receipt && (
                <Alert
                  style={{ marginTop: 16 }}
                  type="success" showIcon
                  message={`上报成功 · 批次号 ${receipt.batchNo}`}
                  description={
                    <Space direction="vertical" size={2}>
                      <Statistic title="口径版本" value={receipt.caliberVersion} />
                      <Text type="secondary">
                        {receipt.period} · 通过 {receipt.validation.warnings.length} 条国家目标线提示，0 条阻断错误
                      </Text>
                    </Space>
                  }
                />
              )}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
