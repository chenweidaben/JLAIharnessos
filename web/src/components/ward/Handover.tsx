/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 交接班组件 - 重点患者逐人交接 + AI摘要 + 双签名
 */
import { useState } from 'react';
import {
  Button,
  Card,
  Descriptions,
  Divider,
  Input,
  message,
  Modal,
  Space,
  Spin,
  Tag,
  Timeline,
} from 'antd';
import {
  AuditOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
  UserSwitchOutlined,
} from '@ant-design/icons';
import type { HandoverRecord } from '@/types/ward';
import { clickableProps } from '@/utils/a11y';

interface HandoverProps {
  records: HandoverRecord[];
  onSave: (record: HandoverRecord) => void;
}

export default function Handover({ records, onSave }: HandoverProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [detail, setDetail] = useState<HandoverRecord | null>(null);
  const [signing, setSigning] = useState<'from' | 'to' | null>(null);

  const latest = records[0];

  const aiGenerate = () => {
    setAiLoading(true);
    setTimeout(() => {
      message.success('AI已根据今日查房记录与医嘱变化生成交班摘要');
      setAiLoading(false);
    }, 900);
  };

  const doSign = () => {
    if (!latest || !signing) return;
    const updated: HandoverRecord = {
      ...latest,
      fromSigned: signing === 'from' ? true : latest.fromSigned,
      toSigned: signing === 'to' ? true : latest.toSigned,
    };
    onSave(updated);
    setSigning(null);
    message.success(`${signing === 'from' ? '交班人' : '接班人'}签名完成`);
  };

  return (
    <div className="rounded-lg border border-ink-border bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-ink-border p-3">
        <div className="flex items-center gap-2">
          <UserSwitchOutlined className="text-jl-primary" />
          <span className="font-semibold text-ink-primary">交接班记录</span>
        </div>
        <Space>
          <Button icon={<RobotOutlined />} onClick={aiGenerate} loading={aiLoading}>
            AI生成交班摘要
          </Button>
          <Button
            type="primary"
            icon={<SafetyCertificateOutlined />}
            onClick={() => setSigning('from')}
          >
            交班人签名
          </Button>
          <Button icon={<SafetyCertificateOutlined />} onClick={() => setSigning('to')}>
            接班人签名
          </Button>
        </Space>
      </div>

      {aiLoading && (
        <div className="flex justify-center p-6">
          <Spin tip="AI正在汇总今日查房与医嘱变化..." />
        </div>
      )}

      {latest ? (
        <div className="p-4">
          <Descriptions size="small" bordered column={{ xs: 1, sm: 2, md: 4 }}>
            <Descriptions.Item label="交班时间">{latest.handoverTime}</Descriptions.Item>
            <Descriptions.Item label="交班人">
              {latest.fromDoctor}{' '}
              {latest.fromSigned ? (
                <Tag color="success">已签</Tag>
              ) : (
                <Tag color="warning">未签</Tag>
              )}
            </Descriptions.Item>
            <Descriptions.Item label="接班人">
              {latest.toDoctor}{' '}
              {latest.toSigned ? <Tag color="success">已签</Tag> : <Tag color="warning">未签</Tag>}
            </Descriptions.Item>
            <Descriptions.Item label="班次">
              {latest.shift === 'morning'
                ? '白班'
                : latest.shift === 'evening'
                  ? '小夜班'
                  : '大夜班'}
            </Descriptions.Item>
          </Descriptions>

          <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
            {[
              ['在院', latest.overview.admitted],
              ['新入院', latest.overview.newAdmit],
              ['出院', latest.overview.discharge],
              ['手术', latest.overview.surgery],
              ['病重', latest.overview.serious],
              ['病危', latest.overview.critical],
            ].map(([label, v]) => (
              <div key={label as string} className="rounded-md bg-ink-bg p-2 text-center">
                <div className="text-lg font-bold text-jl-primary">{v}</div>
                <div className="text-xs text-ink-secondary">{label}</div>
              </div>
            ))}
          </div>

          <Divider orientation="left" orientationMargin={0}>
            <span className="text-sm font-semibold">重点患者交接</span>
          </Divider>
          <div className="space-y-2">
            {latest.patients.map((p) => (
              <Card key={p.bedNo} size="small" className="mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-jl-primary">{p.bedNo}</span>
                  <span className="font-medium">{p.name}</span>
                  {p.key && <Tag color="red">重点</Tag>}
                  <span className="text-xs text-ink-secondary">{p.diagnosis}</span>
                </div>
                <div className="mt-1 text-sm">{p.summary}</div>
                <div className="mt-1 grid grid-cols-1 gap-1 text-xs md:grid-cols-3">
                  <div>
                    <span className="text-red-500">异常：</span>
                    {p.abnormalNotes.map((a, i) => (
                      <div key={i}>· {a}</div>
                    ))}
                  </div>
                  <div>
                    <span className="text-amber-600">待办：</span>
                    {p.pendingTasks.map((a, i) => (
                      <div key={i}>· {a}</div>
                    ))}
                  </div>
                  <div>
                    <span className="text-blue-600">注意：</span>
                    {p.precautions.map((a, i) => (
                      <div key={i}>· {a}</div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Divider orientation="left" orientationMargin={0}>
            <span className="text-sm font-semibold">物品 / 环境 / 未完成事项</span>
          </Divider>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
            <div>
              <div className="font-semibold">物品交接</div>
              {latest.items.map((it, i) => (
                <div key={i}>· {it}</div>
              ))}
            </div>
            <div>
              <div className="font-semibold">环境交接</div>
              {latest.environment.map((it, i) => (
                <div key={i}>· {it}</div>
              ))}
            </div>
            <div>
              <div className="font-semibold text-red-500">未完成事项跟踪</div>
              {latest.unfinishedTasks.map((it, i) => (
                <div key={i}>· {it}</div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-sm text-ink-secondary">暂无交接班记录</div>
      )}

      <Divider orientation="left" orientationMargin={0}>
        <span className="text-sm font-semibold flex items-center gap-1">
          <AuditOutlined /> 历史交接班记录
        </span>
      </Divider>
      <div className="px-4 pb-4">
        <Timeline
          items={records.map((r) => ({
            color: r.toSigned ? 'green' : 'gray',
            children: (
              <span
                {...clickableProps(() => setDetail(r))}
                className="text-sm"
                style={{ cursor: 'pointer' }}
              >
                {r.handoverTime} {r.fromDoctor} → {r.toDoctor}
                {r.toSigned ? '（已交接）' : '（待接班人签名）'}
              </span>
            ),
          }))}
        />
      </div>

      <Modal
        title="交接班详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        width={720}
      >
        {detail && (
          <div className="text-sm">
            <p>交班时间：{detail.handoverTime}</p>
            <p>
              交班人/接班人：{detail.fromDoctor} → {detail.toDoctor}
            </p>
            <p>重点患者数：{detail.patients.length}</p>
            <p>未完成事项：{detail.unfinishedTasks.join('；')}</p>
          </div>
        )}
      </Modal>

      <Modal
        title="确认签名"
        open={!!signing}
        onOk={doSign}
        onCancel={() => setSigning(null)}
        okText="确认"
      >
        <p className="text-sm">
          请确认您以「{signing === 'from' ? '交班人' : '接班人'}」身份完成本次电子签名。
        </p>
        <Input.Password placeholder="请输入UKey密码" className="mt-2" />
      </Modal>
    </div>
  );
}
