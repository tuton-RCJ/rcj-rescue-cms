var app = angular.module('TeamAdmin', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies']);

// function referenced by the drop target
app.controller('TeamAdminController', ['$scope', '$uibModal', '$log', '$timeout', '$http','$translate', '$cookies',function ($scope, $uibModal, $log, $timeout, $http, $translate, $cookies) {

    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    $scope.total = 0;

    var header_mes;
    $translate('admin.teamBulk.headerError').then(function (val) {
        header_mes = val;
    }, function (translationId) {
        // = translationId;
    });

    let saved_mes;
    $translate('document.saved').then(function (val) {
        saved_mes = val;
    }, function (translationId) {
    // = translationId;
    });

    $scope.competitionId = competitionId;
    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/teams/leagues").then(function (response) {
        $scope.leagues = response.data
    })

    
    
    $scope.go = function (path) {
        window.location = path
    }

    $scope.header = [];

    $scope.addBulkTeam = function(){
        let headerCheck = {
            "teamCode": 0,
            "name": 0,
            "country": 0,
            "league": 0,
            "email": 0,
            "undefined": 0
        };
        for(let h of $scope.header){
            headerCheck[h]++;
        }
        if(headerCheck["undefined"] > 0 || headerCheck["name"] > 1 || headerCheck["country"] > 1 || headerCheck["league"] > 1 || headerCheck["teamCode"] > 1 || headerCheck["name"] < 1 || headerCheck["league"] < 1){
            Toast.fire({
                type: 'error',
                title: "ERROR",
                html: header_mes
            })
            return;
        }

        let count = 0;
        let data = [];
        for(let row of $scope.csv){
            if(count){
                let team = {
                    "teamCode": "",
                    "name": "",
                    "league": "",
                    "competition": competitionId,
                    "country": "",
                    "email" : []
                };
                for(let i=0; i<row.length; i++){
                    if($scope.header[i] == "email"){
                        if(row[i]) team.email.push(row[i]);
                    }else{
                        team[$scope.header[i]] = row[i];
                    }
                }
                data.push(team);
            }
            count++;
        }
        
        
        $http.post("/api/teams/bulk", data).then(function (response) {
            Toast.fire({
                type: 'success',
                title: saved_mes
            })
            $scope.total = data.length;
        }, function (error) {
            console.log(error)
            Toast.fire({
                type: 'error',
                title: "ERROR",
                html: error.data.error
            })
        })



        
    }



    if (window.File) {
        var result = document.getElementById('result');
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
                // 行単位で配列にする
                $scope.csv = $.csv()(reader.result);
                console.log($scope.csv)
                for(let r of $scope.csv[0]){
                    if(r.match(/TeamCode/)) $scope.header.push("teamCode");
                    else if(r.match(/TeamName/)) $scope.header.push("name");
                    else if(r.match(/Region/)) $scope.header.push("country");
                    else if(r.match(/League/)) $scope.header.push("league");
                    else if(r.match(/Email/)) $scope.header.push("email");
                    else $scope.header.push("undefined");
                }
                $scope.$apply();
            }

            // ファイル読み取りを実行
            reader.readAsText(fileData, 'Shift_JIS');
        }, false);
    }


    /* Usage:
     *  jQuery.csv()(csvtext)		returns an array of arrays representing the CSV text.
     *  jQuery.csv("\t")(tsvtext)		uses Tab as a delimiter (comma is the default)
     *  jQuery.csv("\t", "'")(tsvtext)	uses a single quote as the quote character instead of double quotes
     *  jQuery.csv("\t", "'\"")(tsvtext)	uses single & double quotes as the quote character
     *  jQuery.csv(",", "", "\n")(tsvtext)	カンマ区切りで改行コード「\n」
     */
    jQuery.extend({
        csv: function (delim, quote, lined) {
            delim = typeof delim == "string" ? new RegExp("[" + (delim || ",") +
                    "]") : typeof delim ==
                "undefined" ? "," : delim;
            quote = typeof quote == "string" ? new RegExp("^[" + (quote || '"') +
                    "]") : typeof quote ==
                "undefined" ? '"' : quote;
            lined = typeof lined == "string" ? new RegExp("[" + (lined || "\r\n") +
                    "]+") : typeof lined ==
                "undefined" ? "\r\n" : lined;

            function splitline(v) {
                // Split the line using the delimitor
                var arr = v.split(delim),
                    out = [],
                    q;
                for (var i = 0, l = arr.length; i < l; i++) {
                    if (q = arr[i].match(quote)) {
                        for (j = i; j < l; j++) {
                            if (arr[j].charAt(arr[j].length - 1) == q[0]) {
                                break;
                            }
                        }
                        var s = arr.slice(i, j + 1).join(delim);
                        out.push(s.substr(1, s.length - 2));
                        i = j;
                    } else {
                        out.push(arr[i]);
                    }
                }

                return out;
            }

            return function (text) {
                var lines = text.split(lined);
                for (var i = 0, l = lines.length; i < l; i++) {
                    lines[i] = splitline(lines[i]);
                }

                // 最後の行を削除
                var last = lines.length - 1;
                if (lines[last].length == 1 && lines[last][0] == "") {
                    lines.splice(last, 1);
                }

                return lines;
            };
        }
    });


}]);
