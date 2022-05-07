/**
 * @private
 * 合并对象
 */
const extend = Object.assign;
/**
 * @private
 * 判断是否为对象
 */
const isObject = (value) => value instanceof Object;
/**
 * @private
 * 判断是否为数组
 */
const isArray = Array.isArray;
/**
 * @private
 * 判断是否为字符串
 */
const isString = (value) => typeof value === "string";
/**
 * @private
 * 判断是否为函数
 */
const isFunction = (value) => typeof value === "function";
/**
 * @private
 * 判断key值是否为数字类型
 */
const isIntegerKey = (key) => isString(key) &&
    key !== 'NaN' &&
    key[0] !== '-' &&
    '' + parseInt(key, 10) === key;
let own = Object.prototype.hasOwnProperty;
/**
 * @private
 * 判断key是否为target对象上的属性
 */
const hasOwn = (target, key) => own.call(target, key);
/**
 * @private
 * 判断两个value是否一致
 */
const hasChanged = (oldValue, value) => !Object.is(value, oldValue);
// component = 010 | 100 = 110
// component & FUN = 010  compoent & STAT = 100
// 与其他人 与算法 得出来的都为0  这种做法可以确定权限的关系

function createDep(effects) {
    const dep = new Set(effects);
    return dep;
}

let activeEffect; // 当前正在执行的effect
class ReactiveEffect {
    active = true; // 是否是激活状态 
    deps = []; // 让effect记录他依赖了哪些属性，同时记录当前属性依赖了哪个effect
    parent = undefined;
    fn;
    scheduler;
    constructor(fn, scheduler) {
        this.fn = fn;
        this.scheduler = scheduler;
    }
    run() {
        if (!this.active) { // 如果处于非激活状态，调用run方法会默认调用fn函数
            return this.fn();
        }
        let parent = activeEffect;
        while (parent) {
            if (parent === this) {
                return;
            }
            parent = parent.parent;
        }
        try {
            this.parent = activeEffect;
            activeEffect = this;
            return this.fn(); // 取值 new Proxy 会执行get方法（收集依赖）
        }
        finally {
            activeEffect = this.parent;
            this.parent = undefined;
        }
    }
    stop() {
        if (this.active) {
            cleanupEffect(this); // 移除dep上存储的effect依赖
        }
        this.active = false;
    }
}
// 清空依赖收集
function cleanupEffect(effect) {
    const { deps } = effect;
    if (deps.length) {
        for (let i = 0; i < deps.length; i++) {
            deps[i].delete(effect); // 让属性对应的effect移除掉
        }
        deps.length = 0;
    }
}
function effect(fn, options = {}) {
    if (fn.effect) {
        fn = fn.effect.fn;
    }
    // 把effect变成一个响应式的effect，可以做到数据变化后重新执行
    const _effect = new ReactiveEffect(fn);
    if (options) {
        extend(_effect, options);
    }
    if (!options || !options.lazy) { // 如果不为lazy默认执行一次
        _effect.run();
    }
    const runner = _effect.run.bind(_effect);
    runner.effect = _effect; // 给runner添加effect实现 就是effect实例
    return runner;
}
// 让某个对象中的属性收集它对应的effect函数
const targetMap = new Map(); // 把收集了依赖的对象放入map
function track(target, key, type) {
    if (!activeEffect) {
        return;
    }
    let depsMap = targetMap.get(target);
    if (!depsMap) { // 查看是否把当前这个对象放入依赖weakmap，没有则创建一个map放入作为值
        targetMap.set(target, (depsMap = new Map()));
    }
    let dep = depsMap.get(key);
    if (!dep) { // 查看寻找的这个对象里面是否把当前的key放入map，没有则创建一个set放入作为值
        depsMap.set(key, (dep = new Set()));
    }
    trackEffects(dep);
}
// 查看set是否有放入了effect，没有则把当前的effect放入set
function trackEffects(dep) {
    if (!dep.has(activeEffect)) {
        dep.add(activeEffect);
        activeEffect.deps.push(dep);
    }
}
// 触发执行依赖，添加元素时，也自动添加effect，并收集依赖
function trigger(target, key, type, newVal, oldVal) {
    // 如果target没有被收集依赖则忽略
    const depsMap = targetMap.get(target);
    if (!depsMap) {
        return;
    }
    // 将所有要执行的effect全部放到一个集合中，最终一起执行
    const deps = [];
    if (key === "length" && isArray(target)) { // 判断为数组，且更新的是长度
        // 如果对应的长度（key）有依赖收集则需要更新
        depsMap.forEach((dep, _key) => {
            if (key === "length" || _key >= newVal) { // _key为收集的索引，dep为被收集的索引所有effect的Set集合
                deps.push(dep);
            }
        });
        switch (type) { // 数组修改超出边界
            case 0 /* ADD */:
                if (isArray(target) && isIntegerKey(key)) {
                    // 修改数组中的某个索引(边界之外的，没有赋值所以前面判断为新增)
                    deps.push(depsMap.get("length")); // 触发长度依赖更新
                }
        }
    }
    else {
        // 对象
        if (key !== undefined) {
            deps.push(depsMap.get(key)); // 拿到具体的dep合集并匹配进新合集
        }
    }
    const effects = [];
    // dep是Set数据类型，里面包含 activeEffect
    for (const dep of deps) {
        if (dep) {
            effects.push(...dep);
        }
    }
    triggerEffects(createDep(effects));
}
// 执行所有effect
function triggerEffects(dep) {
    for (const effect of dep) {
        if (effect !== activeEffect) { // 如果当前执行的effect和要执行的effect是同一个就不执行，防止循环
            if (effect.scheduler) {
                effect.scheduler();
            }
            else {
                effect.run();
            }
        }
    }
}

// 实现handler
// Getter
const get = createGetter(false, false);
const shallowGet = createGetter(false, true);
const readonlyGet = createGetter(true, false);
const shallowReadonlyGet = createGetter(true, true);
// Setter
const set = createSetter();
const shallowSet = createSetter();
let readonlyObject = {
    set: function (target, key, receiver) {
        console.warn(`${key} is a read-only attribute and cannot be modified`);
        return true;
    }
};
function createGetter(isReadOnly = false, shallow = false) {
    return function get(target, key, reciver) {
        // proxy + reflect
        // Reflect方法具备返回值
        const res = Reflect.get(target, key, reciver);
        if (key === "__v_isReactive" || key === "__v_isReadonly") {
            return res;
        }
        if (!isReadOnly) {
            // 收集依赖，等数据变化后更新视图
            track(target, key);
        }
        if (shallow) { // 浅层响应式直接返回对象
            return res;
        }
        if (isObject(res)) { // 如果是对象继续递归，Vue2一上来就递归; Vue3是当取值时会进行代理，Vue3的代理模式是懒代理
            return isReadOnly ? readonly(res) : reactive(res);
        }
        return res;
    };
}
function createSetter(shallow) {
    return function set(target, key, value, reciver) {
        // 当数据更新时，通知所有对应的属性的effect重新执行
        // 区分新增还是修改执行的set
        let oldVal = target[key];
        if (key === "__v_isReactive" || key === "__v_isReadonly") { // 不允许修改内置属性
            console.warn(`The ${key} attribute is a built-in attribute and cannot be changed.`);
            return oldVal;
        }
        const res = Reflect.set(target, key, value, reciver); // 用Reflect比直接target[key] = value 的做法更好
        let hasKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key);
        if (!hasKey) {
            // 新增
            trigger(target, key, 0 /* ADD */, value);
        }
        else if (hasChanged(oldVal, value)) {
            //修改, 并且保证修改的值与之前的不一样
            trigger(target, key, 1 /* SET */, value);
        }
        return res;
    };
}
const mutableHandlers = {
    get,
    set
};
const shallowReactiveHandlers = {
    get: shallowGet,
    set: shallowSet
};
const readonlyHandlers = extend({
    get: readonlyGet,
}, readonlyObject);
const shallowReadonlyHandlers = extend({
    get: shallowReadonlyGet,
}, readonlyObject);

// 各个方法区别 : 1. 是不是仅读     2. 是不是深度
function reactive(target) {
    target["__v_isReactive"] = true;
    target["__v_isReadonly"] = false;
    return createReactiveObject(target, false, mutableHandlers);
}
function shallowReactive(target) {
    target["__v_isReactive"] = true;
    target["__v_isReadonly"] = false;
    return createReactiveObject(target, false, shallowReactiveHandlers);
}
function readonly(target) {
    target["__v_isReactive"] = false;
    target["__v_isReadonly"] = true;
    return createReactiveObject(target, true, readonlyHandlers);
}
function shallowReadonly(target) {
    target["__v_isReactive"] = false;
    target["__v_isReadonly"] = true;
    return createReactiveObject(target, false, shallowReadonlyHandlers);
}
// 拦截数据的读取和数据的修改
const reactiveMap = new WeakMap(); // 弱引用，会自动进行垃圾回收不会造成内存泄漏，key是对象
const readonlyMap = new WeakMap();
function createReactiveObject(target, isReadOnly, handlers) {
    // reactive API 只拦截对象属性
    if (!isObject(target)) {
        return target;
    }
    // 如果对象已经被代理了直接拿到代理对象，如果没有被代理，也要判断是不是被深度或仅读代理 又要仅读或深度代理
    const proxyMap = isReadOnly ? readonlyMap : reactiveMap;
    const existProxy = proxyMap.get(target);
    if (existProxy) {
        return existProxy;
    }
    const proxy = new Proxy(target, handlers);
    proxyMap.set(target, proxy); //  将将要代理的对象和对应的代理对象存起来
    return proxy;
}

// 把普通属性改为响应式属性
function ref(value) {
    return createRef(value, false);
}
// 与ref类似但是响应式是浅响应式
function shallowRef(value) {
    return createRef(value, true);
}
// 创建RefImpl的实例
function createRef(rawValue, shallow) {
    if (isRef(rawValue)) {
        return rawValue;
    }
    return new RefImpl(rawValue, shallow);
}
// 判断值是否为ref类型--即判断是否为RefImpl或ObjectRefImpl类的实例
function isRef(r) {
    return !!(r && r.__v_isRef === true);
}
// 把对象中的某个key变成响应式
function toRef(object, key, defaultValue) {
    const val = object[key];
    return isRef(val) ? val : new ObjectRefImpl(object, key, defaultValue);
}
// 把一个对象中的所有的key转换成响应式
function toRefs(object) {
    if (!isProxy(object)) { //(process.env.NODE_ENV !== 'production') &&
        console.warn(`toRefs() expects a reactive object but received a plain one.`);
    }
    const ret = isArray(object) ? new Array(object.length) : {};
    for (const key in object) {
        ret[key] = toRef(object, key);
    }
    return ret;
}
// 拿到原始数据
function toRaw(observed) {
    const raw = observed && observed["__v_raw" /* RAW */];
    return raw ? toRaw(raw) : observed;
}
// 如果不为shallow且value为对象则使用reactive方法响应式整个value
const toReactive = (value) => isObject(value) ? reactive(value) : value;
// 判断它是否已经被ref或reactive包装过
function isProxy(value) {
    return isReactive(value) || isReadonly(value);
}
function isReactive(value) {
    if (isReadonly(value)) {
        return isReactive(value["__v_raw" /* RAW */]);
    }
    return !!(value && value["__v_isReactive" /* IS_REACTIVE */]);
}
function isReadonly(value) {
    return !!(value && value["__v_isReadonly" /* IS_READONLY */]);
}
class RefImpl {
    _value;
    __v_isShallow; // 是否为浅响应
    dep; // 对应的effect
    __v_isRef; // 产生的实例会被添加该属性，表示是一个ref类型的数据
    __v_raw; // 对应原本的value
    constructor(value, shallow) {
        this._value = shallow ? value : toReactive(value);
        this.__v_isShallow = shallow;
        this.dep = undefined;
        this.__v_isRef = true;
        this.__v_raw = shallow ? value : toRaw(value);
    }
    // 类属性访问器
    get value() {
        track(this, "value");
        return this._value;
    }
    set value(newVal) {
        // newVal = this.__v_isShallow ? newVal : toRaw(newVal);
        if (hasChanged(newVal, this.__v_raw)) {
            this.__v_raw = newVal;
            this._value = this.__v_isShallow ? newVal : toReactive(newVal);
            trigger(this, "value", 1 /* SET */, newVal);
        }
    }
}
class ObjectRefImpl {
    _object;
    _key;
    _defaultValue;
    __v_isRef;
    constructor(_object, _key, _defaultValue) {
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

class ComputedRefImpl {
    _setter;
    _dirty; // 脏数据标记
    dep = undefined; // 存储dep
    effect; // 计算属性包装的effect
    __v_isRef; // ref标记
    _value; // 存储value值
    constructor(getter, _setter, isReadonly) {
        this._setter = _setter;
        this._dirty = true;
        this.__v_isRef = true;
        this.effect = new ReactiveEffect(getter, () => {
            if (!this._dirty) {
                this._dirty = true;
                trigger(this, "value", 1 /* SET */);
            }
        });
        this["__v_isReadonly" /* IS_READONLY */] = isReadonly;
    }
    get value() {
        const self = toRaw(this);
        track(self, "value");
        if (self._dirty) {
            self._dirty = false;
            self._value = self.effect.run(); // 将结果缓存到effect中，这样就不需要每次都run
        }
        return self._value;
    }
    set value(newValue) {
        this._setter(newValue);
    }
}
function computed(getterOrOptions) {
    let getter;
    let setter;
    let onlyGetter = isFunction(getterOrOptions);
    if (isFunction(getterOrOptions)) {
        getter = getterOrOptions;
        setter = () => {
            console.warn("computed value is readonly");
        };
    }
    else {
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }
    return new ComputedRefImpl(getter, setter, onlyGetter || !setter);
}

export { ReactiveEffect, computed, effect, isRef, reactive, readonly, ref, shallowReactive, shallowReadonly, shallowRef, toRaw, toRefs };
//# sourceMappingURL=reactivity.esm-bunlder.js.map
