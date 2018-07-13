const axios = require('axios')
const {baseUrl} = require('./env.js')

// 创建axios实例
const service = axios.create({
  baseURL: baseUrl, // api的base_url
  withCredentials: true,
  transformRequest: [function (data) {
    // 对 data 进行任意转换处理
    if (data) {
      let dataStr = '' // 数据拼接字符串
      Object.keys(data).forEach(key => {
        dataStr += key + '=' + data[key] + '&'
      })
      return dataStr
    } else {
      return data
    }
  }],
  timeout: 5000 // 请求超时时间
})

// request拦截器
service.interceptors.request.use(config => {
  return config
}, error => {
  Promise.reject(error)
})

// respone拦截器
service.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    alert(error)
    return Promise.reject(error)
  })

module.exports = service
