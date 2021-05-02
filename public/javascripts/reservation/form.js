var app = angular.module("ResvForm", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies', 'ngSanitize']);

app.controller("ResvFormController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
    
    $scope.competitionId = competitionId;
    $scope.teamId = teamId;
    $scope.token = token;
    $scope.myBook = null;

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }
    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagueName = response.data.find(l => l.id === leagueId).name;
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    function updateList(){
        $http.get(`/api/reservation/book/${teamId}/${token}/${resvId}`).then(function (response) {
            $scope.resv = response.data;
            let booked = $scope.resv.slot.filter(s => s.myBooked);
            $scope.myBook = null;
            if(booked.length == 1){
                $scope.myBook = booked[0];
            }
        })
    }
    updateList();
    

    $scope.time = function(time){
        if(!time) return;
        let options = {weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric",timeZoneName:"short"};
        return(new Intl.DateTimeFormat(navigator.language, options).format(new Date(time).getTime()));
    }

    $scope.deadline = function(){
        if(!$scope.resv) return;
        let d = new Date($scope.resv.deadline);
        let options = { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",timeZoneName:"long" };
        return(new Intl.DateTimeFormat(navigator.language, options).format(d));
    }

    $scope.inDeadline = function(){
        if(!$scope.resv) return false;
        let d = new Date($scope.resv.deadline);
        return d > new Date();
    }

    $scope.book = function(slotId){
        $http.post(`/api/reservation/book/${teamId}/${token}/${resvId}` , {"slotId": slotId}).then(function (response) {
            Swal.fire(
                '予約完了!',
                '予約に成功しました',
                'success'
            )
            updateList();
        }, function (response) {
            Swal.fire(
                'Oops...',
                response.data.msg,
                'error'
            )
            updateList();
        });
    }

    $scope.cancel = function(slot){
        Swal.fire({
            title: '予約キャンセル?',
            html: `本当にこの予約をキャンセルしますか？この操作は取り消せません．<br><strong>開始時間: ${$scope.time(slot.start)}</strong>`,
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Calcel this booking',
            cancelButtonText: 'Keep this booking'
            }).then((result) => {
            if (result.value) {
                $http.post(`/api/reservation/cancel/${teamId}/${token}/${resvId}` , {"slotId": slot.slotId}).then(function (response) {
                    Swal.fire(
                        'キャンセル完了',
                        '予約をキャンセルしました．続けて，新しい予約を行ってください．',
                        'success'
                    )
                    updateList();
                }, function (response) {
                    Swal.fire(
                        'Oops...',
                        response.data.msg,
                        'error'
                    )
                    updateList();
                });
            }
        })

        
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
}])
