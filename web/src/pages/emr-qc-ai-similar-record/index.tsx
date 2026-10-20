/**
 * 健澜科技 jlmedaios - 质控 AI 相似病历推荐前端页（M499-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI 相似病历推荐列表（病历号/科室/相似度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SimilarRecord {
  id: string;
  dept: string;
  score: number;
}

interface SimilarReport {
  records: SimilarRecord[];
  count: number;
}

export default function EmrQcAiSimilarRecordPage() {
  const [report, setReport] = useState<SimilarReport | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-ai-similar-record", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReport(data?.data?.report ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>AI 相似病历推荐</Title>
        {report && (
          <Card
            headStyle={{ background: VI.mid, color: "#fff" }}
            title={
              <span>
                相似病历列表
                <Tag color="default" style={{ marginLeft: 8 }}>共 {report.count} 条</Tag>
              </span>
            }
          >
            <List
              dataSource={report.records}
              renderItem={(item) => (
                <List.Item>
                  <Text strong style={{ width: 100 }}>{item.id}</Text>
                  <Tag color={VI.accent} style={{ width: 80 }}>{item.dept}</Tag>
                  <Tag color="blue">相似度 {(item.score * 100).toFixed(1)}%</Tag>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
