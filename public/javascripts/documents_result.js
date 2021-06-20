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

        let langConfirm = false;
        //Check 1st lang
        for(let l of $scope.languages){
            if(l.language == $scope.displayLang && l.enable){
                langConfirm = true;
                break;
            }
        }

        if(!langConfirm){
            //Set alternative lang
            for(let l of $scope.languages){
                if(l.enable){
                    $scope.displayLang = l.language;
                    break;
                }
            }
        }
        

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
                            continue;
                        }
                        let r = Number(c.comments[b][q]);
                        if(!$scope.rating[teamId][b]) $scope.rating[teamId][b] = [];
                        if(!$scope.rating[teamId][b][q]) $scope.rating[teamId][b][q] = [];
                        $scope.rating[teamId][b][q].push(r);
                    }
                }
            }
        })

        
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

    function teamSort(item1, item2){
        let team1 = $scope.teams.find(t=> t._id == item1.team._id);
        let team2 = $scope.teams.find(t=> t._id == item2.team._id);
        if(team1.teamCode > team2.teamCode) return 1;
        if(team1.teamCode < team2.teamCode) return -1;
        if(team1.name > team2.name) return 1;
        if(team1.name < team2.name) return -1;
    }

    $scope.downloadExcel = function(){
        $http.get("/api/competitions/" + competitionId +
            "/line/runs?populate=true").then(function (response) {
            let lineRuns = response.data;
            $http.get("/api/competitions/" + competitionId +
                "/maze/runs?populate=true").then(function (response) {
                let mazeRuns = response.data;

                let workbook = new ExcelJS.Workbook();
                workbook.creator = 'RCJ CMS';
                workbook.created = new Date();
                workbook.modified = new Date();

                let user = workbook.addWorksheet('Evaluation');

                user.getRow(1).getCell(1).value = $scope.competition.name;

                user.getColumn('B').width = 20;

                user.getRow(3).getCell(1).value = "Code";
                user.getRow(3).getCell(2).value = "Name";
                user.getRow(3).getCell(3).value = "Region";
                user.getRow(3).getCell(4).value = "User";
                

                $scope.reviewCommentsTeams.sort(teamSort)
                let row = 4;
                let col = 1;
                for(let r of $scope.reviewCommentsTeams){
                    let team = $scope.teams.find(t=>t._id == r.team._id);
                    user.getRow(row).getCell(1).value = team.teamCode;
                    user.getRow(row).getCell(2).value = team.name;
                    user.getRow(row).getCell(3).value = team.country;
                    user.getRow(row).getCell(4).value = r.reviewer?r.reviewer.username:r.name;
                    col = 5;
                    rNo = 0;
                    qNo = 0;
                    for(let c of r.comments){
                        qNo = 0;
                        for(let cc of c){
                            let question = $scope.review[rNo].questions[qNo];
                            if(question.type == "scale"){
                                user.getRow(row).getCell(col).value = Number(cc);
                                col++;
                            }else if(question.type == "run"){
                                let runs = lineRuns.filter(r=> r.team._id == team._id && question.runReview.map.includes(r.map._id) && question.runReview.round.includes(r.round._id))
                                for(let run of runs){
                                    user.getRow(row).getCell(col).value = Number(run.score);
                                    col++;
                                }
                                runs = mazeRuns.filter(r=> r.team._id == team._id && question.runReview.map.includes(r.map._id) && question.runReview.round.includes(r.round._id))
                                for(let run of runs){
                                    user.getRow(row).getCell(col).value = Number(run.score);
                                    col++;
                                }
                            }else if(question.type == "input"){
                                let d = document.createElement('div');
                                d.innerHTML = cc;
                                user.getRow(row).getCell(col).value = d.innerText;
                                col++;
                            }else{
                                user.getRow(row).getCell(col).value = cc;
                                col++;
                            }
                            
                            qNo ++;
                        }
                        rNo ++;
                    }
                    row++;
                }


                row = 2;
                col = 5;
                lastCol = 5;
                for(let b of $scope.review){
                    user.getRow(row).getCell(col).value = $sce.valueOf($scope.langContent(b.i18n, 'title'));
                    user.getRow(row).getCell(col).fill = {
                        type: 'pattern',
                        pattern:'solid',
                        fgColor: {argb: `${b.color}`}
                    };
                        
                    for(let q of b.questions){
                        user.getRow(row+1).getCell(col).value = $sce.valueOf($scope.langContent(q.i18n, 'question'));

                        if(q.type == "run"){
                            if(q.runReview.round.length > 1){
                                user.mergeCells(row+1,col,row+1,col+q.runReview.round.length-1);
                            }
                            col += q.runReview.round.length;
                            
                        }else{
                            col += 1;
                        }
                        
                        
                    }
                    if(lastCol != col-1)
                        user.mergeCells(row,lastCol,row,col-1);
                    lastCol = col;
                }

                //return;
                workbook.xlsx.writeBuffer( {
                    base64: true
                })
                .then( function (xls64) {
                    // build anchor tag and attach file (works in chrome)
                    var a = document.createElement("a");
                    var data = new Blob([xls64], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

                    var url = URL.createObjectURL(data);
                    a.href = url;
                    a.download = `${$scope.competition.name} - ${leagueId}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(function() {
                            document.body.removeChild(a);
                            window.URL.revokeObjectURL(url);
                        },
                        0);
                })
                .catch(function(error) {
                    console.log(error.message);
                });
            })
        })
        
    }
    
}]);
