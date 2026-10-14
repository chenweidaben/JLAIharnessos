/**
 * 健澜科技 jlmedaios - 科研专病队列导出页（纳排筛选 + CSV 导出）
 *
 * 纳入/排除条件表单 → 预览命中队列 → 导出 CSV（浏览器下载，登录态鉴权）。
 * 患者姓名脱敏；演示数据行显式标注，不与真实队列混淆。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Layout,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { DownloadOutlined, ExperimentOutlined, SearchOutlined } from '@ant-design/icons';
import { useCohortExportStore } from '@/store/researchExportStore';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function CohortExportPage() {
  const { rows, loading, exporting, error, filters, setFilters, loadPreview, exportCsv } =
    useCohortExportStore();

  // 首次进入拉一次全量预览
  useEffect(() => {
    void loadPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDemo = rows.length > 0 && rows.every((r) => r.demo);

  return (
    <Watermark content={['健澜科技', '专病队列导出']}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center gap-3 bg-jl-primary px-6 shadow-card">
          <ExperimentOutlined className="text-2xl text-white" />
          <Title level={4} className="!mb-0 !text-white">
            科研专病队列 · 数据导出
          </Title>
          <span className="hidden text-sm text-white/70 lg:block">
            纳入/排除条件筛选 → 预览 → 导出 CSV（脱敏，不用于诊疗）
          </span>
        </Header>

        <Content className="p-4">
          <Form layout="inline" className="mb-4" onFinish={() => void loadPreview()}>
            <Form.Item label="专病/ICD">
              <Input
                allowClear
                placeholder="如：糖尿病 / E11"
                value={filters.disease}
                onChange={(e) => setFilters({ disease: e.target.value })}
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item label="性别">
              <Select
                allowClear
                placeholder="不限"
                value={filters.gender || undefined}
                onChange={(v) => setFilters({ gender: v ?? '' })}
                style={{ width: 90 }}
                options={[
                  { value: '男', label: '男' },
                  { value: '女', label: '女' },
                ]}
              />
            </Form.Item>
            <Form.Item label="年龄">
              <Space.Compact>
                <InputNumber
                  min={0} max={120} placeholder="最小"
                  value={filters.minAge}
                  onChange={(v) => setFilters({ minAge: v ?? undefined })}
                  style={{ width: 80 }}
                />
                <InputNumber
                  min={0} max={120} placeholder="最大"
                  value={filters.maxAge}
                  onChange={(v) => setFilters({ maxAge: v ?? undefined })}
                  style={{ width: 80 }}
                />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="最短住院(天)">
              <InputNumber
                min={0} max={365} placeholder="如 7"
                value={filters.minLos}
                onChange={(v) => setFilters({ minLos: v ?? undefined })}
                style={{ width: 90 }}
              />
            </Form.Item>
            <Form.Item label="科室">
              <Input
                allowClear
                placeholder="如：内分泌"
                value={filters.department}
                onChange={(e) => setFilters({ department: e.target.value })}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={loading}>
                  查询
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  loading={exporting}
                  onClick={() => void exportCsv()}
                >
                  导出 CSV
                </Button>
              </Space>
            </Form.Item>
          </Form>

          {error && (
            <Alert type="error" showIcon className="mb-3" message={error} />
          )}
          {isDemo && (
            <Alert
              type="warning"
              showIcon
              className="mb-3"
              message="当前纳排条件无真实命中，已返回演示数据行（导出后可在 CSV 中识别“演示数据”列）。"
            />
          )}

          <Spin spinning={loading}>
            <Table
              rowKey="patientId"
              size="small"
              pagination={false}
              dataSource={rows}
              columns={[
                { title: '患者ID', dataIndex: 'patientId' },
                { title: '姓名', dataIndex: 'name' },
                { title: '性别', dataIndex: 'gender', width: 70 },
                { title: '年龄', dataIndex: 'age', width: 70 },
                { title: '科室', dataIndex: 'department' },
                { title: '主诊断', dataIndex: 'primaryDx' },
                { title: 'ICD-10', dataIndex: 'icd', width: 110 },
                { title: '住院天数', dataIndex: 'losDays', width: 90 },
                { title: '最近就诊', dataIndex: 'lastVisit', width: 110 },
                {
                  title: '数据来源',
                  dataIndex: 'demo',
                  width: 100,
                  render: (demo: boolean) =>
                    demo ? <Tag color="orange">演示</Tag> : <Tag color="green">真实</Tag>,
                },
              ]}
            />
          </Spin>
        </Content>
      </Layout>
    </Watermark>
  );
}
