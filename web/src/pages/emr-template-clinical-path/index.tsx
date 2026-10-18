/**
 * 健澜科技 jlmedaios - 临床路径模板联动前端页（M525-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：临床路径模板联动（路径名/模板名/路径步骤/必需模板/已用模板/匹配数/缺失数/覆盖率）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ClinicalPathLink {
  pathName: string;
  templateName: string;
}

interface LinkResult {
  matchedCount: number;
  missingCount: number;
  coverage: number;
}

interface LinkReport {
  matchedCount: number;
  coverage: number;
}

const DEFAULT_STEPS = ["入院评估", "检查检验", "治疗方案", "出院指导"];
const DEFAULT_REQUIRED = ["入院记录", "手术记录", "出院小结"];
const DEFAULT_USED = ["入院记录"];

export default function EmrTemplateClinicalPathPage() {
  const [link, setLink] = useState<ClinicalPathLink | null>(null);
  const [result, setResult] = useState<LinkResult | null>(null);
  const [report, setReport] = useState<LinkReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLink = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-clinical-path", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setLink(data?.data ?? null);
        }
      } catch {
        message.error("加载临床路径联动基础数据失败");
      }
    };
    void fetchLink();
  }, []);

  const doLink = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-clinical-path", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ pathSteps: DEFAULT_STEPS, requiredTemplates: DEFAULT_REQUIRED, usedTemplates: DEFAULT_USED }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("联动完成");
      } else {
        message.error("联动失败");
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
        <Title level={3} style={{ color: VI.deep }}>临床路径模板联动</Title>
        {link && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="联动基础数据">
            <div>
              <Text strong>路径名：</Text><Text style={{ marginRight: 24 }}>{link.pathName}</Text>
              <Text strong>模板名：</Text><Text>{link.templateName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="联动输入">
          <Row gutter={16}>
            <Col span={8}>
              <Text strong>路径步骤：</Text>
              <List
                size="small"
                dataSource={DEFAULT_STEPS}
                renderItem={(item) => <List.Item><Tag>{item}</Tag></List.Item>}
              />
            </Col>
            <Col span={8}>
              <Text strong>必需模板：</Text>
              <List
                size="small"
                dataSource={DEFAULT_REQUIRED}
                renderItem={(item) => <List.Item><Tag color="orange">{item}</Tag></List.Item>}
              />
            </Col>
            <Col span={8}>
              <Text strong>已用模板：</Text>
              <List
                size="small"
                dataSource={DEFAULT_USED}
                renderItem={(item) => <List.Item><Tag color="green">{item}</Tag></List.Item>}
              />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doLink}>
            临床路径联动
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="联动结果">
            <div style={{ display: "flex", gap: 32 }}>
              <Statistic title="匹配数" value={report.matchedCount} valueStyle={{ color: "green" }} />
              <Statistic title="缺失数" value={result.missingCount} valueStyle={{ color: "red" }} />
              <Statistic title="覆盖率" value={report.coverage} suffix="%" precision={1} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
