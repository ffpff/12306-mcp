import { API_BASE, SEAT_TYPE_CODES } from './constants.js';
import { make12306PostRequest, logDebug } from './utils.js';
import { formatCookies } from './utils.js';
import { PassengerInfo, generatePassengerTicketStr, generateOldPassengerStr } from './passengers.js';

/**
 * 订单提交上下文接口
 */
export interface OrderContext {
  repeatSubmitToken: string;
  ticketInfoForPassengerForm: {
    leftTicketStr: string;
    purpose_codes: string;
    train_location: string;
    queryLeftTicketRequestDTO: {
      train_no: string;
      station_train_code: string;
      from_station: string;
      to_station: string;
      train_date: string;
    };
    key_check_isChange: string;
  };
}

/**
 * 订单结果接口
 */
export interface OrderResult {
  status: boolean;
  message: string;
  orderId?: string;
  passenger?: {
    name: string;
    type: string;
    idType: string;
  };
  trainInfo?: {
    trainNo: string;
    trainCode: string;
    fromStation: string;
    toStation: string;
    trainDate: string;
    seatType: string;
  };
}

/**
 * 提交订单请求
 */
export async function submitOrderRequest(
  userCookies: Record<string, string>,
  secretStr: string,
  trainDate: string,
  fromStationName: string,
  toStationName: string,
  purposeCodes: string = 'ADULT'
): Promise<boolean> {
  const submitUrl = `${API_BASE}/otn/leftTicket/submitOrderRequest`;
  
  // 添加更详细的secretStr处理日志
  logDebug(`原始secretStr: ${secretStr}`);
  let decodedSecretStr;
  try {
    decodedSecretStr = decodeURIComponent(secretStr);
    logDebug(`解码后secretStr: ${decodedSecretStr.substring(0, 20)}...`);
  } catch (error) {
    logDebug(`解码secretStr出错: ${error instanceof Error ? error.message : String(error)}`);
    decodedSecretStr = secretStr; // 如果解码失败，使用原始值
  }
  
  const submitData = new URLSearchParams({
    secretStr: decodedSecretStr,
    train_date: trainDate,
    back_train_date: trainDate,
    tour_flag: 'dc',
    purpose_codes: purposeCodes,
    query_from_station_name: fromStationName,
    query_to_station_name: toStationName,
    undefined: ''
  });

  logDebug(`提交订单请求参数: trainDate=${trainDate}, fromStation=${fromStationName}, toStation=${toStationName}`);
  
  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  logDebug(`发送提交订单请求: ${submitUrl}`);
  const submitResponse = await make12306PostRequest<any>(
    submitUrl,
    submitData,
    headers
  );

  if (!submitResponse) {
    logDebug('提交订单请求失败: 无响应');
    throw new Error('提交订单请求失败: 无响应');
  }
  
  logDebug(`提交订单请求响应: status=${submitResponse.status}, httpstatus=${submitResponse.httpstatus}`);
  logDebug(`提交订单请求响应数据: ${JSON.stringify(submitResponse).substring(0, 300)}...`);
  
  if (!submitResponse.status || submitResponse.httpstatus !== 200) {
    logDebug(`提交订单请求失败: ${submitResponse.messages || '未知错误'}`);
    throw new Error(`提交订单请求失败: ${submitResponse.messages || '未知错误'}`);
  }

  return true;
}

/**
 * 初始化订单上下文
 */
export async function initOrderContext(userCookies: Record<string, string>): Promise<OrderContext> {
  const initUrl = `${API_BASE}/otn/confirmPassenger/initDc`;
  const initData = new URLSearchParams({
    _json_att: ''
  });

  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const initResponse = await make12306PostRequest<string>(
    initUrl,
    initData,
    headers
  );

  if (!initResponse) {
    throw new Error('初始化DC失败: 无法获取返回数据');
  }

  // 从HTML响应中提取token
  const tokenMatch = initResponse.match(/var globalRepeatSubmitToken = '(.+?)';/);
  if (!tokenMatch || tokenMatch.length < 2) {
    throw new Error('初始化DC失败: 无法提取REPEAT_SUBMIT_TOKEN');
  }
  
  const repeatSubmitToken = tokenMatch[1];
  
  // 提取ticketInfoForPassengerForm
  const ticketInfoMatch = initResponse.match(/var ticketInfoForPassengerForm=(.+?);/);
  if (!ticketInfoMatch || ticketInfoMatch.length < 2) {
    throw new Error('初始化DC失败: 无法提取ticketInfoForPassengerForm');
  }
  
  let ticketInfo;
  try {
    // 解析JSON数据
    ticketInfo = JSON.parse(ticketInfoMatch[1]);
  } catch (error) {
    throw new Error(`初始化DC失败: 解析ticketInfoForPassengerForm出错 - ${error}`);
  }
  
  return {
    repeatSubmitToken,
    ticketInfoForPassengerForm: ticketInfo
  };
}

/**
 * 检查订单信息
 */
export async function checkOrderInfo(
  userCookies: Record<string, string>,
  passengerTicketStr: string,
  oldPassengerStr: string,
  repeatSubmitToken: string
): Promise<boolean> {
  const checkUrl = `${API_BASE}/otn/confirmPassenger/checkOrderInfo`;
  const checkData = new URLSearchParams({
    cancel_flag: '2',
    bed_level_order_num: '000000000000000000000000000000',
    passengerTicketStr: passengerTicketStr,
    oldPassengerStr: oldPassengerStr,
    tour_flag: 'dc',
    randCode: '',
    whatsSelect: '1',
    sessionId: '',
    sig: '',
    scene: 'nc_login',
    _json_att: '',
    REPEAT_SUBMIT_TOKEN: repeatSubmitToken
  });

  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const checkResponse = await make12306PostRequest<any>(
    checkUrl,
    checkData,
    headers
  );

  if (!checkResponse || !checkResponse.status || checkResponse.httpstatus !== 200) {
    throw new Error(`核对订单信息失败: ${checkResponse?.messages || '未知错误'}`);
  }

  // 检查核对状态
  const checkStatus = checkResponse.data?.submitStatus === true;
  if (!checkStatus) {
    throw new Error(`订单信息核对失败: ${JSON.stringify(checkResponse.data)}`);
  }

  return true;
}

/**
 * 检查队列余票状态
 */
export async function getQueueCount(
  userCookies: Record<string, string>,
  orderContext: OrderContext,
  seatTypeCode: string
): Promise<boolean> {
  const trainDateObj = new Date(orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.train_date);
  const trainDateStr = trainDateObj.toString();
  
  const queueUrl = `${API_BASE}/otn/confirmPassenger/getQueueCount`;
  const queueData = new URLSearchParams({
    train_date: trainDateStr,
    train_no: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.train_no,
    stationTrainCode: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.station_train_code,
    seatType: seatTypeCode,
    fromStationTelecode: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.from_station,
    toStationTelecode: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.to_station,
    leftTicket: orderContext.ticketInfoForPassengerForm.leftTicketStr,
    purpose_codes: orderContext.ticketInfoForPassengerForm.purpose_codes,
    train_location: orderContext.ticketInfoForPassengerForm.train_location,
    _json_att: '',
    REPEAT_SUBMIT_TOKEN: orderContext.repeatSubmitToken
  });

  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const queueResponse = await make12306PostRequest<any>(
    queueUrl,
    queueData,
    headers
  );

  if (!queueResponse || !queueResponse.status || queueResponse.httpstatus !== 200) {
    throw new Error(`检查队列人数失败: ${queueResponse?.messages || '未知错误'}`);
  }

  // 判断是否可以下单
  const op_1 = queueResponse.data?.op_1;
  const op_2 = queueResponse.data?.op_2;
  const canOrder = op_1 === 'true' || op_2 === 'true';
  
  if (!canOrder) {
    throw new Error(`当前不能下单，余票不足或排队人数过多: ${JSON.stringify(queueResponse.data)}`);
  }
  
  return true;
}

/**
 * 确认提交订单
 */
export async function confirmSingleForQueue(
  userCookies: Record<string, string>,
  orderContext: OrderContext,
  passengerTicketStr: string,
  oldPassengerStr: string
): Promise<boolean> {
  const confirmUrl = `${API_BASE}/otn/confirmPassenger/confirmSingleForQueue`;
  const confirmData = new URLSearchParams({
    passengerTicketStr: passengerTicketStr,
    oldPassengerStr: oldPassengerStr,
    randCode: '',
    purpose_codes: orderContext.ticketInfoForPassengerForm.purpose_codes,
    key_check_isChange: orderContext.ticketInfoForPassengerForm.key_check_isChange,
    leftTicketStr: orderContext.ticketInfoForPassengerForm.leftTicketStr,
    train_location: orderContext.ticketInfoForPassengerForm.train_location,
    choose_seats: '',
    seatDetailType: '000',
    whatsSelect: '1',
    dwAll: 'N',
    roomType: '00',
    _json_att: '',
    REPEAT_SUBMIT_TOKEN: orderContext.repeatSubmitToken
  });

  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const confirmResponse = await make12306PostRequest<any>(
    confirmUrl,
    confirmData,
    headers
  );

  if (!confirmResponse || !confirmResponse.status || confirmResponse.httpstatus !== 200) {
    throw new Error(`确认提交订单失败: ${confirmResponse?.messages || '未知错误'}`);
  }

  // 检查提交状态
  const submitStatus = confirmResponse.data?.submitStatus === true;
  if (!submitStatus) {
    throw new Error(`订单提交到队列失败: ${JSON.stringify(confirmResponse.data)}`);
  }
  
  return true;
}

/**
 * 查询订单等待状态，直到完成或超时
 */
export async function queryOrderStatus(
  userCookies: Record<string, string>,
  repeatSubmitToken: string,
  maxRetry: number = 5,
  interval: number = 3000
): Promise<string | null> {
  let orderId = null;
  
  for (let i = 0; i < maxRetry; i++) {
    const queryUrl = `${API_BASE}/otn/confirmPassenger/resultOrderForDcQueue`;
    const queryData = new URLSearchParams({
      random: Date.now().toString(),
      tourFlag: 'dc',
      _json_att: '',
      REPEAT_SUBMIT_TOKEN: repeatSubmitToken
    });

    const headers = {
      Cookie: formatCookies(userCookies),
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    const queryResponse = await make12306PostRequest<any>(
      queryUrl,
      queryData,
      headers
    );

    if (!queryResponse || !queryResponse.status || queryResponse.httpstatus !== 200) {
      throw new Error(`查询订单状态失败: ${queryResponse?.messages || '未知错误'}`);
    }

    orderId = queryResponse.data?.orderId;
    if (orderId) {
      break;
    }
    
    // 如果waitTime为-1，表示已经完成
    const waitTime = queryResponse.data?.waitTime;
    if (waitTime === -1) {
      break;
    }
    
    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return orderId;
}

/**
 * 验证订单是否成功
 */
export async function validateOrder(
  userCookies: Record<string, string>,
  orderId: string,
  repeatSubmitToken: string
): Promise<boolean> {
  const validateUrl = `${API_BASE}/otn/confirmPassenger/resultOrderForD`;
  const validateData = new URLSearchParams({
    orderSequence_no: orderId,
    _json_att: '',
    REPEAT_SUBMIT_TOKEN: repeatSubmitToken
  });

  const headers = {
    Cookie: formatCookies(userCookies),
    'Content-Type': 'application/x-www-form-urlencoded'
  };

  const validateResponse = await make12306PostRequest<any>(
    validateUrl,
    validateData,
    headers
  );

  if (!validateResponse || !validateResponse.status || validateResponse.httpstatus !== 200) {
    throw new Error(`验证订单失败: ${validateResponse?.messages || '未知错误'}`);
  }

  // 检查订单最终状态
  return validateResponse.data?.submitStatus === true;
}

/**
 * 一键下单流程
 */
export async function oneClickOrder(
  userCookies: Record<string, string>,
  secretStr: string,
  trainDate: string,
  fromStationName: string,
  toStationName: string,
  seatType: string,
  passenger: PassengerInfo,
  purposeCodes: string = 'ADULT'
): Promise<OrderResult> {
  logDebug('开始一键下单流程');
  logDebug(`下单参数: 车次密钥=${secretStr.substring(0, 10)}..., 日期=${trainDate}, 出发站=${fromStationName}, 到达站=${toStationName}, 座位类型=${seatType}`);
  logDebug(`乘客信息: 姓名=${passenger.passenger_name}, 类型=${passenger.passenger_type_name}, 证件类型=${passenger.passenger_id_type_name}`);
  
  try {
    // 将中文座位类型转换为编码
    let seatTypeCode = seatType;
    if (seatType in SEAT_TYPE_CODES) {
      seatTypeCode = SEAT_TYPE_CODES[seatType];
      logDebug(`座位类型转换: ${seatType} -> ${seatTypeCode}`);
    } else {
      process.stderr.write(`[WARN] 未找到座位类型编码，使用原始值: ${seatType}\n`);
    }
    
    // 1. 提交订单请求
    logDebug('步骤1: 开始提交订单请求');
    await submitOrderRequest(
      userCookies,
      secretStr,
      trainDate,
      fromStationName,
      toStationName,
      purposeCodes
    );
    logDebug('步骤1: 提交订单请求成功');
    
    // 2. 初始化订单上下文
    logDebug('步骤2: 开始初始化订单上下文');
    const orderContext = await initOrderContext(userCookies);
    logDebug(`步骤2: 初始化订单上下文成功，repeatSubmitToken=${orderContext.repeatSubmitToken.substring(0, 10)}...`);
    logDebug(`订单上下文信息: ${JSON.stringify({
      leftTicketStr: orderContext.ticketInfoForPassengerForm.leftTicketStr.substring(0, 10) + '...',
      purpose_codes: orderContext.ticketInfoForPassengerForm.purpose_codes,
      train_location: orderContext.ticketInfoForPassengerForm.train_location,
      train_no: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.train_no,
      station_train_code: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.station_train_code,
      key_check_isChange: orderContext.ticketInfoForPassengerForm.key_check_isChange
    }, null, 2)}`);
    
    // 3. 生成乘客票据字符串
    logDebug('步骤3: 生成乘客票据字符串');
    const passengerTicketStr = generatePassengerTicketStr(passenger, seatTypeCode);
    const oldPassengerStr = generateOldPassengerStr(passenger);
    logDebug(`生成的乘客票据: passengerTicketStr=${passengerTicketStr}, oldPassengerStr=${oldPassengerStr}`);
    
    // 4. 核对订单信息
    logDebug('步骤4: 开始核对订单信息');
    await checkOrderInfo(
      userCookies,
      passengerTicketStr,
      oldPassengerStr,
      orderContext.repeatSubmitToken
    );
    logDebug('步骤4: 核对订单信息成功');
    
    // 5. 检查队列人数和余票数
    logDebug('步骤5: 开始检查队列人数和余票数');
    await getQueueCount(
      userCookies,
      orderContext,
      seatTypeCode
    );
    logDebug('步骤5: 检查队列人数和余票数成功');
    
    // 6. 确认提交订单
    logDebug('步骤6: 开始确认提交订单');
    await confirmSingleForQueue(
      userCookies,
      orderContext,
      passengerTicketStr,
      oldPassengerStr
    );
    logDebug('步骤6: 确认提交订单成功');
    
    // 7. 查询订单等待状态并获取订单号
    logDebug('步骤7: 开始查询订单等待状态');
    const orderId = await queryOrderStatus(userCookies, orderContext.repeatSubmitToken);
    if (!orderId) {
      process.stderr.write('[WARN] 步骤7: 未能获取到订单号\n');
      return {
        status: false,
        message: '未能获取到订单号，请到12306官网的"未完成订单"中查看'
      };
    }
    logDebug(`步骤7: 获取到订单号: ${orderId}`);
    
    // 8. 验证订单是否成功
    logDebug('步骤8: 开始验证订单是否成功');
    const finalStatus = await validateOrder(
      userCookies, 
      orderId, 
      orderContext.repeatSubmitToken
    );
    logDebug(`步骤8: 验证订单完成，状态: ${finalStatus ? '成功' : '失败'}`);
    
    const result = {
      status: finalStatus,
      message: finalStatus ? 
        `订单提交成功! 订单号: ${orderId}，请前往12306官网支付` : 
        `订单提交可能失败，请查看12306官网的"未完成订单"。订单号: ${orderId}`,
      orderId: orderId,
      passenger: {
        name: passenger.passenger_name,
        type: passenger.passenger_type_name,
        idType: passenger.passenger_id_type_name
      },
      trainInfo: {
        trainNo: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.train_no,
        trainCode: orderContext.ticketInfoForPassengerForm.queryLeftTicketRequestDTO.station_train_code,
        fromStation: fromStationName,
        toStation: toStationName,
        trainDate: trainDate,
        seatType: seatType
      }
    };
    
    logDebug(`一键下单完成: ${JSON.stringify(result, null, 2)}`);
    return result;
  } catch (error) {
    process.stderr.write(`[ERROR] 一键下单流程出错: ${(error as Error).message}\n`);
    process.stderr.write(`[ERROR] 错误堆栈: ${(error as Error).stack}\n`);
    return {
      status: false,
      message: `订单提交失败: ${(error as Error).message}`
    };
  }
} 