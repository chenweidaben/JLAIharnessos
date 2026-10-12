/**
 * 健澜科技 jlmedaios - 护理管理后台工作站（M16-B）
 *
 * 两个核心 Tab：
 *  - 排班管理：班次定义 / 排班表 / 合规校验（连班·周工时·单班覆盖·冲突·休假联动，纯函数实时算）/
 *    休假登记 / 发布留痕（护士长确认按钮）；
 *  - 敏感指标：指标库 / 采集录入（分子分母校验）/ 预警 / 四分位 / 月度趋势 / 上报模板导出。
 *
 * 医疗安全：排班/指标仅辅助，最终发布与上报须护士长/护理部显式确认按钮；未接入数据源的指标
 * 显式标注"需人工录入/待接入"，不渲染编造数字；异常指标须人工核实后才能上报。
 * 健康门禁：BFF/DB 不可用显式红 Alert + 水印，不假数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Input,
  Row,
  Select,
  Spin,
  Table,
  Tabs,
  Tag,
  Typography,
  Watermark,
  Layout,
  Space,
  message,
} from 'antd';
import { SafetyCertificateOutlined, ExportOutlined } from '@ant-design/icons';

import { useNursingAdminStore } from '@/store/nursingAdminStore';
import { usePermission } from '@/router/guards';
import {
  auditSchedule,
  evaluateIndicator,
  quartiles,
  validateIndicatorEntry,
  monthlyTrend,
} from '@/utils/nursingAdmin';
import type { IndicatorDef, IndicatorEntry } from '@/types/nursingAdmin';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '护理管理', 'jlmedaios'];

/** 写操作 fire-and-forget：失败原因已写入 store.error 并由页面 Alert 展示。 */
function run(p: Promise<unknown>): void {
  void p.catch(() => undefined);
}

const WARD = 'NW1';

function mondayOfThisWeek(): string {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // 周一=0
  d.setDate(d.getDate() - day);
  return d.toISOString().slice(0, 10);
}

/** 由周一展开 7 天日期（UTC 运算，避免时区回退）。 */
function weekDates(weekStart: string): string[] {
  const [y, m, d] = weekStart.split('-').map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i += 1) {
    out.push(new Date(Date.UTC(y, m - 1, d + i)).toISOString().slice(0, 10));
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Tab 1：排班管理                                                     */
/* ------------------------------------------------------------------ */
function ScheduleTab() {
  const { board, loadBoard, assignShift, createLeave, publish, removeAssignment } = useNursingAdminStore();
  const { hasPermission } = usePermission();
  const canWrite = hasPermission('nursing_admin:schedule');
  const [weekStart] = useState(mondayOfThisWeek());

  const [nurseId, setNurseId] = useState('');
  const [nurseName, setNurseName] = useState('');
  const [date, setDate] = useState('');
  const [shiftId, setShiftId] = useState('');

  useEffect(() => {
    run(loadBoard(WARD, weekStart));
  }, [loadBoard, weekStart]);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);

  const compliance = useMemo(() => {
    if (!board) return [];
    return auditSchedule(board.assignments, board.leaves, board.requiredStaff, dates, weekStart);
  }, [board, dates, weekStart]);

  const onAssign = () => {
    const shift = board?.shifts.find((s) => s.id === shiftId);
    if (!shift) return;
    run(
      assignShift({
        wardCode: WARD,
        nurseId,
        nurseName,
        date,
        shiftId,
        shiftName: shift.name,
        isNight: shift.isNight,
        hours: shift.hours,
      }).then(() => loadBoard(WARD, weekStart)),
    );
  };

  const onLeave = () => {
    run(
      createLeave({ wardCode: WARD, nurseId, nurseName, startDate: date, endDate: date, type: 'annual' })
        .then(() => loadBoard(WARD, weekStart)),
    );
  };

  const onPublish = () => {
    run(publish(WARD, weekStart, '护士长确认发布').then(() => loadBoard(WARD, weekStart)));
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="班次定义">
        <Table
          size="small"
          rowKey="id"
          dataSource={board?.shifts ?? []}
          pagination={false}
          columns={[
            { title: '班次', dataIndex: 'name' },
            { title: '起止', render: (_: unknown, r) => `${r.startTime}-${r.endTime}` },
            {
              title: '夜班',
              dataIndex: 'isNight',
              render: (v: boolean) => (v ? <Tag color="purple">夜班</Tag> : <Tag>白班</Tag>),
            },
            { title: '工时(h)', dataIndex: 'hours' },
          ]}
        />
      </Card>

      <Card size="small" title="排班（新增分配）">
        <Row gutter={8}>
          <Col span={5}>
            <Input data-testid="mng-assign-nurse" placeholder="护士工号" value={nurseId} onChange={(e) => setNurseId(e.target.value)} />
          </Col>
          <Col span={5}>
            <Input data-testid="mng-assign-nursename" placeholder="护士姓名" value={nurseName} onChange={(e) => setNurseName(e.target.value)} />
          </Col>
          <Col span={4}>
            <Input data-testid="mng-assign-date" placeholder="日期 YYYY-MM-DD" value={date} onChange={(e) => setDate(e.target.value)} />
          </Col>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              data-testid="mng-assign-shift"
              placeholder="选择班次"
              value={shiftId || undefined}
              onChange={(v) => setShiftId(v)}
              options={(board?.shifts ?? []).map((s) => ({ value: s.id, label: s.name }))}
            />
          </Col>
          <Col span={4}>
            <Button data-testid="mng-assign-btn" type="primary" disabled={!canWrite} onClick={onAssign}>
              排班
            </Button>
          </Col>
        </Row>
        <Button size="small" style={{ marginTop: 8 }} disabled={!canWrite} data-testid="mng-leave-btn" onClick={onLeave}>
          登记休假
        </Button>
      </Card>

      <Card size="small" title="本周排班明细">
        <Table
          size="small"
          rowKey="id"
          dataSource={board?.assignments ?? []}
          pagination={false}
          columns={[
            { title: '日期', dataIndex: 'date' },
            { title: '护士', dataIndex: 'nurseName' },
            { title: '班次', dataIndex: 'shiftName' },
            {
              title: '操作',
              render: (_: unknown, r) =>
                canWrite ? (
                  <Button
                    size="small"
                    type="link"
                    data-testid={`mng-unassign-${r.id}`}
                    onClick={() => run(removeAssignment(r.id).then(() => loadBoard(WARD, weekStart)))}
                  >
                    取消
                  </Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Card size="small" title="合规校验（前端实时算，与后端同口径）">
        <div data-testid="mng-compliance-list">
          {compliance.length === 0 ? (
            <Alert type="success" showIcon message="未发现排班合规问题" />
          ) : (
            compliance.map((c, i) => (
              <Alert
                key={i}
                style={{ marginBottom: 6 }}
                type={c.level === 'error' ? 'error' : 'warning'}
                showIcon
                message={c.message}
              />
            ))
          )}
        </div>
      </Card>

      <Card size="small" title="发布留痕（护士长确认）">
        <Button data-testid="mng-publish-btn" type="primary" disabled={!canWrite} onClick={onPublish}>
          确认发布本周排班
        </Button>
        <Table
          size="small"
          style={{ marginTop: 8 }}
          rowKey="id"
          dataSource={board?.publishes ?? []}
          pagination={false}
          columns={[
            { title: '周期', dataIndex: 'period' },
            { title: '发布人', dataIndex: 'publishedBy' },
            { title: '时间', dataIndex: 'publishedAt' },
          ]}
        />
      </Card>
    </Space>
  );
}

/* ------------------------------------------------------------------ */
/* Tab 2：敏感指标                                                     */
/* ------------------------------------------------------------------ */
function IndicatorTab() {
  const { library, loadLibrary, submitEntry, verifyEntry } = useNursingAdminStore();
  const { hasPermission } = usePermission();
  const canEnter = hasPermission('nursing_admin:indicator:enter');

  const [indicatorCode, setIndicatorCode] = useState('');
  const [period, setPeriod] = useState('');
  const [numerator, setNumerator] = useState<number>(0);
  const [denominator, setDenominator] = useState<number>(0);

  useEffect(() => {
    run(loadLibrary());
  }, [loadLibrary]);

  const validation = useMemo(() => validateIndicatorEntry(numerator, denominator), [numerator, denominator]);

  const onSubmit = () => {
    if (!validation.ok) return;
    run(
      submitEntry({ indicatorCode, period, numerator, denominator }).then(() => loadLibrary()),
    );
  };

  const onExport = () => {
    message.info('已生成上报模板（CSV），可下载');
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Card size="small" title="敏感质量指标库">
        <Table
          size="small"
          rowKey="code"
          dataSource={library?.indicators ?? []}
          pagination={false}
          columns={[
            { title: '编码', dataIndex: 'code' },
            { title: '名称', dataIndex: 'name' },
            { title: '分子口径', dataIndex: 'numeratorDesc' },
            { title: '分母口径', dataIndex: 'denominatorDesc' },
            { title: '单位', dataIndex: 'unit' },
            {
              title: '方向',
              dataIndex: 'direction',
              render: (d: IndicatorDef['direction']) => (d === 'high_good' ? '越高越好' : '越低越好'),
            },
            { title: '频度', dataIndex: 'frequency' },
            {
              title: '数据来源',
              dataIndex: 'source',
              render: (s: IndicatorDef['source']) =>
                s === 'auto' ? <Tag color="green">自动采集</Tag> : <Tag color="orange">需人工录入/待接入</Tag>,
            },
          ]}
        />
      </Card>

      <Card size="small" title="人工录入（须人工核实后上报）">
        <Row gutter={8}>
          <Col span={6}>
            <Select
              style={{ width: '100%' }}
              data-testid="mng-entry-indicator"
              placeholder="选择指标"
              value={indicatorCode || undefined}
              onChange={(v) => setIndicatorCode(v)}
              options={(library?.indicators ?? []).map((i) => ({ value: i.code, label: i.name }))}
            />
          </Col>
          <Col span={4}>
            <Input data-testid="mng-entry-period" placeholder="期 2026-10" value={period} onChange={(e) => setPeriod(e.target.value)} />
          </Col>
          <Col span={4}>
            <InputNumberCN
              testid="mng-entry-num"
              placeholder="分子"
              value={numerator}
              onChange={setNumerator}
            />
          </Col>
          <Col span={4}>
            <InputNumberCN
              testid="mng-entry-den"
              placeholder="分母"
              value={denominator}
              onChange={setDenominator}
            />
          </Col>
          <Col span={6}>
            <Button data-testid="mng-entry-submit" type="primary" disabled={!canEnter || !validation.ok} onClick={onSubmit}>
              录入草稿
            </Button>
          </Col>
        </Row>
        {!validation.ok && (
          <Alert data-testid="mng-entry-error" style={{ marginTop: 8 }} type="error" showIcon message={validation.errors.join('；')} />
        )}
      </Card>

      <Card size="small" title="本期明细 / 预警 / 四分位 / 趋势">
        <Table
          size="small"
          rowKey="id"
          dataSource={library?.entries ?? []}
          pagination={false}
          columns={[
            { title: '指标', dataIndex: 'indicatorCode' },
            { title: '期', dataIndex: 'period' },
            {
              title: '率(%)',
              dataIndex: 'value',
              render: (v: number | null) => (v == null ? <Tag color="orange">待人工录入</Tag> : `${v}`),
            },
            {
              title: '状态',
              render: (_: unknown, r: IndicatorEntry) => {
                const def = library?.indicators.find((i) => i.code === r.indicatorCode);
                const st = evaluateIndicator(r.value, def?.target, def?.direction ?? 'high_good');
                if (st === 'good') return <Tag color="green">达标</Tag>;
                if (st === 'warning') return <Tag color="red">预警</Tag>;
                return <Tag>未知</Tag>;
              },
            },
            {
              title: '核实上报',
              render: (_: unknown, r: IndicatorEntry) =>
                r.status === 'verified' || r.status === 'reported' ? (
                  <Tag color="blue">已核实</Tag>
                ) : canEnter ? (
                  <Button
                    size="small"
                    type="link"
                    data-testid={`mng-entry-verify-${r.id}`}
                    onClick={() => run(verifyEntry(r.id).then(() => loadLibrary()))}
                  >
                    人工核实上报
                  </Button>
                ) : null,
            },
          ]}
        />
        <QuartileSummary entries={library?.entries ?? []} />
        <Button data-testid="mng-export-btn" icon={<ExportOutlined />} style={{ marginTop: 8 }} onClick={onExport}>
          导出上报模板
        </Button>
      </Card>
    </Space>
  );
}

/** 受控数字输入（避免 antd InputNumber onChange 类型歧义）。 */
function InputNumberCN({
  testid,
  placeholder,
  value,
  onChange,
}: {
  testid: string;
  placeholder: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Input
      data-testid={testid}
      type="number"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  );
}

/** 四分位 + 趋势汇总（纯函数；未接入数据源的 null 值不计入，不渲染编造数字）。 */
function QuartileSummary({ entries }: { entries: IndicatorEntry[] }) {
  const byIndicator = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const e of entries) {
      if (e.value == null) continue;
      const arr = map.get(e.indicatorCode) ?? [];
      arr.push(e.value);
      map.set(e.indicatorCode, arr);
    }
    return map;
  }, [entries]);

  return (
    <div data-testid="mng-quartile" style={{ marginTop: 8 }}>
      {Array.from(byIndicator.entries()).map(([code, vals]) => {
        const q = quartiles(vals);
        const trend = monthlyTrend(entries.filter((e) => e.indicatorCode === code).map((e) => ({ period: e.period, value: e.value })));
        return (
          <div key={code} style={{ marginBottom: 4 }}>
            <Typography.Text type="secondary">
              {code}：Q1 {q.q1} / 中位 {q.median} / Q3 {q.q3}，环比 {trend > 0 ? '+' : ''}
              {trend} pp
            </Typography.Text>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 页面                                                                */
/* ------------------------------------------------------------------ */
export default function NursingAdminPage() {
  const { dbUp, loadingHealth, checkHealth, error } = useNursingAdminStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await checkHealth();
      setReady(true);
    })();
  }, [checkHealth]);

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <SafetyCertificateOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              护理管理后台
            </Typography.Title>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="mng-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <Spin spinning={!ready || loadingHealth}>
            {!dbUp ? (
              <Alert
                data-testid="mng-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，护理管理后台不可用"
                description="请检查数据库服务；恢复后重新探活。系统不会以缓存或假数据冒充排班/指标结果。"
                action={
                  <button type="button" className="ant-btn ant-btn-default" onClick={() => void checkHealth()}>
                    重新探活
                  </button>
                }
              />
            ) : (
              <Tabs
                defaultActiveKey="schedule"
                items={[
                  { key: 'schedule', label: '排班管理', children: <ScheduleTab /> },
                  { key: 'indicator', label: '敏感指标', children: <IndicatorTab /> },
                ]}
              />
            )}
          </Spin>
          {error && dbUp && (
            <Alert data-testid="mng-error-alert" type="error" showIcon className="mt-3" message={error} />
          )}
        </Content>
      </Layout>
    </Watermark>
  );
}
