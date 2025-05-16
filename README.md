# <div align="center">12306-mcp</div>

<div align="center">

[![](https://img.shields.io/badge/Joooook-blue.svg?logo=github&lable=python&labelColor=497568&color=497568&style=flat-square)](https://github.com/Joooook)
[![](https://img.shields.io/badge/Joooook-blue.svg?logo=bilibili&logoColor=white&lable=python&labelColor=af7a82&color=af7a82&style=flat-square)](https://space.bilibili.com/3546386788255839)
![](https://img.shields.io/badge/typescript-blue.svg?logo=typescript&lable=typescript&logoColor=white&labelColor=192c3b&color=192c3b&style=flat-square)
![](https://img.shields.io/github/stars/Joooook/12306-mcp?logo=reverbnation&lable=python&logoColor=white&labelColor=ffc773&color=ffc773&style=flat-square)
![](https://img.shields.io/github/last-commit/Joooook/12306-mcp.svg?style=flat-square)
![](https://img.shields.io/github/license/Joooook/12306-mcp.svg?style=flat-square&color=000000)
</div>

A 12306 ticket search server based on the Model Context Protocol (MCP). The server provides a simple API interface that allows users to search for 12306 tickets.

基于 Model Context Protocol (MCP) 的12306购票搜索服务器。提供了简单的API接口，允许大模型利用接口搜索12306购票信息。

## <div align="center">🚩Features</div>
<div align="center"> 

| 功能描述                         | 状态     |
|------------------------------|--------|
| 查询12306购票信息              | ✅ 已完成  |
| 过滤列车信息                   | ✅ 已完成  |
| 过站查询                      | ✅ 已完成 |
| 中转查询                      | 🚧 计划内 |
| 其余接口，欢迎提feature         | 🚧 计划内 |

</div>
<div align="center"> 
  <img src="https://s2.loli.net/2025/04/15/UjbrG5esaSEmJxN.jpg" width=800px/>
</div>
<div align="center"> 
  <img src="https://s2.loli.net/2025/04/15/rm1j8zX7sqiyafP.jpg" width=800px/>
</div>

## <div align="center">⚙️Installation</div>

~~~bash
git clone https://github.com/Joooook/12306-mcp.git
npm i
~~~


## <div align="center">▶️Quick Start</div>

### CLI
~~~bash
npm run build
node ./build/index.js
~~~

### MCP sever configuration

~~~json
{
    "mcpServers": {
        "12306-mcp": {
            "command": "npx",
            "args": [
                "-y",
                "12306-mcp"
            ]
        }
    }
}
~~~




## <div align="center">👉️Reference</div>
- [modelcontextprotocol/modelcontextprotocol](https://github.com/modelcontextprotocol/modelcontextprotocol)
- [modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)

## <div align="center">💭Murmurs</div>
本项目仅用于学习，欢迎催更。

## <div align="center">🎫Badges</div>
<div align="center"> 
<a href="https://glama.ai/mcp/servers/@Joooook/12306-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@Joooook/12306-mcp/badge" alt="12306-mcp MCP server" />
</a>

[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/joooook-12306-mcp-badge.png)](https://mseep.ai/app/joooook-12306-mcp)

</div>

## <div align="center">☕️Donate</div>
请我喝杯奶茶吧。
<div align="center"> 
<a href="https://afdian.com/item/2a0e0cdcadf911ef9f725254001e7c00">
  <img src="https://s2.loli.net/2024/11/29/1JBxzphs7V6WcK9.jpg" width="500px">
</a>
</div>

# 12306-mcp 订票助手

这个项目提供了与12306网站交互的多种工具，帮助用户查询车票、提交订单并完成订单确认的全流程。

## 特点

- 🔍 车票查询：查询任意出发地和目的地之间的车票信息
- 👨‍👩‍👧‍👦 乘客管理：获取和查询账户中的乘客信息
- 🎫 订票流程：提供从查询到确认提交订单的完整流程
- 🔄 一键下单：简化版下单流程，一次性完成全部订票步骤

## 使用前准备

1. 设置12306账号的Cookie环境变量
2. 确保账号中已添加常用乘客

## 主要功能

### 1. 查询车票信息

```javascript
mcp_12306-mcp_get-tickets({
  date: "2024-06-22",
  fromStation: "GZQ", // 广州
  toStation: "SZQ",   // 深圳
  trainFilterFlags: "G" // 只看高铁
})
```

### 2. 获取乘客信息

```javascript
mcp_12306-mcp_get-passengers-info({
  random_string: "dummy"
})
```

### 3. 提交订单

订票流程可以通过两种方式完成：分步操作或一键下单。

#### 3.1 分步操作方式

1. **提交订单请求**
```javascript
mcp_12306-mcp_submit-order({
  secretStr: "车次密钥",
  trainDate: "2024-06-22",
  backTrainDate: "2024-06-22",
  fromStationName: "广州",
  toStationName: "深圳", 
  purposeCodes: "ADULT"
})
```

2. **初始化DC**
```javascript
mcp_12306-mcp_init-dc({
  clearContext: false
})
```

3. **生成乘客信息字符串**
```javascript
mcp_12306-mcp_generate-ticket-strings-from-passenger({
  seatType: "O", // 二等座
  passengerIndex: 0 // 第一位乘客
})
```

4. **核对订单信息**
```javascript
mcp_12306-mcp_check-order-info({
  passengerTicketStr: "上一步生成的passengerTicketStr",
  oldPassengerStr: "上一步生成的oldPassengerStr"
})
```

5. **检查队列人数和余票**
```javascript
mcp_12306-mcp_get-queue-count({
  trainDate: "Wed Jun 22 2024 00:00:00 GMT+0800 (中国标准时间)",
  seatType: "O"
})
```

6. **确认提交订单**
```javascript
mcp_12306-mcp_confirm-single-for-queue({
  passengerTicketStr: "同上",
  oldPassengerStr: "同上",
  keyCheckIsChange: "从initDc获取的key_check_isChange",
  leftTicketStr: "从initDc获取的leftTicketStr",
  trainLocation: "从initDc获取的train_location",
  repeatSubmitToken: "从initDc获取的token"
})
```

7. **查询订单号**
```javascript
mcp_12306-mcp_query-order-wait-time({
  repeatSubmitToken: "从initDc获取的token"
})
```

8. **验证订单**
```javascript
mcp_12306-mcp_validate-order({
  orderSequenceNo: "上一步获取的订单号",
  repeatSubmitToken: "从initDc获取的token"
})
```

#### 3.2 一键下单方式

```javascript
mcp_12306-mcp_one-click-order({
  secretStr: "车次密钥",
  trainDate: "2024-06-22",
  fromStationName: "广州",
  toStationName: "深圳",
  passengerIndex: 0,
  seatType: "二等座",
  purposeCodes: "ADULT"
})
```

## 座位类型编码表

| 中文名称 | 编码 |
|---------|-----|
| 商务座   | 9   |
| 特等座   | P   |
| 一等座   | M   |
| 二等座   | O   |
| 高级软卧 | 6   |
| 软卧     | 4   |
| 硬卧     | 3   |
| 软座     | 2   |
| 硬座     | 1   |
| 无座     | WZ  |

## 注意事项

1. 使用前必须设置有效的12306登录Cookie
2. 一键下单功能将自动处理从提交订单到验证完成的全流程
3. 订单成功提交后，您需要前往12306官网支付
4. 如遇到问题，请查看12306官网的"未完成订单"

## 依赖项

- @modelcontextprotocol/sdk
- axios
- zod

## 声明

本项目仅供学习研究使用，请遵守12306相关规定和法律法规。
