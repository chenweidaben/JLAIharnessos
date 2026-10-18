/**
 * 健澜科技 jlmedaios - 模板版本对比前端页（M524-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：模板版本对比（模板名/旧版本/新版本/新增项数/删除项数/修改项数/总变更/摘要）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface VersionCompare {
  templateName: string;
  oldVersion: string;
  newVersion: string;
}

interface CompareResult {
  addedCount: number;
  removedCount: number;
  changedCount: number;
}

interface CompareReport {
  totalChanges: number;
  summary: string;
}

const DEFAULT_OLD_FIELDS = ["主诉", "现病史", "既往史", "个人史"];
const DEFAULT_NEW_FIELDS = ["主诉", "现病史", "家族史"];

export default function EmrTemplateVersionComparePage() {
  const [compare, setCompare] = useState<VersionCompare | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCompare = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-version-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCompare(data?.data ?? null);
        }
      } catch {
        message.error("加载版本对比基础数据失败");
      }
    };
    void fetchCompare();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-template-version-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ oldFields: DEFAULT_OLD_FIELDS, newFields: DEFAULT_NEW_FIELDS }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("对比完成");
      } else {
        message.error("对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>模板版本对比</Title>
        {compare && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="版本对比基础数据">
            <div>
              <Text strong>模板名：</Text><Text style={{ marginRight: 24 }}>{compare.templateName}</Text>
              <Text strong>旧版本：</Text>
              <Tag color="default" style={{ marginLeft: 8 }}>{compare.oldVersion}</Tag>
              <Text strong>新版本：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{compare.newVersion}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="对比输入">
          <Row gutter={16}>
            <Col span={12}>
              <Text strong>旧字段：</Text>
              <div style={{ marginTop: 8 }}>
                {DEFAULT_OLD_FIELDS.map((f) => (
                  <Tag key={f} color="default" style={{ marginBottom: 4 }}>{f}</Tag>
                ))}
              </div>
            </Col>
            <Col span={12}>
              <Text strong>新字段：</Text>
              <div style={{ marginTop: 8 }}>
                {DEFAULT_NEW_FIELDS.map((f) => (
                  <Tag key={f} color="blue" style={{ marginBottom: 4 }}>{f}</Tag>
                ))}
              </div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCompare}>
            版本对比
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
              <Statistic title="新增项数" value={result.addedCount} valueStyle={{ color: "green" }} />
              <Statistic title="删除项数" value={result.removedCount} valueStyle={{ color: "red" }} />
              <Statistic title="修改项数" value={result.changedCount} valueStyle={{ color: "orange" }} />
              <Statistic title="总变更" value={report.totalChanges} />
            </div>
            <div>
              <Text strong>摘要：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{report.summary}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
