import axios from 'axios';
// 添加一个专门的日志函数，避免直接使用console.log
export function logDebug(message) {
    // 日志信息写入process.stderr而不是stdout，避免干扰JSON输出
    process.stderr.write(`[DEBUG] ${message}\n`);
}
/**
 * 解析cookie字符串为对象
 */
export function parseCookies(cookies) {
    const cookieRecord = {};
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
export function formatCookies(cookies) {
    return Object.entries(cookies)
        .map(([key, value]) => `${key}=${value}`)
        .join('; ');
}
/**
 * 获取12306网站cookie
 */
export async function getCookie(url) {
    try {
        logDebug(`请求Cookie URL: ${url}`);
        const response = await axios.get(url, {
            maxRedirects: 0, // 不跟随重定向，我们需要获取cookie
            validateStatus: (status) => {
                return status >= 200 && status < 400;
            },
        });
        if (response.headers['set-cookie']) {
            const cookies = parseCookies(response.headers['set-cookie']);
            logDebug(`获取Cookie成功: ${JSON.stringify(cookies)}`);
            return cookies;
        }
        else {
            logDebug('获取Cookie失败: 没有set-cookie头');
            return {};
        }
    }
    catch (error) {
        logDebug(`获取Cookie错误: ${error instanceof Error ? error.message : String(error)}`);
        return {};
    }
}
/**
 * 解析原始cookie字符串为对象
 */
export function parseRawCookies(cookieStr) {
    const cookies = {};
    // 不进行URI解码，直接按分号分割
    cookieStr.split(';').forEach(pair => {
        const [key, ...values] = pair.trim().split('=');
        // 使用...values.join('=')来处理值中可能包含=的情况
        const value = values.join('=');
        if (key && value) {
            cookies[key.trim()] = value.trim();
        }
    });
    logDebug(`Cookie解析结果: ${JSON.stringify(cookies)}`);
    return cookies;
}
/**
 * 发送GET请求到12306 API
 */
export async function make12306Request(url, scheme = new URLSearchParams(), headers = {}) {
    const fullUrl = url + '?' + scheme.toString();
    logDebug(`发送GET请求: ${fullUrl}`);
    logDebug(`请求头: ${JSON.stringify(headers)}`);
    try {
        const response = await axios.get(fullUrl, {
            headers: headers,
        });
        logDebug(`GET响应状态: ${response.status}`);
        // logDebug(`GET响应头: ${JSON.stringify(response.headers)}`);
        const dataPreview = typeof response.data === 'string'
            ? response.data
            : JSON.stringify(response.data);
        logDebug(`GET响应数据预览: ${dataPreview}`);
        return (await response.data);
    }
    catch (error) {
        if (axios.isAxiosError(error)) {
            process.stderr.write(`[ERROR] GET请求失败: ${error.message}\n`);
            process.stderr.write(`[ERROR] 请求URL: ${fullUrl}\n`);
            process.stderr.write(`[ERROR] 响应状态: ${error.response?.status}\n`);
            if (error.response?.data) {
                const errData = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                process.stderr.write(`[ERROR] 响应数据: ${errData.substring(0, 200)}...\n`);
            }
        }
        else {
            process.stderr.write(`[ERROR] 其他GET请求错误: ${error instanceof Error ? error.message : String(error)}\n`);
        }
        return null;
    }
}
/**
 * 发送POST请求到12306 API
 */
export async function make12306PostRequest(url, data = {}, headers = {}) {
    const urlString = url.toString();
    logDebug(`发送POST请求: ${urlString}`);
    // 添加默认的Content-Type和User-Agent
    const mergedHeaders = {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
        ...headers
    };
    // 处理cookie
    if (headers.Cookie || headers.cookie) {
        logDebug('使用提供的Cookie头');
    }
    else if ('cookies' in data && typeof data.cookies === 'object') {
        const cookieStr = formatCookies(data.cookies);
        mergedHeaders['Cookie'] = cookieStr;
        delete data.cookies; // 从请求数据中移除cookies
        logDebug(`添加Cookie头: ${cookieStr.substring(0, 50)}...`);
    }
    // 打印请求数据（但不记录敏感信息）
    logDebug(`POST请求头: ${JSON.stringify(mergedHeaders)}`);
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'cert'];
    let logData;
    if (data instanceof URLSearchParams) {
        logData = {};
        for (const [key, value] of data.entries()) {
            if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
                logData[key] = '******';
            }
            else {
                logData[key] = value;
            }
        }
    }
    else {
        logData = { ...data };
        for (const field of sensitiveFields) {
            for (const key in logData) {
                if (key.toLowerCase().includes(field)) {
                    logData[key] = '******';
                }
            }
        }
    }
    logDebug(`POST请求数据: ${JSON.stringify(logData)}`);
    try {
        const response = await axios.post(urlString, data, {
            headers: mergedHeaders,
        });
        logDebug(`POST响应状态: ${response.status}`);
        // 记录响应头，但排除大型头字段
        const headersLog = { ...response.headers };
        delete headersLog['set-cookie']; // 不记录完整cookie
        logDebug(`POST响应头: ${JSON.stringify(headersLog)}`);
        // 记录响应数据预览
        const dataPreview = typeof response.data === 'string'
            ? response.data.substring(0, 200)
            : JSON.stringify(response.data).substring(0, 200);
        logDebug(`POST响应数据预览: ${dataPreview}...`);
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            process.stderr.write(`[ERROR] POST请求失败: ${error.message}\n`);
            process.stderr.write(`[ERROR] 请求URL: ${urlString}\n`);
            process.stderr.write(`[ERROR] 响应状态: ${error.response.status}\n`);
            if (error.response.data) {
                const errData = typeof error.response.data === 'string'
                    ? error.response.data
                    : JSON.stringify(error.response.data);
                process.stderr.write(`[ERROR] 响应数据: ${errData.substring(0, 200)}...\n`);
            }
            return {
                status: false,
                message: `请求失败: ${error.message}`,
                data: error.response.data
            };
        }
        else {
            process.stderr.write(`[ERROR] 其他POST请求错误: ${error instanceof Error ? error.message : String(error)}\n`);
            return {
                status: false,
                message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }
}
/**
 * 通用的12306 GET请求工具函数
 */
export async function make12306GetRequest(url, cookies = {}) {
    const cookieStr = formatCookies(cookies);
    logDebug(`发送GET请求到: ${url}`);
    try {
        const response = await axios.get(url, {
            headers: {
                'Cookie': cookieStr,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36',
            }
        });
        logDebug(`请求结果状态码: ${response.status}`);
        const dataPreview = typeof response.data === 'string'
            ? response.data.substring(0, 200)
            : JSON.stringify(response.data).substring(0, 200);
        logDebug(`GET响应数据预览: ${dataPreview}...`);
        return response.data;
    }
    catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            process.stderr.write(`[ERROR] GET请求失败: ${error.message}\n`);
            return {
                status: false,
                message: `请求失败: ${error.message}`,
                data: error.response.data
            };
        }
        else {
            process.stderr.write(`[ERROR] 其他GET请求错误: ${error instanceof Error ? error.message : String(error)}\n`);
            return {
                status: false,
                message: `请求错误: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }
}
