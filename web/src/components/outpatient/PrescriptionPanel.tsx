/**
 * 健澜科技 jlmedaios - 处方开具面板（真实接口）
 *
 * 药品搜索（真实库）、本地处方草稿（剂量/频次/途径）、服务端审方告警、
 * 提交并签名（pending_review）、药师审核（approved/rejected）。
 *
 * 说明：药师审核按钮对应药师职能（rx:review），生产环境位于药师工作台并按角色鉴权；
 * 此处保留以完整呈现处方流转闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  InputNumber,
  List,
  Modal,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
} from 'antd';
import {
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined,
  SafetyCertificateOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import type {
  DrugFrequency,
  DrugInfo,
  DrugRoute,
  PrescriptionLine,
  PrescriptionType,
  RxTemplateView,
} from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  fetchPrescriptionTemplates,
  searchDrugsApi,
} from '@/services/api/outpatient';
import {
  drugRouteLabel,
  frequencyLabel,
  prescriptionTypeLabel,
} from './constants';

const FREQUENCY_OPTIONS = (Object.keys(frequencyLabel) as DrugFrequency[]).map((v) => ({
  value: v,
  label: `${v} (${frequencyLabel[v]})`,
}));
const ROUTE_OPTIONS = (Object.keys(drugRouteLabel) as DrugRoute[]).map((v) => ({
  value: v,
  label: drugRouteLabel[v],
}));

export const PrescriptionPanel: React.FC = () => {
  const draftRxLines = useOutpatientStore((s) => s.draftRxLines);
  const addDraftLine = useOutpatientStore((s) => s.addDraftLine);
  const updateDraftLine = useOutpatientStore((s) => s.updateDraftLine);
  const removeDraftLine = useOutpatientStore((s) => s.removeDraftLine);
  const submitDraftPrescription = useOutpatientStore((s) => s.submitDraftPrescription);
  const prescriptions = useOutpatientStore((s) => s.prescriptions);
  const auditPrescription = useOutpatientStore((s) => s.auditPrescription);
  const currentPatient = useOutpatientStore((s) => s.currentPatient);

  const [type, setType] = useState<PrescriptionType>('western');
  const [kw, setKw] = useState('');
  const [searching, setSearching] = useState(false);
  const [drugResults, setDrugResults] = useState<DrugInfo[]>([]);
  const [templates, setTemplates] = useState<RxTemplateView[]>([]);
  const [sigModal, setSigModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 处方模板（真实目录）
  useEffect(() => {
    let alive = true;
    fetchPrescriptionTemplates()
      .then((list) => {
        if (alive) setTemplates(list as unknown as RxTemplateView[]);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  // 药品搜索（防抖，真实库）
  useEffect(() => {
    const k = kw.trim();
    if (!k) {
      setDrugResults([]);
      return undefined;
    }
    let alive = true;
    setSearching(true);
    const timer = setTimeout(() => {
      searchDrugsApi(k)
        .then((list) => {
          if (alive) setDrugResults(list as unknown as DrugInfo[]);
        })
        .catch(() => undefined)
        .finally(() => {
          if (alive) setSearching(false);
        });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [kw]);

  const addDrug = (drug: DrugInfo): void => {
    addDraftLine(drug);
  };

  /** 套用模板：按 drugId（药品编码）逐个检索真实药品后加入草稿 */
  const applyTemplate = async (templateId: string): Promise<void> => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    for (const tl of tpl.lines) {
      try {
        const found = (await searchDrugsApi(tl.drugId)) as unknown as DrugInfo[];
        const drug = found.find((d) => d.drugId === tl.drugId) ?? found[0];
        if (!drug) continue;
        addDraftLine(drug);
        // 套用模板剂量
        useOutpatientStore.setState((s) => {
          const line = s.draftRxLines[s.draftRxLines.length - 1];
          if (!line) return {};
          const updated: PrescriptionLine = {
            ...line,
            dose: tl.dose,
            doseUnit: tl.doseUnit,
            frequency: tl.frequency,
            route: tl.route,
            days: tl.days,
            quantity: tl.quantity || tl.dose * tl.days,
            instruction: tl.instruction,
          };
          return {
            draftRxLines: s.draftRxLines.map((l) =>
              l.lineId === line.lineId ? updated : l,
            ),
          };
        });
      } catch {
        /* 单个药品解析失败则跳过，不阻断整体 */
      }
    }
  };

  const draftTotal = useMemo(
    () => draftRxLines.reduce((s, l) => s + l.subtotal, 0),
    [draftRxLines],
  );

  const columns = [
    {
      title: '药品',
      render: (_: unknown, l: PrescriptionLine) => (
        <div>
          <div className="font-medium text-sm">{l.drug.genericName}</div>
          <div className="text-xs text-ink-secondary">
            {l.drug.spec} · {l.drug.dosageForm} · {l.drug.manufacturer}
          </div>
          {(l.drug.highRisk || l.drug.antibiotics) && (
            <div>
              {l.drug.highRisk && (
                <Tag color="red" className="!mr-0 !text-[10px]">高危药</Tag>
              )}
              {l.drug.antibiotics && (
                <Tag color="orange" className="!mr-0 !text-[10px]">抗菌药</Tag>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      title: '单次剂量',
      width: 120,
      render: (_: unknown, l: PrescriptionLine) => (
        <Space.Compact>
          <InputNumber
            size="small"
            value={l.dose}
            min={0}
            onChange={(v) => updateDraftLine(l.lineId, { dose: v ?? 0 })}
          />
          <Select
            size="small"
            value={l.doseUnit}
            options={[
              { value: 'mg', label: 'mg' },
              { value: 'g', label: 'g' },
              { value: 'ml', label: 'ml' },
              { value: 'IU', label: 'IU' },
            ]}
            style={{ width: 70 }}
            onChange={(v) => updateDraftLine(l.lineId, { doseUnit: v })}
          />
        </Space.Compact>
      ),
    },
    {
      title: '频次',
      width: 130,
      render: (_: unknown, l: PrescriptionLine) => (
        <Select
          size="small"
          value={l.frequency}
          options={FREQUENCY_OPTIONS}
          onChange={(v) => updateDraftLine(l.lineId, { frequency: v })}
        />
      ),
    },
    {
      title: '途径',
      width: 110,
      render: (_: unknown, l: PrescriptionLine) => (
        <Select
          size="small"
          value={l.route}
          options={ROUTE_OPTIONS}
          onChange={(v) => updateDraftLine(l.lineId, { route: v })}
        />
      ),
    },
    {
      title: '天数',
      width: 80,
      render: (_: unknown, l: PrescriptionLine) => (
        <InputNumber
          size="small"
          value={l.days}
          min={1}
          max={90}
          onChange={(v) => updateDraftLine(l.lineId, { days: v ?? 1 })}
        />
      ),
    },
    {
      title: '数量',
      width: 80,
      render: (_: unknown, l: PrescriptionLine) => (
        <InputNumber
          size="small"
          value={l.quantity}
          min={1}
          onChange={(v) => updateDraftLine(l.lineId, { quantity: v ?? 1 })}
        />
      ),
    },
    {
      title: '用法',
      render: (_: unknown, l: PrescriptionLine) => (
        <Input
          size="small"
          value={l.instruction}
          onChange={(e) => updateDraftLine(l.lineId, { instruction: e.target.value })}
        />
      ),
    },
    {
      title: '小计',
      width: 90,
      render: (_: unknown, l: PrescriptionLine) => (
        <span className="font-medium">¥{l.subtotal.toFixed(2)}</span>
      ),
    },
    {
      title: '操作',
      width: 60,
      render: (_: unknown, l: PrescriptionLine) => (
        <Button
          size="small"
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeDraftLine(l.lineId)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Segmented
          size="small"
          value={type}
          onChange={(v) => setType(v as PrescriptionType)}
          options={(Object.keys(prescriptionTypeLabel) as PrescriptionType[]).map((k) => ({
            value: k,
            label: prescriptionTypeLabel[k],
          }))}
        />
        <Select
          size="small"
          style={{ width: 220 }}
          placeholder="选择处方模板"
          onChange={(v) => void applyTemplate(v)}
          options={templates.map((t) => ({ value: t.id, label: t.name }))}
          suffixIcon={<ProfileOutlined />}
        />
      </div>

      {currentPatient && currentPatient.allergies.length > 0 && (
        <Alert
          type="error"
          showIcon
          message={`患者过敏史：${currentPatient.allergies.join('、')}`}
          description="相关药品将在服务端审方中拦截，提交前请再次核对。"
        />
      )}

      {/* 药品搜索 */}
      <Card size="small" title={<span className="text-sm font-semibold">药品目录检索</span>}>
        <Input
          prefix={<SearchOutlined />}
          placeholder="搜索药品名 / 编码，如 阿司匹林"
          value={kw}
          onChange={(e) => setKw(e.target.value)}
          allowClear
        />
        <div className="mt-2">
          {searching ? (
            <div className="py-4 text-center">
              <Spin size="small" />
            </div>
          ) : drugResults.length > 0 ? (
            <List
              size="small"
              dataSource={drugResults}
              renderItem={(d) => (
                <List.Item
                  actions={[
                    <Button
                      key="add"
                      size="small"
                      type="link"
                      icon={<PlusOutlined />}
                      onClick={() => addDrug(d)}
                    />,
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space size={4}>
                        <span className="font-medium text-sm">{d.genericName}</span>
                        {d.antibiotics && (
                          <Tag color="orange" className="!mr-0">抗菌</Tag>
                        )}
                        {d.highRisk && (
                          <Tag color="red" className="!mr-0">高危</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <span className="text-xs text-ink-secondary">
                        {d.spec} · {d.dosageForm} · ¥{d.price} · 库存{d.stock}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            kw.trim() && (
              <div className="text-xs text-ink-secondary py-2 text-center">未检索到药品</div>
            )
          )}
        </div>
      </Card>

      {/* 处方草稿明细 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">处方草稿（{draftRxLines.length}）</span>}
      >
        {draftRxLines.length === 0 ? (
          <div className="text-xs text-ink-secondary py-3 text-center">
            请从上方检索并添加药品
          </div>
        ) : (
          <Table
            rowKey="lineId"
            size="small"
            columns={columns as never}
            dataSource={draftRxLines}
            pagination={false}
            scroll={{ x: 950 }}
          />
        )}
        <div className="mt-3 flex items-center justify-between">
          <Statistic
            title="草稿合计"
            value={draftTotal}
            precision={2}
            prefix="¥"
            valueStyle={{ fontSize: 18, color: '#0A4D8C' }}
          />
          <Space>
            {draftRxLines.length > 0 && (
              <Button onClick={() => useOutpatientStore.getState().clearDraft()}>清空</Button>
            )}
            <Button
              type="primary"
              icon={<SafetyCertificateOutlined />}
              disabled={draftRxLines.length === 0 || submitting}
              style={{ background: '#0A4D8C' }}
              onClick={() => setSigModal(true)}
            >
              提交并签名
            </Button>
          </Space>
        </div>
      </Card>

      {/* 已提交处方 + 药师审核 */}
      {prescriptions.length > 0 && (
        <Card
          size="small"
          title={<span className="text-sm font-semibold">已提交处方（{prescriptions.length}）</span>}
        >
          <Space direction="vertical" className="w-full">
            {prescriptions.map((rx) => (
              <div key={rx.prescriptionId} className="p-2 rounded border border-ink-border">
                <div className="flex items-center justify-between">
                  <Space size={6}>
                    <Tag>
                      {rx.lines.length} 种药品
                    </Tag>
                    <Tag
                      color={
                        rx.status === 'approved'
                          ? 'success'
                          : rx.status === 'rejected'
                            ? 'error'
                            : 'processing'
                      }
                    >
                      {rx.status === 'approved'
                        ? '药师已通过'
                        : rx.status === 'rejected'
                          ? '药师已驳回'
                          : '待药师审核'}
                    </Tag>
                    <span className="text-xs text-ink-secondary">
                      ¥{rx.totalFee.toFixed(2)}
                    </span>
                  </Space>
                  {rx.status !== 'approved' && rx.status !== 'rejected' && (
                    <Space size={4}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => auditPrescription(rx.prescriptionId, 'approved', '审核通过')}
                      >
                        药师通过
                      </Button>
                      <Button
                        size="small"
                        danger
                        onClick={() => auditPrescription(rx.prescriptionId, 'rejected', '审核驳回')}
                      >
                        驳回
                      </Button>
                    </Space>
                  )}
                </div>
                {rx.warnings.length > 0 && (
                  <Space direction="vertical" className="w-full mt-2">
                    {rx.warnings.map((w, idx) => (
                      <Alert
                        key={idx}
                        type={w.level === 'danger' ? 'error' : w.level === 'warning' ? 'warning' : 'info'}
                        showIcon
                        message={<span className="text-xs">{w.title}</span>}
                        description={<span className="text-xs">{w.detail}</span>}
                      />
                    ))}
                  </Space>
                )}
              </div>
            ))}
          </Space>
        </Card>
      )}

      {/* 电子签名弹窗 */}
      <Modal
        open={sigModal}
        title="电子签名 / CA 认证"
        onCancel={() => setSigModal(false)}
        onOk={async () => {
          setSubmitting(true);
          const ok = await submitDraftPrescription();
          setSubmitting(false);
          setSigModal(false);
          if (ok) {
            // 成功提示由全局消息处理
          }
        }}
        okText="确认签名提交"
        okButtonProps={{ icon: <SafetyCertificateOutlined />, loading: submitting }}
      >
        <p className="text-sm">
          本次处方共 <b>{draftRxLines.length}</b> 种药品，草稿合计 <b>¥{draftTotal.toFixed(2)}</b>。
        </p>
        <p className="text-xs text-ink-secondary mt-2">
          签名即代表医师已审核处方内容，对处方的合法性、规范性负责（符合《处方管理办法》）；
          提交后进入药师审核环节。
        </p>
      </Modal>
    </div>
  );
};

export default PrescriptionPanel;
