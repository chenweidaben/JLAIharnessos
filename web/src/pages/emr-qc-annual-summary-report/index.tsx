/**
 * 健澜科技 jlmedaios - 质控年度总结报告前端页（M506-D，V14，EMR 深化四模块，M506 收官）
 *
 * 深海蓝VI：年度总结报告（年份/病历数/合格率）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Statistic, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  year: number;
  totalRecords: number;
  passRate: number;
}

interface Aggregate {
  years: number;
  totalRecords: number;
  avgPassRate: number;
}

export default function EmrQcAnnualSummaryReportPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-annual-summary-report", {
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
    { title: "年份", dataIndex: "year", key: "year", render: (v: number) => <Text strong style={{ color: VI.deep }}>{v}</Text> },
    {
      title: "病历总数",
      dataIndex: "totalRecords",
      key: "totalRecords",
      render: (v: number) => <Tag color={VI.accent}>{v.toLocaleString()}</Tag>,
    },
    {
      title: "合格率",
      dataIndex: "passRate",
      key: "passRate",
      render: (v: number) => (
        <Tag color={v >= 95 ? "green" : v >= 90 ? "blue" : "orange"}>{v}%</Tag>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>年度总结报告</Title>
        {aggregate && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="汇总统计">
            <Statistic title="年数" value={aggregate.years} suffix="年" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic title="总病历数" value={aggregate.totalRecords} suffix="份" style={{ display: "inline-block", marginRight: 48 }} />
            <Statistic
              title="平均合格率"
              value={aggregate.avgPassRate}
              suffix="%"
              valueStyle={{ color: aggregate.avgPassRate >= 95 ? "#3f8600" : aggregate.avgPassRate >= 90 ? "#1890ff" : "#faad14" }}
              style={{ display: "inline-block" }}
            />
          </Card>
        )}
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="年度明细">
          <Table columns={columns} dataSource={reports} rowKey="year" pagination={false} size="small" />
        </Card>
      </Content>
    </Layout>
  );
}
