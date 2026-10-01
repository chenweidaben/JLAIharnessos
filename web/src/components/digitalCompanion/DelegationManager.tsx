/**
 * 健澜科技 jlmedaios - 家属代办授权管理（M3-Q）
 *
 * 选择就诊人 → 勾选代办范围 → 授权；查看历史；撤销。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Empty,
  Form,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd';
import {
  useDigitalCompanionStore,
} from '@/store/digitalCompanionStore';

const { Text, Paragraph } = Typography;

const SCOPE_META: { code: string; label: string; risk: string }[] = [
  { code: 'booking', label: '预约挂号/退号', risk: 'low' },
  { code: 'consultation', label: '在线问诊/查阅病历', risk: 'low' },
  { code: 'report', label: '查阅检查检验报告', risk: 'low' },
  { code: 'medication', label: '处方续方/药品配送', risk: 'medium' },
  { code: 'payment', label: '在线支付/退费', risk: 'high' },
];

const riskColor: Record<string, string> = {
  low: 'green',
  medium: 'orange',
  high: 'red',
};

export function DelegationManager() {
  const {
    profiles,
    currentProfile,
    history,
    selectProfile,
    grant,
    revoke,
    loadHistory,
    submitting,
  } = useDigitalCompanionStore();

  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (currentProfile) {
      setSelectedScopes(currentProfile.delegatedScopes);
      void loadHistory(currentProfile.id);
    } else {
      setSelectedScopes([]);
    }
  }, [currentProfile, loadHistory]);

  const handleGrant = async () => {
    if (!currentProfile) return;
    setError('');
    const hasHighRisk = selectedScopes.includes('payment');
    try {
      await grant({
        profileId: currentProfile.id,
        scopes: selectedScopes,
        note: note || undefined,
        confirmHighRisk: hasHighRisk,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '授权失败');
    }
  };

  const handleRevoke = async () => {
    if (!currentProfile) return;
    setError('');
    try {
      await revoke(currentProfile.id, note || undefined);
      setSelectedScopes([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤销失败');
    }
  };

  const historyColumns = [
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
    {
      title: '动作',
      dataIndex: 'action',
      key: 'action',
      render: (a: string) => {
        const map: Record<string, { text: string; color: string }> = {
          grant: { text: '授予', color: 'green' },
          update: { text: '更新', color: 'blue' },
          revoke: { text: '撤销', color: 'red' },
        };
        const m = map[a] ?? { text: a, color: 'default' };
        return <Tag color={m.color}>{m.text}</Tag>;
      },
    },
    {
      title: '范围',
      dataIndex: 'scopes',
      key: 'scopes',
      render: (scopes: string[]) =>
        scopes.length === 0 ? (
          <Text type="secondary">—</Text>
        ) : (
          scopes.map((s) => {
            const meta = SCOPE_META.find((m) => m.code === s);
            return <Tag key={s}>{meta?.label ?? s}</Tag>;
          })
        ),
    },
  ];

  return (
    <Card title="家属代办授权" size="small">
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        <Select
          style={{ width: '100%' }}
          placeholder="选择就诊人"
          value={currentProfile?.id}
          onChange={(v) => {
            const p = profiles.find((x) => x.id === v) ?? null;
            selectProfile(p);
          }}
          options={profiles.map((p) => ({
            value: p.id,
            label: `${p.nameMasked ?? '就诊人'}（${relationLabel(p.relation)}）`,
          }))}
        />

        {!currentProfile ? (
          <Empty description="请先选择就诊人" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <>
            <div>
              <Paragraph style={{ marginBottom: 8 }}>
                <Text strong>授权代办事项</Text>
                <Text type="secondary">（未勾选的事项家属不能代办）</Text>
              </Paragraph>
              <Checkbox.Group
                value={selectedScopes}
                onChange={(v) => setSelectedScopes(v as string[])}
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {SCOPE_META.map((m) => (
                  <Checkbox key={m.code} value={m.code}>
                    {m.label}
                    <Tag
                      color={riskColor[m.risk]}
                      style={{ marginLeft: 8 }}
                    >
                      {m.risk === 'high'
                        ? '高风险'
                        : m.risk === 'medium'
                          ? '中风险'
                          : '低风险'}
                    </Tag>
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </div>

            <Form layout="vertical">
              <Form.Item label="备注（可选）" style={{ marginBottom: 8 }}>
                <input
                  className="ant-input"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="如：子女代办，本人知情同意"
                />
              </Form.Item>
            </Form>

            {error && (
              <Alert
                type="error"
                showIcon
                message={error}
                data-testid="delegation-error"
              />
            )}

            <Space>
              <Button
                type="primary"
                loading={submitting}
                onClick={handleGrant}
                disabled={selectedScopes.length === 0}
              >
                保存授权
              </Button>
              <Button
                danger
                loading={submitting}
                onClick={handleRevoke}
                disabled={currentProfile.delegatedScopes.length === 0}
              >
                撤销全部授权
              </Button>
            </Space>

            <div>
              <Text strong>授权历史</Text>
              <Table
                size="small"
                rowKey="id"
                columns={historyColumns}
                dataSource={history}
                pagination={{ pageSize: 5 }}
                style={{ marginTop: 8 }}
              />
            </div>
          </>
        )}
      </Space>
    </Card>
  );
}

function relationLabel(r: string): string {
  const map: Record<string, string> = {
    self: '本人',
    parent: '父母',
    child: '子女',
    spouse: '配偶',
    other: '其他',
  };
  return map[r] ?? r;
}
