/**
 * 健澜科技 jlmedaios - 健康科普与全媒体 页（M236-C）
 *
 * 文章/短视频/直播/图文漫画动画/微信/抖音/快手/B站/小红书矩阵/选题脚本拍摄剪辑审核发布/效果追踪/合规审查。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  content: { article: number; video: number; live: number; comic: number };
  channels: { wechat: number; douyin: number; kuaishou: number; bilibili: number; xhs: number };
  workflow: { plan: number; shoot: number; edit: number; review: number };
  engagement: { views: number; likes: number; shares: number };
  compliance: { reviewed: boolean };
  suggestions: string[];
}

export default function HealthMediaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/health-media/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>健康科普与全媒体</Title>
        <Paragraph type="secondary">文章·短视频·直播·漫画 / 微信·抖音·快手·B站·小红书矩阵 / 选题·拍摄·剪辑·审核·发布 / 效果追踪·合规审查</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="总播放量" value={data.engagement.views} /></Card></Col>
              <Col span={6}><Card><Statistic title="抖音粉丝" value={data.channels.douyin} /></Card></Col>
              <Col span={6}><Card><Statistic title="短视频产出" value={data.content.video} /></Card></Col>
              <Col span={6}><Card><Statistic title="点赞" value={data.engagement.likes} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>全媒体明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "wechat", name: "微信公众号", value: data.channels.wechat },
                  { key: "bili", name: "B站", value: data.channels.bilibili },
                  { key: "live", name: "直播场次", value: data.content.live },
                  { key: "review", name: "合规审核", value: data.compliance.reviewed ? "已审" : "未审" },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
