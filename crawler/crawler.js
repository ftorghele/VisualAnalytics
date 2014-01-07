var config = require('./config.js');
var fs = require("fs");
var csv = require("csv");
var Twit = require('twit');
var db = require("mongojs").connect(config.MONGODB_DB_URL, config.MONGODB_COLLECTIONS);

var dict = {};
var sentimentDict = {};

var twitter = new Twit({
  consumer_key: config.CONSUMER_KEY,
  consumer_secret: config.CONSUMER_SECRET,
  access_token: config.ACCESS_TOKEN,
  access_token_secret: config.ACCESS_TOKEN_SECRET
});

var area = ['-180', '-90', '180', '90'];
var stream = twitter.stream('statuses/filter', {
  locations: area
});

csv()
  .from.path(__dirname + '/data/slangdict.csv', { delimiter: ';' }).to.array(function (data) {
    for (var i = 0; i < data.length; i++) {
      dict[data[i][0]] = data[i][1];
    }

    fs.readFile(__dirname + '/data/subjclueslen.tff', 'utf-8', function (err, data) {
      var lines = data.trim().split('\n');
      var n = lines.length;
      for (var i = 0; i < n; i++) {
        var line = lines[i];
        var key = line.slice(line.indexOf("word1=") + 6, line.indexOf("pos1=") - 1);
        var value = line.slice(line.indexOf("priorpolarity=") + 14, line.length);
        sentimentDict[key] = value;
      }

      stream.on('tweet', function (tweet) {
        if (tweet.geo != null && tweet.text != null && tweet.place != null && tweet.place.country_code != null) {

          var slang = tweet.text.split(" ");
          var words = [];
          slang.forEach(function (value) {
            var word = value;
            for (var key in dict) {
              if (value == key) {
                word = dict[key];
                break;
              }
            }
            words.push(word);
          });

          var sentiment = 0;
          words.forEach(function (word) {
            for (var key in sentimentDict) {
              if (word == key) {
                var wordSentiment = sentimentDict[key];
                if (wordSentiment === "negative") {
                  sentiment -= 1;
                } else if (wordSentiment === "positive") {
                  sentiment += 1;
                }
                break;
              }
            }
          });

          if (sentiment != 0) {

            db.va.save({
              sentiment: sentiment,
              text: tweet.text,
              geo: tweet.geo,
              country: tweet.place.country_code
            }, function (err, saved) {
              if (err || !saved) {
                console.log("Tweet not saved");
              }
            });
          }
        }
      });
    });
  });

