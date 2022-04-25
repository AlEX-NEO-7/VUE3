const extend = Object.assign;
const isObject = (value) => value instanceof Object;
const isArray = Array.isArray;
const isNumber = (value) => typeof value === "number";
const isString = (value) => typeof value === "string";
const isFunction = (value) => typeof value === "function";
const isIntegerKey = (key) => parseInt(key) + "" === key;
let own = Object.prototype.hasOwnProperty;
const hasOwn = (target, key) => own.call(target, key);
const hasChanged = (oldVal, newVal) => oldVal !== newVal;
// component = 010 | 100 = 110
// component & FUN = 010  compoent & STAT = 100
// 与其他人 与算法 得出来的都为0  这种做法可以确定权限的关系

export { extend, hasChanged, hasOwn, isArray, isFunction, isIntegerKey, isNumber, isObject, isString };
//# sourceMappingURL=shared.esm-bunlder.js.map
