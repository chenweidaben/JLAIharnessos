/**
 * 健澜科技 jlmedaios - 医护端预问诊报告查看（M3-P）
 *
 * 报告列表 + 详情 + 医生采用（consumed）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Card, Table, Button, Space, Typography, Tag, Modal, Descriptions, Empty, Spin,
} from 'antd';
import {
  EyeOutlined, CheckOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { useSmartTriageStore } from '@/store/smartTriageStore';
import type { PreliminaryConsultation } from '@/types/smartTriage';

const { Text, Paragraph } = Typography;

export function PreliminaryReportView() {
  const {
    loading, staffPreliminary,
    loadStaffPreliminary, consumePreliminary,
  } = useSmartTriageStore();
  const [detail, setDetail] = useState<PreliminaryConsultation | null>(null);

  useEffect(() => {
    void loadStaffPreliminary();
  }, [loadStaffPreliminary]);

  const columns = [
    { title: '目标科室', dataIndex: 'targetDepartment', key: 'dept', width: 140 },
    { title: '主诉', dataIndex: 'chiefComplaint', key: 'chief', ellipsis: true },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'blue' : 'default'}>
          {s === 'completed' ? '待采用' : '已采用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 160,
      render: (_: unknown, r: PreliminaryConsultation) => (
        <Space>
          <Button
            size="small"
            icon={<EyeOutlined />}
            data-testid={`view-${r.id}`}
            onClick={() => setDetail(r)}
          >
            查看
          </Button>
          {r.status === 'completed' && (
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              data-testid={`consume-${r.id}`}
              onClick={() => {
                Modal.confirm({
                  title: '采用该预问诊报告？',
                  content: '采用后可作为接诊参考，最终诊断仍由医师确认。',
                  onOk: async () => {
                    await consumePreliminary(r.id);
                    setDetail(null);
                  },
                });
              }}
            >
              采用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="预问诊报告（医护端）"
      extra={
        <Button
          size="small"
          icon={<ReloadOutlined />}
          data-testid="refresh-reports"
          onClick={() => void loadStaffPreliminary()}
        >
          刷新
        </Button>
      }
    >
      {loading && staffPreliminary.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <Spin />
        </div>
      ) : staffPreliminary.length === 0 ? (
        <Empty description="暂无预问诊报告" />
      ) : (
        <Table
          dataSource={staffPreliminary}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      )}

      <Modal
        title="预问诊报告详情"
        open={!!detail}
        onCancel={() => setDetail(null)}
        footer={[
          <Button key="close" onClick={() => setDetail(null)}>关闭</Button>,
          detail?.status === 'completed' && (
            <Button
              key="consume"
              type="primary"
              icon={<CheckOutlined />}
              data-testid="modal-consume"
              onClick={async () => {
                await consumePreliminary(detail.id);
                setDetail(null);
              }}
            >
              采用报告
            </Button>
          ),
        ]}
        width={640}
      >
        {detail && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Descriptions column={2} size="small" bordered>
              <Descriptions.Item label="目标科室">
                {detail.targetDepartment ?? '未指定'}
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                {detail.status === 'completed' ? '待采用' : '已采用'}
              </Descriptions.Item>
              <Descriptions.Item label="主诉" span={2}>
                {detail.chiefComplaint}
              </Descriptions.Item>
            </Descriptions>
            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                background: '#fafafa',
                padding: 12,
                borderRadius: 6,
                maxHeight: 320,
                overflow: 'auto',
              }}
              data-testid="report-text"
            >
              {detail.reportText}
            </Paragraph>
            <Text type="secondary" style={{ fontSize: 12 }}>
              报告为患者自填，仅供参考，不构成诊断；最终诊断以医师面诊为准。
            </Text>
          </Space>
        )}
      </Modal>
    </Card>
  );
}

export default PreliminaryReportView;
