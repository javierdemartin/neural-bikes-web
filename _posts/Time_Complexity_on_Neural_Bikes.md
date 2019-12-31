---
title: Time Complexity on Neural Bikes
author: Javier de Martín
date: 2019-12-26
published: true
---
I realized some time ago that [Neural Bikes](http://neural.bike) wasn't scalable. This wasn't a problem as it only had Bilbao's bike sharing service with only 40 stations. As I added Madrid with more than two hundred it suddenly became a problem.

The rendering of the map went like this. When a request came for `javierdemart.in/bicis/*` the Node.JS backend did get all the stations name & coordinate for that city, parse the avaialbility and predictions from my own API for all the stations and then render the map with all the data. Yes, I downloaded *all* the predictions and availability for all the stations. For the 40 stations in Bilbao, the 200 in Madrid and the 900+ in New York. Now you can see the problem.

When I shipped Madrid the loading times increased from around two seconds for Bilbao to up to ten. I didn't even stop to think if I had used the correct data structures bit I should have done that long time ago. 

The solution? Refresh some concepts on [Big O Notation](https://rob.conery.io/2019/03/25/wtf-is-big-o-notation/) to simplify things a bit and modify some data structures.

Summing it all up I was using arrays to store the data instead of a simple key-value system like a dictionary that freed me of iterating through all the data.

As of now all of the available cities (Bilbao, Madrid & New York) load almost immediately and the prediction data is loaded on demand when tapping on a station. Loading all the data was a big waste of time as for example in New York with over 900 stations no one would ever check all of the stations.

Having said that [New York](http://newyork.neural.bike) is now available on Neural Bikes!

