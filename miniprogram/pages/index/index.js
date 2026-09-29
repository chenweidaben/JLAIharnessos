/**
 * 健澜科技 jlmedaios - 小程序就诊人列表首页（M3-J）
 *
 * 加载账号下就诊人，未登录跳登录；展示认证等级与 EMPI 绑定。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { get } = require('../../utils/request');
const { getToken } = require('../../utils/auth');

Page({
  data: {
    profiles: [],
    loading: true,
    loggedIn: false,
  },

  onShow() {
    const token = getToken();
    if (!token) {
      this.setData({ loggedIn: false, loading: false, profiles: [] });
      return;
    }
    this.setData({ loggedIn: true });
    this.loadProfiles();
  },

  loadProfiles() {
    this.setData({ loading: true });
    get('/internet/patient/profiles')
      .then((list) => {
        this.setData({ profiles: list || [], loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  goAdd() {
    wx.switchTab({ url: '/pages/profile-add/index' });
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/profile-detail/index?id=' + id });
  },

  goRealname(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: '/pages/realname/index?profileId=' + id });
  },
});
