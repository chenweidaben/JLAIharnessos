/**
 * 健澜科技 jlmedaios - 科研队列列表组件（M5-B）
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useState } from 'react';
import { Button, Card, Form, Input, InputNumber, Modal, Select, Table, Tag } from 'antd';
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { useResearchStore } from '@/store/researchStore';
import type { CohortCriteria, ResearchCohort } from '@/types/research';

const STATUS_COLOR: Record<string, string> = {
  draft: 'default',
  active: 'blue',
  archived: 'green',
};
const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  archived: '已归档',
};

function splitList(text: string | undefined): string[] {
  if (!text) return [];
  return text
    .split(/[,，、;；]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CohortList() {
  const { cohorts, loading, currentId, loadCohorts, openCohort, createCohort } =
    useResearchStore();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const columns = [
    { title: '队列名称', dataIndex: 'name', key: 'name' },
    { title: '目标疾病', dataIndex: 'disease', key: 'disease' },
    {
      title: '疾病编码',
      dataIndex: 'diseaseCode',
      key: 'diseaseCode',
      render: (v: string | null) => v ?? '—',
    },
    {
      title: '状态',
      key: 'status',
      render: (_: unknown, row: ResearchCohort) => (
        <Tag color={STATUS_COLOR[row.status]}>
          {STATUS_LABEL[row.status] ?? row.status}
        </Tag>
      ),
    },
    {
      title: '最近运行',
      key: 'last',
      render: (_: unknown, row: ResearchCohort) =>
        row.lastRunAt ? `新增 ${row.lastRunAdded}` : '未运行',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: unknown, row: ResearchCohort) => (
        <Button type="link" size="small" onClick={() => void openCohort(row.id)}>
          打开
        </Button>
      ),
    },
  ];

  const onSubmit = async () => {
    const values = await form.validateFields();
    const criteria: CohortCriteria = {
      include: {
        minAge: values.minAge,
        maxAge: values.maxAge,
        gender: values.gender,
        diagnoses: splitList(values.includeDiagnoses),
        tags: splitList(values.includeTags),
      },
      exclude: {
        diagnoses: splitList(values.excludeDiagnoses),
        tags: splitList(values.excludeTags),
      },
    };
    const ok = await createCohort({
      name: values.name,
      disease: values.disease,
      diseaseCode: values.diseaseCode || null,
      criteria,
    });
    if (ok) {
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <Card
      className="mb-4"
      title={`科研专病队列（${cohorts.length}）`}
      extra={
        <span className="flex gap-2">
          <Button icon={<ReloadOutlined />} onClick={() => void loadCohorts()}>
            刷 新
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setModalOpen(true)}
          >
            新建队列
          </Button>
        </span>
      }
    >
      <Table<ResearchCohort>
        rowKey="id"
        size="middle"
        loading={loading}
        columns={columns}
        dataSource={cohorts}
        pagination={{ pageSize: 10 }}
        rowClassName={(row) => (row.id === currentId ? 'ant-table-row-selected' : '')}
        onRow={(row) => ({ onClick: () => void openCohort(row.id) })}
      />

      <Modal
        title="新建科研专病队列"
        open={modalOpen}
        onOk={() => void onSubmit()}
        onCancel={() => setModalOpen(false)}
        okText="创建"
        cancelText="取消"
        width={640}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="队列名称"
            rules={[{ required: true, message: '请输入队列名称' }]}
          >
            <Input placeholder="如 2型糖尿病专病队列" />
          </Form.Item>
          <span className="flex gap-3">
            <Form.Item
              name="disease"
              label="目标疾病"
              className="flex-1"
              rules={[{ required: true, message: '请输入目标疾病' }]}
            >
              <Input placeholder="如 2型糖尿病" />
            </Form.Item>
            <Form.Item name="diseaseCode" label="疾病编码（ICD）" className="w-40">
              <Input placeholder="E11" />
            </Form.Item>
          </span>
          <span className="flex gap-3">
            <Form.Item name="minAge" label="最小年龄" className="flex-1">
              <InputNumber min={0} className="w-full" placeholder="如 40" />
            </Form.Item>
            <Form.Item name="maxAge" label="最大年龄" className="flex-1">
              <InputNumber min={0} className="w-full" placeholder="如 75" />
            </Form.Item>
            <Form.Item name="gender" label="性别" className="flex-1">
              <Select
                allowClear
                placeholder="不限"
                options={[
                  { value: '男', label: '男' },
                  { value: '女', label: '女' },
                ]}
              />
            </Form.Item>
          </span>
          <Form.Item name="includeDiagnoses" label="纳入诊断（名称或编码，逗号分隔）">
            <Input placeholder="如 2型糖尿病,E11" />
          </Form.Item>
          <Form.Item name="includeTags" label="纳入标签（逗号分隔）">
            <Input placeholder="如 高血压,糖尿病" />
          </Form.Item>
          <Form.Item name="excludeDiagnoses" label="排除诊断（逗号分隔）">
            <Input placeholder="如 1型糖尿病" />
          </Form.Item>
          <Form.Item name="excludeTags" label="排除标签（逗号分隔）">
            <Input placeholder="如 妊娠" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
