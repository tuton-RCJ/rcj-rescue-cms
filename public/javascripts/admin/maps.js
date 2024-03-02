var app = angular.module("MapAdmin", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("MapAdminController", ['$scope', '$http', function ($scope, $http) {
    $scope.competitionId = competitionId

    

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
        $scope.league = response.data.leagues.find((l) => l.league == leagueId);
        updateMapList()
    })
    $scope.removeMap = function (map) {
        if (confirm("Are you sure you want to remove the map: " + map.name + '?')) {
            $http.delete("/api/maps/" + $scope.league.type + "/" + map._id).then(function (response) {
                console.log(response)
                updateMapList()
            }, function (error) {
                console.log(error)
            })
        }
    }

    function updateMapList() {
        $http.get("/api/competitions/" + competitionId +
            "/" + $scope.league.league + "/maps").then(function (response) {
            $scope.maps = response.data
        })
    }
    
    $scope.go = function (path) {
        window.location = path
    }
}])
