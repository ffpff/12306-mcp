import { API_BASE } from './constants.js';
import { make12306PostRequest } from './utils.js';
import { formatCookies } from './utils.js';
/**
 * 获取用户的乘客列表
 */
export async function getPassengers(userCookies) {
    const queryUrl = `${API_BASE}/otn/passengers/query`;
    if (!userCookies) {
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
    const queryResponse = await make12306PostRequest(queryUrl, requestData, headers);
    if (queryResponse === null || !queryResponse.status || queryResponse.httpstatus !== 200) {
        throw new Error(`获取乘客信息失败: ${queryResponse?.messages || '未知错误'}`);
    }
    const passengers = queryResponse.data.datas;
    if (!passengers || passengers.length === 0) {
        throw new Error('未找到乘客信息，可能是未登录或未添加乘客');
    }
    return passengers;
}
/**
 * 格式化乘客信息，只返回重要字段
 */
export function formatPassengers(passengers) {
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
export function getPassengerByIndex(passengers, index) {
    if (index < 0 || index >= passengers.length) {
        throw new Error(`无效的乘客索引，有效范围是0到${passengers.length - 1}`);
    }
    return passengers[index];
}
/**
 * 生成乘客票据字符串（用于下单）
 */
export function generatePassengerTicketStr(passenger, seatTypeCode) {
    return `${seatTypeCode},0,${passenger.passenger_type},${passenger.passenger_name},${passenger.passenger_id_type_code},${passenger.passenger_id_no},${passenger.mobile_no || ''},N,${passenger.allEncStr}`;
}
/**
 * 生成老乘客字符串（用于下单）
 */
export function generateOldPassengerStr(passenger) {
    return `${passenger.passenger_name},${passenger.passenger_id_type_code},${passenger.passenger_id_no},${passenger.passenger_type}_`;
}
