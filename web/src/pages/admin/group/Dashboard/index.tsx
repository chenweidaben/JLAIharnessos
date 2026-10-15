/**
 * 健澜科技 jlmedaios — 【集团与科研】医院集团多院管理页（M156-A，仅 admin）
 *
 * 集团驾驶舱一页看全：
 *   - 集团汇总卡：门诊量 / 住院量 / 手术量 / 收入 / 满意度均值；
 *   - 集团下属医院列表：院籍（等级/角色/区域）+ 各院核心指标；
 *   - 各医院核心指标对比：门诊/住院/手术/收入/满意度 跨院分组柱状图；
 *   - 跨院资源调配：专家 / 大型设备 / 床位 的高负载院 ↔ 低负载院建议；
 *   - 集团统一标准：诊疗规范 / 质控标准 / 安全制度 下发清单。
 *
 * 【数据隔离】院级指标按 hospital_id 严格隔离，本页只渲染集团聚合层结果，
 *   不下钻任何患者明细。
 *
 * 三态：loading / error（可重试）/ empty（无样本，演示模式标注）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Col, Layout, List, Row, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/* ---------------- 与 BFF 输出对齐的类型 ---------------- */

interface HospitalCard {
  hospitalId: string;
  hospitalName: string;
  hospitalLevel?: string;
  memberRole?: string;
  period: string;
  outpatientVolume: number;
  inpatientVolume: number;
  surgeryVolume: number;
  revenue: number;
  satisfaction: number;
  expertLoad: number;
  equipmentLoad: number;
  bedOccupancy: number;
}

interface GroupStandard {
  category: string;
  name: string;
  standardCode: string;
  version: string;
  enforceLevel: string;
}

interface GroupDashboard {
  groupId: string;
  groupName: string;
  asOf: string;
  demo: boolean;
  memberCount: number;
  headHospitalId: string | null;
  totals: {
    outpatientVolume: number;
    inpatientVolume: number;
    surgeryVolume: number;
    revenue: number;
    satisfactionAvg: number;
  };
  hospitals: HospitalCard[];
  resourceLoad: {
    expertLoadAvg: number;
    equipmentLoadAvg: number;
    bedOccupancyAvg: number;
  };
  standards: {
    total: number;
    mandatory: number;
    byCategory: { clinic: number; qc: number; safety: number };
    items: GroupStandard[];
  };
}

interface HospitalComparisonRow {
  hospitalId: string;
  hospitalName: string;
  metric: string;
  metricName: string;
  period: string;
  value: number;
  groupAverage: number;
  deviationPct: number;
  rank: number;
  isAboveAverage: boolean;
}

interface ComparisonGroup {
  metric: string;
  metricName: string;
  rows: HospitalComparisonRow[];
}

interface ResourceActionItem {
  fromHospitalId: string;
  fromHospitalName: string;
  toHospitalId: string;
  toHospitalName: string;
  resourceType: string;
  estimatedQuantity: number;
  rationale: string;
}

interface ResourceSuggestion {
  groupId: string;
  resourceType: string;
  resourceName: string;
  asOf: string;
  demo: boolean;
  averageLoad: number;
  overloaded: { hospitalId: string; hospitalName: string; load: number }[];
  idle: { hospitalId: string; hospitalName: string; load: number; spareCapacityPct: number }[];
  suggestions: string[];
  actionItems: ResourceActionItem[];
}

interface DashboardResponse {
  dashboard: GroupDashboard;
  comparisons: ComparisonGroup[];
  resourceSuggestions: ResourceSuggestion[];
  demo: boolean;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const CATEGORY_LABEL: Record<string, string> = {
  clinic: '诊疗规范',
  qc: '质控标准',
  safety: '安全制度',
};

const ROLE_LABEL: Record<string, string> = {
  head: '总院',
  branch: '分院',
  member: '协作医院',
};

export default function GroupMultiHospitalDashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/group/dashboard');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as DashboardResponse);
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

  const dash = data?.dashboard;
  const isEmpty = !dash;

  /** 五维指标跨院分组柱状图 option */
  const compareOption = useMemo<EChartsOption | null>(() => {
    if (!dash || dash.hospitals.length === 0) return null;
    const metricKeys: { key: keyof HospitalCard; name: string }[] = [
      { key: 'outpatientVolume', name: '门诊量' },
      { key: 'inpatientVolume', name: '住院量' },
      { key: 'surgeryVolume', name: '手术量' },
      { key: 'revenue', name: '收入(万元)' },
      { key: 'satisfaction', name: '满意度' },
    ];
    const palette = [VI.accent, '#13c2c2', '#722ed1', '#fa8c16', '#52c41a'];
    return {
      color: palette,
      tooltip: { trigger: 'axis' },
      legend: { data: metricKeys.map((m) => m.name) },
      grid: { left: 56, right: 24, top: 40, bottom: 40 },
      xAxis: {
        type: 'category',
        data: dash.hospitals.map((h) => h.hospitalName),
      },
      yAxis: { type: 'value' },
      series: metricKeys.map((m) => ({
        name: m.name,
        type: 'bar' as const,
        data: dash.hospitals.map((h) => h[m.key] as number),
        itemStyle: { borderRadius: [4, 4, 0, 0] },
      })),
    };
  }, [dash]);

  /** 医院列表表格列 */
  const hospitalColumns: ColumnsType<HospitalCard> = [
    { title: '医院', dataIndex: 'hospitalName', width: 140 },
    {
      title: '等级',
      dataIndex: 'hospitalLevel',
      width: 100,
      render: (v: string) => <Tag color="geekblue">{v || '—'}</Tag>,
    },
    {
      title: '角色',
      dataIndex: 'memberRole',
      width: 90,
      render: (v: string) => <Tag color={v === 'head' ? 'gold' : 'blue'}>{ROLE_LABEL[v] || v || '—'}</Tag>,
    },
    {
      title: '门诊量',
      dataIndex: 'outpatientVolume',
      width: 100,
      render: (v: number) => v.toLocaleString(),
    },
    { title: '住院量', dataIndex: 'inpatientVolume', width: 90, render: (v: number) => v.toLocaleString() },
    { title: '手术量', dataIndex: 'surgeryVolume', width: 90, render: (v: number) => v.toLocaleString() },
    {
      title: '收入(万元)',
      dataIndex: 'revenue',
      width: 110,
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: '满意度',
      dataIndex: 'satisfaction',
      width: 90,
      render: (v: number) => <Tag color={v >= 90 ? 'green' : v >= 80 ? 'blue' : 'orange'}>{v.toFixed(1)}</Tag>,
    },
    {
      title: '床位占用',
      dataIndex: 'bedOccupancy',
      width: 90,
      render: (v: number) => <Tag color={v >= 85 ? 'red' : v <= 60 ? 'green' : 'blue'}>{v.toFixed(0)}%</Tag>,
    },
  ];

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
          医院集团多院管理大屏
        </Title>
        <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
          集团驾驶舱 · 仅 admin 可见 · 【集团与科研】下属医院统一运营 / 跨院资源调配 / 集团统一标准
        </Paragraph>
      </div>

      <Content style={{ padding: 24, maxWidth: 1360, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在汇总集团各院运营指标…" />
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

        {!loading && !error && isEmpty && (
          <Alert
            type="info"
            showIcon
            message="暂无集团运营样本。接入成员医院院籍与各院核心指标（门诊/住院/手术/收入/满意度）后将自动成图。"
          />
        )}

        {!loading && !error && dash && data && (
          <>
            {dash.demo && (
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为演示模式数据：尚未接入真实集团运营快照，大屏仅用于演示多院管理效果。"
              />
            )}

            {/* 集团汇总卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>成员医院</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: VI.deep }}>{dash.memberCount}</div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>家</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>门诊量</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                      {dash.totals.outpatientVolume.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>人次/期</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>住院量</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                      {dash.totals.inpatientVolume.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>人次/期</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>手术量</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                      {dash.totals.surgeryVolume.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>台/期</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>业务收入</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: VI.deep }}>
                      {dash.totals.revenue.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>万元/期</div>
                  </div>
                </Card>
              </Col>
              <Col span={4}>
                <Card>
                  <div style={{ textAlign: 'center', padding: '8px 0' }}>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>满意度均分</div>
                    <div style={{ fontSize: 30, fontWeight: 700, color: '#52c41a' }}>
                      {dash.totals.satisfactionAvg.toFixed(1)}
                    </div>
                    <div style={{ fontSize: 12, color: 'rgba(0,0,0,0.45)' }}>分</div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 各医院核心指标对比 */}
            <Card title="各医院核心指标跨院对比（门诊/住院/手术/收入/满意度）" style={{ marginBottom: 16 }}>
              {compareOption ? (
                <ReactECharts option={compareOption} style={{ height: 340 }} />
              ) : (
                <div style={{ textAlign: 'center', color: 'rgba(0,0,0,0.45)', padding: 80 }}>暂无对比数据</div>
              )}
            </Card>

            {/* 下属医院列表 */}
            <Card title="集团下属医院列表（按 hospital_id 严格隔离）" style={{ marginBottom: 16 }}>
              <Table
                rowKey="hospitalId"
                pagination={false}
                dataSource={dash.hospitals}
                locale={{ emptyText: '暂无成员医院' }}
                size="small"
                columns={hospitalColumns}
              />
            </Card>

            {/* 跨院资源调配建议 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              {data.resourceSuggestions.map((rs) => (
                <Col span={8} key={rs.resourceType}>
                  <Card title={`${rs.resourceName}跨院调配（均值 ${rs.averageLoad}%）`} size="small">
                    {rs.overloaded.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <Text type="danger" strong>
                          高负载院：
                        </Text>
                        {rs.overloaded.map((o) => (
                          <Tag color="red" key={o.hospitalId} style={{ marginLeft: 4 }}>
                            {o.hospitalName} {o.load}%
                          </Tag>
                        ))}
                      </div>
                    )}
                    {rs.idle.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <Text type="success" strong>
                          低负载院：
                        </Text>
                        {rs.idle.map((o) => (
                          <Tag color="green" key={o.hospitalId} style={{ marginLeft: 4 }}>
                            {o.hospitalName} {o.load}%
                          </Tag>
                        ))}
                      </div>
                    )}
                    {rs.actionItems.length === 0 ? (
                      <Text type="secondary">暂无需调配</Text>
                    ) : (
                      <List
                        size="small"
                        dataSource={rs.actionItems}
                        renderItem={(a) => (
                          <List.Item>
                            <Text style={{ fontSize: 12 }}>
                              {a.fromHospitalName} → {a.toHospitalName}：约 {a.estimatedQuantity}{' '}
                              {rs.resourceName}
                            </Text>
                          </List.Item>
                        )}
                      />
                    )}
                  </Card>
                </Col>
              ))}
            </Row>

            {/* 集团统一标准 */}
            <Card
              title={`集团统一标准（共 ${dash.standards.total} 项 · 强制 ${dash.standards.mandatory} 项）`}
              extra={
                <span>
                  <Tag color="blue">诊疗规范 {dash.standards.byCategory.clinic}</Tag>
                  <Tag color="cyan">质控标准 {dash.standards.byCategory.qc}</Tag>
                  <Tag color="orange">安全制度 {dash.standards.byCategory.safety}</Tag>
                </span>
              }
            >
              <List
                size="small"
                dataSource={dash.standards.items}
                locale={{ emptyText: '暂无统一标准' }}
                renderItem={(s) => (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          {s.name}
                          <Tag color={s.enforceLevel === 'mandatory' ? 'red' : 'default'} style={{ marginLeft: 8 }}>
                            {s.enforceLevel === 'mandatory' ? '强制执行' : '推荐执行'}
                          </Tag>
                        </span>
                      }
                      description={`[${CATEGORY_LABEL[s.category] || s.category}] ${s.standardCode} · ${s.version}`}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
