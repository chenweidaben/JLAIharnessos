/**
 * 健澜科技 jlmedaios - 数字陪诊工作站页面（M3-Q）
 *
 * 患者演示登录 → 就诊人管理 / 家属代办授权 / 数字陪诊向导。
 * 健康门禁 + 全屏水印 + 断库 Alert。
 *
 * 版权所有（c）2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Row,
  Space,
  Tabs,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import {
  useDigitalCompanionStore,
} from '@/store/digitalCompanionStore';
import { CompanionGuide } from '@/components/digitalCompanion/CompanionGuide';
import { DelegationManager } from '@/components/digitalCompanion/DelegationManager';

const { Title, Text, Paragraph } = Typography;

function ProfileManager() {
  const { profiles, addProfile, submitting } = useDigitalCompanionStore();
  const [form] = Form.useForm();
  const [error, setError] = useState('');

  const handleAdd = async () => {
    try {
      const v = await form.validateFields();
      setError('');
      await addProfile({
        relation: v.relation,
        name: v.name,
        gender: v.gender,
        birthDate: v.birthDate,
      });
      form.resetFields();
    } catch (err) {
      if (err instanceof Error) setError(err.message);
    }
  };

  return (
    <Row gutter={16}>
      <Col xs={24} md={12}>
        <Card title="我的就诊人" size="small">
          {profiles.length === 0 ? (
            <Text type="secondary">暂无就诊人，请在右侧添加。</Text>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              {profiles.map((p) => (
                <Card key={p.id} size="small">
                  <Space wrap>
                    <Text strong>{p.nameMasked ?? '就诊人'}</Text>
                    <Tag>{relationLabel(p.relation)}</Tag>
                    <Tag color={p.authLevel >= 2 ? 'green' : 'default'}>
                      {p.authLevel >= 2 ? '已实名' : '未实名'}
                    </Tag>
                    {p.delegatedScopes.length > 0 && (
                      <Tag color="blue">已授权 {p.delegatedScopes.length} 项</Tag>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          )}
        </Card>
      </Col>
      <Col xs={24} md={12}>
        <Card title="添加就诊人" size="small">
          <Form form={form} layout="vertical">
            <Form.Item
              name="name"
              label="姓名"
              rules={[{ required: true, message: '请输入姓名' }]}
            >
              <Input placeholder="就诊人真实姓名" />
            </Form.Item>
            <Form.Item name="relation" label="与本人关系" initialValue="self">
              <Input placeholder="self/parent/child/spouse/other" />
            </Form.Item>
            <Form.Item name="gender" label="性别">
              <Input placeholder="男/女" />
            </Form.Item>
            <Form.Item name="birthDate" label="出生日期">
              <Input placeholder="YYYY-MM-DD" />
            </Form.Item>
            {error && (
              <Alert
                type="error"
                showIcon
                message={error}
                style={{ marginBottom: 12 }}
              />
            )}
            <Button
              type="primary"
              loading={submitting}
              onClick={handleAdd}
              data-testid="add-profile-btn"
            >
              添加
            </Button>
          </Form>
        </Card>
      </Col>
    </Row>
  );
}

function PatientLogin() {
  const { login, submitting } = useDigitalCompanionStore();
  const [code, setCode] = useState('patient');
  const [error, setError] = useState('');

  const handleLogin = async () => {
    setError('');
    try {
      await login(code);
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    }
  };

  return (
    <Row justify="center" style={{ marginTop: 40 }}>
      <Col xs={24} md={10}>
        <Card>
          <Title level={4}>患者端登录（演示）</Title>
          <Paragraph type="secondary">
            真实载体为微信小程序一键登录；此处为 Web 演示入口，输入任意登录码即可。
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="登录码"
              onPressEnter={handleLogin}
            />
            {error && <Alert type="error" showIcon message={error} />}
            <Button
              type="primary"
              loading={submitting}
              onClick={handleLogin}
              block
              data-testid="patient-login-btn"
            >
              登录
            </Button>
          </Space>
        </Card>
      </Col>
    </Row>
  );
}

export default function DigitalCompanionPage() {
  const {
    healthOk,
    healthMsg,
    checking,
    loggedIn,
    isDemoLogin,
    checkHealth,
  } = useDigitalCompanionStore();

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  return (
    <Watermark content="健澜科技 数字陪诊" gap={[160, 160]}>
      <div style={{ padding: 16, minHeight: '70vh' }}>
        <Title level={3}>数字陪诊</Title>

        {!healthOk && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message={healthMsg || '系统检查中…'}
            description="系统不可用时，数字陪诊服务暂停，不会以缓存或假数据冒充服务。"
            action={
              <Button
                size="small"
                loading={checking}
                onClick={() => void checkHealth()}
              >
                重新检查
              </Button>
            }
          />
        )}

        {healthOk && !loggedIn && <PatientLogin />}

        {healthOk && loggedIn && (
          <>
            {isDemoLogin && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
                message="当前为本地演示登录（非真实微信账号），数据仅用于演示。"
              />
            )}
            <Tabs
              defaultActiveKey="guide"
              items={[
                {
                  key: 'guide',
                  label: '陪诊向导',
                  children: <CompanionGuide />,
                },
                {
                  key: 'delegation',
                  label: '家属代办授权',
                  children: <DelegationManager />,
                },
                {
                  key: 'profiles',
                  label: '就诊人管理',
                  children: <ProfileManager />,
                },
              ]}
            />
          </>
        )}
      </div>
    </Watermark>
  );
}

function relationLabel(r: string): string {
  const map: Record<string, string> = {
    self: '本人',
    parent: '父母',
    child: '子女',
    spouse: '配偶',
    other: '其他',
  };
  return map[r] ?? r;
}
