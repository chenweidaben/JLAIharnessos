/**
 * 健澜科技 jlmedaios - 医院智慧资产月度报表页（M119-C）
 *
 * 依据宪法第七章 7.2 / 7.7 / 7.9：
 *   院长 / admin 视角按月复盘全院 MUSE 决策经验沉淀：
 *     新增经验总数 / 成功经验 / 失败教训（7.7 单独成桶）/
 *     活跃员工 Top5 / 重点教训 Top3 / 环比上月。
 *
 * 深海蓝 VI：#0A2540 底色 / #1E5F8C 主蓝 / #4A90D9 强调。
 * 三态：loading 骨架 / error 告警+重试 / empty 空数据占位。
 * 权限：仅 admin 可访问（BFF 已强校验，前端不做开关）。
 * 下载按钮：直接把 BFF 返回的纯文本落盘 .txt。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Layout,
  List,
  Row,
  Select,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import { DownloadOutlined, ReloadOutlined } from '@ant-design/icons';
import { get } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

/** 深海蓝主题色板（与全院 VI 一致） */
const DEEP_BG = '#0A2540';
const MID_BLUE = '#1E5F8C';
const ACCENT = '#4A90D9';

/* ------------------------------- 与 BFF 响应对齐的类型 ------------------------------- */

interface ActiveStaffRow {
  staffId: string;
  staffName: string;
  deptCode: string;
  decisionCount: number;
  successCount: number;
  lessonCount: number;
}

interface LessonRow {
  topic: string;
  staffName: string;
  occurrenceCount: number;
  latestAt: string;
}

interface GrowthVsLastMonth {
  previousTotalNew: number;
  delta: number;
  ratioPct: number | null;
}

interface MonthlyWisdomReport {
  year: number;
  month: number;
  totalNew: number;
  successCount: number;
  lessonCount: number;
  top5Active: ActiveStaffRow[];
  top3Lessons: LessonRow[];
  growthVsLastMonth: GrowthVsLastMonth;
}

interface MonthlyReportData {
  demo: boolean;
  year: number;
  month: number;
  report: MonthlyWisdomReport;
  text: string;
}

/* ------------------------------- 工具 ------------------------------- */

/** 默认选中当前月（服务端时区以 BFF 为准，这里仅给前端初始值） */
function currentYearMonth(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 触发浏览器下载 .txt */
function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ------------------------------- 单张统计卡 ------------------------------- */

function StatCard({
  label,
  value,
  suffix,
  accent,
  extra,
}: {
  label: string;
  value: string;
  suffix?: string;
  accent: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card style={{ borderTop: `3px solid ${accent}`, borderRadius: 8, height: '100%' }} bodyStyle={{ padding: 20 }}>
      <Text type="secondary">{label}</Text>
      <div style={{ marginTop: 8 }}>
        <Statistic
          value={value}
          suffix={suffix}
          valueStyle={{ color: DEEP_BG, fontSize: 28, fontWeight: 600 }}
        />
      </div>
      {extra && <div style={{ marginTop: 8 }}>{extra}</div>}
    </Card>
  );
}

/* ------------------------------- 页面组件 ------------------------------- */

export default function MonthlyReportPage() {
  const initial = useMemo(currentYearMonth, []);
  const [year, setYear] = useState<number>(initial.year);
  const [month, setMonth] = useState<number>(initial.month);
  const [data, setData] = useState<MonthlyReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  const load = useCallback(async (y: number, m: number) => {
    setLoading(true);
    setError('');
    try {
      const res = await get<MonthlyReportData>('/muse/report/monthly', { year: y, month: m }, { silent: true });
      setData(res);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : '智慧资产月度报表加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(year, month);
  }, [load, year, month]);

  const isEmpty = !!data && data.report.totalNew === 0;

  const growth = data?.report.growthVsLastMonth;
  const growthExtra =
    growth === undefined ? null : growth.ratioPct === null ? (
      <Text style={{ fontSize: 12, color: 'rgba(10,37,64,0.55)' }}>上月无基数</Text>
    ) : (
      <Text style={{ fontSize: 12, color: growth.delta >= 0 ? '#389e0d' : '#cf1322' }}>
        环比 {growth.delta >= 0 ? '+' : ''}
        {growth.delta} 条（{growth.ratioPct >= 0 ? '+' : ''}
        {growth.ratioPct}%）
      </Text>
    );

  const onDownload = useCallback(() => {
    if (!data) return;
    downloadText(
      `智慧资产月报_${data.year}-${pad2(data.month)}.txt`,
      data.text,
    );
  }, [data]);

  const yearOptions = useMemo(
    () => [initial.year - 2, initial.year - 1, initial.year, initial.year + 1].map((y) => ({ value: y, label: `${y} 年` })),
    [initial.year],
  );
  const monthOptions = useMemo(
    () => Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `${i + 1} 月` })),
    [],
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: DEEP_BG,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Title level={4} style={{ color: '#fff', margin: 0 }}>
          医院智慧资产 · 月度报表
        </Title>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Select
            value={year}
            onChange={(v) => setYear(v)}
            options={yearOptions}
            style={{ width: 110 }}
            size="small"
          />
          <Select
            value={month}
            onChange={(v) => setMonth(v)}
            options={monthOptions}
            style={{ width: 90 }}
            size="small"
          />
          {data?.demo && (
            <Badge count="演示数据" style={{ background: '#faad14' }} overflowCount={99} />
          )}
          <Button icon={<ReloadOutlined />} loading={loading} onClick={() => void load(year, month)}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            disabled={!data}
            onClick={onDownload}
            style={{ background: ACCENT, borderColor: ACCENT }}
          >
            下载月报
          </Button>
        </div>
      </Header>

      <Content style={{ padding: 24, background: '#f0f4f8' }}>
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={error}
            action={
              <Button size="small" danger onClick={() => void load(year, month)}>
                重试
              </Button>
            }
          />
        )}

        {loading && !data ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <Spin size="large" tip="加载智慧资产月度报表…" />
          </div>
        ) : isEmpty ? (
          <Card>
            <Empty description="当月暂无员工 MUSE 决策经验沉淀：医生 / 护士 / 药师 Personal Agent 开始记录决策后，这里会自动汇总成功经验与失败教训" />
          </Card>
        ) : (
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="新增经验总数" value={String(data?.report.totalNew ?? 0)} suffix="条" accent={DEEP_BG} extra={growthExtra} />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="成功经验" value={String(data?.report.successCount ?? 0)} suffix="条" accent="#52c41a" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard label="失败教训" value={String(data?.report.lessonCount ?? 0)} suffix="条" accent="#cf1322" />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <StatCard
                label="上月基数"
                value={String(data?.report.growthVsLastMonth.previousTotalNew ?? 0)}
                suffix="条"
                accent={MID_BLUE}
              />
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>最活跃员工 Top5</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <List
                  size="small"
                  dataSource={data?.report.top5Active ?? []}
                  renderItem={(item, idx) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#fff' }}>
                            <Tag color={MID_BLUE}>{idx + 1}</Tag>
                            {item.staffName}
                            {item.deptCode && (
                              <Text style={{ color: 'rgba(255,255,255,0.55)', marginLeft: 8, fontSize: 12 }}>
                                ［{item.deptCode}］
                              </Text>
                            )}
                          </Text>
                          <Text style={{ color: ACCENT, fontWeight: 600 }}>{item.decisionCount} 次决策</Text>
                        </div>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            成功 {item.successCount} 条 ｜ 教训 {item.lessonCount} 条
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={<span style={{ color: '#fff' }}>重点教训 Top3（依据宪法第七章 7.7）</span>}
                style={{ background: DEEP_BG, borderRadius: 8 }}
                bodyStyle={{ background: DEEP_BG }}
              >
                <List
                  size="small"
                  dataSource={data?.report.top3Lessons ?? []}
                  renderItem={(item, idx) => (
                    <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ width: '100%' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={{ color: '#fff' }}>
                            <Tag color="#cf1322">{idx + 1}</Tag>
                            {item.topic}
                          </Text>
                          <Text style={{ color: '#ff7875', fontWeight: 600 }}>× {item.occurrenceCount}</Text>
                        </div>
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                            首报 {item.staffName} ｜ 最近 {item.latestAt ? item.latestAt.slice(0, 10) : '—'}
                          </Text>
                        </div>
                      </div>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
