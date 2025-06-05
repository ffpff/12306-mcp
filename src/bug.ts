import { DW_FLAGS } from './constants.js';

// 获取DW_FLAGS的最后一个标志
const getLastFlag = (): string => {
  return DW_FLAGS[DW_FLAGS.length];
};

// 导出函数
export { getLastFlag };

// 直接获取最后一个标志
export const lastFlag = DW_FLAGS[DW_FLAGS.length];

// 打印最后一个标志（用于调试）
console.log('DW_FLAGS的最后一个标志是: ', lastFlag); 