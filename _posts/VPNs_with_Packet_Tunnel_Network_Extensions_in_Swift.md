---
title: VPNs with Packet Tunnel Network Extensions in Swift 
author: Javier de Martín
date: 2019-09-13
published: true
---

[1]: http://kean.github.io/post/network-extensions-into "Title"

The [Network Extension](https://developer.apple.com/documentation/networkextension) framework is one of the most customizable frameworks that Apple provides. Allowing you to customize and extend the core networking features of iOS and macOS. 

While this article by [Alexander Grebenyuk][1] covers this topic in depth I would like to add some things I have learnt. 

I have recently worked on a project implementing a VPN using the OpenVPN protocol. This is not supported natively by the framework and it requires a third party library, I used [OpenVPNAdapter](https://github.com/ss-abramchuk/OpenVPNAdapter).

The WWDC sessions from [2015](https://developer.apple.com/videos/play/wwdc2015/717/), 2017 [Part 1](https://developer.apple.com/videos/play/wwdc2017/707)  and [Part 2](https://developer.apple.com/videos/play/wwdc2017/709). Are specially useful to grasp essential points and know how this framework is used.

## Using the Packet Tunnel Extension to Implement a VPN

Imagine you want to tunnel all your outgoing traffic using the VPN connection. All your traffic will be sent to your VPN server, that is also your DNS server. This solution can be used to block certain websites, like gambling or adult content. You have to be sure that all the traffic is going out of your tunneled interface, if it doesn't your app won't be usable. That's what I've been working on using a [`Packet Tunnel`](https://developer.apple.com/documentation/networkextension/packet_tunnel_provider) allowing me to implement a VPN client for a packet-oriented custom VPN protocol.

As this is going to be an app in the App Store I couldn't use an always on VPN as it requires managed devices and implementing an IKEv2 VPN solution. 

For unmanaged devices there are some things at our hand. Like playing around with the [on demand rules](https://developer.apple.com/documentation/networkextension/personal_vpn/vpn_on_demand_rules). Allowing the system to automatically start a VPN connection based on different rules. In this case forcing the system to establish a tunnel whenever it acquires internet connectivity.


OpenVPN has implemented their own solution, [seamless tunnel](https://forums.openvpn.net/viewtopic.php?t=20820). Obviously it's not public but it seems to work so I'm going to try and create my own seamless solution.
<br>

Implementing this Packet Tunnel Network Extension will divide the app into two targets. Your main app where your app will reside and the target that subclasses  [`NEPacketTunnelProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider#). Subclassing this class will grant us access to a virtual network interface. Creating a packet tunnel provider requires to configure the `Info.plist` file.

The main app will only be in charge of doing tasks like user management downloading the VPN configuration... And the target will be doing all the networking operations: starting, stopping and managing all the states the tunnel could be in.

## Monitoring Network Interface Changes

The [`NEProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider#) in your extension has an instance property that stores the current default path used for connections created by the provider. This is the [defaultPath](https://developer.apple.com/documentation/networkextension/neprovider/1406740-defaultpath) and by using KVO you can determine and get notified when the physical interface changes.

```
let options = NSKeyValueObservingOptions([.new, .old])
self.addObserver(self, forKeyPath: "defaultPath", options: options, context: nil)
```

You shouldn't monitor the interface changes. The standard approach is to monitor the path associated with your tunnel connection for:

* The path failing
* A better path becoming available

After this, you can attempt a new tunnel connection and transition to that. You should also know your underlying tunnel infraestructure and make as little as damage as possible. If you can reconnect without breaking the tunnel interface, not making changes to the tunnel network settings in [`NETunnelNetworkSettings`](https://developer.apple.com/documentation/networkextension/netunnelnetworksettings#) that could cause reconnections over the tunnel interface to break you can do it. This process will yield to a better user experience experimenting less reconnections over time.

There are some cases in which the tunnel will require new network settings. Those can be applied without cancelling or doing anything to the tunnel but that might break the connections running over the tunnel interface.

As a rule, you should only cancel the tunnel if you've exhausted the reconnection options and you're sure that the tunnel is irrecoverable.

There is no need to monitor `defaultPath` for interface changes. All that is needed is to monitor the path associated with my tunnel. Doing so you can check if the path is failing or if a better path becomes available.

When an interface changed the traffic was not going out by the `tun` interface. I don't' yet know how this happens or why. This renders the tunnel unusable as the traffic is not being sent by the tunnel. Monitoring the interface changes with an observer allowed me to cancel or reconnect the tunnel when I saw these changes. But it's not a viable solutions. Some times a reconnection loop would happen or weird edge cases.

## Handling Sleep/Wake

Another problem to overcome is dealing with keeping the tunnel alive. As the device goes to sleep the tunnel stalls and goes to sleep, it drops the IP address and sends no traffic. 

`NEProvider` class has two method that have to be overridden. [`sleep(completionHandler:)`](https://developer.apple.com/documentation/networkextension/neprovider#dash_1406731) and [`wake()`](https://developer.apple.com/documentation/networkextension/neprovider#dash_1406731).

The moment you lock your device it goes to sleep. As said in the OpenVPN [forums](https://community.openvpn.net/openvpn/ticket/993?cversion=0&cnum_hist=1), 

> when the device goes to sleep the app stops the VPN connection because it can't be maintained while sleeping. Upon wake up, the VPN is re-established and this may take 2 to 3 seconds.

There are several [posts](https://community.openvpn.net/openvpn/ticket/993?cversion=0&cnum_hist=1) talking about the sleep status the tunnel is left when the device goes to sleep.

Overriding the `sleepWithCompletionHandler` method and quiesce the tunnel as appropiate for your protocol. In this case using the OpenVPN protocol I paused it using `OpenVPNAdapter.pause(withReason:)`.

In the other hand, the overriden `wake` method you should reactivate the tunnel.

## Detecting if the tunnel is active

Code inside the extension is subject to [different rules](https://forums.developer.apple.com/thread/94430).

My main logic is to detect when a petition is not going through my tunnel, aka receiving a [`HTTP 451`](https://en.wikipedia.org/wiki/HTTP_451) code for a known blocked website.

So, running a `NSURLSession` and querying for a known blocked website would return a `HTTP 200` even if the tunnel is working. These are the different rules applied to code within the extension. There is a lower level function that *forces* traffic to go through the tunnel, [`createTCPConnectionThroughTunnel`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider/1406055-createtcpconnectionthroughtunnel) is going to solve a lot of the hassle. It's going to route a petition to a blocked website via the `tun` interface and if the tunnel is down it's not going to run anything.

A hacky, but valid solution is as the device is waking up from sleep or detects a new interface change run a function that checks if a blocked website returns the adecuate `HTTP` code. Before writing anything in the tunnel I started a timer. If after `X` seconds is not invalidated it's going to cancel the tunnel. Meaning that the tunnel was not actively running. After initializing the tunnel I'd write my `GET` petition to the tunnel and if this works I can now cancel the tunnel. After this you can read the headers from the `HTTP` response and if it doesn't contain a `451` code The tunnel is also cancelled as the traffic is not going out through the interface.

Although this is a hacky solution it doesn't consume as many resources as cancelling/reconnecting the tunnel when the device wakes up or detects an interface change.

## Limiting reconnections

Some edge cases will lead to a rapid succession of reconnections to the VPN. If as a result the VPN is not established that loop will drain *a lot* of battery as it's constantly reconnecting. It's a good idea to denounce path notifications for a bit and avoid doing massive work during a transient event.


## What now?

You could use one of the previous solutions or a combination of them to achieve an always on VPN with all the traffic going out through your interface. 

There is not a lot of documentation on how to do something similar, I don't know if they might be useful to you:

* [How to handle NWPath interface changes in a Packet Tunnel Extension in iOS?](https://forums.developer.apple.com/thread/122711)
* [VPN after changing WiFi to Cellular doesn't redirect traffic through the tunnel's interface](https://forums.developer.apple.com/thread/121921)
* [VPN after changing WiFi to Cellular doesn't redirect traffic through the tunnel's interface](https://forums.developer.apple.com/thread/122091)
* [What are the limits for always on / on demand VPN?](https://forums.developer.apple.com/thread/122227)

