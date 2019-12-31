---
title: Bicis App Architecture
author: Javier de Martín
date: 2019-08-10
published: true
---
When I started developing iOS apps I did not know a single thing about backend, servers... I jumped straight into this hoping to learn on the way.

</br>

When I released my first app, [Bicis](https://apps.apple.com/es/app/bicis-consulta-y-predicción/id1275889928), it did little to nothing. It parsed a XML file from a website and showed pins on a map. Those pins represented bike sharing stations available in Bilbao. When a pin was tapped it would show the availability.

As I continued to learn and wanted to do implement more things. Some times it would be hard to get a bike it the station was on a busy zone. I thought I could add some kind of added value, I tried to show an estimate of the expected availability. 

It was a simple graph that made an average of the availability. It was a simple system that used a Raspberry Pi in my room that made some calculations on a MySQL database every 30 minutes using Python and a crontab. My home server was not publicly available and I couldn't guarantee full time availability (not that anyone would notice). With every Apple Developer you can use iCLoud as a backend server and store data there. Uploading the data from my Raspberry Pi only required making use of Apple's CloudKit.JS. It lacks of documentation makes it a bit hard to start using but it does a pretty good job if you don't have a server to use.


</br>

The app now has grown from a simple Swift app to a Swift app with a backend that uploads data to Apple's servers. 

</br>

Some time later I realized that an average value is not as useful for the user. I decided to jump in and up the game.

I started reading and learning how to perform Machine Learning predictions to predict the availability. I upgraded my server setup to an old Mac Mini server because of the new requirements. After some months of learning (and exams) I shipped the update so I had the complete iOS app with a Machine Learning backend.

Open the app and get the map with all the stations and for each one a graph with the expected availability and a history of that day's availability. How does this work as of now in production? 

At midnight every day a script is called, it queries [InfluxDB](https://www.influxdata.com/products/influxdb-overview/), a time series database, and calls a script that makes the prediction using the previously trained model. After that a Node.JS script uploads the predictions to a database in iCloud. After that, every ten minutes a cron job is run on my server that gathers data from the availability feed and saves it to a time series database, InfluxDB. After the data has been added it's uploaded to iCloud using CloudKit.JS so the users have the historic availability of each station to compare with the prediction.



Every month my neural network is retrained. All this project is being documented over at [Neural Bikes](https://github.com/javierdemartin/neural-bikes).
