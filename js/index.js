
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

var apiToken = "624a589151c33d7bbc25f082535b4a624ac20ad28fb99e77dd11316884a865d1"

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
		
		var payload = {};
		
		payload['values'] = decoded_data;
		payload['donate'] = donationLink
		payload['license'] = license_message

		console.log(decoded_data)

		console.log(typeof(decoded_data))
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

		var b64 = body['records'][0]['fields']['values']['value']
		var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')
		decoded_data = JSON.parse(decoded_data)
		
		var payload = {};
		payload['values'] = decoded_data;
		payload['donate'] = donationLink
		payload['license'] = license_message

		console.log(decoded_data)

		console.log(typeof(decoded_data))
		res.json(payload)
	})
})

app.get('/api/v1/today/*', (req, res) => {

	console.log(req.params)

	let city = req.params[0].toLowerCase()
	
	var url = "https://nextbike.net/maps/nextbike-official.json?city=532"

	request({
		url: url,
		json: true
	}, async function (error, response, body) {

		let stationsList = body.countries[0].cities[0].places

		var promises = [];
		

		  stationsList.forEach(async (item) => {

			lista_estaciones.push(item.name.replace(/([0-9-])/g, ""))
			console.log("[" + item.name.replace(/([0-9-])/g, "") + "]")
			console.log("-----------------")
			promises.push(queryForStation("Today", item.name.replace(/([0-9-])/g, "")))
			
		  })

		console.log("Finished")
		console.log("--------------------------------")
// 		let result =  Promise.all(promises)
// 		console.log(result)
		
		Promise.all(promises)
		  .then(data => {
			console.log("First handler", data);
			
			var payload = {};
			payload['values'] = data;
			payload['donate'] = donationLink
			payload['license'] = license_message
			res.json(payload);

		  })
	})
})

app.get('/api/v1/prediction/*', (req, res) => {

	console.log(req.params)

	let city = req.params[0].toLowerCase()


	// render `home.ejs` with the list of posts
	var url = "https://nextbike.net/maps/nextbike-official.json?city=532"

	request({
		url: url,
		json: true
	}, async function (error, response, body) {

		let stationsList = body.countries[0].cities[0].places

		var promises = [];
		

		  stationsList.forEach(async (item) => {

			lista_estaciones.push(item.name.replace(/([0-9-])/g, ""))
			console.log("[" + item.name.replace(/([0-9-])/g, "") + "]")
			console.log("-----------------")
			promises.push(queryForStation("Prediction", item.name.replace(/([0-9-])/g, "")))
			
		  })

		console.log("Finished")
		console.log("--------------------------------")
// 		let result =  Promise.all(promises)
// 		console.log(result)
		
		Promise.all(promises)
		  .then(data => {
			console.log("First handler", data);
			
			var payload = {};
			payload['values'] = data;
			payload['donate'] = donationLink;
			payload['license'] = license_message
			res.json(payload);
		  })
	})
})

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

	console.log("*****************")	
	console.log(aux)
	console.log("*****************")
	
	console.log("---------")
	console.log(content)
	console.log("---------")
	
	const markdown = ejs.render(content, data);
	const html = marked.parse(markdown);
	
	res.render('views/post', {data: data, content: html})

	console.log(html);
})


app.get('/bicis', (req, res) => {
	
	res.render('views/select-city')
})	

app.get('/bicis/*', (req, res) => {

	console.timestamp('>>>> start delay', 0);
	
	let city = req.params[0].toLowerCase()
	
	let urls = {"bilbao": "https://nextbike.net/maps/nextbike-official.json?city=532", "madrid": "https://api.citybik.es/v2/networks/bicimad"}
	
	let url = urls[city]
	
	console.log(url)

	lista_estaciones = [];
	prediction_values = {};
	actual_values = {};

	// render `home.ejs` with the list of posts


	request({
		url: url,
		json: true
	}, async function (error, response, body) {

		if (!error && response.statusCode === 200) {

			data = body['countries'][0]['cities'][0]

			available_bikes = data['available_bikes']
			total_bikes = data['set_point_bikes']
			
			console.log(">>>> " + available_bikes)
			
			lat = data['lat']
			lng = data['lng']
			zoom = data['zoom'] + 1

			data = data['places']

			for(var i=0; i < data.length; i++) {
				lista_estaciones.push(data[i]['name'].replace(/([0-9-])/g, ""))
			}

			console.timestamp('>>>> first query ', 0);

			var someResult = await Promise.all([queryPredictionValues("Today", city)])
			var anotherResult = Promise.all([queryPredictionValues("Prediction", city)])

			console.timestamp('>>>> second query ', 0);
			
			someResult = dictionary(someResult[0])[0]
			anotherResult = dictionary(anotherResult[0])[0]			
			
			console.log(someResult)
			console.log("///////////////////////////")

			res.render('views/home', { 
				lat: lat, 
				lng: lng, 
				zoom: zoom, 
				data: data, 
				prediction: someResult, 
				actual: anotherResult,
				available: available_bikes, 
				total: total_bikes})
		}
	})
})

function dictionary(list) {
    var map = {};
    for (var i = 0; i < list.length; ++i) {
        var category = list[i].category;
        if (!map[category]) 
            map[category] = [];
        map[category].push(list[i].name);  // add product names only
        // map[category].push(list[i]);    // add complete products
    }
    return map;
}

var queryForStation = function(typeOfQuery, stationName) {

	let recordNameSuffix = ""
	
	var whatToQuery = ""
	
	console.log("Querying " + stationName)

	if (typeOfQuery === "Today") {
		recordNameSuffix += "_TODAY"
		whatToQuery = "today"
	} else {
		whatToQuery = "prediction"
	}

	let promise = new Promise(function(resolve,reject){
		
		
		
		request.get("http://javierdemart.in/api/v1/" + whatToQuery + "/" + city + "/" + stationName, (error,res,body) => {
			
						if (error) {
				console.error(error)
				return
			}
			
			console.log("-------------------------------------------------------")
			console.log(body)
			console.log("-------------------------------------------------------")

			
			/* var b64 = body['records'][0]['fields']['values']['value']
			var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')
			var toDeliver = {}
			toDeliver[stationName] = JSON.parse(decoded_data); */
		
			resolve(toDeliver)
	})

		return promise	
	})



}



var queryPredictionValues = function(typeOfQuery, city) {

	let promises = [];
	let recordNameSuffix = ""
	
		
	var whatToQuery = ""

	if (typeOfQuery === "Today") {
		recordNameSuffix += "_TODAY"
		whatToQuery = "today"
	} else {
		whatToQuery = "prediction"
	}

	if (typeOfQuery === "Today") {
		recordNameSuffix += "_TODAY"
	}

// 	for(i in lista_estaciones) {


		promises.push(new Promise(function(resolve,reject){
			
			let url = "http://javierdemart.in/api/v1/" + whatToQuery + "/" + city
			
			console.log(url)
			
			request({
			  url: url,
			  json: true
			}, function(error, response, body) {
				
				console.log(body['values'])
						
				resolve(body['values'])

			});

		}))
// 	}

	return Promise.all(promises)
}


module.exports = app


app.listen()