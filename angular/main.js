var myApp = angular.module('myApp', ['chart.js']);

myApp.service('dataService', function($http) {
    delete $http.defaults.headers.common['X-Requested-With'];
    this.getData = function(callbackFunc, params) {
        $http({
            method: 'POST',
            url: 'http://localhost:5000',
            data: JSON.stringify(params)
            // params: 'limit=10, sort_by=created:desc',
            // headers: {'Authorization': 'Token token=xxxxYYYYZzzz'}
        }).success(function(data){
            // With the data succesfully returned, call our callback
            // console.log(data)
            callbackFunc(data);
        }).error(function(data){
            console.log(data);
        });
     }
});

myApp.controller('autoRefreshController', function($scope, $interval, dataService) {
    
    $scope.data = null;
    var count = 0;
    var params = {'count':count};
    // $("[data-gracket]").gracket({
    //     src : TestData
    // });


    dataService.getData(function(dataResponse) {
        $scope.data = dataResponse;
        var pieLabels = [];
        var pieData = [];
        for(var k in dataResponse.results){
            var dic = dataResponse.results[k];
            pieLabels.push(dic.key);
            pieData.push(dic.value);
        }
        $scope.dat = pieData;
        $scope.labels = pieLabels;
        // $('.demo').bracket({
        //   init: singleElimination,
        //   skipSecondaryFinal: true
        // });
    }, params);
    count++;

    var auto = $interval(function() {
        console.log($scope.dat, $scope.labels);
        params = {'count':count};
        dataService.getData(function(dataResponse) {
            $scope.data = dataResponse;
            var pieLabels = [];
            var pieData = [];
            for(var k in dataResponse.results){
                var dic = dataResponse.results[k];
                pieLabels.push(dic.key);
                pieData.push(dic.value);
            }
            $scope.dat = pieData;
            $scope.labels = pieLabels;
            console.log(dataResponse);
            // $scope.labels = ["Download Sales", "In-Store Sales", "Mail-Order Sales"];
            // $scope.dat = [300, 500, 100];
            // console.log(dataResponse);
        }, params);
        count++;
    }, 4000);
    //This is use the custon method are used to stopTimer the timer when click on stop button.
    $scope.stopTimer = function() {
        if (angular.isDefined(auto)) {
          $interval.cancel(auto);
          auto = 0;
        }
    };
});

function power_of_2(n) {
 if (typeof n !== 'number') 
      return 'Not a number'; 

    return n && (n & (n - 1)) === 0;
}

function createBracket(results){
    var singleElimination = {};
    singleElimination['teams'] = [];
    for(var i=0;i<results.length/2;i++){
        singleElimination['teams'].push([results[2*i]['key'], results[2*i+1]['key']]);
    }
    // for()
    return singleElimination;
}