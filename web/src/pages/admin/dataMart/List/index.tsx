/**
 * 健澜科技 jlmedaios - M150-C 医院数据中台 · 数据集市列表页（管理端）
 *
 * 展示 BFF /api/v1/admin/data-mart 聚合结果：
 *   - 六个主题数据集市卡片：门诊运营（日/周/月）、住院运营、药品消耗、质控指标；
 *   - 每个集市展示来源表、刷新频率、当前行数、最近刷新时间、状态；
 *   - 「刷新」按钮手动触发 POST /:name/refresh，刷新后 row_count 变化、last_refreshed 更新——
 *     不是静态数据，点一下就是最新口径；
 *   - 展开行预览该集市的维度明细（科室/指标/药品类别 + 环比）。
 *
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无集市）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 * （持续优化：后续接入趋势图、刷新调度时间线与血缘下钻。）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  Progress,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 与 BFF dataMartAggregator 输出对齐 */
interface DataMart {
  martName: string;
  displayName: string;
  category: 'outpatient' | 'inpatient' | 'drug' | 'qc';
  sourceTable: string;
  refreshFreq: 'daily' | 'weekly' | 'monthly';
  rowCount: number;
  lastRefreshed: string | null;
  status: 'building' | 'ready' | 'stale' | 'error';
  refreshCount: number;
  description: string;
}

interface DataMartPreviewRow {
  label: string;
  value: number;
  deltaPct: number;
}

interface DataMartDetail extends DataMart {
  preview: DataMartPreviewRow[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const CATEGORY_META: Record<DataMart['category'], { color: string; text: string }> = {
  outpatient: { color: 'blue', text: '门诊运营' },
  inpatient: { color: 'geekblue', text: '住院运营' },
  drug: { color: 'green', text: '药品消耗' },
  qc: { color: 'orange', text: '质控指标' },
};

const FREQ_META: Record<DataMart['refreshFreq'], string> = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

const STATUS_META: Record<DataMart['status'], { color: string; text: string }> = {
  building: { color: 'default', text: '构建中' },
  ready: { color: 'green', text: '就绪' },
  stale: { color: 'orange', text: '待刷新' },
  error: { color: 'red', text: '异常' },
};

function fmtTime(iso: string | null): string {
  if (!iso) return '尚未刷新';
  return new Date(iso).toLocaleString('zh-CN', { hour12: false });
}

export default function DataMartListPage() {
  const [marts, setMarts] = useState<DataMart[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState<string>('');
  const [previewMap, setPreviewMap] = useState<Record<string, DataMartPreviewRow[]>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/data-mart');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        return;
      }
      const list = (json.data?.marts ?? []) as DataMart[];
      setMarts(list);
      // 并行拉取每个集市的数据预览
      const previews: Record<string, DataMartPreviewRow[]> = {};
      await Promise.all(
        list.map(async (m) => {
          try {
            const r = await fetch(`/api/v1/admin/data-mart/${m.martName}`);
            const j = await r.json();
            if (j.code === 0 && j.data) previews[m.martName] = (j.data as DataMartDetail).preview;
          } catch {
            /* 单个预览失败不阻断列表 */
          }
        }),
      );
      setPreviewMap(previews);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** 手动刷新单个集市：POST refresh，成功后回写该行 row_count / lastRefreshed */
  const refreshOne = async (martName: string) => {
    setRefreshing(martName);
    try {
      const resp = await fetch(`/api/v1/admin/data-mart/${martName}/refresh`, { method: 'POST' });
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '刷新失败');
        return;
      }
      const mart = json.data?.mart as DataMart | undefined;
      if (mart) {
        setMarts((prev) => prev.map((m) => (m.martName === mart.martName ? mart : m)));
        if (Array.isArray(mart.preview)) {
          setPreviewMap((prev) => ({ ...prev, [mart.martName]: mart.preview as DataMartPreviewRow[] }));
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '刷新失败');
    } finally {
      setRefreshing('');
    }
  };

  const totalRows = marts.reduce((s, m) => s + m.rowCount, 0);

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Title level={3} style={{ color: '#fff', margin: 0 }}>
          医院数据中台 · 数据集市
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          管理驾驶舱 · 面向主题的可刷新指标资产 · 门诊/住院/药品/质控四大集市（持续优化）
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载数据集市…" />
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

        {!loading && !error && marts.length === 0 && (
          <Alert type="info" showIcon message="暂无数据集市。接入业务库后将自动构建门诊/住院/药品/质控集市。" />
        )}

        {!loading && !error && marts.length > 0 && (
          <>
            {/* 汇总指标卡 */}
            <Space size={16} style={{ marginBottom: 16, display: 'flex' }} wrap>
              <Card style={{ minWidth: 200 }}>
                <Statistic title="集市总数" value={marts.length} suffix="个" />
              </Card>
              <Card style={{ minWidth: 220 }}>
                <Statistic title="累计物化行数" value={totalRows} />
              </Card>
              <Card style={{ minWidth: 220 }}>
                <Statistic
                  title="最近刷新"
                  value={fmtTime(
                    marts.map((m) => m.lastRefreshed ?? '').sort().slice(-1)[0] ?? null,
                  )}
                />
              </Card>
            </Space>

            {/* 集市列表 */}
            <Card title="数据集市目录" extra={<Button icon={<ReloadOutlined />} onClick={load}>刷新列表</Button>}>
              <Table
                rowKey="martName"
                pagination={false}
                dataSource={marts}
                expandable={{
                  expandedRowRender: (m) => {
                    const rows = previewMap[m.martName] ?? [];
                    if (rows.length === 0) return <Alert type="info" showIcon message="暂无数据预览" />;
                    return (
                      <Table
                        rowKey="label"
                        pagination={false}
                        size="small"
                        dataSource={rows}
                        columns={[
                          { title: '维度', dataIndex: 'label' },
                          {
                            title: '当期值',
                            dataIndex: 'value',
                            width: 120,
                            render: (v: number) => v.toLocaleString(),
                          },
                          {
                            title: '环比',
                            dataIndex: 'deltaPct',
                            width: 120,
                            render: (v: number) =>
                              v >= 0 ? <Tag color="green">+{v}%</Tag> : <Tag color="red">{v}%</Tag>,
                          },
                        ]}
                      />
                    );
                  },
                }}
                columns={[
                  {
                    title: '集市',
                    dataIndex: 'displayName',
                    render: (_: unknown, m) => (
                      <Space direction="vertical" size={0}>
                        <strong>{m.displayName}</strong>
                        <span style={{ color: '#8c8c88', fontSize: 12 }}>{m.martName}</span>
                      </Space>
                    ),
                  },
                  {
                    title: '主题',
                    dataIndex: 'category',
                    width: 110,
                    render: (v: DataMart['category']) => (
                      <Tag color={CATEGORY_META[v].color}>{CATEGORY_META[v].text}</Tag>
                    ),
                  },
                  { title: '来源表', dataIndex: 'sourceTable', width: 200, render: (v: string) => <code>{v}</code> },
                  {
                    title: '频率',
                    dataIndex: 'refreshFreq',
                    width: 90,
                    render: (v: DataMart['refreshFreq']) => FREQ_META[v],
                  },
                  {
                    title: '行数',
                    dataIndex: 'rowCount',
                    width: 110,
                    render: (v: number) => <strong>{v.toLocaleString()}</strong>,
                  },
                  {
                    title: '刷新进度',
                    dataIndex: 'rowCount',
                    width: 160,
                    render: () => <Progress percent={100} size="small" showInfo={false} strokeColor={VI.accent} />,
                  },
                  {
                    title: '最近刷新',
                    dataIndex: 'lastRefreshed',
                    width: 180,
                    render: (v: string | null) => fmtTime(v),
                  },
                  {
                    title: '状态',
                    dataIndex: 'status',
                    width: 90,
                    render: (v: DataMart['status']) => <Tag color={STATUS_META[v].color}>{STATUS_META[v].text}</Tag>,
                  },
                  {
                    title: '操作',
                    key: 'op',
                    width: 110,
                    render: (_: unknown, m) => (
                      <Button
                        type="link"
                        size="small"
                        icon={<ReloadOutlined />}
                        loading={refreshing === m.martName}
                        onClick={() => void refreshOne(m.martName)}
                      >
                        刷新
                      </Button>
                    ),
                  },
                ]}
              />
            </Card>

            <Paragraph style={{ color: '#8c8c88', marginTop: 16 }}>
              说明：点击「刷新」将按最新口径重算该集市，row_count 与最近刷新时间即时更新；数据预览随刷新同步变化。
            </Paragraph>
          </>
        )}
      </Content>
    </Layout>
  );
}
