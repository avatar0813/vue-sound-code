/**
 * Watcher 的作用是侦听
 * 根据存贮的`expr`字符串模板，关联响应式数据与绑定数据的节点
 * 
 * 每当创建一个Watcher实例，就会调用getOldVal()
 * 同时指定 Dep.target 为 当前 Watcher实例
 * 
 */
class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm
        this.expr = expr
        this.cb = cb
        this.oldVal = this.getOldVal()
    }

    getOldVal() {
        Dep.target = this
        let oldVal = compileUtil.getVal(this.expr, this.vm)
        Dep.target = null
        return oldVal
    }

    update() {
        const newVal = compileUtil.getVal(this.expr, this.vm)
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}

class Dep {
    constructor() {
        this.subs = []
    }

    //收集观察者
    addSub(watcher) {
        this.subs.push(watcher)
    }

    //通知观察者更新
    notify() {
        this.subs.forEach(watch => {
            console.log('观察者:', this.subs)
            watch.update()
        })
    }
}


class Observer {
    constructor(data) {
        this.observe(data)
    }

    observe(data) {
        if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => {
                this.defineReactive(data, key, data[key])
            })
        }
    }

    defineReactive(data, key, value) {
        this.observe(value)
        const dep = new Dep()
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get() {
                /**
                 * 订阅数据变化时，往dep中添加观察者
                 * 每当new一个watcher的时候 就赋值Dep.target
                 * 
                 * 由于是先设置响应式能力，会在Compile阶段在触发，
                 * 所以Compile阶段中每创建一个Watcher实例，也就是对应一个Dep.target，
                 * 不会出现绑定混乱的问题。
                 */
                Dep.target && dep.addSub(Dep.target)
                return value
            },
            set: (newVal) => {
                this.observe(newVal)
                if (newVal !== value) {
                    /**
                     * @audit 形参不会会浅拷贝吗， 这里赋值是干嘛的？不赋值确实会报错
                     * @audit-ok 这里会修改value的原因是，在defineProperty.get中也是返回的形参value，
                     * 触发notify之后会重新调用get，所以修改value，使得get返回的也是修改后的值
                     */
                    value = newVal
                    //通知dep变化
                    dep.notify()
                }
            }
        })
    }
}
