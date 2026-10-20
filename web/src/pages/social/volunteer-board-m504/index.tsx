/**
 * 健澜科技 jlmedaios - 志愿服务管理看板（M504）
 * 路由：/social/volunteer-board
 * 顶部 KPI：注册志愿者 / 本月服务时长 / 人均时长 / 服务人次
 * 志愿队伍 / 志愿活动
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Row, Spin, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import type { ActivityRow, TeamRow } from '@/services/api/volunteerBoard';
import { useVolunteerBoardStore } from '@/store/volunteerBoardStore';

const { Text } = Typography;

const JL = {
  navy: '#0A2540',
  blue: '#1E5F8C',
  accent: '#4A90D9',
  ok: '#52C41A',
  bad: '#D9534F',
  warn: '#FA8C16',
} as const;

function hoursColor(h: number): string {
  return h <= 4 ? JL.ok : h <= 8 ? JL.accent : JL.warn;
}

function hoursLabel(h: number): string {
  return h <= 4 ? '≤4h' : h <= 8 ? '4-8h' : '>8h';
}

const TEAM_COLUMNS: ColumnsType<TeamRow> = [
  { title: '队伍名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '所属部门', dataIndex: 'dept', render: (v: string) => <Tag color="blue">{v}</Tag> },
  { title: '人数', dataIndex: 'count', sorter: (a, b) => b.count - a.count },
  { title: '负责人', dataIndex: 'leader' },
];

const ACTIVITY_COLUMNS: ColumnsType<ActivityRow> = [
  { title: '活动名称', dataIndex: 'name', render: (v: string) => <Text strong style={{ color: JL.navy }}>{v}</Text> },
  { title: '时间', dataIndex: 'time' },
  { title: '地点', dataIndex: 'location' },
  {
    title: '服务时长',
    dataIndex: 'hours',
    render: (v: number) => <Tag color={hoursColor(v)}>{hoursLabel(v)}</Tag>,
    sorter: (a, b) => b.hours - a.hours,
  },
  { title: '参与人数', dataIndex: 'participants', sorter: (a, b) => b.participants - a.participants },
];

export default function VolunteerBoardM504Page() {
  usePageTitle('志愿服务管理看板');
  const { teams, activities, stats, loading, error, demo, load } = useVolunteerBoardStore();

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && teams.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载志愿看板…" />
      </div>
    );
  }

  return (
    <PageContainer
      title="志愿服务管理看板（智慧服务三级 P0 合规重点）"
      description="志愿队伍 / 志愿活动 一屏总览"
      extra={
        <Button icon={<ReloadOutlined />} onClick={() => void load()}>
          刷新
        </Button>
      }
    >
      {error && (
        <Alert type="warning" showIcon style={{ marginBottom: 16 }} message={error} />
      )}
      {demo && (
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          message="当前展示为 DEMO 兜底数据（BFF /volunteer/* 接入后自动切换为真实数据）"
        />
      )}

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.blue}` }}>
            <Statistic
              title="注册志愿者"
              value={stats?.registered ?? 0}
              suffix="人"
              valueStyle={{ color: JL.blue }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.accent}` }}>
            <Statistic
              title="本月服务时长"
              value={stats?.totalHours ?? 0}
              suffix="小时"
              valueStyle={{ color: JL.accent }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.ok}` }}>
            <Statistic
              title="人均服务时长"
              value={stats?.avgHours ?? 0}
              precision={1}
              suffix="小时"
              valueStyle={{ color: JL.ok }}
            />
          </Card>
        </Col>
        <Col xs={12} lg={6}>
          <Card style={{ borderTop: `3px solid ${JL.warn}` }}>
            <Statistic
              title="服务人次"
              value={stats?.servedCount ?? 0}
              suffix="人次"
              valueStyle={{ color: JL.warn }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} xl={10}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>志愿队伍</span>}
            style={{ borderTop: `3px solid ${JL.blue}`, marginBottom: 16 }}
          >
            <Table rowKey="id" columns={TEAM_COLUMNS} dataSource={teams} pagination={false} size="middle" />
          </Card>
        </Col>

        <Col xs={24} xl={14}>
          <Card
            title={<span style={{ color: JL.navy, fontWeight: 600 }}>近期志愿活动</span>}
            style={{ borderTop: `3px solid ${JL.accent}` }}
          >
            <Table rowKey="id" columns={ACTIVITY_COLUMNS} dataSource={activities} pagination={false} size="middle" />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
}
