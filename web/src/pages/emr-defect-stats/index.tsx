/**
 * 健澜科技 jlmedaios - 病历缺陷统计分析前端页（M461-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：按科室柱状图 + 按严重度饼图。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import type { DefectByDeptItemV14, DefectByTypeV14 } from "@/bff/aggregators/emrDefectStatsV14Aggregator";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrDefectStatsPage() {
  const [loading, setLoading] = useState(true);
  const [byType, setByType] = useState<DefectByTypeV14>({ block: 0, major: 0, minor: 0, total: 0 });
  const [byDept, setByDept] = useState<DefectByDeptItemV14[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-defect-stats", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setByType(data?.byType ?? { block: 0, major: 0, minor: 0, total: 0 });
            setByDept(data?.byDept ?? []);
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

  const columns = [
    { title: "科室", dataIndex: "dept", key: "dept" },
    { title: "拦截 (block)", dataIndex: "block", key: "block", render: (v: number) => <Tag color="red">{v}</Tag> },
    { title: "主要 (major)", dataIndex: "major", key: "major", render: (v: number) => <Tag color="orange">{v}</Tag> },
    { title: "一般 (minor)", dataIndex: "minor", key: "minor", render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: "合计", dataIndex: "total", key: "total" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历缺陷统计分析</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Statistic title="拦截 (block)" value={byType.block} valueStyle={{ color: "red" }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="主要 (major)" value={byType.major} valueStyle={{ color: "orange" }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="一般 (minor)" value={byType.minor} valueStyle={{ color: "blue" }} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="合计" value={byType.total} valueStyle={{ color: VI.accent }} />
              </Card>
            </Col>
          </Row>
          <Card title="按科室统计" headStyle={{ background: VI.deep, color: "#fff" }}>
            <Table rowKey="dept" columns={columns} dataSource={byDept} pagination={false} size="small" />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
