class Watcher {
    constructor(vm, expr, cb) {
        this.vm = vm;
        this.expr = expr;
        this.cb = cb;
        this.oldVal = this.getOldVal();
    }

    getOldVal() {
        Dep.target = this;
        let oldVal = compileUtil.getVal(this.expr, this.vm);
        Dep.target = null;
        return oldVal;
    }

    update() {
        const newVal = compileUtil.getVal(this.expr, this.vm);
        if (newVal !== this.oldVal) {
            this.cb(newVal)
        }
    }
}

class Dep {
    constructor() {
        this.subs = [];
    }

    //收集观察者
    addSub(watcher) {
        this.subs.push(watcher);

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
        this.observe(value);
        const dep = new Dep();
        Object.defineProperty(data, key, {
            enumerable: true,
            configurable: true,
            get() {
                //订阅数据变化时，往dep中添加观察者
                Dep.target && dep.addSub(Dep.target);
                return value;
            },
            set: (newVal) => {
                this.observe(newVal);
                if (newVal !== value) {
                    value = newVal;
                    //通知dep变化
                    dep.notify();
                }
            }
        });
    }
}