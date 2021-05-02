var app = angular.module("CabinetAdmin", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies']);

app.controller("CabinetAdminController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
    
    $scope.competitionId = competitionId
    $scope.Rleagues = {};

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }

    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        for(let l of $scope.leagues){
            $scope.Rleagues[l.id] = false;
        }
        console.log($scope.Rleagues)
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    $http.get("/api/competitions/" + competitionId + "/teams").then(function (response) {
        $scope.teams = response.data;
    })

    var showAllLeagues = true;
    $scope.refineName = "";
    $scope.refineCode = "";
    $scope.refineRegion = "";

    $scope.$watch('Rleagues', function (newValue, oldValue) {
        showAllLeagues = true
        //console.log(newValue)
        for (let league in newValue) {
            if (newValue.hasOwnProperty(league)) {
                if (newValue[league]) {
                    showAllLeagues = false
                    return
                }
            }
        }
    }, true);

    $scope.list_filter = function (value, index, array) {
        return (showAllLeagues || $scope.Rleagues[value.league])  && (~value.name.indexOf($scope.refineName)) && (~value.teamCode.indexOf($scope.refineCode)) && (~value.country.indexOf($scope.refineRegion))
    }
}])
