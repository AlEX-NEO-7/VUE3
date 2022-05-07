import '../packages/vue/dist/vue.global.js'
console.log(Vue);
export default {
   name: "HelloWorld",
   setup(props, context) {
      console.log("props --", props);
      console.log("context --", context);
   },
   render() {
      return h("div", {}, "Hello World!")
   }
}