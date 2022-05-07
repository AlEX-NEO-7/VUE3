import { isFunction } from "@vue/shared";
import { ReactiveEffect, track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
import { toRaw } from "./ref";

type BasicType = number | string | boolean | undefined | null | Symbol;
interface IAccessorOptions{
   get: Function,
   set: Function
} 
type computedVar = Function | IAccessorOptions;

class ComputedRefImpl {
   _setter: Function;
   _dirty: boolean;  // 脏数据标记
   dep: any = undefined;   // 存储dep
   effect: ReactiveEffect; // 计算属性包装的effect
   __v_isRef: boolean;  // ref标记
   _value: BasicType;   // 存储value值
   constructor(getter: Function, _setter: Function, isReadonly: boolean) {
      this._setter = _setter;
      this._dirty = true;
      this.__v_isRef = true;

      this.effect = new ReactiveEffect(getter, () => {   // 计算属性的依赖值变化，不要重新执行计算属性的effect，而是把数据标记为脏数据
         if (!this._dirty) {
            this._dirty = true;
            trigger(this, "value", TriggerOrTypes.SET);
         }
      });
      this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
   }

   get value() {
      const self = toRaw(this);
      track(self, "value", TrackOpTypes.GET);
      if (self._dirty) {
         self._dirty = false;
         self._value = self.effect.run(); // 将结果缓存到effect中，这样就不需要每次都run
      }
      return self._value;
   }

   set value(newValue: BasicType) {
      this._setter(newValue);
   }
}

export function computed(getterOrOptions: computedVar) {
   let getter: Function;
   let setter: Function;
   let onlyGetter = isFunction(getterOrOptions);

   if (isFunction(getterOrOptions)) {
      getter = getterOrOptions;
      setter = () => {
         console.warn("computed value is readonly")
      }
   } else {
      getter = getterOrOptions.get;
      setter = getterOrOptions.set;
   }

   return new ComputedRefImpl(getter, setter, onlyGetter || !setter);
}

