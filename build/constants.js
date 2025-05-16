// 定义常量
export const API_BASE = 'https://kyfw.12306.cn';
export const WEB_URL = 'https://www.12306.cn/index/';
// 座位类型简写映射
export const SEAT_SHORT_TYPES = {
    swz: '商务座',
    tz: '特等座',
    zy: '一等座',
    ze: '二等座',
    gr: '高软卧',
    srrb: '动卧',
    rw: '软卧',
    yw: '硬卧',
    rz: '软座',
    yz: '硬座',
    wz: '无座',
    qt: '其他',
    gg: '',
    yb: '',
};
// 座位类型编码映射
export const SEAT_TYPES = {
    '9': { name: '商务座', short: 'swz' },
    P: { name: '特等座', short: 'tz' },
    M: { name: '一等座', short: 'zy' },
    D: { name: '优选一等座', short: 'zy' },
    O: { name: '二等座', short: 'ze' },
    S: { name: '二等包座', short: 'ze' },
    '6': { name: '高级软卧', short: 'gr' },
    A: { name: '高级动卧', short: 'gr' },
    '4': { name: '软卧', short: 'rw' },
    I: { name: '一等卧', short: 'rw' },
    F: { name: '动卧', short: 'rw' },
    '3': { name: '硬卧', short: 'yw' },
    J: { name: '二等卧', short: 'yw' },
    '2': { name: '软座', short: 'rz' },
    '1': { name: '硬座', short: 'yz' },
    W: { name: '无座', short: 'wz' },
    WZ: { name: '无座', short: 'wz' },
    H: { name: '其他', short: 'qt' },
};
// 列车特征标志
export const DW_FLAGS = [
    '智能动车组',
    '复兴号',
    '静音车厢',
    '温馨动卧',
    '动感号',
    '支持选铺',
    '老年优惠',
];
// 座位类型代码表 (用于订票)
export const SEAT_TYPE_CODES = {
    '商务座': '9',
    '特等座': 'P',
    '一等座': 'M',
    '二等座': 'O',
    '高级软卧': '6',
    '软卧': '4',
    '硬卧': '3',
    '软座': '2',
    '硬座': '1',
    '无座': 'WZ'
};
// 缺失的车站信息
export const MISSING_STATIONS = [
    {
        station_id: '@cdd',
        station_name: '成  都东',
        station_code: 'WEI',
        station_pinyin: 'chengdudong',
        station_short: 'cdd',
        station_index: '',
        code: '1707',
        city: '成都',
        r1: '',
        r2: '',
    },
];
