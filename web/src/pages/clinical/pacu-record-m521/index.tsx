/**
 * 健澜科技 jlmedaios - PACU Aldrete 出室评分（M521-D，P0 首批）
 *
 * 麻醉术后恢复室闭环：患者/就诊 Select 远程搜索带出姓名/性别/年龄/床号/诊断 →
 * 活动力/呼吸/循环/意识/血氧五项 Radio.Group 0/1/2 附评分标准 → 实测血压/心率/
 * SpO₂、出血/恶心呕吐现场情况本地录入并聚合进 note → 实时求和，≥9 分符合出室标准；
 * 达标且无活动性出血、无恶心呕吐方可申请出室，麻醉医师电子签名必填；未达标橙色 Alert
 * 留观复评并展示待办标识。历史 antd Table + 状态 Tag；BFF 不可用由 store/service
 * 降级确定性 DEMO 并打标。
 *
 * 权限码：pacu:record（登记）/ pacu:view（查看历史）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  InputNumber,
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { usePacuRecordFormStore } from '@/store/pacuRecordFormStore';
import {
  searchVisits,
  type VisitOption,
} from '@/services/api/clinicalDict';
import {
  ALDRETE_DIMENSIONS,
  DESTINATION_LABEL,
  isDelayedRecovery,
  isReadyForDischarge,
  type AldreteScore,
  type PacuDestination,
  type PacuRecord,
  type PacuSubmitInput,
} from '@/services/api/pacuRecordForm';

const { TextArea } = Input;

/** 总分 Tag 颜色：≥9 绿 / 7–8 橙 / <7 红 */
function aldreteTagColor(total: number): string {
  if (total >= 9) return 'green';
  if (total >= 7) return 'orange';
  return 'red';
}

/** 出室结论：苏醒延迟红 / 可出室绿 / 留观橙 */
function conclusionOf(r: PacuRecord): { label: string; color: string } {
  if (r.delayedRecovery || isDelayedRecovery(r.enteredAt, r.aldrete)) {
    return { label: '苏醒延迟', color: 'red' };
  }
  if (r.ready) return { label: '可出室', color: 'green' };
  return { label: '留观', color: 'orange' };
}

function destinationLabel(r: PacuRecord): string {
  const dest = r.dischargeDestination ?? r.destination;
  return dest ? DESTINATION_LABEL[dest] : '—';
}

interface FormValues {
  visitId: string;
  surgeryName?: string;
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  measuredSpo2?: number;
  conditions: string[];
  activity: AldreteScore;
  respiration: AldreteScore;
  circulation: AldreteScore;
  consciousness: AldreteScore;
  spo2: AldreteScore;
  dischargeRequested: boolean;
  destination?: PacuDestination;
  signature: string;
  note?: string;
}

export default function PacuRecordM521Page() {
  usePageTitle('PACU Aldrete 出室评分');
  const { hasPermission } = usePermission();
  const canRecord = hasPermission('pacu:record');
  const currentUser = useAuthStore((s) => s.user);

  const { records, loading, acting, error, demo, lastResult, load, submit } = usePacuRecordFormStore();
  const [form] = Form.useForm<FormValues>();
  const [visitOptions, setVisitOptions] = useState<VisitOption[]>([]);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<VisitOption | null>(null);
  const [detailRecord, setDetailRecord] = useState<PacuRecord | null>(null);

  useEffect(() => {
    void load();
    // 初始患者队列（空关键字）
    void loadVisits('');
  }, [load]);

  const loadVisits = async (keyword: string) => {
    setVisitsLoading(true);
    const res = await searchVisits(keyword);
    setVisitOptions(res.data);
    setVisitsLoading(false);
  };

  const activity = Form.useWatch('activity', form);
  const respiration = Form.useWatch('respiration', form);
  const circulation = Form.useWatch('circulation', form);
  const consciousness = Form.useWatch('consciousness', form);
  const spo2 = Form.useWatch('spo2', form);
  const conditions = Form.useWatch('conditions', form) ?? [];
  const dischargeRequested = Form.useWatch('dischargeRequested', form) ?? false;

  const scores: Array<AldreteScore | undefined> = [
    activity,
    respiration,
    circulation,
    consciousness,
    spo2,
  ];
  const allScored = scores.every((v) => v != null);
  const aldrete = scores.reduce<number>((sum, v) => sum + (v ?? 0), 0);
  const ready = isReadyForDischarge(aldrete);
  const bleeding = conditions.includes('bleeding');
  const nauseaVomiting = conditions.includes('nauseaVomiting');
  const canRequestDischarge = ready && !bleeding && !nauseaVomiting;

  // 条件不满足时自动取消出室勾选与去向，避免提交越权出室
  useEffect(() => {
    if (!canRequestDischarge && form.getFieldValue('dischargeRequested')) {
      form.setFieldsValue({ dischargeRequested: false, destination: undefined });
    }
  }, [canRequestDischarge, form]);

  const onVisitChange = (visitId: string) => {
    const opt = visitOptions.find((v) => v.visitId === visitId) ?? null;
    setSelectedVisit(opt);
    // 上级变更清空失效下级
    form.setFieldsValue({
      surgeryName: undefined,
      systolicBp: undefined,
      diastolicBp: undefined,
      heartRate: undefined,
      measuredSpo2: undefined,
      conditions: [],
      activity: undefined,
      respiration: undefined,
      circulation: undefined,
      consciousness: undefined,
      spo2: undefined,
      dischargeRequested: false,
      destination: undefined,
      signature: currentUser?.realName ?? '',
      note: undefined,
    });
  };

  const buildSubmitInput = (values: FormValues): PacuSubmitInput => ({
    visitId: values.visitId,
    patientId: selectedVisit?.patientId,
    patientName: selectedVisit?.name,
    activity: values.activity,
    respiration: values.respiration,
    circulation: values.circulation,
    consciousness: values.consciousness,
    spo2: values.spo2,
    surgeryName: values.surgeryName,
    systolicBp: values.systolicBp,
    diastolicBp: values.diastolicBp,
    heartRate: values.heartRate,
    measuredSpo2: values.measuredSpo2,
    bleeding,
    nauseaVomiting,
    dischargeRequested: values.dischargeRequested,
    destination: values.destination,
    signature: values.signature.trim(),
    assessorName: currentUser?.realName ?? '当前用户',
    note: values.note,
  });

  const doSubmit = async (values: FormValues) => {
    try {
      const result = await submit(buildSubmitInput(values));
      if (result.demo) {
        message.warning('BFF 不可用，本次 PACU 记录已按本地演示记录留存，未写入业务库');
      } else if (result.record.ready) {
        message.success(`Aldrete ${result.record.aldrete} 分，符合出室标准`);
      } else {
        message.success(`Aldrete ${result.record.aldrete} 分，继续留观按时复评`);
      }
      form.resetFields();
      setSelectedVisit(null);
      await load();
    } catch {
      // error 已写入 store，由 Alert 统一展示
    }
  };

  const onFinish = async (values: FormValues) => {
    await doSubmit(values);
  };

  const historyColumns = useMemo(
    () => [
      {
        title: '入室时间',
        dataIndex: 'enteredAt',
        ellipsis: true,
        render: (v: string, r: PacuRecord) =>
          v ? dayjs(v).format('YYYY-MM-DD HH:mm') : dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
      },
      { title: '患者', dataIndex: 'patientName', render: (v: string, r: PacuRecord) => v ?? r.visitId.slice(-6) },
      {
        title: '五项分项（活/呼/循/意/血）',
        render: (_: unknown, r: PacuRecord) => (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {r.activity}/{r.respiration}/{r.circulation}/{r.consciousness}/{r.spo2}
          </Typography.Text>
        ),
      },
      { title: '总分', dataIndex: 'aldrete', render: (v: number) => <Tag color={aldreteTagColor(v)}>{v} 分</Tag> },
      {
        title: '出室结论',
        render: (_: unknown, r: PacuRecord) => {
          const c = conclusionOf(r);
          return <Tag color={c.color}>{c.label}</Tag>;
        },
      },
      { title: '去向', render: (_: unknown, r: PacuRecord) => destinationLabel(r) },
      { title: '签名', dataIndex: 'signature', render: (v?: string) => v ?? '—' },
      {
        title: '操作',
        render: (_: unknown, r: PacuRecord) => (
          <Button size="small" type="link" onClick={() => setDetailRecord(r)}>查看</Button>
        ),
      },
    ],
    [],
  );

  const detailConclusion = detailRecord ? conclusionOf(detailRecord) : null;
  const blockedReasons = [bleeding && '活动性出血', nauseaVomiting && '恶心呕吐'].filter(Boolean).join('、');

  return (
    <PageContainer
      title="PACU Aldrete 出室评分"
      description="麻醉术后恢复室评分 · 五项 0/1/2 实时求和 · ≥9 分符合出室标准 · 未达标留观复评并生成待办"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {lastResult && !lastResult.record.ready && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="未达出室标准，继续留观，按时复评"
          description={
            lastResult.record.interventionTaskId
              ? `已生成留观复评待办：${lastResult.record.interventionTaskId}`
              : '本地演示记录，待办未生成'
          }
        />
      )}

      <Card size="small" title="新建 PACU 出室评分" style={{ marginBottom: 16 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          requiredMark="optional"
          initialValues={{ conditions: [], dischargeRequested: false, signature: currentUser?.realName ?? '' }}
        >
          <Row gutter={16}>
            <Col span={10}>
              <Form.Item
                name="visitId"
                label="患者 / 就诊（远程搜索）"
                rules={[{ required: true, message: '请选择患者/就诊' }]}
              >
                <Select
                  showSearch
                  placeholder="输入姓名 / 科室 / 诊断搜索"
                  loading={visitsLoading}
                  options={visitOptions.map((v) => ({
                    value: v.visitId,
                    label: `${v.name} · ${v.dept} · ${v.diagnosis}`,
                  }))}
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

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="surgeryName" label="手术记录 / 手术名称（选填）">
                <Input placeholder="如 阑尾切除术" maxLength={50} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name="systolicBp"
                label="收缩压 (mmHg)"
                rules={[{ type: 'number', min: 60, max: 260, message: '收缩压须在 60–260 之间' }]}
              >
                <InputNumber min={60} max={260} placeholder="如 132" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="diastolicBp"
                label="舒张压 (mmHg)"
                rules={[{ type: 'number', min: 30, max: 160, message: '舒张压须在 30–160 之间' }]}
              >
                <InputNumber min={30} max={160} placeholder="如 84" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="heartRate"
                label="心率 (次/分)"
                rules={[{ type: 'number', min: 30, max: 220, message: '心率须在 30–220 之间' }]}
              >
                <InputNumber min={30} max={220} placeholder="如 76" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name="measuredSpo2"
                label="实测 SpO₂ (%)"
                rules={[{ type: 'number', min: 70, max: 100, message: 'SpO₂ 须在 70–100 之间' }]}
              >
                <InputNumber min={70} max={100} placeholder="如 97" className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="conditions" label="现场情况（可多选，本地记录）">
            <Checkbox.Group
              options={[
                { value: 'bleeding', label: '活动性出血' },
                { value: 'nauseaVomiting', label: '恶心呕吐' },
              ]}
            />
          </Form.Item>

          {ALDRETE_DIMENSIONS.map((dim) => (
            <Form.Item
              key={dim.key}
              name={dim.key}
              label={dim.label}
              rules={[{ required: true, message: `请评定${dim.label}分项` }]}
            >
              <Radio.Group>
                <Row gutter={[16, 8]}>
                  {([2, 1, 0] as AldreteScore[]).map((score) => (
                    <Col span={8} key={score}>
                      <Radio value={score} style={{ alignItems: 'flex-start' }}>
                        <div>
                          <Typography.Text strong>{score} 分</Typography.Text>
                          <div>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                              {dim.scores[score]}
                            </Typography.Text>
                          </div>
                        </div>
                      </Radio>
                    </Col>
                  ))}
                </Row>
              </Radio.Group>
            </Form.Item>
          ))}

          <Alert
            type={ready ? 'success' : 'warning'}
            showIcon
            style={{ marginBottom: 12 }}
            message={
              allScored
                ? `当前 Aldrete 总分 ${aldrete} 分${ready ? '，已达到出室标准（≥9 分）' : '，未达到出室标准（≥9 分方可出室）'}`
                : '请完成五项分项评定'
            }
            description={!ready && allScored ? '未达出室标准，继续留观，按时复评' : undefined}
          />

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="dischargeRequested" valuePropName="checked" label="申请出室">
                <Checkbox disabled={!canRequestDischarge}>
                  申请出室（达标且无活动性出血、无恶心呕吐时可勾选）
                </Checkbox>
              </Form.Item>
              {!canRequestDischarge && allScored && (
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {ready
                    ? `存在${blockedReasons}，暂不可申请出室`
                    : '总分未达 9 分，暂不可申请出室'}
                </Typography.Text>
              )}
            </Col>
            {dischargeRequested && (
              <Col span={8}>
                <Form.Item
                  name="destination"
                  label="去向"
                  rules={[{ required: true, message: '请选择出室去向' }]}
                >
                  <Select
                    placeholder="选择去向"
                    options={(Object.keys(DESTINATION_LABEL) as PacuDestination[]).map((d) => ({
                      value: d,
                      label: DESTINATION_LABEL[d],
                    }))}
                  />
                </Form.Item>
              </Col>
            )}
            <Col span={dischargeRequested ? 8 : 16}>
              <Form.Item
                name="signature"
                label="麻醉医师电子签名"
                rules={
                  dischargeRequested
                    ? [
                        { required: true, message: '勾选出室时须由麻醉医师电子签名' },
                        { whitespace: true, message: '签名不能为空' },
                      ]
                    : []
                }
              >
                <Input placeholder="麻醉医师本人签名" maxLength={20} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="note" label="补充备注">
            <TextArea
              rows={3}
              placeholder="出血/引流、恶心呕吐处置、吸氧方式、病情观察等补充说明"
              maxLength={500}
              showCount
            />
          </Form.Item>

          <Space>
            <Button type="primary" htmlType="submit" loading={acting} disabled={!canRecord}>
              提交 PACU 记录
            </Button>
            {!canRecord && (
              <Typography.Text type="secondary">当前账号缺少 pacu:record 权限，无法登记</Typography.Text>
            )}
          </Space>
        </Form>
      </Card>

      <Card size="small" title={`PACU 出室评分记录${demo ? '（演示数据）' : ''}`}>
        <Spin spinning={loading}>
          <Table
            rowKey={(r) => r.id}
            dataSource={records}
            columns={historyColumns}
            size="small"
            pagination={{ pageSize: 8, showSizeChanger: false }}
            scroll={{ x: 1100 }}
          />
        </Spin>
      </Card>

      <Modal
        open={detailRecord != null}
        title="PACU 评分详情"
        onCancel={() => setDetailRecord(null)}
        footer={<Button onClick={() => setDetailRecord(null)}>关闭</Button>}
      >
        {detailRecord && (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <div>患者：{detailRecord.patientName ?? detailRecord.patientId} · 就诊：{detailRecord.visitId}</div>
            {detailRecord.surgeryName && <div>手术：{detailRecord.surgeryName}</div>}
            <div>
              {ALDRETE_DIMENSIONS.map((dim) => (
                <Tag key={dim.key}>{dim.label} {detailRecord[dim.key]} 分</Tag>
              ))}
            </div>
            <div>
              总分：<Tag color={aldreteTagColor(detailRecord.aldrete)}>{detailRecord.aldrete} 分</Tag>
              {detailConclusion && <Tag color={detailConclusion.color}>{detailConclusion.label}</Tag>}
            </div>
            <div>
              {detailRecord.systolicBp != null && <>BP {detailRecord.systolicBp}/{detailRecord.diastolicBp} mmHg · </>}
              {detailRecord.heartRate != null && <>HR {detailRecord.heartRate} 次/分 · </>}
              {detailRecord.measuredSpo2 != null && <>SpO₂ {detailRecord.measuredSpo2}%</>}
            </div>
            {(detailRecord.bleeding || detailRecord.nauseaVomiting) && (
              <div>
                现场情况：
                {[detailRecord.bleeding && '活动性出血', detailRecord.nauseaVomiting && '恶心呕吐']
                  .filter(Boolean)
                  .join('、')}
              </div>
            )}
            {(detailRecord.dischargeDestination || detailRecord.destination) && (
              <div>去向：{destinationLabel(detailRecord)}</div>
            )}
            {detailRecord.interventionTaskId && (
              <div><Tag color="orange">留观复评待办：{detailRecord.interventionTaskId}</Tag></div>
            )}
            {detailRecord.note && <div>备注：{detailRecord.note}</div>}
            <div>
              麻醉医师：{detailRecord.assessorName ?? detailRecord.signature} · 入室：
              {dayjs(detailRecord.enteredAt).format('YYYY-MM-DD HH:mm')}
            </div>
          </Space>
        )}
      </Modal>
    </PageContainer>
  );
}
