'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * @private
 * 合并对象
 */
const extend = Object.assign;
/**
 * @private
 * 判断是否为对象
 */
const isObject = (value) => value instanceof Object;
/**
 * @private
 * 判断是否为数组
 */
const isArray = Array.isArray;
/**
 * @private
 * 判断是否为Symbol
 */
const isSymbol = (value) => typeof value === "symbol";
/**
 * @private
 * 判断是否为数字
 */
const isNumber = (value) => typeof value === "number";
/**
 * @private
 * 判断是否为字符串
 */
const isString = (value) => typeof value === "string";
/**
 * @private
 * 判断是否为函数
 */
const isFunction = (value) => typeof value === "function";
/**
 * @private
 * 判断key值是否为数字类型
 */
const isIntegerKey = (key) => isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key;
let own = Object.prototype.hasOwnProperty;
/**
 * @private
 * 判断key是否为target对象上的属性
 */
const hasOwn = (target, key) => own.call(target, key);
/**
 * @private
 * 判断两个value是否一致
 */
const hasChanged = (oldValue, value) => !Object.is(value, oldValue);
const camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
const camelize = (value) => {
    return value.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
};
// on+一个大写字母格式开头
const isOn = (key) => /^on[A-Z]/.test(key);
/**
 * @private
 * 首字母大写
 */
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
/**
 * @private
 * 添加 on 前缀，并且首字母大写
 */
const toHandlerKey = (value) => value ? `on${capitalize(value)}` : ``;
// component = 010 | 100 = 110
// component & FUN = 010  compoent & STAT = 100
// 与其他人 与算法 得出来的都为0  这种做法可以确定权限的关系

exports.camelize = camelize;
exports.capitalize = capitalize;
exports.extend = extend;
exports.hasChanged = hasChanged;
exports.hasOwn = hasOwn;
exports.isArray = isArray;
exports.isFunction = isFunction;
exports.isIntegerKey = isIntegerKey;
exports.isNumber = isNumber;
exports.isObject = isObject;
exports.isOn = isOn;
exports.isString = isString;
exports.isSymbol = isSymbol;
exports.toHandlerKey = toHandlerKey;
//# sourceMappingURL=shared.cjs.js.map
