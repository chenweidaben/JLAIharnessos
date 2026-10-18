/**
 * 健澜科技 jlmedaios - 病历数据导出与区域上报前端页（M463-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：导出任务管理表（任务号/医院/病历类型/状态/时间）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExportTask {
  patientId: string;
  patientName: string;
  hospitalCode: string;
  recordType: string;
  exportedAt: string;
}

export default function EmrExportPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<ExportTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-export", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setTasks(data?.tasks ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: "任务号（患者ID）", dataIndex: "patientId", key: "patientId" },
    {
      title: "患者（脱敏）",
      dataIndex: "patientName",
      key: "patientName",
      render: (name: string) => <Tag color="blue">{name}</Tag>,
    },
    { title: "医院编码", dataIndex: "hospitalCode", key: "hospitalCode" },
    { title: "病历类型", dataIndex: "recordType", key: "recordType" },
    { title: "导出时间", dataIndex: "exportedAt", key: "exportedAt" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历数据导出与区域上报</Title>
        <Card title="导出任务管理表" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table rowKey="patientId" columns={columns} dataSource={tasks} pagination={false} size="small" />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
