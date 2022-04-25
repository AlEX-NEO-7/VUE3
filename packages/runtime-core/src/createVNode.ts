import { isObject, isString, ShapeFlags } from "@vue/shared"

export const createVNode = (type, props, children?) => {    // h('div', {}, 'Hello!')
   // 虚拟节点就是用一个对象来描述信息的
   const shapeFlag = isObject(type) ? ShapeFlags.COMPONENT : isString(type) ? ShapeFlags.ELEMENT:0;

   const vnode = {   // 跨平台   (变成类型别名)
      __v_isVNode: true,
      type,
      shapeFlag,
      props,
      children,
      key: props && props.key,
      component: null,     // 如果是组件的虚拟节点需要保存组件实例
      el: null,            // 虚拟节点对应的真实节点
   }

   if(children){  // 把儿子节点的描述合并到shapleFlag
     vnode.shapeFlag |= isString(children) ? ShapeFlags.TEXT_CHILDREN : ShapeFlags.ARRAY_CHILDREN;
   }

   // vnode 可以描述当前它是个怎样的节点 子节点是怎么样的
   return vnode;
}

export function isVNode(vnode) {
   return !!vnode.__v_isVNode
}

export const Text = Symbol();
export function normalizedVNode(vnode) {
   if(isObject(vnode)){
      return vnode;
   }
   return createVNode(Text, null, String(vnode));
}

export function isSameVNodeType(n1, n2) {
   return n1.type === n2.type && n1.key === n2.key;
}