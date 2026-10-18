/**
 * 健澜科技 jlmedaios - 患者就诊 360° 全视图前端页（M465-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：四栏卡片（就诊史/用药史/检查史/诊断史）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Divider, Layout, List, Spin, Statistic, Tag, Timeline, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PatientEvent {
  id: string;
  type: string;
  title: string;
  eventTime: string;
}

interface VisitHistory {
  totalVisits: number;
  latestAdmission?: string;
  departments: string[];
}

const TYPE_COLORS: Record<string, string> = {
  visit: "blue",
  medication: "green",
  lab: "purple",
  imaging: "cyan",
  diagnosis: "orange",
};

export default function EmrPatient360Page() {
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<PatientEvent[]>([]);
  const [visitHistory, setVisitHistory] = useState<VisitHistory>({ totalVisits: 0, departments: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-patient-360/demo001", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setTimeline(data?.timeline ?? []);
            setVisitHistory(data?.visitHistory ?? { totalVisits: 0, departments: [] });
          }
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
        <Title level={3} style={{ color: VI.deep }}>患者就诊 360° 全视图</Title>
        <Spin spinning={loading}>
          <Card title="就诊史概览" headStyle={{ background: VI.deep, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Divider orientation="left">就诊统计</Divider>
            <Statistic title="总就诊次数" value={visitHistory.totalVisits} />
            <Text>最近入院：{visitHistory.latestAdmission ?? "—"}</Text>
            <Divider orientation="left">就诊科室</Divider>
            {visitHistory.departments.map((d) => <Tag key={d} color="blue" style={{ marginBottom: 4 }}>{d}</Tag>)}
          </Card>
          <Card title="全事件时间轴" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Timeline
              items={timeline.map((event) => ({
                color: TYPE_COLORS[event.type] ?? "gray",
                children: (
                  <div>
                    <Tag color={TYPE_COLORS[event.type]}>{event.type}</Tag>
                    <Text strong>{event.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>{event.eventTime}</Text>
                  </div>
                ),
              }))}
            />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
