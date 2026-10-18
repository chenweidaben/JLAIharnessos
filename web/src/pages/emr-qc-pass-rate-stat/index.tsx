/**
 * 健澜科技 jlmedaios - 质控合格率统计前端页（M500-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：合格率统计表格（科室/合格数/总数/合格率%）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PassRateStat {
  dept: string;
  passCount: number;
  total: number;
  rate: number;
}

interface Aggregate {
  avgRate: number;
  depts: number;
}

export default function EmrQcPassRateStatPage() {
  const [stats, setStats] = useState<PassRateStat[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-pass-rate-stat", {
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
    { title: "合格数", dataIndex: "passCount", key: "passCount" },
    { title: "总数", dataIndex: "total", key: "total" },
    {
      title: "合格率",
      dataIndex: "rate",
      key: "rate",
      render: (rate: number) => (
        <Tag color={rate >= 90 ? "green" : rate >= 80 ? "orange" : "red"}>
          {rate.toFixed(1)}%
        </Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>合格率统计</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="统计概览">
            <Text strong>平均合格率：</Text>
            <Tag color={VI.accent} style={{ marginLeft: 8 }}>{aggregate.avgRate.toFixed(1)}%</Tag>
            <Text strong style={{ marginLeft: 24 }}>科室数：</Text>
            <Tag color="default" style={{ marginLeft: 8 }}>{aggregate.depts}</Tag>
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="科室合格率">
          <Table columns={columns} dataSource={stats} rowKey="dept" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
