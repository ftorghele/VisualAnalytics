var maxSentiment    = 0,
    minSentiment    = 0,
    tweetCount      = 0
    world_50m=null;

var CountrySentiment = function(data, countryInfo){
    var that = this;
    this.code = data.code;
    this.positive = 0;
    this.negative = 0;
    this.neutral = 0;
    this.alpha = 0;
    this.count = 0;
    this.avg = 0;
    this.numericCode = parseInt(countryInfo[0]);
    this.countryName = countryInfo[1];

    var addPositive = function(positive){
        that.positive += positive;
        addCount(1);
        calcAvg();
    };

    var addNegative = function(negative){
        that.negative += negative;
        addCount(1);
        calcAvg();
    };

    var addNeutral = function(neutral){
        that.neutral += 1;
    };

    var addCount = function(cnt){
        that.count += cnt;
    };

    var calcAvg = function() {
        that.avg = (that.positive + that.negative) / (that.count - that.neutral);
        if (that.avg > maxSentiment ){
            maxSentiment = that.avg;
        }
        if( that.avg < minSentiment ){
            minSentiment = that.avg;
        }
    }

    this.addValue = function(data){
        if(data.sentiment == 0){addNeutral(data.sentiment)}
        else if(data.sentiment > 0){addPositive(data.sentiment)}
        else if(data.sentiment < 0 ){addNegative(data.sentiment)}
    }

    this.addValue(data);
};


$(function () {
    var width = "100%",
        height = "80%";

   // world_50m = $.extend(true, {}, worldShape);
    world_50m = JSON.stringify(worldShape);
    var countrySentimentDict = {};
    var countrySentimentDictNumericKey = {};

    var socket = io.connect();

    socket.on("tweet", function(d){
      var data = JSON.parse(d);
      addSentiment(data);
      update();
    })

    var addSentiment = function(data){
        var countrySentiment =  countrySentimentDict[data.code];

        if(countrySentiment !== undefined){
            countrySentiment.addValue(data);
        } else {
            var cs = new CountrySentiment(data, countryNameDict[data.code]);
            countrySentimentDict[data.code] = cs;
            countrySentimentDictNumericKey[ parseInt(countryNameDict[data.code][0]) ] = cs;
        }
    }

    var update = function(){
        var countriesDict = {};

        for(var key in countrySentimentDict){
            //TODO: create real countriesDict dynamically!!
            countriesDict = {
                "MY": {
                    "avg_sentiment": 0.4475893166840097,
                    "sentiment": 6452,
                    "sentiment_count": 14415
                },
                "GB": {
                    "avg_sentiment": 0.5393266632585992,
                    "sentiment": 22155,
                    "sentiment_count": 41079
                },
                "ID": {
                    "avg_sentiment": 0.5104348939439205,
                    "sentiment": 23920,
                    "sentiment_count": 46862
                },
                "US": {
                    "avg_sentiment": 0.4419314237766505,
                    "sentiment": 34761,
                    "sentiment_count": 78657
                }
            }
        }

        //console.log(world_50m)
        
        queue()
          .defer(d3.json, JSON.parse(world_50m))
          .defer(d3.json, worldCountryNames)
          .defer(d3.json, countriesDict)
          .await(ready);
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
        .on("mousedown", function(d,i){
            $("#infobox").html("<b>" + d.name + ":</b> " +i ); //+" "+ JSON.stringify(countrySentimentDictNumericKey[i].countryName) );
        })
        // .on("mousemove", function(d,i) {
        //   $("#infobox").html("<b>" + d.name + ":</b> " + d.sentiment);
        // })
        .on("mouseout", function(d,i) {
          $("#infobox").html("<b>Info:</b> the map is drag and zoomable");
        });
    console.log(max_sentiment + " " + min_sentiment);

    }

});
