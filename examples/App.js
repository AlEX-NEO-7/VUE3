import {ref} from '../packages/vue/dist/vue.global.js'

console.log(ref);

// import Child from './HelloWorld.js'

export default {
   name: "App",
   setup() {},
   render() {
      return h("div", {}, [
         h("div", {}, "你好"),
         h(Child, {
            msg: "Hello World!"
         })
      ])
   }
}