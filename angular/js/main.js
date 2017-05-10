var myApp = angular.module('myApp', ['chart.js','angular-d3-word-cloud','daterangepicker']);

myApp.service('dataService', function($http) {
    delete $http.defaults.headers.common['X-Requested-With'];
    this.getData = function(callbackFunc, params) {
        $http({
            method: 'POST',
            url: 'http://ec2-34-210-46-217.us-west-2.compute.amazonaws.com:8081/',
            data: JSON.stringify(params)
            // params: 'limit=10, sort_by=created:desc',
            // headers: {'Authorization': 'Token token=xxxxYYYYZzzz'}
        }).success(function(data, status, headers, config){
            // With the data succesfully returned, call our callback
            // console.log(config);
            callbackFunc(data);
        }).error(function(data){
            console.log(data);
        });
     }
});

myApp.controller('autoRefreshController', function($scope, $interval, dataService) {
    
    $scope.data = null;
    var count = 2;
    var params = {'count':count};
    $scope.date = {
        startDate: moment("2017-04-02"),
        endDate: moment("2017-05-02")
    };
    $scope.example14model = [];
    $scope.example14settings = {
        scrollableHeight: '200px',
        scrollable: true,
        enableSearch: true
    };
    $scope.example14data = [{
        "label": "Alabama",
            "id": "AL"
    }, {
        "label": "Alaska",
            "id": "AK"
    }, {
        "label": "American Samoa",
            "id": "AS"
    }];
    $scope.option = ['Bundesliga', 'La Liga', 'Ligue 1', 'MLS', 'Premier League', 'Serie A'];

    params['endDate'] = $scope.date.endDate.add(1,"days").format("YYYY-MM-DDTHH:mm:ss")
    params['startDate'] = $scope.date.startDate.format("YYYY-MM-DDTHH:mm:ss")
    params['leagues'] = $scope.option;

    dataService.getData(function(dataResponse) {
        $scope.data = dataResponse;
        var wordData = []

        for(var k in dataResponse.results){
            var dic = dataResponse.results[k];
            wordData.push({'text':dic.key.toString(), 'size':(dic.value > 30 ? 30 : dic.value)});
        }
        $scope.res = wordData;
        $scope.flare = dataResponse.sankey;
        $scope.tweets = dataResponse.tweets;
        $scope.stacked = dataResponse.stacked;
        $scope.places = dataResponse.places;

        console.log(dataResponse);


    }, params);
    count++;

    $scope.$watchGroup(['date','option'], function(newVal, oldVal) {
        console.log(newVal);
        if (newVal[0] === oldVal[0] && newVal[1] === oldVal[1])
          return;
        newDate = newVal[0];
        newLeagues = newVal[1];
        // console.log('New date set: ', newDate.endDate.format("MM/DD/YYYYTHH:mm:ss"));
        params['endDate'] = newDate['endDate'].format("YYYY-MM-DDTHH:mm:ss");
        params['startDate'] = newDate['startDate'].format("YYYY-MM-DDTHH:mm:ss");
        params['count'] = count;
        params['leagues'] = newLeagues;
        delete $scope.res;
        delete $scope.flare;
        delete $scope.tweets;
        delete $scope.stacked;
        delete $scope.places;
        dataService.getData(function(dataResponse) {
          $scope.data = dataResponse;
          var wordData = [];
          for(var k in dataResponse.results){
              var dic = dataResponse.results[k];
              wordData.push({text:dic.key, size:(dic.value > 30 ? 30 : dic.value)});
          }
          $scope.res = wordData;
          $scope.flare = dataResponse.sankey;
          $scope.tweets = dataResponse.tweets;
          $scope.stacked = dataResponse.stacked;
          $scope.places = dataResponse.places
          $scope.example13model = []; 
          $scope.example1model = []; 
          $scope.example1data = [ {id: 1, label: "David"}, {id: 2, label: "Jhon"}, {id: 3, label: "Danny"} ];
          $("#SunBurst").removeClass("active");  // this deactivates the home tab
          $("#Overview").addClass("active");

      }, params);
        count++;
    }, false);


});

myApp.directive('barsChart', function(){
    return {
        restrict: 'A',
        replace: false,

        link: function (scope, element, attrs) {
            scope.$watchCollection('places', function(newArray){

                d3.select(element[0]).selectAll("svg").remove();

                var svg = d3.select(element[0]).append("svg").attr("width",element.parent()[0].offsetWidth).attr("height",element.parent()[0].offsetWidth/2)
                var margin = {top: 10, right: 2, bottom: 15, left: 35},
                    width = +svg.attr("width") - margin.left - margin.right,
                    height = +svg.attr("height") - margin.top - margin.bottom;

                var x = d3.scaleBand().rangeRound([0, width]).padding(0.1),
                    y = d3.scaleLinear().rangeRound([height, 0]);

                var g = svg.append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                  var data = newArray.map(function(d) { return {'letter':d.key.toString(), 'frequency':d.value}});

                  console.log("data",data);

                  x.domain(data.map(function(d) { return d.letter; }));
                  y.domain([0, d3.max(data, function(d) { return d.frequency; })]);

                  // console.log(x.domain(), y.domain());

                  g.append("g")
                      .attr("class", "axis axis--x")
                      .attr("transform", "translate(0," + height + ")")
                      .call(d3.axisBottom(x));

                  g.append("g")
                      .attr("class", "axis axis--y")
                      .call(d3.axisLeft(y).ticks(10, "%"))
                    .append("text")
                      .attr("transform", "rotate(-90)")
                      .attr("y", 6)
                      .attr("dy", "0.71em")
                      .attr("text-anchor", "end")
                      .text("Frequency");

                  g.selectAll(".bar")
                    .data(data)
                    .enter().append("rect")
                      .attr("class", "bar")
                      .attr("x", function(d) { return x(d.letter); })
                      .attr("y", function(d) { return y(d.frequency); })
                      .attr("width", x.bandwidth())
                      .attr("height", function(d) { return height - y(d.frequency); })
                      .append("title")
                      .text(function(d) { return d.frequency });

            });
        } 
    };
});

myApp.directive('wordsCloud', function(){
    return {
        restrict: 'A',

        link: function(scope, ele, attrs){
            scope.$watchCollection("res", function(newArray, oldArray){

                var fill = d3.scaleOrdinal(d3.schemeCategory20);
                // console.log("cloud",ele.parent()[0]);

                d3.select(ele[0]).selectAll("svg").remove();


                var layout = d3.layout.cloud()
                    .words(newArray)
                    .padding(5)
                    .rotate(function() { return ~~(Math.random() * 5) * 23; })
                    .font("Impact")
                    // .size([440,220])
                    .size([ele.parent()[0].offsetWidth,ele.parent()[0].offsetWidth/2])
                    // .size([$("#pie").width(), $("#pie").height()+100])
                    .fontSize(function(d) { return d.size; })
                    .on("end", draw);

                layout.start();

                function draw(words) {
                  d3.select(ele[0]).append("svg")
                      .attr("width", layout.size()[0])
                      .attr("height", layout.size()[1])
                    .append("g")
                      .attr("transform", "translate(" + layout.size()[0] / 2 + "," + layout.size()[1] / 2 + ")")
                    .selectAll("text")
                      .data(words)
                    .enter().append("text")
                      .style("font-size", function(d) { return (d.size > 60 ? "60px" :d.size + "px"); })
                      .style("font-family", "Impact")
                      .style("fill", function(d, i) { return fill(i); })
                      .attr("text-anchor", "middle")
                      .attr("transform", function(d) {
                        return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
                      })
                      .text(function(d) { return d.text; });
                }
            });
        }
    };
});

myApp.directive("stackedBar", function(){
    return {
        restrict: 'A',
        scope: true,

        link: function(scope, ele, attrs){
            scope.$watchCollection("stacked", function(newArray){
                d3.select()
                d3.select(ele[0]).selectAll("svg").remove();
                var svg = d3.select(ele[0]).append("svg").attr("width",ele.parent()[0].offsetWidth).attr("height",ele.parent()[0].offsetWidth/2),
                    margin = {top: 20, right: 20, bottom: 30, left: 40},
                    width = +svg.attr("width") - margin.left - margin.right,
                    height = +svg.attr("height") - margin.top - margin.bottom,
                    g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

                var data = newArray;
                var x = d3.scaleBand()
                    .rangeRound([0, width])
                    .paddingInner(0.05)
                    .align(0.1);

                var y = d3.scaleLinear()
                    .rangeRound([height, 0]);

                var z = d3.scaleOrdinal(d3.schemeCategory20);

                  // console.log("stacked", data);

                  var keys = data.places.slice();

                  data = data.league;

                  data.sort(function(a, b) { return b.total - a.total; });
                  x.domain(data.map(function(d) { return d.league; }));
                  y.domain([0, d3.max(data, function(d) { return d.total; })]).nice();

                  // console.log(y.domain())
                  z.domain(keys);

                  g.append("g")
                    .selectAll("g")
                    .data(d3.stack().keys(keys)(data))
                    .enter().append("g")
                      .attr("fill", function(d) { return z(d.key); })
                    .selectAll("rect")
                    .data(function(d) { return d; })
                    .enter().append("rect")
                      .attr("x", function(d) { return x(d.data.league); })
                      .attr("y", function(d) { return y(d[1]); })
                      .attr("height", function(d) { return y(d[0]) - y(d[1]); })
                      .attr("width", x.bandwidth())
                      .append("title")
                      .text(function(d) { return d[1]-d[0]; });

                  g.append("g")
                      .attr("class", "axis")
                      .attr("transform", "translate(0," + height + ")")
                      .call(d3.axisBottom(x));

                  g.append("g")
                      .attr("class", "axis")
                      .call(d3.axisLeft(y).ticks(null, "s"))
                    .append("text")
                      .attr("x", 2)
                      .attr("y", y(y.ticks().pop()) + 0.5)
                      .attr("dy", "0.32em")
                      .attr("fill", "#000")
                      .attr("font-weight", "bold")
                      .attr("text-anchor", "start")
                      .text("Number of Tweets");

                  var legend = g.append("g")
                      .attr("font-family", "sans-serif")
                      .attr("font-size", 10)
                      .attr("text-anchor", "end")
                    .selectAll("g")
                    .data(keys.slice().reverse())
                    .enter().append("g")
                      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

                  legend.append("rect")
                      .attr("x", width - 19)
                      .attr("width", 19)
                      .attr("height", 19)
                      .attr("fill", z);

                  legend.append("text")
                      .attr("x", width - 24)
                      .attr("y", 9.5)
                      .attr("dy", "0.32em")
                      .text(function(d) { return d; });
            });
            
        }    
    };
});

myApp.directive('sunburstChart', function($compile){
    return {
        restrict: 'A',
        scope: true,

        link: function(scope, ele, attrs){
            scope.$watchCollection("flare", function(newArray, oldArray){
                // console.log(d3.sankey);
                // console.log("flare",newArray);
                

                console.log("sun",$('#Overview')[0].offsetWidth);
                var root = newArray;

                var width = $('#Overview')[0].offsetWidth,
                    height = $('#Overview')[0].offsetWidth/2,
                    radius = (Math.min(width, height) / 2) - 10;

                var b = {
                    w: width/10, h: width/20, s: width/200, t: width/60
                };

                var formatNumber = d3.format(",d");

                var x = d3.scaleLinear()
                    .range([0, 2 * Math.PI]);

                var y = d3.scaleSqrt()
                    .range([0, radius]);

                var color = d3.scaleOrdinal(d3.schemeCategory20);

                var partition = d3.partition();

                var arc = d3.arc()
                    .startAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x0))); })
                    .endAngle(function(d) { return Math.max(0, Math.min(2 * Math.PI, x(d.x1))); })
                    .innerRadius(function(d) { return Math.max(0, y(d.y0)); })
                    .outerRadius(function(d) { return Math.max(0, y(d.y1)); });

                d3.select(ele[0]).selectAll("svg").remove();
                initializeBreadcrumbTrail();

                var svg = d3.select(ele[0]).append("svg")
                    .attr("width", width)
                    .attr("height", height)
                  .append("g")
                    .attr("transform", "translate(" + width / 2 + "," + (height / 2) + ")");

                // d3.json("/mbostock/raw/4063550/flare.json", function(error, root) {
                  // if (error) throw error;
                  
                  root = d3.hierarchy(root);

                  // console.log(partition(root).descendants());
                  root.sum(function(d) { return d.size; });
                  svg.selectAll("path")
                      .data(partition(root).descendants())
                    .enter().append("path")
                      .attr("d", arc)
                      .style("fill", function(d) { return color(d.data.name); })
                      .on("click", click)
                    .append("title")
                      .text(function(d) { return d.data.name + "\n" + formatNumber(d.value); });
                  updateBreadcrumbs(getParents(root),root.value);
                // });
                function getParents(a){
                    var nodeArray = [a];
                    while(a.parent){
                        nodeArray.push(a.parent);
                        a = a.parent
                    }
                    return nodeArray.reverse();
                }

                function click(d) {
                    // var nodeArray = [];

                    updateBreadcrumbs(getParents(d), d.value);
                    // nodeArray.push(d);
                    // // while(d.parent !== null){
                    // //     nodeArray.push(d.parent);
                    // // }
                    // console.log(nodeArray);


                  svg.transition()
                      .duration(750)
                      .tween("scale", function() {
                        var xd = d3.interpolate(x.domain(), [d.x0, d.x1]),
                            yd = d3.interpolate(y.domain(), [d.y0, 1]),
                            yr = d3.interpolate(y.range(), [d.y0 ? 20 : 0, radius]);
                        return function(t) { x.domain(xd(t)); y.domain(yd(t)).range(yr(t)); };
                      })
                    .selectAll("path")
                      .attrTween("d", function(d) { return function() { return arc(d); }; });
                }

                d3.select(self.frameElement).style("height", height + "px");

                function initializeBreadcrumbTrail() {
                    // Add the svg area.
                    d3.select("#sequence").selectAll("svg").remove();
                    var trail = d3.select("#sequence").append("svg:svg")
                        .attr("width", width)
                        .attr("height", width/10)
                        .attr("id", "trail");
                    // Add the label at the end, for the percentage.
                    trail.append("svg:text")
                        .attr("id", "endlabel")
                        .style("fill", "#000");
                }

                function updateBreadcrumbs(nodeArray, percentageString) {
                    console.log(nodeArray);
                    // Data join; key function combines name and depth (= position in sequence).
                    var g = d3.select("#trail")
                        .selectAll("g")
                        .data(nodeArray, function(x) { return percentageString + x.data.name + x.depth; });
                    // console.log(g.enter());

                    // Add breadcrumb and label for entering nodes.
                    var entering = g.enter().append("svg:g");

                    entering.append("svg:polygon")
                        .attr("points", breadcrumbPoints)
                        .style("fill", function(x) { return color(x.data.name); });

                    entering.append("svg:text")
                        .attr("x", (b.w + b.t) / 2)
                        .attr("y", b.h / 2)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", "middle")
                        .text(function(x) { return x.data.name; });

                    entering.attr("transform", function(x, i) {
                        // console.log(d,i);
                        console.log(i);
                        return "translate(" + i* (b.w + b.s) + ", 0)";
                    });

                    // Set position for entering and updating nodes.
                    // g.attr("transform", function(x, i) {
                    //     // console.log(d,i);
                    //     console.log(i);
                    //     return "translate(" + i* (b.w + b.s) + ", 0)";
                    // });

                    // Remove exiting nodes.
                    g.exit().remove();

                    // Now move and update the percentage at the end.
                    d3.select("#trail").select("#endlabel")
                        .attr("x", (nodeArray.length + 0.5) * (b.w + b.s))
                        .attr("y", b.h / 2)
                        .attr("dy", "0.35em")
                        .attr("text-anchor", "middle")
                        .text(percentageString);

                    // Make the breadcrumb trail visible, if it's hidden.
                    d3.select("#trail")
                        .style("visibility", "");

                }

                function breadcrumbPoints(x, i) {
                    console.log(x);
                    var points = [];
                    points.push("0,0");
                    points.push(b.w + ",0");
                    points.push(b.w + b.t + "," + (b.h / 2));
                    points.push(b.w + "," + b.h);
                    points.push("0," + b.h);
                    if (i > 0) { // Leftmost breadcrumb; don't include 6th vertex.
                        points.push(b.t + "," + (b.h / 2));
                    }
                    return points.join(" ");
                }

                    // });
            });
        }
    };
});

// myApp.directive('AppController', ['$window', '$element', '$timeout', appController]);
