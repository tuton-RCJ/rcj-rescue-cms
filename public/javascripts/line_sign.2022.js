// register the directive with your app module
var app = angular.module('ddApp', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
var marker = {};
var socket;
var txt_multi;
var txt_gap;
var txt_obstacle;
var txt_ramp;
var txt_intersection;
var txt_bump;
// function referenced by the drop target
app.controller('ddController', ['$scope', '$uibModal', '$log', '$timeout', '$http', '$translate', '$cookies',function ($scope, $uibModal, $log, $timeout, $http, $translate, $cookies) {

    var txt_cap_sign, txt_cref_sign, txt_ref_sign, txt_no_sign, txt_complete, txt_confirm;
    $translate('line.sign.cap_sign').then(function (val) {
        txt_cap_sign = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.sign.ref_sign').then(function (val) {
        txt_ref_sign = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.sign.cref_sign').then(function (val) {
        txt_cref_sign = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.sign.no_sign').then(function (val) {
        txt_no_sign = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.sign.complete').then(function (val) {
        txt_complete = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.sign.confirm').then(function (val) {
        txt_confirm = val;
    }, function (translationId) {
        // = translationId;
    });

    $translate('line.judge.js.multi').then(function (val) {
        txt_multi = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.judge.js.gap').then(function (val) {
        txt_gap = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.judge.js.obstacle').then(function (val) {
        txt_obstacle = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.judge.js.ramp').then(function (val) {
        txt_ramp = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.judge.js.intersection').then(function (val) {
        txt_intersection = val;
    }, function (translationId) {
        // = translationId;
    });
    $translate('line.judge.js.bump').then(function (val) {
        txt_bump = val;
    }, function (translationId) {
        // = translationId;
    });


    //$cookies.remove('sRotate')
    if($cookies.get('sRotate')){
        $scope.sRotate = Number($cookies.get('sRotate'));
    }
    else $scope.sRotate = 0;


    $scope.z = 0;

    // Scoring elements of the tiles
    $scope.stiles = [];
    // Map (images etc.) for the tiles
    $scope.mtiles = [];

    $scope.checkPointDistance = [];

    $scope.victim_list = [];
    $scope.LoPs = [];
    $scope.victimNL_G = 0;
    $scope.vittimNL_S = 0;
    $scope.misidentNL_C = 0;

    $scope.enableSign = [false,false,false];
    $scope.signData = [null,null,null];

    $scope.sum  = function(arr) {
        if(arr.length == 0) return 0;
        return arr.reduce(function(prev, current, i, arr) {
            return prev+current;
        });
    };


    if (typeof runId !== 'undefined') {
        $scope.runId = runId;
        loadNewRun();
    }

    (function launchSocketIo() {
        // launch socket.io
        socket = io(window.location.origin, {
            transports: ['websocket']
        });
        if (typeof runId !== 'undefined') {
            $scope.actualUsedDropTiles = 0;
            socket.emit('subscribe', 'runs/' + runId);

            socket.on('data', function (data) {
                //console.log(data);
                $scope.evacuationLevel = data.evacuationLevel;
                $scope.kitLevel = data.kitLevel;
                $scope.exitBonus = data.exitBonus;
                $scope.stiles = data.tiles;
                $scope.score = data.score;
                $scope.raw_score = data.raw_score;
                $scope.multiplier = data.multiplier;
                $scope.showedUp = data.showedUp;
                $scope.LoPs = data.LoPs;
                $scope.minutes = data.time.minutes;
                $scope.seconds = data.time.seconds;

                $scope.victim_list = data.rescueOrder;

                if(data.nl){
                    $scope.victimNL_G = data.nl.greenTape;
                    $scope.victimNL_S = data.nl.silverTape;
                    $scope.misidentNL_C = data.nl.misidentification;
                }
                

                $scope.checkPointDistance = [];
                let tmp = {
                    dis: 1,
                    status: $scope.showedUp,
                    point: 5*$scope.showedUp
                }
                $scope.checkPointDistance.push(tmp);
                let prevCheckPoint = 0;
                let j = 0;
                for(let i in $scope.stiles){
                    if($scope.stiles[i].isDropTile){
                        let tmp = {
                            dis: i - prevCheckPoint,
                            status: $scope.stiles[i].scoredItems[findItem("checkpoint",$scope.stiles[i].scoredItems)].scored,
                            point: (i - prevCheckPoint) * $scope.stiles[i].scoredItems[findItem("checkpoint",$scope.stiles[i].scoredItems)].scored * $scope.LoPsCountPoint($scope.LoPs[j])
                        }
                        $scope.checkPointDistance.push(tmp);
                        prevCheckPoint = i;
                        j++;
                    }
                }
                $scope.$apply();
                console.log("Updated view from socket.io");
            });
        }

    })();




    function loadNewRun() {
        $http.get("/api/runs/line/" + runId +
            "?populate=true").then(function (response) {
            console.log(response.data);
            $scope.LoPs = response.data.LoPs;
            $scope.evacuationLevel = response.data.evacuationLevel;
            $scope.kitLevel = response.data.kitLevel;
            $scope.exitBonus = response.data.exitBonus;
            $scope.field = response.data.field.name;
            $scope.score = response.data.score;
            $scope.raw_score = response.data.raw_score;
            $scope.multiplier = response.data.multiplier;
            $scope.showedUp = response.data.showedUp;
            $scope.started = response.data.started;
            $scope.round = response.data.round.name;
            $scope.team = response.data.team.name;
            $scope.league = response.data.team.league;
            $scope.competition = response.data.competition.name;
            $scope.competition_id = response.data.competition._id;
            // Verified time by timekeeper
            $scope.minutes = response.data.time.minutes;
            $scope.seconds = response.data.time.seconds;

            if(response.data.sign){
                $scope.cap_sig = response.data.sign.captain;
                $scope.ref_sig = response.data.sign.referee;
                $scope.refas_sig = response.data.sign.referee_as;
            }
            

            $scope.comment = response.data.comment;            

            // Scoring elements of the tiles
            $scope.stiles = response.data.tiles;
            for (let i = 0; i < response.data.tiles.length; i++) {
                console.log(response.data.tiles[i])
                if (response.data.tiles[i].isDropTile) {
                    $scope.actualUsedDropTiles++;
                    marker[i] = true;
                }
            }

            $scope.victim_list = response.data.rescueOrder;

            if(response.data.nl){
                $scope.victimNL_G = response.data.nl.greenTape;
                $scope.victimNL_S = response.data.nl.silverTape;
                $scope.misidentNL_C = response.data.nl.misidentification;
            }
            

            // Get the map
            $http.get("/api/maps/line/" + response.data.map +
                "?populate=true").then(function (response) {
                console.log(response.data);

                $scope.height = response.data.height;
                $timeout($scope.tile_size, 0);

                $scope.width = response.data.width;
                $scope.length = response.data.length;
                width = response.data.width;
                length = response.data.length;
                $scope.startTile = response.data.startTile;
                $scope.startTile2 = response.data.startTile2;
                $scope.numberOfDropTiles = response.data.numberOfDropTiles;;
                $scope.mtiles = {};
                var ntile = {
                        scored : false,
                        isDropTile : false
                    }

                // Get max victim count
                $scope.maxLiveVictims = response.data.victims.live;
                $scope.maxDeadVictims = response.data.victims.dead;

                $scope.mapIndexCount = response.data.indexCount;

                $scope.EvacuationAreaLoPIndex = response.data.EvacuationAreaLoPIndex;

                while($scope.stiles.length < response.data.indexCount){
                    $scope.stiles.push(ntile);
                }
                for (let i = 0; i < response.data.tiles.length; i++) {
                    $scope.mtiles[response.data.tiles[i].x + ',' +
                        response.data.tiles[i].y + ',' +
                        response.data.tiles[i].z] = response.data.tiles[i];
                }

                $scope.checkPointDistance = [];
                let tmp = {
                    dis: 1,
                    status: $scope.showedUp,
                    point: 5*$scope.showedUp
                }
                $scope.checkPointDistance.push(tmp);
                let prevCheckPoint = 0;
                let j = 0;
                for(let i in $scope.stiles){
                    if($scope.stiles[i].isDropTile && $scope.stiles[i].scoredItems.length){
                        let tmp = {
                            dis: i - prevCheckPoint,
                            status: $scope.stiles[i].scoredItems[findItem("checkpoint",$scope.stiles[i].scoredItems)].scored,
                            point: (i - prevCheckPoint) * $scope.stiles[i].scoredItems[findItem("checkpoint",$scope.stiles[i].scoredItems)].scored * $scope.LoPsCountPoint($scope.LoPs[j])
                        }
                        $scope.checkPointDistance.push(tmp);
                        prevCheckPoint = i;
                        j++;
                    }
                }

                $timeout($scope.tile_size, 0);
                $timeout($scope.tile_size, 500);
                //$timeout($scope.tile_size, 1000);
                $timeout($scope.tile_size, 1500);
                $timeout($scope.tile_size, 3000);

            }, function (response) {
                console.log("Error: " + response.statusText);
            });
        }, function (response) {
            console.log("Error: " + response.statusText);
            if (response.status == 401) {
                $scope.go('/home/access_denied');
            }
        });
    }

    function findItem(item,tile){
        for(let i=0;i<tile.length;i++){
            if(tile[i].item == item) return i;
        }
    }

    $scope.calc_victim_multipliers = function (type, effective, lop=-1){
        if(lop == -1) lop = $scope.LoPs[$scope.EvacuationAreaLoPIndex];
        let multiplier;
        if(type == "K"){
            if($scope.evacuationLevel == 1){
                if($scope.kitLevel == 1) multiplier = 1100;
                else multiplier = 1300;
            }else{
                if($scope.kitLevel == 1) multiplier = 1200;
                else multiplier = 1600;
            }
        }
        else if (!effective) return "----";
        else if ($scope.evacuationLevel == 1) { // Low Level
            multiplier = 1200;
        } else { // High Level
            multiplier = 1400;
        }

        if($scope.evacuationLevel == 1) multiplier = Math.max(multiplier - 25*lop,1000);
        else multiplier = Math.max(multiplier - 50*lop,1000);
        return "x" + String(multiplier/1000);
    };

    $scope.nlPoints = function(){
        return 15 * $scope.victimNL_S + 30 * $scope.victimNL_G - 5 * $scope.misidentNL_C;
    }


    $scope.LoPsCountPoint = function (n){
        if(n == 0) return 5;
        if(n == 1) return 3;
        if(n == 2) return 1;
        return 0;
    }

    $scope.checkTotal = function(){
        let ret = 0;
        for(let i in $scope.checkPointDistance){
            ret += $scope.checkPointDistance[i].point;
        }
        return ret;
    };

    $scope.exitBonusPoints = function(){
        if($scope.league == "LineNL"){
            return $scope.exitBonus * 30;
        }else{
            return $scope.exitBonus * Math.max(0,60-5*$scope.sum($scope.LoPs));
        } 
    };


    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }

    $scope.getOpacity = function (x, y) {
        var stackedTiles = 0;
        for (var z = 0; z < $scope.height; z++) {
            if ($scope.mtiles[x + ',' + y + ',' + z])
                stackedTiles++;
        }
        return 1.0 / stackedTiles;
    }

    $scope.getParam = function (key) {
        var str = location.search.split("?");
        if (str.length < 2) {
          return "";
        }

        var params = str[1].split("&");
        for (var i = 0; i < params.length; i++) {
          var keyVal = params[i].split("=");
          if (keyVal[0] == key && keyVal.length == 2) {
            return decodeURIComponent(keyVal[1]);
          }
        }
        return "";
    }

    $scope.go = function (path) {
        playSound(sClick);
        socket.emit('unsubscribe', 'runs/' + runId);
        window.location = path;
    }

    $scope.changeFloor = function (z){
        playSound(sClick);
        $scope.z = z;
        $timeout($scope.tile_size, 100);
        $timeout($scope.tile_size, 2000);
    }

    $scope.tileRot = function (r){
        playSound(sClick);
        $scope.sRotate += r;
        if($scope.sRotate >= 360)$scope.sRotate -= 360;
        else if($scope.sRotate < 0) $scope.sRotate+= 360;
        $timeout($scope.tile_size, 0);


        $cookies.put('sRotate', $scope.sRotate, {
          path: '/'
        });
    }

    $scope.totalNumberOf = function (objects) {
        return objects.gaps + objects.speedbumps + objects.obstacles +
            objects.intersections;
    }

    $scope.showElements = function (x, y, z) {
        var mtile = $scope.mtiles[x + ',' + y + ',' + z];
        var isDropTile = false;
        var stile = [];
        var stileIndex = [];

        // If this is not a created tile
        if (!mtile || mtile.index.length == 0)
            return;
        playSound(sClick);
        for (var i = 0; i < mtile.index.length; i++) {
            stile.push($scope.stiles[mtile.index[i]]);
            stileIndex.push(mtile.index[i])
            if ($scope.stiles[mtile.index[i]].isDropTile) {
                isDropTile = true;
            }
        }


        var total = (mtile.items.obstacles > 0 ||
          mtile.items.speedbumps > 0 ||
          mtile.tileType.gaps > 0 ||
          mtile.tileType.intersections > 0 ||
          mtile.tileType.seesaw > 0 ||
          undefined2false(mtile.items.rampPoints)) * mtile.index.length;

        // Add the number of possible passes for drop tiles
        if (isDropTile) {
            total = 0;
            for (let i = 0; i < stile.length; i++) {
                if (stileIndex[i] < $scope.mapIndexCount) {
                    total++;
                }
            }
        }


        if (total == 0) {
            return;
        } else if (total > 1) {
            // Show modal
            $scope.open(x, y, z);
            // Save data from modal when closing it
        } else if (total == 1) {
            /*
            if(stile[0].scoredItems.length == 1){
                return;
            }else{
                var selectableHtml = "";
                function itemPreCheck(item){
                    if(item.scored) return "checked";
                    return "";
                }
                for(let i=0; i<stile[0].scoredItems.length;i++){
                    if(stile[0].scoredItems[i].item != "checkpoint" || stile[0].isDropTile){
                        selectableHtml += '<input type="checkbox" id="element'+ i +'" ' + itemPreCheck(stile[0].scoredItems[i]) + ' disabled><label class="checkbox" for="element'+ i +'" onclick="playSound(sClick)"> ';
                        switch(stile[0].scoredItems[i].item){
                            case 'gap':
                                selectableHtml += txt_gap;
                                break;
                            case 'speedbump':
                                selectableHtml += txt_bump;
                                break;
                            case 'intersection':
                                selectableHtml += txt_intersection;
                                break;
                            case 'ramp':
                                selectableHtml += txt_ramp;
                                break;
                            case 'obstacle':
                                selectableHtml += txt_obstacle;
                                break;
                        }
                        selectableHtml += '</label><br>';                          }
                }
                async function getFormValues () {
                    const {value: formValues} = await swal({
                      title: txt_multi,
                      html:selectableHtml
                        ,
                      focusConfirm: false,
                      preConfirm: () => {
                        playSound(sClick);
                      }
                    })
                }

                getFormValues();

            }*/


        }
    }


    $scope.open = function (x, y, z) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/templates/line_view_modal.html',
            controller: 'ModalInstanceCtrl',
            size: 'lm',
            resolve: {
                mtile: function () {
                    return $scope.mtiles[x + ',' + y + ',' + z];
                },
                mtiles: function () {
                    return $scope.mtiles;
                },
                stiles: function () {
                    return $scope.stiles;
                },
                sRotate: function(){
                    return $scope.sRotate;
                },
                startTile: function(){
                    return $scope.startTile;
                },
                nineTile: function () {
                    var nine = []
                    if($scope.sRotate == 0){
                        nine[0] = $scope.mtiles[(x - 1) + ',' + (y - 1) + ',' + z];
                        nine[1] = $scope.mtiles[(x) + ',' + (y - 1) + ',' + z];
                        nine[2] = $scope.mtiles[(x + 1) + ',' + (y - 1) + ',' + z];
                        nine[3] = $scope.mtiles[(x - 1) + ',' + (y) + ',' + z];
                        nine[4] = $scope.mtiles[(x) + ',' + (y) + ',' + z];
                        nine[5] = $scope.mtiles[(x + 1) + ',' + (y) + ',' + z];
                        nine[6] = $scope.mtiles[(x - 1) + ',' + (y + 1) + ',' + z];
                        nine[7] = $scope.mtiles[(x) + ',' + (y + 1) + ',' + z];
                        nine[8] = $scope.mtiles[(x + 1) + ',' + (y + 1) + ',' + z];
                    }else if($scope.sRotate == 180){
                        nine[8] = $scope.mtiles[(x - 1) + ',' + (y - 1) + ',' + z];
                        nine[7] = $scope.mtiles[(x) + ',' + (y - 1) + ',' + z];
                        nine[6] = $scope.mtiles[(x + 1) + ',' + (y - 1) + ',' + z];
                        nine[5] = $scope.mtiles[(x - 1) + ',' + (y) + ',' + z];
                        nine[4] = $scope.mtiles[(x) + ',' + (y) + ',' + z];
                        nine[3] = $scope.mtiles[(x + 1) + ',' + (y) + ',' + z];
                        nine[2] = $scope.mtiles[(x - 1) + ',' + (y + 1) + ',' + z];
                        nine[1] = $scope.mtiles[(x) + ',' + (y + 1) + ',' + z];
                        nine[0] = $scope.mtiles[(x + 1) + ',' + (y + 1) + ',' + z];
                    }else if($scope.sRotate == 90){
                        nine[2] = $scope.mtiles[(x - 1) + ',' + (y - 1) + ',' + z];
                        nine[5] = $scope.mtiles[(x) + ',' + (y - 1) + ',' + z];
                        nine[8] = $scope.mtiles[(x + 1) + ',' + (y - 1) + ',' + z];
                        nine[1] = $scope.mtiles[(x - 1) + ',' + (y) + ',' + z];
                        nine[4] = $scope.mtiles[(x) + ',' + (y) + ',' + z];
                        nine[7] = $scope.mtiles[(x + 1) + ',' + (y) + ',' + z];
                        nine[0] = $scope.mtiles[(x - 1) + ',' + (y + 1) + ',' + z];
                        nine[3] = $scope.mtiles[(x) + ',' + (y + 1) + ',' + z];
                        nine[6] = $scope.mtiles[(x + 1) + ',' + (y + 1) + ',' + z];
                    }else if($scope.sRotate == 270){
                        nine[6] = $scope.mtiles[(x - 1) + ',' + (y - 1) + ',' + z];
                        nine[3] = $scope.mtiles[(x) + ',' + (y - 1) + ',' + z];
                        nine[0] = $scope.mtiles[(x + 1) + ',' + (y - 1) + ',' + z];
                        nine[7] = $scope.mtiles[(x - 1) + ',' + (y) + ',' + z];
                        nine[4] = $scope.mtiles[(x) + ',' + (y) + ',' + z];
                        nine[1] = $scope.mtiles[(x + 1) + ',' + (y) + ',' + z];
                        nine[8] = $scope.mtiles[(x - 1) + ',' + (y + 1) + ',' + z];
                        nine[5] = $scope.mtiles[(x) + ',' + (y + 1) + ',' + z];
                        nine[2] = $scope.mtiles[(x + 1) + ',' + (y + 1) + ',' + z];
                    }
                    return nine;
                },
                startTile2: function(){
                    return $scope.startTile2;
                }
            }
        }).closed.then(function (result) {

        });
    };

    $scope.success_message = function () {
        playSound(sInfo);
        swal({
            title: 'Recorded!',
            text: txt_complete,
            type: 'success'
        }).then((result) => {
            if (result.value) {
                if($scope.getParam('return')) $scope.go($scope.getParam('return'));
                else $scope.go("/line/" + $scope.competition_id);
            }
        })
        console.log("Success!!");
    }

    $scope.toggleSign = function(index){
        $scope.enableSign[index] = !$scope.enableSign[index];
        if(!$scope.enableSign[index]){
            let datapair;
            switch (index) {
                case 0:
                    datapair = $("#cap_sig").jSignature("getData", "svgbase64");
                    break;
                case 1:
                    datapair = $("#ref_sig").jSignature("getData", "svgbase64");
                    break;
                case 2:
                    datapair = $("#refas_sig").jSignature("getData", "svgbase64")
                    break;
            }
            $scope.signData[index] = "data:" + datapair[0] + "," + datapair[1];
        }else{
            if(!$scope.signData[index]) setTimeout(initSign,100,index);
        }
    }

    function initSign(index){
        switch (index) {
            case 0:
                $("#cap_sig").jSignature();
                break;
            case 1:
                $("#ref_sig").jSignature();
                break;
            case 2:
                $("#refas_sig").jSignature();
                break;
        }
    }

    $scope.clearSign = function(index){
        switch (index) {
            case 0:
                $("#cap_sig").jSignature("clear");
                break;
            case 1:
                $("#ref_sig").jSignature("clear");
                break;
            case 2:
                $("#refas_sig").jSignature("clear");
                break;
        }
        $scope.toggleSign(index);
    }

    $scope.send_sign = function () {
        playSound(sClick);
        var run = {}
        run.comment = $scope.comment;
        run.sign = {}
        var err_mes = ""
        if (!$scope.signData[0]) {
            err_mes += "[" + txt_cap_sign + "] "
        } else {
            run.sign.captain = $scope.signData[0]
        }

        if (!$scope.signData[1]) {
            err_mes += "[" + txt_ref_sign + "] "
        } else {
            run.sign.referee = $scope.signData[1]
        }

        if (!$scope.signData[2]) {
            err_mes += "[" + txt_cref_sign + "] "
        } else {
            run.sign.referee_as = $scope.signData[2]
        }


        if (err_mes != "") {
            playSound(sError);
            swal("Oops!", err_mes + txt_no_sign, "error");
            return;
        }
        playSound(sInfo);
        swal({
            title: "Finish Run?",
            text: txt_confirm,
            type: "warning",
            showCancelButton: true,
            confirmButtonText: "Yes, finish it!",
            confirmButtonColor: "#ec6c62"
        }).then((result) => {
            if (result.value) {
                console.log("STATUS UPDATED(4)")
                run.status = 4;
                $http.put("/api/runs/line/" + runId, run).then(function (response) {
                    setTimeout($scope.success_message, 500);
                }, function (response) {
                    playSound(sError);
                    swal("Oops", "We couldn't connect to the server! Please notice to system manager.", "error");
                    console.log("Error: " + response.statusText);
                });
            }
        })

    }

    function undefined2false(tmp) {
        if (tmp) return true;
        return false;
    }

    $scope.tile_size = function () {
        try {
            var b = $('.tilearea');
            //console.log('コンテンツ本体：' + b.height() + '×' + b.width());
            //console.log('window：' + window.innerHeight);
            if($scope.sRotate%180 == 0){
                var tilesize_w = ($('.tilearea').width() -2*width) / width;
                var tilesize_h = (window.innerHeight - 110) / length;
            }else{
                var tilesize_w = ($('.tilearea').width() - 2*length) / length;
                var tilesize_h = (window.innerHeight - 110) / width;
            }

            //console.log('tilesize_w:' + tilesize_w);
            //console.log('tilesize_h:' + tilesize_h);
            if (tilesize_h > tilesize_w) var tilesize = tilesize_w;
            else var tilesize = tilesize_h;
            $('tile').css('height', tilesize);
            $('tile').css('width', tilesize);
            $('.tile-image').css('height', tilesize);
            $('.tile-image').css('width', tilesize);
            $('.tile-font').css('font-size', tilesize - 10);
            $('.tile-font-1-25').css('font-size', tilesize / 3);
            $('.slot').css('height', tilesize);
            $('.slot').css('width', tilesize);
            $('.chnumtxt').css('font-size', tilesize / 6);
            $('.tile-point').css('font-size', tilesize/2 + "px");
            if($scope.sRotate%180 == 0){
                $('#wrapTile').css('width', (tilesize+3)*width);
            }else{
                $('#wrapTile').css('width', (tilesize+3)*length);
            }

            $('#card_area').css('height', (window.innerHeight - 130));
            if (b.height() == 0) $timeout($scope.tile_size, 500);
        } catch (e) {
            $timeout($scope.tile_size, 500);
        }
}

var currentWidth = -1;


$(window).on('load resize', function () {
    if (currentWidth == window.innerWidth) {
        return;
    }
    currentWidth = window.innerWidth;
    $scope.tile_size();

});


}]).directive("tileLoadFinished", ['$timeout', function ($timeout) {
    return function (scope, element, attrs) {
        if (scope.$last) {
            $timeout(function () {
                $scope.tile_size();
            }, 500);
            $timeout(function () {
                $scope.tile_size();
            }, 1000);
        }
    }
}]);


app.directive('tile', function () {
    return {
        scope: {
            tile: '='
        },
        restrict: 'E',
        templateUrl: '/templates/tile.html',
        link: function ($scope, element, attrs) {
            $scope.tilerotate = function (tilerot) {
                if(!tilerot)return $scope.$parent.sRotate;
                var ro = tilerot + $scope.$parent.sRotate;
                if(ro >= 360)ro -= 360;
                else if(ro < 0) ro+= 360;
                return ro;
            }
            $scope.tileNumber = function (tile) {
                $scope.tileN = 1;
                var ret_txt = "";
                if (!tile) return;

                var possible = 0;

                var count = function (list) {
                    for (var i = 0; i < list.length; i++) {
                        possible++;
                    }
                }
                count(tile.scoredItems.gaps);
                count(tile.scoredItems.seesaw);
                count(tile.scoredItems.speedbumps);
                count(tile.scoredItems.intersections);
                count(tile.scoredItems.obstacles);
                if (possible != 0) return;

                for (var i = 0; i < tile.index.length; i++) {
                    if (i != 0) ret_txt += ','
                    ret_txt += tile.index[i] + 1;
                }
                return ret_txt;
            }
            $scope.checkpointNumber = function (tile) {
                var ret_txt = "";
                if (!tile) return;
                for (var i = 0; i < tile.index.length; i++) {
                    if (marker[tile.index[i]]) {
                        var count = 0;
                        for (var j = 0; j < tile.index[i]; j++) {
                            if (marker[j]) count++;
                        }
                        count++;
                        if (ret_txt != "") ret_txt += '&'
                        ret_txt += count;
                    } else {
                        return ret_txt;
                    }
                }
                return ret_txt;
            }


            $scope.isDropTile = function (tile) {
                if (!tile || tile.index.length == 0)
                    return;
                return $scope.$parent.stiles[tile.index[0]].isDropTile;
            }

            function isStart(tile) {
                if (!tile)
                    return;
                return tile.x == $scope.$parent.startTile.x &&
                    tile.y == $scope.$parent.startTile.y &&
                    tile.z == $scope.$parent.startTile.z;
            }

            $scope.isStart = function (tile) {
                if (!tile)
                    return;
                return tile.x == $scope.$parent.startTile.x &&
                    tile.y == $scope.$parent.startTile.y &&
                    tile.z == $scope.$parent.startTile.z;
            }

            $scope.evacTapeRot = function (tile) {
                let rot = 0;
                if(tile.evacEntrance>=0){
                    rot = tile.evacEntrance;
                }else if(tile.evacExit>=0){
                    rot = tile.evacExit;
                }                
                rot += $scope.$parent.sRotate;
                return rot%360;
            }

            $scope.tileStatus = function (tile) {
                // If this is a non-existent tile
                if ((!tile || tile.index.length == 0) && !isStart(tile))
                    return;

                // If this tile has no scoring elements we should just return empty string
                if (tile.items.obstacles == 0 &&
                    tile.items.speedbumps == 0 &&
                    !tile.items.rampPoints &&
                    tile.tileType.gaps == 0 &&
                    tile.tileType.seesaw == 0 &&
                    tile.tileType.intersections == 0 &&
                    !$scope.$parent.stiles[tile.index[0]].isDropTile && !isStart(tile)
                ) {
                    return;
                }

                // Number of successfully passed times
                var successfully = 0;
                // Number of times it is possible to pass this tile
                var possible = 0;

                for(let i=0;i<tile.index.length;i++){
                    for(let j=0;j<$scope.$parent.stiles[tile.index[i]].scoredItems.length;j++){
                        if($scope.$parent.stiles[tile.index[i]].scoredItems[j].item == "checkpoint" && !$scope.$parent.stiles[tile.index[i]].isDropTile){

                        }else{
                            possible++;
                        }
                    }
                }

                for (var i = 0; i < tile.index.length; i++) {
                    for(let j = 0; j < $scope.$parent.stiles[tile.index[i]].scoredItems.length;j++){
                        if($scope.$parent.stiles[tile.index[i]].scoredItems[j].scored){
                            successfully++;
                        }
                    }
                }

                if ((possible > 0 && successfully == possible) ||
                    (isStart(tile) && $scope.$parent.showedUp))
                    return "done";
                else if (successfully > 0)
                    return "halfdone";
                else if (possible > 0 || (isStart(tile) && !$scope.$parent.showedUp))
                    return "undone";
                else
                    return "";
            }

            $scope.tilePoint = function (tile) {
                // If this is a non-existent tile
                if ((!tile || tile.index.length == 0) && !isStart(tile))
                    return -1;

                // If this tile has no scoring elements we should just return empty string
                if (tile.items.obstacles == 0 &&
                    tile.items.speedbumps == 0 &&
                    !tile.items.rampPoints &&
                    tile.tileType.gaps == 0 &&
                    tile.tileType.seesaw == 0 &&
                    tile.tileType.intersections == 0
                ) {
                    return -1;
                }

                // Number of successfully passed times
                var successfully = 0;

                for (var i = 0; i < tile.index.length; i++) {
                    for (let j=0; j<$scope.$parent.stiles[tile.index[i]].scoredItems.length;j++){
                        switch ($scope.$parent.stiles[tile.index[i]].scoredItems[j].item){
                            case "gap":
                                successfully += 10 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored;
                                break;
                            case "intersection":
                                successfully += 10 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored * $scope.$parent.stiles[tile.index[i]].scoredItems[j].count;
                                break;
                            case "obstacle":
                                successfully += 15 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored;
                                break;
                            case "speedbump":
                                successfully += 5 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored;
                                break;
                            case "ramp":
                                successfully += 10 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored;
                                break;
                            case "seesaw":
                                successfully += 15 * $scope.$parent.stiles[tile.index[i]].scoredItems[j].scored;
                                break;
                        }

                    }
                }
                return successfully;
            }

            $scope.rotateRamp = function (direction) {
                var ro;
                switch (direction) {
                    case "bottom":
                        ro = 0;
                        break;
                    case "top":
                        ro = 180;
                        break;
                    case "left":
                        ro = 90;
                        break;
                    case "right":
                        ro = 270;
                        break;
                }
                ro += $scope.$parent.sRotate;
                if(ro >= 360)ro-=360;
                else if(ro < 0)ro+=360;
                switch (ro) {
                    case 0:
                        return;
                    case 180:
                        return "fa-rotate-180";
                    case 90:
                        return "fa-rotate-90";
                    case 270:
                        return "fa-rotate-270";
                }
            }

        }
    };
});



app.controller('ModalInstanceCtrl', ['$scope', '$uibModalInstance', 'mtile', 'mtiles', 'stiles', 'nineTile', 'sRotate', 'startTile', 'startTile2', function ($scope, $uibModalInstance, mtile, mtiles, stiles, nineTile, sRotate,startTile,startTile2) {
    $scope.mtile = mtile;
    $scope.sRotate = sRotate;
    $scope.stiles = stiles;
    $scope.nineTile = nineTile;
    $scope.words = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth"];
    $scope.evacTapeRot = function (tile) {
        let rot = 0;
        if(tile.evacEntrance>=0){
            rot = tile.evacEntrance;
        }else if(tile.evacExit>=0){
            rot = tile.evacExit;
        }                
        rot += sRotate;
        return rot%360;
    }
    function dir2num(dir){
        switch (dir) {
            case "top":
            return 0;
            case "right":
            return 90;
            case "bottom":
            return 180;
            case "left":
            return 270;
        }
    }
    $scope.next = [];
    for(let i in mtile.next_dir){
        let nd = (dir2num(mtile.next_dir[i]) + sRotate) % 360;
        switch (nd) {
          case 0:
            $scope.next.top = mtile.index[i];
            break;
          case 90:
            $scope.next.right = mtile.index[i];
            break;
          case 180:
            $scope.next.bottom = mtile.index[i];
            break;
          case 270:
            $scope.next.left = mtile.index[i];
            break;
        }
    }

    $scope.dirStatus = function (tile) {
        if(tile.scoredItems.length == 0) return;

        // Number of successfully passed times
        var successfully = 0;
        // Number of times it is possible to pass this tile
        var possible = 0
        for(let i=0;i<tile.scoredItems.length;i++){
            if(tile.scoredItems[i].item == "checkpoint" && !tile.isDropTile){

            }else{
                possible++;
            }
        }

        for(let j = 0; j < tile.scoredItems.length;j++){
            if(tile.scoredItems[j].scored){
                successfully++;
            }
        }

        if (possible > 0 && successfully == possible)
            return "done";
        else if (successfully > 0)
            return "halfdone";
        else if (possible > 0)
            return "undone";
        else
            return "";
    }

    /*$scope.toggle_view = function (num) {
        playSound(sClick);
        try {
            var possible = 0
            for(let i=0;i<$scope.stiles[num].scoredItems.length;i++){
                if($scope.stiles[num].scoredItems[i].item == "checkpoint" && !$scope.stiles[num].isDropTile){

                }else{
                    possible++;
                }
            }
            if(possible == 1){
                return;
            }else{
                var selectableHtml = "";
                function itemPreCheck(item){
                    if(item.scored) return "checked";
                    return "";
                }
                for(let i=0; i<$scope.stiles[num].scoredItems.length;i++){
                    if( $scope.stiles[num].scoredItems[i].item != "checkpoint" ||  $scope.stiles[num].isDropTile){
                        selectableHtml += '<input type="checkbox" id="element'+ i +'" ' + itemPreCheck($scope.stiles[num].scoredItems[i]) + ' disabled><label class="checkbox" for="element'+ i +'" onclick="playSound(sClick)"> ';
                        switch($scope.stiles[num].scoredItems[i].item){
                            case 'gap':
                                selectableHtml += txt_gap;
                                break;
                            case 'speedbump':
                                selectableHtml += txt_bump;
                                break;
                            case 'intersection':
                                selectableHtml += txt_intersection;
                                break;
                            case 'ramp':
                                selectableHtml += txt_ramp;
                                break;
                            case 'obstacle':
                                selectableHtml += txt_obstacle;
                                break;
                        }
                        selectableHtml += '</label><br>';                    }
                }
                async function getFormValues () {
                    const {value: formValues} = await swal({
                      title: txt_multi,
                      html:selectableHtml,
                      focusConfirm: false,
                      preConfirm: () => {

                      }
                    })
                }

                getFormValues();
            }
            //$scope.stiles[num].scored = !$scope.stiles[num].scored;

        } catch (e) {

        }

    }*/

    $scope.tilerotate = function (tilerot) {
        if(!tilerot)return $scope.sRotate;
        var ro = tilerot + $scope.sRotate;
        if(ro >= 360)ro -= 360;
        else if(ro < 0) ro+= 360;
        return ro;
    }

     $scope.isDropTile = function (tile) {
        if (!tile || tile.index.length == 0)
            return;
        return $scope.stiles[tile.index[0]].isDropTile;
    }

    $scope.isStart = function (tile) {
        if (!tile)
            return;
        return tile.x == startTile.x &&
            tile.y == startTile.y &&
            tile.z == startTile.z;
    }

    $scope.rotateRamp = function (direction) {
        var ro;
        switch (direction) {
            case "bottom":
                ro = 0;
                break;
            case "top":
                ro = 180;
                break;
            case "left":
                ro = 90;
                break;
            case "right":
                ro = 270;
                break;
        }
        ro += $scope.sRotate;
        if(ro >= 360)ro-=360;
        else if(ro < 0)ro+=360;
        switch (ro) {
            case 0:
                return;
            case 180:
                return "fa-rotate-180";
            case 90:
                return "fa-rotate-90";
            case 270:
                return "fa-rotate-270";
        }
    }
    $scope.ok = function () {
        playSound(sClick);
        $uibModalInstance.close();
    };

}]);



$(window).on('beforeunload', function () {
    socket.emit('unsubscribe', 'runs/' + runId);
});


let lastTouch = 0;
document.addEventListener('touchend', event => {
    const now = window.performance.now();
    if (now - lastTouch <= 500) {
        event.preventDefault();
    }
    lastTouch = now;
}, true);


window.AudioContext = window.AudioContext || window.webkitAudioContext;
var context = new AudioContext();

var getAudioBuffer = function(url, fn) {
  var req = new XMLHttpRequest();
  req.responseType = 'arraybuffer';

  req.onreadystatechange = function() {
    if (req.readyState === 4) {
      if (req.status === 0 || req.status === 200) {
        context.decodeAudioData(req.response, function(buffer) {
          fn(buffer);
        });
      }
    }
  };

  req.open('GET', url, true);
  req.send('');
};

var playSound = function(buffer) {
  var source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.start(0);
};

var sClick,sError,sInfo;
window.onload = function() {
  getAudioBuffer('/sounds/click.mp3', function(buffer) {
      sClick = buffer;
  });
  getAudioBuffer('/sounds/error.mp3', function(buffer) {
      sError = buffer;
  });
  getAudioBuffer('/sounds/info.mp3', function(buffer) {
      sInfo = buffer;
  });
};
