var socket;
var app = angular.module("RunAdmin", ['ngTouch','ngAnimate', 'ui.bootstrap', 'ui.bootstrap.datetimepicker', 'pascalprecht.translate', 'ngCookies', 'ngFileUpload']);
app.controller('RunAdminController', ['$scope', '$http', '$log', '$location', 'Upload', function ($scope, $http, $log, $location, Upload) {
        $scope.competitionId = competitionId
        $scope.showTeam = true;



        updateRunList();
        launchSocketIo();

        var runListTimer = null;
        var runListChanged = false;


        function timerUpdateRunList() {
            if (runListChanged) {
                updateRunList();
                runListChanged = false;
                runListTimer = setTimeout(timerUpdateRunList, 1000 * 15);
            } else {
                runListTimer = null
            }
        }

        function launchSocketIo() {
            // launch socket.io
            socket = io({
                transports: ['websocket']
            }).connect(window.location.origin)
            socket.on('connect', function () {
                socket.emit('subscribe', 'runs/line/' + competitionId)
            })
            socket.on('changed', function () {
                runListChanged = true;
                if (runListTimer == null) {
                    updateRunList();
                    runListChanged = false;
                    runListTimer = setTimeout(timerUpdateRunList, 1000 * 15)
                }
            })
        }
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
            $scope.topComment = $scope.competition.name;
        })

        $http.get("/api/competitions/" + competitionId +
            "/line/teams").then(function (response) {
            $scope.teams = response.data
        })

        $http.get("/api/competitions/" + competitionId +
            "/line/rounds").then(function (response) {
            $scope.rounds = response.data
        })

        $http.get("/api/competitions/" + competitionId +
            "/line/fields").then(function (response) {
            $scope.fields = response.data
        })

        $http.get("/api/competitions/" + competitionId +
            "/Line/maps").then(function (response) {
            $scope.maps = response.data
        })

        $http.get("/api/teams/leagues/line/" + competitionId).then(function (response) {
            $scope.leagues = response.data
        })

        $scope.range = function (n) {
            arr = [];
            for (var i = 0; i < n; i++) {
                arr.push(i);
            }
            return arr;
        }

        $scope.addRun = function () {
            if ($scope.run === undefined ||
                $scope.run.round === undefined ||
                $scope.run.team === undefined ||
                $scope.run.map === undefined ||
                $scope.run.field === undefined) {
                return
            }

            var run = {
                round: $scope.run.round._id,
                team: $scope.run.team._id,
                field: $scope.run.field._id,
                map: $scope.run.map._id,
                competition: competitionId,
                startTime: $scope.startTime.getTime(),
                normalizationGroup: $scope.run.normalizationGroup
            }

            //console.log(run)

            $http.post("/api/runs/line", run).then(function (response) {
                console.log(response)
                updateRunList()
            }, function (error) {
                console.log(error)
                swal("Oops!", error.data.err, "error");
            })
        }

        $scope.selectAll = function () {
            angular.forEach($scope.runs, function (run) {
                if($scope.list_filter(run)) run.checked = true;
            });
        }

        $scope.removeSelectedRun = function () {
            var chk = [];
            angular.forEach($scope.runs, function (run) {
                if (run.checked) chk.push(run._id);
            });
            $scope.removeRun(chk.join(","));
        }

        $scope.removeRun = async function (runIds) {
            const {
                value: operation
            } = await swal({
                title: "Delete Run?",
                text: "Are you sure you want to remove the run?",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, delete it!",
                confirmButtonColor: "#ec6c62",
                input: 'text',
                inputPlaceholder: 'Enter "DELETE" here',
                inputValidator: (value) => {
                    return value != 'DELETE' && 'You need to type "DELETE" !'
                }
            })

            if (operation) {
                $http.delete("/api/runs/line/" + runIds).then(function (response) {
                    console.log(response)
                    updateRunList()
                }, function (error) {
                    console.log(error)
                })
            }


        }
        
        $scope.statusReset = async function (runIds) {
            const {
                value: operation
            } = await swal({
                title: "Reset Status?",
                text: "Are you sure you want to reset status?",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "Yes, reset it!",
                confirmButtonColor: "#ec6c62",
                input: 'text',
                inputPlaceholder: 'Enter "RESET" here',
                inputValidator: (value) => {
                    return value != 'RESET' && 'You need to write "RESET" !'
                }
            })

            if (operation) {
                $http.put("/api/runs/line/" + runIds,{status: 0}).then(function (response) {
                    console.log(response)
                    updateRunList()
                }, function (error) {
                    console.log(error)
                })
            }


        }
        
        var showAllRounds = true
        var showAllFields = true
        var showAllTeams = true
        $scope.teamName = ""

        $scope.$watch('Rrounds', function (newValue, oldValue) {
            showAllRounds = true
            //console.log(newValue)
            for (let round in newValue) {
                if (newValue.hasOwnProperty(round)) {
                    if (newValue[round]) {
                        showAllRounds = false
                        return
                    }
                }
            }
        }, true)
        $scope.$watch('Rfields', function (newValue, oldValue) {
            //console.log(newValue)
            showAllFields = true
            for (let field in newValue) {
                if (newValue.hasOwnProperty(field)) {
                    if (newValue[field]) {
                        showAllFields = false
                        return
                    }
                }
            }
        }, true)
        $scope.$watch('teamName', function (newValue, oldValue) {
            if (newValue == '') showAllTeams = true
            else showAllTeams = false
            return
        }, true)

        $scope.list_filter = function (value, index, array) {
            return (showAllRounds || $scope.Rrounds[value.round.name]) &&
                (showAllFields || $scope.Rfields[value.field.name]) && (showAllTeams || ~value.team.name.indexOf($scope.teamName))
        }
        
        function objectSort(object) {
        var sorted = {};
        var arr = [];
        for (key in object) {
            if (object.hasOwnProperty(key)) {
                arr.push(key);
            }
        }
        arr.sort();
        //arr.reverse();

        for (var i = 0; i < arr.length; i++) {
            sorted[arr[i]] = object[arr[i]];
        }
        return sorted;
    }


        function updateRunList() {
            $http.get("/api/competitions/" + competitionId +
                "/line/runs?normalized=true").then(function (response) {
                var runs = response.data;
                for (let run of runs) {
                    if (!run.team) {
                        run.team = {
                            'name': ""
                        };
                    }
                }
                $scope.runs = runs;
                if (!$scope.Rrounds && !$scope.Rfields) {
                    var rounds = {}
                    var fields = {}
                    for (var i = 0; i < $scope.runs.length; i++) {
                        try {
                            var round = $scope.runs[i].round.name
                            if (!rounds.hasOwnProperty(round)) {
                                rounds[round] = false
                            }
                        } catch (e) {

                        }

                        try {
                            var field = $scope.runs[i].field.name

                            if (!fields.hasOwnProperty(field)) {
                                fields[field] = false
                            }
                        } catch (e) {

                        }
                        $scope.runs[i].nlLiveVictimCount = $scope.runs[i].nl.liveVictim.filter(victim => victim.identified).length;
                        $scope.runs[i].nlDeadVictimCount = $scope.runs[i].nl.deadVictim.filter(victim => victim.identified).length;
                        $scope.runs[i].nlUnknownVictimCount = $scope.runs[i].nl.liveVictim.filter(victim => victim.found && !victim.identified).length + $scope.runs[i].nl.deadVictim.filter(victim => victim.found && !victim.identified).length;
                    }

                    $scope.Rrounds = objectSort(rounds)
                    $scope.Rfields = objectSort(fields)
                }
            })
        }

        $scope.go_sign = function (runid) {
            swal({
                title: "Go sign page?",
                text: "Are you sure you want to go sign page?  If you click 'GO', the signatures will remove.",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "GO!",
                confirmButtonColor: "#ec6c62"
            }).then((result) => {
                if (result.value) {
                    $scope.go('/line/sign/' + runid + '/');
                }
            })
        }


        $scope.go_scoreSheet2 = function (runid) {
          window.open("/api/runs/line/scoresheet2?run=" + runid,"_blank");
        };

        $scope.go_judge = function (runid) {
            swal({
                title: "Go judge page?",
                text: "Are you sure you want to go judge page?  If you click 'GO', the time and signatures will remove.",
                type: "warning",
                showCancelButton: true,
                confirmButtonText: "GO!",
                confirmButtonColor: "#ec6c62"
            }).then((result) => {
                if (result.value) {
                    $scope.go('/line/judge/' + runid + '/');
                }
            })
        }

        $scope.go_input = function (runid) {
            $scope.go('/line/input/' + runid + '/');
        }

        $scope.statusColor = function(status){
          switch(status){
            case 2:
                return "#81ecec";
            case 3:
              return "#fdcb6e";
            case 4:
              return "#ffadad";
            case 5:
              return "#f7ff94";
            case 6:
              return "#91ffb8";
            default:
              return "";
          }
        }

        
        $scope.set_kiosk = function (runid){
            $http.get("/api/kiosk/1/line_checkpoint/"+runid).then(function (response) {
                        
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
        }
        
        $scope.reset_kiosk = function (runid){
            $http.get("/api/kiosk/1/NA").then(function (response) {
                        
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
        }


        $scope.go = function (path) {
            path = path + '?return=' + window.location.pathname;
            window.location = path
        }

        $scope.format = "yyyy-MM-dd"


        var start = new Date(Date.now() + 1000 * 60 * 5)
        start.setMinutes(start.getMinutes() - start.getMinutes() % 5)
        start.setSeconds(0)
        start.setMilliseconds(0)


        $scope.startTime = start
        $scope.startDate = start

        $scope.startDatePopup = {
            opened: false
        }
        $scope.openStartDate = function () {
            $scope.startDatePopup.opened = true
        }
        $scope.updateStartTime = function () {
            $scope.startTime.setFullYear($scope.startDate.getFullYear())
            $scope.startTime.setMonth($scope.startDate.getMonth())
            $scope.startTime.setDate($scope.startDate.getDate())
            $scope.startTime.setSeconds(0)
            $scope.startTime.setMilliseconds(0)

            $scope.startDate.setHours($scope.startTime.getHours())
            $scope.startDate.setMinutes($scope.startTime.getMinutes())
            $scope.startDate.setSeconds(0)
            $scope.startDate.setMilliseconds(0)
        }


        var scoreSheetStart = new Date(Date.now())
        scoreSheetStart.setHours(0);
        scoreSheetStart.setMinutes(0)
        scoreSheetStart.setSeconds(0)
        scoreSheetStart.setMilliseconds(0)

        $scope.scoreSheetStartDateTime = scoreSheetStart

        $scope.scoreSheetStartDatePopup = {
          opened: false
        }
        $scope.openScoreSheetStartDate = function () {
          $scope.scoreSheetStartDatePopup.opened = true
        }

        var scoreSheetEnd = new Date(Date.now() + 1000 * 60 * 60 * 24)
        scoreSheetEnd.setHours(0);
        scoreSheetEnd.setMinutes(0)
        scoreSheetEnd.setSeconds(0)
        scoreSheetEnd.setMilliseconds(0)

        $scope.scoreSheetEndDateTime = scoreSheetEnd

        $scope.scoreSheetEndDatePopup = {
          opened: false
        }
        $scope.openScoreSheetEndDate = function () {
          $scope.scoreSheetEndDatePopup.opened = true
        };


        $scope.go_scoreSheetInTimeRange2 = function () {
          window.open("/api/runs/line/scoresheet2?competition=" + $scope.competitionId + "&startTime=" + $scope.scoreSheetStartDateTime.getTime()+ "&endTime=" + $scope.scoreSheetEndDateTime.getTime(), "_blank")
        };
        
        $scope.total = function (lops) {
          let count = 0;
          for(let i=0,l=lops.length;i<l;i++){
            count += lops[i];
          }
          return count;
        }

}])
    .directive("runsReadFinished", ['$timeout', function ($timeout) {
        return function (scope, element, attrs) {
            if (scope.$last) {
                $('.refine').css("visibility", "visible");
                $('.loader').remove();
            }
        }
    }])


$(window).on('beforeunload', function () {
    socket.emit('unsubscribe', 'competition/' + competitionId);
});
