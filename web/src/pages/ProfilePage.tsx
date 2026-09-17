/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 个人中心：基本信息 / 修改密码 / 偏好设置 / 安全设置 / 我的数据 / 账号注销
 */
import { Fragment, useState } from 'react';
import {
  App as AntdApp,
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Upload,
} from 'antd';
import type { UploadProps } from 'antd';
import {
  CameraOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  KeyOutlined,
  LogoutOutlined,
} from '@ant-design/icons';

import PageContainer from '@/components/common/PageContainer';
import MfaSettings from '@/pages/profile/MfaSettings';
import { useAuthStore } from '@/store/authStore';
import type { LoginDevice, UserPreferences } from '@/types/auth';

const DEVICES: LoginDevice[] = [
  {
    id: 'd1',
    name: '当前设备',
    browser: 'Chrome',
    os: 'Windows 11',
    ip: '10.20.3.15',
    location: '杭州-院内',
    current: true,
    lastActiveAt: '2026-09-16 10:24',
  },
  {
    id: 'd2',
    name: 'MacBook Pro',
    browser: 'Safari',
    os: 'macOS',
    ip: '10.20.3.28',
    location: '杭州-院内',
    current: false,
    lastActiveAt: '2026-09-15 18:02',
  },
  {
    id: 'd3',
    name: 'iPhone 15',
    browser: '企业微信',
    os: 'iOS 17',
    ip: '202.105.24.11',
    location: '上海-异地',
    current: false,
    lastActiveAt: '2026-09-14 09:11',
  },
];

const DEFAULT_PREF: UserPreferences = {
  theme: 'light',
  language: 'zh-CN',
  homePage: 'dashboard',
  fontSize: 'middle',
  tableSize: 'middle',
  notifyCritical: true,
  notifyMessage: true,
  notifyEmail: false,
};

export default function ProfilePage() {
  const { message, modal } = AntdApp.useApp();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const changePassword = useAuthStore((s) => s.changePassword);

  const [editing, setEditing] = useState(false);
  const [pref, setPref] = useState<UserPreferences>(DEFAULT_PREF);
  const [devices, setDevices] = useState<LoginDevice[]>(DEVICES);
  const [profileForm] = Form.useForm();

  const avatarProps: UploadProps = {
    showUploadList: false,
    beforeUpload: () => {
      message.success('头像已更新（演示）');
      return false;
    },
  };

  const onSaveProfile = async () => {
    const values = await profileForm.validateFields();
    updateProfile(values);
    setEditing(false);
    message.success('基本信息已保存');
  };

  const onChangePwd = async (v: {
    oldPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    await changePassword(v);
    message.success('密码修改成功，请妥善保管');
  };

  const revokeDevice = (id: string) => {
    setDevices((ds) => ds.filter((d) => d.id !== id));
    message.success('设备已下线');
  };

  const confirmDeleteAccount = () => {
    modal.confirm({
      title: '确认注销账号？',
      content: '注销后所有个人数据将按医疗法规要求脱敏保留，此操作不可恢复。',
      okText: '确认注销',
      okButtonProps: { danger: true },
      cancelText: '再想想',
      onOk: () => message.warning('演示环境不执行真实注销'),
    });
  };

  const basicInfo = (
    <Card>
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 24 }}>
        <Avatar size={80} style={{ backgroundColor: '#0A4D8C' }}>
          {user?.realName?.[0] ?? 'U'}
        </Avatar>
        <div>
          <div style={{ fontSize: 18, fontWeight: 600 }}>{user?.realName}</div>
          <div style={{ color: '#8c8c8c' }}>
            {user?.deptName} · {user?.title}
          </div>
          <Upload {...avatarProps} style={{ marginTop: 8 }}>
            <Button size="small" icon={<CameraOutlined />}>
              更换头像
            </Button>
          </Upload>
        </div>
      </div>
      <Form
        form={profileForm}
        layout="vertical"
        disabled={!editing}
        initialValues={{
          realName: user?.realName,
          employeeNo: user?.employeeNo,
          deptName: user?.deptName,
          title: user?.title,
          phone: user?.phone,
          email: user?.email,
        }}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="姓名" name="realName">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="工号" name="employeeNo">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="科室" name="deptName">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="职称" name="title">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="手机号" name="phone">
              <Input />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="邮箱" name="email">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <div style={{ textAlign: 'right' }}>
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)} style={{ marginRight: 8 }}>
                取消
              </Button>
              <Button type="primary" onClick={onSaveProfile}>
                保存
              </Button>
            </>
          ) : (
            <Button type="primary" onClick={() => setEditing(true)}>
              编辑
            </Button>
          )}
        </div>
      </Form>
    </Card>
  );

  const changePwd = (
    <Card title="修改密码">
      <Form
        layout="vertical"
        onFinish={onChangePwd}
        style={{ maxWidth: 480 }}
        initialValues={{ confirmPassword: '' }}
      >
        <Form.Item
          name="oldPassword"
          label="当前密码"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password placeholder="当前密码" />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[
            { required: true, message: '请输入新密码' },
            { min: 8, max: 20, message: '8-20 位' },
          ]}
        >
          <Input.Password placeholder="8-20 位，含大小写字母、数字、特殊字符" />
        </Form.Item>
        <Form.Item
          name="confirmPassword"
          label="确认新密码"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: '请再次输入新密码' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                return Promise.reject(new Error('两次输入不一致'));
              },
            }),
          ]}
        >
          <Input.Password placeholder="再次输入新密码" />
        </Form.Item>
        <Button type="primary" htmlType="submit" icon={<KeyOutlined />}>
          提交修改
        </Button>
      </Form>
    </Card>
  );

  const preferences = (
    <Card title="偏好设置">
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <div className="jl-label">主题</div>
          <Segmented
            block
            options={[
              { label: '浅色', value: 'light' },
              { label: '深色', value: 'dark' },
              { label: '跟随系统', value: 'system' },
            ]}
            value={pref.theme}
            onChange={(v) => setPref({ ...pref, theme: v as UserPreferences['theme'] })}
          />
        </Col>
        <Col span={12}>
          <div className="jl-label">语言</div>
          <Segmented
            block
            options={[
              { label: '中文', value: 'zh-CN' },
              { label: 'English', value: 'en-US' },
            ]}
            value={pref.language}
            onChange={(v) => setPref({ ...pref, language: v as UserPreferences['language'] })}
          />
        </Col>
        <Col span={12}>
          <div className="jl-label">默认首页</div>
          <Select
            style={{ width: '100%' }}
            value={pref.homePage}
            onChange={(v) => setPref({ ...pref, homePage: v })}
            options={[
              { label: '工作台', value: 'dashboard' },
              { label: 'AI 对话', value: 'chat' },
              { label: '患者列表', value: 'patients' },
            ]}
          />
        </Col>
        <Col span={12}>
          <div className="jl-label">字体大小</div>
          <Segmented
            block
            options={[
              { label: '小', value: 'small' },
              { label: '中', value: 'middle' },
              { label: '大', value: 'large' },
            ]}
            value={pref.fontSize}
            onChange={(v) => setPref({ ...pref, fontSize: v as UserPreferences['fontSize'] })}
          />
        </Col>
        <Col span={12}>
          <div className="jl-label">表格密度</div>
          <Segmented
            block
            options={[
              { label: '紧凑', value: 'small' },
              { label: '默认', value: 'middle' },
              { label: '宽松', value: 'large' },
            ]}
            value={pref.tableSize}
            onChange={(v) => setPref({ ...pref, tableSize: v as UserPreferences['tableSize'] })}
          />
        </Col>
        <Col span={24}>
          <div className="jl-label" style={{ marginBottom: 8 }}>
            通知设置
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>危急值实时推送</span>
              <Switch
                checked={pref.notifyCritical}
                onChange={(v) => setPref({ ...pref, notifyCritical: v })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>站内消息通知</span>
              <Switch
                checked={pref.notifyMessage}
                onChange={(v) => setPref({ ...pref, notifyMessage: v })}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>邮件通知</span>
              <Switch
                checked={pref.notifyEmail}
                onChange={(v) => setPref({ ...pref, notifyEmail: v })}
              />
            </div>
          </div>
        </Col>
      </Row>
    </Card>
  );

  const security = (
    <Card title="安全设置" style={{ marginBottom: 16 }}>
      <Descriptions column={1} bordered size="small">
        <Descriptions.Item label="API 密钥">
          <code style={{ background: '#f5f7fa', padding: '2px 6px', borderRadius: 4 }}>
            sk-live-••••••••4f2a
          </code>
          <Button size="small" type="link" onClick={() => message.success('已重新生成 API 密钥')}>
            重新生成
          </Button>
        </Descriptions.Item>
      </Descriptions>
      <div style={{ margin: '16px 0 8px', fontWeight: 600 }}>登录设备管理</div>
      <Table<LoginDevice>
        rowKey="id"
        size="small"
        pagination={false}
        dataSource={devices}
        columns={[
          { title: '设备', dataIndex: 'name' },
          { title: '浏览器/系统', render: (_, r) => `${r.browser} / ${r.os}` },
          { title: 'IP / 地点', render: (_, r) => `${r.ip}（${r.location}）` },
          { title: '最近活跃', dataIndex: 'lastActiveAt' },
          {
            title: '操作',
            render: (_, r) =>
              r.current ? (
                <Tag color="processing">当前设备</Tag>
              ) : (
                <Button
                  size="small"
                  danger
                  icon={<LogoutOutlined />}
                  onClick={() => revokeDevice(r.id)}
                >
                  下线
                </Button>
              ),
          },
        ]}
      />
    </Card>
  );

  const myData = (
    <Card title="我的数据" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={4}>
          <Statistic title="门诊量（本月）" value={286} />
        </Col>
        <Col span={4}>
          <Statistic title="出院人数" value={42} />
        </Col>
        <Col span={4}>
          <Statistic title="手术量" value={18} />
        </Col>
        <Col span={4}>
          <Statistic title="病历数" value={312} />
        </Col>
        <Col span={4}>
          <Statistic title="病历合格率" value={98.6} suffix="%" />
        </Col>
        <Col span={4}>
          <Statistic title="质控得分" value={96.2} suffix="分" />
        </Col>
      </Row>
      <div style={{ marginTop: 16, color: '#8c8c8c', fontSize: 13 }}>
        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />近 30 天无危急值漏报，近
        7 天活跃。
      </div>
    </Card>
  );

  const danger = (
    <Card title="高危操作">
      <Popconfirm title="确认注销账号？此操作不可恢复" onConfirm={confirmDeleteAccount}>
        <Button danger icon={<DeleteOutlined />}>
          注销账号
        </Button>
      </Popconfirm>
    </Card>
  );

  return (
    <PageContainer title="个人中心" description="管理您的账号、偏好与安全设置">
      <Tabs
        items={[
          { key: 'basic', label: '基本信息', children: basicInfo },
          { key: 'pwd', label: '修改密码', children: changePwd },
          { key: 'pref', label: '偏好设置', children: preferences },
          { key: 'sec', label: '安全设置', children: <Fragment><MfaSettings />{security}</Fragment> },
          { key: 'data', label: '我的数据', children: myData },
          { key: 'danger', label: '账号注销', children: danger },
        ]}
      />
    </PageContainer>
  );
}
