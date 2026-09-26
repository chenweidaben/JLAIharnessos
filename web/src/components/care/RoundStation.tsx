/**
 * 健澜科技 jlmedaios - 医生查房工作台（M1-B2，真实 BFF）
 *
 * 覆盖：
 *  - 查房记录：新建查房（病情变化/查体/评估/诊断/计划调整），草稿本人签名；
 *  - 上级查房：本人签名后由第二医师审签或退回（记录退回原因）；
 *  - AI 仅辅助：AI 建议必须经医师确认，签名以医师本人为准。
 *
 * 所有写操作经健康门禁，真实落 PostgreSQL；无 mock。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
} from 'antd';
import {
  AuditOutlined,
  CheckCircleOutlined,
  PlusOutlined,
  RollbackOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

import { useCareStore } from '@/store/careStore';
import type { WardRoundDto, WardRoundType } from '@/types/care';
import { ROUND_STATUS_META, ROUND_TYPE_META } from './constants';

export default function RoundStation() {
  const { message } = AntdApp.useApp();
  const {
    selectedVisitId,
    rounds,
    loadingRounds,
    acting,
    fetchRounds,
    createRound,
    signRound,
    countersignRound,
    returnRound,
  } = useCareStore();

  const [open, setOpen] = useState(false);
  const [form] = Form.useForm();
  const [returnTarget, setReturnTarget] = useState<WardRoundDto | null>(null);
  const [returnReason, setReturnReason] = useState('');

  useEffect(() => {
    if (selectedVisitId) void fetchRounds(selectedVisitId);
  }, [selectedVisitId, fetchRounds]);

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({
      roundType: 'routine',
      isSuperior: false,
      aiAssisted: false,
    });
    setOpen(true);
  };

  const submitCreate = async () => {
    const v = await form.validateFields();
    await createRound({
      visitId: selectedVisitId!,
      roundType: v.roundType,
      isSuperior: v.isSuperior,
      symptomChange: v.symptomChange?.trim() || null,
      physicalExam: v.physicalExam ? { note: v.physicalExam } : {},
      assessment: v.assessment,
      diagnosis: v.diagnosis?.trim() || null,
      planAdjustment: v.planAdjustment?.trim() || null,
      aiAssisted: v.aiAssisted,
    });
    message.success('查房记录草稿已创建，请医师本人签名');
    setOpen(false);
  };

  const doReturn = async () => {
    if (!returnReason.trim()) {
      message.warning('请填写退回原因');
      return;
    }
    await returnRound(returnTarget!.id, returnReason.trim());
    message.success('已退回并记录原因');
    setReturnTarget(null);
    setReturnReason('');
  };

  const columns: ColumnsType<WardRoundDto> = [
    { title: '查房号', dataIndex: 'roundNo', width: 150 },
    {
      title: '类型',
      dataIndex: 'roundType',
      width: 110,
      render: (t: WardRoundType) => {
        const meta = ROUND_TYPE_META[t];
        return <Tag color={meta?.color}>{meta?.label ?? t}</Tag>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (s) => {
        const meta = ROUND_STATUS_META[s as keyof typeof ROUND_STATUS_META];
        return <Tag color={meta?.color}>{meta?.label ?? s}</Tag>;
      },
    },
    { title: '病情评估', dataIndex: 'assessment', ellipsis: true },
    {
      title: '退回原因',
      dataIndex: 'returnReason',
      width: 160,
      render: (r) => r ?? '—',
    },
    {
      title: '操作',
      key: 'actions',
      width: 250,
      render: (_, r) => (
        <Space>
          {r.status === 'draft' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              loading={acting}
              onClick={() =>
                signRound(r.id)
                  .then(() => message.success('已本人签名'))
                  .catch((e) => message.error(e?.message ?? '签名失败'))
              }
            >
              本人签名
            </Button>
          )}
          {r.status === 'signed' && r.isSuperior && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<SafetyCertificateOutlined />}
                loading={acting}
                onClick={() =>
                  countersignRound(r.id)
                    .then(() => message.success('上级已审签'))
                    .catch((e) => message.error(e?.message ?? '审签失败'))
                }
              >
                上级审签
              </Button>
              <Button
                size="small"
                danger
                icon={<RollbackOutlined />}
                onClick={() => {
                  setReturnTarget(r);
                  setReturnReason('');
                }}
              >
                退回
              </Button>
            </>
          )}
          {(r.status === 'countersigned' || r.status === 'returned') && (
            <span className="text-xs text-gray-400">流程结束</span>
          )}
          {r.status === 'signed' && !r.isSuperior && (
            <span className="text-xs text-gray-400">已签名</span>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <AuditOutlined />
          <span>医生查房</span>
        </Space>
      }
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!selectedVisitId}
          onClick={openCreate}
        >
          新建查房
        </Button>
      }
    >
      <Table
        rowKey="id"
        size="small"
        loading={loadingRounds}
        columns={columns}
        dataSource={rounds}
        pagination={false}
        scroll={{ x: 900 }}
      />

      <Modal
        title="新建查房记录"
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => submitCreate().catch((e) => message.error(e?.message ?? '创建失败'))}
        okText="保存"
        cancelText="取消"
        width={720}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roundType" label="查房类型" rules={[{ required: true }]}>
                <Select
                  options={(Object.keys(ROUND_TYPE_META) as WardRoundType[]).map((k) => ({
                    value: k,
                    label: ROUND_TYPE_META[k].label,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="isSuperior" label="是否上级查房" valuePropName="checked">
                <Switch checkedChildren="上级" unCheckedChildren="普通" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="symptomChange" label="病情变化">
            <Input.TextArea rows={2} placeholder="患者主诉、症状变化（客观记录）" />
          </Form.Item>
          <Form.Item name="physicalExam" label="体格检查">
            <Input.TextArea rows={2} placeholder="阳性体征、专科查体" />
          </Form.Item>
          <Form.Item
            name="assessment"
            label="病情评估"
            rules={[{ required: true, message: '请填写病情评估' }]}
          >
            <Input.TextArea rows={3} placeholder="评估、分析（必须由医师确认）" />
          </Form.Item>
          <Form.Item name="diagnosis" label="诊断">
            <Input placeholder="西医/中医诊断" />
          </Form.Item>
          <Form.Item name="planAdjustment" label="计划调整">
            <Input.TextArea rows={2} placeholder="医嘱/护理/检查计划调整" />
          </Form.Item>
          <Form.Item name="aiAssisted" label="AI 辅助起草" valuePropName="checked">
            <Switch checkedChildren="AI辅助" unCheckedChildren="手写" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上级退回查房记录"
        open={returnTarget !== null}
        onCancel={() => setReturnTarget(null)}
        onOk={() => doReturn().catch((e) => message.error(e?.message ?? '退回失败'))}
        okText="确认退回"
        cancelText="取消"
        destroyOnClose
      >
        <Input.TextArea
          rows={3}
          value={returnReason}
          onChange={(e) => setReturnReason(e.target.value)}
          placeholder="请说明退回原因（必填）"
        />
      </Modal>
    </Card>
  );
}
