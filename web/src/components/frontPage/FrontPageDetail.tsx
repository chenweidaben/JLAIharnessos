/**
 * 健澜科技 jlmedaios - 病案首页详情组件（M3-A）
 *
 * 入出院/诊断/费用快照展示；编码员填 ICD 编码并保存；
 * 第二人质控通过/退回（职责分离：编码员本人不能自审，后端强制）；
 * 质控通过后归档；缺陷清单与质控签名链展示。
 *
 * 医疗严谨：质控结论由质控人本人签名；AI 仅辅助、不产生最终结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Descriptions,
  Drawer,
  Empty,
  List,
  Space,
  Tag,
  Typography,
} from 'antd';
import { useFrontPageStore } from '@/store/frontPageStore';
import { useAuthStore } from '@/store/authStore';
import type { FrontPageDefect } from '@/types/frontPage';

const SEVERITY_COLOR: Record<string, string> = {
  block: 'red',
  major: 'orange',
  minor: 'default',
};
const SEVERITY_LABEL: Record<string, string> = { block: '阻断', major: '主要', minor: '次要' };

function DefectItem({ defect }: { defect: FrontPageDefect }) {
  return (
    <List.Item data-testid="fp-defect-item">
      <Space wrap size={6} className="w-full">
        <Tag color={SEVERITY_COLOR[defect.severity]}>{SEVERITY_LABEL[defect.severity]}</Tag>
        <Typography.Text>{defect.message}</Typography.Text>
        <Typography.Text type="secondary" className="text-xs">{defect.field}</Typography.Text>
      </Space>
    </List.Item>
  );
}

export default function FrontPageDetail() {
  const {
    currentId, detail, submitting, openPage, saveCoding, review, archive,
  } = useFrontPageStore();
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [primaryCode, setPrimaryCode] = useState('');
  const [comment, setComment] = useState('');
  const [acknowledge, setAcknowledge] = useState(false);

  const open = Boolean(currentId);
  const onClose = () => {
    useFrontPageStore.setState({ currentId: null, detail: null });
    setPrimaryCode('');
    setComment('');
    setAcknowledge(false);
  };

  const page = detail?.page ?? null;
  const defects = page?.defects ?? [];
  const hardIssues = defects.filter((d) => d.severity !== 'minor');
  const isCoder = Boolean(page?.codedBy && currentUserId === page.codedBy);

  const canCode = page?.status === 'draft' || page?.status === 'coding';
  const canReview = page?.status === 'coding';
  const canArchive = page?.status === 'qc';
  const passBlocked = hardIssues.length > 0 && (!acknowledge || !comment.trim());

  const handleSaveCoding = async () => {
    if (!page) return;
    const ok = await saveCoding({
      version: page.version,
      primaryDiagnosis: page.primaryDiagnosis,
      primaryDiagnosisCode: primaryCode || page.primaryDiagnosisCode,
      secondaryDiagnoses: page.secondaryDiagnoses,
      operations: page.operations,
      totalFee: page.totalFee,
    });
    if (ok && currentId) await openPage(currentId);
  };

  const handleReview = async (decision: 'pass' | 'return') => {
    if (!page) return;
    const ok = await review({
      version: page.version,
      decision,
      comment: comment.trim() || null,
      defects,
      acknowledgeIssues: acknowledge,
    });
    if (ok && currentId) await openPage(currentId);
  };

  const handleArchive = async () => {
    const ok = await archive();
    if (ok && currentId) await openPage(currentId);
  };

  return (
    <Drawer
      title="病案首页"
      width={860}
      open={open}
      onClose={onClose}
      destroyOnClose
    >
      {page && detail ? (
        <Space direction="vertical" size={16} className="w-full">
          <Descriptions bordered size="small" column={2} data-testid="fp-descriptions">
            <Descriptions.Item label="患者">
              {detail.patient ? `${detail.patient.nameMasked}（${detail.patient.mrn}）` : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="科室">{detail.visit.department}</Descriptions.Item>
            <Descriptions.Item label="入院时间">
              {page.admitAt ? new Date(page.admitAt).toLocaleString('zh-CN', { hour12: false }) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="出院时间">
              {page.dischargeAt ? new Date(page.dischargeAt).toLocaleString('zh-CN', { hour12: false }) : '—'}
            </Descriptions.Item>
            <Descriptions.Item label="主诊断" span={2}>{page.primaryDiagnosis ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="ICD 编码">{page.primaryDiagnosisCode ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="总费用">{page.totalFee ?? '—'}</Descriptions.Item>
            <Descriptions.Item label="状态">
              <Tag color={page.status === 'archived' ? 'green' : 'blue'}>{page.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="版本">v{page.version}</Descriptions.Item>
          </Descriptions>

          {canCode ? (
            <Card size="small" title="编码员填写（ICD）" data-testid="fp-code-card">
              <Space.Compact className="w-full">
                <input
                  className="w-full rounded border border-gray-300 p-2"
                  placeholder="主诊断 ICD 编码，如 C34.900"
                  defaultValue={page.primaryDiagnosisCode ?? ''}
                  onChange={(e) => setPrimaryCode(e.target.value)}
                  data-testid="fp-code-input"
                />
                <Button
                  type="primary"
                  loading={submitting}
                  onClick={() => void handleSaveCoding()}
                  data-testid="fp-save-code-btn"
                >
                  保存编码
                </Button>
              </Space.Compact>
            </Card>
          ) : null}

          <Card size="small" title={`完整性质检缺陷（${defects.length}）`} data-testid="fp-defects-card">
            {defects.length > 0 ? (
              <List
                size="small"
                dataSource={defects}
                renderItem={(d) => <DefectItem defect={d} />}
              />
            ) : (
              <Empty description="未发现缺陷" />
            )}
          </Card>

          {hardIssues.length > 0 ? (
            <Alert
              type="warning"
              showIcon
              data-testid="fp-hard-alert"
              message={`存在 ${hardIssues.length} 项阻断/主要缺陷`}
              description="如经复核仍需通过质控，须勾选确认并在意见中写明理由；否则应退回编码员整改。"
            />
          ) : null}

          {canReview ? (
            <Card size="small" title="第二人质控（本人编码不可自审）" data-testid="fp-review-card">
              <Space direction="vertical" className="w-full" size={12}>
                <textarea
                  className="w-full rounded border border-gray-300 p-2"
                  rows={3}
                  placeholder="质控意见（退回须说明整改要求；带缺陷通过须写明临床理由）"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  data-testid="fp-comment"
                />
                {hardIssues.length > 0 ? (
                  <Checkbox
                    checked={acknowledge}
                    onChange={(e) => setAcknowledge(e.target.checked)}
                    data-testid="fp-acknowledge"
                  >
                    我已知悉上述缺陷，经复核确认处理
                  </Checkbox>
                ) : null}
                <Space>
                  <Button
                    type="primary"
                    danger
                    loading={submitting}
                    disabled={!comment.trim()}
                    onClick={() => void handleReview('return')}
                  >
                    退回编码
                  </Button>
                  <Button
                    type="primary"
                    loading={submitting}
                    disabled={passBlocked}
                    onClick={() => void handleReview('pass')}
                    data-testid="fp-pass-btn"
                  >
                    质控通过
                  </Button>
                </Space>
                {isCoder ? (
                  <Typography.Text type="warning" className="text-xs" data-testid="fp-self-warn">
                    您是该首页编码员，不能质控本人首页，请由第二人处理。
                  </Typography.Text>
                ) : null}
              </Space>
            </Card>
          ) : null}

          {canArchive ? (
            <Button
              type="primary"
              loading={submitting}
              onClick={() => void handleArchive()}
              data-testid="fp-archive-btn"
            >
              归档
            </Button>
          ) : null}

          <Card size="small" title={`质控签名链（${detail.reviews.length}）`}>
            <List
              size="small"
              dataSource={detail.reviews}
              renderItem={(r) => (
                <List.Item>
                  <Space wrap>
                    <Tag color={r.decision === 'pass' ? 'green' : 'volcano'}>
                      {r.decision === 'pass' ? '通过' : '退回'}
                    </Tag>
                    <span>{new Date(r.signatureAt).toLocaleString('zh-CN', { hour12: false })}</span>
                    <Typography.Text type="secondary" className="text-xs">
                      链 {r.prevHash ? r.prevHash.slice(0, 8) : 'GENESIS'}… → {r.curHash.slice(0, 8)}…
                    </Typography.Text>
                    {r.comment ? <Typography.Text className="text-xs">{r.comment}</Typography.Text> : null}
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Space>
      ) : null}
    </Drawer>
  );
}
