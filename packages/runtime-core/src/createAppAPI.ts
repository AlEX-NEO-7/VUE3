import { createVNode } from './createVNode'



export const createAppAPI = (render:Function) => {
   return (rootCompont, rootProps) => {
      let isMounted = false;
      const app = { // 返回的app对象
         mount(container) {
            // 1. 创造虚拟节点
            let vnode = createVNode(rootCompont, rootProps);   // h函数
            // 2. 挂载的核心就是根据传入的组件对象，创造虚拟节点，再把虚拟节点渲染到组件中
            render(vnode, container);
            if(!isMounted){
               isMounted = true;
            }
         },
         unmount() {},
         use(plugin, ...options:any[]){
            
         }
      }
      return app;
   }
}