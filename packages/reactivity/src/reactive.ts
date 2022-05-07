// 各个方法区别 : 1. 是不是仅读     2. 是不是深度
import { isObject } from '@vue/shared'
import {
   mutableHandlers,
   shallowReactiveHandlers,
   readonlyHandlers,
   shallowReadonlyHandlers
} from './baseHandlers'

export function reactive<T>(target: T):T {
   target["__v_isReactive"] = true;
   target["__v_isReadonly"] = false;
   return createReactiveObject(target, false, mutableHandlers)
}

export function shallowReactive<T>(target: T):T {
   target["__v_isReactive"] = true;
   target["__v_isReadonly"] = false;
   return createReactiveObject(target, false, shallowReactiveHandlers)
}

export function readonly<T>(target: T):T {
   target["__v_isReactive"] = false;
   target["__v_isReadonly"] = true;
   return createReactiveObject(target, true, readonlyHandlers)
}

export function shallowReadonly<T extends object>(target: T):T {
   target["__v_isReactive"] = false;
   target["__v_isReadonly"] = true;
   return createReactiveObject(target, false, shallowReadonlyHandlers)
}

// 拦截数据的读取和数据的修改
const reactiveMap = new WeakMap();  // 弱引用，会自动进行垃圾回收不会造成内存泄漏，key是对象
const readonlyMap = new WeakMap();
export function createReactiveObject<T extends object>(target: T, isReadOnly: boolean, handlers: ProxyHandler<T>): T {
   // reactive API 只拦截对象属性
   if (!isObject(target)) {
      return target;
   }

   // 如果对象已经被代理了直接拿到代理对象，如果没有被代理，也要判断是不是被深度或仅读代理 又要仅读或深度代理
   const proxyMap = isReadOnly ? readonlyMap : reactiveMap;

   const existProxy = proxyMap.get(target);
   if (existProxy) {
      return existProxy;
   }

   const proxy = new Proxy(target, handlers);
   proxyMap.set(target, proxy); //  将将要代理的对象和对应的代理对象存起来

   return proxy;
}