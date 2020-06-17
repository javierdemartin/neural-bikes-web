
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


app.get('/', (req, res) => {

	getIpInfo(req)


	const jsonFile = path.join(__dirname, '../resources/now.json')

	var raw = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));

	res.render('views/index.ejs', {data: raw})

})


app.get('/bicis/privacy', (req, res) => {

	getIpInfo(req)

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
	getIpInfo(req)
	res.render('views/select-city')
})

// MARK: API

app.get('/api/v1/all/*/*', (req, res) => {

		getIpInfo(req)

	let currentUrl = 'http://' + req.headers.host + req.originalUrl.replace("/all/", "/today/")
	let predictionUrl = 'http://' + req.headers.host + req.originalUrl.replace("/all/", "/prediction/")

	// Add the query for the prediction and the availability endpoints
	// to an array of Promises
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
			} else {
				// data is already parsed as JSON:
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

	// When both endpoints have finished their tasks start format the data for the new API &
	// calculate the statistics
	Promise.all(promises).then(data => {

		var meanArrayOfIntervals = []

		var i,j,chunk = 3;

		let predictionArray = data[1]['values']
		// let availabilityArray = 

		// Divide the prediction array in 30' intervals and calculate the median of each interval
		for (i=0,j=Object.values(predictionArray).length; i<j; i+=chunk) {
			meanArrayOfIntervals.push(median(Object.values(predictionArray).slice(i,i+chunk)))
		}

		var discharges = []
		var refills = []		

		// Define a baseline mean value that will trigger the event detection
		let trigger = parseInt(Math.max.apply(Math, Object.values(predictionArray)) * 0.35, 10)

		for (i=0; i < meanArrayOfIntervals.length - 1; i++) {

			// Generate the string representing the time interval in which the event
			// has been detected
			if (i % 2 == 0) {
				currentTime = i/2 + ":00"
			} else if ((i+1) % 2 == 0) {
				currentTime = parseInt(i/2,10) + ":30"
			}

			if (((meanArrayOfIntervals[i] - meanArrayOfIntervals[i+1]) < 0) && (Math.abs(meanArrayOfIntervals[i] - meanArrayOfIntervals[i+1])) > trigger) {
				refills.push(currentTime)
			} else if (((meanArrayOfIntervals[i] - meanArrayOfIntervals[i+1]) > 0) && (Math.abs(meanArrayOfIntervals[i] - meanArrayOfIntervals[i+1])) > trigger) {
				discharges.push(currentTime)
			}
		}

		var datetime = new Date();

		var payload = {};
		payload['values'] = {};
		payload['values']['today'] = data[0].values;
		payload['values']['prediction'] = data[1].values;
		payload['refill'] = refills
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

app.get('/api/v1/:param/*/*', (req, res) => {

	getIpInfo(req)

	let city = req.params[0].toLowerCase()
	let station = req.params[1]//.toUpperCase()

	const apiEndpoints = {"today": "Today", "prediction": "Prediction"}

	var addQuery = ""

	if (req.params.param == "today") {
		addQuery = "_TODAY"
	}

	request.post('https://api.apple-cloudkit.com/database/1/iCloud.com.javierdemartin.bici/production/public/records/query?ckAPIToken=' + apiToken, {
		json: {
			"zoneID": { "zoneName": "_defaultZone"},
			"query": {
			"recordType": apiEndpoints[req.params.param],
			"filterBy": [
				{
				"systemFieldName": "recordName",
				"comparator": "EQUALS", 
				"fieldValue": { 
					"value": { 
						"recordName": station + addQuery
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

		// No records found, station is new and predictions have not been created
		if (body['records'].length > 0) {
			var b64 = body['records'][0]['fields']['values']['value']
			var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')
			decoded_data = JSON.parse(decoded_data)
		} else {
			decoded_data = {};
		}

		
		
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
				reject()

			}
		})
		}	
	})
}

app.get('/api/v1/today/*', (req, res) => {

		getIpInfo(req)

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
					
					console.log(stationsList[i])
			
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
		
				stationsList = body["data"]["stations"]
		
				for (i = 0; i < stationsList.length; i++) {

					gotStationsList.push(stationsList[i]["name"].replace(/^\d\d-/g, ''))
			
					stationsDict[String(stationsList[i]["name"].replace(/^\d\d-/g, ''))] = stationsList[i]["station_id"]
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

		getIpInfo(req)

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

	getIpInfo(req)

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

function getDirectories(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isDirectory();
  });
}

function getFilesIn(path) {
  return fs.readdirSync(path).filter(function (file) {
    return fs.statSync(path+'/'+file).isFile();
  });
}


var getBlogFloderStructure = function(filePath, callback) {

	lista = {};
	current_year = -1;
	
	years = getDirectories(filePath)
	
	years.forEach(function(year) {
	
		months	= getDirectories(filePath + "/"  + year)

			lista[year] = {}


			console.log(lista)
			
			months.forEach(function(month) {
		
			
				console.log(getFilesIn(filePath + "/" + year + "/" + month))
				
				lista[year][month] = getFilesIn(filePath + "/" + year + "/" + month)
			})
	})		
	
	console.log("DONE")
	
	callback(lista)
}


app.get('/blog', (req, res) => {

	getIpInfo(req)

	const testFolder = path.join(__dirname, '../_posts')
	
	getBlogFloderStructure(testFolder, function(stucture) {
	
		res.render('views/blog', {
		posts: stucture
		})
	})


});

app.get('/blog/*', (req, res) => {

	getIpInfo(req)

	const testFolder = path.join(__dirname, '../_posts')
				
	var file = req.originalUrl.replace('/blog/', '')
	
	var fileUrl = testFolder + req.originalUrl.replace('/blog', '') + ".md"
		
	var raw = fs.readFileSync(fileUrl, 'utf8');
	
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
	"newyork": "https://gbfs.citibikenyc.com/gbfs/en/station_information.json"
}

var getIpInfo = function(req) {

	var ip = req.headers['x-forwarded-for'] || 
	 req.connection.remoteAddress || 
	 req.socket.remoteAddress ||
	 (req.connection.socket ? req.connection.socket.remoteAddress : null);


	url = 'https://freegeoip.app/json/' + ip

	request.get(url, (error, response, body) => {
	
		if (!error && response.statusCode == 200) {
			ip_info = JSON.parse(body)
			
			var latitude = ip_info['latitude']
			var longitude = ip_info['longitude']
			
			var log = req.url  + " " + ip_info['country_name'] + " " + ip_info['city'] 
			
			if (latitude !== 0) {
				log += " (" + ip_info['latitude'] + "," + ip_info['longitude'] + ")"
			}
	
			console.log(log)
		}
	})	
}

app.get('/bicis/*', (req, res) => {

	let city = req.params[0].toLowerCase()
		
	let urlToParse = cityParsers[city]
	

	
	getIpInfo(req)
		
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
				dataToEjsView[stations[i]["name"].replace(/(^\d\d-)/g, '')] = {"lat": stations[i]["lat"], "lng": stations[i]["lng"], "free_bikes": stations[i]["bikes"],  "id": stations[i]["uid"],'total_docks': stations[i]['bike_racks']}
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
		

			let stations = body['data']['stations']
			centerLatitude = 40.758896 
			centerLongitude = -73.985130
			
			for (i = 0; i< stations.length; i++) { 
			
				dataToEjsView[stations[i]["name"]] = {"lat": stations[i]["lat"], "lng": stations[i]["lon"], "id": stations[i]["station_id"], "free_bikes": stations[i]["availableBikes"], 'total_docks': stations[i]['capacity']}
								
				stationIdDict[stations[i]["name"]] =  stations[i]["station_id"]
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

////////////////////////////

// var Airtable = require('airtable');
// var base = new Airtable({apiKey: process.env.airtable_api_key}).base('appZ1mj1OPiwONMYU');

var Airtable = require('airtable');
var base = new Airtable({apiKey: "keyBiLKFwcjErb7if"}).base('appZ1mj1OPiwONMYU');

Date.prototype.getWeek = function() {
        var onejan = new Date(this.getFullYear(), 0, 1);
        return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    }


app.get('/runs', (req, res) => {

	var promises = [];
	
	var date = new Date()
	
	var userLocale = Intl.DateTimeFormat().resolvedOptions().locale
	
	var currentWeekNumber = (new Date()).getWeek(); 

	
	var currentWeekday = new Date(new Date().toLocaleString(userLocale)) // , {  weekday: 'long' });
	
	promises.push(new Promise(function(resolve, reject) {

		var date = new Date(new Date().getFullYear(),0,1,1);
		var date = date.toISOString();
		
		base('Run').select({
 			maxRecords: 14,
			sort: [
        {field: 'Date', direction: 'desc'}
        ],
			fields: ['Date', 'Distance', 'Duration', 'Calories', 'Type', 'Average HR', 'Duration', 'Max HR', 'RHR', 'Vertical Gain', 'VO2Max']
			}).eachPage(function page(records, fetchNextPage) {
			
				records.forEach(function(rec) {			
				
					rec.fields.Duration = new Date(1000 * rec.fields.Duration).toISOString().substr(11, 8)
				})

				fetchNextPage();
			
				resolve(records)

		}, function done(err) {
			if (err) { console.error(err); return; }
		});

	}))

	promises.push(new Promise(function(resolve, reject) {

		base('Shoes').select({
			// Selecting the first 3 records in Monthly:
			maxRecords: 100,
						sort: [
        {field: 'Distance', direction: 'desc'}
        ],
			fields: ['Model', 'Distance', 'Start', 'Usage']
			}).eachPage(function page(records, fetchNextPage) {

				fetchNextPage();
			
				resolve(records)

		}, function done(err) {
			if (err) { console.error(err); return; }
		});

	}))

	promises.push(new Promise(function(resolve, reject) {

		base('Workout Type').select({
			// Selecting the first 3 records in Monthly:
			maxRecords: 100,
			        sort: [{field: 'Distance', direction: 'desc'}],
			fields: ['Name', 'Pace', 'AvHR', 'MaxHR', 'Distance', 'AvgCal']

			}).eachPage(function page(records, fetchNextPage) {
			
			
				records.forEach(function(rec) {		
					
					if (typeof(rec.fields.Pace) === 'number') {
						rec.fields.Pace = new Date(1000 * rec.fields.Pace).toISOString().substr(14, 5)
					} else {
						rec.fields.Pace = "-:--"
					}
					
					if (typeof(rec.fields['AvHR']) !== 'number') {
						rec.fields['AvHR'] = "---"
					} else {
						rec.fields['AvHR'] = Math.floor(rec.fields['AvHR'])
					}
				})
			
				fetchNextPage();
			
				resolve(records)

		}, function done(err) {
			if (err) { console.error(err); return; }
		});

	}))
	
	
	var statistics = {
		'year': {'distance':0.0, 'duration': 0.0, 'calories': 0.0, 'gain': 0.0, 'avghr': 0.0, 'maxhr': 0.0, rhr: 0.0, 'gain': 0.0, 'vo2max':0.0},
		'month': {'distance':0.0, 'duration': 0.0, 'calories': 0.0, 'gain': 0.0, 'avghr': 0.0, 'maxhr': 0.0, rhr: 0.0, 'gain': 0.0, 'vo2max':0.0},
		'week': {'distance':0.0, 'duration': 0.0, 'calories': 0.0, 'gain': 0.0, 'avghr': 0.0, 'maxhr': 0.0, rhr: 0.0, 'gain': 0.0, 'vo2max':0.0}
		};
	
	// Total statistics
	promises.push(new Promise(function(resolve, reject) {	

		var date = new Date(new Date().getFullYear(),0,1,1);
		var date = date.toISOString();		
		var firstDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1,2)

		var firstDayOfWeek = new Date();
		firstDayOfWeek.setDate(firstDayOfWeek.getDate() - (firstDayOfWeek.getDay() + 6) % 7);
		firstDayOfWeek.setHours(00,00,00);
		
		var monthCounter = 0;
		var weekCounter = 0;
		var yearCounter = 0;
		

		base('Run').select({
			filterByFormula: `{Date} > "${date}"`,
			sort: [
        {field: 'Date', direction: 'desc'}
        ],
			fields: ['Date', 'Distance', 'Duration', 'Calories', 'Type', 'Average HR', 'Duration', 'Max HR', 'RHR', 'Vertical Gain', 'VO2Max']
			}).eachPage(function page(records, fetchNextPage) {
			
				records.forEach(function(rec) {	
					
					statistics.year.distance += rec.fields.Distance		
					statistics.year.duration += rec.fields.Duration	
					
					if (typeof rec.fields['RHR'] !== 'undefined') {
						statistics.year.rhr += rec.fields['RHR']
						yearCounter += 1;
					}
					
					if (typeof rec.fields['Vertical Gain'] !== 'undefined' && rec.fields['Vertical Gain']) {
						statistics.year.gain += rec.fields['Vertical Gain']
					}
					
					if (typeof rec.fields.Calories !== 'undefined' && rec.fields.Calories) {
						statistics.year.calories += rec.fields.Calories
					}
					
					if (typeof rec.fields['Average HR'] !== 'undefined') {
						statistics.year.avghr += rec.fields['Average HR']
					}
					
					if (typeof rec.fields['Max HR'] !== 'undefined') {
						statistics.year.maxhr += rec.fields['Max HR']
					}
					
					if (typeof rec.fields['VO2Max'] !== 'undefined') {
						statistics.year.vo2max += rec.fields['VO2Max']
					}
					
					var currentSample = new Date(rec.fields['Date'])
					
					if (currentSample > firstDayOfMonth) {
						
						monthCounter += 1
						
						statistics.month.distance += rec.fields.Distance		
						statistics.month.duration += rec.fields.Duration	
						statistics.month.rhr += rec.fields.RHR
						statistics.month.maxhr += rec.fields['Max HR']
					
						if (typeof rec.fields.Calories !== 'undefined' && rec.fields.Calories) {
							statistics.month.calories += rec.fields.Calories
						}
					
						if (typeof rec.fields['Average HR'] !== 'undefined') {
							statistics.month.avghr += rec.fields['Average HR']
						}
						
						if (typeof rec.fields['Vertical Gain'] !== 'undefined' && rec.fields['Vertical Gain']) {
							statistics.month.gain += rec.fields['Vertical Gain']
						}
						
						if (typeof rec.fields['VO2Max'] !== 'undefined') {
							statistics.month.vo2max += rec.fields['VO2Max']
						}
					}
					
					
					if (currentSample >= firstDayOfWeek) {
						
						statistics.week.distance += rec.fields.Distance		
						statistics.week.duration += rec.fields.Duration	
						statistics.week.rhr += rec.fields.RHR
						statistics.week.maxhr += rec.fields['Max HR']
					
						if (typeof rec.fields.Calories !== 'undefined' && rec.fields.Calories) {
							statistics.week.calories += rec.fields.Calories
						}
						
						weekCounter += 1
					
						if (typeof rec.fields['Average HR'] !== 'undefined') {
							statistics.week.avghr += rec.fields['Average HR']
						}
						
						if (typeof rec.fields['Vertical Gain'] !== 'undefined' && rec.fields['Vertical Gain']) {
							statistics.week.gain += rec.fields['Vertical Gain']
						}
						
						if (typeof rec.fields['VO2Max'] !== 'undefined') {
							statistics.week.vo2max += rec.fields['VO2Max']
						}
					
					}
					
				})
				
				statistics.year.avghr /= yearCounter
				statistics.week.avghr /= weekCounter
				statistics.month.avghr /= monthCounter
				
				statistics.year.maxhr /= yearCounter
				statistics.week.maxhr /= weekCounter
				statistics.month.maxhr /= monthCounter
				
				statistics.year.vo2max /= yearCounter
				statistics.week.vo2max /= weekCounter
				statistics.month.vo2max /= monthCounter
				
				statistics.year.rhr /= yearCounter
				statistics.week.rhr /= weekCounter
				statistics.month.rhr /= monthCounter
				
				statistics.year.duration = toHHMMSS(statistics.year.duration)
				statistics.month.duration = toHHMMSS(statistics.month.duration)
				statistics.week.duration = toHHMMSS(statistics.week.duration)
				

				fetchNextPage();
			
				resolve(records)

		}, function done(err) {
			if (err) { console.error(err); return; }
		});
		

	}))

	// When both endpoints have finished their tasks start format the data for the new API &
	// calculate the statistics
	Promise.all(promises).then(data => {
	
		let shoes = data[1];
		

		var raw = {'runs': data[0], 'shoes': shoes, 'workout': data[2], 'statistics': statistics}

		res.render('views/runs.ejs', {data: raw})
	})

})


var toHHMMSS = (secs) => {
    var sec_num = parseInt(secs, 10)
    var hours   = Math.floor(sec_num / 3600)
    var minutes = Math.floor(sec_num / 60) % 60
    var seconds = sec_num % 60

    return [hours,minutes,seconds]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v,i) => v !== "00" || i > 0)
        .join(":")
}


module.exports = app

app.listen(3000)
