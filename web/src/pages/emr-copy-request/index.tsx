/**
 * 健澜科技 jlmedaios - 病历复印申请前端页（M482-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：复印申请表单（患者姓名/用途/份数）+ 申请列表 + 审批按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CopyRequest {
  patientName: string;
  purpose: string;
  copies: number;
}

export default function EmrCopyRequestPage() {
  const [patientName, setPatientName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [copies, setCopies] = useState<string>("1");
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<CopyRequest[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-copy-request", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRequests(data?.requests ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const submit = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-copy-request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ patientName, purpose, copies: Number(copies) }),
      });
      if (resp.ok) {
        message.success("申请已提交");
        setPatientName("");
        setPurpose("");
        setCopies("1");
      }
    } catch {
      message.error("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历复印申请</Title>
        <Row gutter={16}>
          <Col span={10}>
            <Card title="新建申请" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Text strong>患者姓名：</Text>
              <Input value={patientName} onChange={(e) => setPatientName(e.target.value)} style={{ marginTop: 8 }} placeholder="如：张三" />
              <br /><br />
              <Text strong>用途：</Text>
              <Input value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ marginTop: 8 }} placeholder="如：保险理赔" />
              <br /><br />
              <Text strong>份数：</Text>
              <Input value={copies} onChange={(e) => setCopies(e.target.value)} style={{ width: 120, marginTop: 8 }} />
              <br /><br />
              <Button type="primary" loading={submitting} onClick={submit} style={{ background: VI.accent }}>
                提交申请
              </Button>
            </Card>
          </Col>
          <Col span={14}>
            <Card title="申请列表" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Spin spinning={loading}>
                <List
                  dataSource={requests}
                  renderItem={(req: CopyRequest) => (
                    <List.Item>
                      <Text strong style={{ width: 100 }}>{req.patientName}</Text>
                      <Tag color="blue" style={{ marginRight: 8 }}>{req.purpose}</Tag>
                      <Text>{req.copies} 份</Text>
                      <Tag color="green" style={{ marginLeft: 16 }}>已批准</Tag>
                    </List.Item>
                  )}
                />
              </Spin>
            </Card>
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}
