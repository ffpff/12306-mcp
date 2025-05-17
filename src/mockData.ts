/**
 * 模拟车票数据，用于测试
 */

import { TicketData } from './types.js';

/**
 * 模拟列车数据
 */
export const mockTicketData: TicketData[] = [
  {
    secret_Sstr: 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHI', // 模拟的secretStr参数
    button_text_info: '预订',
    train_no: '24000G834400',
    station_train_code: 'G834',
    start_station_telecode: 'IOQ',
    end_station_telecode: 'IZQ',
    from_station_telecode: 'IOQ',
    to_station_telecode: 'IZQ',
    start_time: '06:08',
    arrive_time: '06:44',
    lishi: '00:36',
    canWebBuy: 'Y',
    yp_info: '1413283410300931333121211131211',
    start_train_date: '20250517',
    train_seat_feature: '3',
    location_code: 'P4',
    from_station_no: '01',
    to_station_no: '04',
    is_support_card: '0',
    controlled_train_flag: '0',
    gg_num: '--',
    gr_num: '--',
    qt_num: '--',
    rw_num: '--',
    rz_num: '--',
    tz_num: '--',
    wz_num: '--',
    yb_num: '--',
    yw_num: '--',
    yz_num: '--',
    ze_num: '有',
    zy_num: '有',
    swz_num: '13',
    srrb_num: '--',
    yp_ex: 'O090M0O0',
    seat_types: 'OM9',
    exchange_train_flag: '0',
    houbu_train_flag: '0',
    houbu_seat_limit: '',
    yp_info_new: 'O090400001M0300000O0400000',
    '40': '',
    '41': '',
    '42': '',
    '43': '',
    '44': '',
    '45': '',
    dw_flag: '0#0#0',
    '47': '',
    stopcheckTime: '',
    country_flag: '1',
    local_arrive_time: '06:44',
    local_start_time: '06:08',
    '52': '',
    bed_level_info: '',
    seat_discount_info: 'M1833O1833',
    sale_time: '',
    '56': ''
  }
];

/**
 * 获取模拟车票数据
 */
export function getMockTickets(fromStation: string, toStation: string, trainDate: string): string {
  const ticket = { ...mockTicketData[0] };
  ticket.from_station_telecode = fromStation;
  ticket.to_station_telecode = toStation;
  ticket.start_train_date = trainDate.replace(/-/g, '');
  
  // 返回模拟的车票查询响应
  return JSON.stringify({
    status: true,
    httpstatus: 200,
    data: {
      result: [
        Object.values(ticket).join('|')
      ]
    }
  });
}

/**
 * 模拟一个购票secretStr
 */
export function getMockSecretStr(): string {
  return 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHI';
} 