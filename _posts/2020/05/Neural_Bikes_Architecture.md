---
title: Neural_Bikes_Architecture
author: Javier de Martín
date: 2020-05-15
location: Bilbao, SP
published: true
---

**This is a Work In Progress post!**

Neural Bikes is a big side project I have been maintaining over the past few years.

It's a multiple parts project to predict bike sharing availability across multiple cities.

![Neural Bikes Architecture](/resources/Neural_Bikes_Architecture.png)

## Database

Every ten minutes a cron job is launched that parses the current availability for each available city. Those values are automatically appended to the correspondent city `today` availability.

Data is stored in an [InfluxDB](https://www.influxdata.com/get-influxdb/), Time Series Database that simplifies dealing with these kinds of data.

## Machine Learning Models

Training the models is a continuous effort that improves the results. Each city has different requirements and each resulting model is an effort of trial errors. The parameters for each city are defined in a [JSON](https://github.com/javierdemartin/neural-bikes/blob/master/config/config.json) file to be easily read.

Code is [Open Source](http://code.neural.bike) for people to check or contribute.

## JSON API

Both the iOS app and web app consume data from the same API endpoints, the three available endpoints are the next ones.

```
javierdemart.in/api/v1/today/CITY/STATION_ID
javierdemart.in/api/v1/prediction/CITY/STATION_ID
javierdemart.in/api/v1/all/CITY/STATION_ID
```

The `today` endpoint is updated every ten minutes with new data, trying to give users a live vision of the system's behavior whereas `prediction` is updated every day at midnight with new predictions generated with previous day's data. At last, `all` combines both API calls and return both feeds into one to simplify querying.

## iOS app

Written in Swift it provides users a 

Code is also [Open Source](https://github.com/javierdemartin/bicis).

## Pricing

Both the iOS app and web are completely free to use but some features on the iOS app are unlocked via an In App Purchase. For the web app donations are available via a [Ko-Fi](http://ko-fi.com/javierdemartin) page.

Server costs are almost zero, I am using an old Mac Mini from 2011. To be able to have an app in the App Store you must pay for the developer yearly license, 100€ in this case.

## SaaS

When hosting your server at home 24/7 availability is not ensured and you need some mechanisms to check on the server status. All the data operations taht upload the API data are automated using cronjobs and they can be monitored using [Healthchecks](https://healthchecks.io). If a cron is delayed or fails you can be notified and take action on it.

On the other side, to monitor API availability and health I am using [Bearer](https://www.bearer.sh).