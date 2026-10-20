/**
 * 健澜科技 jlmedaios - 统计报表 V13 页（M401-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Empty, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  statutoryReportTimelyRate: number;
  statisticalDataAccuracyRate: number;
  statisticalAnalysisReportCount: number;
}

export default function StatisticsReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/statistics-report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>统计报表</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="法定报表上报及时率" value={data.statutoryReportTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="统计数据准确率" value={data.statisticalDataAccuracyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="统计分析报告数" value={data.statisticalAnalysisReportCount} suffix="份" />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：近期统计报表 demo */}
        <Card style={{ marginTop: 16 }} title="近期统计报表">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, name: "门诊工作量月报", period: "2026-09", submitted: "2026-10-05", status: "已上报" },
              { id: 2, name: "住院死亡率季报", period: "2026Q3", submitted: "2026-10-08", status: "已上报" },
              { id: 3, name: "DRG 分组分析", period: "2026-09", submitted: "—", status: "编制中" },
              { id: 4, name: "抗菌药物使用监测", period: "2026-09", submitted: "2026-10-10", status: "已上报" },
              { id: 5, name: "手术并发症月报", period: "2026-09", submitted: "—", status: "待审核" },
            ]}
            columns={[
              { title: "报表名称", dataIndex: "name" },
              { title: "周期", dataIndex: "period" },
              { title: "上报日期", dataIndex: "submitted" },
              { title: "状态", dataIndex: "status", render: (s: string) => <Tag color={s === "已上报" ? "green" : s === "编制中" ? "orange" : "blue"}>{s}</Tag> },
            ]}
            locale={{ emptyText: <Empty description="暂无报表" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
