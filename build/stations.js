import { make12306Request } from './utils.js';
import { WEB_URL, MISSING_STATIONS } from './constants.js';
import { StationDataKeys } from './types.js';
/**
 * 从12306获取所有车站信息
 */
export async function getStations() {
    const html = await make12306Request(WEB_URL);
    if (html == null) {
        throw new Error('Error: get 12306 web page failed.');
    }
    const match = html.match('.(/script/core/common/station_name.+?.js)');
    if (match == null) {
        throw new Error('Error: get station name js file failed.');
    }
    const stationNameJSFilePath = match[0];
    const stationNameJS = await make12306Request(new URL(stationNameJSFilePath, WEB_URL));
    if (stationNameJS == null) {
        throw new Error('Error: get station name js file failed.');
    }
    const rawData = eval(stationNameJS.replace('var station_names =', ''));
    const stationsData = parseStationsData(rawData);
    // 加上缺失的车站信息
    for (const station of MISSING_STATIONS) {
        if (!stationsData[station.station_code]) {
            stationsData[station.station_code] = station;
        }
    }
    return stationsData;
}
/**
 * 解析车站数据
 */
export function parseStationsData(rawData) {
    const result = {};
    const dataArray = rawData.split('|');
    const dataList = [];
    for (let i = 0; i < Math.floor(dataArray.length / 10); i++) {
        dataList.push(dataArray.slice(i * 10, i * 10 + 10));
    }
    for (const group of dataList) {
        let station = {};
        StationDataKeys.forEach((key, index) => {
            station[key] = group[index];
        });
        if (!station.station_code) {
            continue;
        }
        result[station.station_code] = station;
    }
    return result;
}
// 构建城市对应车站的映射
export function buildCityStationsMap(stations) {
    const result = {};
    for (const station of Object.values(stations)) {
        const city = station.city;
        if (!result[city]) {
            result[city] = [];
        }
        result[city].push({
            station_code: station.station_code,
            station_name: station.station_name,
        });
    }
    return result;
}
// 构建城市代码映射
export function buildCityCodesMap(cityStations) {
    const result = {};
    for (const [city, stations] of Object.entries(cityStations)) {
        for (const station of stations) {
            if (station.station_name == city) {
                result[city] = station;
                break;
            }
        }
    }
    return result;
}
// 构建车站名称映射
export function buildNameStationsMap(stations) {
    const result = {};
    for (const station of Object.values(stations)) {
        const station_name = station.station_name;
        result[station_name] = {
            station_code: station.station_code,
            station_name: station.station_name,
        };
    }
    return result;
}
