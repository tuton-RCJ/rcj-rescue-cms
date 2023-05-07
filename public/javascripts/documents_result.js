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

        $http.get(`/api/ranking/${competitionId}/${leagueId}/document`).then(function (response) {
            $scope.teams = response.data;

            $scope.blockTitle = {};
            for (let block of $scope.teams[0].details) {
                $scope.blockTitle[block.blockId] = getBlockTitle(block.blockId);
            }
        })
    })

    $scope.langContent = function(data, target){
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;
        })[0][target]);

        return(data[target]);
    }

    function getBlockTitle(blockId) {
        return $scope.langContent($scope.review.find(r => r._id == blockId).i18n, 'title');
    }

    $scope.activeSortKey = -2;
    $scope.changeSort = function(blockId){
        let s = function(a, b){
            if(blockId == -1){
                // total score
                return b.score - a.score;
            }else{
                return b.details.find(d => d.blockId == blockId).score - a.details.find(d => d.blockId == blockId).score;
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
        if($scope.activeSortKey == blockId){
            $scope.activeSortKey = -2;
        }else{
            $scope.teams.sort(s);
            $scope.activeSortKey =  blockId;
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
                        if(!question) continue;
                        if(question.type == "scale"){
                            if(cc != "") user.getRow(row).getCell(col).value = Number(cc);
                            col++;
                        }else if(question.type == "input"){
                            let d = document.createElement('div');
                            d.innerHTML = cc;
                            user.getRow(row).getCell(col).value = d.innerText;
                            col++;
                        }else if(question.type == "select"){
                            let val = question.i18n.find(i=>i.language == $scope.displayLang).options.find(o=>o.value == cc).text;
                            if(isNaN(Number(val))) user.getRow(row).getCell(col).value = val;
                            else user.getRow(row).getCell(col).value = Number(val);
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
    }
    
}]);
