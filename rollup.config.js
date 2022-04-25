// rollup的配置
import path from 'path';
import plugin_json from '@rollup/plugin-json'
import {nodeResolve} from '@rollup/plugin-node-resolve'
import plugin_ts from 'rollup-plugin-typescript2'
import plugin_commonjs from '@rollup/plugin-commonjs'

// 环境变量中如果没有TARGET抛出错误
if (!process.env.TARGET) {
   throw new Error("TARGET package must be specified via --environment flag.");
}


// 根据环境变量的target属性，获取对应模块中的package.json
const packagesDir = path.resolve(__dirname, "packages");
const packageDir = path.resolve(packagesDir, process.env.TARGET) // 找到要打包的某个包

const resolve = (p) => {   // 辅助获取各个包内的某种文件
   return path.resolve(packageDir, p)
}

const pkg = require(resolve('package.json')) // 获取包内的package.json
const name = path.basename(packageDir) // 取文件名

// 对打包类型 先做一个映射表，根据你提供的formats来格式化打包内容
const outPutConfig = {
   'esm-bundler': {
      file: resolve(`dist/${name}.esm-bunlder.js`),
      format: 'es'
   },
   'cjs': {
      file: resolve(`dist/${name}.cjs.js`),
      format: 'cjs'
   },
   'global': {
      file: resolve(`dist/${name}.global.js`),
      format: 'iife' // 立即执行函数
   }
};


const options = pkg.buildOptions;   // 获取pkg中自定义的buildOptions

function createConfig(format, output) {
   output.name = options.name;   // 使用pkg中buildOptions的name为打包后的名字
   output.sourcemap = true;      // 生成sourcemap
   output.exports = 'named';

   // 生成rollup配置
   return {
      input: resolve(`src/index.ts`),
      output,
      plugins: [
         plugin_json(),
         plugin_ts({ // ts配置文件
            tsconfig: path.resolve(__dirname, 'tsconfig.json')
         }),
         plugin_commonjs(),
         nodeResolve()  // 解析第三方模块
      ]
   } 
}

// rollup 最终需要导出到配置
export default options.formats.map(format => createConfig(format, outPutConfig[format]))  // 根据获取的buildOptions.format自动打包相应类型
