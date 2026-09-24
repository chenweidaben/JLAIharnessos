/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 转诊 / 会诊申请面板：院内/院外转诊、科内/全院/MDT 会诊。
 */
import React, { useState } from 'react';
import { Button, Form, Input, Select, Space, Tabs, Tag, message } from 'antd';
import { ArrowRightOutlined, TeamOutlined } from '@ant-design/icons';

const DEPT_OPTIONS = [
  '心血管内科',
  '呼吸内科',
  '消化内科',
  '内分泌科',
  '神经内科',
  '肾内科',
  '急诊科',
  '心外科',
];

export const ReferralPanel: React.FC = () => {
  const [tab, setTab] = useState('referral');

  return (
    <Tabs
      size="small"
      activeKey={tab}
      onChange={setTab}
      items={[
        {
          key: 'referral',
          label: (
            <Space>
              <ArrowRightOutlined />
              转诊申请
            </Space>
          ),
          children: (
            <Form layout="vertical" size="small">
              <Form.Item label="转诊类型" required>
                <Select
                  options={[
                    { value: 'inward', label: '院内转诊' },
                    { value: 'outward', label: '院外转诊' },
                    { value: 'upward', label: '上转（上级医院）' },
                    { value: 'downward', label: '下转（基层）' },
                  ]}
                  defaultValue="inward"
                />
              </Form.Item>
              <Form.Item label="目标科室">
                <Select
                  mode="multiple"
                  options={DEPT_OPTIONS.map((d) => ({ value: d, label: d }))}
                  placeholder="选择目标科室"
                />
              </Form.Item>
              <Form.Item label="转诊原因" required>
                <Input.TextArea rows={3} placeholder="如：病情复杂，需心内科介入评估" />
              </Form.Item>
              <Form.Item label="病情摘要">
                <Input.TextArea rows={3} placeholder="主诉、现病史、关键检查结果" />
              </Form.Item>
              <Form.Item label="已做检查和治疗">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Form.Item label="转诊建议">
                <Input.TextArea rows={2} />
              </Form.Item>
              <Button
                type="primary"
                style={{ background: '#0A4D8C' }}
                block
                onClick={() =>
                  message.info('转诊工作流正在与院内流程引擎对接（二期），当前为表单界面，暂未提交。')
                }
              >
                提交转诊
              </Button>
            </Form>
          ),
        },
        {
          key: 'consult',
          label: (
            <Space>
              <TeamOutlined />
              会诊申请
            </Space>
          ),
          children: (
            <Form layout="vertical" size="small">
              <Form.Item label="会诊类型" required>
                <Select
                  options={[
                    { value: 'intra_dept', label: '科内会诊' },
                    { value: 'whole_hospital', label: '全院会诊' },
                    { value: 'mdt', label: 'MDT 多学科会诊' },
                  ]}
                  defaultValue="whole_hospital"
                />
              </Form.Item>
              <Form.Item label="邀请科室">
                <Select
                  mode="multiple"
                  options={DEPT_OPTIONS.map((d) => ({ value: d, label: d }))}
                />
              </Form.Item>
              <Form.Item label="紧急程度" required>
                <Select
                  options={[
                    { value: 'routine', label: '普通' },
                    { value: 'urgent', label: '紧急' },
                    { value: 'emergency', label: '急会诊（10 分钟内）' },
                  ]}
                  defaultValue="routine"
                />
              </Form.Item>
              <Form.Item label="会诊目的" required>
                <Input.TextArea rows={3} />
              </Form.Item>
              <Form.Item label="病情摘要">
                <Input.TextArea rows={3} />
              </Form.Item>
              <Button
                type="primary"
                style={{ background: '#0A4D8C' }}
                block
                onClick={() =>
                  message.info('会诊工作流正在与院内流程引擎对接（二期），当前为表单界面，暂未发送。')
                }
              >
                发送会诊
              </Button>
            </Form>
          ),
        },
      ]}
      tabBarExtraContent={<Tag color="default">二期对接</Tag>}
    />
  );
};

export default ReferralPanel;
