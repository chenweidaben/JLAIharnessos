/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控工作台：任务概览 + 任务列表（分类/筛选/搜索/批量操作）
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  DatePicker,
  Input,
  Progress,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  AuditOutlined,
  CheckCircleOutlined,
  DownloadOutlined,
  ReloadOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { QualityTask, QualityTaskStatus, RecordGrade } from '@/types/quality';
import { TASK_STATUS_LABEL } from '@/types/quality';
import { QUALITY_DEPTS, QUALITY_DOCTORS } from '@/mock/qualityMock';
import { useQualityStore } from '@/store/qualityStore';

const { RangePicker } = DatePicker;

const GRADE_COLOR: Record<RecordGrade, string> = {
  A: 'success',
  B: 'warning',
  C: 'error',
};

const GRADE_LABEL: Record<RecordGrade, string> = { A: '甲级', B: '乙级', C: '丙级' };

const STATUS_COLOR: Record<QualityTaskStatus, string> = {
  pending: 'default',
  checking: 'processing',
  checked: 'success',
  to_rectify: 'warning',
  rectified: 'cyan',
};

const TAB_KEYS: { key: QualityTaskStatus | 'all'; label: string }[] = [
  { key: 'pending', label: '待质控' },
  { key: 'checking', label: '质控中' },
  { key: 'checked', label: '已质控' },
  { key: 'to_rectify', label: '待整改' },
  { key: 'rectified', label: '已整改' },
];

interface StatCardProps {
  title: string;
  value: React.ReactNode;
  suffix?: string;
  icon: React.ReactNode;
  tone?: 'blue' | 'green' | 'orange' | 'red';
}

function StatCard({ title, value, suffix, icon, tone = 'blue' }: StatCardProps) {
  const tones: Record<string, string> = {
    blue: 'bg-jl-primary',
    green: 'bg-success',
    orange: 'bg-warning',
    red: 'bg-danger',
  };
  return (
    <Card className="shadow-card" styles={{ body: { padding: 16 } }}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-ink-secondary">{title}</div>
          <div className="mt-1 text-2xl font-semibold text-ink-primary">
            {value}
            {suffix && (
              <span className="ml-1 text-xs font-normal text-ink-secondary">{suffix}</span>
            )}
          </div>
        </div>
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg text-white ${tones[tone]}`}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

export default function QualityDashboard() {
  const navigate = useNavigate();
  const {
    qualityTasks,
    qualityStats,
    loading,
    fetchQualityTasks,
    fetchQualityStats,
    startQualityCheck,
  } = useQualityStore();

  const [tab, setTab] = useState<QualityTaskStatus | 'all'>('pending');
  const [keyword, setKeyword] = useState('');
  const [dept, setDept] = useState<string>();
  const [doctor, setDoctor] = useState<string>();
  const [recordType, setRecordType] = useState<string>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  useEffect(() => {
    void fetchQualityTasks();
    void fetchQualityStats();
  }, [fetchQualityTasks, fetchQualityStats]);

  const filtered = useMemo(() => {
    return qualityTasks.filter((t) => {
      if (tab !== 'all' && t.status !== tab) return false;
      if (keyword && !t.recordNo.includes(keyword) && !t.patientName.includes(keyword))
        return false;
      if (dept && t.dept !== dept) return false;
      if (doctor && t.doctor !== doctor) return false;
      if (recordType && t.recordType !== recordType) return false;
      return true;
    });
  }, [qualityTasks, tab, keyword, dept, doctor, recordType]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: qualityTasks.length };
    TAB_KEYS.forEach((k) => {
      c[k.key] = qualityTasks.filter((t) => t.status === k.key).length;
    });
    return c;
  }, [qualityTasks]);

  const columns: ColumnsType<QualityTask> = [
    { title: '病历号', dataIndex: 'recordNo', width: 110, fixed: 'left' },
    { title: '患者', dataIndex: 'patientName', width: 90 },
    { title: '科室', dataIndex: 'dept', width: 100 },
    { title: '主管医生', dataIndex: 'doctor', width: 90 },
    { title: '病历类型', dataIndex: 'recordType', width: 100 },
    { title: '入院日期', dataIndex: 'admitDate', width: 110 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: QualityTaskStatus) => <Tag color={STATUS_COLOR[s]}>{TASK_STATUS_LABEL[s]}</Tag>,
    },
    {
      title: '评分/等级',
      width: 110,
      render: (_, r) =>
        r.score != null && r.grade ? (
          <Space size={4}>
            <span className="font-medium">{r.score}</span>
            <Tag color={GRADE_COLOR[r.grade]}>{GRADE_LABEL[r.grade]}</Tag>
          </Space>
        ) : (
          <span className="text-ink-secondary">--</span>
        ),
    },
    {
      title: '质控医生',
      dataIndex: 'qualityDoctor',
      width: 100,
      render: (v?: string) => v ?? '--',
    },
    {
      title: '操作',
      key: 'action',
      fixed: 'right',
      width: 150,
      render: (_, r) => (
        <Space size={4}>
          {r.status === 'pending' || r.status === 'checking' ? (
            <Button
              type="link"
              size="small"
              onClick={() => {
                void startQualityCheck(r.recordNo);
                navigate(`/quality/record/${r.recordNo}`);
              }}
            >
              {r.status === 'pending' ? '开始质控' : '继续质控'}
            </Button>
          ) : (
            <Button
              type="link"
              size="small"
              onClick={() => navigate(`/quality/record/${r.recordNo}`)}
            >
              查看结果
            </Button>
          )}
          {r.status === 'to_rectify' && (
            <Button type="link" size="small" onClick={() => message.info('请前往“整改反馈”页处理')}>
              整改
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="今日待质控"
          value={qualityStats?.pendingToday ?? '--'}
          suffix="份"
          tone="blue"
          icon={<AuditOutlined />}
        />
        <StatCard
          title="本周待质控"
          value={qualityStats?.pendingWeek ?? '--'}
          suffix="份"
          tone="blue"
          icon={<AuditOutlined />}
        />
        <StatCard
          title="已质控（累计）"
          value={qualityStats?.checkedCount ?? '--'}
          suffix="份"
          tone="green"
          icon={<CheckCircleOutlined />}
        />
        <StatCard
          title="质控合格率"
          value={qualityStats?.passRate ?? '--'}
          suffix="%"
          tone="green"
          icon={<SafetyCertificateOutlined />}
        />
        <StatCard
          title="待整改 / 已整改"
          value={`${qualityStats?.pendingRectify ?? '--'} / ${qualityStats?.rectifiedCount ?? '--'}`}
          tone="orange"
          icon={<WarningOutlined />}
        />
        <StatCard
          title="平均缺陷数"
          value={qualityStats?.avgDefects ?? '--'}
          suffix="个/份"
          tone="red"
          icon={<WarningOutlined />}
        />
      </div>

      {/* 进度 + 批量操作 */}
      <Card className="shadow-card" size="small">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-ink-secondary">今日质控进度</span>
            <Progress
              percent={
                qualityStats
                  ? Math.round((qualityStats.todayChecked / qualityStats.todayTarget) * 100)
                  : 0
              }
              size="small"
              style={{ width: 220 }}
              strokeColor="#0A4D8C"
            />
            <span className="text-sm font-medium text-jl-primary">
              {qualityStats?.todayChecked ?? 0} / {qualityStats?.todayTarget ?? 0} 份
            </span>
          </div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                void fetchQualityTasks();
                void fetchQualityStats();
              }}
            >
              刷新
            </Button>
            <Button
              icon={<DownloadOutlined />}
              disabled={selectedRowKeys.length === 0}
              onClick={() => message.success(`已导出 ${selectedRowKeys.length} 份质控任务`)}
            >
              批量导出
            </Button>
            <Button
              type="primary"
              disabled={selectedRowKeys.length === 0}
              onClick={() => message.success(`已批量分配 ${selectedRowKeys.length} 份任务给质控组`)}
            >
              批量分配
            </Button>
          </Space>
        </div>
      </Card>

      {/* 任务列表 */}
      <Card
        className="shadow-card"
        styles={{ body: { padding: 16 } }}
        title={
          <Tabs
            size="small"
            activeKey={tab}
            onChange={(k) => {
              setTab(k as QualityTaskStatus);
              setSelectedRowKeys([]);
            }}
            items={[
              ...TAB_KEYS.map((k) => ({
                key: k.key,
                label: (
                  <Badge count={counts[k.key] ?? 0} size="small" offset={[6, -2]} color="#0A4D8C">
                    {k.label}
                  </Badge>
                ),
              })),
              { key: 'all', label: `全部 (${counts.all})` },
            ]}
          />
        }
        extra={
          <Space wrap>
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="病历号 / 患者姓名"
              style={{ width: 180 }}
              onChange={(e) => setKeyword(e.target.value)}
            />
            <Select
              allowClear
              placeholder="科室"
              style={{ width: 120 }}
              options={QUALITY_DEPTS.map((d) => ({ label: d, value: d }))}
              onChange={setDept}
            />
            <Select
              allowClear
              placeholder="主管医生"
              style={{ width: 120 }}
              options={QUALITY_DOCTORS.map((d) => ({ label: d, value: d }))}
              onChange={setDoctor}
            />
            <Select
              allowClear
              placeholder="病历类型"
              style={{ width: 120 }}
              options={['运行病历', '出院病历', '死亡病历', '手术病历', '门诊病历', '急诊病历'].map(
                (t) => ({
                  label: t,
                  value: t,
                }),
              )}
              onChange={setRecordType}
            />
            <RangePicker size="middle" />
          </Space>
        }
      >
        <Table<QualityTask>
          rowKey="taskId"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1100 }}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          pagination={{ pageSize: 12, showSizeChanger: false, showTotal: (t) => `共 ${t} 份` }}
        />
      </Card>
    </div>
  );
}
