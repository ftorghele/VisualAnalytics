var CountrySentiment = (function(data){
    var that = this;
    this.code = data.code;
    this.positive = 0;
    this.negative = 0;
    this.neutral = 0;

    var addPositive = function(positive){
        that.positive = positive;
    };

    var addNegative = function(negative){
        that.negative = negative;
    };

    var addNeutral = function(neutral){
        that.neutral = neutral;
    }

    this.addValue = function(data){
        if(data.sentiment === 0){addNeutral(data.sentiment)};
        if(data.sentiment >== 0){addPositive(data.sentiment)};
        if(data.sentiment <== 0){addNegative(data.sentiment)};
    }

    addValue(data);
})();

$(function () {
var width = "100%",
    height = "80%",
    max_sentiment = 0,
    min_sentiment = 0;


var countrySentimentArr = {};


var socket = io.connect();

socket.on("tweet", function(d){
  var data = JSON.parse(d);
  addSentiment(data);
  
  update();
})

var addSentiment = function(data){
    var countrySentiment
    if(countrySentimentArr[data.code]!==null){
        countrySentiment = countrySentimentArr[data.code];
        countrySentiment.addValue(data);
    } else {
        countrySentiment = new CountrySentiment(data);
    }
    
}

var update = function(){

}

var projection = d3.geo.mercator().translate([550, 300]).scale(100);

var path = d3.geo.path().projection(projection);

var svg = d3.select("#map").append("svg")
  .attr("width", width)
  .attr("height", height)
  .call(d3.behavior.zoom()
  .on("zoom", redraw))
  .append("g");


function redraw() {
  svg.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
}

queue()
  .defer(d3.json, "data/world-50m.json")
  .defer(d3.tsv, "data/world-country-names.tsv")
  .defer(d3.json, "data/countries.json")
  .await(ready);

function ready(error, world, names, sentiments) {

  var countries = topojson.object(world, world.objects.countries).geometries,
      neighbors = topojson.neighbors(world, countries),
      i = -1,
      n = countries.length;

  countries.forEach(function(d) {
    var countryName = names.filter(function(n) { return d.id == n.id; })[0];
    if (typeof countryName === "undefined"){
      d.name = "Undefined";
    } else {
      d.name = countryName.name;
      d.alpha2 = countryName.alpha2;
    }
    var countrySentiment = sentiments[d.alpha2];
    if (typeof countrySentiment === "undefined"){
      d.sentiment = "no sentiment data available";
      d.color = 0;
    } else {
      d.sentiment = "Tweets: " + countrySentiment.sentiment_count + " - Sentiment: " + countrySentiment.sentiment + " - AVG Sentiment: " + countrySentiment.avg_sentiment;
      d.color = countrySentiment.avg_sentiment;
      if (max_sentiment < countrySentiment.avg_sentiment) {
        max_sentiment = countrySentiment.avg_sentiment
      }
      if (min_sentiment > countrySentiment.avg_sentiment) {
        min_sentiment = countrySentiment.avg_sentiment
      }
    }
  });
  
  var country = svg.selectAll(".country").data(countries);

  country
   .enter()
    .insert("path")
    .attr("class", "country")
    .attr("title", function(d, i) { return d.name; })
    .attr("d", path)
    .attr("stroke", "black")
    .attr("stroke-width", "0.3")
    .attr("fill-opacity", function(d, i) { return ((d.color > 0)? (1/max_sentiment)*d.color : ((d.color < 0)? (1/min_sentiment)*d.color : 1)); })
    .style("fill", function(d, i) { return ((d.color > 0)? "#3c763d" : ((d.color < 0)? "#a94442" : "#ffffff")); });

  country
    .on("mousemove", function(d,i) {
      $("#infobox").html("<b>" + d.name + ":</b> " + d.sentiment);
    })
    .on("mouseout", function(d,i) {
      $("#infobox").html("<b>Info:</b> the map is drag and zoomable");
    });
console.log(max_sentiment + " " + min_sentiment);
}

});
