/**
 * 健澜科技 jlmedaios - 小程序问诊聊天页（M3-K）
 *
 * 加载会话与消息，轮询医生回复；患者发送消息、待接诊时取消。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { get, post } = require('../../utils/request');

Page({
  data: {
    sessionId: '',
    session: null,
    messages: [],
    input: '',
    sending: false,
    canSend: false,
    canCancel: false,
  },

  onLoad(options) {
    this.sessionId = options.id;
    this.setData({ sessionId: this.sessionId });
    this.load();
  },

  onShow() {
    // 每 5 秒轮询一次（医生回复）
    this.timer = setInterval(() => {
      if (this.data.session && this.data.session.status === 'in_consultation') {
        this.load(true);
      }
    }, 5000);
  },

  onHide() {
    if (this.timer) clearInterval(this.timer);
  },

  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },

  load(silent) {
    get('/internet/consultation/sessions/' + this.sessionId, null, { silent: true })
      .then((detail) => {
        const status = detail.session.status;
        this.setData({
          session: detail.session,
          messages: detail.messages || [],
          canSend: status === 'in_consultation',
          canCancel: status === 'pending' || status === 'in_consultation',
        });
      })
      .catch(() => {
        if (!silent) wx.showToast({ title: '加载失败', icon: 'none' });
      });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  send() {
    const content = this.data.input.trim();
    if (!content || this.data.sending) return;
    this.setData({ sending: true });
    post('/internet/consultation/sessions/' + this.sessionId + '/messages', {
      content,
    })
      .then(() => {
        this.setData({ input: '' });
        this.load(true);
      })
      .catch(() => {})
      .then(() => this.setData({ sending: false }));
  },

  cancel() {
    wx.showModal({
      title: '取消问诊',
      content: '确定要取消本次问诊吗？',
      success: (res) => {
        if (res.confirm) {
          post('/internet/consultation/sessions/' + this.sessionId + '/cancel', {})
            .then(() => this.load(true))
            .catch(() => {});
        }
      },
    });
  },
});
