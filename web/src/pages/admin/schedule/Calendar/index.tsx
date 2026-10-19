/**
 * 健澜科技 jlmedaios - M152-C 医院智能排班日历（管理端 · AI 能力深化）
 *
 * 交互：
 *   1) 选择科室 + 周起止日期，点「运行 AI 排班」→ POST /api/v1/admin/schedule/optimize；
 *   2) 周视图：行=员工，列=周一~周日，单元格内标签=白班(day) / 夜班(night) / 休(off)；
 *   3) 指标卡：夜班 max-min gap（应 ≤1）、缺岗数、周工作日超限数、主任白班覆盖；
 *   4) 冲突列表：getScheduleConflict 输出，红 / 黄 Tag 区分。
 *
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useMemo, useState } from 'react';
import { Button, Card, Col, DatePicker, Layout, message, Row, Select, Space, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

const { Content } = Layout;
const { Title, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  accentSoft: '#8aa9c9',
  bg: '#f5f7fa',
  dayBg: '#e6f0fb',
  dayFg: '#0a2540',
  nightBg: '#0a2540',
  nightFg: '#ffffff',
  offFg: '#b0b8c1',
};

interface StaffMember {
  id: string;
  name: string;
  role: 'attending' | 'resident' | 'intern';
}
interface Assignment {
  staffId: string;
  staffName: string;
  role: StaffMember['role'];
  date: string;
  shift: 'day' | 'night';
}
interface Conflict {
  type: string;
  staffId?: string;
  date: string;
  message: string;
}
interface Grid {
  dept: string;
  startDate: string;
  endDate: string;
  assignments: Assignment[];
  staffNightCounts: Record<string, number>;
  staffWorkdayCounts: Record<string, number>;
  metrics: { totalShifts: number; nightMaxMinGap: number; uncovered: { date: string; shift: string; required: number; actual: number }[] };
  conflicts: Conflict[];
}

/** 演示员工池：2 名主任 + 3 名主治 + 2 名住院医，足以摊平夜班 */
const DEMO_STAFF: StaffMember[] = [
  { id: 'D-001', name: '陈国维', role: 'attending' },
  { id: 'D-002', name: '林雅琴', role: 'attending' },
  { id: 'R-001', name: '赵立群', role: 'resident' },
  { id: 'R-002', name: '黄敏', role: 'resident' },
  { id: 'R-003', name: '周文彬', role: 'resident' },
  { id: 'I-001', name: '吴思远', role: 'intern' },
  { id: 'I-002', name: '徐若曦', role: 'intern' },
];

const DEPT_OPTIONS = ['呼吸内科', '心内科', '普外科', '神经内科'];

function isoWeekDates(start: Dayjs): string[] {
  const monday = start.startOf('week').add(1, 'day'); // dayjs 默认周日为一周起点
  return Array.from({ length: 7 }, (_, i) => monday.add(i, 'day').format('YYYY-MM-DD'));
}

async function runOptimize(dept: string, startDate: string, endDate: string): Promise<Grid> {
  const resp = await fetch('/api/v1/admin/schedule/optimize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dept,
      startDate,
      endDate,
      staff: DEMO_STAFF,
      maxWorkdaysPerWeek: 5,
      minDayStaff: 2,
      minNightStaff: 1,
      requireAttendingDay: true,
    }),
  });
  const body = await resp.json();
  if (body.code !== 0) throw new Error(body.message || '排班计算失败');
  return body.data as Grid;
}

export default function SmartScheduleCalendarPage() {
  const [dept, setDept] = useState(DEPT_OPTIONS[0]);
  const [week, setWeek] = useState<Dayjs>(dayjs());
  const [loading, setLoading] = useState(false);
  const [grid, setGrid] = useState<Grid | null>(null);

  const weekDates = useMemo(() => isoWeekDates(week), [week]);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const start = weekDates[0];
      const end = weekDates[6];
      const r = await runOptimize(dept, start, end);
      setGrid(r);
      if (r.conflicts.length > 0) message.warning(`检测到 ${r.conflicts.length} 处冲突，建议复核`);
      else message.success(`AI 排班完成：共 ${r.metrics.totalShifts} 班次，夜班均衡差 ${r.metrics.nightMaxMinGap} 天`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '排班计算失败');
    } finally {
      setLoading(false);
    }
  };

  /** 单元格内容：key = staffId|date */
  const cellMap = useMemo(() => {
    const m = new Map<string, Assignment[]>();
    for (const a of grid?.assignments ?? []) {
      const k = `${a.staffId}|${a.date}`;
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(a);
    }
    return m;
  }, [grid]);

  const columns: ColumnsType<StaffMember> = [
    {
      title: '员工',
      dataIndex: 'name',
      fixed: 'left',
      width: 140,
      render: (_: unknown, row) => (
        <Space size={6}>
          <span>{row.name}</span>
          <Tag color={row.role === 'attending' ? 'gold' : row.role === 'resident' ? 'blue' : 'default'}>
            {row.role === 'attending' ? '主任' : row.role === 'resident' ? '主治' : '住院'}
          </Tag>
        </Space>
      ),
    },
    ...weekDates.map((date, idx) => ({
      title: (
        <div>
          <div>{['一', '二', '三', '四', '五', '六', '日'][idx]}</div>
          <div style={{ fontSize: 12, fontWeight: 400, color: VI.accentSoft }}>{date.slice(5)}</div>
        </div>
      ),
      dataIndex: date,
      key: date,
      width: 110,
      render: (_: unknown, staff: StaffMember) => {
        const items = cellMap.get(`${staff.id}|${date}`) ?? [];
        if (items.length === 0) return <span style={{ color: VI.offFg }}>休</span>;
        return (
          <Space direction="vertical" size={2}>
            {items.map((it) => (
              <Tag
                key={it.shift}
                color={it.shift === 'night' ? 'default' : 'blue'}
                style={
                  it.shift === 'night'
                    ? { background: VI.nightBg, color: VI.nightFg, border: 'none', marginInlineEnd: 0 }
                    : { background: VI.dayBg, color: VI.dayFg, border: 'none', marginInlineEnd: 0 }
                }
              >
                {it.shift === 'night' ? '夜班' : '白班'}
              </Tag>
            ))}
          </Space>
        );
      },
    })),
  ];

  return (
    <Layout style={{ background: VI.bg, minHeight: '100vh' }}>
      <Content style={{ padding: 24 }}>
        {/* 深海蓝渐变头部 */}
        <div
          style={{
            background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
            borderRadius: 12,
            padding: '20px 24px',
            marginBottom: 16,
            color: '#fff',
          }}
        >
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            医院智能排班 · 周视图日历
          </Title>
          <Paragraph style={{ color: VI.accentSoft, margin: '4px 0 0' }}>
            AI 能力深化：每人每周 ≤5 工作日 · 夜班后必休 1 天 · 主任白班覆盖 · 夜班 max-min ≤1 天
          </Paragraph>
        </div>

        {/* 控制条 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select value={dept} onChange={setDept} style={{ width: 160 }} options={DEPT_OPTIONS.map((d) => ({ label: d, value: d }))} />
            <DatePicker picker="week" value={week} onChange={(d) => d && setWeek(d)} allowClear={false} />
            <Button type="primary" loading={loading} onClick={handleOptimize}>
              运行 AI 排班
            </Button>
          </Space>
        </Card>

        {/* 指标卡 */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <Statistic title="总班次" value={grid?.metrics.totalShifts ?? 0} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic
                title="夜班均衡差（max-min 天）"
                value={grid?.metrics.nightMaxMinGap ?? 0}
                valueStyle={{ color: (grid?.metrics.nightMaxMinGap ?? 0) <= 1 ? '#3f8600' : '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="缺岗格数" value={grid?.metrics.uncovered.length ?? 0} valueStyle={{ color: (grid?.metrics.uncovered.length ?? 0) === 0 ? '#3f8600' : '#cf1322' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <Statistic title="冲突条数" value={grid?.conflicts?.length ?? 0} valueStyle={{ color: (grid?.conflicts?.length ?? 0) === 0 ? '#3f8600' : '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        {/* 排班表 */}
        <Card size="small" title={`${dept} · 周排班（${weekDates[0]} ~ ${weekDates[6]}）`}>
          <Table
            rowKey="id"
            size="small"
            columns={columns}
            dataSource={DEMO_STAFF}
            pagination={false}
            scroll={{ x: 1100 }}
            locale={{ emptyText: '点击「运行 AI 排班」生成本周建议' }}
          />
        </Card>

        {/* 冲突列表 */}
        {grid && grid.conflicts.length > 0 && (
          <Card size="small" title="排班冲突（AI 自动复核）" style={{ marginTop: 16 }}>
            {grid.conflicts.map((c, i) => (
              <Tag key={i} color={c.type === 'understaffed' || c.type === 'over_workdays' ? 'red' : 'orange'} style={{ marginBottom: 4 }}>
                [{c.type}] {c.date} {c.message}
              </Tag>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
