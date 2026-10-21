/**
 * 健澜科技 jlmedaios - 患者在线问诊发起（M539，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 主诉 TextArea → 病情摘要 TextArea
 * → 科室 Select（内/外/儿/妇/全科 英文 key）→ urgency Radio 3 档（常规绿/加急橙/急诊红）
 * → 期望医生 Input 可空 → 实时预览：emergency 红 Alert「已通知护士优先分诊」。
 * 签名留痕，后端按 urgency 二次计算 priority / needsNurseTriage / 初始 status=pending_triage。
 * 历史 antd Table（urgency/status 彩色 Tag）+ 详情 Modal；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：consult:create（发起）/ consult:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useOnlineConsultFormStore } from '@/store/onlineConsultFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  DEPTS,
  DEPT_LABEL,
  STATUS_COLOR,
  STATUS_LABEL,
  URGENCIES,
  URGENCY_COLOR,
  URGENCY_LABEL,
  derivePriority,
  type ConsultStatus,
  type OnlineConsultRecord,
  type OnlineConsultSubmitInput,
  type Urgency,
} from '@/services/api/onlineConsultForm';

interface FormValues {
  visitId: string;
  deptCode: string;
  chiefComplaint: string;
  symptomSummary?: string;
  urgency: Urgency;
  preferredDoctorId?: string;
  createdAt: Dayjs;
  signature: string;
}

export default function PatientConsultOnlineM521Page() {
  usePageTitle('患者在线问诊');
  const { hasPermission } = usePermission();
  const canCreate = hasPermission('consult:create');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useOnlineConsultFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<OnlineConsultRecord | null>(null);

  useEffect(() => {
    void load();
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const watchedUrgency = Form.useWatch('urgency', form) ?? 'routine';
  const preview = useMemo(() => derivePriority(watchedUrgency), [watchedUrgency]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const doSubmit = async (values: FormValues) => {
    if (!selectedVisit) return;
    const input: OnlineConsultSubmitInput = {
      patientId: selectedVisit.patientId,
      patientName: selectedVisit.name,
      deptCode: values.deptCode,
      symptomSummary: values.symptomSummary?.trim() || '',
      chiefComplaint: values.chiefComplaint.trim(),
      urgency: values.urgency,
      preferredDoctorId: values.preferredDoctorId?.trim() || null,
      attachments: [],
      createdAt: values.createdAt.toISOString(),
      signature: values.signature.trim(),
      assessorName: currentUser?.realName ?? '当前用户',
    };
    try {
      const result = await submit(input);
      if (result.demo) {
        message.warning('BFF 不可用，本次问诊已按本地演示记录留存，未写入业务库');
      } else if (result.record.urgency === 'emergency') {
        message.warning(`问诊已提交（${URGENCY_LABEL[result.record.urgency]}，优先级 ${result.record.priority}）：已通知护士优先分诊`);
      } else {
        message.success(`问诊已提交（${URGENCY_LABEL[result.record.urgency]}，优先级 ${result.record.priority}）`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store
    }
  };

  const historyColumns = useMemo(
    () => [
      { title: '提交时间', dataIndex: 'createdAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: OnlineConsultRecord) => v ?? r.patientId },
      { title: '科室', dataIndex: 'deptCode', render: (v: string) => DEPT_LABEL[v] ?? v },
      { title: '主诉', dataIndex: 'chiefComplaint', ellipsis: true },
      { title: '紧急度', dataIndex: 'urgency', render: (v: Urgency) => <Tag color={URGENCY_COLOR[v]}>{URGENCY_LABEL[v]}</Tag> },
      { title: '优先级', dataIndex: 'priority', render: (v: number) => <b>P{v}</b> },
      { title: '状态', dataIndex: 'status', render: (v: ConsultStatus) => <Tag color={STATUS_COLOR[v]}>{STATUS_LABEL[v]}</Tag> },
      {
        title: '操作',
        render: (_: unknown, r: OnlineConsultRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="患者在线问诊"
      description="按紧急度自动分配优先级：急诊 P1 护士优先分诊 · 加急 P2 · 常规 P3"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="发起在线问诊" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{
            deptCode: 'internal',
            urgency: 'routine' as Urgency,
            createdAt: dayjs(),
            signature: currentUser?.realName ?? '',
          }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item name="visitId" label="患者 / 就诊（远程搜索）" rules={[{ required: true, message: '请选择患者/就诊' }]}>
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({ value: v.visitId, label: `${v.name} · ${v.dept} · ${v.diagnosis}` }))}
                  onSearch={loadVisits}
                  onFocus={() => loadVisits('')}
                  onChange={onVisitChange}
                  filterOption={false}
                />
              </Form.Item>
            </Col>
            {selectedVisit && (
              <Col span={14}>
                <Alert
                  type="info"
                  showIcon
                  style={{ marginTop: 30 }}
                  message={`${selectedVisit.name}（${selectedVisit.gender === 'male' ? '男' : '女'} · ${selectedVisit.age} 岁 · ${selectedVisit.bedNo}）`}
                  description={`诊断：${selectedVisit.diagnosis}`}
                />
              </Col>
            )}
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="chiefComplaint" label="主诉" rules={[{ required: true, message: '请输入主诉' }]}>
                <Input.TextArea rows={2} maxLength={100} showCount placeholder="如：胸痛 30 分钟" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="symptomSummary" label="病情摘要（可选）">
                <Input.TextArea rows={2} maxLength={500} showCount placeholder="简要描述发病过程、伴随症状、已采取处理" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="deptCode" label="问诊科室" rules={[{ required: true, message: '请选择科室' }]}>
                <Select options={DEPTS.map((v) => ({ value: v, label: DEPT_LABEL[v] }))} />
              </Form.Item>
            </Col>
            <Col span={10}>
              <Form.Item name="urgency" label="紧急程度" rules={[{ required: true, message: '请选择紧急程度' }]}>
                <Radio.Group>
                  <Space>
                    {URGENCIES.map((u) => (
                      <Radio.Button key={u} value={u}><Tag color={URGENCY_COLOR[u]} style={{ marginInlineEnd: 0 }}>{URGENCY_LABEL[u]}</Tag></Radio.Button>
                    ))}
                  </Space>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item name="preferredDoctorId" label="期望医生工号（可空）">
                <Input placeholder="如 D-001" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          {watchedUrgency === 'emergency' && (
            <Alert type="error" showIcon style={{ marginBottom: 12 }} message="已通知护士优先分诊（P1 急诊）" />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="createdAt" label="提交时间" rules={[{ required: true, message: '请选择提交时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="signature"
                label="患者/发起医师电子签名"
                rules={[{ required: true, message: '请签署发起姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="发起本人签名" maxLength={20} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item label="实时优先级预览">
                <Space>
                  <Tag color={URGENCY_COLOR[watchedUrgency]}>{URGENCY_LABEL[watchedUrgency]}</Tag>
                  <b>P{preview.priority}</b>
                  {preview.needsNurseTriage
                    ? <Tag color="orange">需护士分诊</Tag>
                    : <Tag color="green">常规排队</Tag>}
                </Space>
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canCreate}>提交问诊</Button>
            {!canCreate && <Typography.Text type="secondary">当前账号缺少 consult:create 权限，无法发起</Typography.Text>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`在线问诊记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1000 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="在线问诊详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · {DEPT_LABEL[detailRecord.deptCode] ?? detailRecord.deptCode}</div>
            <div>主诉：{detailRecord.chiefComplaint}</div>
            {detailRecord.symptomSummary && <div>病情摘要：{detailRecord.symptomSummary}</div>}
            <div>
              紧急度：<Tag color={URGENCY_COLOR[detailRecord.urgency]}>{URGENCY_LABEL[detailRecord.urgency]}</Tag>
              · 优先级 P{detailRecord.priority}
              · 状态：<Tag color={STATUS_COLOR[detailRecord.status]}>{STATUS_LABEL[detailRecord.status]}</Tag>
              {detailRecord.needsNurseTriage && <Tag color="orange">需护士分诊</Tag>}
            </div>
            {detailRecord.preferredDoctorId && <div>期望医生：{detailRecord.preferredDoctorId}</div>}
            {detailRecord.attachments.length > 0 && <div>附件：{detailRecord.attachments.join('，')}</div>}
            <div>发起人：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.createdAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
