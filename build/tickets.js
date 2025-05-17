import { SEAT_TYPES, DW_FLAGS } from './constants.js';
import { TicketDataKeys } from './types.js';
/**
 * 解析车票数据
 */
export function parseTicketsData(rawData) {
    const result = [];
    for (const item of rawData) {
        const values = item.split('|');
        const entry = {};
        TicketDataKeys.forEach((key, index) => {
            entry[key] = values[index];
        });
        result.push(entry);
    }
    return result;
}
/**
 * 解析车票信息，转换成可读格式
 */
export function parseTicketsInfo(ticketsData, stations) {
    const result = [];
    for (const ticket of ticketsData) {
        const prices = extractPrices(ticket);
        const dw_flag = extractDWFlags(ticket);
        result.push({
            train_no: ticket.train_no,
            start_train_code: ticket.station_train_code,
            start_time: ticket.start_time,
            arrive_time: ticket.arrive_time,
            lishi: ticket.lishi,
            from_station: stations[ticket.from_station_telecode].station_name,
            to_station: stations[ticket.to_station_telecode].station_name,
            from_station_telecode: ticket.from_station_telecode,
            to_station_telecode: ticket.to_station_telecode,
            prices: prices,
            dw_flag: dw_flag,
            secretStr: ticket.secret_Sstr
        });
    }
    return result;
}
/**
 * 格式化车票信息为易读字符串
 */
export function formatTicketsInfo(ticketsInfo) {
    if (ticketsInfo.length === 0) {
        return '没有查询到相关车次信息';
    }
    let result = '车次 | 出发站 -> 到达站 | 出发时间 -> 到达时间 | 历时 |';
    ticketsInfo.forEach((ticketInfo) => {
        let infoStr = '';
        infoStr += `${ticketInfo.start_train_code}(实际车次train_no: ${ticketInfo.train_no}) ${ticketInfo.from_station}(telecode: ${ticketInfo.from_station_telecode}) -> ${ticketInfo.to_station}(telecode: ${ticketInfo.to_station_telecode}) ${ticketInfo.start_time} -> ${ticketInfo.arrive_time} 历时：${ticketInfo.lishi}`;
        ticketInfo.prices.forEach((price) => {
            infoStr += `\n- ${price.seat_name}: ${price.num.match(/^\d+$/) ? price.num + '张' : price.num}剩余 ${price.price}元`;
        });
        infoStr += `\n- SecretStr: ${ticketInfo.secretStr}`;
        result += `${infoStr}\n`;
    });
    return result;
}
/**
 * 根据车型筛选车票信息
 */
const TRAIN_FILTERS = {
    //G(高铁/城际),D(动车),Z(直达特快),T(特快),K(快速),O(其他),F(复兴号),S(智能动车组)
    G: (ticketInfo) => {
        return ticketInfo.train_no.startsWith('G') ||
            ticketInfo.train_no.startsWith('C')
            ? true
            : false;
    },
    D: (ticketInfo) => {
        return ticketInfo.train_no.startsWith('D') ? true : false;
    },
    Z: (ticketInfo) => {
        return ticketInfo.train_no.startsWith('Z') ? true : false;
    },
    T: (ticketInfo) => {
        return ticketInfo.train_no.startsWith('T') ? true : false;
    },
    K: (ticketInfo) => {
        return ticketInfo.train_no.startsWith('K') ? true : false;
    },
    O: (ticketInfo) => {
        return TRAIN_FILTERS.G(ticketInfo) ||
            TRAIN_FILTERS.D(ticketInfo) ||
            TRAIN_FILTERS.Z(ticketInfo) ||
            TRAIN_FILTERS.T(ticketInfo) ||
            TRAIN_FILTERS.K(ticketInfo)
            ? false
            : true;
    },
    F: (ticketInfo) => {
        return ticketInfo.dw_flag.includes('复兴号') ? true : false;
    },
    S: (ticketInfo) => {
        return ticketInfo.dw_flag.includes('智能动车组') ? true : false;
    },
};
/**
 * 过滤车票信息
 */
export function filterTicketsInfo(ticketsInfo, filters) {
    if (filters.length === 0) {
        return ticketsInfo;
    }
    const result = [];
    for (const ticketInfo of ticketsInfo) {
        for (const filter of filters) {
            if (TRAIN_FILTERS[filter](ticketInfo)) {
                result.push(ticketInfo);
                break;
            }
        }
    }
    return result;
}
/**
 * 提取价格信息
 */
export function extractPrices(ticketData) {
    const PRICE_STR_LENGTH = 10;
    const DISCOUNT_STR_LENGTH = 5;
    const yp_ex = ticketData.yp_ex;
    const yp_info_new = ticketData.yp_info_new;
    const seat_discount_info = ticketData.seat_discount_info;
    const prices = {};
    const discounts = {};
    for (let i = 0; i < seat_discount_info.length / DISCOUNT_STR_LENGTH; i++) {
        const discount_str = seat_discount_info.slice(i * DISCOUNT_STR_LENGTH, (i + 1) * DISCOUNT_STR_LENGTH);
        discounts[discount_str[0]] = parseInt(discount_str.slice(1), 10);
    }
    const exList = yp_ex.split(/[01]/).filter(Boolean); // Remove empty strings
    exList.forEach((ex, index) => {
        const seat_type = SEAT_TYPES[ex];
        const price_str = yp_info_new.slice(index * PRICE_STR_LENGTH, (index + 1) * PRICE_STR_LENGTH);
        const price = parseInt(price_str.slice(1, -5), 10);
        const discount = ex in discounts ? discounts[ex] : null;
        prices[ex] = {
            seat_name: seat_type.name,
            short: seat_type.short,
            seat_type_code: ex,
            num: ticketData[`${seat_type.short}_num`],
            price,
            discount,
        };
    });
    return Object.values(prices);
}
/**
 * 提取车辆标志信息
 */
export function extractDWFlags(ticketData) {
    const dwFlagList = ticketData.dw_flag.split('#');
    let result = [];
    if ('5' == dwFlagList[0]) {
        result.push(DW_FLAGS[0]);
    }
    if (dwFlagList.length > 1 && '1' == dwFlagList[1]) {
        result.push(DW_FLAGS[1]);
    }
    if (dwFlagList.length > 2) {
        if ('Q' == dwFlagList[2].substring(0, 1)) {
            result.push(DW_FLAGS[2]);
        }
        else if ('R' == dwFlagList[2].substring(0, 1)) {
            result.push(DW_FLAGS[3]);
        }
    }
    if (dwFlagList.length > 5 && 'D' == dwFlagList[5]) {
        result.push(DW_FLAGS[4]);
    }
    if (dwFlagList.length > 6 && 'z' != dwFlagList[6]) {
        result.push(DW_FLAGS[5]);
    }
    if (dwFlagList.length > 7 && 'z' != dwFlagList[7]) {
        result.push(DW_FLAGS[6]);
    }
    return result;
}
/**
 * 解析途经站点数据
 */
export function parseRouteStationsData(rawData) {
    const result = [];
    for (const item of rawData) {
        result.push(item);
    }
    return result;
}
/**
 * 解析途经站点信息
 */
export function parseRouteStationsInfo(routeStationsData) {
    const result = [];
    routeStationsData.forEach((routeStationData, index) => {
        if (index == 0) {
            result.push({
                arrive_time: routeStationData.start_time,
                station_name: routeStationData.station_name,
                stopover_time: routeStationData.stopover_time,
                station_no: parseInt(routeStationData.station_no),
            });
        }
        else {
            result.push({
                arrive_time: routeStationData.arrive_time,
                station_name: routeStationData.station_name,
                stopover_time: routeStationData.stopover_time,
                station_no: parseInt(routeStationData.station_no),
            });
        }
    });
    return result;
}
