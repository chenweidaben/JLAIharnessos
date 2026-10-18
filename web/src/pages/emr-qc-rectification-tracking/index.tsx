/**
 * 健澜科技 jlmedaios - 病历整改自动跟踪前端页（M521-D，V14，EMR 深化四模块，M521 收官）
 *
 * 深海蓝VI：病历整改自动跟踪（缺陷ID/负责人/期限天数/已过天数/是否完成/跟踪状态/剩余天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RectificationTracking {
  defectId: string;
  owner: string;
  deadlineDays: number;
}

interface TrackResult {
  status: string;
  daysRemaining: number;
}

interface TrackReport {
  status: string;
  daysRemaining: number;
}

export default function EmrQcRectificationTrackingPage() {
  const [tracking, setTracking] = useState<RectificationTracking | null>(null);
  const [daysElapsed, setDaysElapsed] = useState(3);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [report, setReport] = useState<TrackReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTracking = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rectification-tracking", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTracking(data?.data ?? null);
        }
      } catch {
        message.error("加载整改跟踪基础数据失败");
      }
    };
    void fetchTracking();
  }, []);

  const doTrack = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rectification-tracking", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ daysElapsed, completed }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("跟踪完成");
      } else {
        message.error("跟踪失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历整改自动跟踪</Title>
        {tracking && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="整改跟踪基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{tracking.defectId}</Text>
              <Text strong>负责人：</Text><Text style={{ marginRight: 24 }}>{tracking.owner}</Text>
              <Text strong>期限天数：</Text><Text>{tracking.deadlineDays}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪输入">
          <Row gutter={16}>
            <Col span={8}>
              <Text>已过天数</Text>
              <InputNumber value={daysElapsed} onChange={(v) => setDaysElapsed(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <div style={{ marginTop: 32 }}>
                <Checkbox checked={completed} onChange={(e) => setCompleted(e.target.checked)}>已完成</Checkbox>
              </div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doTrack}>
            跟踪整改
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="跟踪结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>跟踪状态：</Text>
                <Tag
                  color={report.status === "已完成" ? "green" : report.status === "进行中" ? "blue" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.status}
                </Tag>
              </div>
              <Statistic title="剩余天数" value={report.daysRemaining} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
