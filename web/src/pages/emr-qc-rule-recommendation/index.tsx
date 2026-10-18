/**
 * 健澜科技 jlmedaios - 质控规则智能推荐前端页（M520-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控规则智能推荐（科室/病历类型/推荐规则列表/推荐数量/首选规则）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Tag, Typography, message } from "antd";
import type { RuleRecommendationV14, RecommendationContextV14, RecommendationResultV14, RecommendationReportV14 } from "../../src/bff/aggregators/emrQcRuleRecommendationV14Aggregator";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const DEFAULT_CANDIDATE_RULES = [
  "入院记录完整性",
  "病程记录及时性",
  "手术记录规范",
  "手术分级授权",
  "出院小结完整性",
];

export default function EmrQcRuleRecommendationPage() {
  const [recommendation, setRecommendation] = useState<RuleRecommendationV14 | null>(null);
  const [context, setContext] = useState<RecommendationContextV14>({ dept: "心内科", recordType: "入院记录" });
  const [candidateRules] = useState<string[]>(DEFAULT_CANDIDATE_RULES);
  const [result, setResult] = useState<RecommendationResultV14 | null>(null);
  const [report, setReport] = useState<RecommendationReportV14 | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rule-recommendation", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRecommendation(data?.data ?? null);
        }
      } catch {
        message.error("加载推荐基础数据失败");
      }
    };
    void fetchRecommendation();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rule-recommendation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ context, candidateRules }),
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
        <Title level={3} style={{ color: VI.deep }}>质控规则智能推荐</Title>
        {recommendation && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{recommendation.dept}</Text>
              <Text strong>病历类型：</Text>
              <Tag color={VI.accent}>{recommendation.recordType}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="候选规则列表">
          <List
            dataSource={candidateRules}
            renderItem={(item) => (
              <List.Item>
                <Text>{item}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doRecommend}>
            推荐规则
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>推荐数量：</Text><Text style={{ marginLeft: 8 }}>{report.count}</Text>
              <Text strong style={{ marginLeft: 24 }}>首选规则：</Text>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.topRule}</Tag>
            </div>
            {result.recommended.length > 0 && (
              <List
                dataSource={result.recommended}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="blue">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
