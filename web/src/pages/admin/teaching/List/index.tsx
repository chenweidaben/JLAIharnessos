/**
 * 健澜科技 jlmedaios - M140-C 教学管理页（医院管理深化，仅 admin）
 *
 * 展示 BFF /api/v1/admin/teaching 的教学台账与报表：
 *   规培生教学 / 实习生带教 / 继续教育讲座 / 三基三严培训四类教学统一登记，
 *   教学计划与规培考核直接挂钩——到勤才计学分，学分回写规培考核档案。
 *
 * 核心红线：教学计划必须落科室、落带教老师、落学分；规培类计划默认回写考核。
 * 三态：loading（加载中）/ error（失败可重试）/ empty（暂无教学计划）。
 * 视觉：深海蓝 VI（#0a2540 → #123a5e 渐变头部）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

type TeachingCategory = 'residency' | 'internship' | 'lecture' | 'three_basics';

interface Plan {
  id: string;
  courseName: string;
  teacherId: string;
  studentGroup: string;
  category: TeachingCategory;
  categoryLabel: string;
  schedule: string;
  credits: number;
  dept: string;
  assessLinked: boolean;
  createdAt: string;
}

interface CategoryStat {
  category: TeachingCategory;
  categoryLabel: string;
  planCount: number;
  totalCredits: number;
  attendanceCount: number;
  attendanceRate: number;
}

interface TeacherWorkload {
  teacherId: string;
  planCount: number;
  totalCredits: number;
  attendanceCount: number;
}

interface TeachingReport {
  period: string;
  totalPlans: number;
  totalCredits: number;
  totalAttendance: number;
  attendanceRate: number;
  assessLinkedPlans: number;
  byCategory: CategoryStat[];
  teacherWorkload: TeacherWorkload[];
}

interface TeachingView {
  plans: Plan[];
  report: TeachingReport;
}

/** 深海蓝 VI 色板 */
const VI = {
  deep: '#0a2540',
  mid: '#123a5e',
  accent: '#1e6fbf',
  bg: '#f5f7fa',
};

const CATEGORY_COLOR: Record<TeachingCategory, string> = {
  residency: 'geekblue',
  internship: 'cyan',
  lecture: 'blue',
  three_basics: 'purple',
};

const GROUP_OPTIONS = [
  { value: '规培生', label: '规培生' },
  { value: '实习生', label: '实习生' },
  { value: '全院医护', label: '全院医护' },
  { value: '三基考核队', label: '三基考核队' },
];

export default function TeachingListPage() {
  const [data, setData] = useState<TeachingView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const resp = await fetch('/api/v1/admin/teaching');
      const json = await resp.json();
      if (json.code !== 0) {
        setError(json.message || '加载失败');
        setData(null);
        return;
      }
      setData(json.data as TeachingView);
    } catch (e) {
      setError(e instanceof Error ? e.message : '网络异常');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    form.resetFields();
    setModalOpen(true);
  };

  const submit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      const resp = await fetch('/api/v1/admin/teaching', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const json = await resp.json();
      if (json.code !== 0) {
        Modal.error({ title: '登记失败', content: json.message || '请稍后重试' });
      } else {
        setModalOpen(false);
        void load();
      }
    } catch (e) {
      Modal.error({ title: '网络异常', content: e instanceof Error ? e.message : '请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const planColumns: ColumnsType<Plan> = [
    { title: '课程/讲座', dataIndex: 'courseName' },
    {
      title: '类别',
      dataIndex: 'category',
      width: 120,
      render: (c: TeachingCategory, row) => <Tag color={CATEGORY_COLOR[c]}>{row.categoryLabel}</Tag>,
    },
    { title: '带教老师', dataIndex: 'teacherId', width: 90 },
    { title: '授课对象', dataIndex: 'studentGroup', width: 120 },
    { title: '授课安排', dataIndex: 'schedule', width: 180, ellipsis: true },
    { title: '开课科室', dataIndex: 'dept', width: 110 },
    { title: '学分', dataIndex: 'credits', width: 70, render: (v: number) => <Text strong>{v}</Text> },
    {
      title: '规培考核',
      dataIndex: 'assessLinked',
      width: 100,
      render: (v: boolean) =>
        v ? <Tag color="geekblue">挂钩</Tag> : <Tag>不挂钩</Tag>,
    },
  ];

  const workloadColumns: ColumnsType<TeacherWorkload> = [
    { title: '带教老师', dataIndex: 'teacherId' },
    { title: '授课门数', dataIndex: 'planCount', width: 100 },
    { title: '授课学分', dataIndex: 'totalCredits', width: 100 },
    { title: '覆盖考勤人次', dataIndex: 'attendanceCount', width: 130 },
  ];

  const report = data?.report;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      {/* 深海蓝头部横幅 */}
      <div style={{ background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`, padding: '24px 32px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ color: '#fff', margin: 0 }}>
              教学管理 · 规培考核联动
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.75)', margin: '8px 0 0' }}>
              规培生教学 / 实习生带教 / 继续教育讲座 / 三基三严培训 · 到勤才计学分，学分回写规培考核
            </Paragraph>
          </Col>
          <Col>
            <Button type="primary" style={{ background: VI.accent, borderColor: VI.accent }} onClick={openCreate}>
              登记教学计划
            </Button>
          </Col>
        </Row>
      </div>

      <Content style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" tip="正在加载教学台账…" />
          </div>
        )}

        {!loading && error && (
          <Alert type="error" showIcon message={error} action={<Button size="small" onClick={load}>重试</Button>} />
        )}

        {!loading && !error && !data && <Alert type="info" showIcon message="暂无教学数据。" />}

        {!loading && !error && data && report && (
          <>
            {/* 核心指标卡 */}
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}>
                <Card size="small">
                  <Statistic title={`教学计划（${report.period}）`} value={report.totalPlans} suffix="门" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="学分合计" value={report.totalCredits} suffix="分" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic
                    title="综合到勤率"
                    value={Math.round(report.attendanceRate * 100)}
                    suffix="%"
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small">
                  <Statistic title="规培考核挂钩计划" value={report.assessLinkedPlans} suffix="门" />
                </Card>
              </Col>
            </Row>

            {/* 分类别汇总 */}
            <Card title="四类教学分类汇总" size="small" style={{ marginBottom: 16 }}>
              {report.byCategory.length === 0 ? (
                <Alert type="info" showIcon message="本账期暂无教学计划。" />
              ) : (
                <Row gutter={[16, 16]}>
                  {report.byCategory.map((c) => (
                    <Col span={6} key={c.category}>
                      <Card size="small" bordered>
                        <Space direction="vertical" size={2}>
                          <Tag color={CATEGORY_COLOR[c.category]}>{c.categoryLabel}</Tag>
                          <Text type="secondary">
                            {c.planCount} 门 · {c.totalCredits} 学分 · 到勤率 {Math.round(c.attendanceRate * 100)}%
                          </Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              )}
            </Card>

            {/* 带教老师工作量 */}
            {report.teacherWorkload.length > 0 && (
              <Card title="带教老师工作量统计" size="small" style={{ marginBottom: 16 }}>
                <Table rowKey="teacherId" columns={workloadColumns} dataSource={report.teacherWorkload} pagination={false} size="small" />
              </Card>
            )}

            {/* 教学计划台账 */}
            <Card title="教学计划台账" size="small">
              {data.plans.length === 0 ? (
                <Alert type="info" showIcon message="暂无教学计划，点击右上角「登记教学计划」创建。" />
              ) : (
                <Table rowKey="id" columns={planColumns} dataSource={data.plans} pagination={{ pageSize: 10 }} size="middle" />
              )}
            </Card>
          </>
        )}
      </Content>

      {/* 登记教学计划弹窗 */}
      <Modal
        title="登记教学计划"
        open={modalOpen}
        onOk={submit}
        confirmLoading={submitting}
        onCancel={() => setModalOpen(false)}
        okText="确认登记"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="courseName" label="课程/讲座/培训名称" rules={[{ required: true, message: '请输入课程名称' }]}>
            <Input placeholder="如 心电图判读规范 / 心肺复苏三基培训" />
          </Form.Item>
          <Form.Item name="teacherId" label="带教老师工号" rules={[{ required: true, message: '请输入带教老师工号' }]}>
            <Input placeholder="如 D1024" />
          </Form.Item>
          <Form.Item name="studentGroup" label="授课对象" rules={[{ required: true, message: '请选择授课对象' }]}>
            <Select placeholder="选择授课对象组别" options={GROUP_OPTIONS} />
          </Form.Item>
          <Form.Item name="dept" label="开课科室" rules={[{ required: true, message: '请输入开课科室' }]}>
            <Input placeholder="如 内科教研室" />
          </Form.Item>
          <Form.Item name="schedule" label="授课安排（时间/地点）">
            <Input placeholder="如 每周三 16:00 示教室" />
          </Form.Item>
          <Form.Item name="credits" label="学分" rules={[{ required: true, message: '请输入学分' }]}>
            <InputNumber min={0} step={0.5} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}
