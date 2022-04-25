import { isString } from "@vue/shared";

// 需要对比属性 diff算法 属性比对前后值
function patchClass(el: Element, value: any) {
   if (value === null) {
      el.removeAttribute('class')
   } else {
      el.className = value;
   }
}

function patchStyle(el: Element | any, prev: any, next: any) {
   const style = el.style; // 获取样式表
   const isCssString = isString(next); // 判断传入的是否为string
   if (next && !isCssString) {   // 不是则循环修改
      for (const key in next) {
         style[key] = next[key];
      }
      if (prev && !isString(prev)) {
         for (const key in prev) {
            if (next[key] == null) {
               style[key] = null;
            }
         }
      }
   } else {
      if (isCssString) {  // 是string则直接赋值
         if (prev !== next) {
            style.cssText = next;
         } else if (prev) {
            el.removeAttribute('style');
         }
      }
   }
}

function createInvoker(value: any) {
   const invoker = (e: any) => {
      invoker.value(e);
   }
   invoker.value = value;  // 后续换绑可以直接更新value值
   return invoker;
}

function patchEvent(el: Element | any, key: string, nextValue: any) {
   // vue event invoker 类似事件池 缓存绑定的事件
   const invokers = el._vei || (el._vel = {});  // 在元素上绑定一个自定义属性 用来记录绑定的事件
   const existingInvoker = invokers[key];

   if(existingInvoker && nextValue){   // 换绑
      existingInvoker.value = nextValue;
   }else {
      const eventName = key.slice(2).toLowerCase();   // 如果放在if else外面触发不了effect
      if (nextValue) {  // 新增
         const invoker = invokers[key] = createInvoker(nextValue);
         el.addEventListener(eventName, invoker);
      } else if(existingInvoker){   // 删除
         el.removeEventListener(eventName, existingInvoker);
         invokers[key] = undefined;
      }
   }
}

function patchAttr(el:Element, key:string, value:any) {
   if(value == null){
      el.removeAttribute(key);
   }else {
      el.setAttribute(key, value);
   }
}

export const patchDOMProp = (el: Element, key: string, prevValue: any, nextValue: any) => {
   if (key === 'class') {
      patchClass(el, nextValue)
   } else if (key === 'style') {
      patchStyle(el, prevValue, nextValue)
   } else if (/^on[^a-z]/.test(key)) {  // onClick...
      patchEvent(el, key, nextValue);
   } else {  // 其他属性 setAttribute （data-type...）
      patchAttr(el, key, nextValue);
   }
}

