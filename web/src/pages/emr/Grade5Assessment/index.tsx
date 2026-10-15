/**
 * 健澜科技 jlmedaios - 电子病历五级评审八维度闭环自评页（M99-A）
 *
 * 八维度雷达图（ECharts）+ 维度得分表 + 低分维度整改建议列表。
 * 深海蓝 VI：主色 #0A4D8C，头部渐变 #073A6B → #0A4D8C → #0B5AA0。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Alert, Card, Col, Empty, Layout, List, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { EChartsOption } from 'echarts';
import { useEffect, useMemo } from 'react';
import BaseChart from '@/components/charts/BaseChart';
import { usePermission } from '@/router/guards';
import { useEmrGrade5Store } from '@/store/emrGrade5Store';
import type { DimensionScore } from '@/services/api/emrGrade5';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

/** 深海蓝 VI */
const VI_PRIMARY = '#0A4D8C';
const VI_HEADER_BG = 'linear-gradient(160deg, #073A6B 0%, #0A4D8C 45%, #0B5AA0 100%)';

/** 完成率档位配色：红线 <60% 红 / 待提升 <80% 橙 / 达标 ≥80% 绿 */
function statusOf(ratio: number): { label: string; color: string } {
  if (ratio < 0.6) return { label: '红线整改', color: '#CF1322' };
  if (ratio < 0.8) return { label: '待提升', color: '#D48806' };
  return { label: '达标', color: '#389E0D' };
}

export default function Grade5AssessmentPage() {
  const { data, loading, error, load } = useEmrGrade5Store();
  const { hasPermission } = usePermission();

  useEffect(() => {
    void load();
  }, [load]);

  /** 雷达图 option：八轴指标 + 得分面 */
  const radarOption = useMemo<EChartsOption | null>(() => {
    if (!data || data.dimensions.length === 0) return null;
    return {
      tooltip: {},
      radar: {
        indicator: data.dimensions.map((d) => ({ name: d.label, max: d.maxScore })),
        radius: '65%',
        splitArea: { areaStyle: { color: ['#F5F8FC', '#EAF1F9'] } },
        axisName: { color: '#262626', fontSize: 12 },
      },
      series: [
        {
          type: 'radar',
          areaStyle: { opacity: 0.25 },
          lineStyle: { color: VI_PRIMARY, width: 2 },
          itemStyle: { color: VI_PRIMARY },
          data: [{ value: data.dimensions.map((d) => d.score), name: '八维度得分' }],
        },
      ],
      color: [VI_PRIMARY],
    };
  }, [data]);

  const columns: ColumnsType<DimensionScore> = [
    { title: '维度', dataIndex: 'label', key: 'label' },
    {
      title: '得分', key: 'score',
      render: (_v, r) => `${r.score} / ${r.maxScore}`,
      sorter: (a, b) => a.score - b.score,
      defaultSortOrder: 'ascend',
    },
    {
      title: '完成率', dataIndex: 'ratio', key: 'ratio',
      render: (v: number) => `${Math.round(v * 100)}%`,
    },
    {
      title: '状态', key: 'status',
      render: (_v, r) => {
        const s = statusOf(r.ratio);
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
  ];

  /** 整改建议：仅列出未达标（<80%）维度 */
  const weakDimensions = (data?.dimensions ?? []).filter((d) => d.ratio < 0.8);
  const redLineCount = (data?.dimensions ?? []).filter((d) => d.ratio < 0.6).length;
  const overallRatio = data && data.maxTotal > 0 ? data.totalScore / data.maxTotal : 0;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: VI_HEADER_BG }}>
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          EMR五级评审 · 八维度闭环自评
          <Tag color="#FAAD14" style={{ marginLeft: 12 }}>
            {data?.assessedAt ? new Date(data.assessedAt).toLocaleDateString('zh-CN') : '待评'}
          </Tag>
        </Title>
      </Header>
      <Content style={{ padding: 24, background: '#F5F8FC' }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {data?.demo && (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            message="当前为演示基线：评审表暂无历史自评记录，接入真实评分后自动切换。"
          />
        )}

        {/* 概览指标 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={8}>
            <Card>
              <Statistic
                title="综合得分"
                value={data ? Math.round(overallRatio * 100) : '-'}
                suffix="%"
                valueStyle={{ color: VI_PRIMARY }}
              />
              <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
                八维合计 {data?.totalScore ?? '-'} / {data?.maxTotal ?? '-'}
              </Paragraph>
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="待提升维度（<80%）"
                value={weakDimensions.length}
                valueStyle={{ color: weakDimensions.length > 0 ? '#D48806' : '#389E0D' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card>
              <Statistic
                title="红线整改维度（<60%）"
                value={redLineCount}
                valueStyle={{ color: redLineCount > 0 ? '#CF1322' : '#389E0D' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={16}>
          {/* 八维度雷达图 */}
          <Col span={12}>
            <Card title="八维度能力雷达" loading={loading} style={{ marginBottom: 16 }}>
              {radarOption ? (
                <BaseChart option={radarOption} height={380} />
              ) : (
                <Empty description="暂无雷达数据" />
              )}
            </Card>
          </Col>

          {/* 维度得分表 */}
          <Col span={12}>
            <Card title="维度得分明细" loading={loading}>
              <Table
                rowKey="dimension" size="small"
                columns={columns} dataSource={data?.dimensions ?? []}
                pagination={false}
                locale={{ emptyText: <Empty description="暂无评分数据" /> }}
              />
            </Card>
          </Col>
        </Row>

        {/* 低分维度整改建议列表 */}
        <Card title="低分维度整改建议" style={{ marginTop: 16 }} loading={loading}>
          {weakDimensions.length === 0 ? (
            <Empty description="八维度全部达标，保持常态化运行" />
          ) : (
            <List
              dataSource={weakDimensions}
              renderItem={(d) => {
                const s = statusOf(d.ratio);
                return (
                  <List.Item>
                    <List.Item.Meta
                      title={
                        <span>
                          <Tag color={s.color}>{s.label}</Tag>
                          {d.label}
                          <span style={{ marginLeft: 8, color: '#8c8c88', fontSize: 12 }}>
                            {Math.round(d.ratio * 100)}%（{d.score}/{d.maxScore}）
                          </span>
                        </span>
                      }
                      description={
                        <List
                          size="small"
                          dataSource={d.suggestions}
                          renderItem={(sug) => <List.Item style={{ padding: '4px 0' }}>• {sug}</List.Item>}
                        />
                      }
                    />
                  </List.Item>
                );
              }}
            />
          )}
          {hasPermission('emr_level5:view') && null}
        </Card>
      </Content>
    </Layout>
  );
}
