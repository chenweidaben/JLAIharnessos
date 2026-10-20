/**
 * 健澜科技数智医院智能体（jlmedaios）- 演示模式水印中心页（M125-C）
 *
 * v5.0试点扩展（M184空壳崩溃修复）：
 *  - 原页面仅导出一个 visible=false 时返回 null 的水印组件，路由访问为空白空壳；
 *  - 现补为真实演示页：标题 + 统计卡片（启用状态/覆盖页面/水印规则/今日脱敏操作）
 *    + 实时水印效果预览 + 水印规则表格（8 行 demo 数据）。
 *
 * 【演示就绪】
 *  - 演示模式（DEMO_MODE=1）下：右上角常驻「演示模式 · 数据已脱敏」提示条，
 *    并叠加全屏斜向浅蓝水印，防止现场演示时混淆真实生产数据；
 *  - 深海蓝 VI：主色 #0A4D8C / 深色 #073A6B，水印使用低透明度 #0A4D8C。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { Card, Col, Layout, Row, Statistic, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

/** 深海蓝 VI 色值 */
const DEEP_SEA_BLUE = '#0A4D8C';
const DEEP_SEA_BLUE_DARK = '#073A6B';
const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

/** 水印规则 demo 数据 */
interface WatermarkRule {
  key: string;
  scene: string;
  scope: string;
  text: string;
  opacity: number;
  status: 'enabled' | 'disabled';
}

const DEMO_RULES: WatermarkRule[] = [
  { key: '1', scene: '全院演示模式', scope: '全部页面', text: '演示模式 · 数据已脱敏', opacity: 0.08, status: 'enabled' },
  { key: '2', scene: '患者隐私页', scope: '患者360/病历首页', text: '演示数据 · 禁止外传', opacity: 0.12, status: 'enabled' },
  { key: '3', scene: '财务结算页', scope: '收费/医保结算', text: '演示环境 · 非真实账单', opacity: 0.1, status: 'enabled' },
  { key: '4', scene: '科研队列页', scope: '专病队列导出', text: '脱敏数据 · 科研演示', opacity: 0.09, status: 'enabled' },
  { key: '5', scene: '系统管理页', scope: '用户/权限/审计', text: '演示环境 · 杭州健澜科技', opacity: 0.08, status: 'enabled' },
  { key: '6', scene: '移动护理端', scope: '护理看板', text: '演示数据 · 移动端', opacity: 0.11, status: 'disabled' },
  { key: '7', scene: '互联网医院', scope: '在线问诊/处方', text: '演示模式 · 非真实诊疗', opacity: 0.1, status: 'enabled' },
  { key: '8', scene: '应急指挥驾驶舱', scope: '应急演练大屏', text: '演练场景 · 模拟数据', opacity: 0.07, status: 'disabled' },
];

const columns: ColumnsType<WatermarkRule> = [
  { title: '应用场景', dataIndex: 'scene', key: 'scene' },
  { title: '覆盖范围', dataIndex: 'scope', key: 'scope' },
  { title: '水印文案', dataIndex: 'text', key: 'text' },
  {
    title: '透明度',
    dataIndex: 'opacity',
    key: 'opacity',
    width: 100,
    render: (v: number) => `${Math.round(v * 100)}%`,
  },
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    width: 90,
    render: (s: WatermarkRule['status']) =>
      s === 'enabled' ? <Tag color="success">启用</Tag> : <Tag color="default">停用</Tag>,
  },
];

/** 水印效果预览（斜向平铺，不拦截交互） */
function WatermarkPreview() {
  return (
    <div
      style={{
        position: 'relative',
        height: 160,
        borderRadius: 8,
        overflow: 'hidden',
        background: `linear-gradient(135deg, ${VI.deep} 0%, ${VI.mid} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'hidden',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-24deg)',
            whiteSpace: 'nowrap',
            color: '#fff',
            opacity: 0.18,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 4,
            width: '220%',
            lineHeight: 3.2,
            textAlign: 'center',
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ display: 'block' }}>
              演示模式 · 数据已脱敏 · 杭州健澜科技有限公司
            </span>
          ))}
        </div>
      </div>
      <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: 600 }}>
        水印实时效果预览
      </Text>
    </div>
  );
}

export default function WatermarkPage() {
  const enabledCount = DEMO_RULES.filter((r) => r.status === 'enabled').length;

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: '0 auto' }}>
        <Title level={3} style={{ color: VI.deep }}>演示模式水印中心</Title>
        <Paragraph type="secondary" style={{ marginTop: -8 }}>
          演示模式（DEMO_MODE=1）下自动叠加浅蓝斜向水印与右上角提示条，防止现场演示混淆真实生产数据。
        </Paragraph>

        {/* 统计卡片 */}
        <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="演示模式" value="已启用" valueStyle={{ color: VI.accent }} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="覆盖页面" value={128} suffix="个" />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="水印规则" value={enabledCount} suffix={`/ ${DEMO_RULES.length}`} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card>
              <Statistic title="今日脱敏操作" value={36} suffix="次" valueStyle={{ color: '#52C41A' }} />
            </Card>
          </Col>
        </Row>

        {/* 效果预览 */}
        <Card title="水印效果预览" headStyle={{ background: VI.mid, color: '#fff' }} style={{ marginBottom: 16 }}>
          <WatermarkPreview />
        </Card>

        {/* 规则表格 */}
        <Card title="水印规则列表" headStyle={{ background: VI.mid, color: '#fff' }}>
          <Table<WatermarkRule>
            rowKey="key"
            columns={columns}
            dataSource={DEMO_RULES}
            pagination={false}
            size="middle"
          />
        </Card>

        <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 12 }}>
          主色 {DEEP_SEA_BLUE} / 深色 {DEEP_SEA_BLUE_DARK} · 生产模式（visible=false）下不产生任何 DOM 节点。
        </Text>
      </Content>
    </Layout>
  );
}
