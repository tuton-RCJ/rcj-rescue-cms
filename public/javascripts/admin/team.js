var app = angular.module("TeamAdmin", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("TeamAdminController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
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
    $scope.email = [""];
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

    $scope.teamCode = "";

    $scope.addTeam = function () {
        var team = {
            teamCode: $scope.teamCode,
            name: $scope.teamName,
            league: $scope.teamLeague,
            competition: competitionId,
            country: $scope.country,
            email : $scope.email
        };

        $http.post("/api/teams", team).then(function (response) {
            console.log(response)
            updateTeamList()
            Toast.fire({
                type: 'success',
                title: saved_mes
            })
        }, function (error) {
            console.log(error)
            Toast.fire({
                type: 'error',
                title: "ERROR",
                html: error.data.msg
            })
        })
    };

    $scope.addEmail = function(){
        $scope.email.push("");
    }

    $scope.addTeamEmail = function(team){
        team.email.push("");
    }


    $scope.edit = function (team) {
        team.edit = true;
    }

    $scope.update = function (team) {
        for(let m in team.email){
            console.log(team.email[m])
            if(!team.email[m]) team.email.splice(m,1);
        }
        $http.put("/api/teams/" + team.competition + "/" + team._id, team).then(function (response) {
            updateTeamList()
            Toast.fire({
                type: 'success',
                title: saved_mes
            })
            team.edit = false;
        }, function (error) {
            console.log(error)
            Toast.fire({
                type: 'error',
                title: "ERROR",
                html: error.data.message
            })
        })   
    }

    $scope.selectAll = function () {
        angular.forEach($scope.teams, function (team) {
            if($scope.list_filter(team)) team.checked = true;
        });
    }


    $scope.removeSelectedTeam = function () {
        var chk = [];
        angular.forEach($scope.teams, function (team) {
            if (team.checked) chk.push(team._id);
        });
        $scope.removeTeam(chk.join(","));
    }
    
    $scope.removeTeam = async function (teamId) {
            const {
                value: operation
            } = await swal({
                title: "Remove team?",
                text: "Are you sure you want to remove?",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Remove it!",
                confirmButtonColor: "#ec6c62",
                input: 'text',
                inputPlaceholder: 'Enter "DELETE" here',
                inputValidator: (value) => {
                    return value != 'DELETE' && 'You need to write "DELETE" !'
                }
            })

            if (operation) {
                $http.delete("/api/teams/" + teamId).then(function (response) {
                    console.log(response)
                    updateTeamList()
                }, function (error) {
                    console.log(error)
                })
            }


        }


    function updateTeamList() {
        $http.get("/api/competitions/" + competitionId +
            "/adminTeams").then(function (response) {
            $scope.teams = response.data;

            $scope.showCode = false;
            for(let t of $scope.teams){
                if(t.teamCode != ""){
                    $scope.showCode = true;
                    break;
                }
            }
        })
    }
    $scope.go = function (path) {
        window.location = path
    }

    $scope.goMyPage = function (team){
        window.open(`/mypage/${team._id}/${team.document.token}`, '_blank');
    }

    var showAllLeagues = true;
    $scope.refineName = "";
    $scope.refineCode = "";
    $scope.refineRegion = "";

    $scope.$watch('Rleagues', function (newValue, oldValue) {
        showAllLeagues = true
        //console.log(newValue)
        for (let league in newValue) {
            if (newValue.hasOwnProperty(league)) {
                if (newValue[league]) {
                    showAllLeagues = false
                    return
                }
            }
        }
    }, true);

    $scope.list_filter = function (value, index, array) {
        return (showAllLeagues || $scope.Rleagues[value.league])  && (~value.name.indexOf($scope.refineName)) && (~value.teamCode.indexOf($scope.refineCode)) && (~value.country.indexOf($scope.refineRegion))
    }
}])
