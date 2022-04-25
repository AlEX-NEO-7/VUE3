import { extend, isArray, isIntegerKey } from "@vue/shared";
import { createDep } from "./dep";
import { TrackOpTypes, TriggerOrTypes } from "./operators";

let activeEffect: any;   // 当前正在执行的effect

export class ReactiveEffect<T = any>{
   active: boolean = true; // 是否是激活状态 
   deps: any = [];   // 让effect记录他依赖了哪些属性，同时记录当前属性依赖了哪个effect
   parent: ReactiveEffect | undefined = undefined;
   fn: Function;
   scheduler: any;

   constructor(fn: Function, scheduler?: any) {
      this.fn = fn;
      this.scheduler = scheduler;
   }

   run() {  // 调用run会让fn执行
      if (!this.active) {  // 如果处于非激活状态，调用run方法会默认调用fn函数
         return this.fn();
      }

      let parent = activeEffect;

      while (parent) {
         if (parent === this) {
            return;
         }
         parent = parent.parent;
      }

      try {
         this.parent = activeEffect;
         activeEffect = this;
         return this.fn()  // 取值 new Proxy 会执行get方法（收集依赖）
      } finally {
         activeEffect = this.parent;
         this.parent = undefined;
      }
   }

   stop() {    // 让effect和dep取消关联
      if (this.active) {
         cleanupEffect(this); // 移除dep上存储的effect依赖
      }
      this.active = false;
   }
}

// 清空依赖收集
function cleanupEffect(effect) {
   const { deps } = effect;
   if (deps.length) {
      for (let i = 0; i < deps.length; i++) {
         deps[i].delete(effect); // 让属性对应的effect移除掉
      }
      deps.length = 0;
   }
}

export function effect(fn: any, options: any = {}) {
   if (fn.effect) {
      fn = fn.effect.fn;
   }
   // 把effect变成一个响应式的effect，可以做到数据变化后重新执行
   const _effect = new ReactiveEffect(fn);

   if (options) {
      extend(_effect, options);
   }

   if (!options || !options.lazy) { // 如果不为lazy默认执行一次
      _effect.run();
   }

   const runner = _effect.run.bind(_effect);

   runner.effect = _effect;   // 给runner添加effect实现 就是effect实例

   return runner;
}

// 让某个对象中的属性收集它对应的effect函数
const targetMap = new Map()    // 把收集了依赖的对象放入map
export function track(target: any, key: Symbol | string, type: TrackOpTypes) {
   if (!activeEffect) {
      return;
   }

   let depsMap = targetMap.get(target);

   if (!depsMap) {  // 查看是否把当前这个对象放入依赖weakmap，没有则创建一个map放入作为值
      targetMap.set(target, (depsMap = new Map()));
   }

   let dep = depsMap.get(key);

   if (!dep) {   // 查看寻找的这个对象里面是否把当前的key放入map，没有则创建一个set放入作为值
      depsMap.set(key, (dep = new Set()));
   }

   trackEffects(dep);
}

// 查看set是否有放入了effect，没有则把当前的effect放入set
export function trackEffects(dep) {
   if (!dep.has(activeEffect)) {
      dep.add(activeEffect);
      (activeEffect as any).deps.push(dep);
   }
}

// 触发执行依赖，添加元素时，也自动添加effect，并收集依赖
export function trigger(target: any, key: any, type?: TriggerOrTypes, newVal?: any, oldVal?: any) {
   // 如果target没有被收集依赖则忽略
   const depsMap = targetMap.get(target);
   if (!depsMap) {
      return;
   }

   // 将所有要执行的effect全部放到一个集合中，最终一起执行
   const deps = [];

   if (key === "length" && isArray(target)) {// 判断为数组，且更新的是长度
      // 如果对应的长度（key）有依赖收集则需要更新
      depsMap.forEach((dep: Array<any>, _key: any) => {// 如果更改的长度小于收集的索引，那么这个索引也需要触发effect进行更新
         if (key === "length" || _key >= newVal) {// _key为收集的索引，dep为被收集的索引所有effect的Set集合
            deps.push(dep);
         }
      });
      switch (type) { // 数组修改超出边界
         case TriggerOrTypes.ADD:
            if (isArray(target) && isIntegerKey(key)) {
               // 修改数组中的某个索引(边界之外的，没有赋值所以前面判断为新增)
               deps.push(depsMap.get("length"));   // 触发长度依赖更新
            }
      }
   } else {
      // 对象
      if (key !== undefined) {
         deps.push(depsMap.get(key));   // 拿到具体的dep合集并匹配进新合集
      }
   }

   const effects: Array<ReactiveEffect> = [];

   // dep是Set数据类型，里面包含 activeEffect
   for (const dep of deps) {
      if (dep) {
         effects.push(...dep);
      }
   }

   triggerEffects(createDep(effects));
}

// 执行所有effect
export function triggerEffects(dep: Set<ReactiveEffect<any>>) {
   for (const effect of dep) {
      if (effect !== activeEffect) {// 如果当前执行的effect和要执行的effect是同一个就不执行，防止循环
         if (effect.scheduler) {
            effect.scheduler()
         } else {
            effect.run();
         }
      }
   }
}
