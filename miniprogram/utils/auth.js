/**
 * 健澜科技 jlmedaios - 小程序登录态存储（M3-J）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const TOKEN_KEY = 'jlmedaios_patient_token';
const ACCOUNT_KEY = 'jlmedaios_account_id';

function getToken() {
  try {
    return wx.getStorageSync(TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setToken(token) {
  try {
    wx.setStorageSync(TOKEN_KEY, token);
  } catch (e) {
    // ignore
  }
}

function getAccountId() {
  try {
    return wx.getStorageSync(ACCOUNT_KEY) || '';
  } catch (e) {
    return '';
  }
}

function setAccountId(id) {
  try {
    wx.setStorageSync(ACCOUNT_KEY, id);
  } catch (e) {
    // ignore
  }
}

function clearToken() {
  try {
    wx.removeStorageSync(TOKEN_KEY);
    wx.removeStorageSync(ACCOUNT_KEY);
  } catch (e) {
    // ignore
  }
}

module.exports = {
  getToken,
  setToken,
  getAccountId,
  setAccountId,
  clearToken,
};
