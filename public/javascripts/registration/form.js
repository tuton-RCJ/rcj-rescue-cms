var app = angular.module("form", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies']);

app.controller("formController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
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
    $scope.isEmpty = false;
    $scope.isSuccess = false;
    $scope.isProcessing = false;
    $scope.teamName = "";
    $scope.region = "";

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
        if($scope.teamName == "" || $scope.region == ""){
          $scope.isEmpty = true;
          return;
        }else{
          $scope.isEmpty = false;
        }
        $scope.isProcessing = true;
        $http.post(`/api/registration/reg/${authId}/${token}/${currentLang}`, {
          teamName: $scope.teamName,
          region: $scope.region
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
