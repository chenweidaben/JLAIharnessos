/**
 * 健澜科技 jlmedaios - 病历关键事件时间线前端页（M538-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历关键事件时间线（病历ID/患者姓名/事件列表/事件数/首条事件）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface EventTimeline {
  recordId: string;
  patientName: string;
}

interface TimelineEventItem {
  day: number;
  title: string;
}

interface TimelineResult {
  eventCount: number;
  firstEvent: string;
}

interface TimelineReport {
  eventCount: number;
  firstEvent: string;
}

export default function EmrEventTimelinePage() {
  const [timeline, setTimeline] = useState<EventTimeline | null>(null);
  const [events, setEvents] = useState<TimelineEventItem[]>([
    { day: 1, title: "入院" },
    { day: 3, title: "手术" },
    { day: 10, title: "出院" },
  ]);
  const [result, setResult] = useState<TimelineResult | null>(null);
  const [report, setReport] = useState<TimelineReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-event-timeline", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTimeline(data?.data ?? null);
        }
      } catch {
        message.error("加载事件时间线基础数据失败");
      }
    };
    void fetchTimeline();
  }, []);

  const doBuild = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-event-timeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ events }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("构建完成");
      } else {
        message.error("构建失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历关键事件时间线</Title>
        {timeline && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{timeline.recordId}</Text>
              <Text strong>患者姓名：</Text><Text>{timeline.patientName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="事件列表">
          <List
            size="small"
            dataSource={events}
            style={{ marginBottom: 16 }}
            renderItem={(item) => (
              <List.Item>
                <Text strong>第{item.day}天：</Text><Text style={{ marginLeft: 8 }}>{item.title}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doBuild}>
            执行构建
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="构建结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="事件数" value={report.eventCount} />
              <div>
                <Text strong>首条事件：</Text>
                <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>{report.firstEvent}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
