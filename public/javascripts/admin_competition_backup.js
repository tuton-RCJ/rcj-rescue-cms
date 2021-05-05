var app = angular.module("AdminBackup", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("AdminBackupController", ['$scope', '$http', function ($scope, $http) {
    $scope.competitionId = competitionId

    $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })

    
    $scope.go = function (path) {
        window.location = path
    }
    
    $scope.exeBackup = function () {
        window.open('/api/backup/'+$scope.competitionId);
    }

}])
