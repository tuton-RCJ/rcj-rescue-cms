var app = angular.module("ReservationAdmin", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies','ui.select', 'ngSanitize', 'ngQuill']);

app.controller("ReservationAdminController", ['$scope', '$http', '$translate','$sce', function ($scope, $http, $translate, $sce) {
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

    
    $scope.competitionId = competitionId

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }

    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    $http.get("/api/competitions/" + competitionId + "/teams").then(function (response) {
        $scope.teams = response.data;
    })

    $scope.time = function(time){
        if(!time) return;
        let options = {weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric",timeZoneName:"short"};
        return(new Intl.DateTimeFormat(navigator.language, options).format(new Date(time).getTime()));
    }

    function updateList(){
        $http.get(`/api/reservation/config/${competitionId}/${resvId}`).then(function (response) {
            $scope.resv = response.data;
            //Check 1st lang
            for(let l of $scope.resv.languages){
                if(l.language == $scope.displayLang && l.enable) return;
            }
    
            //Set alternative lang
            for(let l of $scope.resv.languages){
                if(l.enable){
                    $scope.displayLang = l.language;
                    return;
                }
            }
        })
    }
    updateList();

    $scope.edit = function(slot){
        slot.edit = true;
    }

    $scope.teamFilter = function(value, index){
        if(!$scope.resv) return false;
        return !($scope.resv.slot.some(s => s.booked.some(b => b._id == value._id)))
    }

    $scope.save = function(slot){
        $http.put(`/api/reservation/admin/${competitionId}/${resvId}` , {
            slotId: slot.slotId,
            booked: slot.booked
        }).then(function (response) {
            Toast.fire({
                type: 'success',
                title: saved_mes
            })
            slot.edit = false;
        }, function (response) {
            Toast.fire({
                type: 'error',
                title: "Error: " + response.statusText,
                html: response.data.msg
            })
        });
    }

    $scope.langContent = function(data, target){
        if(!data) return;
        if(data[target]) return data[target];
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;        
        })[0][target]);

        return(data[target]);
    }

    socket = io(window.location.origin, {
        transports: ['websocket']
    });

    socket.emit('subscribe', `reservation/${resvId}`);

    socket.on('update', function () {
        updateList();
    });
    socket.on('disconnect', function() {
        socket.emit('subscribe', `reservation/${resvId}`);
    })

    $(window).on('beforeunload', function () {
        socket.emit('unsubscribe', `reservation/${resvId}`);
    });

    
}]);