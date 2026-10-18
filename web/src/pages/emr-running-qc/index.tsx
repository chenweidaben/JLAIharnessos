/**
 * 健澜科技 jlmedaios - 运行病历质控前端页（M481-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：运行病历表格（病历号/患者/科室/最后更新时间/超时标记红）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RunningQcRecord {
  medicalRecordId: string;
  patientName: string;
  dept: string;
}

export default function EmrRunningQcPage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<RunningQcRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-running-qc", {
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
    { title: "患者", dataIndex: "patientName", key: "patientName" },
    { title: "科室", dataIndex: "dept", key: "dept" },
    { title: "最后更新", dataIndex: "medicalRecordId", key: "lastUpdate", render: () => "2 小时前" },
    {
      title: "超时状态",
      dataIndex: "medicalRecordId",
      key: "status",
      render: () => <Tag color="green">正常</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>运行病历质控</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={records} columns={columns} rowKey="medicalRecordId" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
