---
title: Launching Neural Bikes API
author: Javier de Martín
date: 2019-11-08
published: true
---

For a long time I wanted to make all the data that [Neural Bikes](http://neural.bike) uses. The time has come. The [Neural Bikes](http://code.neural.bike) project is a neural network based system to predict bike sharing availability based on previous data.

To make the data I use in my [app](http://app.neural.bike) available to the public I've made an API. It lets the user query two endpoints and get the prediction values for the day and the accumulated daily availability,

```
https://javierdemart.in/api/v1/prediction/bilbao
https://javierdemart.in/api/v1/today/bilbao
```

If you want to be a bit more specific and only query for a single station it's also possible for both endpoints,

```
https://javierdemart.in/api/v1/prediction/bilbao/termibus
https://javierdemart.in/api/v1/today/bilbao/termibus
```

To query for individual stations use the name without the prepended id, for stations that have spaces use the percent encoding, `SAN%20PEDRO`.

Currently the API is only available for Bilbao, the plan is to release more cities before the year's end after training and testing the models. 

The data, predictions and API are a project of mine. This is not related in any way to Bilbao's council nor the service supplier.
