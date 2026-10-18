/**
 * 健澜科技 jlmedaios - 质控月度报表前端页（M506-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：月度报表（月份/病历数/缺陷数/缺陷率）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  month: string;
  totalRecords: number;
  defects: number;
}

interface Aggregate {
  months: number;
  totalRecords: number;
  totalDefects: number;
  defectRate: number;
}

export default function EmrQcMonthlyReportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-monthly-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const result = await resp.json();
          setReports(result?.data?.reports ?? []);
          setAggregate(result?.data?.aggregate ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "月份", dataIndex: "month", key: "month" },
    {
      title: "病历总数",
      dataIndex: "totalRecords",
      key: "totalRecords",
      render: (v: number) => <Tag color={VI.accent}>{v}</Tag>,
    },
    {
      title: "缺陷数",
      dataIndex: "defects",
      key: "defects",
      render: (v: number) => <Tag color={v > 50 ? "red" : "orange"}>{v}</Tag>,
    },
    {
      title: "缺陷率",
      key: "rate",
      render: (_: unknown, record: Report) => {
        const rate = record.totalRecords > 0 ? ((record.defects / record.totalRecords) * 100).toFixed(1) : "0";
        return <Text type="secondary">{rate}%</Text>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>月度报表</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="汇总统计">
            <Statistic title="月数" value={aggregate.months} suffix="个月" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="总病历数" value={aggregate.totalRecords} suffix="份" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="总缺陷数" value={aggregate.totalDefects} suffix="件" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic
              title="缺陷率"
              value={aggregate.defectRate}
              suffix="%"
              valueStyle={{ color: aggregate.defectRate > 5 ? "#cf1322" : "#3f8600" }}
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="月度明细">
          <Table columns={columns} dataSource={reports} rowKey="month" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
