/*promise的特点
    * 1.创建时必须传入一个函数，否则会报错
    * 2.会给传入的函数设置两个回调函数
    * 3.新创建的Promise的对象状态是Pending，且成功或失败状态随着修改
    * 4.状态一旦发生改变就不可再变
    * 5.可以通过then来监听状态的改变
    *   1.如果添加监听时状态已经发生改变，立即执行监听的回调
    *   2.如果添加监听时状态还未发生改变，那么状态改变时候再执行监听回调
    *   3.同一个Promise对象可以添加多个then监听，状态改变时所有的监听按照添加顺序执行
    *
    * 6.then方法每次执行完都会返回一个新的Promise对象
    *   6.1 then方法返回的promise对象的状态和前一个promise的状态默认相同
    * 7.上一个promise对象的then可以给下一个promise的then传递数据
    *   7.1无论上一个是在成功的回调还是失败的回调传递的参数都会传递给下一个成功的回调
    *   7.2如果上一个传递的是一个promise对象，那么传给下一个的是成功还是失败由传递的promise状态传递
    * 8.后一个then可以捕获前一个then方法的异常
    * 9.catch方法是then方法的一个语法糖
    * */


//定义三个常量来存放promise的状态值
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";
class MyPromise{
    constructor(handle){
        //0.初始化默认状态
        this.status = PENDING;
        // 定义变量保存传给then方法的参数
        this.value = undefined;
        this.reason = undefined;
        // 定义变量保存监听的函数，同一个Promise对象可以添加多个then监听，状态改变时所有的监听按照添加顺序执行，所以将多个函数放在一个数组里
        this.onResolvedCallbacks = [];
        this.onRejectedCallbacks = [];
        //1.判断是否传入了一个函数，如果没有则抛出异常
        if(!this._isFunction(handle)){
            throw new Error("请传入一个函数")
        }
        //2.给传入的函数传递两个形参（形参为函数）
        //**用bind修改_resolve函数指向(只能用bind，因为使用call和apply会立即执行，而bind会返回一个函数)
        handle(this._resolve.bind(this), this._reject.bind(this))
    }
    catch(onRejected){
        return this.then(undefined, onRejected)
    }
    _resolve(value){
        //console.log(123);
        //为了防止重复修改
        if(this.status === PENDING){
            this.status = FULFILLED;
            this.value = value;

            //状态发生改变时，执行保存的函数（比如定时器被触发时，函数执行），因为会将所有的then保存在一个数组里所以用foreach遍历
            this.onResolvedCallbacks.forEach(fn => fn(this.value))
        }
    }
    _reject(reason){
        if(this.status === PENDING){
            this.status = REJECTED;
            this.reason = reason;
            //状态发生改变时，执行保存的函数（比如定时器被触发时，函数执行）
            this.onRejectedCallbacks.forEach(fn => fn(this.value))

        }
    }
    then(onResolved, onRejected){
        //then方法会返回一个新的promise函数
        return new MyPromise((nextResolve,nextReject) => {
            //1.判断有没有传入成功回调
            if(this._isFunction(onResolved)){
                //2.判断当前的状态是否是成功状态
                if (this.status === FULFILLED){
                    //后一个then可以捕获前一个then方法的异常
                    try {
                        //拿到上一个promise成功回调执行的结果并执行
                        let result = onResolved(this.value);
                        //判断执行的结果是否是一个promise对象
                        if(result instanceof MyPromise){
                            //如果上一个传递的是一个promise对象，那么传给下一个的是成功还是失败由传递的promise状态传递
                            result.then(nextResolve,nextReject)
                        }else {
                            //将上一个promise成功回调执行的结果传递给下一个promise成功的回调
                            nextResolve(result)
                        }
                    }catch (e) {
                        nextReject(e)
                    }

                }
            }

            //2.判断当前的状态是否是失败状态
            //为什么不用判断是否传入失败回调，因为当promise为失败状态时，then方法没有写第二个参数时仍需保证返回的promise对象为上一个promise的失败状态
            //后一个then可以捕获前一个then方法的异常
            try{
                if (this.status === REJECTED) {
                    let result = onRejected(this.reason);
                    //console.log("result:",result);
                    if (result instanceof MyPromise) {
                        result.then(nextResolve, nextReject)
                    } else if (result !== undefined) {
                        nextResolve(result);
                    } else {
                        nextReject();
                    }
                }
            }catch (e) {
                nextReject(e)
            }



            //2.判断当前状态是否是默认状态
            //如果添加监听时状态还未发生改变，那么状态改变时候再执行监听回调，（比如将成功失败的函数放在一个定时器里）
            if(this.status === PENDING) {
                if (this._isFunction(onResolved)) {
                    //将成功的函数先保存在定义的变量里
                    this.onResolvedCallbacks.push(() =>  {
                        try {
                            let result = onResolved(this.value);
                            if(result instanceof MyPromise){
                                result.then(nextResolve,nextReject)
                            }else {
                                nextResolve(result);
                            }
                        }catch (e) {
                            nextReject(e);
                        }

                    })

                }

                this.onRejectedCallbacks.push(() => {
                    try {
                        let result = onRejected(this.reason);
                        if(result instanceof MyPromise){
                            result.then(nextResolve,nextReject)
                        }else if (result !== undefined){
                            nextResolve(result);
                        }else {
                            nextReject();
                        }
                    }catch (e) {
                        nextReject(e)
                    }
                })

            }
        })

    }
    _isFunction(fn){
        return typeof fn === "function";
    }
    //promise中的then方法
    static all(list){
        return new MyPromise(function (resolve,reject) {
            let arr = [];
            let count = 0;
            for (let i = 0;i < list.length;i++){
                let p = list[i];
                p.then(function (value) {
                    arr.push(value);
                    count++;
                    if (list.length === count){
                        resolve(arr)
                    }
                }).catch(function (e) {
                    reject(e);
                })
            }
        })
    }
}