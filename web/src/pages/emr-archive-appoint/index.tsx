/**
 * 健澜科技 jlmedaios - 病历归档预约前端页（M541-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历归档预约（病历ID/科室/预约日期/操作员/预约号/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveAppoint {
  recordId: string;
  dept: string;
}

interface AppointResult {
  appointmentNo: string;
  status: string;
}

interface AppointReport {
  appointmentNo: string;
  status: string;
}

export default function EmrArchiveAppointPage() {
  const [base, setBase] = useState<ArchiveAppoint | null>(null);
  const [recordId, setRecordId] = useState("REC800");
  const [appointDate, setAppointDate] = useState("2026-10-25");
  const [operator, setOperator] = useState("张护士");
  const [result, setResult] = useState<AppointResult | null>(null);
  const [report, setReport] = useState<AppointReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-appoint", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载归档预约基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCreate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive-appoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, appointDate, operator }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("预约创建完成");
      } else {
        message.error("预约创建失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历归档预约</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="创建输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>预约日期：</Text>
              <Input value={appointDate} onChange={(e) => setAppointDate(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>操作员：</Text>
              <Input value={operator} onChange={(e) => setOperator(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCreate}>
            创建预约
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="创建结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>预约号：</Text>
              <Tag color="blue" style={{ fontSize: 16 }}>{report.appointmentNo}</Tag>
              <Text strong>状态：</Text>
              <Tag color="green" style={{ fontSize: 16 }}>{report.status}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
