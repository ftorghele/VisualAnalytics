var config = require('./config.js');
var fs = require('fs');
var db = require("mongojs").connect(
    config.MONGODB_DB_URL
  , config.MONGODB_COLLECTIONS
);

var countries = {};

db.va.find({}).forEach(function(err, doc) {
  if (!doc) {
    for (var key in countries) {
      countries[key] = {
        avg_sentiment: countries[key].sentiment / countries[key].count
      , sentiment: countries[key].sentiment
      , sentiment_count: countries[key].count
      };
    }
    fs.writeFile(__dirname + '/data/countries.json', JSON.stringify(countries, null, 4), function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log("countries.json saved.");
      }
    }); 
    db.close();
    return;
  }
  if (doc.sentiment != 0) {
    if (countries[doc.country] != undefined) {
       countries[doc.country] = { sentiment: countries[doc.country].sentiment + doc.sentiment, count: countries[doc.country].count + 1 };
    } else {
      countries[doc.country] = { sentiment: doc.sentiment, count: 1 };
    }
  }
});


