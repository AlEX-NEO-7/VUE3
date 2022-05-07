import { reactive } from '@vue/reactivity';
import { camelize, hasOwn, isArray, isFunction, isObject, ShapeFlags, toHandlerKey } from '@vue/shared';

// 生成组件实例
export function createComponentInstance(vnode) {
   const type = vnode.type;
   const instance = {
      type,                      // 组件对象
      vnode,                     // 实例化对象的虚拟节点
      next: null,                // 需要更新的 vnode，用于更新 component 类型的组件
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
      isMounted: false,           // 组件是否挂载完成
      parent,
      provides: parent ? (parent as any).provides : {}, //  获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
   }

   // 在prod环境下ctx是以下的简单环境，如果是 dev 会更复杂需要处理
   instance.ctx = { _: instance };

   // 赋值emit
   // 使用bind 把 instance 进行绑定
   // 用户使用时移交 event 和参数即可
   instance.emit = emit.bind(null, instance);

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
   const options = Object.keys(instance.propsOptions);

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

// 初始化emit
export const emit = (instance, event: string, ...rawArgs) => {
   // 1. emit 是基于 props 里面的 onXXX 的函数来进行匹配的
   // 所以我们先从 props 中看看是否有对应的 event handler
   const props = instance.props;
   // ex: event -> click 那么这里取的就是 onClick
   // 让事情变的复杂一点如果是烤肉串命名的话，需要转换成  change-page -> changePage
   // 需要得到事件名称
   const handlerName = toHandlerKey(camelize(event));
   const handler = props[handlerName];
   if (handler) {
      handler(...rawArgs);
   }
}

// 初始化slots
export const initSlots = (instance, children) => {
   const { vnode } = instance

   if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
      normalizeObjectSlots(children, (instance.slots = {}))
   }
}

// 把 function 返回的值转换成array
const normalizeSlotValue = (value): Array<unknown> => isArray(value) ? value : [value];

// 特殊对象正常化
const normalizeObjectSlots = (rawSlots, slots) => {
   for (const key in rawSlots) {
      const value = rawSlots[key];
      if (isFunction(value)) {
         // 把这个函数给到slots 对象上存起来
         // 后续在 renderSlots 中调用
         // TODO 这里没有对 value 做 normalize，
         // 默认 slots 返回的就是一个 vnode 对象
         slots[key] = (props) => normalizeSlotValue(value(props))
      }
   }
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
const PublicInstanceProxyHandles = {
   get({ _: instance }, key) {
      const { setupState, props } = instance;
      if (hasOwn(setupState, key)) {  // 先查看setup返回值没有再去查看props
         return setupState[key];
      } else if (hasOwn(props, key)) {
         return props[key];
      } else {  // vue2语法

      }
   },
   set({ _: instance }, key, value) {
      // 不允许对props进行修改
      const { setupState, props } = instance;
      if (hasOwn(setupState, key)) {
         setupState[key] = value;
      } else if (hasOwn(props, key)) {
         console.warn("Props are readonly")
         return false;
      } else {  // vue2语法

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
      // 设置当前 currentInstance 的值， 在调用setup之前
      setCurrentInstance(instance);

      const setupContext = createSetupContext(instance);
      let setupResult = setup(instance.props, setupContext);   // 获取setup返回的值

      setCurrentInstance(null);
      // 处理setup的返回结果
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


let currentInstance = {};
// 这个接口暴露给用户，用户可以在 setup 中获取组件实例 instance
export function getCurrentInstance(): any {
   return currentInstance;
}

export function setCurrentInstance(instance) {
   currentInstance = instance;
}

let compile;
export function registerRuntimeCompiler(_compile) {
   compile = _compile;
}