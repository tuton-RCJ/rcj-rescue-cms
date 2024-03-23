// register the directive with your app module
var app = angular.module('ddApp', ['ngTouch', 'ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);
var socket;

let maxKit = {};
// function referenced by the drop target
app.controller('ddController', ['$scope', '$uibModal', '$http', function ($scope, $uibModal, $http) {

    $scope.z = 0;
    $scope.dRunId = -1;

    $scope.countWords = ["Bottom", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Ninth"];

    var tick = function () {
        if ($scope.status == 2 && $scope.minutes < 8) {
            $scope.time += 1;
        }
    };
    setInterval(function () {
        $scope.$apply(tick);
    }, 1000);
    $scope.cells = {};
    $scope.tiles = {};
    setInterval(function () {
        $scope.get_field();
    }, 10000);

    socket = io(window.location.origin, {
        transports: ['websocket']
    });

    function launchSocketIo() {
        // launch socket.io
        socket.emit('subscribe', 'runs/' + runId);
        socket.on('data', function (data) {
            $scope.exitBonus = data.exitBonus;
            $scope.score = data.score;
            $scope.LoPs = data.LoPs;
            $scope.MisIdent = data.misidentification;
            $scope.status = data.status;

            // Verified time by timekeeper
            $scope.minutes = data.time.minutes;
            $scope.seconds = data.time.seconds;
            $scope.time = $scope.minutes * 60 + $scope.seconds;
            // Scoring elements of the tiles
            for (let i = 0; i < data.tiles.length; i++) {
                $scope.tiles[data.tiles[i].x + ',' +
                    data.tiles[i].y + ',' +
                    data.tiles[i].z] = data.tiles[i];
            }
            $scope.$apply();
            console.log("Updated view from socket.io");
        });
        socket.emit('subscribe', 'runs/map/' + runId);
        socket.on('mapChange', function (data) {
            $scope.getMap(data.newMap._id);
        });
    }


    function loadNewRun() {
        $http.get("/api/runs/maze/" + runId +
            "?populate=true").then(function (response) {

                $scope.exitBonus = response.data.exitBonus;
                $scope.field = response.data.field.name;
                $scope.round = response.data.round.name;
                $scope.score = response.data.score;
                $scope.team = response.data.team.name;
                $scope.league = response.data.team.league;
                $scope.competition = response.data.competition.name;
                $scope.competition_id = response.data.competition._id;
                $scope.LoPs = response.data.LoPs;
                $scope.status = response.data.status;
                $scope.MisIdent = response.data.misidentification;

                // Verified time by timekeeper
                $scope.minutes = response.data.time.minutes;
                $scope.seconds = response.data.time.seconds;
                $scope.time = $scope.minutes * 60 + $scope.seconds;
                $scope.cap_sig = response.data.sign.captain;
                $scope.ref_sig = response.data.sign.referee;
                $scope.refas_sig = response.data.sign.referee_as;

                // Scoring elements of the tiles
                $scope.tiles = [];
                for (let i = 0; i < response.data.tiles.length; i++) {
                    $scope.tiles[response.data.tiles[i].x + ',' +
                        response.data.tiles[i].y + ',' +
                        response.data.tiles[i].z] = response.data.tiles[i];
                }

                // Get the map
                $scope.getMap(response.data.map);
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
    }

    launchSocketIo();
    setInterval(launchSocketIo, 15000);
    loadNewRun();

    $scope.getMap = function (mapId) {
        $http.get("/api/maps/maze/" + mapId +
            "?populate=true").then(function (response) {
                console.log(response.data);
                $scope.startTile = response.data.startTile;
                $scope.height = response.data.height;
                $scope.width = response.data.width;
                $scope.length = response.data.length;

                $scope.leagueType = response.data.leagueType;
                if ($scope.leagueType == "entry") {
                    maxKit = {
                        'Red': 1,
                        'Green': 1
                    }
                } else {
                    maxKit = {
                        'H': 3,
                        'S': 2,
                        'U': 0,
                        'Red': 1,
                        'Yellow': 1,
                        'Green': 0
                    }
                }

                for (let i = 0; i < response.data.cells.length; i++) {
                    $scope.cells[response.data.cells[i].x + ',' +
                        response.data.cells[i].y + ',' +
                        response.data.cells[i].z] = response.data.cells[i];
                }

                width = response.data.width;
                length = response.data.length;
                height = response.data.height;
                if (height > 2) height = 2;
            }, function (response) {
                console.log("Error: " + response.statusText);
            });
    }

    $scope.range = function (n) {
        arr = [];
        for (let i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }


    $scope.isUndefined = function (thing) {
        return (typeof thing === "undefined");
    }


    $scope.tileStatus = function (x, y, z, isTile) {
        // If this is a non-existent tile
        var cell = $scope.cells[x + ',' + y + ',' + z];
        if (!cell)
            return;
        if (!isTile)
            return;

        if (!$scope.tiles[x + ',' + y + ',' + z]) {
            $scope.tiles[x + ',' + y + ',' + z] = {
                scoredItems: {
                    speedbump: false,
                    checkpoint: false,
                    ramp: false,
                    steps: false,
                    victims: {
                        top: false,
                        right: false,
                        left: false,
                        bottom: false,
                        floor: false
                    },
                    rescueKits: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        floor: 0
                    }
                }
            };
        }
        var tile = $scope.tiles[x + ',' + y + ',' + z];

        // Current "score" for this tile
        var current = 0;
        // Max "score" for this tile. Score is added 1 for every passed mission
        var possible = 0;


        if (cell.tile.speedbump) {
            possible++;
            if (tile.scoredItems.speedbump) {
                current++;
            }
        }
        if (cell.tile.checkpoint) {
            possible++;
            if (tile.scoredItems.checkpoint) {
                current++;
            }
        }
        if (cell.tile.ramp) {
            possible += 1;
            if (tile.scoredItems.ramp) {
                current++;
            }
        }
        if (cell.tile.steps) {
            possible++;
            if (tile.scoredItems.steps) {
                current++;
            }
        }
        if (cell.tile.victims.top != "None") {
            possible++;
            current += tile.scoredItems.victims.top;
            possible += maxKit[cell.tile.victims.top];
            current += Math.min(tile.scoredItems.rescueKits.top, maxKit[cell.tile.victims.top]);
        }
        if (cell.tile.victims.left != "None") {
            possible++;
            current += tile.scoredItems.victims.left;
            possible += maxKit[cell.tile.victims.left];
            current += Math.min(tile.scoredItems.rescueKits.left, maxKit[cell.tile.victims.left]);
        }
        if (cell.tile.victims.right != "None") {
            possible++;
            current += tile.scoredItems.victims.right;
            possible += maxKit[cell.tile.victims.right];
            current += Math.min(tile.scoredItems.rescueKits.right, maxKit[cell.tile.victims.right]);
        }
        if (cell.tile.victims.bottom != "None") {
            possible++;
            current += tile.scoredItems.victims.bottom;
            possible += maxKit[cell.tile.victims.bottom];
            current += Math.min(tile.scoredItems.rescueKits.bottom, maxKit[cell.tile.victims.bottom]);
        }
        if (cell.tile.victims.floor != "None") {
            possible++;
            current += tile.scoredItems.victims.floor;
            possible += maxKit[cell.tile.victims.floor];
            current += Math.min(tile.scoredItems.rescueKits.floor, maxKit[cell.tile.victims.floor]);
        }



        if (tile.processing)
            return "processing";
        else if (current > 0 && current == possible)
            return "done";
        else if (current > 0)
            return "halfdone";
        else if (possible > 0)
            return "undone";
        else
            return "";
    }

    $scope.cellClick = function (x, y, z, isWall, isTile) {
        var cell = $scope.cells[x + ',' + y + ',' + z];
        if (!cell)
            return;
        if (!isTile)
            return;

        var hasVictims = (cell.tile.victims.top != "None") ||
            (cell.tile.victims.right != "None") ||
            (cell.tile.victims.bottom != "None") ||
            (cell.tile.victims.left != "None") ||
            (cell.tile.victims.floor != "None");
        // Total number of scorable things on this tile
        var total = !!cell.tile.speedbump + !!cell.tile.checkpoint + !!cell.tile.steps + cell.tile.ramp + hasVictims;

        if (total > 1 || hasVictims) {
            // Open modal for multi-select
            $scope.open(x, y, z);
        }

    };

    $scope.tilePoint = function (x, y, z, isTile) {
        // If this is a non-existent tile
        var cell = $scope.cells[x + ',' + y + ',' + z];
        var victimPoint = cell.isLinear ? 10 : 30;

        if (!cell)
            return;
        if (!isTile)
            return;

        if (!$scope.tiles[x + ',' + y + ',' + z]) {
            $scope.tiles[x + ',' + y + ',' + z] = {
                scoredItems: {
                    speedbump: false,
                    checkpoint: false,
                    ramp: false,
                    victims: {
                        top: false,
                        right: false,
                        left: false,
                        bottom: false,
                        floor: false
                    },
                    rescueKits: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                        floor: 0
                    }
                }
            };
        }
        var tile = $scope.tiles[x + ',' + y + ',' + z];

        // Current "score" for this tile
        var current = 0;


        if (cell.tile.speedbump) {
            if (tile.scoredItems.speedbump) {
                current += 5;
            }
        }
        if (cell.tile.checkpoint) {
            if (tile.scoredItems.checkpoint) {
                current += 10;
            }
        }
        if (cell.tile.ramp) {
            if (tile.scoredItems.ramp) {
                current += 10;
            }
        }
        if (cell.tile.steps) {
            if (tile.scoredItems.steps) {
                current += 5;
            }
        }
        switch (cell.tile.victims.top) {
            case 'H':
                current += victimPoint * tile.scoredItems.victims.top;
                current += 10 * Math.min(tile.scoredItems.rescueKits.top, 3);
                break;
            case 'S':
                current += victimPoint * tile.scoredItems.victims.top;
                current += 10 * Math.min(tile.scoredItems.rescueKits.top, 2);
                break;
            case 'Red':
            case 'Yellow':
                current += (victimPoint * tile.scoredItems.victims.top / 2);
                current += 10 * Math.min(tile.scoredItems.rescueKits.top, 1);
                break;
            case 'U':
            case 'Green':
                current += victimPoint * tile.scoredItems.victims.top / 2;
                break;
        }
        switch (cell.tile.victims.right) {
            case 'H':
                current += victimPoint * tile.scoredItems.victims.right;
                current += 10 * Math.min(tile.scoredItems.rescueKits.right, 3);
                break;
            case 'S':
                current += victimPoint * tile.scoredItems.victims.right;
                current += 10 * Math.min(tile.scoredItems.rescueKits.right, 2);
                break;
            case 'Red':
            case 'Yellow':
                current += (victimPoint * tile.scoredItems.victims.right / 2);
                current += 10 * Math.min(tile.scoredItems.rescueKits.right, 1);
                break;
            case 'U':
            case 'Green':
                current += victimPoint * tile.scoredItems.victims.right / 2;
                break;
        }
        switch (cell.tile.victims.bottom) {
            case 'H':
                current += victimPoint * tile.scoredItems.victims.bottom;
                current += 10 * Math.min(tile.scoredItems.rescueKits.bottom, 3);
                break;
            case 'S':
                current += victimPoint * tile.scoredItems.victims.bottom;
                current += 10 * Math.min(tile.scoredItems.rescueKits.bottom, 2);
                break;
            case 'Red':
            case 'Yellow':
                current += (victimPoint * tile.scoredItems.victims.bottom / 2);
                current += 10 * Math.min(tile.scoredItems.rescueKits.bottom, 1);
                break;
            case 'U':
            case 'Green':
                current += victimPoint * tile.scoredItems.victims.bottom / 2;
                break;
        }
        switch (cell.tile.victims.left) {
            case 'H':
                current += victimPoint * tile.scoredItems.victims.left;
                current += 10 * Math.min(tile.scoredItems.rescueKits.left, 3);
                break;
            case 'S':
                current += victimPoint * tile.scoredItems.victims.left;
                current += 10 * Math.min(tile.scoredItems.rescueKits.left, 2);
                break;
            case 'Red':
            case 'Yellow':
                current += (victimPoint * tile.scoredItems.victims.left / 2);
                current += 10 * Math.min(tile.scoredItems.rescueKits.left, 1);
                break;
            case 'U':
            case 'Green':
                current += victimPoint * tile.scoredItems.victims.left / 2;
                break;
        }
        switch (cell.tile.victims.floor) {
            case 'Red':
            case 'Green':
                current += (cell.isLinear ? 15 : 30) * tile.scoredItems.victims.floor;
                current += 10 * Math.min(tile.scoredItems.rescueKits.floor, 1);
                break;
        }

        return current;
    };

    $scope.open = function (x, y, z) {
        var modalInstance = $uibModal.open({
            animation: true,
            templateUrl: '/templates/maze_view_modal.html',
            controller: 'ModalInstanceCtrl',
            size: 'lm',
            resolve: {
                cell: function () {
                    return $scope.cells[x + ',' + y + ',' + z];
                },
                tile: function () {
                    return $scope.tiles[x + ',' + y + ',' + z];
                },
                sRotate: function () {
                    return $scope.sRotate;
                },
                leagueType: function () {
                    return $scope.leagueType;
                }
            }
        }).closed.then(function (result) {
            console.log("Closed modal");
        });
    };

    $scope.go = function (path) {
        socket.emit('unsubscribe', 'runs/' + runId);
        window.location = path
    }

    $scope.navColor = function (stat) {
        if (stat == 2) return '#e74c3c';
        if (stat == 3) return '#e67e22';
        return '#7f8c8d';
    }

    $scope.wallColor = function (x, y, z, rotate = 0) {
        let cell = $scope.cells[x + ',' + y + ',' + z];
        if (!cell) return {};
        if (cell.isWall) return cell.isLinear ? { 'background-color': 'black' } : { 'background-color': 'navy' };

        if (cell.halfWall > 0) {
            let direction = 180 * (cell.halfWall - 1) + (y % 2 == 1 ? 0 : 90);

            //Wall color
            let color = 'navy';
            switch (direction) {
                case 0:
                    if (wallCheck($scope.cells[(x - 1) + ',' + (y + 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x + 1) + ',' + (y + 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x) + ',' + (y + 2) + ',' + z])) color = 'black';
                    break;
                case 90:
                    if (wallCheck($scope.cells[(x - 1) + ',' + (y + 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x - 1) + ',' + (y - 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x - 2) + ',' + (y) + ',' + z])) color = 'black';
                    break;
                case 180:
                    if (wallCheck($scope.cells[(x - 1) + ',' + (y - 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x + 1) + ',' + (y - 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x) + ',' + (y - 2) + ',' + z])) color = 'black';
                    break;
                case 270:
                    if (wallCheck($scope.cells[(x + 1) + ',' + (y + 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x + 1) + ',' + (y - 1) + ',' + z])) color = 'black';
                    if (wallCheck($scope.cells[(x + 2) + ',' + (y) + ',' + z])) color = 'black';
                    break;
            }

            direction += rotate;
            if (direction >= 360) direction -= 360;

            let gradient = String(direction) + "deg," + color + " 0%," + color + " 50%,white 50%,white 100%";
            return { 'background': 'linear-gradient(' + gradient + ')' };

        }

    };

    function wallCheck(cell) {
        if (!cell) return false;
        return cell.isWall && cell.isLinear;
    }

    $(window).on('beforeunload', function () {
        socket.emit('unsubscribe', 'runs/' + runId);
        socket.emit('unsubscribe', 'runs/map/' + runId);
    });
}]);


app.controller('ModalInstanceCtrl', ['$scope', '$uibModalInstance', 'cell', 'tile', 'leagueType', function ($scope, $uibModalInstance, cell, tile, leagueType) {
    $scope.cell = cell;
    $scope.tile = tile;
    $scope.leagueType = leagueType;
    $scope.hasVictims = (cell.tile.victims.top != "None") ||
        (cell.tile.victims.right != "None") ||
        (cell.tile.victims.bottom != "None") ||
        (cell.tile.victims.left != "None") ||
        (cell.tile.victims.floor != "None");

    $scope.lightStatus = function (light, kit) {
        if (light) return true;
        return false;
    };

    $scope.kitStatus = function (light, kit, type) {
        return (maxKit[type] <= kit);
    };

    $scope.modalRotate = function (dir) {
        var ro;
        switch (dir) {
            case 'top':
                ro = 0;
                break;
            case 'right':
                ro = 90;
                break;
            case 'left':
                ro = 270;
                break;
            case 'bottom':
                ro = 180;
                break;
        }
        switch (ro) {
            case 0:
                return 'top';
            case 90:
                return 'right';
            case 180:
                return 'bottom';
            case 270:
                return 'left';
        }
    }

    $scope.ok = function () {
        $uibModalInstance.close();
    };
}]);

var currentWidth = -1;


$(window).on('load resize', function () {
    if (currentWidth == window.innerWidth) {
        return;
    }
    currentWidth = window.innerWidth;
    tile_size();
    setInterval(tile_size, 10000);
});

let lastTouch = 0;
document.addEventListener('touchend', event => {
    const now = window.performance.now();
    if (now - lastTouch <= 500) {
        event.preventDefault();
    }
    lastTouch = now;
}, true);
