---
title: VPNs with Packet Tunnel Network Extensions in Swift 
author: Javier de Martín
date: 2019-09-26
published: true
---

[1]: http://kean.github.io/post/network-extensions-into "Title"

The [Network Extension](https://developer.apple.com/documentation/networkextension) framework is one of the most customizable frameworks that Apple provides. Allowing you to customize and extend the core networking features of iOS and macOS. 

While this article by [Alexander Grebenyuk][1] covers this topic in depth I would like to add some things I have learnt. 

I have recently worked on a project implementing a VPN using the OpenVPN protocol. This is not supported natively by the networking framework and requires a third party library, like [OpenVPNAdapter](https://github.com/ss-abramchuk/OpenVPNAdapter).

The WWDC sessions from [2015](https://developer.apple.com/videos/play/wwdc2015/717/), 2017 [Part 1](https://developer.apple.com/videos/play/wwdc2017/707)  and [Part 2](https://developer.apple.com/videos/play/wwdc2017/709). Are specially useful to grasp essential points and know how this framework is used.

## Using the Packet Tunnel Extension to Implement a VPN

Imagine you want to tunnel all your outgoing traffic using the VPN connection. All your traffic will be sent to your VPN server, that is also your DNS server. This solution can be used to block certain websites, like gambling or adult content and to access an internal company website.

This can be done in iOS using a [`Packet Tunnel`](https://developer.apple.com/documentation/networkextension/packet_tunnel_provider) and for this to be published to the App Store it couldn't be done with frameworks that require managed devices.

For unmanaged devices there are some things at our hand. Like playing around with the [on demand rules](https://developer.apple.com/documentation/networkextension/personal_vpn/vpn_on_demand_rules). This allows the system to automatically start a VPN connection based on different rules. In this case forcing the system to establish a tunnel whenever it acquires internet connectivity, Cellular or WiFi.

OpenVPN has implemented their own solution for an always on VPN tunnel, called [seamless tunnel](https://forums.openvpn.net/viewtopic.php?t=20820). The implementation is not public but it seems to work for them.

Implementing a Packet Tunnel Network Extension will divide the app into two targets. Your main app where your app will reside and the target that subclasses  [`NEPacketTunnelProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider#). Subclassing this class will grant us access to a virtual network interface. Creating a packet tunnel provider requires to configure the `Info.plist` file.

The main app will only be in charge of doing tasks like configuring de VPN profile into the device Settings app. And the target will be doing all the networking operations: starting, stopping and managing all the states the tunnel could be in.

As there is not a lot of documentation or projects here are some of the things that explain how this framework works and how you can manage to build an always on VPN tunnel on iOS devices.

* As long as your device is charging the tunnel is kept alive. The `KEEPALIVE_TIMEOUT` messages are used to sense the other side of the tunnel and make sure it's up/down. If your device is unplugged the tunnel could have died and your traffic will be going out using another interface.
* Higher level APIs like [`URLSession`](https://developer.apple.com/documentation/foundation/urlsession#) do not redirect traffic through the interface in the extension. Lower level APIs like [`createTCPConnectionThroughTunnel`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider/1406055-createtcpconnectionthroughtunnel) can force traffic to go out of the tunnel.
* Some seconds after locking your screen the device goes to [sleep](https://community.openvpn.net/openvpn/ticket/993?cversion=0&cnum_hist=1). Override the [`sleep`](https://developer.apple.com/documentation/networkextension/neprovider/1406731-sleep#) and [`wake`](https://developer.apple.com/documentation/networkextension/neprovider/1406543-wake#) methods. In the first one you should quiesce the tunnel as appropiate and with the latter reactivate the tunnel. More info [here](https://forums.developer.apple.com/message/291454#291454).
* Not 100% sure but if the device is charging the tunnel will never go to sleep.
* Network interface changes can be monitored by subscribing to [`defaultPath`](https://developer.apple.com/documentation/networkextension/neprovider/1406740-defaultpath), it's not a good idea to base your reconnecting logic on network changes. The standard approach is to monitor the path associated with your tunnel connection for: the path failing or a new tunnel connection and transition to that. [Source](https://forums.developer.apple.com/thread/122711).
* Understand your underlying tunnel infraestructure. That is, know if an interface change will destroy your tunnel connection or if updating the tunnel settings will affect your connection. [Source](https://forums.developer.apple.com/thread/122711).
* Code inside the network extension is subject to [different rules](https://forums.developer.apple.com/thread/94430). A query using `URLSession` done from the network extension doesn't leave the tunnel using the `tun` interface but this done from the main target the petition leaves the device using the `tun` interface.
* Detecting if the tunnel is active is not an easy task. Using the [`OpenVPNAdapter`](https://github.com/ss-abramchuk/OpenVPNAdapter/blob/master/Sources/OpenVPNAdapter/OpenVPNAdapter.h) library there are some properties that are `nil` unless the tunnel is connected like `sessionName`. I've checked if this value is `nil` after waking up and in cases where the tunnel was not active the returning value wasn't `nil` so I am not completely sold on this working perfectly.
* Read the logs that come from the VPN server. Some of them could indicate tha status your tunnel is in, like the `KEEPALIVE_TIMEOUT` messages. I've opened an [issue](https://github.com/ss-abramchuk/OpenVPNAdapter/issues/141) in the OpenVPNAdapter library to treat this messages as errors instead.
* There are some cases where a lot of rapid reconnections and changes will be fired and you will want to [debounce](https://duckduckgo.com/?q=swift+debounce+method+calls&t=osx&ia=web) your actions in this transient event until the connection is stable.