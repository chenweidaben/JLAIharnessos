/**
 * 健澜科技 jlmedaios - 质控移动端查看前端页（M526-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控移动端查看（病历ID/查看人/段落列表/查看段落数/查看长度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MobileView {
  recordId: string;
  viewer: string;
}

interface ViewResult {
  viewedSections: number;
  viewLength: number;
}

interface ViewReport {
  viewedSections: number;
  viewLength: number;
}

const DEFAULT_SECTIONS = ["入院记录", "病程记录", "出院小结"];

export default function EmrQcMobileViewPage() {
  const [view, setView] = useState<MobileView | null>(null);
  const [result, setResult] = useState<ViewResult | null>(null);
  const [report, setReport] = useState<ViewReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchView = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-mobile-view", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setView(data?.data ?? null);
        }
      } catch {
        message.error("加载移动端查看基础数据失败");
      }
    };
    void fetchView();
  }, []);

  const doView = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-mobile-view", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId: "REC030", sections: DEFAULT_SECTIONS }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("查看完成");
      } else {
        message.error("查看失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控移动端查看</Title>
        {view && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="查看基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{view.recordId}</Text>
              <Text strong>查看人：</Text><Text>{view.viewer}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="段落列表">
          <List
            size="small"
            dataSource={DEFAULT_SECTIONS}
            renderItem={(item) => (
              <List.Item>
                <Tag color={VI.accent}>{item}</Tag>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doView}>
            移动端查看
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="查看结果">
            <div style={{ display: "flex", gap: 32 }}>
              <Statistic title="查看段落数" value={report.viewedSections} />
              <Statistic title="查看长度" value={report.viewLength} suffix="字" />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
