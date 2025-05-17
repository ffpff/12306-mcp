#!/usr/bin/env node

// 导入必要的模块
import fetch from 'node-fetch';
import { parseRawCookies, formatCookies } from './build/utils.js';

// 全局配置
const API_BASE = 'https://kyfw.12306.cn';
let USER_COOKIES = null;

// 初始化cookie
function initCookies() {
  // 从环境变量或直接设置cookie
  const cookieStr = "JSESSIONID=8EE8485F6E2ABBE69CB257659A64A3CD; tk=jc3CVakgorz0LrQn_fJ3zwsCnbLjtjgqxt-isTTBo_Yubc1c0; route=6f50b51faa11b987e576cdb301e545c4; BIGipServerotn=1507393802.64545.0000; BIGipServerpassport=770179338.50215.0000; guidesStatus=off; highContrastMode=defaltMode; cursorStatus=off; _jc_save_fromStation=%u6DF1%u5733%u5317%2CIOQ; _jc_save_toStation=%u5E7F%u5DDE%2CGZQ; _jc_save_toDate=2025-05-16; _jc_save_wfdc_flag=dc; _jc_save_fromDate=2025-05-29; _jc_save_showIns=true; uKey=fc4b8b00f1ee0e2eca378f9c96a989434d1b4b6753644a590838503f7d4d01c9";
  
  if (cookieStr) {
    try {
      USER_COOKIES = parseRawCookies(cookieStr);
      console.log('已加载12306 Cookie');
    } catch (error) {
      console.error('解析Cookie字符串失败:', error);
    }
  }
  
  if (!USER_COOKIES) {
    console.error('未找到有效的12306 Cookie');
    process.exit(1);
  }
}

// 发送请求到12306
async function make12306Request(url, params, headers = {}) {
  const queryString = params ? `?${params.toString()}` : '';
  const fullUrl = `${url}${queryString}`;
  
  console.log(`请求URL: ${fullUrl}`);
  console.log(`请求头: ${JSON.stringify(headers)}`);
  
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.131 Safari/537.36',
        'Accept': '*/*',
        ...headers
      },
    });
    
    console.log(`响应状态: ${response.status}`);
    
    // 尝试解析为JSON
    let responseData;
    const responseText = await response.text();
    
    try {
      responseData = JSON.parse(responseText);
      console.log('成功解析JSON响应');
    } catch (error) {
      console.log('非JSON响应，返回原始文本');
      // 如果响应不是JSON，返回原始文本
      console.log(`响应前200个字符: ${responseText.substring(0, 200)}...`);
      return responseText;
    }
    
    return responseData;
  } catch (error) {
    console.error(`请求失败: ${error.message}`);
    return null;
  }
}

// 测试查询车票
async function testQueryTickets(date, fromStation, toStation) {
  console.log(`测试查询车票: 日期=${date}, 出发站=${fromStation}, 到达站=${toStation}`);
  
  // 构建查询参数
  const queryParams = new URLSearchParams({
    'leftTicketDTO.train_date': date,
    'leftTicketDTO.from_station': fromStation,
    'leftTicketDTO.to_station': toStation,
    purpose_codes: 'ADULT',
  });
  
  // 设置请求URL
  const queryUrl = `${API_BASE}/otn/leftTicket/query`;
  
  // 如果没有cookie，尝试获取
  if (!USER_COOKIES) {
    console.error('未设置12306用户Cookie');
    return;
  }
  
  // 设置请求头
  const headers = { 
    Cookie: formatCookies(USER_COOKIES)
  };
  
  // 发送请求
  try {
    console.log('开始发送请求...');
    const response = await make12306Request(queryUrl, queryParams, headers);
    
    // 打印完整响应
    console.log('完整响应:');
    console.log(typeof response === 'string' ? '响应为HTML或文本' : JSON.stringify(response, null, 2));
    
    return response;
  } catch (error) {
    console.error(`查询车票出错: ${error.message}`);
    if (error.stack) {
      console.error(`错误堆栈: ${error.stack}`);
    }
    return null;
  }
}

// 测试查询车站信息
async function testQueryStationInfo() {
  console.log('测试查询车站信息');
  
  const queryUrl = `${API_BASE}/otn/resources/js/framework/station_name.js`;
  const queryParams = new URLSearchParams({
    station_version: '1.9151'
  });
  
  const headers = { 
    Cookie: formatCookies(USER_COOKIES)
  };
  
  try {
    console.log('开始请求车站信息...');
    const response = await make12306Request(queryUrl, queryParams, headers);
    console.log('车站信息前300个字符:');
    console.log(typeof response === 'string' ? response.substring(0, 300) : JSON.stringify(response).substring(0, 300));
    return response;
  } catch (error) {
    console.error(`查询车站信息出错: ${error.message}`);
    return null;
  }
}

// 测试查询近期可预订日期
async function testQueryRecentDate() {
  console.log('测试查询近期可预订日期');
  
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  const recentDate = formatDate(tomorrow);
  console.log(`尝试查询最近日期: ${recentDate}`);
  
  return await testQueryTickets(recentDate, 'BJP', 'SHH'); // 北京到上海
}

// 主函数
async function main() {
  // 初始化cookie
  initCookies();
  
  // 测试1: 尝试查询2025年的车票（预期失败）
  console.log('\n===== 测试1: 查询2025年车票 =====');
  await testQueryTickets('2025-05-17', 'BJP', 'SHH');
  
  // 测试2: 尝试查询车站信息（基础API测试）
  console.log('\n===== 测试2: 查询车站信息 =====');
  await testQueryStationInfo();
  
  // 测试3: 尝试查询近期可预订日期的车票
  console.log('\n===== 测试3: 查询近期可预订日期车票 =====');
  await testQueryRecentDate();
}

// 执行主函数
main().catch(console.error); 