var app = angular.module("TCScoring", ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
app.controller('TCScoringController', ['$scope', '$uibModal', '$log', '$http', '$translate', function ($scope, $uibModal, $log, $http, $translate) {

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    let saved_mes;
    $translate('document.saved').then(function (val) {
        saved_mes = val;
    }, function (translationId) {
    // = translationId;
    });
    

    $scope.competitionId = competitionId;
    updateTeamList();

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    function updateTeamList() {
        $http.get(`/api/technicalChallenge/${competitionId}/${leagueId}`).then(function (response) {
            $scope.teams = response.data;
        })
    }

    $scope.update = function (id) {
        let data = $scope.teams.find(t => t._id == id);
        $http.put(`/api/technicalChallenge/${id}`, {score: data.score}).then(function (response) {
            Toast.fire({
                type: 'success',
                title: saved_mes
            })
        }, function (response) {
            Toast.fire({
                type: 'error',
                title: "Error: " + response.statusText,
                html: response.data.msg
            })
        });
    }

    $scope.go = function (path) {
        window.location = path
    }
}]);
