/**
 * 健澜科技 jlmedaios - 微信小程序全局逻辑（M3-J）
 *
 * 登录态（患者 token）管理；启动时检查登录态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { getToken, setToken, clearToken } = require('./utils/auth');

App({
  globalData: {
    token: '',
    accountId: '',
    // BFF 基础地址：真机/开发请改为可访问的 https 域名（需在小程序后台配置 request 合法域名）
    baseUrl: 'http://127.0.0.1:8080',
    apiPrefix: '/api/v1',
  },

  onLaunch() {
    const token = getToken();
    if (token) {
      this.globalData.token = token;
    }
  },

  /** 保存登录态 */
  saveLogin(token, accountId) {
    this.globalData.token = token;
    this.globalData.accountId = accountId;
    setToken(token);
  },

  /** 退出登录 */
  logout() {
    this.globalData.token = '';
    this.globalData.accountId = '';
    clearToken();
  },
});
