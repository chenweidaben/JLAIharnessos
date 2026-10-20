/**
 * 健澜科技 jlmedaios - 运营总览大屏（M490）
 * 路由：/exec/board
 * 深色底 #0A2540 + 亮蓝 #4A90D9
 * 顶部大字 KPI + 门急诊趋势 + 科室床位使用率
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect } from 'react';
import { Alert, Button, Card, Col, Progress, Row, Spin, Statistic, Tag } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
import { useExecBoardStore } from '@/store/execBoardStore';

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

export default function ExecBoardM490Page() {
  usePageTitle('运营总览大屏');
  const { stats, visits, grade5, deptBeds, loading, error, demo, load } = useExecBoardStore();

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading && !stats) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spin size="large" tip="加载运营大屏…" />
      </div>
    );
  }

  const maxTrend = Math.max(
    ...(visits?.trend7d.map((t) => t.outpatient + t.emergency) ?? [1]),
  );

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
        title="运营总览大屏"
        description="每 60 秒自动刷新 · 门急诊/在院/手术/床位/电子病历五级 一屏总览"
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
            message="当前展示为 DEMO 兜底数据（BFF 接入后自动切换为真实数据）"
          />
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} lg={6}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>今日门急诊</span>}
                value={(visits?.todayOutpatient ?? 0) + (visits?.todayEmergency ?? 0)}
                valueStyle={{ color: PALETTE.bright, fontSize: 36, fontWeight: 700 }}
              />
              <div style={{ color: PALETTE.sub, fontSize: 12, marginTop: 8 }}>
                门诊 {visits?.todayOutpatient ?? 0} · 急诊 {visits?.todayEmergency ?? 0}
              </div>
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>在院人数</span>}
                value={stats?.inHospital ?? 0}
                valueStyle={{ color: PALETTE.text, fontSize: 36, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>今日手术</span>}
                value={stats?.todayOperations ?? 0}
                valueStyle={{ color: PALETTE.orange, fontSize: 36, fontWeight: 700 }}
              />
            </Card>
          </Col>
          <Col xs={12} lg={6}>
            <Card style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}>
              <Statistic
                title={<span style={{ color: PALETTE.sub }}>床位使用率</span>}
                value={stats?.bedOccupancy ?? 0}
                precision={1}
                suffix="%"
                valueStyle={{
                  color: (stats?.bedOccupancy ?? 0) > 90 ? PALETTE.red : PALETTE.green,
                  fontSize: 36,
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title={<span style={{ color: PALETTE.text, fontWeight: 600 }}>近 7 天门急诊趋势</span>}
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 220 }}>
                {(visits?.trend7d ?? []).map((t) => {
                  const total = t.outpatient + t.emergency;
                  const h = (total / maxTrend) * 100;
                  return (
                    <div key={t.date} style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ color: PALETTE.bright, fontSize: 12, marginBottom: 4 }}>{total}</div>
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

            <Card
              title={
                <span style={{ color: PALETTE.text, fontWeight: 600 }}>
                  电子病历五级项目（{grade5?.passed ?? 0}/{grade5?.total ?? 0}）
                </span>
              }
              style={{
                background: PALETTE.card,
                border: '1px solid rgba(74,144,217,0.4)',
                marginTop: 16,
              }}
            >
              <Progress
                percent={grade5?.rate ?? 0}
                strokeColor={PALETTE.accent}
                style={{ color: PALETTE.text }}
              />
              <Tag color="cyan" style={{ marginTop: 8 }}>
                距五级 80 分线 {Math.max(0, 80 - (grade5?.rate ?? 0)).toFixed(1)}%
              </Tag>
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title={<span style={{ color: PALETTE.text, fontWeight: 600 }}>各科室床位使用率</span>}
              style={{ background: PALETTE.card, border: '1px solid rgba(74,144,217,0.4)' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {deptBeds.map((r) => (
                  <div key={r.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ color: PALETTE.text, fontSize: 13 }}>{r.dept}</span>
                      <span
                        style={{
                          color: r.rate > 95 ? PALETTE.red : r.rate > 85 ? PALETTE.orange : PALETTE.green,
                          fontSize: 12,
                        }}
                      >
                        {r.rate.toFixed(1)}%
                      </span>
                    </div>
                    <Progress
                      percent={r.rate}
                      size="small"
                      showInfo={false}
                      strokeColor={r.rate > 95 ? PALETTE.red : r.rate > 85 ? PALETTE.orange : PALETTE.accent}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>
        </Row>
      </PageContainer>
    </div>
  );
}
