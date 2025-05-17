import { API_BASE } from './constants.js';
import { make12306PostRequest, logDebug } from './utils.js';
import { formatCookies } from './utils.js';

/**
 * 乘客信息接口
 */
export interface PassengerInfo {
  passenger_name: string;          // 乘客姓名
  sex_code: string;                // 性别代码
  sex_name: string;                // 性别名称
  born_date: string;               // 出生日期
  passenger_id_type_code: string;  // 证件类型代码
  passenger_id_type_name: string;  // 证件类型名称
  passenger_id_no: string;         // 证件号码
  passenger_type: string;          // 乘客类型代码
  passenger_type_name: string;     // 乘客类型名称
  mobile_no: string;               // 手机号码
  allEncStr: string;               // 乘客信息加密字符串
  isAdult: string;                 // 是否成人
  [key: string]: any;              // 其他字段
}

/**
 * 获取用户的乘客列表
 */
export async function getPassengers(userCookies: Record<string, string>) {
  logDebug('开始获取乘客列表');
  const queryUrl = `${API_BASE}/otn/passengers/query`;
  
  if (!userCookies) {
    process.stderr.write('[ERROR] 获取乘客列表: 用户未登录，没有有效Cookie\n');
    throw new Error('用户未登录，没有有效Cookie');
  }

  const requestData = new URLSearchParams({
    pageIndex: '1',
    pageSize: '100'
  });

  const headers = { 
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  logDebug(`获取乘客列表: 发送请求到 ${queryUrl}`);
  const queryResponse = await make12306PostRequest<any>(
    queryUrl,
    requestData,
    headers
  );

  if (queryResponse === null || !queryResponse.status || queryResponse.httpstatus !== 200) {
    process.stderr.write(`[ERROR] 获取乘客列表: 请求失败, 状态=${queryResponse?.httpstatus}, 消息=${queryResponse?.messages}\n`);
    throw new Error(`获取乘客信息失败: ${queryResponse?.messages || '未知错误'}`);
  }

  const passengers = queryResponse.data.datas as PassengerInfo[];
  if (!passengers || passengers.length === 0) {
    process.stderr.write('[ERROR] 获取乘客列表: 未找到乘客信息\n');
    throw new Error('未找到乘客信息，可能是未登录或未添加乘客');
  }

  logDebug(`获取乘客列表: 成功获取到${passengers.length}个乘客`);
  for (let i = 0; i < passengers.length; i++) {
    logDebug(`乘客[${i}]: 姓名=${passengers[i].passenger_name}, 类型=${passengers[i].passenger_type_name}, 证件=${passengers[i].passenger_id_type_name}`);
  }

  return passengers;
}

/**
 * 格式化乘客信息，只返回重要字段
 */
export function formatPassengers(passengers: PassengerInfo[]) {
  logDebug(`格式化${passengers.length}个乘客信息`);
  return passengers.map(passenger => ({
    passenger_name: passenger.passenger_name,
    sex_name: passenger.sex_name,
    born_date: passenger.born_date.split(' ')[0],
    passenger_id_type_name: passenger.passenger_id_type_name,
    passenger_id_no: passenger.passenger_id_no,
    passenger_type_name: passenger.passenger_type_name,
    mobile_no: passenger.mobile_no,
    is_adult: passenger.isAdult === 'Y' ? '是' : '否',
    all_enc_str: passenger.allEncStr // 保留这个字段用于后续可能的下单操作
  }));
}

/**
 * 根据索引获取乘客信息
 */
export function getPassengerByIndex(passengers: PassengerInfo[], index: number): PassengerInfo {
  logDebug(`根据索引获取乘客: index=${index}, 总乘客数=${passengers.length}`);
  if (index < 0 || index >= passengers.length) {
    process.stderr.write(`[ERROR] 获取乘客: 无效的索引 ${index}, 有效范围是0到${passengers.length - 1}\n`);
    throw new Error(`无效的乘客索引，有效范围是0到${passengers.length - 1}`);
  }
  
  const passenger = passengers[index];
  logDebug(`获取到乘客: 姓名=${passenger.passenger_name}, 类型=${passenger.passenger_type_name}`);
  return passenger;
}

/**
 * 生成乘客票据字符串（用于下单）
 */
export function generatePassengerTicketStr(passenger: PassengerInfo, seatTypeCode: string): string {
  logDebug(`生成乘客票据字符串: 乘客=${passenger.passenger_name}, 座位类型=${seatTypeCode}, 乘客类型=${passenger.passenger_type}`);
  
  const ticketStr = `${seatTypeCode},0,${passenger.passenger_type},${passenger.passenger_name},${passenger.passenger_id_type_code},${passenger.passenger_id_no},${passenger.mobile_no || ''},N,${passenger.allEncStr}`;
  logDebug(`生成的票据字符串: ${ticketStr.substring(0, 50)}...`);
  
  return ticketStr;
}

/**
 * 生成老乘客字符串（用于下单）
 */
export function generateOldPassengerStr(passenger: PassengerInfo): string {
  logDebug(`生成老乘客字符串: 乘客=${passenger.passenger_name}`);
  
  const oldPassengerStr = `${passenger.passenger_name},${passenger.passenger_id_type_code},${passenger.passenger_id_no},${passenger.passenger_type}_`;
  logDebug(`生成的老乘客字符串: ${oldPassengerStr}`);
  
  return oldPassengerStr;
} 