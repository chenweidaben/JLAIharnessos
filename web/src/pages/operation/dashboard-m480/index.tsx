/**
 * 健澜科技 jlmedaios - 医院运营实时大屏（M480）
 * 路由：/operation/dashboard
 * 深色底 #0A2540 + 亮蓝 #4A90D9，大数字风格
 * 顶部今日门急诊 + 三栏：住院实时 / 手术间 / 7 天趋势
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Tag, Typography } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { useOperationBoardStore } from '@/store/operationBoardStore';

const { Text } = Typography;

const PALETTE = {
  bg: '#0A2540',
  card: 'rgba(30, 95, 140, 0.25)',
  accent: '#4A90D9',
  bright: '#69c0ff',
  green: '#52c41a',
  orange: '#fa8c16',
  red: '#ff4d4f',
  text: '#e6f4ff',
  sub: '#8fb8dd',
} as const;

const ROOM_STATUS_META: Record<string, { color: string; label: string }> = {
  'in-op': { color: '#ff4d4f', label: '手术中' },
  cleaning: { color: '#faad14', label: '清洁中' },
  waiting: { color: '#4A90D9', label: '接台等待' },
  idle: { color: '#52c41a', label: '空闲' },
};

export default function OperationDashboardM480Page() {
  usePageTitle('医院运营实时大屏');
  const { visits, inpatient, opRoom, loading, error, demo, load } = useOperationBoardStore();

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !visits) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载运营大屏…" />
      </div>
    );
  }

  const maxTrend = Math.max(...(visits?.trend7d.map((t) => t.outpatient + t.emergency) ?? [1]));

  return (
    <div
      style={{
        background: PALETTE.bg,
        margin: -24,
        padding: 24,
        minHeight: 'calc(100vh - 64px)',
        color: PALETTE.text,
      }}
    >
      <PageContainer
        title="医院运营实时大屏"
        description="每 60 秒自动刷新 · 门急诊/住院/手术间实时状态"
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={() => void load()}
            style={{ background: PALETTE.accent, color: '#fff', border: 'none' }}
          >
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
            message="当前展示为 DEMO 兜底数据（BFF /operation/* 接入后自动切换为真实数据）"
          />
        )}

        {/* 顶部今日门急诊大数字 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={8}>
            <Card
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>今日门诊</span>}
                value={visits?.todayOutpatient ?? 0}
                valueStyle={{ color: PALETTE.bright, fontSize: 40, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>今日急诊</span>}
                value={visits?.todayEmergency ?? 0}
                valueStyle={{ color: PALETTE.orange, fontSize: 40, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={8}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>已挂号</span>}
                value={visits?.todayRegistration ?? 0}
                valueStyle={{ color: PALETTE.green, fontSize: 40, fontWeight: 700 }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* 住院实时 */}
          <Col xs={24} xl={8}>
            <Card
              title={<span style={{ color: PALETTE.text, fontWeight: 600 }}>住院实时</span>}
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <Row gutter={[12, 12]}>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>在院</span>}
                    value={inpatient?.inHospital ?? 0}
                    valueStyle={{ color: PALETTE.bright, fontSize: 28 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>空床</span>}
                    value={inpatient?.emptyBeds ?? 0}
                    valueStyle={{ color: PALETTE.green, fontSize: 28 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>今日入院</span>}
                    value={inpatient?.todayAdmit ?? 0}
                    valueStyle={{ color: PALETTE.text, fontSize: 22 }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>今日出院</span>}
                    value={inpatient?.todayDischarge ?? 0}
                    valueStyle={{ color: PALETTE.text, fontSize: 22 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: PALETTE.sub, fontSize: 12 }}>
                  床位使用率 {inpatient?.totalBeds ?? 0} 张床位
                </Text>
                <Progress
                  percent={inpatient?.occupancyRate ?? 0}
                  strokeColor={
                    (inpatient?.occupancyRate ?? 0) > 90 ? PALETTE.red : PALETTE.accent
                  }
                />
              </div>
            </Card>
          </Col>

          {/* 手术间 */}
          <Col xs={24} xl={8}>
            <Card
              title={<span style={{ color: PALETTE.text, fontWeight: 600 }}>手术间实时</span>}
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <Row gutter={[12, 12]}>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>手术中</span>}
                    value={opRoom?.inOperation ?? 0}
                    valueStyle={{ color: PALETTE.red, fontSize: 28 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>今日完成</span>}
                    value={opRoom?.todayCompleted ?? 0}
                    valueStyle={{ color: PALETTE.green, fontSize: 28 }}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title={<span style={{ color: PALETTE.sub }}>接台等待</span>}
                    value={opRoom?.waitingNext ?? 0}
                    valueStyle={{ color: PALETTE.orange, fontSize: 28 }}
                  />
                </Col>
              </Row>
              <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {opRoom?.rooms.map((r) => {
                  const m = ROOM_STATUS_META[r.status];
                  return (
                    <Tag key={r.id} color={m.color} style={{ marginInlineEnd: 0 }}>
                      {r.room} · {m.label}
                    </Tag>
                  );
                })}
              </div>
            </Card>
          </Col>

          {/* 7 天趋势 */}
          <Col xs={24} xl={8}>
            <Card
              title={<span style={{ color: PALETTE.text, fontWeight: 600 }}>近 7 天门急诊趋势</span>}
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 180 }}>
                {(visits?.trend7d ?? []).map((t) => {
                  const total = t.outpatient + t.emergency;
                  const h = (total / maxTrend) * 100;
                  return (
                    <div key={t.date} style={{ flex: 1, textAlign: 'center' }}>
                      <div
                        style={{
                          height: `${h}%`,
                          background: `linear-gradient(180deg, ${PALETTE.bright} 0%, ${PALETTE.accent} 100%)`,
                          borderRadius: '4px 4px 0 0',
                          minHeight: 4,
                        }}
                      />
                      <div style={{ color: PALETTE.sub, fontSize: 11, marginTop: 4 }}>{t.date}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        </Row>
      </PageContainer>
    </div>
  );
}
