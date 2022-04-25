import { reactive } from '@vue/reactivity';
import { hasOwn, isFunction, isObject } from '@vue/shared';

// 生成组件实例
export function createComponentInstance(vnode) {
   const type = vnode.type;
   const instance = {
      vnode,                     // 实例化对象的虚拟节点
      type,                      // 组件对象
      subTree: null,             // 组件渲染的内容   组件的vnode叫vnode 组件渲染的结果叫subTree
      ctx: {},                   // 上下文
      props: {},                 // 组件属性
      attrs: {},                 // 除了props中的属性
      slots: {},                 // 组件的插槽
      setupState: {},            // setup函数返回的状态
      propsOptions: type.props,  // 属性选项
      proxy: null,               // 实例的代理对象
      render: null,              // 组件的渲染函数
      emit: null,                // 事件触发
      expose: {},                // 组件暴露的方法
      isMounted: false           // 组件是否挂载完成
   }

   instance.ctx = { _: instance };
   return instance;
}

// 给组件实例进行赋值
export function setupComponent(instance) {
   const { props, children } = instance.vnode;
   // 组件的props初始化 attrs初始化
   initProps(instance, props);
   // 插槽的初始化
   initSlots(instance, children);
   // 启动状态，目的是调用setup函数拿到返回值
   setupStatefulComponent(instance);
}

// 初始化props和attrs
export function initProps(instance, rawProps) {
   const props = {};
   const attrs = {};
   const options = Object.keys(instance.propsOptions)

   if (rawProps) {
      for (const [key, value] of Object.entries(rawProps)) {
         if (options.includes(key as string)) {
            props[key] = value;
         } else {
            attrs[key] = value;
         }
      }
   }
   instance.props = reactive(props);
   instance.attrs = attrs;   // 非响应式
}

// 初始化slots
export const initSlots = (instance, children) => {

}

// 创建一个setup的上下文
const createSetupContext = (instance) => {
   return {
      attrs: instance.attrs,
      slots: instance.slots,
      emit: instance.emit,
      expose: (exposed) => instance.expose = exposed || {}
   }
}

// 代理对象的handler
const PublicInstanceProxyHandles ={
   get({_:instance}, key) {
      const { setupState, props } = instance;
      if(hasOwn(setupState, key)){  // 先查看setup返回值没有再去查看props
         return setupState[key];
      }else if(hasOwn(props, key)) {
         return props[key];
      }else {  // vue2语法

      }
   },
   set({_:instance}, key, value) {
      // 不允许对props进行修改
      const { setupState, props } = instance;
      if(hasOwn(setupState, key)){
         setupState[key] = value;
      }else if(hasOwn(props, key)) {
         console.warn("Props are readonly")
         return false;
      }else {  // vue2语法

      }
      return true;
   }
}

// 启动setup
export const setupStatefulComponent = (instance) => {
   // 核心是调用组件的setup方法
   const compoent = instance.type;
   const { setup } = compoent;
   instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandles); // 代理上下文处理函数
   if (setup) {
      const setupContext = createSetupContext(instance);
      let setupResult = setup(instance.props, setupContext);   // 获取setup返回的值
      if (isFunction(setupResult)) {
         instance.render = setupResult;
      } else if (isObject(setupResult)) {
         instance.setupState = setupResult;
      }
   }

   if (!instance.render) {
      // 如果没写render写了template，则需要模板编译 template -> render
      instance.render = compoent.render;  // 没有写render函数，则使用组件的render
   }
}
