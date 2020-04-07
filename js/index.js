
const app = require('express')()
var express = require("express");
var request = require('request')
var fs = require('fs');
var async = require('async');
var fetch = require("node-fetch");
var util = require("util")
var path = require("path")
var ejs = require("ejs")

var CloudKit = require('./cloudkit.js')

const frontmatter = require('frontmatter');
const marked = require('marked');

const Bearer = require('@bearer/node-agent')
Bearer.init({ secretKey: 'sk_production_XlAJqg_Jp0FdO0R9kZWp5B0LzwECnrfm' })

var stations = [];
var total = [];
var datos = [];
var lista_estaciones = [];
var lat = undefined;
var lng = undefined;
var zoom = undefined;
var data = undefined;

let license_message = "Free to use and create things with. If you find it useful, please consider donating to support the development of the project."
let donationLink = 'https://ko-fi.com/javierdemartin';

var apiToken = "4747c89304762c4f4c754ed9c15ecfdc02b89aa2006a85f46c109414f5307025"

var centerLatitude = 0.0; 
var centerLongitude = 0.0; 
var dataToEjsView = {}
var stationIdDict = {};

app.use(express.static(path.join(__dirname, '../')));
app.set('views', path.join(__dirname, '../'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine','ejs');



app.get('/bicis/privacy', (req, res) => {

	const fileFolder = path.join(__dirname, '../texts/privacy.md');

	var raw = fs.readFileSync(fileFolder, 'utf8');

			const { data, content } = frontmatter(raw);
										
			var aux = frontmatter(raw);

			const markdown = ejs.render(content, data);
			const html = marked.parse(markdown);

			res.render('views/bicis/privacy', {
			body: html
		  })

})

app.get('/bicis', (req, res) => {
	res.render('views/select-city')
})

// MARK: API

app.get('/api/v1/all/*/*', (req, res) => {

	let currentUrl = 'http://' + req.headers.host + req.originalUrl.replace("/all/", "/today/")
	let predictionUrl = 'http://' + req.headers.host + req.originalUrl.replace("/all/", "/prediction/")

	var promises = [];

	promises.push(new Promise(function(resolve, reject) {

		request.get({
			url: currentUrl,
			json: true,
			headers: {'User-Agent': 'request'}
		}, (err, res, data) => {
		if (err) {
			console.log('Error:', err);
		} else if (res.statusCode !== 200) {
			console.log('Status:', res.statusCode);
			console.log(res)
			console.log(data)
		} else {
			// data is already parsed as JSON:
			console.log(data.html_url);
			resolve(data)
		}
		});

	}))

	promises.push(new Promise(function(resolve, reject) {

		request.get({
			url: predictionUrl,
			json: true,
			headers: {'User-Agent': 'request'}
		}, (err, res, data) => {
		if (err) {
			console.log('Error:', err);
		} else if (res.statusCode !== 200) {
			console.log('Status:', res.statusCode);
		} else {
			// data is already parsed as JSON:
			resolve(data)
		}
		});
	}))

	Promise.all(promises)
	.then(data => {

		let nowData = Object.values(data[0]['values'])
		let predictionData = Object.values(data[1]['values']).slice(0, nowData.length);

		var slicedArray = []

		let windowMedian = median(predictionData)
		let overallMean = median(Object.values(data[1]['values']))

		var i,j,temparray,chunk = 3;
		for (i=0,j=Object.values(data[1]['values']).length; i<j; i+=chunk) {
			temparray = Object.values(data[1]['values']).slice(i,i+chunk);
			slicedArray.push(median(temparray))
		}

		var discharges = []
		var refills = []		

		let trigger = parseInt(Math.max.apply(Math, Object.values(data[1]['values'])) * 0.35, 10)

		for (i=0; i < slicedArray.length - 1; i++) {

			if (i % 2 == 0) {
				currentTime = i/2 + ":00"
			}	
			else if ((i+1) % 2 == 0) {
				currentTime = parseInt(i/2,10) + ":30"
			}

			if (((slicedArray[i] - slicedArray[i+1]) < 0) && (Math.abs(slicedArray[i] - slicedArray[i+1])) > trigger) {
				refills.push(currentTime)
			} else if (((slicedArray[i] - slicedArray[i+1]) > 0) && (Math.abs(slicedArray[i] - slicedArray[i+1])) > trigger) {
				discharges.push(currentTime)
			}
		}

		var datetime = new Date();

		console.log(data[0].values)
		console.log(data[1].values)

		var payload = {};
		payload['values'] = {};
		payload['values']['today'] = data[0].values;
		payload['values']['prediction'] = data[1].values;
		// Refils
		payload['refill'] = refills
		// Discharges
		payload['discharges'] = discharges
		payload['donate'] = donationLink
		payload['license'] = license_message
		payload['last_updated'] = datetime

	    res.header('Access-Control-Allow-Origin', '*');

		res.json(payload)
	})
})

function median(values){
  if(values.length ===0) return 0;

  values.sort(function(a,b){
    return a-b;
  });

  var half = Math.floor(values.length / 2);

  if (values.length % 2)
    return values[half];

  return (values[half - 1] + values[half]) / 2.0;
}

// Get individual stations by name
app.get('/api/v1/prediction/*/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	let station = req.params[1]//.toUpperCase()

	request.post('https://api.apple-cloudkit.com/database/1/iCloud.com.javierdemartin.bici/production/public/records/query?ckAPIToken=' + apiToken, {
		json: {
			"zoneID": { "zoneName": "_defaultZone"},
			"query": {
			"recordType": "Prediction",
			"filterBy": [
				{
				"systemFieldName": "recordName",
				"comparator": "EQUALS", 
				"fieldValue": { 
					"value": { 
						"recordName": station
					}
				}
				}]
			}
		}
	}, (error, response, body) => {
	  
		if (error) {
			console.error(error)
			return
		}

		var b64 = body['records'][0]['fields']['values']['value']
		var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')
		decoded_data = JSON.parse(decoded_data)
		
		var datetime = new Date();
		
		var payload = {};
		
		payload['values'] = decoded_data;
		payload['donate'] = donationLink
		payload['license'] = license_message
		payload['last_updated'] = datetime

	    res.header('Access-Control-Allow-Origin', '*');
		res.json(payload)
	})
})

app.get('/api/v1/today/*/*', (req, res) => {

	let city    = req.params[0].toLowerCase()
	let station = req.params[1]
	
	console.log("> " + city + " " + station)

	request.post('https://api.apple-cloudkit.com/database/1/iCloud.com.javierdemartin.bici/production/public/records/query?ckAPIToken=' + apiToken, {
		json: {
			"zoneID": { "zoneName": "_defaultZone"},
			"query": {
			"recordType": "Today",
			"filterBy": [
				{
				"systemFieldName": "recordName",
				"comparator": "EQUALS", 
				"fieldValue": { 
					"value": { 
						"recordName": station + "_TODAY"
					}
				}
				}]
			}
		}
	}, (error, response, body) => {
	  
		if (error) {
			console.error(error)
			return
		}
		
		var datetime = new Date();
		

		var b64 = body['records'][0]['fields']['values']['value']
		var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')

		decoded_data = JSON.parse(decoded_data)
		
		var payload = {};
		payload['values'] = decoded_data;
		payload['donate'] = donationLink
		payload['license'] = license_message
		payload['last_updated'] = datetime

	    res.header('Access-Control-Allow-Origin', '*');

		res.json(payload)

	})
})

var apiPreLogIn = function(city) {
	
	const options = {
		url: 'https://openapi.emtmadrid.es/v1/mobilitylabs/user/login/', 
		method: 'GET',
		headers: {
			'email': 'javierdemartin@me.com',
		'password': 'zXF2AbQt7L6#',
		'X-ApiKey': '76eb9ed5-25b6-4e57-a905-71d4ac2ecdf2',
		'X-ClientId': 'f64bb631-8b03-426d-a1e3-9939a571003a'
		}
	};

	return new Promise(function(resolve, reject) {
	
		if (city !== "madrid") {
			resolve()

		} else {
			request.get(options, (error, res, body) => {
		
			if (error) {
				console.error(error)
				reject(error)

			}
						
			if (body) {

				let accessToken = JSON.parse(body)['data'][0]['accessToken']
				
				resolve(accessToken)
			
			} else {
				console.log("---------------------")
				reject()

			}
		})
		}	
	})
}


app.get('/api/v1/today/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	
	var gotStationsList = []
	
	// render `home.ejs` with the list of posts
	let url = cityParsers[city]

	apiPreLogIn(city).then(accessToken => {
		
		var options = {
    		url: url, 
    		method: 'GET',
    		json:true
    	}
    
		if (city === 'madrid') {
		
			options = {
    		url: url, 
    		method: 'GET',
    		json:true,
    		headers: {'accessToken': accessToken}
    		}
		}
		
		request(options, async function (error, response, body) {

			var stationsList = []
			var stationsDict = []
					
			if (city === "bilbao") {
				stationsList = body.countries[0].cities[0].places
			
				for(i = 0; i < stationsList.length; i++) {
			
					var name = stationsList[i].name.replace(/^\d\d-/g, '')
			
					gotStationsList.push(name)
					stationsDict[name] = name
				}			
			
			} else if (city === "madrid") {
		
				stationsList = body["data"]
			
				for (i = 0; i < stationsList.length; i++) {

					gotStationsList.push(stationsList[i]["name"].replace(/^\d\d-/g, ''))
				
					stationsDict[String(stationsList[i]["name"].replace(/^\d\d-/g, ''))] = stationsList[i]["id"]
				}
			} else if (city === "newyork") {
		
				stationsList = body["network"]["stations"]
		
				for (i = 0; i < stationsList.length; i++) {

					gotStationsList.push(stationsList[i]["name"].replace(/^\d\d-/g, ''))
			
					stationsDict[String(stationsList[i]["name"].replace(/^\d\d-/g, ''))] = stationsList[i]["id"]
				}
			}
		

			var promises = [];

			gotStationsList.forEach(async (item) => {
				// Queries for the ID
				promises.push(queryForStation("Today", stationsDict[item], item))

			})
		  
			var datetime = new Date();
		
			Promise.all(promises)
			  .then(data => {
			
				var payload = {};
				payload['values'] = data;
				payload['donate'] = donationLink;
				payload['license'] = license_message
				payload['last_updated'] = datetime
				
				res.header('Access-Control-Allow-Origin', '*');
				res.json(payload);
			  }).catch(err => {
				console.log(err)		  
			  })
		})
	})
})

app.get('/api/v1/prediction/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	
	var gotStationsList = []
	
	// render `home.ejs` with the list of posts
	let url = cityParsers[city]
	
	apiPreLogIn(city).then(accessToken => {
		
		var options = {
    		url: url, 
    		method: 'GET',
    		json:true
    		}
    
		if (city === 'madrid') {
		
			options = {
    		url: url, 
    		method: 'GET',
    		json:true,
    		headers: {'accessToken': accessToken}
    		}
		}
    
	request(options, async function (error, response, body) {

		var stationsList = []
		var stationsDict = []
		
		
		if (city === "bilbao") {
			stationsList = body.countries[0].cities[0].places
			
			for(i = 0; i < stationsList.length; i++) {
			
				var name = stationsList[i].name.replace(/(^\d\d-)/g, '')
			
				gotStationsList.push(name)
				stationsDict[name] = name
			}			
		} else if (city === "madrid") {
		
			stationsList = body["data"]
		
			for (i = 0; i < stationsList.length; i++) {

				gotStationsList.push(stationsList[i]["name"].replace(/^\d\d-/g, ''))
			
				stationsDict[String(stationsList[i]["name"].replace(/^\d\d-/g, ''))] = stationsList[i]["id"]
			}
		} else if (city === "newyork") {
		
			stationsList = body["network"]["stations"]
		
			for (i = 0; i < stationsList.length; i++) {

				gotStationsList.push(stationsList[i]["name"].replace(/^\d\d-/g, ''))
			
				stationsDict[String(stationsList[i]["name"].replace(/^\d\d-/g, ''))] = stationsList[i]["id"]
			}
		}
		

		var promises = [];

		   gotStationsList.forEach(async (item) => {

 			// Queries for the ID
			promises.push(queryForStation("Prediction", stationsDict[item], item))
			
		  })
		  
		var datetime = new Date();
		
		Promise.all(promises)
		  .then(data => {
		  	
			var payload = {};
			payload['values'] = data;
			payload['donate'] = donationLink;
			payload['license'] = license_message
			payload['last_updated'] = datetime
			
			res.header('Access-Control-Allow-Origin', '*'); 
			res.json(payload);
		  }).catch(err => {
			console.log(err)  
		  })
	})
	})
})

var queryForStation = function(typeOfQuery, stationName, resolveName) {

	let recordNameSuffix = ""
	
	if (typeOfQuery === "Today") {
		recordNameSuffix += "_TODAY"
	}

	let promise = new Promise(function(resolve,reject){

		request.post('https://api.apple-cloudkit.com/database/1/iCloud.com.javierdemartin.bici/production/public/records/query?ckAPIToken=' + apiToken, {
			json: {
				"zoneID": { "zoneName": "_defaultZone"},
				"query": {
				"recordType": typeOfQuery,
				"filterBy": [
					{
					"systemFieldName": "recordName",
					"comparator": "EQUALS", 
					"fieldValue": { 
						"value": { 
							"recordName": stationName + recordNameSuffix
						}
					}
					}]
				}
			}
		}, (error, res, body) => {
		  
			if (error) {
				console.error(error)
				return
			}			

			if ((body['records'][0])) {
				var b64 = body['records'][0]['fields']['values']['value']
				var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')
				
				var toDeliver = {}
				toDeliver[resolveName] = JSON.parse(decoded_data);
		
				resolve(toDeliver)
			} else {
				resolve({})
			}
		})
	})


	return promise
}

app.get('/blog', (req, res) => {

	const testFolder = path.join(__dirname, '../_posts')
	
	if (req.originalUrl === '/blog' || req.originalUrl === '/blog/') {
	
		posts = [];

		fs.readdir(testFolder, (err, files) => {
		  files.forEach(file => {
			
			if (file.indexOf(".md") !== -1) {
			
				var raw = fs.readFileSync(testFolder + '/' + file, 'utf8');
	
				const { data, content } = frontmatter(raw);
								
				var tituloPost = data.title.toString().replace(/\ /g, "_")
				
				var aux = frontmatter(raw);
	
				const markdown = ejs.render(content, data);
				const html = marked.parse(markdown);
				
				var post = {
					date: data.date,
					title: tituloPost,
					content: html
				}
				
				post.date = post.date.toISOString().replace(/T/, ' ').replace(/\..+/, '').split(" ")[0]
				
				posts.unshift(post)
				
			}
		  });
		  
		  posts = posts.sort((a, b) => b.date.localeCompare(a.date));
	  
		  res.render('views/blog', {
			posts: posts
		  })
		});
	}
})

app.get('/blog/*', (req, res) => {

		
	const testFolder = path.join(__dirname, '../_posts')
		
	var file = req.originalUrl.replace('/blog/', '')
	
	var raw = fs.readFileSync(testFolder + '/' + file + ".md", 'utf8');
	
	const { data, content } = frontmatter(raw);
	
	data.date = data.date.toISOString().replace(/T/, ' ').replace(/\..+/, '').split(" ")[0]
	
	var aux = frontmatter(raw);
	
	const markdown = ejs.render(content, data);
	const html = marked.parse(markdown);
	
	res.render('views/post', {data: data, content: html})
})

let cityParsers = {
	"madrid": "https://openapi.emtmadrid.es/v1/transport/bicimad/stations/",
	"bilbao": "https://nextbike.net/maps/nextbike-official.json?city=532",
	"newyork": "https://feeds.citibikenyc.com/stations/stations.json"
}

var queryCityFromApi = function(baseUrl, typeOfQuery, city) {

	var apiUrl = ""

	if(baseUrl.indexOf("localhost") > -1) {
		apiUrl += "http://"
	}

	apiUrl += baseUrl + "/api/v1/" + typeOfQuery + "/" + city
		
	return new Promise(function(resolve, reject) {
		
		request.get(apiUrl, (error, res, body) => {
				
			if (error !== null) {
				console.error(error)
				reject(error)
			} else if (body !== null) {
			
				let data = JSON.parse(body)['values']
				resolve(data)
			
			} 
			
			})
		})
}


app.get('/bicis/*', (req, res) => {

	let city = req.params[0].toLowerCase()
		
	let urlToParse = cityParsers[city]
		
	apiPreLogIn(city).then(accessToken => {
		
		var options = {
    		url: urlToParse, 
    		method: 'GET',
    		json:true
    	}
    
		if (city === 'madrid') {
		
			options = {
				url: urlToParse, 
				method: 'GET',
				json:true,
				headers: {'accessToken': accessToken}
    		}    		
		}
	
	request(options, async function (error, response, body) {
			
		if (city === "bilbao") {
		
			centerLatitude = body['countries'][0]['lat']
			centerLongitude = body['countries'][0]['lng']
			
			let stations = body['countries'][0]['cities'][0]['places']
						
			for (i = 0; i< stations.length; i++) { 
		
				dataToEjsView[stations[i]["name"].replace(/(^\d\d-)/g, '')] = {"lat": stations[i]["lat"], "lng": stations[i]["lng"], "free_bikes": stations[i]["bikes"], 'total_docks': stations[i]['bike_racks']}
				stationIdDict[stations[i]["name"]] =  stations[i]["id"]
			}
			
		} else if (city === "madrid") {
			
			let stations = body["data"]

			centerLatitude =  40.4165000
			centerLongitude = -3.7025600
									
			for (i = 0; i < stations.length; i++) { 
				
				dataToEjsView[stations[i]["name"]] = {"lat": stations[i]["geometry"]["coordinates"][1], "lng": stations[i]["geometry"]["coordinates"][0], "id": stations[i]["id"], "free_bikes": stations[i]["dock_bikes"], 'total_docks': stations[i]['total_bases']}
			}
		} else if (city === "newyork") {
		

			let stations = body['stationBeanList']
			centerLatitude = 40.758896 
			centerLongitude = -73.985130
			
			for (i = 0; i< stations.length; i++) { 
			
				dataToEjsView[stations[i]["stationName"]] = {"lat": stations[i]["latitude"], "lng": stations[i]["longitude"], "id": stations[i]["id"], "free_bikes": stations[i]["availableBikes"], 'total_docks': stations[i]['totalDocks']}
								
				stationIdDict[stations[i]["name"]] =  stations[i]["id"]
			}
		}
						
		var resultTodayDict = {};
		var resultPredictionDict = {};

		var promiseArray = [];


				var payload = { 
		lat: centerLatitude, 
		lng: centerLongitude, 
		zoom: 13, 
		city: city,
		data: dataToEjsView, 
		prediction: {}, 
		actual: {},
		dict: {},
		available: [], 
		total: 0}
	
		res.render('views/home', payload)		
	})
	
	})
})


module.exports = app

app.listen()