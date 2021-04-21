var app = angular.module("top", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies']);

app.controller("topController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    const currentLang = $translate.proposedLanguage() || $translate.use();
    
    $scope.competitionId = competitionId;
    $scope.leagueId = leagueId;
    $scope.leagues = [];
    $scope.isFailed = false;
    $scope.isSuccess = false;
    $scope.isProcessing = false;

    $scope.go = function (path) {
        window.location = path
    }    
    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        let mt = $scope.leagues.find(l => l.id === leagueId);
        $scope.leagueName = mt.name;
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    $scope.submit = function () {
        $scope.isProcessing = true;
        const reg = /^[A-Za-z0-9]{1}[A-Za-z0-9_.-]*@{1}[A-Za-z0-9_.-]{1,}\.[A-Za-z0-9]{1,}$/;
        if (!reg.test($scope.mail)) {
            $scope.isFailed = true;
            $scope.isProcessing = false;
            return;
        }
        $http.post(`/api/registration/auth/${competitionId}/${leagueId}/${currentLang}`, {
          passCode: $scope.passCode,
          mail: $scope.mail
        }).then(function (response) {
          $scope.isSuccess = true;
          $scope.isFailed = false;
          $scope.isProcessing = false;
        }, function () {
          $scope.isFailed = true;
          $scope.isSuccess = false;
          $scope.isProcessing = false;
        })
      }
}])
