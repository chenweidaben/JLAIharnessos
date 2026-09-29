/**
 * 健澜科技 jlmedaios - 小程序实名认证页（M3-J）
 *
 * 录入真实姓名 + 身份证号 + 人脸（可选），
 * 调用后端实名认证（本地演示/第三方），通过后绑定 EMPI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const { post } = require('../../utils/request');

Page({
  data: {
    profileId: '',
    realName: '',
    idCard: '',
    faceImageBase64: '',
    faceCaptured: false,
    submitting: false,
    result: null,
  },

  onLoad(options) {
    this.setData({ profileId: options.profileId || '' });
  },

  onNameInput(e) {
    this.setData({ realName: e.detail.value });
  },

  onIdCardInput(e) {
    this.setData({ idCard: e.detail.value });
  },

  /**
   * 人脸采集：
   * 真实环境应使用微信人脸核身（wx.startFacialRecognitionVerify，需小程序具备相应资质），
   * 这里以 chooseMedia 采集照片并转 base64 作为基座演示，明确标注。
   */
  captureFace() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath;
        const fs = wx.getFileSystemManager();
        // 转 base64（真实生产建议后端直接接收文件，避免大图 base64）
        fs.readFile({
          filePath: tempPath,
          encoding: 'base64',
          success: (r) => {
            this.setData({ faceImageBase64: r.data, faceCaptured: true });
            wx.showToast({ title: '人脸采集成功', icon: 'success' });
          },
          fail: () => {
            wx.showToast({ title: '人脸读取失败', icon: 'none' });
          },
        });
      },
      fail: () => {
        // 用户取消等
      },
    });
  },

  handleSubmit() {
    if (!this.data.profileId) {
      wx.showToast({ title: '缺少就诊人信息', icon: 'none' });
      return;
    }
    if (!this.data.realName.trim()) {
      wx.showToast({ title: '请填写真实姓名', icon: 'none' });
      return;
    }
    if (!this.data.idCard.trim()) {
      wx.showToast({ title: '请填写身份证号', icon: 'none' });
      return;
    }
    if (this.data.submitting) return;
    this.setData({ submitting: true });

    post('/internet/patient/realname', {
      profileId: this.data.profileId,
      realName: this.data.realName.trim(),
      idCard: this.data.idCard.trim(),
      faceImageBase64: this.data.faceImageBase64 || undefined,
    })
      .then((data) => {
        this.setData({ submitting: false, result: data });
        if (data.passed) {
          wx.showToast({
            title: data.isDemo ? '演示认证通过' : '实名认证通过',
            icon: 'success',
          });
        } else {
          wx.showToast({ title: '认证未通过', icon: 'none' });
        }
      })
      .catch(() => {
        this.setData({ submitting: false });
      });
  },

  goBack() {
    wx.navigateBack();
  },
});
