/**
 * 健澜科技 jlmedaios - 小程序请求封装（M3-J）
 *
 * 统一注入 token、处理 BFF 响应信封（code/message/data）、
 * 401 清登录态、错误提示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const { getToken, clearToken } = require('./auth');

/**
 * 发起请求
 * @param {object} options
 * @param {string} options.url - 接口路径（不含 baseUrl，如 /internet/patient/login）
 * @param {string} [options.method] - GET/POST
 * @param {object} [options.data] - 请求数据
 * @param {boolean} [options.silent] - 不弹错误提示
 * @param {boolean} [options.auth] - 是否需要登录（默认 true）
 */
function request(options) {
  const app = getApp();
  const { url, method = 'GET', data = {}, silent = false, auth = true } = options;
  const baseUrl = app.globalData.baseUrl + app.globalData.apiPrefix;
  const token = getToken();

  if (auth && !token) {
    if (!silent) wx.showToast({ title: '请先登录', icon: 'none' });
    return Promise.reject(new Error('NOT_LOGGED_IN'));
  }

  return new Promise((resolve, reject) => {
    wx.request({
      url: baseUrl + url,
      method,
      data,
      header: token ? { Authorization: 'Bearer ' + token } : {},
      success(res) {
        if (res.statusCode === 401) {
          clearToken();
          if (!silent) wx.showToast({ title: '登录已过期，请重新登录', icon: 'none' });
          wx.navigateTo({ url: '/pages/login/index' });
          reject(new Error('UNAUTHORIZED'));
          return;
        }
        const body = res.data || {};
        // BFF 信封：code === 0 成功
        if (typeof body.code !== 'undefined') {
          if (body.code === 0) {
            resolve(body.data);
            return;
          }
          if (!silent) {
            wx.showToast({ title: body.message || '请求失败', icon: 'none' });
          }
          reject(new Error(body.message || 'BIZ_ERROR'));
          return;
        }
        // 非标准信封
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(body);
        } else {
          if (!silent) wx.showToast({ title: '网络异常', icon: 'none' });
          reject(new Error('HTTP_' + res.statusCode));
        }
      },
      fail(err) {
        if (!silent) {
          wx.showToast({ title: '网络连接失败，请检查', icon: 'none' });
        }
        reject(err);
      },
    });
  });
}

module.exports = {
  request,
  get: (url, data, options = {}) => request({ url, method: 'GET', data, ...options }),
  post: (url, data, options = {}) => request({ url, method: 'POST', data, ...options }),
};
