import axios from 'axios';
import { API_BASE } from './constants.js';

/**
 * 解析cookie字符串为对象
 */
export function parseCookies(cookies: Array<string>): Record<string, string> {
  const cookieRecord: Record<string, string> = {};
  cookies.forEach((cookie) => {
    // 提取键值对部分（去掉 Path、HttpOnly 等属性）
    const keyValuePart = cookie.split(';')[0];
    // 分割键和值
    const [key, value] = keyValuePart.split('=');
    // 存入对象
    if (key && value) {
      cookieRecord[key.trim()] = value.trim();
    }
  });
  return cookieRecord;
}

/**
 * 将cookie对象格式化为字符串
 */
export function formatCookies(cookies: Record<string, string>): string {
  return Object.entries(cookies)
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

/**
 * 获取12306网站cookie
 */
export async function getCookie(url: string) {
  try {
    const response = await axios.get(url);
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      return parseCookies(setCookieHeader);
    }
    return null;
  } catch (error) {
    console.error('Error making 12306 request:', error);
    return null;
  }
}

/**
 * 解析原始cookie字符串为对象
 */
export function parseRawCookies(cookieStr: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  
  // 不进行URI解码，直接按分号分割
  cookieStr.split(';').forEach(pair => {
    const [key, ...values] = pair.trim().split('=');
    // 使用...values.join('=')来处理值中可能包含=的情况
    const value = values.join('=');
    if (key && value) {
      cookies[key.trim()] = value.trim();
    }
  });
  console.log('Cookie解析结果:', cookies);
  return cookies;
}

/**
 * 发送GET请求到12306 API
 */
export async function make12306Request<T>(
  url: string | URL,
  scheme: URLSearchParams = new URLSearchParams(),
  headers: Record<string, string> = {}
): Promise<T | null> {
  try {
    const response = await axios.get(url + '?' + scheme.toString(), {
      headers: headers,
    });
    return (await response.data) as T;
  } catch (error) {
    console.error('Error making 12306 request:', error);
    return null;
  }
}

/**
 * 发送POST请求到12306 API
 */
export async function make12306PostRequest<T>(
  url: string | URL,
  data: Record<string, any> | URLSearchParams = {},
  headers: Record<string, string> = {}
): Promise<T | null> {
  try {
    const response = await axios.post(url.toString(), data, {
      headers: headers,
    });
    return (await response.data) as T;
  } catch (error) {
    console.error('Error making 12306 POST request:', error);
    return null;
  }
} 