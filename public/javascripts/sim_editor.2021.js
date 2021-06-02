// register the directive with your app module
var app = angular.module('SimEditor', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);

// function referenced by the drop target
app.controller('SimEditorController', ['$scope', '$uibModal', '$log', '$http','$translate', function ($scope, $uibModal, $log, $http, $translate) {

    $scope.competitionId = competitionId;
    $scope.mapId = mapId;
    $translate('admin.simMapEditor.import').then(function (val) {
        $("#select").fileinput({'showUpload':false, 'showPreview':false, 'showRemove':false, 'showCancel':false  ,'msgPlaceholder': val,allowedFileExtensions: ['json'] , msgValidationError: "ERROR"});
    }, function (translationId) {
        // = translationId;
    });

    let trans = [];
    function loadTranslation(tag){
        $translate(`admin.simMapEditor.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }

    loadTranslation("startTileError");

    $scope.z = 0;
    $scope.startTile = {
        x: 0,
        y: 0,
        z: 0
    };
    $scope.height = 1;
    $scope.width = 1;
    $scope.length = 1;
    $scope.time = 480;
    $scope.name = "Awesome world";
    $scope.cells = {};
    $scope.dice = [];
    $scope.saveasname ="";
    $scope.finished = true;
    $scope.selectRoom = -1;
    $scope.roomTiles = [[], []];
    $scope.roomColors = ["red", "green", "blue"]

    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }

    $scope.changeFloor = function (z){
        $scope.z = z;
    }

    $scope.go = function (path) {
        window.location = path
    }

    $scope.$watchCollection('startTile', function (newValue, oldValue) {
        $scope.recalculateLinear();
    });

    $scope.$watchCollection('cells', function (newValue, oldValue) {
        $scope.recalculateLinear();
    });

    $scope.isUndefined = function (thing) {
        return (typeof thing === "undefined");
    }
    $scope.recalculateLinear = function () {
        console.log("update");
        //console.log($scope.cells)
        $scope.virtualWall = [];
        //console.log($scope.cells);
        if ($scope.startNotSet())
            return;

        // Reset all previous linear walls
        for (var index in $scope.cells) {
            $scope.cells[index].isLinear = false;
            $scope.cells[index].virtualWall = false;
            $scope.cells[index].reachable= false;
            $scope.cells[index].explored= false;
            if ($scope.cells[index].tile && $scope.cells[index].tile.curve == undefined) {
                $scope.cells[index].tile.halfWallIn = [0, 0, 0, 0];
                $scope.cells[index].tile.curve = [0, 0, 0, 0]; //NW quadrant, NE, SW, SE
                $scope.cells[index].tile.halfWallVic = [];
                for (var i in $scope.range(16))
                    $scope.cells[index].tile.halfWallVic.push('');
            }
        }
        
        // Set to virtual wall around the black tile
        for (var index in $scope.cells) {
            if($scope.cells[index].tile){
                if($scope.cells[index].tile.black){
                    var x = Number(index.split(',')[0]);
                    var y = Number(index.split(',')[1]);
                    var z = Number(index.split(',')[2]);
                    if($scope.cells[x + "," + (y-1) + "," + z]) $scope.cells[x + "," + (y-1) + "," + z].virtualWall = true;
                    else $scope.cells[x + "," + (y-1) + "," + z] = {virtualWall: true};

                    if($scope.cells[(x+1) + "," + y + "," + z]) $scope.cells[(x+1) + "," + y + "," + z].virtualWall = true;
                    else $scope.cells[(x+1) + "," + y + "," + z] = {virtualWall: true};

                    if($scope.cells[(x-1) + "," + y + "," + z]) $scope.cells[(x-1) + "," + y + "," + z].virtualWall = true;
                    else $scope.cells[(x-1) + "," + y + "," + z] = {virtualWall: true};

                    if($scope.cells[x + "," + (y+1) + "," + z]) $scope.cells[x + "," + (y+1) + "," + z].virtualWall = true;
                    else $scope.cells[x + "," + (y+1) + "," + z] = {virtualWall: true};

                }
            }
        }

        // Start it will all 4 walls around the starting tile

        recurs($scope.startTile.x - 1, $scope.startTile.y, $scope.startTile.z);
        recurs($scope.startTile.x + 1, $scope.startTile.y, $scope.startTile.z);
        recurs($scope.startTile.x, $scope.startTile.y - 1, $scope.startTile.z);
        recurs($scope.startTile.x, $scope.startTile.y + 1, $scope.startTile.z);

        //Top Left
        recurs($scope.startTile.x-1, $scope.startTile.y - 2, $scope.startTile.z);
        recurs($scope.startTile.x-2, $scope.startTile.y - 1, $scope.startTile.z);

        //Top Right
        recurs($scope.startTile.x+1, $scope.startTile.y - 2, $scope.startTile.z);
        recurs($scope.startTile.x+2, $scope.startTile.y - 1, $scope.startTile.z);

        //Bottom Left
        recurs($scope.startTile.x-1, $scope.startTile.y + 2, $scope.startTile.z);
        recurs($scope.startTile.x-2, $scope.startTile.y + 1, $scope.startTile.z);

        //Bottom Right
        recurs($scope.startTile.x+1, $scope.startTile.y + 2, $scope.startTile.z);
        recurs($scope.startTile.x+2, $scope.startTile.y + 1, $scope.startTile.z);

        //Search reachable tiles
        reachable($scope.startTile.x, $scope.startTile.y, $scope.startTile.z);
    }

    function reachable(x,y,z){
        
        if(x<0 || x>$scope.width*2 || y<0 || y>$scope.length*2) return;
        let cell = $scope.cells[x+','+y+','+z];
        if(cell){
            if($scope.cells[x+','+y+','+z].reachable) return;
            $scope.cells[x+','+y+','+z].reachable = true;
        }else{
            $scope.cells[x+','+y+','+z] = {
                isTile: true,
                tile: {
                    changeFloorTo: z,
                    halfWallIn: [0,0,0,0],
                    curve: [0,0,0,0]
                },
                reachable: true
            };
        }
        cell = $scope.cells[x+','+y+','+z];

        //console.log(`${x},${y},${z}`)
        //console.log(cell)

        //Upper
        if(!(($scope.cells[x+','+(y-1)+','+z] && $scope.cells[x+','+(y-1)+','+z].isWall) || ((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3])))){
            reachable(x,y-2,z)
        }

        //console.log(((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3])))
        //console.log(!(($scope.cells[x+','+(y+1)+','+z] && $scope.cells[x+','+(y+1)+','+z].isWall) || ((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3]))))
        //Bottom
        if(!(($scope.cells[x+','+(y+1)+','+z] && $scope.cells[x+','+(y+1)+','+z].isWall) || ((cell.tile.halfWallIn[3] || cell.tile.curve[0] || cell.tile.curve[2]) && (cell.tile.halfWallIn[1] || cell.tile.curve[1] || cell.tile.curve[3])))){
            reachable(x,y+2,z)
        }

        //Right
        if(!(($scope.cells[(x+1)+','+y+','+z] && $scope.cells[(x+1)+','+y+','+z].isWall)  || ((cell.tile.halfWallIn[0] || cell.tile.curve[0] || cell.tile.curve[1]) && (cell.tile.halfWallIn[2] || cell.tile.curve[2] || cell.tile.curve[3])))){
            reachable(x+2,y,z)
        }

        //Left
        if(!(($scope.cells[(x-1)+','+y+','+z] && $scope.cells[(x-1)+','+y+','+z].isWall)  || ((cell.tile.halfWallIn[0] || cell.tile.curve[0] || cell.tile.curve[1]) && (cell.tile.halfWallIn[2] || cell.tile.curve[2] || cell.tile.curve[3])))){
            reachable(x-2,y,z)
        }
    }


    function isOdd(num) {
        return num % 2;
    }

    function recurs(x, y, z, fromDir=-1) {
        if (x < 0 || y < 0 || z < 0) {
            return;
        }

        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell)
            return;
        // Outside of the current maze size.
        if (x > $scope.width * 2 + 1 || x < 0 ||
            y > $scope.length * 2 + 1 || y < 0 ||
            z > $scope.height || z < 0)
            return;

        // Already visited this, returning
        if (cell.isLinear)
            return;
        if (cell.isWall || cell.virtualWall) {
            cell.isLinear = true;


            // horizontal walls
            if (isOdd(x) && !isOdd(y)) {
                // Set tiles around this wall to linear
                setTileLinear(x - 2, y - 1, z);
                setTileLinear(x, y - 1, z);
                setTileLinear(x + 2, y - 1, z);
                setTileLinear(x - 2, y + 1, z);
                setTileLinear(x, y + 1, z);
                setTileLinear(x + 2, y + 1, z);
                // Check neighbours
                recurs(x + 2, y, z, 3);
                recurs(x - 2, y, z, 1);
                recurs(x - 1, y - 1, z, 2);
                recurs(x - 1, y + 1, z, 0);
                recurs(x + 1, y - 1, z, 2);
                recurs(x + 1, y + 1, z, 0);
                // Explore the wall in the tile (TOP)
                exploreWallInTile(x, y - 1, z, 2);
                // Explore the wall in the tile (BOTTOM)
                exploreWallInTile(x, y + 1, z, 0);

                checkCurve(x-2, y-1, z, 3);
                checkCurve(x-2, y+1, z, 1);
                checkCurve(x+2, y-1, z, 2);
                checkCurve(x+2, y-1, z, 0);

            } // Vertical wall
            else if (!isOdd(x) && isOdd(y)) {
                // Set tiles around this wall to linear
                setTileLinear(x - 1, y - 2, z);
                setTileLinear(x - 1, y, z);
                setTileLinear(x - 1, y + 2, z);
                setTileLinear(x + 1, y - 2, z);
                setTileLinear(x + 1, y, z);
                setTileLinear(x + 1, y + 2, z);
                // Check neighbours
                recurs(x, y - 2, z, 2);
                recurs(x, y + 2, z, 0);
                recurs(x - 1, y - 1, z, 1);
                recurs(x - 1, y + 1, z, 1);
                recurs(x + 1, y - 1, z, 3);
                recurs(x + 1, y + 1, z, 3);
                // Explore the wall in the tile (LEFT)
                exploreWallInTile(x - 1, y, z, 1)
                // Explore the wall in the tile (RIGHT)
                exploreWallInTile(x + 1, y, z, 3)

                checkCurve(x-1, y-2, z, 3);
                checkCurve(x-1, y+2, z, 1);
                checkCurve(x+1, y-2, z, 2);
                checkCurve(x+1, y-2, z, 0);
            }

        }
        
        if(cell.halfWall > 0){
            if(fromDir == 4) cell.isLinear = true;
            if(x%2 == 0){
                // Vertical
                if(cell.halfWall == 1 && (fromDir == 2 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x, y + 2, z, 0);
                    recurs(x + 1, y + 1, z, 3);
                    recurs(x - 1, y + 1, z, 1);
                    
                    // Explore the wall in the tile (LEFT)
                    exploreWallInTile(x - 1, y, z, 1)
                    // Explore the wall in the tile (RIGHT)
                    exploreWallInTile(x + 1, y, z, 3)

                    curveFromHalfWall(x-1, y, z, 1)
                    curveFromHalfWall(x+1, y, z, 3)
                }else if(cell.halfWall == 2 && (fromDir == 0 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x, y - 2, z, 2);
                    recurs(x + 1, y - 1, z, 3);
                    recurs(x - 1, y - 1, z, 1);
                    
                    // Explore the wall in the tile (LEFT)
                    exploreWallInTile(x - 1, y, z, 1)
                    // Explore the wall in the tile (RIGHT)
                    exploreWallInTile(x + 1, y, z, 3)

                    curveFromHalfWall(x-1, y, z, 1)
                    curveFromHalfWall(x+1, y, z, 3)
                }
            }else{
                // Horizontal
                if(cell.halfWall == 1 && (fromDir == 3 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x - 2, y, z, 1);
                    recurs(x - 1, y - 1, z, 2);
                    recurs(x - 1, y + 1, z, 0);              
                    // Explore the wall in the tile (TOP)
                    exploreWallInTile(x, y - 1, z, 2)
                    // Explore the wall in the tile (BOTTOM)
                    exploreWallInTile(x, y + 1, z, 0)

                    curveFromHalfWall(x, y-1, z, 2)
                    curveFromHalfWall(x, y+1, z, 0)
                }else if(cell.halfWall == 2 && (fromDir == 1 || fromDir == 4)){
                    cell.isLinear = true;
                    recurs(x + 2, y, z, 3);
                    recurs(x + 1, y - 1, z, 2);
                    recurs(x + 1, y + 1, z, 0);
                    // Explore the wall in the tile (TOP)
                    exploreWallInTile(x, y - 1, z, 2)
                    // Explore the wall in the tile (BOTTOM)
                    exploreWallInTile(x, y + 1, z, 0)

                    curveFromHalfWall(x, y-1, z, 2)
                    curveFromHalfWall(x, y+1, z, 0)
                }
            }
        }
    }

    function checkCurve(x, y, z, from){
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;
        if (!cell.tile) return;
        if (!cell.tile.curve) return;

        switch(from){
            case 0:
                if(cell.tile.curve[0] == 1 || cell.tile.curve[2] == 3){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 1:
                if(cell.tile.curve[1] == 2 || cell.tile.curve[1] == 4){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 2:
                if(cell.tile.curve[2] == 2 || cell.tile.curve[2] == 4){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
            case 3:
                if(cell.tile.curve[3] == 1 || cell.tile.curve[3] == 3){
                    halfTileFromCenter(x, y, z);
                    curveFromCenter(x, y, z, from);
                }
                break;
        }
    }

    function exploreWallInTile(x, y, z, fromDir){
        if (x < 0 || y < 0 || z < 0) {
            return;
        }
        
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;

        if(!cell.tile) return;
        if(!cell.tile.halfWallIn) return;
        if(!cell.tile.halfWallIn[fromDir]) return;
        if(cell.explored) return;
        else cell.explored = true;
        
        halfTileFromCenter(x, y, z, fromDir);
        curveFromCenter(x, y, z);
    }

    function halfTileFromCenter(x, y, z, exclude=-1){
        let cell = $scope.cells[x + ',' + y + ',' + z];

        // If this is a wall that doesn't exists
        if (!cell) return;

        for(let i=0; i<4; i++){
            if(cell.tile.halfWallIn[i] && i != exclude){
                switch(i){
                    case 0:
                        setTileLinear(x, y - 2, z);
                        recurs(x, y - 1, z, 4);
                        exploreWallInTile(x, y - 2, z, 2)
                        break;
                    case 1:
                        setTileLinear(x + 2, y, z);
                        recurs(x + 1, y, z, 4);
                        exploreWallInTile(x + 2, y, z, 3);
                        break;
                    case 2:
                        setTileLinear(x, y + 2, z);
                        recurs(x, y + 1, z, 4);
                        exploreWallInTile(x, y + 2, z, 0);
                        break;
                    case 3:
                        setTileLinear(x - 2, y, z);
                        recurs(x - 1, y, z, 4);
                        exploreWallInTile(x - 2, y, z, 1);
                        break;
                }

            }
        }
    }

    function curveFromHalfWall(x, y, z, start){
        let cell = $scope.cells[x + ',' + y + ',' + z];
        // If this is a wall that doesn't exists
        if (!cell) return;

        switch(start){
            case 0:
                if(cell.tile.curve[0] == 2 || cell.tile.curve[0] == 4){
                    recurs(x-1, y, z, 4);
                    setTileLinear(x-2, y, z);
                }
                if(cell.tile.curve[1] == 1 || cell.tile.curve[1] == 3){
                    recurs(x+1, y, z, 4);
                    setTileLinear(x+2, y, z);
                }
                break;
            case 1:
                if(cell.tile.curve[3] == 2 || cell.tile.curve[3] == 4){
                    recurs(x, y+1, z, 4);
                    setTileLinear(x, y+2, z);
                }
                if(cell.tile.curve[1] == 1 || cell.tile.curve[1] == 3){
                    recurs(x, y-1, z, 4);
                    setTileLinear(x, y-2, z);
                }
                break;
            case 2:
                if(cell.tile.curve[3] == 2 || cell.tile.curve[3] == 4){
                    recurs(x+1, y, z, 4);
                    setTileLinear(x+2, y, z);
                }
                if(cell.tile.curve[2] == 1 || cell.tile.curve[2] == 3){
                    recurs(x-1, y, z, 4);
                    setTileLinear(x-2, y, z);
                }
                break;
            case 3:
                if(cell.tile.curve[0] == 2 || cell.tile.curve[0] == 4){
                    recurs(x, y-1, z, 4);
                    setTileLinear(x, y-2, z);
                }
                if(cell.tile.curve[2] == 1 || cell.tile.curve[2] == 3){
                    recurs(x, y+1, z, 4);
                    setTileLinear(x, y+2, z);
                }
                break;
        }
    }

    function curveFromCenter(x, y, z, exclude=-1){
        let cell = $scope.cells[x + ',' + y + ',' + z];
        // If this is a wall that doesn't exists
        if (!cell) return;
        if((cell.tile.curve[0] == 1 || cell.tile.curve[0] == 3) && exclude != 0){
            // to TOP LEFT
            recurs(x - 1, y-2, z, 2);
            recurs(x - 1, y, z, 0);
            recurs(x - 2, y-1, z, 1);
            recurs(x, y-1, z, 3);
            setTileLinear(x, y-2, z);
            setTileLinear(x-2, y-2, z);
            setTileLinear(x-2, y, z);
        }
        if((cell.tile.curve[1] == 2 || cell.tile.curve[1] == 4) && exclude != 1){
            // to TOP RIGHT
            recurs(x + 1, y-2, z, 2);
            recurs(x + 1, y, z, 0);
            recurs(x + 2, y-1, z, 3);
            recurs(x, y-1, z, 1);
            setTileLinear(x, y-2, z);
            setTileLinear(x+2, y-2, z);
            setTileLinear(x+2, y, z);
        }
        if((cell.tile.curve[3] == 1 || cell.tile.curve[3] == 3) && exclude != 3){
            // to BOTTOM RIGHT
            recurs(x + 1, y+2, z, 0);
            recurs(x + 1, y, z, 2);
            recurs(x + 2, y+1, z, 3);
            recurs(x, y+1, z, 1);
            setTileLinear(x+2, y, z);
            setTileLinear(x+2, y+2, z);
            setTileLinear(x, y+2, z);
        }
        if((cell.tile.curve[2] == 2 || cell.tile.curve[2] == 4) && exclude != 2){
            // to BOTTOM LEFT
            recurs(x - 1, y+2, z, 0);
            recurs(x - 1, y, z, 2);
            recurs(x - 2, y+1, z, 1);
            recurs(x, y+1, z, 3);
            setTileLinear(x-2, y, z);
            setTileLinear(x-2, y+2, z);
            setTileLinear(x, y+2, z);
        }
    }

    function setTileLinear(x, y, z) {
        if (x < 0 || y < 0 || z < 0) {
            return;
        }

        // Check that this is an actual tile, not a wall
        var cell = $scope.cells[x + ',' + y + ',' + z];
        if (cell) {
            cell.isLinear = true;
        } else {
            $scope.cells[x + ',' + y + ',' + z] = {
                isTile: true,
                isLinear: true,
                tile: {
                    changeFloorTo: z
                }
            };
        }
    }

    $scope.startNotSet = function () {
        return $scope.startTile.x == 0 && $scope.startTile.y == 0 &&
            $scope.startTile.z == 0;
    }

    function Range(first, last) {
        var first = first.charCodeAt(0);
        var last = last.charCodeAt(0);
        var result = new Array();
        for(var i = first; i <= last; i++) {
            result.push(String.fromCodePoint(i));
        }
        return result;
    }
    var big = Range('A', 'Z');
    var small = Range('α', 'ω');

    $scope.isVictim = function(type,x,y,z){
        if($scope.cells[x + ',' + y + ',' + z] && $scope.cells[x + ',' + y + ',' + z].tile){
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.bottom == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.top == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.right == type) return true;
            if($scope.cells[x + ',' + y + ',' + z].tile.victims.left == type) return true;
        }
        return false;
    };

    $scope.makeImage = function(){
        window.scrollTo(0,0);
        html2canvas(document.getElementById("outputImageArea"),{
            scale: 5
        }).then(function(canvas) {
            let ctx = canvas.getContext("2d");

            //Detect image area
            let topY = 0;
            for(let y=0;y<canvas.height;y++){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    topY = y;
                    break;
                }
            }
            let bottomY = 0;
            for(let y=canvas.height-1;y>=0;y--){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    bottomY = y;
                    break;
                }
            }
            mem_canvas = document.createElement("canvas");
            mem_canvas.width = canvas.width;
            mem_canvas.height = bottomY-topY;
            ctx2 = mem_canvas.getContext("2d");
            ctx2.drawImage(canvas, 0, topY, canvas.width, bottomY-topY, 0, 0, canvas.width, bottomY-topY);
            let imgData = mem_canvas.toDataURL();
            $http.post("/api/maps/line/image/" + mapId, {img: imgData}).then(function (response) {
                alert("Created image!");
            }, function (response) {
                console.log(response);
                console.log("Error: " + response.statusText);
                alert(response.data.msg);
            });
        });
    };

    $scope.makeImageDl = function(){
        window.scrollTo(0,0);
        html2canvas(document.getElementById("outputImageArea"),{
            scale: 5
        }).then(function(canvas) {
            let ctx = canvas.getContext("2d");

            //Detect image area
            let topY = 0;
            for(let y=0;y<canvas.height;y++){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    topY = y;
                    break;
                }
            }
            let bottomY = 0;
            for(let y=canvas.height-1;y>=0;y--){
                let imagedata = ctx.getImageData(canvas.width/2, y, 1, 1);
                if(imagedata.data[0] != 255){
                    bottomY = y;
                    break;
                }
            }
            mem_canvas = document.createElement("canvas");
            mem_canvas.width = canvas.width;
            mem_canvas.height = bottomY-topY;
            ctx2 = mem_canvas.getContext("2d");
            ctx2.drawImage(canvas, 0, topY, canvas.width, bottomY-topY, 0, 0, canvas.width, bottomY-topY);
            let imgData = mem_canvas.toDataURL();
            downloadURI(imgData,$scope.name+'.png')
        });
    };

    function downloadURI(uri, name) {
        var link = document.createElement("a");
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        delete link;
    }

    $scope.tileColour = function(x,y,z,rotate=0){
        let cell = $scope.cells[x+','+y+','+z];
        if(!cell) return {};
        if(cell.isWall) return cell.isLinear?{'background-color': 'black'}:{'background-color': 'navy'};

        if(cell.halfWall > 0){
            let direction = 180*(cell.halfWall-1)+(y%2==1?0:90);

            //Wall color
            let color = 'navy';
            if(cell.isLinear) color = 'black';

            direction += rotate;
            if(direction>=360) direction-=360;

            let gradient = String(direction) + "deg," + color + " 0%," + color + " 50%,white 50%,white 100%";
            return {'background': 'linear-gradient(' + gradient + ')'};

        }
        if (x % 2 == 1 && y % 2 == 1){
            let css = {};
            if(cell.isLinear){
                css['background-color'] = '#fffdea';
            }else{
                css['background-color'] = '#b4ffd5';
            }
            if(cell.tile.color) css['background-color'] = cell.tile.color;
            if(cell.tile.swamp) css['background-color'] = '#CD853F';
            if(cell.tile.black) css['background-color'] = '#000000';
            if(cell.tile.checkpoint) css['background-image'] = 'linear-gradient(to top left, #A5A5A5, #BABAC2, #E8E8E8, #A5A5A5, #BABAC2)';
            let roomNumber = checkRoomNumber(x,y,z);
            if(roomNumber === 2){
                css['border-color'] = '#359ef4';
                css['border-width'] = '3px';
            }else if(roomNumber === 3){
                css['border-color'] = '#ed9aef';
                css['border-width'] = '3px';
            }
            if(!cell.reachable) css['background-color'] = '#636e72';
            return css;
        }
        return {};
            
    };

    function checkRoomNumber(x,y,z){
        for (let i = 0; i < 2; i++) {
            if($scope.roomTiles[i].find(cord => cord === `${x},${y},${z}`)){
                return i + 2;
            }
        }
        return 1;
    }

    function checkRoomNumberKey(key){
        for (let i = 0; i < 2; i++) {
            if($scope.roomTiles[i].find(cord => cord === key)){
                return i + 2;
            }
        }
        return 1;
    }


    $scope.export = function(){
        $scope.recalculateLinear();
        var map = {
            name: $scope.name,
            length: $scope.length,
            height: $scope.height,
            width: $scope.width,
            finished: $scope.finished,
            startTile: $scope.startTile,
            cells: $scope.cells,
            roomTiles: $scope.roomTiles,
            time: $scope.time
        };
         var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(map))
         var downloadLink = document.createElement('a')
         document.body.appendChild(downloadLink);
         downloadLink.setAttribute("href",dataStr)
         downloadLink.setAttribute("download", $scope.name + '.json')
         downloadLink.click()
         document.body.removeChild(downloadLink);
    }

    $scope.exportW = function(){
        if($scope.startNotSet()){
            Swal.fire({
                type: 'error',
                title: 'Oops...',
                text: trans['startTileError'],
            });
            return;
        }
        $scope.recalculateLinear();
        let w = createWorld();
        let blob = new Blob([w],{type:"text/plan"});
        let link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = $scope.name+'.wbt';
        link.click();
    }

    function checkSRCorner(walls, xPos, yPos, wallDir){
        let sr = null;
        if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
            sr = walls[yPos][xPos];
            return sr[1][wallDir] && sr[1][(wallDir+1)%4];
        }
        return false;
    }

    function checkForCorners(pos, walls){
        //Surrounding tile directions
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        //Needed corners
        let corners = [false, false, false, false];

        let surroundingTiles = [];

        let thisWall = walls[pos[1]][pos[0]];

        if(!thisWall[0]) {
            corners[0] = thisWall[1][0] || thisWall[1][1] || checkSRCorner(walls, pos[0] + 1, pos[1] - 1, 2);
            corners[1] = thisWall[1][1] || thisWall[1][2] || checkSRCorner(walls, pos[0] + 1, pos[1] + 1, 3);
            corners[2] = thisWall[1][2] || thisWall[1][3] || checkSRCorner(walls, pos[0] - 1, pos[1] + 1, 0);
            corners[3] = thisWall[1][3] || thisWall[1][0] || checkSRCorner(walls, pos[0] - 1, pos[1] - 1, 1);
            return corners;
        }

        //For each surrounding card
        for(let a of around){
            //Get the position
            let xPos = pos[0] + a[0]
            let yPos = pos[1] + a[1]
            //If it is a valid position
            if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
                //Add the tile to the surrounding list
                surroundingTiles.push(walls[yPos][xPos]);
            }else{
                //Otherwise add a null value
                surroundingTiles.push([false, [false, false, false, false], false, false, false]);
            }
        }

        //If top right is needed
        corners[0] = surroundingTiles[0][1][1] && surroundingTiles[1][1][0] && !thisWall[1][0] && !thisWall[1][1];
        //If bottom right is needed
        corners[1] = surroundingTiles[1][1][2] && surroundingTiles[2][1][1] && !thisWall[1][1] && !thisWall[1][2];
        //If bottom left is needed
        corners[2] = surroundingTiles[2][1][3] && surroundingTiles[3][1][2] && !thisWall[1][2] && !thisWall[1][3];
        //If top left is needed
        corners[3] = surroundingTiles[0][1][3] && surroundingTiles[3][1][0] && !thisWall[1][3] && !thisWall[1][0];

        return corners;
    }

    function checkForExternalWalls(pos, walls){
        let thisWall = walls[pos[1]][pos[0]];
        if(!thisWall[0]) return [false, false, false, false];

        //Surrounding tiles
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        let otherTiles = [false, false, false, false];

        let d = 0;

        for(let a of around){
            //Get the tiles position
            let xPos = pos[0] + a[0];
            let yPos = pos[1] + a[1];
            //If it is a valid positon
            if(xPos > -1 && xPos < $scope.width && yPos > -1 && yPos < $scope.length){
                //Add the tiles present data
                if(!walls[yPos][xPos][0]) otherTiles[d] = false;
                else otherTiles[d] = true;
            }else{
                //No tile present
                otherTiles[d] = false;
            }

            //Add one to direction counter
            d = d + 1
        }
        //Convert to needed walls
        externalsNeeded = [!otherTiles[0], !otherTiles[1], !otherTiles[2], !otherTiles[3]]
        return externalsNeeded
    }

    function checkForNotch (pos, walls){
        //Variables to store if each notch is needed
        let needLeft = false;
        let needRight = false;

        //No notches needed if there is not a floor
        if(!walls[pos[1]][pos[0]][0]) return [false, false, 0];

        let rotations = [3.14159, 1.57079, 0, -1.57079];

        //Surrounding tiles
        let around = [[0, -1], [1, 0], [0, 1], [-1, 0]];
        //Tiles to check if notches are needed
        let notchAround = [[ [1, -1], [-1, -1] ],
                            [ [1, 1], [1, -1] ],
                            [ [-1, 1], [1, 1] ],
                            [ [-1, -1], [-1, 1] ]];

        //Current direction
        let d = 0;
        //Number of surrounding tiles
        let surround = 0;

        //Direction of present tile
        let dire = -1;

        //Iterate for surrounding tiles
        for(a of around){
            //If x axis is within array
            if(pos[0] + a[0] < $scope.width && pos[0] + a[0] > -1){
                //If y axis is within array
                if(pos[1] + a[1] < $scope.length && pos[1] + a[1] > -1){
                    //If there is a tile there
                    if(walls[pos[1] + a[1]][pos[0] + a[0]][0]){
                        //Add to number of surrounding tiles
                        surround = surround + 1
                        //Store direction
                        dire = d
                    }
                }
            }
            //Increment direction
            d = d + 1
        }

        let rotation = 0
        //If there was only one connected tile and there is a valid stored direction
        if(surround == 1 && dire > -1 && dire < notchAround.length){
            //Get the left and right tile positions to check
            let targetLeft = [pos[0] + notchAround[dire][0][0], pos[1] + notchAround[dire][0][1]];
            let targetRight = [pos[0] + notchAround[dire][1][0], pos[1] + notchAround[dire][1][1]];

            //If the left tile is a valid target position
            if(targetLeft[0] < $scope.width && targetLeft[0] > -1 && targetLeft[1] < $scope.length && targetLeft[1] > -1){
                //If there is no tile there
                if(!walls[targetLeft[1]][targetLeft[0]][0]){
                    //A left notch is needed
                    needLeft = true;
                }
            }

            //If the right tile is a valid target position
            if(targetRight[0] < $scope.width && targetRight[0] > -1 && targetRight[1] < $scope.length && targetRight[1] > -1){
                //If there is no tile there
                if(!walls[targetRight[1]][targetRight[0]][0]){
                    //A right notch is needed
                    needRight = true;
                }
            }

            rotation = rotations[dire];
        }

        //Return information about needed notches
        return [needLeft, needRight, rotation]
    }

    function u2f(v){
        if(v) return true;
        return false;
    }

    function getRandomArbitrary(min, max) {
        return Math.random() * (max - min) + min;
    }

    function orgRound(value, base) {
        return Math.round(value / base) * base;
    }

    function createWorld(){
        let walls = [];
        for(let x=1,l=$scope.length*2+1;x<l;x+=2){
            let row = [];
            for(let z=1,m=$scope.width*2+1;z<m;z+=2){
                row.push([false, [0, 0, 0, 0], false, false, false, false, 0, 0, false, false,'', '', '', [], '', 0]);
            }
            walls.push(row);
        }
        for(let y=1,l=$scope.length*2+1;y<l;y+=2){
            for(let x=1,m=$scope.width*2+1;x<m;x+=2){

                let thisCell = $scope.cells[x+','+y+',0'];
                let arWall = [0, 0, 0, 0];
                let arWallHalf = [0, 0, 0, 0];
                if($scope.cells[(x)+','+(y-2)+',0'] == null && $scope.cells[(x)+','+(y-1)+',0'] && $scope.cells[(x)+','+(y-1)+',0'].isWall) arWall[0] = 1;
                if($scope.cells[(x+1)+','+(y)+',0'] && $scope.cells[(x+1)+','+(y)+',0'].isWall) arWall[1] = 1;
                if($scope.cells[(x)+','+(y+1)+',0'] && $scope.cells[(x)+','+(y+1)+',0'].isWall) arWall[2] = 1;
                if($scope.cells[(x-2)+','+(y)+',0'] == null && $scope.cells[(x - 1)+','+(y)+',0'] && $scope.cells[(x-1)+','+(y)+',0'].isWall) arWall[3] = 1;

                if($scope.cells[(x)+','+(y-1)+',0'] && y == 1 && $scope.cells[(x)+','+(y-1)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[0] = $scope.cells[(x)+','+(y-1)+',0'].halfWall;
                }
                if($scope.cells[(x+1)+','+(y)+',0'] && $scope.cells[(x+1)+','+(y)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[1] = $scope.cells[(x+1)+','+(y)+',0'].halfWall;
                }
                if($scope.cells[(x)+','+(y+1)+',0'] && $scope.cells[(x)+','+(y+1)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[2] = $scope.cells[(x)+','+(y+1)+',0'].halfWall;
                }
                if($scope.cells[(x-1)+','+(y)+',0'] && x == 1 && $scope.cells[(x-1)+','+(y)+',0'].halfWall > 0) {
                    $scope.cells[(x)+','+(y)+',0'].tile.halfTile = 1;
                    arWallHalf[3] = $scope.cells[(x-1)+','+(y)+',0'].halfWall;
                }

                let humanType = 0; // 1 - harmed, 2 - unharmed, 3 - stable, 4 - thermal
                let humanPlace = 0;
                let roomNum = 1;
                let floorColor = '0.635 0.635 0.635';
                let halfWallOutVar = [0, 0, 0, 0];
                let halfWallInVar = [0, 0, 0, 0];
                let curveWallVar = [0, 0, 0, 0];
                //stores shortening, lengthing of outer half walls
                let halfWallOutInfo = [1, 1, 1, 1];
                if(!thisCell){
                    continue;
                }
                if(thisCell.tile && thisCell.tile.victims){
                    if(thisCell.tile.victims.top){
                        switch(thisCell.tile.victims.top){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 0;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 0;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 0;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 0;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 0;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 0;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 0;
                                break;
                        }

                    }else if(thisCell.tile.victims.right){
                        switch(thisCell.tile.victims.right){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 1;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 1;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 1;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 1;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 1;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 1;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 1;
                                break;
                        }
                    }else if(thisCell.tile.victims.bottom){
                        switch(thisCell.tile.victims.bottom){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 2;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 2;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 2;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 2;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 2;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 2;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 2;
                                break;

                        }
                    }else if(thisCell.tile.victims.left){
                        switch(thisCell.tile.victims.left){
                            case 'None':
                                break;
                            case 'H':
                                humanType = 1;
                                humanPlace = 3;
                                break;
                            case 'S':
                                humanType = 3;
                                humanPlace = 3;
                                break;
                            case 'U':
                                humanType = 2;
                                humanPlace = 3;
                                break;
                            case 'F':
                                humanType = 5;
                                humanPlace = 3;
                                break;
                            case 'P':
                                humanType = 6;
                                humanPlace = 3;
                                break;
                            case 'C':
                                humanType = 7;
                                humanPlace = 3;
                                break;
                            case 'O':
                                humanType = 8;
                                humanPlace = 3;
                                break;
                        }
                    }
                }
                if (thisCell.tile && thisCell.tile.color) {
                    floorColor = '';
                    for (i = 1; i < 7; i += 2)
                        floorColor += String(parseInt('0x' + thisCell.tile.color.substring(i, i + 2)) / 255.0) + ' ';
                }
                if (thisCell.tile) {
                    halfWallOutVar = arWallHalf;
                    halfWallInVar = thisCell.tile.halfWallIn;
                    curveWallVar = '[' + thisCell.tile.curve.toString() + ']';
                }
                roomNum = checkRoomNumber(x,y,0)
                if(thisCell.tile){
                    walls[(y-1)/2][(x-1)/2] = [u2f(thisCell.reachable), arWall, u2f(thisCell.tile.checkpoint), u2f(thisCell.tile.black), x == $scope.startTile.x && y == $scope.startTile.y, u2f(thisCell.tile.swamp), humanType, humanPlace, u2f(thisCell.isLinear), u2f(thisCell.tile.obstacle), halfWallOutVar, halfWallInVar, curveWallVar, thisCell.tile.halfWallVic, floorColor, halfWallOutInfo, roomNum];
                }
            }
        }


        let arr = [];
        //General scale for tiles - adjusts position and size of pieces and obstacles
        let tileScale = [0.4, 0.4, 0.4];
        //The vertical position of the floor
        let floorPos = -0.075 * tileScale[1];

        //Strings to hold the tile parts
        let allTiles = "";
        //Strings to hold the boundaries for special tiles
        let allCheckpointBounds = "";
        let allTrapBounds = "";
        let allGoalBounds = "";
        let allSwampBounds = "";
        let allObstacles = "";

        //
        const fileHeader = ({y, z}) => `#VRML_SIM R2021a utf8
        WorldInfo {
          basicTimeStep 16
          coordinateSystem "NUE"
          contactProperties [
            ContactProperties {
              material1  "TILE"
              material2  "NO_FRIC"
              coulombFriction 0
              bounce 0
              bumpSound ""
              rollSound ""
              slideSound ""
            }
          ]
        }
        DEF Viewpoint Viewpoint {
          orientation -1 0 0 0.85
          position -0.08 ${y} ${z}
        }
        TexturedBackground {
        }
        TexturedBackgroundLight {
        }
        `;
        const protoTilePart = ({name, x, z, fl, tw, rw, bw, lw, tex, rex, bex, lex, start, trap, checkpoint, swamp, width, height, id, xScale, yScale, zScale, color, room}) => `
        DEF ${name} worldTile {
            xPos ${x}
            zPos ${z}
            floor ${fl}
            topWall ${tw}
            rightWall ${rw}
            bottomWall ${bw}
            leftWall ${lw}
            topExternal ${tex}
            rightExternal ${rex}
            bottomExternal ${bex}
            leftExternal ${lex}
            start ${start}
            trap ${trap}
            checkpoint ${checkpoint}
            swamp ${swamp}
            width ${width}
            height ${height}
            id "${id}"
            xScale ${xScale}
            yScale ${yScale}
            zScale ${zScale}
            tileColor ${color}
            room ${room}
          }
        `;
        
        const protoHalfTilePart = ({name, x, z, fl, tw, rw, bw, lw, t1w, t2w, t3w, t4w, t1e, t2e, t3e, t4e, curve, start, trap, checkpoint, swamp, width, height, id, xScale, yScale, zScale, color, room}) => `
        DEF ${name} halfTile {
            xPos ${x}
            zPos ${z}
            floor ${fl}
            topWall ${tw}
            rightWall ${rw}
            bottomWall ${bw}
            leftWall ${lw}
            tile1Walls [ ${Number(t1w[0])}, ${Number(t1w[1])}, ${Number(t1w[2])}, ${Number(t1w[3])} ]
            tile2Walls [ ${Number(t2w[0])}, ${Number(t2w[1])}, ${Number(t2w[2])}, ${Number(t2w[3])} ]
            tile3Walls [ ${Number(t3w[0])}, ${Number(t3w[1])}, ${Number(t3w[2])}, ${Number(t3w[3])} ]
            tile4Walls [ ${Number(t4w[0])}, ${Number(t4w[1])}, ${Number(t4w[2])}, ${Number(t4w[3])} ]
            tile1External [ ${t1e[0]}, ${t1e[1]}, ${t1e[2]}, ${t1e[3]} ]
            tile2External [ ${t2e[0]}, ${t2e[1]}, ${t2e[2]}, ${t2e[3]} ]
            tile3External [ ${t3e[0]}, ${t3e[1]}, ${t3e[2]}, ${t3e[3]} ]
            tile4External [ ${t4e[0]}, ${t4e[1]}, ${t4e[2]}, ${t4e[3]} ]
            curve ${curve}
            start ${start}
            trap ${trap}
            checkpoint ${checkpoint}
            swamp ${swamp}
            width ${width}
            height ${height}
            id "${id}"
            xScale ${xScale}
            yScale ${yScale}
            zScale ${zScale}
            tileColor ${color}
            room ${room}
          }
        `;

        const boundsPart = ({name, id, xmin, zmin, xmax, zmax, y}) => `
        DEF boundary Group {
            children [
              DEF ${name}${id}min Transform {
                    translation ${xmin} ${y} ${zmin}
              }
              DEF ${name}${id}max Transform {
                    translation ${xmax} ${y} ${zmax}
              }
            ]
          }
        `;

        const visualHumanPart = ({x, z, rot, id, type, score}) => `
        Victim {
            translation ${x} 0 ${z}
            rotation 0 1 0 ${rot}
            name "Victim${id}"
            type "${type}"
            scoreWorth ${score}
        }
        `;

        const hazardPart = ({x, z, rot, id, type, score}) => `
        HazardMap {
            translation ${x} 0 ${z}
            rotation 0 1 0 ${rot}
            name "Hazard${id}"
            type "${type}"
            scoreWorth ${score}
        }
        `;

        const obstaclePart = ({id, xSize, ySize, zSize, x, y, z, rot}) => `
        DEF OBSTACLE${id} Solid {
            translation ${x} ${y} ${z}
			rotation 0 1 0 ${rot}
            children [
                Shape {
                    appearance Appearance {
						material Material {
						diffuseColor 0.45 0.45 0.45
						}
                    }
                    geometry DEF OBSTACLEBOX${id} Box {
						size ${xSize} ${ySize} ${zSize}
                    }
                }
            ]
            name "obstacle${id}"
            boundingObject USE OBSTACLEBOX${id}
	    recognitionColors [
			0.45 0.45 0.45
		]
        }
        `;

        const groupPart = ({data, name}) => `
        DEF ${name} Group {
            children [
              ${data}
            ]
        }
        `;

        const supervisorPart = ({time}) => `
        DEF MAINSUPERVISOR Robot {
            children [
              Receiver {
                channel 1
              }
              Emitter {
                channel 1
              }
            ]
            supervisor TRUE
            controller "MainSupervisor"
            customData "${time}"
            window "MainSupervisorWindow"
            showWindow TRUE
          }
        `;

        //Upper left corner to start placing tiles from
        let width = $scope.width;
        let height = $scope.length;
        let startX = -($scope.width * (0.3 * tileScale[0]) / 2.0);
        let startZ = -($scope.length * (0.3 * tileScale[2]) / 2.0);

        let fileData = fileHeader({ y: 0.2*height, z : 0.17*height})

        //Rotations of humans for each wall
        let humanRotation = [3.14, 1.57, 0, -1.57]
        let halfWallVicPos = [[-0.075, -0.136], [-0.014, -0.075], [-0.075, -0.014], [-0.136, -0.075], 
                            [0.075, -0.136], [0.136, -0.075], [0.075, -0.014], [0.014, -0.074], 
                            [-0.075, 0.014], [-0.014, 0.075], [-0.075, 0.136], [-0.136, 0.075],
                            [0.075, 0.014], [0.136, 0.075], [0.075, 0.136], [0.014, 0.075]];
        //Offsets for visual and thermal humans
        let humanOffset = [[0, -0.1375 * tileScale[2]], [0.1375 * tileScale[0], 0], [0, 0.1375 * tileScale[2]], [-0.1375 * tileScale[0], 0]]
        let humanOffsetThermal = [[0, -0.136 * tileScale[2]], [0.136 * tileScale[0], 0], [0, 0.136 * tileScale[2]], [-0.136 * tileScale[0], 0]]
        //Names of types of visual human
        let humanTypesVisual = ["harmed", "unharmed", "stable"]
        //Names of types of hazards
        let hazardTypes = ["F", "P", "C", "O"]

        //Id numbers used to give a unique but interable name to tile pieces
        let tileId = 0
        let checkId = 0
        let trapId = 0
        let goalId = 0
        let swampId = 0
        let humanId = 0
        let obstacleId = 0;
        let hazardId = 0;

        //Resolve corners
        // halfwallout 10, hallwallin 11, halfwalloutinfo 15
        for(let x = 0; x < $scope.length+1; x++) {
            for(let z = 0; z<$scope.width+1; z++) {

                let verticalWalls = 0;
                let horizontalWalls = 0;
                let topLeft = false;

                if((walls[x-1] != null && walls[x-1][z] != null && (walls[x-1][z][1][3] > 0 || walls[x-1][z][10][3] == 1)) || (walls[x-1] != null && walls[x-1][z-1] != null && (walls[x-1][z-1][1][1] > 0 || walls[x-1][z-1][10][1] == 1))) verticalWalls++; //North wall
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][0] > 0 || walls[x][z][10][0] == 1)) || (walls[x-1] != null && walls[x-1][z] != null && (walls[x-1][z][1][2] > 0 || walls[x-1][z][10][2] == 1))) horizontalWalls++;
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][3] > 0 || walls[x][z][10][3] == 2)) || (walls[x] != null && walls[x][z-1] != null && (walls[x][z-1][1][1] > 0 || walls[x][z-1][10][1] == 2))) verticalWalls++;
                if((walls[x-1] != null && walls[x-1][z-1] != null && (walls[x-1][z-1][1][2] > 0 || walls[x-1][z-1][10][2] == 2)) || (walls[x] != null && walls[x][z-1] != null && (walls[x][z-1][1][0] > 0 || walls[x][z-1][10][0] == 2))) horizontalWalls++;

                //Very special case for top left corner
                if((walls[x] != null && walls[x][z] != null && (walls[x][z][1][0] > 0 || walls[x][z][10][0] == 1)) || (walls[x] != null && walls[x][z] != null && (walls[x][z][1][3] > 0 || walls[x][z][10][3] == 2))) topLeft = true;


                if(horizontalWalls > 0 && verticalWalls > 0) {

                    //North wall
                    if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][1][3] > 0)) walls[x-1][z][1][3] = (walls[x-1][z][1][3]) * 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][1][1] > 0) walls[x-1][z-1][1][1] = (walls[x-1][z-1][1][1]) * 3;
                    else if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][10][3] == 1)) walls[x-1][z][15][3] *= 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][10][1] == 1) walls[x-1][z-1][15][1] *= 3;
                    

                    if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][1][2] > 0)) walls[x-1][z][1][2] = (walls[x-1][z][1][2]) * horizontalWalls == 1 ? 5 : 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][1][0] > 0) walls[x][z][1][0] = (walls[x][z][1][0]) * 2;
                    else if((walls[x-1] != null && walls[x-1][z] && walls[x-1][z][10][2] == 1)) walls[x-1][z][15][2] *= horizontalWalls == 1 ? 5 : 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][10][0] == 1) walls[x][z][15][0] *= 2;

                    if((walls[x] != null && walls[x][z-1] && walls[x][z-1][1][1] > 0)) walls[x][z-1][1][1] = (walls[x][z-1][1][1]) * 2;
                    else if(walls[x] != null && walls[x][z] && walls[x][z][1][3] > 0) walls[x][z][1][3] = (walls[x][z][1][3]) * 2;
                    else if((walls[x] != null && walls[x][z-1] && walls[x][z-1][10][1] == 2)) walls[x][z-1][15][1] *= 2; 
                    else if(walls[x] != null && walls[x][z] && walls[x][z][10][3] == 2) walls[x][z][15][3] *= 2; 

                    if((walls[x] != null && walls[x][z-1] && walls[x][z-1][1][0] > 0)) walls[x][z-1][1][0] = (walls[x][z-1][1][0]) * 3;
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][1][2] > 0) walls[x-1][z-1][1][2] = (walls[x-1][z-1][1][2]) * 3;
                    else if((walls[x] != null && walls[x][z-1] && walls[x][z-1][10][0] == 2)) walls[x][z-1][15][0] *= 3; 
                    else if(walls[x-1] != null && walls[x-1][z-1] && walls[x-1][z-1][10][2] == 2) walls[x-1][z-1][15][2] *= 3; 

                    if(topLeft && horizontalWalls == 1 && verticalWalls == 1) {
                        // If the left and top walls are the only horizontal and vertical walls

                        walls[x][z][1][0] /= 2;
                        walls[x][z][1][3] /= 2;
                        if(walls[x][z][10][0] == 1) walls[x][z][15][0] /= 2;
                        if (walls[x][z][10][3] == 1) walls[x][z][15][3] /= 2;
                    }
                }
               
                //inner half tile walls along horizontal edge of 2 different tiles
                horizontalWalls = 0;
                verticalWalls = 0;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][11][0] > 0) verticalWalls++;
                if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][11][2] > 0) verticalWalls++;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] > 0) horizontalWalls++;
                if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] > 0) horizontalWalls++;
                if(horizontalWalls > 0 && verticalWalls > 0) {

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][11][0] > 0) walls[x][z][11][0] *= 2;
                    if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][11][2] > 0) walls[x-1][z][11][2] *= 3;

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] == 1) walls[x][z][15][0] *= 3;
                    else if(walls[x] != null && walls[x][z] != null && walls[x][z][10][0] == 2) walls[x][z][15][0] *= horizontalWalls == 1 ? 5 : 2;

                    if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] == 1) walls[x-1][z][15][2] *= 2;
                    else if(walls[x-1] != null && walls[x-1][z] != null && walls[x-1][z][10][2] == 2) walls[x-1][z][15][2] *= horizontalWalls == 1 ? 5 : 2;
                }


                horizontalWalls = 0;
                verticalWalls = 0;

                //inner half tile walls in center
                if(walls[x] != null && walls[x][z] != null) {
                    if(walls[x][z][11][0] > 0) verticalWalls++;
                    if(walls[x][z][11][1] > 0) horizontalWalls++;
                    if(walls[x][z][11][2] > 0) verticalWalls++;
                    if(walls[x][z][11][3] > 0) horizontalWalls++;

                    if(verticalWalls > 0 && horizontalWalls > 0) {
                        walls[x][z][11][0] *= 3;
                        walls[x][z][11][1] *= horizontalWalls == 1 ? 5 : 2;
                        walls[x][z][11][2] *= 2;
                        walls[x][z][11][3] *= 3;
                    }
                }

                horizontalWalls = 0;
                verticalWalls = 0;
                //inner half tile walls along vertical edge of 2 different tiles
                if((walls[x] != null && (walls[x][z] != null && walls[x][z][10][3] > 0)) || (walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] > 0)) verticalWalls++;
                if(walls[x] != null && walls[x][z] != null && walls[x][z][11][3] > 0) horizontalWalls++;
                if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][11][1] > 0) horizontalWalls++;

                if(verticalWalls > 0 && horizontalWalls > 0) {
                    if(walls[x] != null && walls[x][z] != null && walls[x][z][10][3] == 2) walls[x][z][15][3] *= 3;
                    else if(walls[x] != null && walls[x][z] != null && walls[x][z][10][3] == 1) walls[x][z][15][3] *= 2;

                    if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] == 2) walls[x][z-1][15][1] *= 3;
                    else if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][10][1] == 1) walls[x][z-1][15][1] *= 2;

                    if(walls[x] != null && walls[x][z] != null && walls[x][z][11][3] > 0) walls[x][z][11][3] *= horizontalWalls == 1 ? 5 : 2;

                    if(walls[x] != null && walls[x][z-1] != null && walls[x][z-1][11][1] > 0) walls[x][z-1][11][1] *= 3;

                }

            }
        }

        //String to hold all the humans/hazards
        let allHumans = ""
        let allHazards = ""
        for(let x=0;x<$scope.width;x++){
            for(let z=0;z<$scope.length;z++){
                //Check which corners and external walls and notches are needed
                let externals = checkForExternalWalls([x, z], walls)
                //Name to be given to the tile
                let tileName = "TILE"
                if(walls[z][x][4]) tileName = "START_TILE"
                //Create a new tile with all the data
                if ($scope.cells[String(x * 2 + 1) + "," + String(z * 2 + 1) + ",0"].tile.halfTile) {

                    let t1w = [walls[z][x][10][0] == 1 ? walls[z][x][15][0] : 0, walls[z][x][11][0], walls[z][x][11][3], walls[z][x][10][3] == 2 ? walls[z][x][15][3] : 0];
                    let t2w = [walls[z][x][10][0] == 2 ? walls[z][x][15][0] : 0, walls[z][x][10][1] == 2 ? walls[z][x][15][1] : 0, walls[z][x][11][1], 0]; 
                    let t3w = [0, walls[z][x][11][2], walls[z][x][10][2] == 1 ? walls[z][x][15][2] : 0, walls[z][x][10][3] == 1 ? walls[z][x][15][3] : 0];
                    let t4w = [0, walls[z][x][10][1] == 1 ? walls[z][x][15][1] : 0, walls[z][x][10][2] == 2 ? walls[z][x][15][2] : 0, 0];
                    console.log("b", walls[z][x][10]);
                    
                    let t1e = [externals[0], false, false, externals[3]];
                    let t2e = [externals[0], externals[1], false, false];
                    let t3e = [false, false, externals[2], externals[3]];
                    let t4e = [false, externals[1], externals[2], false];

                    tile = protoHalfTilePart({name: tileName, x: x, z: z, fl: walls[z][x][0] && !walls[z][x][3], tw: walls[z][x][1][0], rw: walls[z][x][1][1], bw: walls[z][x][1][2], lw: walls[z][x][1][3], t1w: t1w, t2w: t2w, t3w: t3w, t4w: t4w, t1e: t1e, t2e: t2e, t3e: t3e, t4e: t4e, curve: walls[z][x][12], start: walls[z][x][4], trap: walls[z][x][3], checkpoint: walls[z][x][2], swamp: walls[z][x][5], width: width, height: height, id: tileId, xScale: tileScale[0], yScale: tileScale[1], zScale: tileScale[2], color: walls[z][x][14], room: walls[z][x][16]});
                    tile = tile.replace(/true/g, "TRUE")
                    tile = tile.replace(/false/g, "FALSE")
                }
                else {
                    tile = protoTilePart({name: tileName, x: x, z: z, fl: walls[z][x][0] && !walls[z][x][3], tw: walls[z][x][1][0], rw: walls[z][x][1][1], bw: walls[z][x][1][2], lw: walls[z][x][1][3], tex: externals[0], rex: externals[1], bex: externals[2], lex: externals[3], start: walls[z][x][4], trap: walls[z][x][3], checkpoint: walls[z][x][2], swamp: walls[z][x][5], width: width, height: height, id: tileId, xScale: tileScale[0], yScale: tileScale[1], zScale: tileScale[2], color: walls[z][x][14], room: walls[z][x][16]});
                    tile = tile.replace(/true/g, "TRUE")
                    tile = tile.replace(/false/g, "FALSE")
                }
                allTiles = allTiles + tile
                //checkpoint
                if(walls[z][x][2]){
                    //Add bounds to the checkpoint boundaries
                    allCheckpointBounds += boundsPart({name: "checkpoint", id: checkId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    checkId = checkId + 1
                }
                //trap
                if(walls[z][x][3]){
                    //Add bounds to the trap boundaries
                    allTrapBounds += boundsPart({name: "trap", id: trapId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    trapId = trapId + 1
                }
                //goal
                if(walls[z][x][4]){
                    //Add bounds to the goal boundaries
                    allGoalBounds += boundsPart({name: "start", id: goalId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    goalId = goalId + 1
                }
                //swamp
                if(walls[z][x][5]){
                    //Add bounds to the goal boundaries
                    allSwampBounds += boundsPart({name: "swamp", id: swampId, xmin: (x * 0.3 * tileScale[0] + startX) - (0.15 * tileScale[0]), zmin: (z * 0.3 * tileScale[2] + startZ) - (0.15 * tileScale[2]), xmax: (x * 0.3 * tileScale[0] + startX) + (0.15 * tileScale[0]), zmax: (z * 0.3 * tileScale[2] + startZ) + (0.15 * tileScale[2]), y: floorPos});
                    //Increment id counter
                    swampId = swampId + 1
                }
                //Increment id counter
                tileId = tileId + 1

                //Human
                if(walls[z][x][6] != 0){
                    //Position of tile
                    let humanPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]
                    let humanRot = humanRotation[walls[z][x][7]]
                    //Randomly move human left and right on wall
                    let randomOffset = [0, 0]
                    if(walls[z][x][7] == 0 || walls[z][x][7] == 2){
                        //X offset for top and bottom
                        randomOffset = [orgRound(getRandomArbitrary(-0.1 * tileScale[0], 0.1 * tileScale[0]), 0.001), 0]
                    }else{
                        //Z offset for left and right
                        randomOffset = [0, orgRound(getRandomArbitrary(-0.1 * tileScale[2], 0.1 * tileScale[2]), 0.001)]
                    }

                    if (walls[z][x][6] >= 5 && walls[z][x][6] <= 8){ //hazards
                        humanPos[0] = humanPos[0] + humanOffsetThermal[walls[z][x][7]][0] + randomOffset[0]
                        humanPos[1] = humanPos[1] + humanOffsetThermal[walls[z][x][7]][1] + randomOffset[1]
                        let score = 30
                        if(walls[z][x][8]) score = 10
                        allHazards = allHazards + hazardPart({x: humanPos[0], z: humanPos[1], rot: humanRot, id: hazardId, type: hazardTypes[walls[z][x][6] - 5], score: score})
                        hazardId = hazardId + 1
                    }else{ //humans
                        humanPos[0] = humanPos[0] + humanOffset[walls[z][x][7]][0] + randomOffset[0]
                        humanPos[1] = humanPos[1] + humanOffset[walls[z][x][7]][1] + randomOffset[1]
                        let score = 15
                        if(walls[z][x][8]) score = 5
                        allHumans = allHumans + visualHumanPart({x: humanPos[0], z: humanPos[1], rot: humanRot, id: humanId, type: humanTypesVisual[walls[z][x][6] - 1], score: score})
                        humanId = humanId + 1
                    }
                }
                //Half Wall Humans
                if(walls[z][x][13]){
                    for (var i in $scope.range(16)) {
                        if (walls[z][x][13][i] != '') {
                            let humanPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]
                            let score = 30
                            let j = 0
                            if(walls[z][x][8]) score = 10
                            if (walls[z][x][13][i] >= 0 && walls[z][x][13][i] <= 3) {
                                score = score / 2;
                                allHumans = allHumans + visualHumanPart({x: humanPos[0] + halfWallVicPos[i][0] * tileScale[0], z: humanPos[1] + halfWallVicPos[i][1] * tileScale[2], rot: humanRotation[i % 4], id: humanId, type: humanTypesVisual[walls[z][x][13][i] - 1], score: score})
                                humanId = humanId + 1
                            }
                            else if (walls[z][x][13][i] >= 5 && walls[z][x][13][i] <= 8) {
                                allHazards = allHazards + hazardPart({x: humanPos[0] + halfWallVicPos[i][0] * tileScale[0], z: humanPos[1] + halfWallVicPos[i][1] * tileScale[2], rot: humanRotation[i % 4], id: hazardId, type: hazardTypes[walls[z][x][13][i] - 5], score: score})
                                hazardId = hazardId + 1
                            }
                        }
                    }
                }
                //Obstacle
                if(walls[z][x][9] != 0){
                    //Default height for static obstacle
                    let height = 0.15

                    //Default size contstraints for static obstacle
                    let minSize = 5
                    let maxSize = 15

                    //Generate random size
                    let width = getRandomArbitrary(minSize, maxSize) / 100.0
                    let depth = getRandomArbitrary(minSize, maxSize) / 100.0

                    //Calculate radius of obstacle
                    let r = (((width / 2.0) ** 2) + ((depth / 2.0) ** 2)) ** 0.50

                    //Boundaries of tile to pick
                    console.log(r)
                    let xBounds = [-0.1 + r, 0.1 - r]
                    let zBounds = [-0.1 + r, 0.1 - r]

                    //Get the centre position of the tile
                    let tPos = [(x * 0.3 * tileScale[0]) + startX , (z * 0.3 * tileScale[2]) + startZ]

                    //Get a random position
                    let pos = [orgRound(getRandomArbitrary(xBounds[0], xBounds[1]), 0.00001), orgRound(getRandomArbitrary(zBounds[0], zBounds[1]), 0.00001)]
                    //Offset with tile position
                    pos[0] = pos[0] + tPos[0]
                    pos[1] = pos[1] + tPos[1]

                    //Random rotation for obstacle
                    let rot = orgRound(getRandomArbitrary(0.00, 6.28), 0.001)

                    allObstacles += obstaclePart({id: obstacleId, xSize: width * tileScale[0], ySize: height * tileScale[1], zSize: depth * tileScale[2], x: pos[0], y: 0 , z: pos[1], rot: rot})
                    //Increment id counter
                    obstacleId = obstacleId + 1

                }
            }
        }

        //Add the data pieces to the file data
        fileData = fileData + groupPart({data: allTiles, name: "WALLTILES"})
        fileData = fileData + groupPart({data: allCheckpointBounds, name: "CHECKPOINTBOUNDS"})
        fileData = fileData + groupPart({data: allTrapBounds, name: "TRAPBOUNDS"})
        fileData = fileData + groupPart({data: allGoalBounds, name: "STARTBOUNDS"})
        fileData = fileData + groupPart({data: allSwampBounds, name: "SWAMPBOUNDS"})
        fileData = fileData + groupPart({data: allObstacles, name: "OBSTACLES"})
        fileData = fileData + groupPart({data: allHumans, name: "HUMANGROUP"})
        fileData = fileData + groupPart({data: allHazards, name: "HAZARDGROUP"})
        fileData = fileData + supervisorPart({time: $scope.time})
        return fileData

    }

     // File APIに対応しているか確認
        if (window.File) {
            var select = document.getElementById('select');

            // ファイルが選択されたとき
            select.addEventListener('change', function (e) {
                // 選択されたファイルの情報を取得
                var fileData = e.target.files[0];

                var reader = new FileReader();
                // ファイル読み取りに失敗したとき
                reader.onerror = function () {
                    alert('ファイル読み取りに失敗しました')
                }
                // ファイル読み取りに成功したとき
                reader.onload = function () {
                    var data = JSON.parse(reader.result);
                    $scope.cells = data.cells;
                    $scope.competitionId = competitionId;

                    $scope.startTile = data.startTile;
                    $scope.numberOfDropTiles = data.numberOfDropTiles;
                    $scope.height = data.height;
                    $scope.width = data.width;
                    $scope.length = data.length;
                    $scope.name = data.name;
                    $scope.time = data.time;
                    $scope.finished = data.finished;
                    $scope.roomTiles = data.roomTiles;
                    console.log($scope.roomTiles)

                    if(data.startTile) $scope.cells[data.startTile.x + ',' + data.startTile.y + ',' + data.startTile.z].tile.checkpoint = false;

                    $scope.$apply();
                }

                // ファイル読み取りを実行
                reader.readAsText(fileData);
            }, false);
        }

    $scope.selectRoom2 = function() {
        if ($scope.selectRoom != 0) {
            $scope.selectRoom = 0;
        }
        else {
            $scope.selectRoom = -1;
        }
    }

    $scope.selectRoom3 = function() {
        if ($scope.selectRoom != 1) {
            $scope.selectRoom = 1;
        }
        else {
            $scope.selectRoom = -1;
        }
    }

    $scope.cellClick = function (x, y, z, isWall, isTile) {

        var cell = $scope.cells[x + ',' + y + ',' + z];
        var halfWallTile;
        var intx = parseInt(x), inty = parseInt(y);
        console.log(cell)

        // If wall
        if (isWall) {
            if (!cell) {
                $scope.cells[x + ',' + y + ',' + z] = {
                    isWall: true,
                    halfWall: 0
                };
            } else {
                halfWallTile = false;
                if (intx % 2 == 0) {
                    if (intx != 0) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(String(intx - 1) + ',' + y + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(String(intx - 1) + ',' + y + ',' + z) > -1);
                    }
                    if (!halfWallTile && intx != $scope.width * 2) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(String(intx + 1) + ',' + y + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(String(intx + 1) + ',' + y + ',' + z) > -1);
                    }
                }
                else {
                    if (inty != 0) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(x + ',' + String(inty - 1) + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(x + ',' + String(inty - 1) + ',' + z) > -1);
                    }
                    if (!halfWallTile && inty != $scope.length * 2) {
                        halfWallTile = ($scope.roomTiles[0].indexOf(x + ',' + String(inty + 1) + ',' + z) > -1 ||
                                        $scope.roomTiles[1].indexOf(x + ',' + String(inty + 1) + ',' + z) > -1);
                    }
                }
                if (halfWallTile) {
                    if(cell.isWall){
                        cell.isWall = false;
                        cell.halfWall = 1;
                    }else if(cell.halfWall == 1){
                        cell.halfWall = 2;
                    }else if(cell.halfWall == 2){
                        cell.halfWall = 0;
                    }else{
                        cell.isWall = true;
                    }
                }
                else {
                    if(cell.isWall){
                        cell.isWall = false;
                    }else{
                        cell.isWall = true;
                    }
                }
            }
        } else if (isTile) {
            if (!cell) {
                cell = $scope.cells[x + ',' + y + ',' + z] = {
                    isTile: true,
                    tile: {
                        changeFloorTo: z,
                        halfTile: 0
                    }
                };
            }
            console.log(cell)
            if ($scope.selectRoom != -1 && cell) {
                let undo = false
                console.log($scope.roomTiles)
                for (a = 0; a < 2; a++) {
                    if ($scope.roomTiles[a]) {
                        for (b = 0; b < $scope.roomTiles[a].length; b++) {
                            if ($scope.roomTiles[a][b] == x+','+y+','+z) {
                                var i = (parseInt(y - 1) / 2 * $scope.width + (parseInt(x - 1) / 2));
                                $(".tile").get(i).style.setProperty("--tileColor", "#b4ffd5");
                                $scope.roomTiles[a].splice(b, 1);
                                $scope.cells[x+','+y+','+z].tile.halfTile = 0;
                                if (a == $scope.selectRoom)
                                    undo = true;
                            }
                        }
                    }
                }
                if (!undo) {
                    $scope.roomTiles[$scope.selectRoom].push(x+','+y+','+z);
                    var i = (parseInt(y - 1) / 2 * $scope.width + (parseInt(x - 1) / 2));
                    if ($scope.selectRoom == 0)
                        $(".tile").get(i).style.setProperty("--tileColor", "#359ef4");
                    else
                        $(".tile").get(i).style.setProperty("--tileColor", "#ed9aef");
                    $scope.cells[x+','+y+','+z].tile.halfTile = 1;
                }
            }
            $scope.open(x, y, z);
        }
        $scope.recalculateLinear();
    }

    $scope.open = function (x, y, z) {
        if ($scope.selectRoom == -1) {
            var modalInstance = $uibModal.open({
                animation: true,
                templateUrl: '/templates/sim_editor_modal.html',
                controller: 'ModalInstanceCtrl',
                size: 'lg',
                scope: $scope,
                resolve: {
                    x: function () {
                        return x;
                    },
                    y: function () {
                        return y;
                    },
                    z: function () {
                        return z;
                    }
                }
            });
        }
    };

    $scope.openMaxScore = function(){
        let victimScore = 0;
        let checkpointScore = 0;
        let exitBonus = 0;
        const victims = ["H", "S", "U"];
        const hazards = ["P", "O", "F", "C"];
        const areaMultiplier = [0, 1, 1.25, 1.5];
        Object.keys($scope.cells).map(function(key){
            let cell = $scope.cells[key];
            if(cell.isTile){
                if(cell.tile.victims){
                    Object.keys(cell.tile.victims).map(function(dir){
                        if(victims.includes(cell.tile.victims[dir])){
                            victimScore += (cell.isLinear ? 5 : 15) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                        }else if(hazards.includes(cell.tile.victims[dir])){
                            victimScore += (cell.isLinear ? 10 : 30) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 20 * areaMultiplier[checkRoomNumberKey(key)];
                        }
                    });
                }
                if(cell.tile.halfWallVic){
                    for(let v of cell.tile.halfWallVic){
                        if(v == "") continue;
                        if(v >= 0 && v <= 3){
                            victimScore += (cell.isLinear ? 5 : 15) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                        }else if(v >= 5 && v <= 8){
                            victimScore += (cell.isLinear ? 10 : 30) * areaMultiplier[checkRoomNumberKey(key)];
                            victimScore += 20 * areaMultiplier[checkRoomNumberKey(key)];
                        }
                    }
                }
                
                if(cell.tile.checkpoint){
                    checkpointScore += 10 * areaMultiplier[checkRoomNumberKey(key)];
                }
            }
        });

        if(victimScore > 0) exitBonus += (victimScore + checkpointScore) * 0.1


        let html = `
            <div class='text-center'>
                <i class='fas fa-calculator fa-3x'></i>
            </div><hr>
            <table class='custom'>
                <thead>
                    <th>Victim / Hazard map score</th>
                    <th>Checkpoint score</th>
                    <th>Exit bonus</th>
                    <th>Map bonus</th>
                    <th>Total score</th>
                </thead>
                <tbody>
                    <td>${victimScore}</td>
                    <td>${checkpointScore}</td>
                    <td>${exitBonus}</td>
                    <td>${(victimScore + checkpointScore + exitBonus)}</td>
                    <td>${2*(victimScore + checkpointScore + exitBonus)}</td>
                </tbody>
            </table>
        `;
        Swal.fire({
            html: html,
            showCloseButton: true, 
        })

    }
}]);


// Please note that $uibModalInstance represents a modal window (instance) dependency.
// It is not the same as the $uibModal service used above.

app.controller('ModalInstanceCtrl',['$scope', '$uibModalInstance', 'x', 'y', 'z', function ($scope, $uibModalInstance, x, y, z) {
    console.log($scope.cell)
    $scope.cell = $scope.$parent.cells[x + ',' + y + ',' + z];
    $scope.isStart = $scope.$parent.startTile.x == x &&
        $scope.$parent.startTile.y == y &&
        $scope.$parent.startTile.z == z;
    $scope.height = $scope.$parent.height;
    $scope.z = z;
    $scope.oldFloorDestination = $scope.cell.tile.changeFloorTo;

    $scope.startChanged = function () {
        if ($scope.isStart) {
            $scope.$parent.startTile.x = x;
            $scope.$parent.startTile.y = y;
            $scope.$parent.startTile.z = z;
        }
    }

    $scope.blackChanged = function () {
       $scope.$parent.recalculateLinear();
    }

     $scope.isHalfWall = function(r, c) {
        var ind = -1, tmp = r * 10 + c;
        if (tmp == 12) ind = 0;
        else if (tmp == 23) ind = 1;
        else if (tmp == 32) ind = 2;
        else if (tmp == 21) ind = 3;
        if (((r % 2 == 1) ^ (c % 2 == 1)) && (r != 0 && c != 0 && r != 4 && c != 4) && 
            $scope.cell && $scope.cell.tile && $scope.cell.tile.curve != undefined && $scope.cell.tile.halfWallIn[ind])
            return 1;
        return 0;
     }
     
     $scope.innerTileClick = function(r, c) {
         console.log(r)
         console.log(c)
        var ind = -1, tmp = r * 10 + c;
        if (tmp == 12) ind = 0;
        else if (tmp == 23) ind = 1;
        else if (tmp == 32) ind = 2;
        else if (tmp == 21) ind = 3;
        if ($scope.cell && $scope.cell.tile) {
            if (r % 2 == 1 && c % 2 == 1) { //curved
                quad = parseInt(r / 2) * 2 + parseInt(c / 2);
                $scope.cell.tile.curve[quad] = ($scope.cell.tile.curve[quad] + 1) % 5;
            }
            else if (((r % 2 == 1) ^ (c % 2 == 1)) && (r != 0 && c != 0 && r != 4 && c != 4)){//half wall
                $scope.cell.tile.halfWallIn[ind] = !$scope.cell.tile.halfWallIn[ind];
            } 
                
        }
     }

    $scope.range = function (n) {
        arr = [];
        for (var i = 0; i < n; i++) {
            arr.push(i);
        }
        return arr;
    }
    $scope.ok = function () {
        $scope.$parent.recalculateLinear();
        $uibModalInstance.close();
    };
}]);
