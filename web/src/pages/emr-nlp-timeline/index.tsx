/**
 * 健澜科技 jlmedaios - NLP 病历时间线构建前端页（M490-D，M490 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历时间线可视化（纵向 Timeline）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Timeline, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TimelineEvent {
  date: string;
  event: string;
}

interface TimelineAggregate {
  count: number;
  earliest: string;
  latest: string;
}

export default function EmrNlpTimelinePage() {
  const [patientId, setPatientId] = useState("P001");
  const [events] = useState<TimelineEvent[]>([
    { date: "2026-01-01", event: "入院" },
    { date: "2026-02-15", event: "手术" },
    { date: "2026-03-01", event: "出院" },
  ]);
  const [aggregate, setAggregate] = useState<TimelineAggregate | null>(null);

  const build = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-timeline", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ patientId, events }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setAggregate(data?.data?.aggregate ?? null);
        message.success("时间线构建完成");
      }
    } catch {
      message.error("时间线构建失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历时间线构建</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="时间线配置">
          <Input
            placeholder="患者ID"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{ width: 200, marginBottom: 16 }}
          />
          <br />
          <Button type="primary" onClick={build} style={{ background: VI.accent }}>
            构建时间线
          </Button>
          {aggregate && (
            <Text style={{ marginLeft: 24 }}>
              共 {aggregate.count} 个事件，{aggregate.earliest} ~ {aggregate.latest}
            </Text>
          )}
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`病历时间线（${patientId}）`} style={{ marginTop: 16 }}>
          <Timeline
            items={events.map((e) => ({
              color: VI.accent,
              children: (
                <>
                  <Text strong>{e.date}</Text>
                  <Text style={{ marginLeft: 16 }}>{e.event}</Text>
                </>
              ),
            }))}
          />
        </Card>
      </Content>
    </Layout>
  );
}
