/**
 * 健澜科技 jlmedaios - 病历归档与封存管理前端页（M462-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：归档表格（患者/出院日期/归档天数/可归档状态/封存按钮）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, message, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveItem {
  recordId: string;
  patientName: string;
  dischargedAt: string;
  sealed: boolean;
  archiveDays: number;
  archivable: boolean;
}

export default function EmrArchivePage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ArchiveItem[]>([]);

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setItems(data?.items ?? []);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchList();
  }, []);

  const handleSeal = async (record: ArchiveItem) => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch(`/api/v1/emr-archive/${record.recordId}/seal`, {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        message.success("封存成功");
        void fetchList();
      } else {
        message.warning("封存失败（出院未满 7 天或后端 route 未就绪）");
      }
    } catch {
      message.warning("封存失败（后端 route 未就绪）");
    }
  };

  const columns = [
    { title: "患者", dataIndex: "patientName", key: "patientName" },
    { title: "出院日期", dataIndex: "dischargedAt", key: "dischargedAt" },
    { title: "归档天数", dataIndex: "archiveDays", key: "archiveDays" },
    {
      title: "可归档",
      dataIndex: "archivable",
      key: "archivable",
      render: (archivable: boolean) =>
        archivable ? <Tag color="green">可归档</Tag> : <Tag color="orange">未满7天</Tag>,
    },
    {
      title: "封存状态",
      dataIndex: "sealed",
      key: "sealed",
      render: (sealed: boolean) =>
        sealed ? <Tag color="blue">已封存</Tag> : <Tag>未封存</Tag>,
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: ArchiveItem) =>
        record.archivable && !record.sealed ? (
          <Button size="small" type="primary" onClick={() => handleSeal(record)}>封存</Button>
        ) : (
          <span>—</span>
        ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历归档与封存管理</Title>
        <Card title="归档列表" headStyle={{ background: VI.deep, color: "#fff" }} loading={loading}>
          <Table rowKey="recordId" columns={columns} dataSource={items} pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
