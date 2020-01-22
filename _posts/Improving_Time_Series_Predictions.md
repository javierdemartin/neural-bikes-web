---
title: Improving Time Series Predictions
author: Javier de Martín
date: 2019-01-22
published: true
---

I've been trying to improve predictions in [Neural Bikes)(neural.bike) for a while with no luck. Tried reading a lot on tweaking the hyperparameters and designing good LSTM networks. Adding & removing layers, tweaking the number of neurons, adding a `Dropout` layer and changing the activation function. The differences were minimal  and not noticeable. Not even the training curves led to an improvement.

I tried to do some feature engineering. Adding the season of the year. Performed K-means clustering analysis to identify usage patterns in the data. This last one actually did something. 

A couple more columns that I could add are weather related variables to the dataset. My main issue with this is when the model is on production I will need a source of data every day to make predictions. The moment that data source fails or disappears I won't be able to make predictions. At the moment this is not a solution for me.

What I hadn't tried was creating a new framing of the data. When transforming my dataset to a supervised problem I was only using one day of previous observations to predict a day of availability of output. That was not enough. If the previous day had rained and the recorded availability was low the predicted availability for next day will also be low. This is not true at all and it messed with my system. 

The final tweak I did was to give more lag observations in the input. Now the predictions are running on three days of previous availability to predict one day of availability. The results have greatly improved from the previous iteration. The only drawback this option has is the increased training time and data processing.