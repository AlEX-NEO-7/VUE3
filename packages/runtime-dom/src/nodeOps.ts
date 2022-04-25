export const nodeOps = {
   insert: (child:Element, parent:Node, anchor?:Node) => {  // anchor 插入的参考位置
      parent.insertBefore(child, anchor); // parent.appendChild(child)
   },
   remove: (child:Element) => {
      const parent = child.parentNode;
      if(parent){
         parent.removeChild(child)
      }
   },
   createElement : (tag:any) => document.createElement(tag),
   createText: (text:string) => document.createTextNode(text),
   setElementText: (el:Element, text:string) => el.textContent = text,
   setText: (node:any, text:string) => node.innerText = text,
   parentNode: (node:Element) => node.parentNode,
   nextSilbing: (node:Element) => node.nextSibling,
   querySelector: (selector:any) => document.querySelector(selector)
}