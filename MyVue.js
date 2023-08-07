class MyVue {
    constructor(options) {
        this.$el = options.el;
        this.$data = options.data;
        this.$options = options;
        if (this.$el) {
            new Observer(this.$data);
            new Compile(this.$el, this);
            this.proxyData(this.$data);
        }
    }
    proxyData(data) {
        for (const key in data) {
            Object.defineProperty(this, key, {
                get() {
                    return data[key]
                },
                set(newVal) {
                    data[key] = newVal
                }
            })
        }
    }
}

class Compile {
    constructor(el, vm) {
        this.el = this.isElementNode(el) ? el : document.querySelector(el);
        this.vm = vm;
        //1.获取文档碎片对象，放入内存中减少页面的回流和重绘
        const flagment = this.node2Flagment(this.el);
        //2.编译模板
        this.compile(flagment);

        //3.追加子元素到根元素
        this.el.appendChild(flagment)
    }
 
    compile(flagment) {
        //获取到每一个子节点
        const childNodes = flagment.childNodes;
        [...childNodes].forEach(child => {
            if (this.isElementNode(child)) {
                //编译元素节点
                this.compileElement(child)
            } else {
                //文本节点
                this.compileText(child)
            }

            if (child.childNodes && child.childNodes.length) {
                this.compile(child)
            }
        })
    }


    node2Flagment(el) {
        //创建文档碎片
        let f = document.createDocumentFragment();
        let firstChild;
        while (firstChild = el.firstChild) {
            f.append(firstChild)
        }
        return f;
    }

    isElementNode(el) {
        return el.nodeType === 1;
    }

    compileElement(node) {
        const attributes = node.attributes;
        [...attributes].forEach(attr => {
            const {
                name,
                value
            } = attr;
            if (this.isDirective(name)) {
                const [, dirctive] = name.split('-');
                const [dirName, eventName] = dirctive.split(':');
                //更新数据 数据驱动视图
                compileUtil[dirName](node, value, this.vm, eventName);
                //删除有指令的标签上的指令
                node.removeAttribute('v-' + dirctive);
            } else if (this.isEventName(name)) { //@click
                let [, eventName] = name.split('@');
                compileUtil['on'](node, value, this.vm, eventName)
                //删除绑定的时间名
                node.removeAttribute('@' + eventName);
            }

        })
    }

    compileText(node) {
        // {{}} v-text
        const content = node.textContent;
        if ((/\{\{(.+?)\}\}/).test(content)) {
            compileUtil['text'](node, content, this.vm)
        }
    }

    isDirective(attrName) {
        return attrName.startsWith('v-');
    }

    isEventName(attrName) {
        return attrName.startsWith('@');
    }
}


const compileUtil = {
    //获取数据
    getVal(expr, vm) {
        return expr.split('.').reduce((data, cur) => {
            return data[cur]
        }, vm.$data)
    },
    setVal(expr, vm, inputVal) {
        expr.split('.').reduce((data, cur, index) => {
            if (index === expr.split('.').length - 1) {
                data[cur] = inputVal;
            }
            return data[cur]
        }, vm.$data)
    },
    text(node, expr, vm) {
        let value;
        if (expr.indexOf('{{') !== -1) {
            value = expr.replace(/\{\{(.+?)\}\}/g, (...args) => {
                new Watcher(vm, args[1], () => {
                    this.updater.textUpdate(node, this.getVal(args[1], vm));
                });
                return this.getVal(args[1], vm)
            })
        } else {
            new Watcher(vm, expr, () => {
                this.updater.textUpdate(node, this.getVal(expr, vm));
            });
            value = this.getVal(expr, vm);
        }
        this.updater.textUpdate(node, value);
    },
    html(node, expr, vm) {
        const value = this.getVal(expr, vm);
        new Watcher(vm, expr, (newVal) => {
            this.updater.htmlUpdate(node, newVal);
        });
        this.updater.htmlUpdate(node, value);
    },
    model(node, expr, vm) {
        const value = this.getVal(expr, vm);
        //数据=>视图
        new Watcher(vm, expr, (newVal) => {
            this.updater.modelUpdate(node, newVal);
        });
        //视图=>数据=>视图
        node.addEventListener('input', (e) => {
            this.setVal(expr, vm, e.target.value)
        })
        this.updater.modelUpdate(node, value);
    },
    bind(node, expr, vm, attrName) {
        const value = this.getVal(expr, vm);
        this.updater.attrUpdate(node, value, attrName);
    },
    on(node, expr, vm, eventName) {
        let fn = vm.$options.methods && vm.$options.methods[expr];
        node.addEventListener(eventName, fn.bind(vm), false);

    },
    //更新函数
    updater: {
        textUpdate(node, value) {
            node.textContent = value;
        },
        htmlUpdate(node, value) {
            node.innerHTML = value;
        },
        modelUpdate(node, value) {
            node.value = value
        },
        attrUpdate(node, value, attrName) {
            node.setAttribute(attrName, value)
        }
    }
}