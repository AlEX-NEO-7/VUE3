// 实现handler
// 1. 是否仅读    2. 是否深度

import { extend, hasChanged, hasOwn, isArray, isIntegerKey, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
import { reactive, readonly } from "./reactive";

type GetFunction = (target: any, p: string | symbol, receiver: any) => any;
type SetFunction = (target: any, p: string | symbol, value: any, receiver: any) => boolean;

// Getter
const get = createGetter(false, false);
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true, false);
const shallowReadonlyGet = createGetter(true, true);

// Setter
const set = createSetter(false);
const shallowSet = createSetter(true);

let readonlyObject = {  // 只读对象的Setter方法
   set: function (target: any, key: any, receiver: any):boolean {
      console.warn(`${key} is a read-only attribute and cannot be modified`);
      return true;
   }
}

function createGetter(isReadOnly: boolean = false, shallow: boolean = false): GetFunction { // 拦截获取
   return function get(target, key, reciver) {  // reciver为代理对象
      // proxy + reflect
      // Reflect方法具备返回值
      const res = Reflect.get(target, key, reciver);

      if (key === "__v_isReactive" || key === "__v_isReadonly") {
         return res;
      }

      if (!isReadOnly) {
         // 收集依赖，等数据变化后更新视图
         track(target, key, TrackOpTypes.GET);
      }

      if (shallow) {   // 浅层响应式直接返回对象
         return res;
      }

      if (isObject(res)) {  // 如果是对象继续递归，Vue2一上来就递归; Vue3是当取值时会进行代理，Vue3的代理模式是懒代理
         return isReadOnly ? readonly(res) : reactive(res);
      }

      return res;
   }
}

function createSetter(shallow: boolean): SetFunction {  // 拦截设置
   return function set(target, key, value, reciver):boolean {   // target[key] = value
      // 当数据更新时，通知所有对应的属性的effect重新执行

      // 区分新增还是修改执行的set
      let oldVal = target[key];
      if (key === "__v_isReactive" || key === "__v_isReadonly") {   // 不允许修改内置属性
         console.warn(`The ${key} attribute is a built-in attribute and cannot be changed.`);
         return oldVal;
      }
      const res = Reflect.set(target, key, value, reciver);    // 用Reflect比直接target[key] = value 的做法更好
      let hasKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);


      if (!hasKey) {
         // 新增
         trigger(target, key, TriggerOrTypes.ADD, value)
      } else if (hasChanged(oldVal, value)) {
         //修改, 并且保证修改的值与之前的不一样
         trigger(target, key, TriggerOrTypes.SET, value, oldVal)
      }

      return res;
   }
}

export const mutableHandlers: ProxyHandler<any> = {
   get,
   set
};

export const shallowReactiveHandlers: ProxyHandler<any> = {
   get: shallowGet,
   set: shallowSet
};

export const readonlyHandlers: ProxyHandler<any> = extend({
   get: readonlyGet,

}, readonlyObject);

export const shallowReadonlyHandlers: ProxyHandler<any> = extend({
   get: shallowReadonlyGet,
}, readonlyObject);