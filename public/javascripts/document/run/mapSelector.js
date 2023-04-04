var app = angular.module("MapSelector", ['ngTouch','pascalprecht.translate', 'ngCookies','ngSanitize']);
app.controller("MapSelectorController", ['$scope', '$http', function ($scope, $http) {
    
    $scope.go = function (path) {
        window.location = path
    }

    $scope.selectedMap = null;
    $scope.movie = movie;
    $scope.rounds = round.split(',');
    $scope.createB = true;
    
    $http.get("/api/competitions/leagues/"+leagueId).then(function (response) {
        $scope.league = response.data
        $http.get("/api/competitions/" + competitionId + "/" + $scope.league.type + "/maps").then(function (response) {
            $scope.maps = response.data.filter(m=>maps.includes(m._id));
            console.log($scope.maps)
          })
    });

    $http.get("/api/competitions/" + competitionId +
            "/fields").then(function (response) {
            $scope.fields = response.data
            console.log($scope.fields)
        })

    $scope.select = function(num){
        $scope.selectedMap = num;
    }

    $http.get("/api/document/files/" + teamId + '/' + token).then(function (response) {
        $scope.uploaded = response.data;
    })

    $scope.checkUploaded = function(name){
        return($scope.uploaded.some((n) => new RegExp('^' + name + '\\.*').test(n)));
    }

    $scope.getVideoLink = function(path){
        return("/api/document/files/" + teamId + "/" + token + "/" + path);
    }

    $scope.getVideoList = function(name){
        let res = $scope.uploaded.filter(function(value) {
            return new RegExp('^' + name + '\\.*').test(value);
        });
        res.sort(function(first, second){
            if ( first.match(/.mp4/)) {
                return -1;
            }
            if ( second.match(/.mp4/)) {
                return -1;
            }
        });
        return res;
    }

    $scope.createRun = function(){
        $(window).scrollTop(0);
        $scope.createB = false;
        let runs = [];
        for(let r of $scope.rounds){
            var run = {
                round: r,
                field: $scope.fields[0]._id,
                map: $scope.maps[$scope.selectedMap]._id,
                startTime: new Date().getTime()
            }
            runs.push(run);
        }
        let data = {
            "team": teamId,
            "questionId": questionId,
            "runs": runs
        };        

        $http.post(`/api/runs/${$scope.league.type}/pre_recorded`, data).then(function (response) {
            location.reload();
        }, function (error) {
            console.log(error)
            swal("Oops!", error.data.err, "error");
        })
    }

    
}]);
