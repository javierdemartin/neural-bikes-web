const express = require('express');
const app = express();
var handlebars = require('express-handlebars')
var path = require('path')


app.get('/_bicis', (req, res) => {

	console.log(">>>>>>>>>> GETING MAP")
	res.render("/bicis/views/index.html")
}


module.exports = app
