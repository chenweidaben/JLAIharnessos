/**
 * 健澜科技 jlmedaios - 病历电子签名与认证前端页（M463-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：签名列表（病历号/签名人/签名时间）+ 验签状态徽章（绿 valid/红 invalid）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Badge, Button, Card, Input, Layout, message, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SignatureRecord {
  noteId: string;
  authorId: string;
  signedAt: string;
  valid: boolean;
}

export default function EmrSignaturePage() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<SignatureRecord[]>([]);
  const [noteIdInput, setNoteIdInput] = useState("");

  const fetchList = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-signature/demo001", {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        const rec = data?.record;
        if (rec) {
          setRecords([{
            noteId: "demo001",
            authorId: rec.authorId,
            signedAt: rec.signedAt,
            valid: data?.valid ?? false,
          }]);
        }
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

  const handleVerify = async () => {
    if (!noteIdInput.trim()) {
      message.warning("请输入病历号");
      return;
    }
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch(`/api/v1/emr-signature/${noteIdInput.trim()}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        message.success(data?.valid ? "验签通过" : "验签失败");
      } else {
        message.warning("验签失败（后端 route 未就绪）");
      }
    } catch {
      message.warning("验签失败（后端 route 未就绪）");
    }
  };

  const columns = [
    { title: "病历号", dataIndex: "noteId", key: "noteId" },
    { title: "签名人", dataIndex: "authorId", key: "authorId" },
    { title: "签名时间", dataIndex: "signedAt", key: "signedAt" },
    {
      title: "验签状态",
      dataIndex: "valid",
      key: "valid",
      render: (valid: boolean) =>
        valid ? <Badge status="success" text={<Tag color="green">valid</Tag>} /> : <Badge status="error" text={<Tag color="red">invalid</Tag>} />,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历电子签名与认证</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            placeholder="输入病历号验签"
            value={noteIdInput}
            onChange={(e) => setNoteIdInput(e.target.value)}
            style={{ width: 240, marginRight: 8 }}
          />
          <Button type="primary" style={{ background: VI.accent }} onClick={handleVerify}>验签</Button>
        </Card>
        <Card title="签名列表" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table rowKey="noteId" columns={columns} dataSource={records} pagination={false} size="small" />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
