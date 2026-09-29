/**
 * 健澜科技 jlmedaios - 小程序登录页（M3-J）
 *
 * wx.login 获取 code -> 后端换患者 token。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { post } = require('../../utils/request');

Page({
  data: {
    logging: false,
  },

  onLoad() {
    // 自动尝试登录（也可由用户点击按钮触发）
  },

  /** 微信授权登录 */
  handleLogin() {
    if (this.data.logging) return;
    this.setData({ logging: true });
    wx.login({
      success: (res) => {
        if (!res.code) {
          this.setData({ logging: false });
          wx.showToast({ title: '微信登录失败', icon: 'none' });
          return;
        }
        // 登录接口无需 token（auth=false）
        post(
          '/internet/patient/login',
          { code: res.code },
          { auth: false },
        )
          .then((data) => {
            const app = getApp();
            app.saveLogin(data.token, data.accountId);
            wx.showToast({
              title: data.isDemoLogin ? '演示登录成功' : '登录成功',
              icon: 'success',
            });
            setTimeout(() => {
              // 登录成功后返回首页
              wx.switchTab({ url: '/pages/index/index' });
            }, 600);
          })
          .catch(() => {
            this.setData({ logging: false });
          });
      },
      fail: () => {
        this.setData({ logging: false });
        wx.showToast({ title: '微信登录调用失败', icon: 'none' });
      },
    });
  },
});
