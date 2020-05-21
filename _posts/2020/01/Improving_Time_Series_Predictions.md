---
title: Improving Time Series Predictions
author: Javier de Martín
date: 2020-01-22
published: true
---

I've been trying to improve predictions in [Neural Bikes](neural.bike) for a while with no luck. Tried reading a lot on tweaking the hyperparameters and designing good LSTM networks. Adding & removing layers, tweaking the number of neurons, adding a `Dropout` layer and changing the activation function. The differences were minimal and not noticeable. Not even the training curves led to an improvement.

I tried to do some feature engineering. Adding the season of the year. Performed K-means clustering analysis to identify usage patterns in the data. This last one actually did something. 

There are a couple more columns that I could add to improve accuracy. They are weather related variables like rain, wind or temperature. My main issue with this is when the model is on production I will need a trusty source of data every day to make predictions. The moment that data source fails or disappears I won't be able to make predictions. At the moment this is not a solution for me nor I feel safe making this compromise.

What I hadn't tried was creating a new framing of the data. When transforming my dataset to a supervised problem I was only using one day of previous observations to predict a day of availability of output. That was not enough. If the previous day had rained and the recorded availability was low the predicted availability for next day will also be low. This is not true at all and it messed with my system. 

The final tweak I did was to give more lag observations in the input. Now the predictions are running on three days of previous availability to predict one day of availability. The results have greatly improved from the previous iteration. The only drawback this option has is the increased training time and data processing exponentially. When using only a previous day the data preparation process creates `1008` columns in the supervised learning part, now with three previous days there are `2736` columns. Almost multiplying by three the columns used, hence the increased training time.

This new neural network has been running for almost a month and it can be visually easy to see the improvements. Bilbao is the main benefited city as it has over a year of training data whereas Madrid and New York have only six and three months.

![New predictions](https://javierdemart.in/_posts/resources/2020_01_22.png)
