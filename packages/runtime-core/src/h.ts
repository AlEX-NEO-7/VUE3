import { isArray, isObject } from "@vue/shared";
import { createVNode, isVNode } from "./createVNode";

export function h(type, propsOrChildren, children) {
   let len = arguments.length;

   if(len === 2){
      if(isObject(propsOrChildren) && !isArray(propsOrChildren)){
         if(isVNode(propsOrChildren)){
            return createVNode(type, null, [propsOrChildren])  // h('div', h('span'))
         }
         return createVNode(type, propsOrChildren) // h('div', {color:red})
      }else {
         return createVNode(type, null, propsOrChildren) // h('div', 'Hello')  h('div', ['Hello','Hello'])
      }
   }else {
      if(len > 3){   // 对不是标准传参形式的参数进行处理
         Array.prototype.slice.call(arguments, 2);
      }else if(len === 3 && isVNode(children)) {
         children = [children];
      }
      return createVNode(type, propsOrChildren, children);
   }
}