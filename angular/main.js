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
            console.log(data)
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

    // dataService.getData(function(dataResponse) {
    //     $scope.data = dataResponse;
    // }, params);
    // count++;

    var auto = $interval(function() {
        params = {'count':count};
        dataService.getData(function(dataResponse) {
            $scope.data = dataResponse;
            console.log(dataResponse);
        }, params);
        count++;
    }, 3000);
    //This is use the custon method are used to stopTimer the timer when click on stop button.
    $scope.stopTimer = function() {
        if (angular.isDefined(auto)) {
          $interval.cancel(auto);
          auto = 0;
        }
    };
});