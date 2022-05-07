export function shouldUpdateComponent(prevVNode, nextVNode): boolean {
   const { props: prevProps } = prevVNode;
   const { props: nextProps } = nextVNode;

   // 如果props发生改变那么component就需要更新
   if (prevProps === nextProps) {
      return false;
   }

   // 之前props为空，基于nextProps判断是否更新
   if (!prevProps) {
      return !!nextProps;
   }

   // 之前有 现在没有
   if (!nextProps) {
      return true;
   }

   // hasPropsChanged 会进行更加细致的对比
   return hasPropsChanged(prevProps, nextProps);
}

function hasPropsChanged(prevProps, nextProps): boolean {
   const nextKeys = Object.keys(nextProps);
   if (nextKeys.length !== Object.keys(prevProps).length) {
      return true;
   }

   for (let i = 0; i < nextKeys.length; i++) {
      const key = nextKeys[i];
      if(nextProps[key] !== prevProps[key]){
         return true;
      }
   }

   return false;
}