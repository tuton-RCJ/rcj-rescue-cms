// register the directive with your app module
var app = angular.module('ddApp', ['ngTouch', 'ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
var marker = {};
var socket;
// function referenced by the drop target
app.controller('ddController', ['$scope', '$uibModal', '$log', '$timeout', '$http', '$cookies', function ($scope, $uibModal, $log, $timeout, $http, $cookies) {

    $http.get(`/api/fields/${fieldId}`).then(function (response) {
        $scope.field = response.data;
    })

    $http.get(`/api/competitions/${competitionId}`).then(function (response) {
        $scope.competition = response.data;
    })

    function getGameList(league, status) {
        let xhr = new XMLHttpRequest();
        xhr.open("GET", `/api/runs/${league}/find/${competitionId}/${fieldId}/${status}`, false);
        xhr.send();
        let json = JSON.parse(xhr.response);
        json.map((j) => {
            j.league = league;
        })
        return json;
    }

    function sortGames(list, order = 1) {
        return list.sort(function(a, b) {
            if (a.startTime > b.startTime) {
              return 1 * order;
            } else {
              return -1 * order;
            }
        });
    }

    $scope.iframeUrl = null;
    $scope.nextGame = null;
    function update() {
        let gameList = getGameList('line', 2);
        gameList = gameList.concat(getGameList('maze', 2));
        gameList = sortGames(gameList, -1);
        
        if (gameList.length > 0) {
            let game = gameList[0];
            $scope.iframeUrl = `/${game.league}/view/${game._id}/iframe`;
            $scope.nextGame = null;
            return;
        }

        gameList = getGameList('line', 3);
        gameList = gameList.concat(getGameList('maze', 3));
        gameList = sortGames(gameList, -1);

        if (gameList.length > 0) {
            let game = gameList[0];
            $scope.iframeUrl = `/${game.league}/view/${game._id}/iframe`;
            $scope.nextGame = null;
            return;
        }

        $scope.iframeUrl = null;
        gameList = getGameList('line', 0);
        gameList = gameList.concat(getGameList('maze', 0));
        gameList = sortGames(gameList);

        if (gameList.length > 0) {
            $scope.nextGame = gameList[0];
            return;
        }
        $scope.nextGame = null;
    }

    update();

    setInterval(function () {
        update();
        $scope.$apply();
    }, 5000);
}])