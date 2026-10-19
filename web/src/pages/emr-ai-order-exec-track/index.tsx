/**
 * 健澜科技 jlmedaios - 病历AI医嘱执行追踪前端页（M558-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI医嘱执行追踪（病历ID/科室/总医嘱数/已执行数/逾期数/执行率%/逾期率%/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOrderExecTrack {
  recordId: string;
  dept: string;
}

interface TrackResult {
  execRate: number;
  overdueRate: number;
  status: string;
}

interface TrackReport {
  execRate: number;
  overdueRate: number;
  status: string;
}

function statusColor(s: string): string {
  if (s === "执行良好") return "green";
  if (s === "存在逾期风险") return "red";
  return "orange";
}

export default function EmrAiOrderExecTrackPage() {
  const [base, setBase] = useState<AiOrderExecTrack | null>(null);
  const [totalOrders, setTotalOrders] = useState(100);
  const [executedOrders, setExecutedOrders] = useState(98);
  const [overdueOrders, setOverdueOrders] = useState(2);
  const [result, setResult] = useState<TrackResult | null>(null);
  const [report, setReport] = useState<TrackReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-order-exec-track", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 医嘱执行追踪基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doTrack = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-order-exec-track", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ totalOrders, executedOrders, overdueOrders }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("医嘱执行追踪完成");
      } else {
        message.error("医嘱执行追踪失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI医嘱执行追踪</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="追踪输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>总医嘱数：</Text>
            <InputNumber min={0} value={totalOrders} onChange={(v) => setTotalOrders(Number(v ?? 0))} />
            <Text strong>已执行数：</Text>
            <InputNumber min={0} value={executedOrders} onChange={(v) => setExecutedOrders(Number(v ?? 0))} />
            <Text strong>逾期数：</Text>
            <InputNumber min={0} value={overdueOrders} onChange={(v) => setOverdueOrders(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doTrack}>
              执行追踪
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="追踪结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="执行率" value={report.execRate} suffix="%" precision={1} />
              </Col>
              <Col span={8}>
                <Statistic title="逾期率" value={report.overdueRate} suffix="%" precision={1} />
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>状态：</Text>
                <Tag color={statusColor(report.status)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.status}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
