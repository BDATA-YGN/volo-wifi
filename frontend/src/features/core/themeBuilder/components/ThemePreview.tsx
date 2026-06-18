"use client";

import React, { useState } from 'react';
import { Card, Typography, Space, Button, Breadcrumb, Menu, Layout, Input, Table, Tabs, Tag, Switch, Alert, Select, Radio } from 'antd';
import { ThemeConfig, ConfigProvider } from 'antd';
import { HomeOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import ThemeToggle from './ThemeToggle';

const { Title, Text } = Typography;
const { Header, Content, Footer, Sider } = Layout;

interface ThemePreviewProps {
  theme: ThemeConfig;
  title: string;
  state: any;
  onModeChange: (mode: any) => void;
  systemThemeMode: string;
}

const ThemePreview: React.FC<ThemePreviewProps> = ({ theme, title, state, onModeChange, systemThemeMode }) => {
  const dataSource = [
    {
      key: '1',
      name: 'John Doe',
      age: 32,
      address: 'New York No. 1 Lake Park',
      tags: ['admin', 'user'],
    },
    {
      key: '2',
      name: 'Jane Smith',
      age: 42,
      address: 'London No. 1 Lake Park',
      tags: ['user'],
    },
  ];
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Age',
      dataIndex: 'age',
      key: 'age',
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags: string[]) => (
        <>
          {tags.map(tag => (
            <Tag color={tag === 'admin' ? 'blue' : 'green'} key={tag}>
              {tag}
            </Tag>
          ))}
        </>
      ),
    },
  ];

  return (
    <Card 
      className="h-full overflow-auto"
      title={
        <h5>{title} Preview</h5>
      }
      extra={<>
         <ThemeToggle
            mode={systemThemeMode}
            onChange={onModeChange}
          />
      </>}
      styles={{
        body: { padding: 0, overflow: 'auto' },
      }}
    > 
      <ConfigProvider theme={theme}>
        <Space orientation="vertical" className="w-full">
          <Card title="Basic Components" className="mb-4">
            <Space orientation="vertical" className="w-full">
              <Space wrap>
                <Button type="primary">Primary Button</Button>
                <Button>Default Button</Button>
                <Button type="dashed">Dashed Button</Button>
                <Button type="text">Text Button</Button>
                <Button type="link">Link Button</Button>
              </Space>
              <Space wrap>
                <Button type="primary" danger>Danger</Button>
                <Button type="primary" disabled>Disabled</Button>
                <Button type="primary" loading>Loading</Button>
              </Space>
            </Space>
          </Card>

          <Card title="Navigation Components" className="mb-4">
            <Breadcrumb
              className="mb-4"
              items={[
                {
                  href: '#',
                  title: (
                    <>
                      <HomeOutlined />
                      <span>Home</span>
                    </>
                  ),
                },
                {
                  href: '#',
                  title: (
                    <>
                      <UserOutlined />
                      <span>User</span>
                    </>
                  ),
                },
                {
                  title: (
                    <>
                      <SettingOutlined />
                      <span>Settings</span>
                    </>
                  ),
                },
              ]}
            />

            <Menu
              mode="horizontal"
              className="mb-4"
              defaultSelectedKeys={['1']}
              items={[
                { key: '1', label: 'Home' },
                { key: '2', label: 'Profile' },
                { key: '3', label: 'Settings' },
                {
                  key: 'more',
                  label: 'More',
                  children: [
                    { key: '4', label: 'About' },
                    { key: '5', label: 'Help' },
                  ],
                },
              ]}
            />

            <Tabs
              defaultActiveKey="1"
              className="mb-4"
              items={[
                { key: '1', label: 'Tab 1', children: 'Content of Tab 1' },
                { key: '2', label: 'Tab 2', children: 'Content of Tab 2' },
                { key: '3', label: 'Tab 3', children: 'Content of Tab 3' },
              ]}
            />
          </Card>

          <Card title="Layout Example" className="mb-4 shadow-sm">
            <Layout className="mb-4">
              <Header className="h-10 flex items-center">
                <div className="text-white">Header</div>
              </Header>
              <Content className="min-h-[80px] p-4">
                <div>Content</div>
              </Content>
              <Footer className="h-10 flex items-center justify-center">
                <div>Footer</div>
              </Footer>
            </Layout>
          </Card>

          <Card title="Data Display & Input" className="mb-4 shadow-sm">
            <Space orientation="vertical" className="w-full">
              <Space className="mb-4" orientation="vertical">
                <Input placeholder="Basic input" className="max-w-xs" />
                <Input.Password placeholder="Password input" className="max-w-xs" />
                <Input.Search placeholder="Search input" className="max-w-xs" />
              </Space>

              <Table
                dataSource={dataSource}
                columns={columns}
                pagination={false}
                size="small"
                className="mb-4"
              />

              <Space className="mb-4" wrap>
                <Select
                  defaultValue="option1"
                  style={{ width: 120 }}
                  options={[
                    { value: 'option1', label: 'Option 1' },
                    { value: 'option2', label: 'Option 2' },
                  ]}
                />
                <Radio.Group defaultValue="a">
                  <Radio value="a">A</Radio>
                  <Radio value="b">B</Radio>
                  <Radio value="c">C</Radio>
                </Radio.Group>
                <Switch defaultChecked />
              </Space>

              <Space className="mb-4" orientation="horizontal">
                <Alert title="Success Alert" type="success" />
                <Alert title="Info Alert" type="info" />
                <Alert title="Warning Alert" type="warning" />
                <Alert title="Error Alert" type="error" />
              </Space>
            </Space>
          </Card>
        </Space>
      </ConfigProvider>
    </Card>
  );
};

export default ThemePreview;