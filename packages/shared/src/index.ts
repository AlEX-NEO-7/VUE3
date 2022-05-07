/**
 * @private
 * 合并对象
 */
export const extend = Object.assign;

/**
 * @private
 * 判断是否为对象
 */
export const isObject = (value: unknown): value is {} => value instanceof Object;

/**
 * @private
 * 判断是否为数组
 */
export const isArray = Array.isArray;

/**
 * @private
 * 判断是否为Symbol
 */
export const isSymbol = (value: unknown): value is symbol => typeof value === "symbol";

/**
 * @private
 * 判断是否为数字
 */
export const isNumber = (value: unknown): value is number => typeof value === "number";

/**
 * @private
 * 判断是否为字符串
 */
export const isString = (value: unknown): value is string => typeof value === "string";

/**
 * @private
 * 判断是否为函数
 */
export const isFunction = (value: unknown): value is Function => typeof value === "function";

/**
 * @private
 * 判断key值是否为数字类型
 */
export const isIntegerKey = (key: unknown): boolean => isString(key) &&
   key !== 'NaN' &&
   key[0] !== '-' &&
   '' + parseInt(key, 10) === key;

let own = Object.prototype.hasOwnProperty;
/**
 * @private
 * 判断key是否为target对象上的属性
 */
export const hasOwn = (target: object, key: string | symbol): boolean => own.call(target, key);

/**
 * @private
 * 判断两个value是否一致
 */
export const hasChanged = (oldValue: any, value: any): boolean => !Object.is(value, oldValue);

const camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
export const camelize = (value: string): string => {
   return value.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "")
}

// on+一个大写字母格式开头
export const isOn = (key: any): boolean => /^on[A-Z]/.test(key);

/**
 * @private
 * 首字母大写
 */
export const capitalize = (value: string):string => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * @private
 * 添加 on 前缀，并且首字母大写
 */
export const toHandlerKey = (value: string):string => value ? `on${capitalize(value)}` : ``;

export const enum ShapeFlags { // 二进制移位
   ELEMENT = 1,
   FUNCTIONAL_COMPONENT = 1 << 1, // 函数式组件
   STATEFUL_COMPONENT = 1 << 2,   // 普通组件
   TEXT_CHILDREN = 1 << 3,        // 子节点是文本
   ARRAY_CHILDREN = 1 << 4,       // 子节点是数组
   SLOTS_CHILDREN = 1 << 5,       // 组件插槽
   TELPRORT = 1 << 6,             // teleport组件
   SUSPENSE = 1 << 7,             // suspense组件
   COMPONENT = ShapeFlags.STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT    // 组件
}

// component = 010 | 100 = 110
// component & FUN = 010  compoent & STAT = 100
// 与其他人 与算法 得出来的都为0  这种做法可以确定权限的关系 
