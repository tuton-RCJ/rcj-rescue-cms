var app = angular.module("Home", ['ngTouch','pascalprecht.translate', 'ngCookies','ngSanitize']);
app.controller("HomeController", ['$scope', '$http', function ($scope, $http) {
    
    $scope.go = function (path) {
        window.location = path
    }
    
    $http.get("/api/competitions").then(function (response) {
        $scope.competitions = response.data
    })
}]);
