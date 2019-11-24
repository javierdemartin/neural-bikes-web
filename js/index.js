
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

var stations = [];
var total = [];
var datos = [];
var lista_estaciones = [];
var lat = undefined;
var lng = undefined;
var zoom = undefined;
var data = undefined;

var prediction_values = {}
var actual_values = {}
let license_message = "Free to use and create things with. If you find it useful, please consider donating to support the development of the project."
let donationLink = 'https://ko-fi.com/javierdemartin';

var apiToken = "4747c89304762c4f4c754ed9c15ecfdc02b89aa2006a85f46c109414f5307025"

app.use(express.static(path.join(__dirname, '../')));

app.set('views', path.join(__dirname, '../'));
app.engine('ejs', require('ejs').renderFile);
app.set('view engine','ejs');

var started = new Date();
console.timestamp = function () {
  var now = new Date();
  var args = Array.prototype.slice.call(arguments, 0);
  args.unshift(now - started, 'ms');
  console.log(args.join(' '));
}

// Get individual stations by name
app.get('/api/v1/prediction/*/*', (req, res) => {


	console.log(req.params)

	let city = req.params[0].toLowerCase()
	let station = req.params[1].toUpperCase()

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

		res.json(payload)
	})
})


app.get('/api/v1/today/*/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	let station = req.params[1].toUpperCase()

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

		res.json(payload)
	})
})

app.get('/api/v1/today/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	
	var gotStationsList = []
	
	// render `home.ejs` with the list of posts
	let url = cityParsers[city]

	request({
		url: url,
		json: true
	}, async function (error, response, body) {

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
		
			stationsList = body["network"]['stations']
			
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
			res.json(payload);
		  }).catch(err => {
			console.log("*************************")
			console.log(err)
		  
		  })
	})
})

app.get('/api/v1/prediction/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	
	var gotStationsList = []
	
	// render `home.ejs` with the list of posts
	let url = cityParsers[city]

	request({
		url: url,
		json: true
	}, async function (error, response, body) {

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
		
			stationsList = body["network"]['stations']
			
			for (i = 0; i < stationsList.length; i++) {

				gotStationsList.push(stationsList[i]["name"].replace(/(^\d\d-)/g, ''))
				
				stationsDict[String(stationsList[i]["name"].replace(/(^\d\d-)/g, ''))] = stationsList[i]["id"]
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
			res.json(payload);
		  }).catch(err => {
			console.log("*************************")
			console.log(err)
		  
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
			console.log(file);
			
			if (file.indexOf(".md") !== -1) {
			
				var raw = fs.readFileSync(testFolder + '/' + file, 'utf8');
	
				const { data, content } = frontmatter(raw);
				
				var tituloPost = data.title.replace(/\ /g, "_")
				
				var post = {
					date: data.date,
					title: tituloPost
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
	} else {
	
		console.log("%%%%%%%%%%%%%% " + req.originalUrl)
	}
})

app.get('/blog/*', (req, res) => {

		
	const testFolder = path.join(__dirname, '../_posts')
	
	console.log("THE PATH IS " + path.join(__dirname, '../'))
	
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
	"madrid": "http://api.citybik.es/v2/networks/bicimad",
	"bilbao": "https://nextbike.net/maps/nextbike-official.json?city=532"
}

var queryCityFromApi = function(typeOfQuery, city) {

	let apiUrl = "http://javierdemart.in/api/v1/" + typeOfQuery + "/" + city

	return new Promise(function(resolve, reject) {
	
		request.get(apiUrl, (error, res, body) => {
		
			if (error) {
				console.error(error)
				reject(error)
			}
						
			if (body) {
			
				let data = JSON.parse(body)['values']
				resolve(data)
			
			} else {
				reject()
			}
		})
	})
}

app.get('/bicis/*', (req, res) => {

	let city = req.params[0].toLowerCase()
	
	let urlToParse = cityParsers[city]
	
	console.log(urlToParse)
	
	
	request({
		url: urlToParse,
		json: true
	}, async function (error, response, body) {
	
		console.log(body)
		
		
		var centerLatitude = 0.0; 
		var centerLongitude = 0.0; 
		var dataToEjsView = []
		
		if (city === "bilbao") {
		
			centerLatitude = body['countries'][0]['lat']
			centerLongitude = body['countries'][0]['lng']
			
			
			let stations = body['countries'][0]['cities'][0]['places']
			
			for (i = 0; i< stations.length; i++) { 
		
				let data = {"lat": stations[i]["lat"], "lng": stations[i]["lng"], "name": stations[i]["name"].replace(/(^\d\d-)/g, '')}
		
				dataToEjsView.push(data)
			}
			
		} else if (city === "madrid") {
			
			
			let stations = body["network"]['stations']
			centerLatitude = body["network"]['location']['latitude']
			centerLongitude = body["network"]['location']['longitude']
			
			for (i = 0; i< stations.length; i++) { 
		
				let data = {"lat": stations[i]["latitude"], "lng": stations[i]["longitude"], "name": stations[i]["name"]}
		
				dataToEjsView.push(data)
			}
		}
						
		var resultTodayDict = {};
		var resultPredictionDict = {};
		
		queryCityFromApi("today", city).then(function(result) {
		
			for (i = 0; i < result.length; i++) {
				
				resultTodayDict[Object.keys(result[i])[0]] = Object.values(result[i])[0]
			}
			
			queryCityFromApi("prediction", city).then(function(resultPred) {
		
				for (i = 0; i < resultPred.length; i++) {
				
					resultPredictionDict[Object.keys(resultPred[i])[0]] = Object.values(resultPred[i])[0]
				}
			
				res.render('views/home', { 
					lat: centerLatitude, 
					lng: centerLongitude, 
					zoom: 13, 
					data: dataToEjsView, 
					prediction: resultPredictionDict, 
					actual: resultTodayDict,
					available: [], 
					total: 0})
			
			})
		
			
		}).catch(err => {
		
		})
	})
})


app.get('/bicis', (req, res) => {

	console.timestamp('>>>> start delay', 0);

	res.render('views/select-city')
})

module.exports = app


app.listen()