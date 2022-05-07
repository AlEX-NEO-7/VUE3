const queue: Array<unknown> = [];

const p = Promise.resolve();
let isFlushPending = false;

export function nextTick(fn) {
   return fn ? p.then(fn) : p;
}

export function queueJob(job) {
   if (!queue.includes(job)) {
      queue.push(job);
      queueFlush();
   }
}

function queueFlush() {
   // 如果同时触发了两个组件的更新的话
   // 这里就会触发两次 then （微任务逻辑）
   if(isFlushPending){
      return;
   }

   isFlushPending = true;
   nextTick(flushJobs);
}

function flushJobs() {
   isFlushPending = false;
   let job;
   while ((job = queue.shift())) {
      if(job) {
         job();
      }
   }
}