/**
 * 健澜科技 jlmedaios - 小程序添加就诊人页（M3-J）
 *
 * 录入基本信息（L1），提交后提示去实名认证。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { post } = require('../../utils/request');
const { getToken } = require('../../utils/auth');

const RELATIONS = [
  { value: 'self', label: '本人' },
  { value: 'parent', label: '父母' },
  { value: 'child', label: '子女' },
  { value: 'spouse', label: '配偶' },
  { value: 'other', label: '其他' },
];

Page({
  data: {
    relations: RELATIONS,
    relationIndex: 0,
    name: '',
    gender: '未知',
    genderOptions: ['男', '女', '未知'],
    genderIndex: 2,
    birthDate: '',
    isDefault: false,
    submitting: false,
    loggedIn: false,
  },

  onShow() {
    this.setData({ loggedIn: !!getToken() });
  },

  onRelationChange(e) {
    this.setData({ relationIndex: Number(e.detail.value) });
  },

  onGenderChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ genderIndex: idx, gender: this.data.genderOptions[idx] });
  },

  onBirthChange(e) {
    this.setData({ birthDate: e.detail.value });
  },

  onDefaultChange(e) {
    this.setData({ isDefault: e.detail.value });
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value });
  },

  goLogin() {
    wx.navigateTo({ url: '/pages/login/index' });
  },

  handleSubmit() {
    if (!this.data.name.trim()) {
      wx.showToast({ title: '请填写姓名', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    const relation = RELATIONS[this.data.relationIndex].value;
    post('/internet/patient/profiles', {
      relation,
      name: this.data.name.trim(),
      gender: this.data.gender,
      birthDate: this.data.birthDate || undefined,
      isDefault: this.data.isDefault,
    })
      .then((data) => {
        wx.showToast({ title: '添加成功', icon: 'success' });
        // 重置表单
        this.setData({
          name: '',
          gender: '未知',
          genderIndex: 2,
          birthDate: '',
          isDefault: false,
          submitting: false,
        });
        wx.showModal({
          title: '是否立即实名认证',
          content: '完成实名认证后才可在线复诊、开具电子处方',
          confirmText: '去认证',
          cancelText: '稍后',
          success: (res) => {
            if (res.confirm) {
              wx.navigateTo({
                url: '/pages/realname/index?profileId=' + data.id,
              });
            } else {
              wx.switchTab({ url: '/pages/index/index' });
            }
          },
        });
      })
      .catch(() => {
        this.setData({ submitting: false });
      });
  },
});
