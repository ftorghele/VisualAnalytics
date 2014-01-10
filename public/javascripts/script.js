var maxSentiment    = 0,
    minSentiment    = 0,
    tweetCount      = 0,
    currentCountry = null,
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
        addCount(1);
        calcAvg();
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
      if(currentCountry == data.code){
        updateSmileyBox(countrySentimentDict[data.code]);
      }
      $("#tweet-stream").prepend("<b>Country: </b>"+ countryNameDict[data.code][1] +" Sentiment: "+data.sentiment+"<br/>");
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

    var updateSmileyBox = function(obj){
      $("#smiley-box").html("<b>Country: </b>" + obj.countryName + "<br><br><svg id='chart' width='250' height='250'></svg><br>neutral: <b>" + obj.neutral + " </b> - positive: <b>" + obj.positive + "</b> - negative: <b>" + obj.negative + "</b>");

      var cScale = d3.scale.linear().domain([0, obj.positive+obj.neutral+(obj.negative*-1)]).range([0, 2 * Math.PI]);
      data = [[0, obj.positive, "#3c763d"], [obj.positive, obj.positive+obj.neutral, "#ffffff"], [obj.positive+obj.neutral, obj.positive+obj.neutral+(obj.negative*-1), "#a94442"]]
      var vis = d3.select("#chart");

      var arc = d3.svg.arc()
        .innerRadius(60)
        .outerRadius(110)
        .startAngle(function(d){return cScale(d[0]);})
        .endAngle(function(d){return cScale(d[1]);});

      vis.selectAll("path")
        .data(data)
        .enter()
        .append("path")
        .attr("d", arc)
        .attr("stroke", "black")
        .attr("stroke-width", "0.3")
        .attr("class", "slice")
        .style("fill", function(d){return d[2];})
        .attr("transform", "translate(110,110)");
    }

    var clearTweets = function(){
      countrySentimentDict = {};
      countrySentimentDictNumericKey = {};
    }

    var projection = d3.geo.mercator().translate([370, 300]).scale(120);

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

    var setColor = function(country){
        country
          .attr("fill-opacity", 
            function(d, i) {
              var tmpCountry = countrySentimentDictNumericKey[d.id];
              if( tmpCountry !== undefined && $("#neu").hasClass("toggled") && tmpCountry.avg==0){return 1}
              if( !$("#pos").hasClass("toggled") && !$("#neg").hasClass("toggled") && !$("#neu").hasClass("toggled") ){return 1}
              return ((d.color > 0)? (1/maxSentiment)*d.color : ((d.color < 0)? (1/minSentiment)*d.color : 1)); })
          .style("fill", 
            function(d, i) {
              var tmpCountry = countrySentimentDictNumericKey[d.id];
              if(tmpCountry !== undefined && $("#neu").hasClass("toggled") && tmpCountry.avg==0){return "#31708f"}
              return ((d.color > 0 && $("#pos").hasClass("toggled")) ? "#3c763d" : ((d.color < 0 && $("#neg").hasClass("toggled")) ? "#a94442" : "#ffffff")); });
    }

    function ready(error, world) {
      var countries = topojson.object(world, world.objects.countries).geometries;
      var country = svg.selectAll(".country").data(countries);

      country
        .enter()
        .insert("path")
        .attr("name", worldCountryNames[country.id] )
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
            d.name = worldCountryNames[d.id];
            d.sentiment = "no sentiment data available";
            d.color = 0;
          } else {
            d.name = country.countryName;
            d.alpha2 = country.code;
            d.sentiment = "Tweets: " + country.count + " - AVG Sentiment: " + country.avg;
            d.color = country.avg;
          }
        });

        setColor(country);
      
      }, 1000);
      country
        .on("mousedown", function(d,i){
          if(countrySentimentDictNumericKey[d.id]===undefined){
          }else{
            currentCountry = countrySentimentDictNumericKey[d.id].code;
            updateSmileyBox(countrySentimentDictNumericKey[d.id]);
          }
        })
        .on("mousemove", function(d,i) {
           $("#infobox").html("<b>" + d.name + ":</b> " + d.sentiment);
        })
        .on("mouseout", function(d,i) {
          $("#infobox").html("<b>Info:</b> the map is drag and zoomable");
        });
    }

    $("button").click(function(){
      $(this).toggleClass("toggled");
    });

    $("#clear-btn").click(function(){
      clearTweets();
      $("#smiley-box").html("");
      $("#tweet-stream").html("");
    });

});
