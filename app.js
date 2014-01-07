
/**
 * Module dependencies.
 */

var express = require('express');
var routes = require('./routes');
var http = require('http');
var path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

var config = require('./config.js');
var Twit = require('twit');
var io = require('socket.io');

//Start a Socket.IO listen
var sockets = io.listen(9000);
 
//Set the sockets.io configuration.
//THIS IS NECESSARY ONLY FOR HEROKU!
sockets.configure(function() {
  sockets.set('transports', ['xhr-polling']);
  sockets.set('polling duration', 10);
});

var twitter = new Twit({
    consumer_key: config.CONSUMER_KEY
  , consumer_secret: config.CONSUMER_SECRET
  , access_token: config.ACCESS_TOKEN
  , access_token_secret: config.ACCESS_TOKEN_SECRET
});

var stream = twitter.stream('statuses/filter', { track: [':)', ':(', ':D', ':p', 'xD', ':))', ':((', ':-)', ':-(', ":'(" ] });

sockets.sockets.on('connection', function(socket){
  stream.on('tweet', function (tweet) {
    if (tweet.text != null && tweet.place != null && tweet.place.country_code != null) {
      socket.emit("tweet", JSON.stringify({ text: tweet.text, country: tweet.place.country_code}) );  
    }
  });
});
