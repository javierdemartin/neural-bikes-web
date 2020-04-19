---
title: Neural Bikes Backend
author: Javier de Martin
date: 2020-04-13
published: true
---

This is the backend that runs [Neural Bikes](http://neural.bike), running on a Mac Mini & a Raspberry Pi for backups.

![Backend](https://javierdemart.in/_posts/resources/backend.jpg)

My only requirements for the server are that it's able to run Python3 and Node.JS. The computing needs are simple. I'm not training anymore the neural networks on that machine as the data has been growing a lot and the i3 and 4GB of RAM it has make the process painfully slow. I need a little peak of performance whenver I try to make predictions each day. In cases like New York where I need to make a thousand predictions, one for each station, the process is a bit slow. I don't know if this could be run on a Raspberry Pi though, wouldn't want risking the main database to be slow on that hardware.

All the system is run on automated cronjobs on the Mac Mini:
* Data parsing: Every ten minutes a Python script for every city that is in the system or will be in the future parses the availability feed. This is stored in the InfluxDB database and used for two reasons. Daily to show the historic availability to compare against the predictions and to make future predictions.
* Data uploading: Every ten minutes using a NodeJS script the daily data from every database is uploaded to iCloud using CloudKit.JS.
* Prediction generation: Every day at midnight (depending on timezones) data is gathered from the availability databse to make the predictions using a Python script. When they are generated they are saved in the corresponding InfluxDB database and uploaded using the Node.JS script.
* Backup generation: Every monday at night all the databases , prediction & availability, are backed up to the Raspberry Pi

What if the main machine stops working? Well, it did some months ago. One day I couldn't SSH into it and when I connected it to a monitor (it runs headless most of the time) a gray screen popped up telling me that the main disk was corrupted. My main concern wasn't the possible outage. I haven't made a backup of the databases and I thought I had lost all the data for over a year. Luckily I unkowingly made a backup a week before.

To avoid this kind of issues I set up one Raspberry Pi to automatically backup all the databases and store two copies. The first is a copy of the InfluxDB running in the Mac Mini and the exported data in CSVs on an external thumb drive just in case I can't access the Raspberry Pi. Nothing fancy but gets the job done.

To stay up on possible server crashes and errors I'm using different services:

* [HealthChecks](https://healthchecks.io): Cron monitoring service. You define your cron and set up an ail where tan alarm will be triggered if the cron hasn't been executed. With this I am able to pinpoint different issues with ease. First one is power, as my server is at home power can go out and I won't know if the server has stopped working. The script that uploads the updated data to the API fails. And one important is if the feed that I am parsing changes any parameter or is down I know when it happens. It has a free tier with 20 cron checks and that's what I am using at the moment.
* [Bearer.sh](http://bearer.sh): API monitoring service for your APIs. Userful to know your response times, logs and where your request come from without using sketchy analytic services...
