
const app = require('express')()
var request = require('request')
var fs = require('fs');
var async = require('async');
var fetch = require("node-fetch");
var util = require("util")
var path = require("path")
var CloudKit = require('./cloudkit.js')

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

var apiToken = "624a589151c33d7bbc25f082535b4a624ac20ad28fb99e77dd11316884a865d1"

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

// app.get('/blog', (req, res) => {
// 	const testFolder = path.join(__dirname, '../blog')
// 	
// 	console.log(testFolder)
// 	
// 	posts = []
// 
// 	fs.readdir(testFolder, (err, files) => {
// 	  files.forEach(file => {
// 		console.log(file);
// 		posts.push(file.replace('.md', '.html'))
// 		
// 	  });
// 	  
// 	  res.render('views/blog', {
// 	  	posts: posts
// 	  })
// 	});
// })


app.get('/bicis', (req, res) => {

	console.timestamp('>>>> start delay', 0);

	lista_estaciones = [];
	prediction_values = {};
	actual_values = {};

	// render `home.ejs` with the list of posts
	var url = "https://nextbike.net/maps/nextbike-official.json?city=532"

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

			const [someResult, anotherResult] = await Promise.all([queryPredictionValues("Today"), queryPredictionValues("Prediction")]);

			console.timestamp('>>>> second query ', 0);

			res.render('views/home', { 
				lat: lat, 
				lng: lng, 
				zoom: zoom, 
				data: data, 
				prediction: prediction_values, 
				actual: actual_values,
				available: available_bikes, 
				total: total_bikes})
		}
	})
})

var bigAssQuery = async function() {

	console.timestamp('>>>> first query ', 0);

	const [someResult, anotherResult] = await Promise.all([queryPredictionValues("Today"), queryPredictionValues("Prediction")]);

	console.timestamp('>>>> second query ', 0);

	res.render('home', { 
		lat: lat, 
		lng: lng, 
		zoom: zoom, 
		data: data, 
		prediction: prediction_values, 
		actual: actual_values})

}



var queryPredictionValues = function(typeOfQuery) {

	let promises = [];
	let recordNameSuffix = ""

	if (typeOfQuery === "Today") {
		recordNameSuffix += "_TODAY"
	}

	for(i in lista_estaciones) {

		promises.push(new Promise(function(resolve,reject){

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
								"recordName": lista_estaciones[i] + recordNameSuffix
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

				var b64 = body['records'][0]['fields']['values']['value']
				var decoded_data = new Buffer.from(b64, 'base64').toString('utf-8')


				if (typeOfQuery === "Prediction") {
					prediction_values[body['records'][0]['recordName'].replace('_TODAY', '')] = decoded_data
					resolve(prediction_values)

				} else {
					actual_values[body['records'][0]['recordName'].replace('_TODAY', '')] = decoded_data
					resolve(actual_values)
				}
			})
		}))
	}

	return Promise.all(promises)
}


module.exports = app


app.listen()