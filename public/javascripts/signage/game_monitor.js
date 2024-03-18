var app = angular.module('ddApp', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
var scp;

// function referenced by the drop target
app.controller('ddController', ['$scope', '$uibModal', '$log', '$timeout', '$http', '$cookies', function ($scope, $uibModal, $log, $timeout, $http, $cookies) {

    $scope.signageSrc = function(){
        return "/signage/display/" + sigId + "/" + grpId + "/" + competitionId;
    }
    $scope.selectfield = [];

    $scope.vet = 1;

    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
    })

    function getLeagueType(leagueId) {
        return $scope.leagues.find(l => l.id == leagueId).type;
    }

    $http.get("/api/competitions/" + competitionId +
        "/fields").then(function (response) {
        $scope.fields = response.data
    })

    $scope.getIframeSrc = function (field) {
        return `/signage/field/${competitionId}/${field._id}`;
    };

    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }

    $scope.go = function (path) {
        window.open(path)
    }

    function getGameList(league, fieldId, status) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `/api/runs/${league}/find/${competitionId}/${fieldId}/${status}`, false);
        xhr.send();
        let json = JSON.parse(xhr.response);
        json.map((j) => {
            j.league = league;
        })
        return json;
    }

    function getFieldOpen(field) {
        let gameList = getGameList('line', field._id, 2);
        gameList = gameList.concat(getGameList('maze', field._id, 2));
        gameList = gameList.concat(getGameList('line', field._id, 3));
        gameList = gameList.concat(getGameList('maze', field._id, 3));

        return gameList.length;
    }

    function check_selected_field() {
        let inProgressGames = 0;
        for (let i = 0; i < $scope.num; i++) {
            if (!$scope.selectfield[i]) return;
            inProgressGames += getFieldOpen($scope.selectfield[i]);
            if (inProgressGames != 0) break;
        }
        if (inProgressGames == 0 && sigId && grpId) {
            setTimeout(function () {
                $scope.showSignage = true;
                $scope.$apply();
            }, 5000);
        } else {
            $scope.showSignage = false;
            $scope.$apply();
        }
    }

    setInterval(check_selected_field, 10000);
}]);
