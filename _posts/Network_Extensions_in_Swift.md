# Network Extension Framework

[1]: http://kean.github.io/post/network-extensions-into "Title"

The Network Extension framework is one of the most customizable frameworks that Apple provides. This article by [Alexander Grebenyuk][1] covers this topic in depth. Also Apple cover the topic in the [documentation](https://developer.apple.com/documentation/networkextension).

I would like to shed some tips of what I have learnt by delivering work for a client this past weeks. And also if someone reads this I hope it will help you.

My background in university is on Telecommunications engineering, so I like to think I have the relevant concepts fresh in my mind.

My work consisted in delivering a proof of concept that established a VPN connection with an OpenVPN server. Delivering an always on VPN.

Apple provides three protocols to implement a VPN: Personal VPN, Packet Tunnel Provider and App Proxy Provider. In this case I am going to use a Packet Tunnel Provider as I am going to implement a VPN client for a packet-oriented, custom VPN protocol. In this case the OpenVPN protocol.

This protocol is not supported natively by this framework so you will have to make use of third party libraries. I chose [OpenVPNAdapter](https://github.com/ss-abramchuk/OpenVPNAdapter) and it served it purpose. I must say it took me a bit to get used to it.

First off, if you want to establish a permanently on VPN you have to differentiate two important terms:

* **Always on**, as it says, it's only available for managed devices.
* [**On demand**](https://developer.apple.com/documentation/networkextension/personal_vpn/vpn_on_demand_rules), allows to specify various criteria in which conditions the VPN can start or stop. You can even specify different rules for the cellular and WiFi interfaces.

**How does a Network Extension work?** I am going to dive into talking about the Packet Tunnel, but the other two cases will be similar. Your main app is going to be divided into your main target and the Network Extension target.

## Monitoring Network Interface Changes

https://developer.apple.com/documentation/networkextension/neprovider/1406740-defaultpath

## Handling Sleep/Wake status

Overriding the `sleepWithCompletionHandler` method and quiesce the tunnel as appropiate for your protocol.

In the other hand, the overriden `wake` method you should reactivate the tunnel.

As far as I know there is not a lot of documentation or tutorials widely available but here are some good resources I found or asked in forums:

* [What's New in Network Extension and VPN - WWDC 2015](Check out What's New in Network Extension and VPN from #WWDC 2015)
* [What are the limits for always on / on demand VPN?](https://forums.developer.apple.com/thread/122227)
