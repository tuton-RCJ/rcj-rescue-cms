var app = angular.module("RegistrationSettings", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies']);

app.controller("RegistrationSettingsController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
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
    
    $scope.competitionId = competitionId

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }

    $scope.deadline = function(unixTime){
        let d = new Date(unixTime * 1000);
        let options = { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",timeZoneName:"long" };
        return(new Intl.DateTimeFormat(navigator.language, options).format(d));
    }

    $scope.applicationEnabled = function (league){
        if(!league.enable) return(false);
        let now = Math.floor( new Date().getTime() / 1000 );
        if(league.deadline < now) return(false);
        return(true);
    }
    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        console.log($scope.leagues)
        $http.get("/api/competitions/" + competitionId + "/registration").then(function (response) {
            $scope.competition = response.data

            for(let r of $scope.competition.registration){
                r.deadlineW = new Date(r.deadline * 1000);
            }
            
            let addFlag = false;
            for(let l of $scope.leagues){
                if(! $scope.competition.registration.some(ap => ap.league === l.id)){
                    $scope.competition.registration.push({
                        league: l.id
                    })
                    addFlag = true;
                }
            }
            
            if(addFlag){
                console.log($scope.competition)
                $http.put("/api/competitions/" + $scope.competitionId + "/registration", $scope.competition).then(function (response) {
                    Toast.fire({
                        type: 'success',
                        title: saved_mes
                    })
                    $http.get("/api/competitions/" + competitionId + "/registration").then(function (response) {
                        $scope.competition = response.data
                        for(let r of $scope.competition.registration){
                            r.deadlineW = new Date(r.deadline * 1000);
                        }
                    });
                }, function (response) {
                    Toast.fire({
                        type: 'error',
                        title: "Error: " + response.statusText,
                        html: response.data.msg
                    })
                });
            }
            

        })
    })

    $scope.set = function(){
        let sendData = {
            registration: Array.from($scope.competition.registration),
            consentForm: $scope.competition.consentForm
        } 
        for(let r of sendData.registration){
            r.deadline = Math.round( r.deadlineW.getTime() / 1000 );
        }
        $http.put("/api/competitions/" + $scope.competitionId + "/registration", sendData).then(function (response) {
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

    $scope.deadlineColour = function(deadline){
        let today = new Date();
        let tomorrow = new Date();

        tomorrow.setDate(today.getDate() + 1);

        if(deadline > tomorrow) return '#bcffbc';
        if(deadline > today) return '#ffffc6';
        return '#ffcccc';
    }

    
}])
