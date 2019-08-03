---
date: 2018-10-31T12:00:00+12:00
title: "Hello World"
---

# Analyzing bike share with Graphext

[Graphext](https://graphext.com) is a user friendly site to perform data science analysis in an easy way. All of it it's codeless, presents a visual result and it's collaborative.

I have analyzed over and over the good and bad points of bike sharing systems. Especially Bilbao's own [Bilbao Bizi](https://www.bilbaobizi.bilbao.eus/es/bilbao/) for which I've spent more time than I would like to admit coding apps and learning about Machine Learning.

All the analysis shown below has been done with my own data. As Bilbao's city council is not up to [opening the data](https://twitter.com/bilbao_udala/status/1055823702900834304) to the public I have my own dataset. If you try to access the bike sharing [dataset](https://www.bilbao.eus/opendata/es/catalogo/dato-puntos-recogida-bicicletas-en-prestamo) available in the Bilbao Open Data website you will realize that the data has not been updated since october 2018, containing the data for the previous service. To get my own data I run a script on my server. 

Every ten minutes I parse the JSON feed the official app uses and save the data to a [time-series database](https://twitter.com/bilbao_udala/status/1055823702900834304).

As more and more citites are installing docked (and dockless) bike sharing services it's interesting to analyze the behaviour of the stations.

The final analysis can be seen in this [link](FALTA).

Graphext is not only limited to 
