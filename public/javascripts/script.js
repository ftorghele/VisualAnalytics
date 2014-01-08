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

    var countrySentimentDict = {};
    var countrySentimentDictNumericKey = {};

    var socket = io.connect();

    socket.on("tweet", function(d){
      var data = JSON.parse(d);
      console.log(data);
      addSentiment(data);
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
      .await(ready);

    function ready(error, world) {
      var countries = topojson.object(world, world.objects.countries).geometries;
      var country = svg.selectAll(".country").data(countries);

      country
       .enter()
        .insert("path")
        .attr("class", "country")
        .attr("title", function(d, i) { return d.name; })
        .attr("d", path)
        .attr("stroke", "black")
        .attr("stroke-width", "0.3")
        .attr("fill-opacity", function(d, i) { return ((d.color > 0)? (1/maxSentiment)*d.color : ((d.color < 0)? (1/minSentiment)*d.color : 1)); })
        .style("fill", function(d, i) { return ((d.color > 0)? "#3c763d" : ((d.color < 0)? "#a94442" : "#ffffff")); });

      setInterval(function() {
        countries.forEach(function(d) {
          var country = countrySentimentDictNumericKey[d.id];
          if (typeof country === "undefined"){
            d.name = "Undefined";
            d.sentiment = "no sentiment data available";
            d.color = 0;
          } else {
            d.name = country.countryName;
            d.alpha2 = country.code;
            d.sentiment = "Tweets: " + country.count + " - AVG Sentiment: " + country.avg;
            d.color = country.avg;
          }
        });

        country
          .attr("fill-opacity", function(d, i) { return ((d.color > 0)? (1/maxSentiment)*d.color : ((d.color < 0)? (1/minSentiment)*d.color : 1)); })
          .style("fill", function(d, i) { return ((d.color > 0)? "#3c763d" : ((d.color < 0)? "#a94442" : "#ffffff")); });
      
      }, 1000);

      //var country = svg.selectAll(".country").data(countries);

      

      country
        .on("mousedown", function(d,i){
            $("#infobox").html("<b>" + d.name + ":</b> " +i ); //+" "+ JSON.stringify(countrySentimentDictNumericKey[i].countryName) );
        })
        .on("mousemove", function(d,i) {
           $("#infobox").html("<b>" + d.name + ":</b> " + d.sentiment);
        })
        .on("mouseout", function(d,i) {
          $("#infobox").html("<b>Info:</b> the map is drag and zoomable");
        });

    }

});
