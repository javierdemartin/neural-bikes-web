---
title: Notes on RXSwift
author: Javier de Martín
date: 2020-04-20
published: false
---

This post does not pretend to be a tutorial in any way. These are my notes my learning process of learning RxSwift using [Ray Wenderlich's](https://store.raywenderlich.com/products/rxswift) incredible book as a guide.

## Getting Started

RxSwfit is a library for composing asynchronous and event-based code by using observable sequences and functional style operators, allowing for parametrized execution via schedulers.

* The **delegate pattern** lets you define an object that acts on behalf, or in coordination with, another object.
* Performing an interation for each element of an array guarantees two things: executes **synchronously** and the collection is **immutable** while you iterate over it.
* When iterating over a collection there is no need to check that all the elements are still there. There is no need to rewind back in case another thread inserts an element at the start of the collection. You assume you always iterate over the collection in its entirety at the beginning of the loop.

Foundational terms of RxSwift:

1. **State** and shared mutable state
2. **Imperative programming**, programmign paradigm that uses statements to change the program's state.
3. **Side effects** represent any changes to the state outside of your code's current scope.
4. **Declarative code**, in this paradigm you can change state at will. In functional programming you aim to minimize the code that causes side effects. Declarative code **let's you define pieces of behavior**. RxSwift will run these behaviors any time there's a relevant event and provide an immutable, isolated piece of data to work with.
5. **Reactive systems**

Foundation blocks of RxSwift:

1. **Observables**: The `Observable<T>` (conforms to `ObservableType` protocol) class provides the ability to asynchronously produce a sequence of events that can "carry" an immutable snapshot of generic data type `T`. It allows other objects or consumers to suscribe for events, or values, emmited by another object over time. This class allows one or more observers to react to any events in real time and update the app's UI, or otherwise process and utilize new and incoming data. An `Observable` can emit (and observers can receive) three types of events:
	1. A `next` event that "carries" the latest data value. This is the way observers "receive" values. An `Observable` object may emit an idefinite ammount of these values, until a terminating event is emmited.
	2. A `completed` event terminates the event sequence with success meaning that the `Observable` has completed its life cycle successfully and won't emmit additional events.
	3. An `error` event terminates the `Observable` with an error and won't emmit additional events.


There are two kinds of observable sequences:

1. **Finite**

```
API.download(file:'API_URL')
	.suscribe(onNext: { data in
	},
	onError: { error in 
	}, 
	onCompleted: {

	})
```

2. **Infinite**: Suscribe for example to `UIDeviceOrientationDidChange`, this sequence of orientation changes does not have an end.

The **operators** available in RxSwift are higly **composable**. They always take in data as input and output their result.

**Schedulers** are the Rx equivalent of dispatch queues.

RxSwift doesn't alter your app's archivecture in any way. It mostly deals with events, asynchronous data sequences and a universal communication contract.

MVVM and RxSwift go great together because a `ViewModel` allows you to expose `Observable<T>` properties which you cand bind directly to `UIKit` controls in your `ViewController`.


## Observables

Observables are asynchronous and they produce events, known as emitting. Events can contain values, such a numbers, or can be gesture recognizers.

When an observable emits an element, it does so in what's known as a **next** event. It can continue emitting **next** events until a terminating (`completed` or `error`) event happens. Once an observable is terminated it can no longer emit events. Thse sequence of events can be represented as enumeration cases:

```
public enum Event<Element> {
	case next(Element)
	case error(Swit.error)
	case completed
}
```

**An `Observable` won't send events or perform any work until it has a suscriber.**

An `Observable` emits a `.next` event for each element, then emits a `.completed` event and finally is terminated. 

It's possible to create different types of observables, the type must be defined as a specific type if it can't be inferred. An empty observable come in handy when you want to return an observable that immediately terminates or intentionally has zero values.

```
let observable = Observable<Void>.empty()

observable.subscribe(onNext: { element in
        print(element)
    }, onError: { err in

    },
       onCompleted: {
        print("Completed")
    },
       onDisposed: {
        print("Disposed")
    })

// > Completed
// > Disposed
```

These are different kind of observables that can be created using different operators.

```
let observable1 = Observable.of([1,2,3]) // Observable<[Int]>
let observable2 = Observable.from([1,2,3]) // Observable<Int>
```

The `from` operator *only* takes an array.

Alternatively, the `never` operator creates an observable that doesn't emit anything and *never* terminates. 


```
let observable = Observable<Any>.never()

observable.subscribe(onNext: { element in
    print(element)
}, onError: { err in
    print(err)
},
   onCompleted: {
    print("Completed")
},
   onDisposed: {
    print("Disposed")
})

// > Nothing is printed
```

Nothing will be printed. Not even `"Completed"`.

### Disposing and terminating

The suscription to an observable triggers the observable's work. Cancelling a suscription to an observable causes it to terminate.

Managing mulitple suscriptions is tedious, the `DisposeBag` holds disposables and helps with it. Not disposing the observable or forgetting to add it to a dispose bag will probably cause memory leaks.Managing mulitple suscriptions is tedious, the `DisposeBag` holds disposables and helps with it. Not disposing the observable or forgetting to add it to a dispose bag will probably cause memory leaks.

To explicitly cancel a suscription, call `dispose()` on it. After this the observable will stop emitting events.

```
let observable = Observable<Void>.empty()

let suscription = observable.suscribe(...)

suscription.dispose()
```

### Traits

Traits are observables with a limited/narrower set of behaviors than regular observables, their usage is optional. There are three kinds:

1. `Single`: Emits either a `.success(value)` (combination of `.next` and `.completed`) or `.error`. Interesting for one-time processes that either only succeed or fail.
2. `Completable`: Emits either `.completed` or `.error` without emitting any values. Useful if you only want to know if the operation succeeded.
3. `Maybe`: Combines `Single` and `Completable`. Either emits a `.success(value)`, `.completed` or `.error`. Interesting for operations thet could succeed or fail and potentially return a value on success.


## Subjects

