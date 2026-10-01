/**
 * 健澜科技 jlmedaios - 小程序问诊列表页（M3-K）
 *
 * 展示我的问诊会话，点击进入聊天；底部发起新问诊。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { get } = require('../../utils/request');
const { getToken } = require('../../utils/auth');

const STATUS_TEXT = {
  pending: '待接诊',
  in_consultation: '问诊中',
  completed: '已结束',
  cancelled: '已取消',
  timed_out: '已超时',
};

Page({
  data: {
    sessions: [],
    loading: true,
    loggedIn: false,
  },

  onShow() {
    if (!getToken()) {
      this.setData({ loggedIn: false, loading: false, sessions: [] });
      return;
    }
    this.setData({ loggedIn: true });
    this.load();
  },

  load() {
    this.setData({ loading: true });
    get('/internet/consultation/sessions', null, { silent: true })
      .then((list) => {
        const sessions = (list || []).map((s) => ({
          ...s,
          statusText: STATUS_TEXT[s.status] || s.status,
        }));
        this.setData({ sessions, loading: false });
      })
      .catch(() => this.setData({ loading: false }));
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  goStart() {
    wx.navigateTo({ url: '/pages/consultation-start/index' });
  },

  goChat(e) {
    wx.navigateTo({
      url: '/pages/consultation-chat/index?id=' + e.currentTarget.dataset.id,
    });
  },
});
