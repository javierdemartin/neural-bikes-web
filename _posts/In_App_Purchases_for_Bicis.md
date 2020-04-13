---
title: In App Purchases for Bicis
author: Javier de Martín
date: 2020-04-07
published: true
---

I recently dropped all support for advertisements in my app. I didn't fully enjoy the idea and didn't work at all for me. Probably my userbase is not as big as it needs to be. If you want to support in any other way I have a [Ko-Fi](https://ko-fi.com/javierdemartin) profile set up just for that.

I am now introducing new features and In App Purchases for the first time. As of now, the predictions and live availability graph are free. They are also accesible via the public API if that's your thing or want to create something with it. 

This new version introduces what I am calling the *route planner*. Not only availability is a problem in bike sharing systems in terms of rebalancing but also docking availability. When starting a trip to your destination station you are not able to know the available docks that will be at your expected arrival time. By taking advantage of the prediction system it's easy to know the available docks on a station.

There are also some other new exciting features like detecting when a station is going to be refilled or discharged by service operators as shown in the next screenshot. And many more to come. If you have ideas or features that you would like to see implemented [ping me](mailto:javierdemartin@me.com).

![Bicis version 2020.4.1](https://javierdemart.in/_posts/resources/bicis_2020_4_1.PNG)

The current price of this purchase is set at 3.49€. I don't know if it's a bit steep but the app is still 90% free. I hope this will keep me motivated to keep more interesting features coming in the future. I know this kind of updates where paid features are introduced do not receive a warm welcome and I do not think I have a big enough userbase to encourage users to buy this but let's see if the work pays off.

I've spent more time than I would like to admit creating the confetti annimation after finishing the purchase process so please enjoy it.

Full changelog for version 2020.4.1:

* Added In App Purchases
* Added route planner to know how many docks will be available at a selected destination station
* Added detection of refill/discharge operations in a station by the service operator, this is done in the backend but only shown in the iOS app at the moment
* Added indicator of the accuracy of the predictions based on RMSE differences between the prediction and history
* Added color coding to the pins in the map to show at a glance the current availability of the system

Celebratory promo codes for this launch. The App Store is having problem processing payments and redeeming promo codes. Please be patient.

* RLR374A9AYN9
* 3XNNY3JX4T46
* EH9KMW7NETXN
* 37EW9MELKWEF
* 797PXWPAR79W

