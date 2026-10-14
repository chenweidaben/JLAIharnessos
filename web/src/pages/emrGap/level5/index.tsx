/**
 * 健澜科技 jlmedaios - 电子病历五级评审自评仪表盘（M90-A + M93-B）
 *
 * 合格率趋势（纯 CSS bar，不引入图表库）+ 评级分布（甲/乙/丙计数卡）+ 短板维度列表。
 * 深海蓝 VI：主色 #0A4D8C，头部渐变 #073A6B → #0A4D8C → #0B5AA0。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Alert, Card, Col, Empty, Layout, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect } from 'react';
import { usePermission } from '@/router/guards';
import { useEmrLevel5Store } from '@/store/emrLevel5Store';
import type { TrendPoint, WeaknessDimension } from '@/services/api/emrLevel5';

const { Header, Content } = Layout;
const { Title } = Typography;

/** 深海蓝 VI */
const VI_PRIMARY = '#0A4D8C';
const VI_HEADER_BG = 'linear-gradient(160deg, #073A6B 0%, #0A4D8C 45%, #0B5AA0 100%)';

/** 评级卡配色：甲级绿 / 乙级蓝 / 丙级红 */
const GRADE_COLOR: Record<string, string> = {
  甲级: '#389E0D',
  乙级: '#0A4D8C',
  丙级: '#CF1322',
};

/** 单条合格率 CSS bar */
function RateBar({ point }: { point: TrendPoint }) {
  const pct = Math.round(point.passRate * 100);
  const barColor = pct >= 90 ? '#389E0D' : pct >= 75 ? '#0A4D8C' : '#CF1322';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ width: 96, fontSize: 12, color: '#595959' }}>{point.date.slice(5)}</span>
      <div
        style={{
          flex: 1, height: 12, background: '#F0F5FA', borderRadius: 6, overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${pct}%`, height: '100%', background: barColor,
            borderRadius: 6, transition: 'width .3s',
          }}
        />
      </div>
      <span style={{ width: 56, fontSize: 12, color: '#262626', textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

export default function EmrLevel5Page() {
  const { data, loading, error, load } = useEmrLevel5Store();
  const { hasPermission } = usePermission();

  useEffect(() => {
    void load();
  }, [load]);

  const trendColumns: ColumnsType<TrendPoint> = [
    { title: '日期', dataIndex: 'date', key: 'date' },
    { title: '参评份数', dataIndex: 'total', key: 'total' },
    { title: '合格份数(≥90)', dataIndex: 'passed', key: 'passed' },
    {
      title: '合格率', dataIndex: 'passRate', key: 'passRate',
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
  ];

  const weaknessColumns: ColumnsType<WeaknessDimension> = [
    { title: '短板维度', dataIndex: 'label', key: 'label' },
    {
      title: '问题次数', dataIndex: 'count', key: 'count',
      sorter: (a, b) => a.count - b.count,
      defaultSortOrder: 'descend',
    },
    {
      title: '占比条', key: 'bar',
      render: (_v, record) => {
        const max = data?.weaknesses[0]?.count ?? 1;
        return (
          <div style={{ width: 160, height: 8, background: '#F0F5FA', borderRadius: 4 }}>
            <div
              style={{
                width: `${Math.round((record.count / max) * 100)}%`,
                height: '100%', background: VI_PRIMARY, borderRadius: 4,
              }}
            />
          </div>
        );
      },
    },
  ];

  const dist = data?.gradeDistribution;
  const latest = data?.trend[data.trend.length - 1];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: VI_HEADER_BG }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          电子病历五级评审自评仪表盘
          <Tag color="#FAAD14" style={{ marginLeft: 12 }}>近 {data?.rangeDays ?? 30} 日</Tag>
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#F5F8FC' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {data?.demo && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            message="当前为演示数据：在架/终末质控历史表暂无近 30 日记录，接入真实评分后自动切换。"
          />
        )}

        {/* 概览指标 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic title="最新全院合格率" value={latest ? Math.round(latest.passRate * 100) : '-'} suffix="%"
                valueStyle={{ color: VI_PRIMARY }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="累计参评份数" value={data?.trend.reduce((s, p) => s + p.total, 0) ?? '-'} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="在架质控模块" value={data?.modules[0].label ?? 'M90-A'} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="终末质控模块" value={data?.modules[1].label ?? 'M93-B'} />
            </Card>
          </Col>
        </Row>

        {/* 评级分布：甲/乙/丙计数卡 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          {(['甲级', '乙级', '丙级'] as const).map((g) => (
            <Col span={8} key={g}>
              <Card>
                <Statistic
                  title={<span style={{ color: GRADE_COLOR[g], fontWeight: 600 }}>{g}病历</span>}
                  value={dist?.[g] ?? '-'}
                  valueStyle={{ color: GRADE_COLOR[g] }}
                />
              </Card>
            </Col>
          ))}
        </Row>

        <Row gutter={16}>
          {/* 合格率趋势 */}
          <Col span={12}>
            <Card title="全院合格率趋势（≥90 分占比）" loading={loading} style={{ marginBottom: 16 }}>
              {(data?.trend.length ?? 0) === 0 ? (
                <Empty description="暂无趋势数据" />
              ) : (
                data?.trend.slice(-14).map((p) => <RateBar key={p.date} point={p} />)
              )}
            </Card>
            <Card title="趋势明细（全部日期）">
              <Table
                rowKey="date" size="small" loading={loading}
                columns={trendColumns} dataSource={data?.trend ?? []}
                pagination={{ pageSize: 8 }}
                locale={{ emptyText: <Empty description="暂无数据" /> }}
              />
            </Card>
          </Col>

          {/* 短板维度 + 分模块 */}
          <Col span={12}>
            <Card title="短板维度分布" loading={loading} style={{ marginBottom: 16 }}>
              <Table
                rowKey="dimension" size="small"
                columns={weaknessColumns} dataSource={data?.weaknesses ?? []}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无短板，病历质量达标" /> }}
              />
            </Card>
            {data?.modules.map((m) => (
              <Card key={m.key} title={`${m.label} 合格份数`} size="small" style={{ marginBottom: 12 }}>
                <Statistic
                  value={m.trend.reduce((s, p) => s + p.passed, 0)}
                  suffix={`/ ${m.trend.reduce((s, p) => s + p.total, 0)} 份`}
                  valueStyle={{ color: VI_PRIMARY }}
                />
              </Card>
            ))}
            {hasPermission('emr_level5:view') && null}
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
