/**
 * 健澜科技 jlmedaios - 病历借阅登记前端页（M482-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：借阅表格（病历号/借阅人/借阅天数/超期标记红）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface BorrowRecord {
  medicalRecordId: string;
  borrower: string;
  borrowDays: number;
}

export default function EmrBorrowRegisterPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<BorrowRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-borrow-register", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRecords(data?.records ?? []);
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
    { title: "病历号", dataIndex: "medicalRecordId", key: "medicalRecordId" },
    { title: "借阅人", dataIndex: "borrower", key: "borrower" },
    { title: "借阅天数", dataIndex: "borrowDays", key: "borrowDays" },
    {
      title: "超期状态",
      dataIndex: "borrowDays",
      key: "status",
      render: (days: number) =>
        days > 7 ? <Tag color="red">超期 {days - 7} 天</Tag> : <Tag color="green">正常</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历借阅登记</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={records} columns={columns} rowKey="medicalRecordId" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
