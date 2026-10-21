/**
 * 健澜科技 jlmedaios - ICU 镇静 RASS/Ramsay 评估（M521-F，P0）
 *
 * 三甲流程：患者/就诊 Select 远程搜索带出信息 → 实测 RASS −5…+4 Radio.Group 附行为释义
 * → 目标 RASS Select（目标区间 −2~0）→ Ramsay 1–6 → 机械通气 → 时间戳与签名留痕；
 * 实测 RASS ≤−2 或 ≥+2 自动 Alert「通知医师调整镇静方案」。
 * 历史 antd Table + 状态 Tag；BFF 不可用由 store/service 降级确定性 DEMO 并打标。
 *
 * 权限码：icu:sedation（登记）/ icu:view（查看历史）。
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
import { useIcuSedationFormStore } from '@/store/icuSedationFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  RASS_LABEL,
  RASS_OPTIONS,
  RAMSAY_LABEL,
  RAMSAY_OPTIONS,
  VENTILATED_LABEL,
  needsAdjustSedation,
  sedationZone,
  SEDATION_ZONE_COLOR,
  type IcuSedationRecord,
  type IcuSedationSubmitInput,
  type RamsayScore,
  type RassScore,
  type Ventilated,
} from '@/services/api/icuSedationForm';

interface FormValues {
  visitId: string;
  actualRass: RassScore;
  targetRass: RassScore;
  ramsay: RamsayScore;
  ventilated: Ventilated;
  assessedAt: Dayjs;
  signature: string;
}

export default function IcuSedationM521Page() {
  usePageTitle('ICU 镇静 RASS/Ramsay 评估');
  const { hasPermission } = usePermission();
  const canAssess = hasPermission('icu:sedation');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, load, submit } = useIcuSedationFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<IcuSedationRecord | null>(null);

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

  const actualRass = Form.useWatch('actualRass', form);
  const targetRass = Form.useWatch('targetRass', form);
  const needsAdjust = actualRass != null && needsAdjustSedation(actualRass);
  const zone = actualRass != null ? sedationZone(actualRass) : null;

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    form.setFieldsValue({ signature: currentUser?.realName ?? '' });
  };

  const buildSubmitInput = (values: FormValues): IcuSedationSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    actualRass: values.actualRass,
    targetRass: values.targetRass,
    ramsay: values.ramsay,
    ventilated: values.ventilated,
    assessedAt: values.assessedAt.toISOString(),
    signature: values.signature.trim(),
    assessorName: currentUser?.realName ?? '当前用户',
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，本次镇静评估已按本地演示记录留存，未写入业务库');
      } else {
        message.success(`镇静评估完成：RASS ${result.record.actualRass}${result.record.needsAdjust ? '（已通知医师调整镇静方案）' : ''}`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  const historyColumns = useMemo(
    () => [
      { title: '评估时间', dataIndex: 'assessedAt', ellipsis: true, render: (v: string) => (v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '—') },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: IcuSedationRecord) => v ?? r.visitId.slice(-6) },
      { title: '实测 RASS', dataIndex: 'actualRass', render: (v: number) => <Tag color={v <= -2 || v >= 2 ? 'orange' : 'green'}>{RASS_LABEL[v]}</Tag> },
      { title: '目标 RASS', dataIndex: 'targetRass', render: (v: number) => RASS_LABEL[v] },
      { title: 'Ramsay', dataIndex: 'ramsay', render: (v: RamsayScore) => RAMSAY_LABEL[v] },
      { title: '通气方式', dataIndex: 'ventilated', render: (v: Ventilated) => VENTILATED_LABEL[v] },
      { title: '需调整', dataIndex: 'needsAdjust', render: (v: boolean) => (v ? <Tag color="red">通知医师</Tag> : <Tag color="green">达标</Tag>) },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: IcuSedationRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  return (
    <PageContainer
      title="ICU 镇静 RASS/Ramsay 评估"
      description="RASS −5…+4 行为释义 · 目标区间 −2~0 · 偏离自动通知医师调整镇静方案"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title="新建镇静评估" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={doSubmit}
          requiredMark="optional"
          initialValues={{ ventilated: 'yes', targetRass: -1 as RassScore, assessedAt: dayjs(), signature: currentUser?.realName ?? '' }}
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
                  description={`诊断：${selectedVisit.diagnosis}${selectedVisit.diagnosisIcd10 ? `（ICD-10 ${selectedVisit.diagnosisIcd10}）` : ''}`}
                />
              </Col>
            )}
          </Row>

          <Form.Item name="actualRass" label="实测 RASS（−5 不能唤醒 … +4 有攻击性）" rules={[{ required: true, message: '请选择实测 RASS' }]}>
            <Radio.Group>
              <Row gutter={[8, 8]}>
                {RASS_OPTIONS.map((v) => (
                  <Col key={v} span={2}>
                    <Radio.Button value={v} style={{ width: '100%', textAlign: 'center' }}>{v > 0 ? `+${v}` : v}</Radio.Button>
                  </Col>
                ))}
              </Row>
            </Radio.Group>
          </Form.Item>
          {actualRass != null && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              释义：{RASS_LABEL[actualRass]}
            </Typography.Text>
          )}

          {zone && (
            <Alert
              type={needsAdjust ? 'warning' : 'success'}
              showIcon
              style={{ marginBottom: 12 }}
              message={needsAdjust
                ? '实测 RASS ≤−2 或 ≥+2，已偏离目标区间，通知医师调整镇静方案'
                : '实测 RASS 处于目标区间（−2~0），镇静达标'}
            />
          )}

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="targetRass" label="目标 RASS（目标区间 −2~0）" rules={[{ required: true, message: '请选择目标 RASS' }]}>
                <Select
                  options={RASS_OPTIONS.filter((v) => v >= -2 && v <= 0).map((v) => ({ value: v, label: RASS_LABEL[v] }))}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ramsay" label="Ramsay 评分（1 焦虑躁动 … 6 深睡）" rules={[{ required: true, message: '请选择 Ramsay 评分' }]}>
                <Select options={RAMSAY_OPTIONS.map((v) => ({ value: v, label: RAMSAY_LABEL[v] }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="ventilated" label="通气方式" rules={[{ required: true, message: '请选择通气方式' }]}>
                <Select options={([['yes', '机械通气'], ['no', '自主呼吸']] as Array<[Ventilated, string]>).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="assessedAt" label="评估时间" rules={[{ required: true, message: '请选择评估时间' }]}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="signature"
                label="评估医师电子签名"
                rules={[{ required: true, message: '请签署评估医师姓名' }, { whitespace: true, message: '签名不能为空' }]}
              >
                <Input placeholder="评估医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canAssess}>提交镇静评估</Button>
            {!canAssess && <Typography.Text type="secondary">当前账号缺少 icu:sedation 权限，无法登记</Typography.Text>}
            {targetRass != null && <Tag color={SEDATION_ZONE_COLOR[sedationZone(targetRass)]}>目标 RASS {RASS_LABEL[targetRass]}</Tag>}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`镇静评估记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 900 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="镇静评估详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · 就诊：{detailRecord.visitId}</div>
            <div>实测 RASS：{RASS_LABEL[detailRecord.actualRass]} · 目标：{RASS_LABEL[detailRecord.targetRass]}</div>
            <div>Ramsay：{RAMSAY_LABEL[detailRecord.ramsay]} · {VENTILATED_LABEL[detailRecord.ventilated]}</div>
            <div>{detailRecord.needsAdjust ? <Tag color="red">需通知医师调整镇静方案</Tag> : <Tag color="green">镇静达标</Tag>}</div>
            <div>评估医师：{detailRecord.assessorName ?? detailRecord.signature} · 时间：{dayjs(detailRecord.assessedAt).format('YYYY-MM-DD HH:mm')}</div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
