/**
 * 健澜科技 jlmedaios - 质控时效统计前端页（M500-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：时效统计表格（科室/平均完成耗时小时）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TimelinessStat {
  dept: string;
  avgHours: number;
}

interface Aggregate {
  avgHours: number;
  depts: number;
}

export default function EmrQcTimelinessStatPage() {
  const [stats, setStats] = useState<TimelinessStat[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-timeliness-stat", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setStats(data?.data?.stats ?? []);
          setAggregate(data?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "科室", dataIndex: "dept", key: "dept" },
    {
      title: "平均完成耗时",
      dataIndex: "avgHours",
      key: "avgHours",
      render: (hours: number) => (
        <Tag color={hours <= 24 ? "green" : hours <= 48 ? "orange" : "red"}>
          {hours.toFixed(1)} 小时
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>时效统计</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计概览">
            <Text strong>全院平均耗时：</Text>
            <Tag color={VI.accent} style={{ marginLeft: 8 }}>{aggregate.avgHours.toFixed(1)} 小时</Tag>
            <Text strong style={{ marginLeft: 24 }}>科室数：</Text>
            <Tag color="default" style={{ marginLeft: 8 }}>{aggregate.depts}</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室时效">
          <Table columns={columns} dataSource={stats} rowKey="dept" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
