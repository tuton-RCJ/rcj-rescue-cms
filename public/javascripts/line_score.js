var socket;

var app = angular.module("LineScore", ['ngTouch','datatables', 'ui.bootstrap', 'ngAnimate', 'pascalprecht.translate', 'ngCookies','ngSanitize']);
app.controller("LineScoreController", ['$scope', '$http', '$sce', function ($scope, $http, $sce) {
    console.log(UseRunsNumber);
    $scope.competitionId = competitionId

    $scope.showTeam = true;

    $scope.sortOrder = ['-score','time.minutes*60+time.seconds','-rescueOrder.length', 'nl.silverTape+nl.greenTape','LoPsNum'];
    $scope.go = function (path) {
        window.location = path
    }

    var runListTimer = null;
    var runListChanged = false;
    $scope.nowR = 4;
    $scope.top3 = true;
    $scope.time = 10;
    var inter;
    launchSocketIo()
    updateRunList(function () {
        setTimeout(function () {
            window.scrollTo(0, window.scrollY +
                document.getElementById("rank").getBoundingClientRect().top -
                50);
        }, 200)
    })
    /*if (get['autoscroll'] != undefined) {
        scrollpage()
    }*/

    $scope.comment = [];
    $scope.comment.top = "";
    $scope.comment.bottom = "The scores are based on the sum of all the run (the minimum score is not subtracted yet).";

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/competitions/leagues/" + league).then(function (response) {
        $scope.league = response.data
    })

    function updateTime(){
        $scope.time--;
        if($scope.time == 0){
            if($scope.top3){
                $scope.top3 = !$scope.top3;
                $scope.time = 10;
            }else{
                if(league === "NL"){
                    if($scope.nowR + 5 < $scope.RunsTop.length){
                        $scope.nowR += 6;
                        $scope.time = 10;
                    }else{
                        window.parent.iframeEnd();
                        clearInterval(inter);
                    }
                }else{
                    if($scope.nowR + 5 < $scope.RunsTop.length){
                        $scope.nowR += 6;
                        $scope.time = 10;
                    }else{
                        window.parent.iframeEnd();
                        clearInterval(inter);
                    }
                }
            }
        }
        $scope.$apply();
    }
    
    
    $scope.startSig = function(){
        inter = setInterval(updateTime, 1000);
    }


    

    function updateRunList(callback) {
        $http.get("/api/competitions/" + competitionId +
            "/line/runs?populate=true").then(function (response) {
            var runs = response.data

            for(let run of runs){
                try{
                    run.teamCode = run.team.teamCode;
                    run.teamName = run.team.name;

                }
                catch(e){

                }
            }



            //console.log(runs)

            $scope.Runs = []
            var TeamRuns = {}


            for (var i in runs) {
                var run = runs[i]
                run.LoPsNum = 0
                for (var j in run.LoPs) {
                    if (run.LoPs[j] == null) {
                        run.LoPs[j] = 0
                    }
                    run.LoPsNum += run.LoPs[j]
                }

                run.score = parseInt(run.score)
                run.time.minutes = parseInt(run.time.minutes)
                run.time.seconds = parseInt(run.time.seconds)

                if (run.status >= 2 || run.score != 0 || run.time.minutes != 0 ||
                    run.time.seconds != 0) {
                    //console.log(run)
                    if (run.team.league == league) {
                        if (TeamRuns[run.team._id] === undefined) {
                            TeamRuns[run.team._id] = {
                                team: {
                                    name: run.team.name,
                                    code: run.teamCode,
                                    name_only: run.teamName,
                                    teamCode: run.team.teamCode,
                                    league: run.team.league
                                },
                                runs: [run]
                            }
                        } else {
                            TeamRuns[run.team._id].runs.push(run)
                        }
                        var sum = sumBest(TeamRuns[run.team._id].runs)
                        TeamRuns[run.team._id].sumScore = sum.score
                        TeamRuns[run.team._id].sumTime = sum.time
                        TeamRuns[run.team._id].sumRescue = sum.rescued
                        TeamRuns[run.team._id].sumRescueNLS = sum.rescuedNLS
                        TeamRuns[run.team._id].sumRescueNLG = sum.rescuedNLG
                        TeamRuns[run.team._id].sumRescueNLMis = sum.rescueNLMis
                        TeamRuns[run.team._id].sumLoPs = sum.lops
                        TeamRuns[run.team._id].retired = sum.retired
                        if (run.status == 2 || run.status == 3) {
                            TeamRuns[run.team._id].isplaying = true
                            run.isplaying = true
                        }
                        $scope.Runs.push(run)

                    }
                }
            }
            //$scope.Runs.sort(sortRuns)

            $scope.RunsTop = []
            for (var i in TeamRuns) {
                var teamRun = TeamRuns[i]
                $scope.RunsTop.push({
                    team: teamRun.team,
                    score: teamRun.sumScore,
                    time: teamRun.sumTime,
                    rescuedVictims: teamRun.sumRescue,
                    rescuedNLS: teamRun.sumRescueNLS,
                    rescuedNLG: teamRun.sumRescueNLG,
                    rescueNLMis: teamRun.sumRescueNLMis,
                    LoPsNum: teamRun.sumLoPs,
                    retired: teamRun.retired,
                    isplaying: teamRun.isplaying,
                    teamCode : teamRun.teamCode
                })
            }
            $scope.RunsTop.sort(sortRuns)


            if (callback != null && callback.constructor == Function) {
                callback()
            }
            var now = new Date();
            $scope.updateTime = now.toLocaleString();
        })
    }


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
            socket.emit('subscribe', 'runs/line/'+ competitionId)
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

    function areKit(order) {
        console.log(order);
        for(let o of order){
            if(o.type == "K") return 1;
        }
        return 0;
    }

    function sumBest(runs) {
        if (runs.length == 1) {
            return {
                score: runs[0].score,
                time: runs[0].time,
                rescued: (runs[0].rescueOrder.length - areKit(runs[0].rescueOrder)),
                lops: runs[0].LoPsNum,
                rescuedNLS: runs[0].nl.silverTape,
                rescuedNLG: runs[0].nl.greenTape,
                rescueNLMis: runs[0].nl.misidentification
            }
        }

        runs.sort(sortRuns)

        let sum = {
            score: 0,
            time: {
                minutes: 0,
                seconds: 0
            },
            rescued: 0,
            rescuedNLS: 0,
            rescuedNLG: 0,
            rescueNLMis: 0,
            lops: 0
        }

        for (let i = 0; i < Math.min(UseRunsNumber, runs.length); i++) {
            sum.score += runs[i].score
            sum.time.minutes += runs[i].time.minutes
            sum.time.seconds += runs[i].time.seconds
            sum.rescued += (runs[i].rescueOrder.length - areKit(runs[i].rescueOrder));
            sum.rescuedNLS += runs[i].nl.silverTape;
            sum.rescuedNLG += runs[i].nl.greenTape;
            sum.rescueNLMis += runs[i].nl.misidentification;
            sum.lops += runs[i].LoPsNum
        }
        sum.time.minutes += Math.floor(sum.time.seconds/60);
        sum.time.seconds %= 60;

        return sum
    }


    function sortRuns(a, b) {
        //console.log(a);
        //console.log(b);
        if (a.score == b.score) {
            if (a.time.minutes < b.time.minutes) {
                return -1
            } else if (a.time.minutes > b.time.minutes) {
                return 1
            } else if (a.time.seconds < b.time.seconds) {
                return -1
            } else if (a.time.seconds > b.time.seconds) {
                return 1
            } else {
                return 0
            }
        } else {
            return b.score - a.score
        }
    }

    $scope.detail = function (row) {
        //console.log(row);
    }
}]);



// HAX
function scrollpage() {
    var i = 1,
        status = 0,
        speed = 1,
        period = 15

    function f() {
        window.scrollTo(0, window.scrollY +
            document.getElementById("allRuns").getBoundingClientRect().top -
            50 + i);
        if (status == 0) {
            i = i + speed;
            if (document.getElementById("allRuns").getBoundingClientRect().bottom <
                Math.max(document.documentElement.clientHeight, window.innerHeight ||
                    0)) {
                status = 1;
                return setTimeout(f, 1000);
            }
        } else {
            i = i - speed;
            if (document.getElementById("allRuns").getBoundingClientRect().top > 50) {
                status = 0;
                return setTimeout(f, 1000);
            }
        }
        setTimeout(f, period);
    }

    f();
}

$(window).on('beforeunload', function () {
    socket.emit('unsubscribe', 'runs/line');
});
