var app = angular.module("DocumentResult", ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
app.controller('DocumentResultController', ['$scope', '$uibModal', '$log', '$http', '$translate', '$sce', function ($scope, $uibModal, $log, $http, $translate, $sce) {

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

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;

    $scope.competitionId = competitionId;
    updateTeamList();

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $scope.Rleagues = {};
    $http.get("/api/teams/leagues").then(function (response) {
        $scope.leagues = response.data;

        for(let l of $scope.leagues){
            $scope.Rleagues[l] = false;
        }
    })


    function updateTeamList() {
        $http.get("/api/competitions/" + competitionId +
            "/teams/documents").then(function (response) {
            $scope.teams = response.data.filter(function(value) {
                return value.league == leagueId;
            });
            $scope.teams.sort(function(a, b) {
                if(!a.teamCode && !b.teamCode){
                    if (a.name > b.name) {
                        return 1;
                    } else {
                        return -1;
                    }
                }else{
                    if (a.teamCode > b.teamCode) {
                        return 1;
                    } else {
                        return -1;
                    }
                }
                
            });
            $scope.showCode = false;
        })
    }

    $http.get("/api/competitions/" + competitionId + "/documents/" + leagueId + "/review").then(function (response) {
        $scope.languages = response.data.languages;
        $scope.review = response.data.review;

        $scope.scaleBlock = [];
        $scope.blockTitle = [];
        for(let b in $scope.review){
            let blockFlag = false;
            for(let q of $scope.review[b].questions){
                if(q.type == 'scale'){
                    blockFlag = true;
                    break;
                }
            }
            if(blockFlag){
                $scope.scaleBlock.push(b)
                $scope.blockTitle.push($scope.langContent($scope.review[b].i18n ,'title'))
            }
        }

        $http.get("/api/document/reviews/" + competitionId).then(function (response) {
            $scope.reviewCommentsTeams = response.data.filter(function(value) {
                return value.team && value.team.league == leagueId;
            });

            $scope.rating=[];
            $scope.ratingFlag = [];
            if(!$scope.reviewCommentsTeams) return 0;
            for(let c of $scope.reviewCommentsTeams){
                let teamId = c.team._id;
                if(!$scope.rating[teamId]) $scope.rating[teamId] = [];
                for(let b in c.comments){
                    for(let q in c.comments[b]){
                        if(!$scope.review[b].questions[q]) continue;
                        if($scope.review[b].questions[q].type != 'scale' || isNaN(c.comments[b][q]) ) continue;
                        if(c.comments[b][q] == ''){
                            c.comments[b][q] = 0;
                        }
                        let r = Number(c.comments[b][q]);
                        if(!$scope.rating[teamId][b]) $scope.rating[teamId][b] = [];
                        if(!$scope.rating[teamId][b][q]) $scope.rating[teamId][b][q] = [];
                        $scope.rating[teamId][b][q].push(r);
                    }
                }
            }
        })

        //Check 1st lang
        for(let l of $scope.languages){
            if(l.language == $scope.displayLang && l.enable) return;
        }

        //Set alternative lang
        for(let l of $scope.languages){
            if(l.enable){
                $scope.displayLang = l.language;
                return;
            }
        }
    })

    $scope.langContent = function(data, target){
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;
        })[0][target]);

        return(data[target]);
    }

    const average = function(arr) {
        if (typeof arr !== 'object' || arr.length === 0) return false;

        var key, totalNumber = 0;
        for (key in arr) totalNumber = totalNumber + Number(arr[key]);

        return totalNumber / arr.length;
    };
    $scope.rateScoreAve = function(team, block, disp=0){
        if(!$scope.rating || !$scope.rating[team] || !$scope.rating[team][block]) return 0;
        let score = 0;
        for(let q of $scope.rating[team][block]){
            score += average(q)
        }
        if(disp){
            score = Math.round(score * 10**disp) / 10**disp;
        }
        return(score);
    }

    $scope.rateScoreTotal = function(team, disp=0){
        let score = 0;
        for(let b of $scope.scaleBlock){
            score += $scope.rateScoreAve(team, b);
        }
        if(disp){
            score = Math.round(score * 10**disp) / 10**disp;
        }
        return(score);
    }

    $scope.activeSortKey = -2;
    $scope.changeSort = function(block){
        let s = function(a, b){
            if(block == -1){
                return $scope.rateScoreTotal(b._id) - $scope.rateScoreTotal(a._id);
            }else{
                return $scope.rateScoreAve(b._id, block) - $scope.rateScoreAve(a._id, block);
            }
        }

        $scope.teams.sort(function(a, b) {
            if(!a.teamCode && !b.teamCode){
                if (a.name > b.name) {
                    return 1;
                } else {
                    return -1;
                }
            }else{
                if (a.teamCode > b.teamCode) {
                    return 1;
                } else {
                    return -1;
                }
            }
            
        });
        if($scope.activeSortKey == block){
            $scope.activeSortKey = -2;
        }else{
            $scope.teams.sort(s);
            $scope.activeSortKey =  block;
        }
    }

    $scope.go = function (path) {
        window.location = path
    }

    $scope.refineName = "";
    $scope.refineCode = "";
    $scope.refineRegion = "";

    $scope.list_filter = function (value, index, array) {
        return (~value.name.indexOf($scope.refineName)) && (~value.teamCode.indexOf($scope.refineCode)) && (~value.country.indexOf($scope.refineRegion))
    }

  
}]);
