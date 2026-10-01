/**
 * 健澜科技 jlmedaios - 小程序发起问诊页（M3-K）
 *
 * 选择就诊人（默认/传入）→ 选择医生 → 填主诉 → 发起复诊 → 跳聊天页。
 * 合规：仅展示已实名就诊人与已审核医生；发起前服务端再次校验复诊资格。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { get, post } = require('../../utils/request');

Page({
  data: {
    profiles: [],
    profileIndex: 0,
    doctors: [],
    selectedDoctor: '',
    department: '',
    chiefComplaint: '',
    submitting: false,
  },

  onLoad(options) {
    this.presetProfileId = options.profileId || '';
    this.loadAll();
  },

  loadAll() {
    get('/internet/patient/profiles', null, { silent: true })
      .then((list) => {
        const profiles = list || [];
        let idx = 0;
        if (this.presetProfileId) {
          const i = profiles.findIndex((p) => p.id === this.presetProfileId);
          if (i >= 0) idx = i;
        } else {
          const di = profiles.findIndex((p) => p.isDefault);
          if (di >= 0) idx = di;
        }
        this.setData({ profiles, profileIndex: idx });
      })
      .catch(() => {});
    get('/internet/consultation/doctors', null, { silent: true })
      .then((doctors) => this.setData({ doctors: doctors || [] }))
      .catch(() => {});
  },

  onProfileChange(e) {
    this.setData({ profileIndex: Number(e.detail.value) });
  },

  onDepartmentInput(e) {
    this.setData({ department: e.detail.value });
    get('/internet/consultation/doctors', { department: e.detail.value }, { silent: true })
      .then((doctors) => this.setData({ doctors: doctors || [] }))
      .catch(() => {});
  },

  selectDoctor(e) {
    this.setData({ selectedDoctor: e.currentTarget.dataset.id });
  },

  onComplaintInput(e) {
    this.setData({ chiefComplaint: e.detail.value });
  },

  onSubmit() {
    const { profiles, profileIndex, selectedDoctor, chiefComplaint, submitting } = this.data;
    if (submitting) return;
    const profile = profiles[profileIndex];
    if (!profile) {
      wx.showToast({ title: '请先添加就诊人', icon: 'none' });
      return;
    }
    if (profile.authLevel < 2) {
      wx.showToast({ title: '请先完成实名认证', icon: 'none' });
      return;
    }
    if (!selectedDoctor) {
      wx.showToast({ title: '请选择医生', icon: 'none' });
      return;
    }
    if (!chiefComplaint.trim()) {
      wx.showToast({ title: '请填写主诉', icon: 'none' });
      return;
    }
    this.setData({ submitting: true });
    post('/internet/consultation/start', {
      profileId: profile.id,
      doctorId: selectedDoctor,
      chiefComplaint: chiefComplaint.trim(),
    })
      .then((session) => {
        wx.redirectTo({
          url: '/pages/consultation-chat/index?id=' + session.id,
        });
      })
      .catch(() => {})
      .then(() => this.setData({ submitting: false }));
  },
});
