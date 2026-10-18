/**
 * 健澜科技 jlmedaios - 病历模板智能推荐前端页（M539-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历模板智能推荐（科室/医生ID/病历类型/推荐模板列表/匹配数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TemplateRecommend {
  dept: string;
  doctorId: string;
}

interface RecommendResult {
  recommended: string[];
  matchCount: number;
}

interface RecommendReport {
  recommended: string[];
  matchCount: number;
}

export default function EmrTemplateRecommendPage() {
  const [base, setBase] = useState<TemplateRecommend | null>(null);
  const [dept, setDept] = useState("心内科");
  const [recordType, setRecordType] = useState<"入院记录" | "病程记录" | "出院记录">("入院记录");
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [report, setReport] = useState<RecommendReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-recommend", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载模板推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-recommend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ dept, recordType }),
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
        <Title level={3} style={{ color: VI.deep }}>病历模板智能推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Tag color="blue" style={{ marginRight: 16 }}>{base.dept}</Tag>
              <Text strong>医生ID：</Text><Text>{base.doctorId}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>科室：</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>病历类型：</Text>
              <Select
                value={recordType}
                onChange={(v) => setRecordType(v)}
                style={{ width: 140, marginLeft: 8 }}
                options={[
                  { value: "入院记录", label: "入院记录" },
                  { value: "病程记录", label: "病程记录" },
                  { value: "出院记录", label: "出院记录" },
                ]}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            执行推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16, alignItems: "center" }}>
              <Statistic title="匹配数" value={report.matchCount} />
            </div>
            <List
              size="small"
              dataSource={report.recommended}
              renderItem={(item) => (
                <List.Item>
                  <Tag color="blue" style={{ marginRight: 8 }}>推荐</Tag>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
