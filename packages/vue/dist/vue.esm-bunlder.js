const nodeOps = {
    insert: (child, parent, anchor) => {
        parent.insertBefore(child, anchor); // parent.appendChild(child)
    },
    remove: (child) => {
        const parent = child.parentNode;
        if (parent) {
            parent.removeChild(child);
        }
    },
    createElement: (tag) => document.createElement(tag),
    createText: (text) => document.createTextNode(text),
    setElementText: (el, text) => el.textContent = text,
    setText: (node, text) => node.innerText = text,
    parentNode: (node) => node.parentNode,
    nextSilbing: (node) => node.nextSibling,
    querySelector: (selector) => document.querySelector(selector)
};

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
const camelizeRE = /-(\w)/g;
/**
 * @private
 * 把烤肉串命名方式转换成驼峰命名方式
 */
const camelize = (value) => {
    return value.replace(camelizeRE, (_, c) => c ? c.toUpperCase() : "");
};
/**
 * @private
 * 首字母大写
 */
const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);
/**
 * @private
 * 添加 on 前缀，并且首字母大写
 */
const toHandlerKey = (value) => value ? `on${capitalize(value)}` : ``;
// component = 010 | 100 = 110
// component & FUN = 010  compoent & STAT = 100
// 与其他人 与算法 得出来的都为0  这种做法可以确定权限的关系

// 需要对比属性 diff算法 属性比对前后值
function patchClass(el, value) {
    if (value === null) {
        el.removeAttribute('class');
    }
    else {
        el.className = value;
    }
}
function patchStyle(el, prev, next) {
    const style = el.style; // 获取样式表
    const isCssString = isString(next); // 判断传入的是否为string
    if (next && !isCssString) { // 不是则循环修改
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
    }
    else {
        if (isCssString) { // 是string则直接赋值
            if (prev !== next) {
                style.cssText = next;
            }
            else if (prev) {
                el.removeAttribute('style');
            }
        }
    }
}
function createInvoker(value) {
    const invoker = (e) => {
        invoker.value(e);
    };
    invoker.value = value; // 后续换绑可以直接更新value值
    return invoker;
}
function patchEvent(el, key, nextValue) {
    // vue event invoker 类似事件池 缓存绑定的事件
    const invokers = el._vei || (el._vel = {}); // 在元素上绑定一个自定义属性 用来记录绑定的事件
    const existingInvoker = invokers[key];
    if (existingInvoker && nextValue) { // 换绑
        existingInvoker.value = nextValue;
    }
    else {
        const eventName = key.slice(2).toLowerCase(); // 如果放在if else外面触发不了effect
        if (nextValue) { // 新增
            const invoker = invokers[key] = createInvoker(nextValue);
            el.addEventListener(eventName, invoker);
        }
        else if (existingInvoker) { // 删除
            el.removeEventListener(eventName, existingInvoker);
            invokers[key] = undefined;
        }
    }
}
function patchAttr(el, key, value) {
    if (value == null) {
        el.removeAttribute(key);
    }
    else {
        el.setAttribute(key, value);
    }
}
const patchDOMProp = (el, key, prevValue, nextValue) => {
    if (key === 'class') {
        patchClass(el, nextValue);
    }
    else if (key === 'style') {
        patchStyle(el, prevValue, nextValue);
    }
    else if (/^on[^a-z]/.test(key)) { // onClick...
        patchEvent(el, key, nextValue);
    }
    else { // 其他属性 setAttribute （data-type...）
        patchAttr(el, key, nextValue);
    }
};

const createVNode = (type, props, children) => {
    // 虚拟节点就是用一个对象来描述信息的
    const shapeFlag = isObject(type) ? 6 /* COMPONENT */ : isString(type) ? 1 /* ELEMENT */ : 0;
    const vnode = {
        __v_isVNode: true,
        type,
        shapeFlag,
        props,
        children,
        key: props && props.key,
        component: null,
        el: null, // 虚拟节点对应的真实节点
    };
    if (children) { // 把儿子节点的描述合并到shapleFlag
        vnode.shapeFlag |= isString(children) ? 8 /* TEXT_CHILDREN */ : 16 /* ARRAY_CHILDREN */;
    }
    // vnode 可以描述当前它是个怎样的节点 子节点是怎么样的
    return vnode;
};
function isVNode(vnode) {
    return !!vnode.__v_isVNode;
}
const Text = Symbol();
function normalizedVNode(vnode) {
    if (isObject(vnode)) {
        return vnode;
    }
    return createVNode(Text, null, String(vnode));
}
function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}

function h(type, propsOrChildren, children) {
    let len = arguments.length;
    if (len === 2) {
        if (isObject(propsOrChildren) && !isArray(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                return createVNode(type, null, [propsOrChildren]); // h('div', h('span'))
            }
            return createVNode(type, propsOrChildren); // h('div', {color:red})
        }
        else {
            return createVNode(type, null, propsOrChildren); // h('div', 'Hello')  h('div', ['Hello','Hello'])
        }
    }
    else {
        if (len > 3) { // 对不是标准传参形式的参数进行处理
            Array.prototype.slice.call(arguments, 2);
        }
        else if (len === 3 && isVNode(children)) {
            children = [children];
        }
        return createVNode(type, propsOrChildren, children);
    }
}

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

// 生成组件实例
function createComponentInstance(vnode) {
    const type = vnode.type;
    const instance = {
        type,
        vnode,
        next: null,
        subTree: null,
        ctx: {},
        props: {},
        attrs: {},
        slots: {},
        setupState: {},
        propsOptions: type.props,
        proxy: null,
        render: null,
        emit: null,
        expose: {},
        isMounted: false,
        parent,
        provides: parent ? parent.provides : {}, //  获取 parent 的 provides 作为当前组件的初始化值 这样就可以继承 parent.provides 的属性了
    };
    // 在prod环境下ctx是以下的简单环境，如果是 dev 会更复杂需要处理
    instance.ctx = { _: instance };
    // 赋值emit
    // 使用bind 把 instance 进行绑定
    // 用户使用时移交 event 和参数即可
    instance.emit = emit.bind(null, instance);
    return instance;
}
// 给组件实例进行赋值
function setupComponent(instance) {
    const { props, children } = instance.vnode;
    // 组件的props初始化 attrs初始化
    initProps(instance, props);
    // 插槽的初始化
    initSlots(instance, children);
    // 启动状态，目的是调用setup函数拿到返回值
    setupStatefulComponent(instance);
}
// 初始化props和attrs
function initProps(instance, rawProps) {
    const props = {};
    const attrs = {};
    const options = Object.keys(instance.propsOptions);
    if (rawProps) {
        for (const [key, value] of Object.entries(rawProps)) {
            if (options.includes(key)) {
                props[key] = value;
            }
            else {
                attrs[key] = value;
            }
        }
    }
    instance.props = reactive(props);
    instance.attrs = attrs; // 非响应式
}
// 初始化emit
const emit = (instance, event, ...rawArgs) => {
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
};
// 初始化slots
const initSlots = (instance, children) => {
    const { vnode } = instance;
    if (vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
        normalizeObjectSlots(children, (instance.slots = {}));
    }
};
// 把 function 返回的值转换成array
const normalizeSlotValue = (value) => isArray(value) ? value : [value];
// 特殊对象正常化
const normalizeObjectSlots = (rawSlots, slots) => {
    for (const key in rawSlots) {
        const value = rawSlots[key];
        if (isFunction(value)) {
            // 把这个函数给到slots 对象上存起来
            // 后续在 renderSlots 中调用
            // TODO 这里没有对 value 做 normalize，
            // 默认 slots 返回的就是一个 vnode 对象
            slots[key] = (props) => normalizeSlotValue(value(props));
        }
    }
};
// 创建一个setup的上下文
const createSetupContext = (instance) => {
    return {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: instance.emit,
        expose: (exposed) => instance.expose = exposed || {}
    };
};
// 代理对象的handler
const PublicInstanceProxyHandles = {
    get({ _: instance }, key) {
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) { // 先查看setup返回值没有再去查看props
            return setupState[key];
        }
        else if (hasOwn(props, key)) {
            return props[key];
        }
        else ;
    },
    set({ _: instance }, key, value) {
        // 不允许对props进行修改
        const { setupState, props } = instance;
        if (hasOwn(setupState, key)) {
            setupState[key] = value;
        }
        else if (hasOwn(props, key)) {
            console.warn("Props are readonly");
            return false;
        }
        else ;
        return true;
    }
};
// 启动setup
const setupStatefulComponent = (instance) => {
    // 核心是调用组件的setup方法
    const compoent = instance.type;
    const { setup } = compoent;
    instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandles); // 代理上下文处理函数
    if (setup) {
        // 设置当前 currentInstance 的值， 在调用setup之前
        setCurrentInstance(instance);
        const setupContext = createSetupContext(instance);
        let setupResult = setup(instance.props, setupContext); // 获取setup返回的值
        setCurrentInstance(null);
        // 处理setup的返回结果
        if (isFunction(setupResult)) {
            instance.render = setupResult;
        }
        else if (isObject(setupResult)) {
            instance.setupState = setupResult;
        }
    }
    if (!instance.render) {
        // 如果没写render写了template，则需要模板编译 template -> render
        instance.render = compoent.render; // 没有写render函数，则使用组件的render
    }
};
let currentInstance = {};
// 这个接口暴露给用户，用户可以在 setup 中获取组件实例 instance
function getCurrentInstance() {
    return currentInstance;
}
function setCurrentInstance(instance) {
    currentInstance = instance;
}

function provide(key, value) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        let { provides } = currentInstance;
        const parentProvides = currentInstance.parent?.provides;
        // 这里要解决一个问题
        // 当父级 key 和 爷爷级别的 key 重复的时候，对于子组件来讲，需要取最近的父级别组件的值
        // 那这里的解决方案就是利用原型链来解决
        // provides 初始化的时候是在 createComponent 时处理的，当时是直接把 parent.provides 赋值给组件的 provides 的
        // 所以，如果说这里发现 provides 和 parentProvides 相等的话，那么就说明是第一次做 provide(对于当前组件来讲)
        // 我们就可以把 parent.provides 作为 currentInstance.provides 的原型重新赋值
        // 至于为什么不在 createComponent 的时候做这个处理，可能的好处是在这里初始化的话，是有个懒执行的效果（优化点，只有需要的时候在初始化）
        if (parentProvides === provides) {
            provides = currentInstance.provides = Object.create(parentProvides);
        }
        provides[key] = value;
    }
}
function inject(key, defaultValue) {
    const currentInstance = getCurrentInstance();
    if (currentInstance) {
        const provides = currentInstance.parent?.provides;
        if (key in provides) {
            return provides[key];
        }
        else if (defaultValue) {
            if (typeof defaultValue === "function") {
                return defaultValue();
            }
            return defaultValue;
        }
    }
}

const createAppAPI = (render) => {
    return (rootCompont, rootProps) => {
        const app = {
            mount(container) {
                // 1. 创造虚拟节点
                let vnode = createVNode(rootCompont, rootProps); // h函数
                // 2. 挂载的核心就是根据传入的组件对象，创造虚拟节点，再把虚拟节点渲染到组件中
                render(vnode, container);
            },
            unmount() { },
            use(plugin, ...options) {
            }
        };
        return app;
    };
};

function shouldUpdateComponent(prevVNode, nextVNode) {
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
function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }
    for (let i = 0; i < nextKeys.length; i++) {
        const key = nextKeys[i];
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }
    return false;
}

const queue = [];
const p = Promise.resolve();
let isFlushPending = false;
function nextTick(fn) {
    return fn ? p.then(fn) : p;
}
function queueJob(job) {
    if (!queue.includes(job)) {
        queue.push(job);
        queueFlush();
    }
}
function queueFlush() {
    // 如果同时触发了两个组件的更新的话
    // 这里就会触发两次 then （微任务逻辑）
    if (isFlushPending) {
        return;
    }
    isFlushPending = true;
    nextTick(flushJobs);
}
function flushJobs() {
    isFlushPending = false;
    let job;
    while ((job = queue.shift())) {
        if (job) {
            job();
        }
    }
}

// 最长上升子序列
function getSequence(seq) {
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
                }
                else {
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
function createRenderer(renderOptions) {
    const { // renderOptions里面的方法
    insert: hostInsert, remove: hostRemove, patchDOMProp: hostPatchProp, createElement: hostCreateElement, createText: hostCreateText, setText: hostSetText, setElementText: HostSetElementText, parentNode: HostParentNode, nextSibling: HostNextSilbing, querySelector: HostQuerySelector } = renderOptions;
    // 将虚拟节点变成真实节点渲染到容器中
    const render = (vnode, container) => {
        if (vnode == null) {
            if (container._vnode) { // vnode为空 container有_vnode属性 此时为卸载组件
                unmount(container._vnode);
            }
        }
        else {
            // 包括初次渲染和更新 后续会更新patch 
            patch(container._vnode || null, vnode, container); // 后续更新 prevNode nextNode container
        }
        container._vnode = vnode; // 渲染过后把vnode与container绑定
    };
    // 组件初次渲染和更新
    const patch = (n1, n2, container, anchor) => {
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
                if (shapeFlag & 6 /* COMPONENT */) { // 判断渲染的是否为组件 
                    processComponent(n1, n2, container);
                }
                else if (shapeFlag & 1 /* ELEMENT */) { // 判断渲染的是否为元素
                    processElement(n1, n2, container, anchor);
                }
        }
    };
    // 处理组件
    const processComponent = (n1, n2, container) => {
        if (n1 == null) { // 后期可以考虑缓存组件的情况 COMPONENT_KEPT_ALIVE
            // 组件初始化挂载
            mountComponent(n2, container);
        }
        else {
            // 组件更新挂载
            updateComponent(n1, n2);
            console.log("更新");
        }
    };
    // 处理元素（一般是组件对应的返回值）
    const processElement = (n1, n2, container, anchor) => {
        if (n1 == null) {
            // 初始化
            mountElemnt(n2, container, anchor);
        }
        else {
            // diff
            patchElement(n1, n2);
        }
    };
    // 处理文本
    const processText = (n1, n2, container) => {
        if (n1 == null) {
            // 初始化
            let textNode = hostCreateText(n2.children);
            n2.el = textNode;
            hostInsert(textNode, container);
        }
    };
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
        }
        else {
            n2.component = n1.component;
            n2.el = n1.el;
            instance.vnode = n2;
        }
    };
    // 对比元素
    const patchElement = (n1, n2) => {
        let el = n2.el = n1.el; // 比较元素一致则复用
        const oldProps = n1.props || {}; // 比较属性
        const newProps = n2.props || {};
        patchProps(oldProps, newProps, el);
        // 比较children，diff核心   diff算法是同级比较
        patchChildren(n1, n2, el);
    };
    // 对比元素中的属性
    const patchProps = (oldProps, newProps, el) => {
        if (oldProps === newProps)
            return;
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
    };
    // 对比子节点
    const patchChildren = (n1, n2, el) => {
        const c1 = n1 && n1.children;
        const prevShapeFlag = n1.shapeFlag;
        const c2 = n2 && n2.children;
        const shapeFlag = n2.shapeFlag;
        // c1 和 c2 有哪些类型  (n1为空的情况在processElement阶段已经处理了)
        // 1. 之前是数组现在是文本   2. 之前是数组，现在也是数组   3. 之前是文本，现在是数组  
        // 4. 之前是文本现在是空    5. 之前是文本现在是文本     6. 之前是文本现在是空
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) { // 之前是数组
                unmountChildren(c1); // 1（把情况1变成情况4）
            }
            if (c1 != c2) { // 4 5
                HostSetElementText(el, c2);
            }
        }
        else { // 现在是数组或空
            if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
                if (shapeFlag & 16 /* ARRAY_CHILDREN */) { // 2
                    // 对比两个数组的差异
                    patchKeyedChildren(c1, c2, el);
                }
                else { // 之前是数组 现在是空文本
                    unmountChildren(c1);
                }
            }
            else { // 之前是文本  3 6 
                if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
                    HostSetElementText(el, '');
                }
                if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
                    mountChildren(c2, el);
                }
            }
        }
    };
    // 对比两个同为数组的子节点
    const patchKeyedChildren = (c1, c2, container) => {
        let i = 0; // 从头结点开始
        const l2 = c2.length;
        let e1 = c1.length - 1;
        let e2 = l2 - 1;
        // 1. sync from start 从头开始一个个孩子来比较，遇到不同的节点就停止
        while (i <= e1 && i <= e2) { // 如果i和新的列表或者老的列表指针重合，说明比较完毕了
            const n1 = c1[i];
            const n2 = c2[i];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container);
            }
            else {
                break;
            }
            i++;
        }
        // 2. sync from end 从末尾开始一个个子节点比较，遇到不同的节点就停止
        while (i <= e1 && i <= e2) { // 如果i和新的列表或者老的列表指针重合，说明比较完毕了
            const n1 = c1[e1];
            const n2 = c2[e2];
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container);
            }
            else {
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
        else { // 先找出复用序列再进行新增
            const s1 = i; // s1 -> e1 老的子节点列表
            const s2 = i; // s2 -> e2 新的子节点列表
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
                }
                else {
                    newIndexToOldIndexMap[newIndex - s2] = i + 1; // 保证不为0
                    patch(prevChild, c2[newIndex], container); // 填表后还需比对
                }
            }
            let queue = getSequence(newIndexToOldIndexMap); // 最长递增子序列算法求出可优化的某段子节点索引
            let j = queue.length - 1; // 倒序插入
            for (i = toBePatched - 1; i >= 0; i--) { // 倒序插入 
                let lastIndex = s2 + i;
                let lastChild = c2[lastIndex];
                let anchor = lastIndex + 1 < c2.length ? c2[lastIndex + 1].el : null;
                if (newIndexToOldIndexMap[i] === 0) { // 等于0的时候没有真实节点，需要创建真实节点插入
                    patch(null, lastChild, container, anchor); // 创建一个h插入到f前面
                }
                else {
                    // 可以优化 有些节点可以不移动
                    if (i !== queue[j]) {
                        hostInsert(lastChild.el, container, anchor); // 将列表倒序插入
                    }
                    else {
                        j--; // 优化点  表示元素不需要移动
                    }
                }
            }
        }
    };
    // 组件挂载的过程
    const mountComponent = (initialVNode, container) => {
        // 根据组件的虚拟dom，创造真实的dom，渲染到容器
        // 1. 给组件创造一个实例
        const instance = initialVNode.component = createComponentInstance(initialVNode); // 给组件创造一个实例
        // 2. 需要给组件实例进行赋值操作
        setupComponent(instance); // 给组件实例进行赋值操作
        // 3. 调用render方法实现组件渲染逻辑， 如果依赖的数据发生变化，组件需要重新渲染
        // 数据和视图是双向绑定的 如果数据变化，视图更新
        // effect可以用在组件中，这样数据变化后可以自动重新执行effect函数
        setupRenderEffect(initialVNode, instance, container); // 渲染effect
    };
    // 元素挂载的过程
    const mountElemnt = (vnode, container, anchor) => {
        // 给元素创建一个实例
        // vnode中的children 可能是数组，对象数组，字符串数组，字符串
        let { type, shapeFlag, props, children } = vnode;
        let el = vnode.el = hostCreateElement(type);
        if (shapeFlag & 8 /* TEXT_CHILDREN */) {
            hostSetText(el, children);
        }
        else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
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
    };
    // 子元素挂载
    const mountChildren = (children, container) => {
        for (let i = 0; i < children.length; i++) {
            const child = (children[i] = normalizedVNode(children[i]));
            patch(null, child, container);
        }
    };
    // 创建渲染effect
    const setupRenderEffect = (initialVNode, instance, container) => {
        // 核心是调用render，数据变化，重新调用render
        const componentUpdateFn = () => {
            let { proxy } = instance;
            if (!instance.isMounted) {
                // 组件初始化流程
                // 调用render方法（渲染页面的时候会进行取值操作，那么取值的时候会进行依赖收集，收集对应的依赖属性）
                const subTree = instance.subTree = instance.render.call(proxy, proxy); // 渲染时调用h方法
                patch(null, subTree, container);
                initialVNode.el = subTree.el;
                instance.isMounted = true;
            }
            else {
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
        };
        const effect = new ReactiveEffect(componentUpdateFn, () => {
            queueJob(instance.update);
        });
        const update = effect.run.bind(effect);
        instance.update = update;
        update();
    };
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
    };
    // 卸载节点
    const unmount = (vnode) => {
        hostRemove(vnode.el); // 删除真实节点
    };
    return {
        createApp: createAppAPI(render),
        render
    };
}

/**
 * Compiler runtime helper for rendering `<slot/>`
 * 用来 render slot 的
 * 之前是把 slot 的数据都存在 instance.slots 内(可以看 componentSlot.ts)，
 * 这里就是取数据然后渲染出来的点
 * 这个是由 compiler 模块直接渲染出来的 -可以参看这个 demo https://vue-next-template-explorer.netlify.app/#%7B%22src%22%3A%22%3Cdiv%3E%5Cn%20%20%3Cslot%3E%3C%2Fslot%3E%5Cn%3C%2Fdiv%3E%22%2C%22ssr%22%3Afalse%2C%22options%22%3A%7B%22mode%22%3A%22module%22%2C%22prefixIdentifiers%22%3Afalse%2C%22optimizeImports%22%3Afalse%2C%22hoistStatic%22%3Afalse%2C%22cacheHandlers%22%3Afalse%2C%22scopeId%22%3Anull%2C%22inline%22%3Afalse%2C%22ssrCssVars%22%3A%22%7B%20color%20%7D%22%2C%22bindingMetadata%22%3A%7B%22TestComponent%22%3A%22setup-const%22%2C%22setupRef%22%3A%22setup-ref%22%2C%22setupConst%22%3A%22setup-const%22%2C%22setupLet%22%3A%22setup-let%22%2C%22setupMaybeRef%22%3A%22setup-maybe-ref%22%2C%22setupProp%22%3A%22props%22%2C%22vMySetupDir%22%3A%22setup-const%22%7D%2C%22optimizeBindings%22%3Afalse%7D%7D
 * 其最终目的就是在 render 函数中调用 renderSlot 取 instance.slots 内的数据
 * TODO 这里应该是一个返回一个 block ,但是暂时还没有支持 block ，所以这个暂时只需要返回一个 vnode 即可
 * 因为 block 的本质就是返回一个 vnode
 *
 * @private
 */
function renderSlot(slots, name, props = {}) {
    const slot = slots[name];
    console.log(`渲染插槽 slot -> ${name}`);
    if (slot) {
        const slotContent = slot(props);
        return createVNode(6 /* COMPONENT */, {}, slotContent);
    }
}

// 需要涵盖dom操作的api、属性操作的api，将这些api传入runtime-core中
const renderOptions = Object.assign(nodeOps, { patchDOMProp });
const createApp = (component, rootProps) => {
    // 创建渲染器
    const { createApp } = createRenderer(renderOptions); // 传入环境API
    let app = createApp(component, rootProps);
    let { mount } = app; // 获取core中的mount
    app.mount = function (container) {
        container = nodeOps.querySelector(container);
        container.innerHTML = '';
        mount(container);
    };
    return app;
};

export { ReactiveEffect, computed, createApp, createRenderer, effect, h, inject, isRef, provide, reactive, readonly, ref, renderSlot, shallowReactive, shallowReadonly, shallowRef, toRaw, toRefs };
//# sourceMappingURL=vue.esm-bunlder.js.map
