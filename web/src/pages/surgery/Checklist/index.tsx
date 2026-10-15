/**
 * 健澜科技 jlmedaios - 手术安全核查表（三方核查清单电子化）
 *
 * 四阶段：术前 / 麻醉实施前 / 切皮前 Time-out / 手术结束后 Sign-out。
 * 每阶段逐条勾选，全部必备项通过后方可三方签名确认；签署后落 signedBy/signedAt。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Checkbox,
  Layout,
  Modal,
  Spin,
  Tabs,
  Tag,
  Typography,
  Watermark,
  message,
} from 'antd';
import { SafetyCertificateOutlined, ReloadOutlined } from '@ant-design/icons';
import { useSurgeryChecklistStore } from '@/store/surgeryChecklistStore';
import type { ChecklistItem, ChecklistPhase, PhaseView } from '@/services/api/surgeryChecklist';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '手术安全核查', 'jlmedaios'];

function surgeryIdFromQuery(): string {
  return new URLSearchParams(window.location.search).get('surgeryId') ?? '';
}

export default function SurgeryChecklistPage() {
  const { view, loading, saving, error, load, sign } = useSurgeryChecklistStore();
  const surgeryId = useMemo(surgeryIdFromQuery, []);

  // 本地草稿：phase -> 勾选态（接口返回后填充）
  const [draft, setDraft] = useState<Partial<Record<ChecklistPhase, ChecklistItem[]>>>({});
  const [active, setActive] = useState<ChecklistPhase>('pre_op');

  useEffect(() => {
    if (surgeryId) void load(surgeryId);
  }, [load, surgeryId]);

  useEffect(() => {
    if (!view) return;
    const next: Partial<Record<ChecklistPhase, ChecklistItem[]>> = {};
    for (const p of view.phases) next[p.phase] = p.items.map((it) => ({ ...it }));
    setDraft(next);
  }, [view]);

  const current: PhaseView | undefined = view?.phases.find((p) => p.phase === active);
  const items = draft[active] ?? current?.items ?? [];
  const checkedCount = items.filter((i) => i.checked).length;
  const missingRequired = items.filter((i) => i.required && !i.checked);

  function toggle(key: string) {
    setDraft((prev) => ({
      ...prev,
      [active]: (prev[active] ?? []).map((it) => (it.key === key ? { ...it, checked: !it.checked } : it)),
    }));
  }

  function openSignConfirm() {
    if (!items.length) return;
    if (missingRequired.length > 0) {
      message.warning(`仍有 ${missingRequired.length} 项必备核查未完成，不能签署`);
      return;
    }
    Modal.confirm({
      title: '三方签名确认',
      icon: <SafetyCertificateOutlined />,
      content: `确认以当前登录人身份签署「${current?.title ?? active}」？签署后记录将作为该阶段完成依据。`,
      okText: '确认签署',
      cancelText: '返回修改',
      onOk: async () => {
        const done = await sign(surgeryId, active, items);
        if (done) message.success(`${current?.title ?? active} 已签署`);
      },
    });
  }

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center gap-3 bg-jl-primary px-6 shadow-card">
          <SafetyCertificateOutlined className="text-2xl text-white" />
          <Typography.Title level={4} className="!mb-0 !text-white">
            手术安全核查表
          </Typography.Title>
          <span className="hidden text-sm text-white/70 md:block">术前 · 麻醉前 · 切皮前 · 术后 三方核查</span>
        </Header>
        <Content className="space-y-3 p-4">
          {!surgeryId && (
            <Alert type="warning" showIcon banner message="请通过 URL 传入 surgeryId，例如：/surgery/checklist?surgeryId=<手术ID>" />
          )}
          {error && <Alert type="error" showIcon banner message={error} />}

          <Spin spinning={loading}>
            {view && surgeryId && (
              <div className="rounded-jl border border-ink-border bg-white p-4 shadow-card">
                <Tabs
                  activeKey={active}
                  onChange={(k) => setActive(k as ChecklistPhase)}
                  items={view.phases.map((p) => ({
                    key: p.phase,
                    label: (
                      <span>
                        {p.title}
                        {p.signed ? <Tag color="success" className="!ml-1">已签署</Tag> : <Tag color="default" className="!ml-1">待签署</Tag>}
                      </span>
                    ),
                  }))}
                />

                <div className="space-y-2">
                  {items.map((it) => (
                    <label
                      key={it.key}
                      className="flex cursor-pointer items-center gap-2 rounded-jl border border-ink-border px-3 py-2 hover:border-jl-primary"
                    >
                      <Checkbox checked={it.checked} onChange={() => toggle(it.key)} />
                      <span className="text-sm text-ink-primary">{it.label}</span>
                      {it.required && <Tag className="!mr-0" color="geekblue">必备</Tag>}
                    </label>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink-border pt-3">
                  <span className="text-xs text-ink-secondary">
                    已完成 {checkedCount}/{items.length}
                    {current?.signedAt && ` · 已于 ${new Date(current.signedAt).toLocaleString('zh-CN')} 签署`}
                  </span>
                  <div className="flex gap-2">
                    <Button icon={<ReloadOutlined />} onClick={() => void load(surgeryId)} loading={loading}>
                      刷新
                    </Button>
                    <Button
                      type="primary"
                      icon={<SafetyCertificateOutlined />}
                      loading={saving}
                      onClick={openSignConfirm}
                    >
                      三方签名确认
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
