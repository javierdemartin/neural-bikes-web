---
title: Reverse Engineering NextBike API
author: Javier de Martín
date: 2019-08-03
published: true
---
To be able to get my app [Bicis](https://apps.apple.com/es/app/bicis-consulta-y-predicción/id1275889928) to load the data from Bilbao's bike sharing service I needed the XML/JSON feed where the official app makes a query. As the service is relatively new and Bilbao's council neglects to update the Open Data portal with the new dataset I had to do some digging. 

</br>

Reverse engineering this API is as easy as capturing the traffic sent from the phone to the servers. Luckily the traffic was HTTPS so no passwords were sent in plaintext. To be able to see the traffic sent I had to use [Charles Proxy](https://apps.apple.com/us/app/charles-proxy/id1134218562) and done, you can now see all the requests sent.

</br>

Feed with all the stations and bikes from a city

```
https://nextbike.net/maps/nextbike-official.json?city=532
```

```
curl https://nextbike.net/maps/nextbike-official.json?city=532
```

```
getApiStations() {
	test;
}
```