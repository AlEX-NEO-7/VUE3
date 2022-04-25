import { hasChanged, isArray, isObject } from "@vue/shared";
import { track, trigger } from "./effect";
import { TrackOpTypes, TriggerOrTypes } from "./operators";
import { reactive } from "./reactive";

// 把普通属性改为响应式属性
export function ref(value: any) {
   return createRef(value, false);
}

// 与ref类似但是响应式是浅响应式
export function shallowRef(value: any) {
   return createRef(value, true);
}

// 创建RefImpl的实例
function createRef(rawValue: any, shallow: boolean) {
   if (isRef(rawValue)) {
      return rawValue
   }
   return new RefImpl(rawValue, shallow)
}

// 判断值是否为ref类型--即判断是否为RefImpl或ObjectRefImpl类的实例
export function isRef(r: any) {
   return !!(r && r.__v_isRef === true);
}

// 把对象中的某个key变成响应式
export function toRef(object: Object|Array<any>, key: any, defaultValue?: any) {
   const val = object[key];
   return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue);
}

// 把一个对象中的所有的key转换成响应式
export function toRefs(object: Object|Array<any>) {
   if (!isProxy(object)) {    //(process.env.NODE_ENV !== 'production') &&
      console.warn(`toRefs() expects a reactive object but received a plain one.`);
   }
   const ret = isArray(object) ? new Array(object.length) : {};
   for (const key in object) {
      ret[key] = toRef(object, key);
   }
   return ret;
}

// 拿到原始数据
export function toRaw(observed: any) {
   const raw = observed && observed["__v_raw" /* RAW */];
   return raw ? toRaw(raw) : observed;
}

// 如果不为shallow且value为对象则使用reactive方法响应式整个value
const toReactive = (value: any) => isObject(value) ? reactive(value) : value;

// 判断它是否已经被ref或reactive包装过
function isProxy(value: Object|Array<any>) {
   return isReactive(value) || isReadonly(value);
}
function isReactive(value: Object|Array<any>) {
   if (isReadonly(value)) {
      return isReactive(value["__v_raw" /* RAW */]);
   }
   return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isReadonly(value: Object|Array<any>) {
   return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}


class RefImpl {
   _value: any;
   __v_isShallow: boolean;    // 是否为浅响应
   dep: any;                  // 对应的effect
   __v_isRef: boolean;        // 产生的实例会被添加该属性，表示是一个ref类型的数据
   __v_raw: any;              // 对应原本的value

   constructor(value: any, shallow: boolean) {
      this._value = shallow ? value : toReactive(value);
      this.__v_isShallow = shallow;
      this.dep = undefined;
      this.__v_isRef = true;
      this.__v_raw = shallow ? value : toRaw(value);
   }

   // 类属性访问器
   get value() {
      track(this, "value", TrackOpTypes.GET)
      return this._value;
   }
   set value(newVal) {
      // newVal = this.__v_isShallow ? newVal : toRaw(newVal);
      if (hasChanged(newVal, this.__v_raw)) {
         this.__v_raw = newVal;
         this._value = this.__v_isShallow ? newVal : toReactive(newVal);
         trigger(this, "value", TriggerOrTypes.SET, newVal);
      }
   }
}

class ObjectRefImpl {
   _object: Object|Array<any>
   _key: any
   _defaultValue: any
   __v_isRef: boolean

   constructor(_object: Object|Array<any>, _key: any, _defaultValue: any) {
      this._object = _object;
      this._key = _key;
      this._defaultValue = _defaultValue;
      this.__v_isRef = true;
   }

   get value() {
      const val = this._object[this._key];
      return val === undefined ? this._defaultValue : val;
   }

   set value(newVal) {
      this._object[this._key] = newVal;
   }
}