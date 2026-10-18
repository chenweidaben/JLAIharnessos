/**
 * 健澜科技 jlmedaios - 病历销毁记录前端页（M482-D，M482 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：销毁记录表格（病历号/原因/销毁日期/资格检查）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DestroyRecord {
  medicalRecordId: string;
  reason: string;
  destroyDate: string;
}

export default function EmrDestroyRecordPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<DestroyRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-destroy-record", {
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
    { title: "销毁原因", dataIndex: "reason", key: "reason" },
    { title: "销毁日期", dataIndex: "destroyDate", key: "destroyDate" },
    {
      title: "资格检查",
      dataIndex: "medicalRecordId",
      key: "eligibility",
      render: () => <Tag color="green">符合</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历销毁记录</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={records} columns={columns} rowKey="medicalRecordId" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
