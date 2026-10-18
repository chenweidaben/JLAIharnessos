/**
 * 健澜科技 jlmedaios - 病历封存解封前端页（M482-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：封存列表（病历号/原因/状态 sealed 红/unsealed 绿）+ 封存/解封按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SealRecord {
  medicalRecordId: string;
  reason: string;
  status: string;
}

const initialRecords: SealRecord[] = [
  { medicalRecordId: "MR001", reason: "医疗纠纷", status: "sealed" },
  { medicalRecordId: "MR002", reason: "司法鉴定", status: "sealed" },
];

export default function EmrSealUnsealPage() {
  const [records, setRecords] = useState<SealRecord[]>(initialRecords);
  const [loading, setLoading] = useState(false);

  const toggle = async (record: SealRecord) => {
    setLoading(true);
    try {
      const action = record.status === "sealed" ? "unseal" : "seal";
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-seal-unseal", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ medicalRecordId: record.medicalRecordId, reason: record.reason, action }),
      });
      if (resp.ok) {
        const data = await resp.json();
        const updated = data?.record;
        setRecords((prev) =>
          prev.map((r) => (r.medicalRecordId === record.medicalRecordId ? { ...r, status: updated?.status ?? r.status } : r)),
        );
        message.success(`${record.medicalRecordId} 已${action === "seal" ? "封存" : "解封"}`);
      }
    } catch {
      message.error("操作失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历封存解封</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <List
              dataSource={records}
              renderItem={(record: SealRecord) => (
                <List.Item>
                  <Text strong style={{ width: 100 }}>{record.medicalRecordId}</Text>
                  <Text style={{ marginRight: 16 }}>{record.reason}</Text>
                  <Tag color={record.status === "sealed" ? "red" : "green"} style={{ marginRight: 16 }}>
                    {record.status === "sealed" ? "已封存" : "已解封"}
                  </Tag>
                  <Button
                    size="small"
                    onClick={() => toggle(record)}
                    style={{ background: VI.accent, color: "#fff" }}
                  >
                    {record.status === "sealed" ? "解封" : "封存"}
                  </Button>
                </List.Item>
              )}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
