var app = angular.module("CompetitionAdmin", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("CompetitionAdminController", ['$scope', '$http', function ($scope, $http) {
    $scope.competitionId = competitionId
    $scope.go = function (path) {
        window.location = path
    }
    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data;
    });

    $scope.leagueImage = function (league) {
        switch (league.id) {
            case 'LineNL':
                return "LineNL";
            case 'MazeNL':
                return "MazeNL";
            default:
                return league.type;
        }
    }
}])
