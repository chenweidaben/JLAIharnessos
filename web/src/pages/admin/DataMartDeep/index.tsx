/**
 * 健澜科技 jlmedaios - M164-A 医院数据中台深化 · 数据资产治理页（仅 admin）
 *
 * 「数据中台与AI大脑」——数据中台要真治理，不是建表就完：
 *   - 资产清单：表/字段/敏感级别（L1~L4）/ PII 标记 / 质量三维分；
 *   - 血缘追踪：选表后展示 来源(ODS) → 加工(DWD/DWS) → 应用(ADS/AI大脑) 链路；
 *   - 质量监控：完整性/准确性/一致性 + 问题清单；
 *   - 数据服务：标准化查询端点与脱敏提示（L4 不出参，L3 必脱敏）。
 *
 * 三态：loading / error（可重试）/ empty。视觉：深海蓝 VI（#0a2540 → #123a5e）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Layout,
  Progress,
  Row,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

type SensitivityLevel = 'L1' | 'L2' | 'L3' | 'L4';

interface DataColumnAsset {
  column: string;
  columnName: string;
  dataType: string;
  sensitivity: SensitivityLevel;
  sensitivityLabel: string;
  isPii: boolean;
}

interface DataQualityScore {
  completeness: number;
  accuracy: number;
  consistency: number;
  overall: number;
  issues: string[];
}

interface DataTableAsset {
  schema: string;
  table: string;
  tableName: string;
  layer: 'ODS' | 'DWD' | 'DWS' | 'ADS';
  owner: string;
  description: string;
  columns: DataColumnAsset[];
  rowCount: number;
  quality: DataQualityScore;
}

interface AssetSummary {
  tableCount: number;
  columnCount: number;
  piiColumnCount: number;
  bySensitivity: Record<SensitivityLevel, number>;
  avgQuality: number;
}

interface DataAssetCatalog {
  generatedAt: string;
  tables: DataTableAsset[];
  summary: AssetSummary;
}

interface LineageNode {
  layer: string;
  table: string;
  column?: string;
  note: string;
}

interface DataLineage {
  table: string;
  column: string | null;
  sources: LineageNode[];
  process: LineageNode[];
  applications: LineageNode[];
  path: string[];
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const SENS_COLOR: Record<SensitivityLevel, string> = {
  L1: 'default',
  L2: 'cyan',
  L3: 'orange',
  L4: 'red',
};

export default function DataMartDeepPage() {
  const [catalog, setCatalog] = useState<DataAssetCatalog | null>(null);
  const [lineage, setLineage] = useState<DataLineage | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineageLoading, setLineageLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState<string>('');

  const loadCatalog = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/data-mart/catalog');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '资产目录加载失败');
        setCatalog(null);
        return;
      }
      const data = json.data as DataAssetCatalog;
      setCatalog(data);
      const first = data.tables[0];
      if (first) {
        const fq = `${first.schema}.${first.table}`;
        setSelectedTable(fq);
        void loadLineage(fq);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setCatalog(null);
    } finally {
      setLoading(false);
    }
  };

  const loadLineage = async (table: string) => {
    setLineageLoading(true);
    try {
      const resp = await fetch(`/api/v1/admin/data-mart/lineage?table=${encodeURIComponent(table)}`);
      const json = await resp.json();
      if (json.code !== 0) {
        setLineage(null);
        return;
      }
      setLineage(json.data as DataLineage);
    } catch {
      setLineage(null);
    } finally {
      setLineageLoading(false);
    }
  };

  useEffect(() => {
    void loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSelectTable = (fq: string) => {
    setSelectedTable(fq);
    void loadLineage(fq);
  };

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
          数据资产治理中台
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          数据中台与AI大脑 · 数据中台要真治理，不是建表就完 · 仅 admin 可见
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在盘点全院数据资产…" />
          </div>
        )}

        {!loading && error && (
          <Alert
            type="error"
            showIcon
            message={error}
            action={
              <Button size="small" onClick={loadCatalog}>
                重试
              </Button>
            }
          />
        )}

        {!loading && !error && catalog && (
          <>
            {/* 顶部汇总卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={5}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>资产表</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                    {catalog.summary.tableCount}
                  </div>
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>字段总数</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                    {catalog.summary.columnCount}
                  </div>
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>PII 字段</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#cf1322' }}>
                    {catalog.summary.piiColumnCount}
                  </div>
                </Card>
              </Col>
              <Col span={5}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>L4 绝密字段</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: '#cf1322' }}>
                    {catalog.summary.bySensitivity.L4}
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>平均质量分</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                    {catalog.summary.avgQuality}
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 血缘追踪 */}
            <Card
              title={
                <span>
                  数据血缘追踪
                  <Select
                    size="small"
                    style={{ width: 260, marginLeft: 16 }}
                    value={selectedTable}
                    onChange={onSelectTable}
                    options={catalog.tables.map((t) => ({
                      value: `${t.schema}.${t.table}`,
                      label: `${t.schema}.${t.table}（${t.tableName}）`,
                    }))}
                  />
                </span>
              }
              style={{ marginBottom: 16 }}
            >
              {lineageLoading ? (
                <Spin size="small" />
              ) : lineage ? (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <Text strong style={{ color: VI.deep }}>链路：</Text>
                    {lineage.path.map((p, i) => (
                      <Tag key={i} color={i === 0 ? 'green' : i === lineage.path.length - 1 ? 'purple' : 'blue'}>
                        {p}
                      </Tag>
                    ))}
                  </div>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Text strong style={{ color: '#389e0d' }}>来源（ODS）</Text>
                      {lineage.sources.map((n) => (
                        <div key={n.table} style={{ marginTop: 8 }}>
                          <Tag>{n.table}</Tag>
                          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{n.note}</div>
                        </div>
                      ))}
                    </Col>
                    <Col span={8}>
                      <Text strong style={{ color: VI.accent }}>加工（{lineage.process[0]?.layer}）</Text>
                      {lineage.process.map((n) => (
                        <div key={n.table} style={{ marginTop: 8 }}>
                          <Tag color="blue">{n.table}</Tag>
                          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{n.note}</div>
                        </div>
                      ))}
                    </Col>
                    <Col span={8}>
                      <Text strong style={{ color: '#722ed1' }}>应用（ADS/AI大脑）</Text>
                      {lineage.applications.map((n) => (
                        <div key={n.table} style={{ marginTop: 8 }}>
                          <Tag color="purple">{n.table}</Tag>
                          <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.55)' }}>{n.note}</div>
                        </div>
                      ))}
                    </Col>
                  </Row>
                </>
              ) : (
                <Alert type="info" showIcon message="暂无可展示的血缘链路" />
              )}
            </Card>

            {/* 资产清单表 */}
            <Card title="数据资产清单（表 / 字段 / 敏感级别 / 质量分）" style={{ marginBottom: 16 }}>
              <Table
                rowKey={(r) => `${r.schema}.${r.table}`}
                pagination={false}
                size="small"
                dataSource={catalog.tables}
                expandable={{
                  expandedRowRender: (t) => (
                    <Row gutter={16}>
                      <Col span={14}>
                        <Table
                          rowKey="column"
                          size="small"
                          pagination={false}
                          dataSource={t.columns}
                          columns={[
                            { title: '字段', dataIndex: 'column', width: 160 },
                            { title: '中文名', dataIndex: 'columnName', width: 140 },
                            { title: '类型', dataIndex: 'dataType', width: 140 },
                            {
                              title: '敏感级别',
                              dataIndex: 'sensitivity',
                              width: 110,
                              render: (v: SensitivityLevel, r) => (
                                <Tag color={SENS_COLOR[v]}>
                                  {v} {r.sensitivityLabel}
                                  {r.isPii ? ' ·PII' : ''}
                                </Tag>
                              ),
                            },
                          ]}
                        />
                      </Col>
                      <Col span={10}>
                        <div style={{ marginBottom: 8 }}>
                          <Text strong>质量三维分：</Text> 综合 <Text strong>{t.quality.overall}</Text>
                        </div>
                        <Progress percent={t.quality.completeness} size="small" format={(v) => `完整性 ${v}`} />
                        <Progress percent={t.quality.accuracy} size="small" strokeColor="#13c2c2" format={(v) => `准确性 ${v}`} />
                        <Progress percent={t.quality.consistency} size="small" strokeColor="#faad14" format={(v) => `一致性 ${v}`} />
                        <div style={{ marginTop: 8 }}>
                          {t.quality.issues.map((iss, i) => (
                            <Alert key={i} type="warning" showIcon style={{ marginBottom: 4 }} message={iss} />
                          ))}
                        </div>
                      </Col>
                    </Row>
                  ),
                }}
                columns={[
                  { title: '分层', dataIndex: 'layer', width: 70 },
                  {
                    title: '表',
                    render: (_: unknown, r: DataTableAsset) => (
                      <Text strong>{`${r.schema}.${r.table}`}</Text>
                    ),
                  },
                  { title: '中文名', dataIndex: 'tableName', width: 140 },
                  { title: '责任人', dataIndex: 'owner', width: 90 },
                  {
                    title: '行数',
                    dataIndex: 'rowCount',
                    width: 110,
                    render: (v: number) => v.toLocaleString(),
                  },
                  {
                    title: '质量分',
                    dataIndex: ['quality', 'overall'],
                    width: 160,
                    render: (v: number) => <Progress percent={v} size="small" style={{ width: 120 }} />,
                  },
                  { title: '口径说明', dataIndex: 'description' },
                ]}
              />
            </Card>

            {/* 数据服务规范提示 */}
            <Alert
              type="warning"
              showIcon
              message="数据服务出参规范"
              description="对外数据服务仅暴露 L1/L2 字段；L3 机密(PHI) 出参必须脱敏；L4 绝密字段（证件号/生物特征）一律不出现在 API 返回中。"
            />
          </>
        )}
      </Content>
    </Layout>
  );
}
