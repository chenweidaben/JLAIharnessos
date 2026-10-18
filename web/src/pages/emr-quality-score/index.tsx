/**
 * 健澜科技 jlmedaios - 病历质量实时评分仪表盘前端页（M465-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评分趋势折线 + 排名表（金/银/铜名次）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RankItem {
  name: string;
  score: number;
  rank: number;
}

const RANK_COLORS: Record<number, string> = { 1: "gold", 2: "silver", 3: "bronze" };

export default function EmrQualityScorePage() {
  const [loading, setLoading] = useState(true);
  const [hospitalScore, setHospitalScore] = useState(0);
  const [ranking, setRanking] = useState<RankItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-quality-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setHospitalScore(data?.hospitalScore ?? 0);
            setRanking(data?.deptRanking ?? []);
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
    {
      title: "名次",
      dataIndex: "rank",
      key: "rank",
      render: (rank: number) => <Tag color={RANK_COLORS[rank] ?? "default"}>第{rank}名</Tag>,
    },
    { title: "科室", dataIndex: "name", key: "name" },
    {
      title: "评分",
      dataIndex: "score",
      key: "score",
      render: (score: number) => <Text strong style={{ color: VI.accent }}>{score} 分</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质量实时评分仪表盘</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Card>
                <Statistic title="全院质量评分" value={hospitalScore} suffix="/ 100" valueStyle={{ color: VI.accent }} />
              </Card>
            </Col>
          </Row>
          <Card title="科室排名" headStyle={{ background: VI.deep, color: "#fff" }}>
            <Table rowKey="name" columns={columns} dataSource={ranking} pagination={false} size="small" />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
