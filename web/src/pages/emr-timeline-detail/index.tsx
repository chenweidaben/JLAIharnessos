/**
 * 健澜科技 jlmedaios - 病历时间轴视图前端页（M464-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：垂直时间轴（左时间线圆点+右事件卡片，按天分块）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Divider, Layout, List, Spin, Tag, Timeline, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TimelineEvent {
  id: string;
  eventType: string;
  title: string;
  eventTime: string;
}

interface DayGroup {
  day: string;
  events: TimelineEvent[];
}

const TYPE_COLORS: Record<string, string> = {
  admission: "blue",
  progress: "green",
  order: "orange",
  lab: "purple",
  imaging: "cyan",
  discharge: "red",
};

export default function EmrTimelineDetailPage() {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<DayGroup[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-timeline-detail/demo001", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setGroups(data?.grouped ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历时间轴视图</Title>
        <Spin spinning={loading}>
          {groups.map((group) => (
            <Card key={group.day} title={<Text style={{ color: VI.deep }}>{group.day}</Text>} headStyle={{ background: VI.bg }} style={{ marginBottom: 16 }}>
              <Timeline
                items={group.events.map((event) => ({
                  color: TYPE_COLORS[event.eventType] ?? "gray",
                  children: (
                    <div>
                      <Tag color={TYPE_COLORS[event.eventType]}>{event.eventType}</Tag>
                      <Text strong>{event.title}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: 12 }}>{event.eventTime}</Text>
                    </div>
                  ),
                }))}
              />
            </Card>
          ))}
          {groups.length === 0 && !loading && (
            <Text type="secondary">暂无时间轴数据</Text>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
