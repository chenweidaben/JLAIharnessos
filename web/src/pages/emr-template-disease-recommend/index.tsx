/**
 * 健澜科技 jlmedaios - 病种模板智能推荐前端页（M525-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病种模板智能推荐（病种名/科室/候选模板列表/推荐模板数/首选模板）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DiseaseRecommend {
  diseaseName: string;
  dept: string;
}

interface RecommendResult {
  topTemplate: string;
  recommendCount: number;
}

interface RecommendReport {
  topTemplate: string;
  recommendCount: number;
}

interface CandidateTemplate {
  name: string;
  dept: string;
  matchScore: number;
}

const DEFAULT_TEMPLATES: CandidateTemplate[] = [
  { name: "冠心病入院模板", dept: "心内科", matchScore: 85 },
  { name: "高血压门诊模板", dept: "心内科", matchScore: 70 },
  { name: "糖尿病随访模板", dept: "内分泌科", matchScore: 40 },
];

export default function EmrTemplateDiseaseRecommendPage() {
  const [recommend, setRecommend] = useState<DiseaseRecommend | null>(null);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [report, setReport] = useState<RecommendReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecommend = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-disease-recommend", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRecommend(data?.data ?? null);
        }
      } catch {
        message.error("加载病种推荐基础数据失败");
      }
    };
    void fetchRecommend();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-disease-recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diseaseName: "冠心病", templates: DEFAULT_TEMPLATES }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("推荐完成");
      } else {
        message.error("推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病种模板智能推荐</Title>
        {recommend && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐基础数据">
            <div>
              <Text strong>病种名：</Text><Text style={{ marginRight: 24 }}>{recommend.diseaseName}</Text>
              <Text strong>科室：</Text><Text>{recommend.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="候选模板列表">
          <List
            size="small"
            dataSource={DEFAULT_TEMPLATES}
            renderItem={(item) => (
              <List.Item>
                <Tag color={item.matchScore >= 60 ? "green" : "default"} style={{ minWidth: 120 }}>
                  {item.name}
                </Tag>
                <Text type="secondary" style={{ marginRight: 8 }}>{item.dept}</Text>
                <Tag color={item.matchScore >= 60 ? "blue" : "default"}>匹配分 {item.matchScore}</Tag>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doRecommend}>
            智能推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
              <Statistic title="推荐模板数" value={report.recommendCount} valueStyle={{ color: "green" }} />
              <div>
                <Text strong>首选模板：</Text>
                <Tag color={VI.accent} style={{ marginLeft: 8, fontSize: 16 }}>{report.topTemplate}</Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
