export const extend = Object.assign;

export const isObject = (value: any): boolean => value instanceof Object;

export const isArray = Array.isArray;

export const isNumber = (value: any): boolean => typeof value === "number";

export const isString = (value: any): boolean => typeof value === "string";

export const isFunction = (value: any): boolean => typeof value === "function";

export const isIntegerKey = (key: any):boolean => parseInt(key) + "" === key;

let own = Object.prototype.hasOwnProperty;
export const hasOwn = (target: {}, key: PropertyKey):boolean => own.call(target, key);

export const hasChanged = (oldVal: any, newVal: any): boolean => oldVal !== newVal;

export const enum ShapeFlags{ // 二进制移位
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
