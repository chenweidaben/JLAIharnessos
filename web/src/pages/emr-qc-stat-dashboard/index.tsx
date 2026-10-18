/**
 * 健澜科技 jlmedaios - 质控综合统计大屏前端页（M500-D，V14，EMR 深化四模块，M500 收官里程碑）
 *
 * 深海蓝VI：综合统计大屏（三大指标 Card：缺陷总数/合格率%/平均耗时h）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Statistic, Tag, Typography, message } from "antd";
import { BugOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StatDashboard {
  defectTotal: number;
  passRate: number;
  avgHours: number;
}

export default function EmrQcStatDashboardPage() {
  const [dashboard, setDashboard] = useState<StatDashboard | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-stat-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDashboard(data?.data?.dashboard ?? null);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控综合统计大屏</Title>
        {dashboard && (
          <Row gutter={16}>
            <Col span={8}>
              <Card headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷总数">
                <Statistic
                  title={<Tag icon={<BugOutlined />} color="red">缺陷总数</Tag>}
                  value={dashboard.defectTotal}
                  suffix="例"
                  valueStyle={{ color: "#cf1322" }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card headStyle={{ background: VI.mid, color: "#fff" }} title="合格率">
                <Statistic
                  title={<Tag icon={<CheckCircleOutlined />} color="green">合格率</Tag>}
                  value={dashboard.passRate}
                  suffix="%"
                  valueStyle={{ color: "#3f8600" }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card headStyle={{ background: VI.mid, color: "#fff" }} title="平均耗时">
                <Statistic
                  title={<Tag icon={<ClockCircleOutlined />} color="blue">平均耗时</Tag>}
                  value={dashboard.avgHours}
                  suffix="小时"
                  valueStyle={{ color: VI.accent }}
                />
              </Card>
            </Col>
          </Row>
        )}
        <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="说明">
          <Text>本大屏汇总病历质控核心指标，数据实时更新。</Text>
        </Card>
      </Content>
    </Layout>
  );
}
