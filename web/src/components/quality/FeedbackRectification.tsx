/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 质控反馈与整改：整改任务列表 + 整改提交 + 整改审核 + 逾期预警
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Descriptions,
  Drawer,
  Form,
  Input,
  Modal,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { RectificationTask, RectifyStatus } from '@/types/quality';
import { DEFECT_TYPE_LABEL } from '@/types/quality';
import { useQualityStore } from '@/store/qualityStore';

const STATUS_META: Record<RectifyStatus, { label: string; color: string }> = {
  pending: { label: '待整改', color: 'warning' },
  in_progress: { label: '整改中', color: 'processing' },
  rectified: { label: '已整改', color: 'blue' },
  reviewed: { label: '已审核', color: 'success' },
};

function isOverdue(deadline: string): boolean {
  return new Date(deadline).getTime() < Date.now();
}

export default function FeedbackRectification() {
  const { rectificationTasks, fetchRectificationTasks, submitRectify, reviewRectify, loading } =
    useQualityStore();
  const [tab, setTab] = useState<RectifyStatus | 'all'>('pending');
  const [rectifyDrawer, setRectifyDrawer] = useState<RectificationTask | null>(null);
  const [reviewModal, setReviewModal] = useState<RectificationTask | null>(null);
  const [rectifyForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    void fetchRectificationTasks();
  }, [fetchRectificationTasks]);

  const filtered = useMemo(
    () => rectificationTasks.filter((t) => (tab === 'all' ? true : t.status === tab)),
    [rectificationTasks, tab],
  );

  const overdueCount = rectificationTasks.filter(
    (t) => t.status === 'pending' && isOverdue(t.deadline),
  ).length;
  const rectifiedRate =
    rectificationTasks.length > 0
      ? Math.round(
          (rectificationTasks.filter((t) => t.status === 'reviewed').length /
            rectificationTasks.length) *
            100,
        )
      : 0;

  const handleSubmitRectify = async () => {
    const values = await rectifyForm.validateFields();
    if (!rectifyDrawer) return;
    await submitRectify(rectifyDrawer.taskId, values.content, values.note);
    setRectifyDrawer(null);
    rectifyForm.resetFields();
    message.success('整改内容已提交，等待质控医生审核');
  };

  const handleReview = async (result: 'approved' | 'rejected') => {
    const values = await reviewForm.validateFields();
    if (!reviewModal) return;
    await reviewRectify(reviewModal.taskId, result, values.note);
    setReviewModal(null);
    reviewForm.resetFields();
    message.success(result === 'approved' ? '整改审核通过' : '整改已驳回');
  };

  const columns: ColumnsType<RectificationTask> = [
    { title: '病历号', dataIndex: 'recordNo', width: 110 },
    { title: '患者', dataIndex: 'patientName', width: 90 },
    { title: '科室', dataIndex: 'dept', width: 90 },
    { title: '责任医生', dataIndex: 'doctor', width: 90 },
    {
      title: '缺陷描述',
      dataIndex: 'defectDesc',
      ellipsis: true,
      render: (v: string, r) => (
        <Space size={4}>
          <Tag color="blue">{DEFECT_TYPE_LABEL[r.defectType]}</Tag>
          <span>{v}</span>
        </Space>
      ),
    },
    { title: '扣分', dataIndex: 'deduction', width: 70, render: (v: number) => `-${v}` },
    {
      title: '整改期限',
      dataIndex: 'deadline',
      width: 110,
      render: (v: string, r) =>
        r.status === 'pending' && isOverdue(v) ? (
          <Tag color="error" icon={<ExclamationCircleOutlined />}>
            逾期 {v}
          </Tag>
        ) : (
          v
        ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (s: RectifyStatus) => (
        <Badge status={STATUS_META[s].color as never} text={STATUS_META[s].label} />
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 140,
      render: (_, r) => (
        <Space size={2}>
          {(r.status === 'pending' || r.status === 'in_progress') && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setRectifyDrawer(r)}
            >
              提交整改
            </Button>
          )}
          {r.status === 'rectified' && (
            <Button type="link" size="small" onClick={() => setReviewModal(r)}>
              审核
            </Button>
          )}
          {r.status === 'reviewed' && (
            <Button
              type="link"
              size="small"
              onClick={() => message.info(`整改质量评分：${r.rectifyScore} 分`)}
            >
              查看
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card className="shadow-card">
          <Statistic title="整改任务总数" value={rectificationTasks.length} suffix="项" />
        </Card>
        <Card className="shadow-card">
          <Statistic
            title="待整改"
            value={rectificationTasks.filter((t) => t.status === 'pending').length}
            valueStyle={{ color: '#FAAD14' }}
          />
        </Card>
        <Card className="shadow-card">
          <Statistic
            title="整改完成率"
            value={rectifiedRate}
            suffix="%"
            valueStyle={{ color: '#0A4D8C' }}
          />
        </Card>
        <Card className="shadow-card">
          <Statistic title="逾期未整改" value={overdueCount} valueStyle={{ color: '#F5222D' }} />
        </Card>
      </div>

      {overdueCount > 0 && (
        <Alert
          type="error"
          showIcon
          message={`逾期预警：当前有 ${overdueCount} 项整改任务已超过整改期限，请相关科室立即处理！`}
        />
      )}

      <Card className="shadow-card">
        <Tabs
          size="small"
          activeKey={tab}
          onChange={(k) => setTab(k as RectifyStatus | 'all')}
          items={[
            {
              key: 'pending',
              label: `待整改 (${rectificationTasks.filter((t) => t.status === 'pending').length})`,
            },
            {
              key: 'in_progress',
              label: `整改中 (${rectificationTasks.filter((t) => t.status === 'in_progress').length})`,
            },
            {
              key: 'rectified',
              label: `已整改 (${rectificationTasks.filter((t) => t.status === 'rectified').length})`,
            },
            {
              key: 'reviewed',
              label: `已审核 (${rectificationTasks.filter((t) => t.status === 'reviewed').length})`,
            },
            { key: 'all', label: '全部' },
          ]}
        />
        <Table<RectificationTask>
          rowKey="taskId"
          size="middle"
          loading={loading}
          columns={columns}
          dataSource={filtered}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
        />
      </Card>

      {/* 整改提交抽屉 */}
      <Drawer
        open={!!rectifyDrawer}
        onClose={() => setRectifyDrawer(null)}
        width={520}
        title="提交整改"
        extra={
          <Button type="primary" onClick={handleSubmitRectify}>
            提交整改
          </Button>
        }
      >
        {rectifyDrawer && (
          <>
            <Descriptions size="small" column={1} bordered className="mb-3">
              <Descriptions.Item label="病历号">{rectifyDrawer.recordNo}</Descriptions.Item>
              <Descriptions.Item label="患者">{rectifyDrawer.patientName}</Descriptions.Item>
              <Descriptions.Item label="责任医生">{rectifyDrawer.doctor}</Descriptions.Item>
              <Descriptions.Item label="缺陷描述">
                <Tag color="blue">{DEFECT_TYPE_LABEL[rectifyDrawer.defectType]}</Tag>
                {rectifyDrawer.defectDesc}（-{rectifyDrawer.deduction}分）
              </Descriptions.Item>
              <Descriptions.Item label="质控医生">{rectifyDrawer.qualityDoctor}</Descriptions.Item>
              <Descriptions.Item label="整改期限">
                {rectifyDrawer.deadline}
                {isOverdue(rectifyDrawer.deadline) && (
                  <Tag color="error" className="ml-2">
                    已逾期
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>
            <Alert
              className="mb-3"
              type="info"
              showIcon
              message="点击“查看病历”可定位到问题位置，修改后填写整改说明。"
            />
            <Button
              block
              className="mb-3"
              onClick={() => message.info('定位到病历对应章节（演示）')}
            >
              查看缺陷定位
            </Button>
            <Form form={rectifyForm} layout="vertical">
              <Form.Item name="content" label="整改内容（修改说明）" rules={[{ required: true }]}>
                <Input.TextArea rows={4} placeholder="描述您对病历做了哪些修改" />
              </Form.Item>
              <Form.Item name="note" label="整改说明">
                <Input.TextArea rows={2} />
              </Form.Item>
            </Form>
          </>
        )}
      </Drawer>

      {/* 整改审核弹窗 */}
      <Modal
        open={!!reviewModal}
        title="整改审核"
        onCancel={() => setReviewModal(null)}
        footer={
          <Space>
            <Button
              danger
              icon={<CloseCircleOutlined />}
              onClick={() => void handleReview('rejected')}
            >
              驳回
            </Button>
            <Button
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => void handleReview('approved')}
            >
              审核通过
            </Button>
          </Space>
        }
      >
        {reviewModal && (
          <>
            <Descriptions size="small" column={1} className="mb-3">
              <Descriptions.Item label="病历号">{reviewModal.recordNo}</Descriptions.Item>
              <Descriptions.Item label="缺陷">{reviewModal.defectDesc}</Descriptions.Item>
              <Descriptions.Item label="整改内容">{reviewModal.rectifyContent}</Descriptions.Item>
              <Descriptions.Item label="整改说明">{reviewModal.rectifyNote}</Descriptions.Item>
            </Descriptions>
            <Form form={reviewForm} layout="vertical">
              <Form.Item name="note" label="审核意见" rules={[{ required: true }]}>
                <Input.TextArea rows={3} placeholder="填写审核意见" />
              </Form.Item>
            </Form>
          </>
        )}
      </Modal>
    </div>
  );
}
