---
title: Network Extensions in Swift 
author: Javier de Martín
date: 2019-09-13
published: true
---

This is still a work in progress!

[1]: http://kean.github.io/post/network-extensions-into "Title"

The [Network Extension](https://developer.apple.com/documentation/networkextension) framework is one of the most customizable frameworks that Apple provides. This article by [Alexander Grebenyuk][1] covers this topic in depth. This framework allows you to customize and extend the core networking features of iOS and macOS. 

I have recently worked implementing a VPN using the OpenVPN protocol. This is not supported natively by the framework and it requires a third party library, I used [OpenVPNAdapter](https://github.com/ss-abramchuk/OpenVPNAdapter). And when it comes to delivering an always on VPN you have to do some tricks to get it to work.

## Using the Packet Tunnel Extension to Implement a VPN

Imagine you want to tunnel all your outgoing traffic using the VPN connection. All your traffic will be sent to your VPN server, that is also your DNS server. This solution can be used to block certain websites, like gambling or adult content. Therefore, you have to be sure that all the traffic is going out of your tunneled interface.

Apple provides three protocols to implement a VPN: Personal VPN, Packet Tunnel Provider and App Proxy Provider. I have only worked with the second, this post will be all about **packet tunnels**.

Implementing **an always on VPN for unmanaged devices is not possible**, it can only be done using an IKEv2 VPN solution. Trying to mimic the always on VPN behavior requires some tricks and using the [on demand rules](https://developer.apple.com/documentation/networkextension/personal_vpn/vpn_on_demand_rules). Allowing the system to automatically start a VPN connection based on rules, starting the VPN when it's on WiFi but stopping the connection while on Cellular. Not being able to use these capabilities limits the applicability of the tunnel. 

As the device goes to sleep the tunnel stalls and goes to sleep, it drops the IP address and sends no traffic. OpenVPN implements in their iOS app their solution, [seamless tunnel](https://forums.openvpn.net/viewtopic.php?t=20820).

So here goes my attempt to replicate that seamless mode and establishing an always on VPN.

**How does a Network Extension work?** Your main app is going to be divided into two targets:

* App target, where your app will be
* Packet Tunnel Network Extension target, subclasses [`NEPacketTunnelProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider#)

Subclassing this provider will grant us access to a virtual network interface. Creating a packet tunnel provider requires to configure the `Info.plist` file.


## Monitoring Network Interface Changes

The [`NEProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider#) has an instance property that stores the current default path used for connections created by the provider. This is [defaultPath](https://developer.apple.com/documentation/networkextension/neprovider/1406740-defaultpath) by using KVO you can determine and get notified when the physical interface changes.

```
let options = NSKeyValueObservingOptions([.new, .old])
self.addObserver(self, forKeyPath: "defaultPath", options: options, context: nil)
```

As per a [question](https://forums.developer.apple.com/message/382062#382062) I asked in Apple's Developer Forums, you shouldn't monitor the interface changes. The standard approach is to monitor the path associated with your tunnel connection for:

* The path failing
* A better path becoming available

After this, you can attempt a new tunnel connection and transition to that. You should also know your underlying tunnel infraestructure and make as little as damage as possible. If you can reconnect without breaking the tunnel interface, not making changes to the tunnel network settings in [`NETunnelNetworkSettings`](https://developer.apple.com/documentation/networkextension/netunnelnetworksettings#) that could cause reconnections over the tunnel interface to break you can do it. This process will yield to a better user experience experimenting less reconnections over time.

There are some cases in which the tunnel will require new network settings. Those can be applied without cancelling or doing anything to the tunnel but that might break the connections running over the tunnel interface.

As a rule, you should only cancel the tunnel if you've exhausted the reconnection options and you're sure that the tunnel is irrecoverable.

There is no need to monitor `defaultPath` for interface changes. All that is needed is to monitor the path associated with my tunnel. Doing so you can check if the path is failing or if a better path becomes available.

Many of my problems developing this came here. When an interface changed the traffic was not going out by the `tun` interface. The network stack used and some details about the innards of this are detailed in [this](https://developer.apple.com/videos/play/wwdc2015/717/) WWDC session of 2015. What I came to think was that when the device performed a network interface change all the traffic was going out by the newly established interface. Rendering the tunnel unusable as the traffic was not being sent through the tunnel. 

Monitoring the interface changes with an observer allowed me to cancel or reconnect the tunnel when I saw these changes.

* The [NWPathStatus.satisfied] is returned as long as the device is connected to a network, regardless of whether that network is working, transmitting data or not. [Sauce](https://stackoverflow.com/questions/57502517/why-does-nwpathmonitor-status-is-always-satisfied/57510122#57510122). This leads me to think that you don't know if the outgoing traffic is going out through the tunnel interface.

## Handling Sleep/Wake

`NEProvider` class has two method that have to be overridden. [`sleep(completionHandler:)`](https://developer.apple.com/documentation/networkextension/neprovider#dash_1406731) and [`wake()`](https://developer.apple.com/documentation/networkextension/neprovider#dash_1406731).

The moment you lock your device it goes to sleep. As said in the OpenVPN [forums](https://community.openvpn.net/openvpn/ticket/993?cversion=0&cnum_hist=1), 

> when the device goes to sleep the app stops the VPN connection because it can't be maintained while sleeping. Upon wake up, the VPN is re-established and this may take 2 to 3 seconds.

There are several [posts](https://community.openvpn.net/openvpn/ticket/993?cversion=0&cnum_hist=1) talking about the sleep status the tunnel is left when the device goes to sleep.

Overriding the `sleepWithCompletionHandler` method and quiesce the tunnel as appropiate for your protocol. In this case using the OpenVPN protocol I paused it using `OpenVPNAdapter.pause(withReason:)`.

In the other hand, the overriden `wake` method you should reactivate the tunnel.

* As far as I know the tunnel stays up when the device is charging and even when it goes to sleep.
* The device wakes and its in the status WiFi (satisfiable) to WiFi (satisfied) the tunnel is still active but the traffic doesn't goes through the tunnel interface. Esto en dispositivos con Cellular. Si no es Cellular está en estado Unsatisfied a Satisfied, tambien sin bloquear. La única opción es cancelarlo, resume y reconnect no ayuda,

## Limiting reconnections

Some edge cases will lead to a rapid succession of reconnections to the VPN. If as a result the VPN is not established that loop will drain *a lot* of battery as it's constantly reconnecting. It's a good idea to denounce path notifications for a bit and avoid doing massive work during a transient event.

You can set up a debouncer to limit that, implemented as follows:

```Swift
typealias Handler = () -> Void
private var timeInterval: TimeInterval
private var count: Int = 0
    
// handler is the closure to run when all the debouncing is done
// in my case, this is where I sync the data to our server
var handler: Handler? {
        didSet {
            if self.handler != nil {
                // increment count of callbacks, since each time I get a
                // callback, I update the handler
                self.count += 1
                // start a new asyncAfter call
                self.renewInterval()
            }
        }
    }
    
    let reconnectTimeInterval = 2.0


func renewInterval() {
        DispatchQueue.main.asyncAfter(deadline: .now() + self.timeInterval) {
            self.runHandler()
        }
    }
    
    private func runHandler() {
        // first, decrement count because a callback delay has finished and called runHandler
        self.count -= 1
        // only continue to run self.handler if the count is now zero
        if self.count <= 0 {
            self.handler?()
            self.handler = nil
        }
    }
```

Now, I will place `runHandler()` inside my `observeValue(forKeyPath)` method limiting my number of reconnections per second as stablished by `reconnectTimeInterval`.


## Final 

As far as I know there is not a lot of documentation or tutorials widely available but here are some good resources I found or asked in forums:

* [What are the limits for always on / on demand VPN?](https://forums.developer.apple.com/thread/122227)
