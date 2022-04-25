import { ReactiveEffect } from "./effect";

export function createDep (effects:Array<ReactiveEffect>):Set<ReactiveEffect<any>> { // 创建依赖收集
   const dep = new Set(effects);

   return dep;
}