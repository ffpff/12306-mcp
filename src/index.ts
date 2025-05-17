#!/usr/bin/env node

// Data一般用于表示从服务器上请求到的数据，Info一般表示解析并筛选过的要传输给大模型的数据。变量使用驼峰命名，常量使用全大写下划线命名。
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

// 导入拆分后的模块
import { API_BASE, SEAT_TYPE_CODES } from './constants.js';
import { parseRawCookies, formatCookies, getCookie, make12306Request, make12306PostRequest, logDebug } from './utils.js';
import { getStations, parseStationsData, buildCityStationsMap, buildCityCodesMap, buildNameStationsMap } from './stations.js';
import { 
  parseTicketsData, 
  parseTicketsInfo, 
  formatTicketsInfo, 
  filterTicketsInfo,
  parseRouteStationsData,
  parseRouteStationsInfo
} from './tickets.js';
import { PassengerInfo, getPassengers, formatPassengers, getPassengerByIndex } from './passengers.js';
import { oneClickOrder } from './orders.js';

// 全局配置
let USER_COOKIES: Record<string, string> | null = null;
const STATIONS = await getStations(); //以Code为键
const CITY_STATIONS = buildCityStationsMap(STATIONS); //以城市名名为键，位于该城市的的所有Station列表的记录
const CITY_CODES = buildCityCodesMap(CITY_STATIONS); //以城市名名为键的Station记录
const NAME_STATIONS = buildNameStationsMap(STATIONS); //以车站名为键的Station记录

// 初始化时获取配置
async function init() {
  // 从环境变量获取cookie
  const cookieStr = "JSESSIONID=FAC79C5929F4BB7989FF2A5B22DB381F; tk=U0oUQHe6ZQ-bPUVdiSVRL3HP01z5oRtzVaZ_d_loxFE36c1c0; route=6f50b51faa11b987e576cdb301e545c4; BIGipServerotn=1507393802.64545.0000; BIGipServerpassport=770179338.50215.0000; guidesStatus=off; highContrastMode=defaltMode; cursorStatus=off; _jc_save_fromStation=%u6DF1%u5733%u5317%2CIOQ; _jc_save_toStation=%u5E7F%u5DDE%2CGZQ; _jc_save_toDate=2025-05-16; _jc_save_wfdc_flag=dc; _jc_save_fromDate=2025-05-29; _jc_save_showIns=true";
  console.warn(cookieStr);
  if (cookieStr) {
    try {
      USER_COOKIES = parseRawCookies(cookieStr);
      console.error('已从环境变量加载12306 Cookie');
    } catch (error) {
      console.error('解析Cookie字符串失败:', error);
    }
  }
  
  if (!USER_COOKIES) {
    console.error('未找到有效的12306 Cookie，请设置环境变量COOKIE_12306');
    console.error('设置方法: export COOKIE_12306="你的cookie字符串"');
  }
}

// Create server instance
const server = new McpServer({
  name: '12306-mcp',
  version: '1.0.0',
  capabilities: {
    resources: {},
    tools: {},
  },
  instructions:
    'This server provides information about 12306.You can use this server to query train tickets on 12306.',
});

server.resource('stations', 'data://all-stations', async (uri) => ({
  contents: [{ uri: uri.href, text: JSON.stringify(STATIONS) }],
}));

server.tool(
  'get-stations-code-in-city',
  '通过城市名查询该城市所有车站的station_code，结果为列表。',
  {
    city: z.string().describe('中文城市名称'),
  },
  async ({ city }) => {
    if (!(city in CITY_STATIONS)) {
      return {
        content: [{ type: 'text', text: 'Error: City not found. ' }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(CITY_STATIONS[city]) }],
    };
  }
);

server.tool(
  'get-station-code-of-city',
  '通过城市名查询该城市对应的station_code，结果是唯一的。',
  {
    city: z.string().describe('中文城市名称'),
  },
  async ({ city }) => {
    if (!(city in CITY_CODES)) {
      return {
        content: [{ type: 'text', text: 'Error: City not found. ' }],
      };
    }
    return {
      content: [{ type: 'text', text: JSON.stringify(CITY_CODES[city]) }],
    };
  }
);

server.tool(
  'get-station-code-by-name',
  '通过车站名查询station_code，结果是唯一的。',
  {
    stationName: z.string().describe('中文车站名称'),
  },
  async ({ stationName }) => {
    stationName = stationName.endsWith('站')
      ? stationName.substring(0, -1)
      : stationName;
    if (!(stationName in NAME_STATIONS)) {
      return {
        content: [{ type: 'text', text: 'Error: Station not found. ' }],
      };
    }
    return {
      content: [
        { type: 'text', text: JSON.stringify(NAME_STATIONS[stationName]) },
      ],
    };
  }
);

server.tool(
  'get-station-by-telecode',
  '通过station_telecode查询车站信息，结果是唯一的。',
  {
    stationTelecode: z.string().describe('车站的station_telecode'),
  },
  async ({ stationTelecode }) => {
    if (!STATIONS[stationTelecode]) {
      return {
        content: [{ type: 'text', text: 'Error: Station not found. ' }],
      };
    }
    return {
      content: [
        { type: 'text', text: JSON.stringify(STATIONS[stationTelecode]) },
      ],
    };
  }
);

server.tool(
  'get-tickets',
  '查询12306余票信息。',
  {
    date: z.string().length(10).describe('日期( 格式: yyyy-mm-dd )'),
    fromStation: z.string(),
    toStation: z.string(),
    trainFilterFlags: z.string().regex(/^[GDZTKOFS]*$/).max(8).optional().default('')
  },
  async ({ date, fromStation, toStation, trainFilterFlags }) => {
    logDebug(`查询车票: 日期=${date}, 出发站=${fromStation}, 到达站=${toStation}, 车型=${trainFilterFlags || '全部'}`);
    
    // 检查日期是否早于当前日期
    if (new Date(date).setHours(0, 0, 0, 0) < new Date().setHours(0, 0, 0, 0)) {
      logDebug('日期早于今天，返回错误');
      return {
        content: [{ type: 'text', text: 'Error: The date cannot be earlier than today.' }],
      };
    }
    
    // 检查站点是否有效
    if (!Object.keys(STATIONS).includes(fromStation) || !Object.keys(STATIONS).includes(toStation)) {
      logDebug(`站点代码无效: 出发站=${fromStation}, 到达站=${toStation}`);
      return {
        content: [{ type: 'text', text: `Error: 站点代码无效, 出发站=${fromStation}, 到达站=${toStation}` }],
      };
    }
    
    const queryParams = new URLSearchParams({
      'leftTicketDTO.train_date': date,
      'leftTicketDTO.from_station': fromStation,
      'leftTicketDTO.to_station': toStation,
      purpose_codes: 'ADULT',
    });
    
    const queryUrl = `${API_BASE}/otn/leftTicket/query`;
    logDebug(`完整请求URL: ${queryUrl}?${queryParams.toString()}`);
    
    if (!USER_COOKIES) {
      logDebug('未设置12306用户Cookie');
      return {
        content: [{ type: 'text', text: 'Error: 未设置12306用户Cookie，请配置环境变量COOKIE_12306' }],
      };
    }
    
    const headers = { Cookie: formatCookies(USER_COOKIES) };
    logDebug(`请求头: ${JSON.stringify(headers)}`);
    
    try {
      logDebug('开始发送请求...');
      const queryResponse = await make12306Request<any>(queryUrl, queryParams, headers);
      
      if (queryResponse === null || queryResponse === undefined) {
        logDebug('查询车票失败: 无响应');
        return {
          content: [{ type: 'text', text: 'Error: 查询车票失败，无响应' }],
        };
      }
      
      logDebug(`收到响应: ${JSON.stringify(queryResponse).substring(0, 200)}...`);
      
      if (!queryResponse.data || !queryResponse.data.result) {
        logDebug(`查询车票失败: ${JSON.stringify(queryResponse)}`);
        return {
          content: [{ type: 'text', text: `Error: 查询车票失败, API返回无效数据: ${JSON.stringify(queryResponse)}` }],
        };
      }
      
      logDebug(`解析票据数据: ${queryResponse.data.result.length}条记录`);
      const ticketsData = parseTicketsData(queryResponse.data.result);
      
      let ticketsInfo;
      try {
        ticketsInfo = parseTicketsInfo(ticketsData, STATIONS);
      } catch (error) {
        logDebug(`解析票据信息失败: ${error instanceof Error ? error.message : String(error)}`);
        return {
          content: [{ type: 'text', text: `Error: 解析票据信息失败: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
      
      const filteredTicketsInfo = filterTicketsInfo(ticketsInfo, trainFilterFlags);
      
      if (filteredTicketsInfo.length === 0) {
        logDebug('未找到符合条件的车次');
        return {
          content: [{ type: 'text', text: `未找到符合条件的车次信息: 日期=${date}, 出发站=${fromStation}, 到达站=${toStation}, 车型=${trainFilterFlags || '全部'}` }],
        };
      }
      
      logDebug(`找到${filteredTicketsInfo.length}个符合条件的车次`);
      return {
        content: [{ type: 'text', text: formatTicketsInfo(filteredTicketsInfo) }],
      };
      
    } catch (error) {
      logDebug(`查询车票异常: ${error instanceof Error ? error.message : String(error)}`);
      if (error instanceof Error && error.stack) {
        logDebug(`错误堆栈: ${error.stack}`);
      }
      return {
        content: [{ type: 'text', text: `查询车票失败: ${error instanceof Error ? error.message : String(error)}` }],
      };
    }
  }
);

server.tool(
  'get-train-route-stations',
  '查询列车途径车站信息。',
  {
    trainNo: z.string().describe('实际车次编号train_no，例如240000G10336.'),
    fromStationTelecode: z
      .string()
      .describe('出发车站的station_telecode_code，而非城市的station_code.'),
    toStationTelecode: z
      .string()
      .describe('到达车站的station_telecode_code，而非城市的station_code.'),
    departDate: z
      .string()
      .length(10)
      .describe('列车出发日期( 格式: yyyy-mm-dd )'),
  },
  async ({
    trainNo: trainNo,
    fromStationTelecode,
    toStationTelecode,
    departDate,
  }) => {
    const queryParams = new URLSearchParams({
      train_no: trainNo,
      from_station_telecode: fromStationTelecode,
      to_station_telecode: toStationTelecode,
      depart_date: departDate,
    });
    const queryUrl = `${API_BASE}/otn/czxx/queryByTrainNo`;
    
    if (!USER_COOKIES) {
      return {
        content: [{ type: 'text', text: 'Error: 未设置12306用户Cookie，请配置环境变量COOKIE_12306' }],
      };
    }
    
    const queryResponse = await make12306Request<any>(
      queryUrl,
      queryParams,
      { Cookie: formatCookies(USER_COOKIES) }
    );
    if (queryResponse == null) {
      return {
        content: [
          { type: 'text', text: 'Error: get train route stations failed. ' },
        ],
      };
    }
    const routeStationsData = parseRouteStationsData(queryResponse.data.data);
    const routeStationsInfo = parseRouteStationsInfo(routeStationsData);
    return {
      content: [{ type: 'text', text: JSON.stringify(routeStationsInfo) }],
    };
  }
);

server.tool(
  'get-passengers-info',
  '获取用户账户中的所有乘客信息，用于选择购票乘客',
  {},
  async () => {    
    if (!USER_COOKIES) {
      return {
        content: [{ type: 'text', text: '请先设置环境变量COOKIE_12306，包含有效的12306登录Cookie' }],
      };
    }

    try {
      const passengers = await getPassengers(USER_COOKIES);
      const formattedPassengers = formatPassengers(passengers);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(formattedPassengers, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `获取乘客信息失败: ${(error as Error).message}` }],
      };
    }
  }
);

// 简化版一键下单工具
server.tool(
  'one-click-order',
  '简化版一键下单流程，封装了下单所需的所有步骤',
  {
    secretStr: z.string().describe('车次密钥，从查询车票接口获取'),
    trainDate: z.string().length(10).describe('出发日期( 格式: yyyy-mm-dd )'),
    fromStationName: z.string().describe('出发站中文名称'),
    toStationName: z.string().describe('到达站中文名称'),
    passengerIndex: z.number().default(0).describe('乘客在乘客列表中的索引，默认为0表示第一个乘客'),
    seatType: z.string().describe('座位类型，可选值: 商务座|特等座|一等座|二等座|高级软卧|软卧|硬卧|软座|硬座|无座'),
    purposeCodes: z.string().default('ADULT').describe('车票类型，ADULT表示成人票')
  },
  async ({ secretStr, trainDate, fromStationName, toStationName, passengerIndex, seatType, purposeCodes }) => {
    logDebug('MCP调用: one-click-order');
    logDebug(`参数: trainDate=${trainDate}, fromStationName=${fromStationName}, toStationName=${toStationName}, passengerIndex=${passengerIndex}, seatType=${seatType}`);
    
    // 检查并处理secretStr
    if (!secretStr) {
      process.stderr.write('[ERROR] secretStr参数为空\n');
      return {
        content: [{ type: 'text', text: '下单失败: secretStr参数为空，请先查询车次获取正确的secretStr' }],
      };
    }
    
    // 处理secretStr可能的格式问题
    // secret_Sstr在原始数据中是被URL编码的，这里确保它是解码状态
    try {
      // 尝试进行URL解码，如果已经是解码状态，则不会有变化
      secretStr = decodeURIComponent(secretStr);
      logDebug(`处理后的secretStr(前10个字符): ${secretStr.substring(0, 10)}...`);
    } catch (error) {
      logDebug(`secretStr解码出错(使用原值): ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!USER_COOKIES) {
      process.stderr.write('[ERROR] 未设置12306用户Cookie\n');
      return {
        content: [{ type: 'text', text: '请先设置环境变量COOKIE_12306，包含有效的12306登录Cookie' }],
      };
    }
    
    try {
      // 获取乘客信息
      logDebug(`开始获取乘客信息，索引=${passengerIndex}`);
      const passengers = await getPassengers(USER_COOKIES);
      if (!passengers || passengers.length === 0) {
        process.stderr.write('[ERROR] 未获取到乘客信息\n');
        return {
          content: [{ type: 'text', text: '获取乘客信息失败，请检查Cookie是否有效' }],
        };
      }
      
      logDebug(`已获取${passengers.length}个乘客信息`);
      const passenger = getPassengerByIndex(passengers, passengerIndex);
      if (!passenger) {
        process.stderr.write(`[ERROR] 未找到索引${passengerIndex}对应的乘客\n`);
        return {
          content: [{ type: 'text', text: `指定的乘客索引${passengerIndex}无效，最大索引为${passengers.length - 1}` }],
        };
      }
      
      logDebug(`选择的乘客: ${passenger.passenger_name}`);
      
      // 调用一键下单函数
      logDebug('开始调用oneClickOrder函数');
      const orderResult = await oneClickOrder(USER_COOKIES, secretStr, trainDate, fromStationName, toStationName, seatType, passenger);
      
      logDebug(`oneClickOrder函数返回结果: ${JSON.stringify(orderResult)}`);
      
      return {
        content: [{ type: 'text', text: JSON.stringify(orderResult, null, 2) }],
      };
    } catch (error) {
      process.stderr.write(`[ERROR] 一键下单工具出错: ${(error as Error).message}\n`);
      process.stderr.write(`[ERROR] 错误堆栈: ${(error as Error).stack}\n`);
      return {
        content: [{ type: 'text', text: `下单失败: ${(error as Error).message}` }],
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await init();
  await server.connect(transport);
  process.stderr.write('12306 MCP Server running on stdio @Joooook\n');
}

main().catch((error) => {
  process.stderr.write(`Fatal error in main(): ${error}\n`);
  process.exit(1);
});
