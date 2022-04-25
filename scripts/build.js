// 把packages文件夹下所有的包打包



const fs = require('fs')
const execa = require('execa')   // 开启子进程进行打包， 最终使用 rollup进行

// 获取packages下的所有包
const targets = fs.readdirSync('packages').filter(f => {
   
   if(!fs.statSync(`packages/${f}`).isDirectory()){// 忽略文件
      return false
   }else {
      return true
   }
})

// 打包
async function build(target) { // 把target属性放入环境变量中
   await execa('rollup', ['-c','--environment',`TARGET:${target}`],{ // rollip -c --environment TARGET: reactivity
      stdio: 'inherit'
   })
}

function runParallel(targets, iteratorFn){
   // 获取所有的package
   const res =[]
   for (item of targets) {
      // 执行函数，但不用await，统一用Promise.all接受
      const p = iteratorFn(item)
      res.push(p)
   }
   return Promise.all(res)
}

runParallel(targets, build)