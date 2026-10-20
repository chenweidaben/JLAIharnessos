/**
 * 健澜科技 jlmedaios - 科室质控排名（避让版）前端页（M542-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：科室质控排名（月份/科室列表/最高分科室/排名数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DeptRank {
  month: string;
}

interface RankResult {
  topDept: string;
  rankCount: number;
}

interface RankReport {
  topDept: string;
  rankCount: number;
}

interface DeptItem {
  name: string;
  score: number;
}

const defaultDepts: DeptItem[] = [
  { name: "心内科", score: 95 },
  { name: "呼吸科", score: 88 },
  { name: "普外科", score: 92 },
];

export default function EmrQcDeptRankListPage() {
  const [base, setBase] = useState<DeptRank | null>(null);
  const [depts] = useState<DeptItem[]>(defaultDepts);
  const [result, setResult] = useState<RankResult | null>(null);
  const [report, setReport] = useState<RankReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-rank-list", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载科室排名基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRank = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-dept-rank-list", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ depts }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("排名完成");
      } else {
        message.error("排名失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室质控排名</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <Text strong>月份：</Text><Tag color="blue">{base.month}</Tag>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="科室列表">
          <List
            dataSource={depts}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.name}</Text>
                <Tag color={item.score >= 90 ? "green" : item.score >= 80 ? "orange" : "red"}>
                  评分 {item.score}
                </Tag>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doRank}>
            执行排名
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="排名结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="最高分科室" value={report.topDept} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={12}>
                <Statistic title="排名数" value={report.rankCount} valueStyle={{ color: VI.deep }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
