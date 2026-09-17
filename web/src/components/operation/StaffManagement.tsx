/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 人员管理：人员列表 / 排班 / 绩效 / 资质与结构统计
 */
import { useEffect, useMemo, useState } from 'react';
import { Avatar, Badge, Col, Drawer, Progress, Row, Statistic, Table, Tabs, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CalendarOutlined, IdcardOutlined, TrophyOutlined, UserOutlined } from '@ant-design/icons';

import { PageContainer } from '@/components/common';
import { PieChart, BarChart } from '@/components/charts';
import { useOperationStore } from '@/store/operationStore';
import type { StaffCategory, StaffInfo, StaffStatus, ShiftType } from '@/types/operation';
import { clickableProps } from '@/utils/a11y';

const statusColor: Record<StaffStatus, string> = {
  active: 'success',
  leave: 'warning',
  out: 'processing',
  resigned: 'default',
};
const statusLabel: Record<StaffStatus, string> = {
  active: '在岗',
  leave: '休假',
  out: '外出',
  resigned: '离职',
};

const shiftLabel: Record<ShiftType, string> = {
  day: '白班',
  night: '夜班',
  mid: '中班',
  off: '休息',
  leave: '休假',
};
const shiftColor: Record<ShiftType, string> = {
  day: '#0A4D8C',
  night: '#722ED1',
  mid: '#13C2C2',
  off: '#E8ECF1',
  leave: '#FAAD14',
};

const catLabel: Record<StaffCategory, string> = {
  doctor: '医生',
  nurse: '护士',
  technician: '技师',
  admin: '行政',
};

export default function StaffManagement() {
  const staffList = useOperationStore((s) => s.staffList);
  const schedule = useOperationStore((s) => s.schedule);
  const performance = useOperationStore((s) => s.performance);
  const stats = useOperationStore((s) => s.staffStats);
  const fetchStaff = useOperationStore((s) => s.fetchStaffList);

  const [cat, setCat] = useState<StaffCategory>('doctor');
  const [detail, setDetail] = useState<StaffInfo | null>(null);

  useEffect(() => {
    void fetchStaff();
  }, [fetchStaff]);

  const filtered = useMemo(() => staffList.filter((s) => s.category === cat), [staffList, cat]);

  const columns: ColumnsType<StaffInfo> = [
    {
      title: '姓名',
      dataIndex: 'name',
      render: (name: string, row) => (
        <div className="flex items-center gap-2">
          <Avatar size="small" style={{ background: '#0A4D8C' }}>
            {name[0]}
          </Avatar>
          <span>{name}</span>
          {row.position && <Tag color="blue">{row.position}</Tag>}
        </div>
      ),
    },
    {
      title: '性别',
      dataIndex: 'gender',
      width: 60,
      render: (g: string) => (g === 'male' ? '男' : '女'),
    },
    { title: '年龄', dataIndex: 'age', width: 60 },
    { title: '职称', dataIndex: 'title', width: 110 },
    { title: '专业', dataIndex: 'specialty', width: 130 },
    { title: '学历', dataIndex: 'education', width: 70 },
    { title: '入职时间', dataIndex: 'hireDate', width: 110 },
    {
      title: '手术权限',
      dataIndex: 'surgeryLevel',
      width: 90,
      render: (v: string) =>
        v === '无' ? <span className="text-ink-secondary">—</span> : <Tag>{v}</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      render: (v: StaffStatus) => <Badge status={statusColor[v] as never} text={statusLabel[v]} />,
    },
    {
      title: '操作',
      width: 120,
      render: (_, row) => (
        <span
          {...clickableProps(() => setDetail(row))}
          style={{ color: '#1677ff', cursor: 'pointer' }}
        >
          详情
        </span>
      ),
    },
  ];

  // 排班矩阵：护士 × 7 天
  const scheduleNurses = useMemo(
    () => schedule.filter((s) => s.category === 'nurse').slice(0, 12),
    [schedule],
  );
  const scheduleDays = useMemo(() => Array.from(new Set(schedule.map((s) => s.date))), [schedule]);

  const perfColumns: ColumnsType<(typeof performance)[number]> = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      render: (v: number) => <Tag color={v <= 3 ? 'gold' : 'default'}>{v}</Tag>,
    },
    { title: '姓名', dataIndex: 'staffName' },
    {
      title: '门诊量',
      dataIndex: 'outpatientCount',
      sorter: (a, b) => a.outpatientCount - b.outpatientCount,
    },
    { title: '出院人数', dataIndex: 'dischargeCount' },
    { title: '手术量', dataIndex: 'surgeryCount' },
    { title: '病历合格率%', dataIndex: 'recordQualifiedRate' },
    { title: '次均住院日', dataIndex: 'avgLOS' },
    {
      title: '绩效得分',
      dataIndex: 'score',
      sorter: (a, b) => a.score - b.score,
      render: (v: number) => (
        <div className="flex items-center gap-2">
          <Progress percent={v} size="small" style={{ width: 80 }} strokeColor="#0A4D8C" />
          <b>{v}</b>
        </div>
      ),
    },
  ];

  return (
    <PageContainer title="人员管理" description="医护技人员信息 / 排班 / 绩效 / 资质与结构分析">
      <Tabs
        defaultActiveKey="list"
        items={[
          {
            key: 'list',
            label: '人员列表',
            children: (
              <div className="jl-card p-4">
                <Tabs
                  size="small"
                  activeKey={cat}
                  onChange={(k) => setCat(k as StaffCategory)}
                  items={(Object.keys(catLabel) as StaffCategory[]).map((c) => ({
                    key: c,
                    label: `${catLabel[c]}（${staffList.filter((s) => s.category === c).length}）`,
                  }))}
                />
                <Table
                  rowKey="staffId"
                  columns={columns}
                  dataSource={filtered}
                  size="small"
                  pagination={false}
                  scroll={{ x: 900 }}
                />
              </div>
            ),
          },
          {
            key: 'schedule',
            label: '排班管理',
            children: (
              <div className="jl-card p-4">
                <h3 className="m-0 mb-3 text-base font-medium">
                  <CalendarOutlined className="mr-1 text-jl-primary" />
                  护士本周排班
                </h3>
                <Table
                  rowKey="scheduleId"
                  size="small"
                  pagination={false}
                  dataSource={scheduleNurses}
                  columns={[
                    { title: '姓名', dataIndex: 'staffName', fixed: 'left', width: 90 },
                    ...scheduleDays.map((d) => ({
                      title: d.slice(5),
                      dataIndex: d,
                      render: (_: unknown, row: (typeof scheduleNurses)[number]) => {
                        const cell = schedule.find(
                          (s) => s.staffId === row.staffId && s.date === d,
                        );
                        return cell ? (
                          <span
                            className="inline-block rounded px-2 py-0.5 text-xs text-white"
                            style={{ background: shiftColor[cell.shift] }}
                          >
                            {shiftLabel[cell.shift]}
                          </span>
                        ) : (
                          <span className="text-ink-secondary">—</span>
                        );
                      },
                    })),
                  ]}
                  scroll={{ x: 800 }}
                />
                <div className="mt-3 flex gap-3 text-xs text-ink-secondary">
                  {(Object.keys(shiftLabel) as ShiftType[]).map((k) => (
                    <span key={k} className="flex items-center gap-1">
                      <span
                        className="inline-block h-2.5 w-2.5 rounded-sm"
                        style={{ background: shiftColor[k] }}
                      />
                      {shiftLabel[k]}
                    </span>
                  ))}
                </div>
              </div>
            ),
          },
          {
            key: 'perf',
            label: '绩效管理',
            children: (
              <div className="jl-card p-4">
                <Row gutter={[16, 16]} className="mb-4">
                  <Col span={6}>
                    <Statistic title="人均业务收入" value={128} suffix="万元" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="人均结余" value={46} suffix="万元" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="病历合格率" value={97.8} suffix="%" />
                  </Col>
                  <Col span={6}>
                    <Statistic title="平均绩效得分" value={93.6} />
                  </Col>
                </Row>
                <Table
                  rowKey="staffId"
                  columns={perfColumns}
                  dataSource={performance}
                  size="small"
                  pagination={false}
                />
              </div>
            ),
          },
          {
            key: 'stats',
            label: '资质与结构',
            children: (
              <Row gutter={[16, 16]}>
                <Col xs={24} md={12} lg={6}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">年龄结构</h3>
                    <PieChart
                      data={stats.ageDist.map((d) => ({ name: d.range, value: d.count }))}
                      height={220}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12} lg={6}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">学历分布</h3>
                    <PieChart
                      data={stats.educationDist.map((d) => ({ name: d.name, value: d.count }))}
                      height={220}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12} lg={6}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">性别分布</h3>
                    <PieChart
                      data={stats.genderDist.map((d) => ({ name: d.name, value: d.count }))}
                      height={220}
                    />
                  </div>
                </Col>
                <Col xs={24} md={12} lg={6}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">关键比例</h3>
                    <div className="mb-2 text-sm">
                      医护比：<b className="text-jl-primary">{stats.doctorNurseRatio}</b>
                    </div>
                    <div className="mb-2 text-sm">
                      床护比：<b className="text-jl-primary">{stats.bedNurseRatio}</b>
                    </div>
                    <div className="mb-2 text-sm">
                      <IdcardOutlined /> 证书 30 天内到期：<Tag color="orange">2 人</Tag>
                    </div>
                    <div className="text-sm">
                      <TrophyOutlined /> 继教合格：<b className="text-medical-normal">100%</b>
                    </div>
                  </div>
                </Col>
                <Col span={24}>
                  <div className="jl-card p-4">
                    <h3 className="m-0 mb-2 text-sm font-medium">人员流动（入职 / 离职）</h3>
                    <BarChart
                      xData={stats.monthlyJoinLeave.map((m) => m.month)}
                      series={[
                        { name: '入职', data: stats.monthlyJoinLeave.map((m) => m.join) },
                        { name: '离职', data: stats.monthlyJoinLeave.map((m) => m.leave) },
                      ]}
                      height={240}
                    />
                  </div>
                </Col>
              </Row>
            ),
          },
        ]}
      />

      {/* 人员详情抽屉 */}
      <Drawer
        open={!!detail}
        onClose={() => setDetail(null)}
        width={520}
        title={detail ? `人员详情 · ${detail.name}` : ''}
      >
        {detail && (
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Avatar size={48} icon={<UserOutlined />} style={{ background: '#0A4D8C' }} />
              <div>
                <div className="text-lg font-semibold">
                  {detail.name}{' '}
                  <Tag color={statusColor[detail.status]}>{statusLabel[detail.status]}</Tag>
                </div>
                <div className="text-sm text-ink-secondary">
                  {detail.title} · {detail.specialty}
                </div>
              </div>
            </div>
            <Row gutter={[8, 8]}>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">性别：</span>
                {detail.gender === 'male' ? '男' : '女'}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">年龄：</span>
                {detail.age}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">学历：</span>
                {detail.education}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">入职：</span>
                {detail.hireDate}
              </Col>
              <Col span={24} className="text-sm">
                <span className="text-ink-secondary">执业证号：</span>
                {detail.licenseNo}
              </Col>
              <Col span={24} className="text-sm">
                <span className="text-ink-secondary">执业范围：</span>
                {detail.practiceScope}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">处方权：</span>
                {detail.prescriptionRight ? '有' : '无'}
              </Col>
              <Col span={12} className="text-sm">
                <span className="text-ink-secondary">抗菌药物：</span>
                {detail.abxLevel}
              </Col>
            </Row>
            <h4 className="mt-4 mb-2 text-sm">教育经历</h4>
            {detail.educationHistory.map((e, i) => (
              <div key={i} className="text-sm text-ink-secondary">
                · {e.school} · {e.degree}（{e.period}）
              </div>
            ))}
            {detail.awards.length > 0 && (
              <>
                <h4 className="mt-4 mb-2 text-sm">获奖情况</h4>
                {detail.awards.map((a) => (
                  <div key={a} className="text-sm text-ink-secondary">
                    · {a}
                  </div>
                ))}
              </>
            )}
            <h4 className="mt-4 mb-2 text-sm">资质证书</h4>
            {detail.certExpire.length === 0 ? (
              <div className="text-sm text-ink-secondary">无</div>
            ) : (
              detail.certExpire.map((c) => (
                <div key={c.cert} className="mb-1 text-sm">
                  <Tag color={c.expireDate.includes('2026') ? 'orange' : 'green'}>{c.cert}</Tag>
                  <span className="text-ink-secondary">{c.expireDate} 到期</span>
                </div>
              ))
            )}
          </div>
        )}
      </Drawer>
    </PageContainer>
  );
}
