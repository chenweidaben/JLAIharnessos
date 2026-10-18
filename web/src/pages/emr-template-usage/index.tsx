/**
 * 健澜科技 jlmedaios - 病历模板使用统计前端页（M468-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：使用排行表（名次/模板名/使用次数/修改率）+ 修改率进度条。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RankedItem {
  templateId: string;
  useCount: number;
  modifyRate: number;
  rank: number;
}

export default function EmrTemplateUsagePage() {
  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState<RankedItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-template-usage", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setRanked(data?.ranked ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历模板使用统计</Title>
        <Card title="使用排行（降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <List
              dataSource={ranked}
              renderItem={(item: RankedItem) => (
                <List.Item>
                  <Tag color={item.rank === 1 ? "gold" : item.rank === 2 ? "silver" : item.rank === 3 ? "orange" : "default"}>
                    第 {item.rank} 名
                  </Tag>
                  <span style={{ marginLeft: 12 }}>{item.templateId}</span>
                  <span style={{ marginLeft: 12 }}>使用 {item.useCount} 次</span>
                  <span style={{ marginLeft: 12 }}>修改率 {item.modifyRate}%</span>
                </List.Item>
              )}
            />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
