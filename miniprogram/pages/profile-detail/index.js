/**
 * 健澜科技 jlmedaios - 小程序就诊人详情页（M3-J）
 *
 * 展示就诊人信息与认证状态，提供去实名认证入口。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { get } = require('../../utils/request');

Page({
  data: {
    id: '',
    profile: null,
    loading: true,
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
    if (options.id) this.loadDetail(options.id);
  },

  loadDetail(id) {
    get('/internet/patient/profiles/' + id)
      .then((profile) => {
        this.setData({ profile, loading: false });
      })
      .catch(() => {
        this.setData({ loading: false });
      });
  },

  goRealname() {
    wx.navigateTo({ url: '/pages/realname/index?profileId=' + this.data.id });
  },
});
