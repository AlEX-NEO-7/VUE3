// 需要涵盖dom操作的api、属性操作的api，将这些api传入runtime-core中

// runtime-core在操作中不需要依赖于平台代码（平台代码时传入的）
import { nodeOps } from './nodeOps'
import { patchDOMProp } from './patchProp'
import { createRenderer } from '@vue/runtime-core'

const renderOptions = Object.assign(nodeOps, { patchDOMProp })

export const createApp = (component: any, rootProps?: any) => {
   // 创建渲染器
   const { createApp } = createRenderer(renderOptions);  // 传入环境API
   let app = createApp(component, rootProps);
   let { mount } = app; // 获取core中的mount
   app.mount = function (container) {  // 重写mount
      container = nodeOps.querySelector(container);
      container.innerHTML = '';
      mount(container);
   }
   return app;
}

export * from '@vue/runtime-core'
