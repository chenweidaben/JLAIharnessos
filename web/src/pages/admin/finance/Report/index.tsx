/**
 * 健澜科技 jlmedaios - 医院财务管理报表页（M139-D · 医院运营管理）
 * web/src/pages/admin/finance/Report/index.tsx
 *
 * 【医院运营管理】财务报表清晰，院长一眼看懂钱花在哪了。
 *   - 三张总览卡：总收入 / 总支出 / 净结余；
 *   - 支出分类条形图（钱花在哪）+ 收入分类条形图（钱从哪来）；
 *   - 科室分摊表：每个科室赚了多少、花了多少、净贡献多少。
 *
 * 三态：loading / error（可重试）/ empty（账期内无流水）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Layout,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import ReactECharts from 'echarts-for-react';
import dayjs, { type Dayjs } from 'dayjs';

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;

/** 与 BFF financeAggregator.Report 输出对齐 */
interface CategoryTotal {
  category: string;
  categoryLabel: string;
  amount: number;
  count: number;
}
interface DeptAllocation {
  dept: string;
  income: number;
  expense: number;
  net: number;
  txnCount: number;
}
interface FinanceReport {
  startDate: string;
  endDate: string;
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  incomeByCategory: CategoryTotal[];
  expenseByCategory: CategoryTotal[];
  deptAllocations: DeptAllocation[];
  transactionCount: number;
  generatedAt: string;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  income: '#2e7d5b',
  expense: '#c0392b',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
};

/** 金额格式化：万元阈值自动换算，院长看得大账 */
function fmtMoney(v: number): string {
  if (Math.abs(v) >= 10000) return `${(v / 10000).toFixed(2)} 万`;
  return v.toFixed(2);
}

async function getJson<T>(url: string): Promise<T> {
  const resp = await fetch(url);
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '加载失败');
  return body.data as T;
}

export default function FinanceReportPage() {
  const [range, setRange] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs()]);
  const [report, setReport] = useState<FinanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const start = range[0].format('YYYY-MM-DD');
      const end = range[1].format('YYYY-MM-DD');
      const data = await getJson<{ type: string; report: FinanceReport }>(
        `/api/v1/admin/finance/report?startDate=${start}&endDate=${end}`,
      );
      setReport(data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : '财务报表加载失败');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  /** 支出分类条形图：钱花在哪（按金额降序） */
  const expenseOption = {
    color: [VI.expense],
    tooltip: { trigger: 'axis' as const, formatter: (p: { name: string; value: number }[]) => `${p[0].name}：¥${fmtMoney(p[0].value)}` },
    grid: { left: 90, right: 24, top: 16, bottom: 24 },
    xAxis: { type: 'value' as const, axisLabel: { color: VI.deep } },
    yAxis: {
      type: 'category' as const,
      data: (report?.expenseByCategory ?? []).map((c) => c.categoryLabel).reverse(),
      axisLabel: { color: VI.deep },
    },
    series: [
      {
        type: 'bar' as const,
        data: (report?.expenseByCategory ?? []).map((c) => c.amount).reverse(),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
      },
    ],
  };

  /** 收入分类条形图：钱从哪来 */
  const incomeOption = {
    color: [VI.income],
    tooltip: { trigger: 'axis' as const, formatter: (p: { name: string; value: number }[]) => `${p[0].name}：¥${fmtMoney(p[0].value)}` },
    grid: { left: 90, right: 24, top: 16, bottom: 24 },
    xAxis: { type: 'value' as const, axisLabel: { color: VI.deep } },
    yAxis: {
      type: 'category' as const,
      data: (report?.incomeByCategory ?? []).map((c) => c.categoryLabel).reverse(),
      axisLabel: { color: VI.deep },
    },
    series: [
      {
        type: 'bar' as const,
        data: (report?.incomeByCategory ?? []).map((c) => c.amount).reverse(),
        barMaxWidth: 28,
        itemStyle: { borderRadius: [0, 6, 6, 0] },
      },
    ],
  };

  const empty = !loading && !error && (!report || report.transactionCount === 0);

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
          医院财务报表
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          医院运营管理 · 收支一屏看清 · 钱花在哪 / 钱从哪来 / 科室分摊
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {/* 账期选择 */}
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={16} align="middle">
            <Col>
              <Typography.Text style={{ color: VI.deep }}>账期</Typography.Text>
              <RangePicker
                style={{ marginLeft: 12 }}
                value={range}
                onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
                allowClear={false}
              />
            </Col>
            <Col>
              <Button type="primary" style={{ background: VI.accent }} onClick={load} loading={loading}>
                查询
              </Button>
            </Col>
          </Row>
        </Card>

        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="加载财务报表中…" />
          </div>
        )}

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

        {empty && <Alert type="info" showIcon message="所选账期内暂无收支流水。" />}

        {!loading && !error && report && !empty && (
          <>
            {/* 三张总览卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="总收入"
                    value={report.totalIncome}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: VI.income }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="总支出"
                    value={report.totalExpense}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: VI.expense }}
                  />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic
                    title="净结余"
                    value={report.netProfit}
                    precision={2}
                    prefix="¥"
                    valueStyle={{ color: report.netProfit >= 0 ? VI.income : VI.expense }}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={12}>
                <Card title="钱花在哪（支出分类）">
                  <ReactECharts option={expenseOption} style={{ height: 300 }} notMerge />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="钱从哪来（收入分类）">
                  <ReactECharts option={incomeOption} style={{ height: 300 }} notMerge />
                </Card>
              </Col>
            </Row>

            {/* 科室分摊 */}
            <Card title="科室分摊（净贡献 = 科室收入 - 科室支出）">
              <Table
                rowKey="dept"
                pagination={false}
                dataSource={report.deptAllocations}
                locale={{ emptyText: '暂无科室分摊数据' }}
                columns={[
                  { title: '科室', dataIndex: 'dept' },
                  {
                    title: '收入',
                    dataIndex: 'income',
                    align: 'right' as const,
                    render: (v: number) => <span style={{ color: VI.income }}>¥{fmtMoney(v)}</span>,
                  },
                  {
                    title: '支出',
                    dataIndex: 'expense',
                    align: 'right' as const,
                    render: (v: number) => <span style={{ color: VI.expense }}>¥{fmtMoney(v)}</span>,
                  },
                  {
                    title: '净贡献',
                    dataIndex: 'net',
                    align: 'right' as const,
                    render: (v: number) => (
                      <Tag color={v >= 0 ? 'green' : 'red'}>¥{fmtMoney(v)}</Tag>
                    ),
                  },
                  { title: '笔数', dataIndex: 'txnCount', width: 90, align: 'right' as const },
                ]}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
