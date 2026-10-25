/**
 * 健澜科技 jlmedaios - 院感监测趋势（M637，配套 M606）
 *
 * 三甲流程：7 天趋势 Progress 序列 + 科室感染率排名 Table + 手卫生依从性 Progress。
 * 权限码 infection:viewTrend。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect } from 'react';
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useInfectionMonitorV2M637Store } from '@/store/infectionMonitorV2M637Store';
import type { DeptInfectionRate } from '@/services/api/infectionMonitorV2M637';

export default function InfectionMonitorV2M637Page() {
  usePageTitle('院感监测趋势');
  const { hasPermission } = usePermission();
  const canView = hasPermission('infection:viewTrend');

  const { bundle, loading, error, demo, load } = useInfectionMonitorV2M637Store();

  useEffect(() => {
    void load();
  }, [load]);

  const trend = bundle?.trend ?? [];
  const maxCases = Math.max(1, ...trend.map((t) => t.infections));

  const columns: ColumnsType<DeptInfectionRate> = [
    { title: '科室编码', dataIndex: 'deptCode', width: 120 },
    { title: '科室', dataIndex: 'deptName', width: 140 },
    {
      title: '感染率（%）',
      dataIndex: 'infectionRatePct',
      width: 260,
      sorter: (a, b) => a.infectionRatePct - b.infectionRatePct,
      defaultSortOrder: 'descend',
      render: (v: number) => (
        <Progress
          percent={v * 20}
          size="small"
          strokeColor={v >= 3 ? '#cf1322' : v >= 1.5 ? '#faad14' : '#3f8600'}
          format={() => v.toFixed(2)}
        />
      ),
    },
  ];

  return (
    <PageContainer
      title="院感监测趋势（v2）"
      description="7 天趋势 + 科室感染率排名 + 手卫生依从性"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 infection:viewTrend 权限" />
      )}

      <Spin spinning={loading}>
        <Card size="small" title="近 7 日新发感染数" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            {trend.map((t) => (
              <Col span={24 / trend.length || 4} key={t.date}>
                <div style={{ marginBottom: 6, fontSize: 12 }}>
                  {dayjs(t.date).format('MM-DD')}（{t.infections} 例）
                </div>
                <Progress
                  percent={Math.round((t.infections / maxCases) * 100)}
                  size="small"
                  strokeColor={t.infections >= 3 ? '#cf1322' : t.infections >= 2 ? '#faad14' : '#3f8600'}
                  showInfo={false}
                />
              </Col>
            ))}
          </Row>
        </Card>

        <Row gutter={16}>
          <Col span={14}>
            <Card size="small" title="科室感染率排名">
              <Table rowKey="deptCode" dataSource={bundle?.deptRank ?? []} columns={columns} size="small" pagination={false} />
            </Card>
          </Col>
          <Col span={10}>
            <Card size="small" title="手卫生依从性">
              <Statistic
                title="总体依从率（%）"
                precision={1}
                value={bundle?.handHygiene.overallPct ?? 0}
                valueStyle={{ color: (bundle?.handHygiene.overallPct ?? 0) >= 90 ? '#3f8600' : '#cf1322' }}
              />
              {(bundle?.handHygiene.byRole ?? []).map((r) => (
                <div key={r.role} style={{ marginTop: 12 }}>
                  <span style={{ marginRight: 8, fontSize: 12 }}>{r.role}</span>
                  <Progress percent={r.pct} size="small" />
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </Spin>
    </PageContainer>
  );
}
