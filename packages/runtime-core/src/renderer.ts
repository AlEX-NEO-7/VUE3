import { createAppAPI } from './createAppAPI'
import { ShapeFlags } from "@vue/shared";
import { createComponentInstance, setupComponent } from './componentAPI';
import { ReactiveEffect } from '@vue/reactivity';
import { isSameVNodeType, normalizedVNode, Text } from './createVNode';
import { shouldUpdateComponent } from './componentRenderUtils';
import { queueJob } from './scheduler';

// 最长上升子序列
function getSequence(seq: Array<any>): Array<any> {
   let len = seq.length;
   const result = [0];
   let p = seq.slice(0);
   let lastIndex;
   let start;
   let end;
   let middle;

   for (let i = 0; i < len; i++) {
      const seqI = seq[i];

      if (seqI !== 0) {
         lastIndex = result[result.length - 1];
         if (seq[lastIndex] < seqI) {
            p[i] = lastIndex;
            result.push(i);
            continue;
         }
         // 二分查找 替换元素
         start = 0;
         end = result.length - 1;
         while (start < end) {
            middle = ((start + end) / 2) | 0;
            if (seq[result[middle]] < seqI) {
               start = middle + 1;
            } else {
               end = middle;
            }

            if (seqI < seq[result[start]]) {
               p[i] = result[start - 1];
               result[start] = i;
            }
         }
      }
   }
   let i = result.length;
   let last = result[i - 1];
   while (i > 0) {
      i--;
      result[i] = last;
      last = p[last];
   }

   return result; // 输出索引
}

export function createRenderer(renderOptions: any) {   // runtime-core   renderOptionsApi -> rootCompont -> rootPros -> container
   const {  // renderOptions里面的方法
      insert: hostInsert,
      remove: hostRemove,
      patchDOMProp: hostPatchProp,
      createElement: hostCreateElement,
      createText: hostCreateText,
      setText: hostSetText,
      setElementText: HostSetElementText,
      parentNode: HostParentNode,
      nextSibling: HostNextSilbing,
      querySelector: HostQuerySelector
   } = renderOptions;

   // 将虚拟节点变成真实节点渲染到容器中
   const render = (vnode, container) => {
      if (vnode == null) {
         if (container._vnode) {   // vnode为空 container有_vnode属性 此时为卸载组件
            unmount(container._vnode)
         }
      } else {
         // 包括初次渲染和更新 后续会更新patch 
         patch(container._vnode || null, vnode, container)// 后续更新 prevNode nextNode container
      }
      container._vnode = vnode;  // 渲染过后把vnode与container绑定
   }

   // 组件初次渲染和更新
   const patch = (n1, n2, container, anchor?) => {
      if (n1 == n2) {
         return;
      }

      // 更新的patch 两个元素标签不一样 key也不一样，直接卸载旧的
      if (n1 && !isSameVNodeType(n1, n2)) {
         unmount(n1);
         n1 = null;
      }

      const { shapeFlag, type } = n2;

      switch (type) {
         case Text:
            processText(n1, n2, container);
            break;
         default:
            if (shapeFlag & ShapeFlags.COMPONENT) {  // 判断渲染的是否为组件 
               processComponent(n1, n2, container);
            } else if (shapeFlag & ShapeFlags.ELEMENT) { // 判断渲染的是否为元素
               processElement(n1, n2, container, anchor);
            }
      }
   }

   // 处理组件
   const processComponent = (n1, n2, container) => {
      if (n1 == null) {   // 后期可以考虑缓存组件的情况 COMPONENT_KEPT_ALIVE
         // 组件初始化挂载
         mountComponent(n2, container);
      } else {
         // 组件更新挂载
         updateComponent(n1, n2, container);
         console.log("更新")
      }
   }

   // 处理元素（一般是组件对应的返回值）
   const processElement = (n1, n2, container, anchor) => {
      if (n1 == null) {
         // 初始化
         mountElemnt(n2, container, anchor);
      } else {
         // diff
         patchElement(n1, n2);
      }
   }

   // 处理文本
   const processText = (n1, n2, container) => { // 容器为父元素
      if (n1 == null) {
         // 初始化
         let textNode = hostCreateText(n2.children);
         n2.el = textNode;
         hostInsert(textNode, container);
      } else {

      }
   }

   // 组件更新的过程
   const updateComponent = (n1, n2, container) => {
      // 更新组件实例引用
      const instance = (n2.component = n1.component);
      // 判断是否应该更新
      if (shouldUpdateComponent(n1, n2)) {
         // next就是新的vnode
         instance.next = n2;
         // 这里的update是在setupRenderEffect中初始化的
         // 调用update再次更新调用patch逻辑
         // 在update中调用的next就变成了n2
         instance.update();
      } else {
         n2.component = n1.component;
         n2.el = n1.el;
         instance.vnode = n2;
      }
   }

   // 对比元素
   const patchElement = (n1, n2) => {
      let el = n2.el = n1.el; // 比较元素一致则复用

      const oldProps = n1.props || {}; // 比较属性
      const newProps = n2.props || {};
      patchProps(oldProps, newProps, el);

      // 比较children，diff核心   diff算法是同级比较
      patchChildren(n1, n2, el);
   }

   // 对比元素中的属性
   const patchProps = (oldProps, newProps, el) => {
      if (oldProps === newProps) return;

      for (const key in newProps) { // 新值与旧值不一样
         const prev = oldProps[key];
         const next = newProps[key];
         if (prev !== next) {
            hostPatchProp(el, key, prev, next);
         }
      }

      for (const key in oldProps) { // 新值不存在的旧值
         if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null);
         }
      }
   }

   // 对比子节点
   const patchChildren = (n1, n2, el: Element) => {
      const c1 = n1 && n1.children
      const prevShapeFlag = n1.shapeFlag
      const c2 = n2 && n2.children
      const shapeFlag = n2.shapeFlag
      // c1 和 c2 有哪些类型  (n1为空的情况在processElement阶段已经处理了)
      // 1. 之前是数组现在是文本   2. 之前是数组，现在也是数组   3. 之前是文本，现在是数组  
      // 4. 之前是文本现在是空    5. 之前是文本现在是文本     6. 之前是文本现在是空

      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
         if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {  // 之前是数组
            unmountChildren(c1); // 1（把情况1变成情况4）
         }
         if (c1 != c2) {  // 4 5
            HostSetElementText(el, c2);
         }
      } else { // 现在是数组或空
         if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { // 2
               // 对比两个数组的差异
               patchKeyedChildren(c1, c2, el)
            } else { // 之前是数组 现在是空文本
               unmountChildren(c1);
            }
         } else {// 之前是文本  3 6 
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
               HostSetElementText(el, '')
            }
            if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
               mountChildren(c2, el)
            }
         }
      }
   }

   // 对比两个同为数组的子节点
   const patchKeyedChildren = (c1, c2, container) => {
      let i = 0;  // 从头结点开始
      const l2 = c2.length;
      let e1 = c1.length - 1;
      let e2 = l2 - 1;

      // 1. sync from start 从头开始一个个孩子来比较，遇到不同的节点就停止
      while (i <= e1 && i <= e2) {  // 如果i和新的列表或者老的列表指针重合，说明比较完毕了
         const n1 = c1[i];
         const n2 = c2[i];

         if (isSameVNodeType(n1, n2)) {
            patch(n1, n2, container);
         } else {
            break;
         }
         i++;
      }

      // 2. sync from end 从末尾开始一个个子节点比较，遇到不同的节点就停止
      while (i <= e1 && i <= e2) {  // 如果i和新的列表或者老的列表指针重合，说明比较完毕了
         const n1 = c1[e1];
         const n2 = c2[e2];
         if (isSameVNodeType(n1, n2)) {
            patch(n1, n2, container);
         } else {
            break;
         }
         e1--;
         e2--;
      }

      // common sequence + mount
      if (i > e1) { // 新增
         if (i <= e2) { // i 与 e2 中间的元素是新增的
            const nextPos = e2 + 1;
            // 参照物的目的是找到插入的位置
            const anchor = nextPos < l2 ? c2[nextPos].el : null;
            while (i <= e2) {
               patch(null, c2[i], container, anchor);
               i++;
            }
         }
      }
      // common sequence + unmount
      else if (i > e2) { // 删除
         while (i <= e1) { // i 与 e2中间的元素是需要删除的
            unmount(c1[i]);
            i++;
         }
      }
      // unknow sequence
      else {   // 先找出复用序列再进行新增
         const s1 = i;  // s1 -> e1 老的子节点列表
         const s2 = i;  // s2 -> e2 新的子节点列表

         // 根据新的子节点序列创造映射表
         const keyToNewIndexMap = new Map();
         for (i = s2; i <= e2; i++) {
            const child = c2[i];
            keyToNewIndexMap.set(child.key, i);
         }

         // 搜索旧的子节点序列能复用的序列索引
         const toBePatched = e2 - s2 + 1; // 索引数组的长度
         const newIndexToOldIndexMap = new Array(toBePatched).fill(0); // 储存可复用的索引+1 索引是旧节点在旧数组的索引 0表示不存在

         for (i = s1; i <= e1; i++) {
            const prevChild = c1[i];
            let newIndex = keyToNewIndexMap.get(prevChild.key);

            if (newIndex == undefined) { // 删除多余的 新子节点中不存在的旧子节点
               unmount(prevChild);
            } else {
               newIndexToOldIndexMap[newIndex - s2] = i + 1;  // 保证不为0
               patch(prevChild, c2[newIndex], container);   // 填表后还需比对
            }
         }

         let queue = getSequence(newIndexToOldIndexMap); // 最长递增子序列算法求出可优化的某段子节点索引
         let j = queue.length - 1;  // 倒序插入

         for (i = toBePatched - 1; i >= 0; i--) {  // 倒序插入 
            let lastIndex = s2 + i;
            let lastChild = c2[lastIndex];
            let anchor = lastIndex + 1 < c2.length ? c2[lastIndex + 1].el : null;

            if (newIndexToOldIndexMap[i] === 0) {  // 等于0的时候没有真实节点，需要创建真实节点插入
               patch(null, lastChild, container, anchor);   // 创建一个h插入到f前面
            } else {
               // 可以优化 有些节点可以不移动
               if (i !== queue[j]) {
                  hostInsert(lastChild.el, container, anchor); // 将列表倒序插入
               } else {
                  j--; // 优化点  表示元素不需要移动
               }
            }
         }
      }
   }

   // 组件挂载的过程
   const mountComponent = (initialVNode, container) => {
      // 根据组件的虚拟dom，创造真实的dom，渲染到容器
      // 1. 给组件创造一个实例
      const instance = initialVNode.component = createComponentInstance(initialVNode);  // 给组件创造一个实例
      // 2. 需要给组件实例进行赋值操作
      setupComponent(instance);        // 给组件实例进行赋值操作
      // 3. 调用render方法实现组件渲染逻辑， 如果依赖的数据发生变化，组件需要重新渲染

      // 数据和视图是双向绑定的 如果数据变化，视图更新
      // effect可以用在组件中，这样数据变化后可以自动重新执行effect函数
      setupRenderEffect(initialVNode, instance, container); // 渲染effect
   }

   // 元素挂载的过程
   const mountElemnt = (vnode, container, anchor) => {
      // 给元素创建一个实例
      // vnode中的children 可能是数组，对象数组，字符串数组，字符串
      let { type, shapeFlag, props, children } = vnode;
      let el = vnode.el = hostCreateElement(type);
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
         hostSetText(el, children);
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
         mountChildren(children, el);
      }

      // 处理属性
      if (props) {
         for (const key in props) {
            const value = props[key];
            hostPatchProp(el, key, null, value);
         }
      }
      hostInsert(el, container, anchor);
   }

   // 子元素挂载
   const mountChildren = (children, container) => {   // 容器为父元素
      for (let i = 0; i < children.length; i++) {
         const child = (children[i] = normalizedVNode(children[i]));

         patch(null, child, container);
      }
   }

   // 创建渲染effect
   const setupRenderEffect = (initialVNode, instance, container) => {
      // 核心是调用render，数据变化，重新调用render
      const componentUpdateFn = () => {
         let { proxy } = instance;
         if (!instance.isMounted) {
            // 组件初始化流程
            // 调用render方法（渲染页面的时候会进行取值操作，那么取值的时候会进行依赖收集，收集对应的依赖属性）
            const subTree = instance.subTree = instance.render.call(proxy, proxy);  // 渲染时调用h方法

            patch(null, subTree, container);
            initialVNode.el = subTree.el;
            instance.isMounted = true;
         } else {
            // 组件更新触发effect
            // diff算法 比较前后两棵树
            const { next, vnode } = instance;
            // 有next 说明需要更新组件的数据
            if (next) {
               next.el = vnode.el;
               updateComponentPreRender(instance, next);
            }
            const prevTree = instance.subTree;
            const nextTree = instance.render.call(proxy, proxy);

            patch(prevTree, nextTree, container); // 比较两棵树
         }
      }

      const effect = new ReactiveEffect(componentUpdateFn, () => {
         queueJob(instance.update);
      });
      const update = effect.run.bind(effect);
      instance.update = update;
      update();
   }

   function updateComponentPreRender(instance, nextVNode) {
      nextVNode.component = instance;
      instance.vnode = nextVNode;
      instance.next = null;

      const { props } = nextVNode;
      instance.props = props;
   }

   // 卸载子节点
   const unmountChildren = (children) => {
      for (const child of children) {
         unmount(child);
      }
   }

   // 卸载节点
   const unmount = (vnode) => {
      hostRemove(vnode.el); // 删除真实节点
   }


   return {
      createApp: createAppAPI(render),
      render
   };
}