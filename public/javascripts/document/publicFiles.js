var app = angular.module("PublicFiles", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies', 'ngSanitize']);

app.controller("PublicFilesController", ['$scope', '$http', '$translate','$sce', function ($scope, $http, $translate, $sce) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;


    
    $scope.competitionId = competitionId;
    $scope.teamId = teamId;
    $scope.token = token;

    $scope.go = function (path) {
        window.location = path
    }

    $scope.goFile = function(file){
        let link = `${location.protocol}//${location.host}`;
        if(file.fileType == "pdf"){
            link = `${link}/components/pdfjs/web/viewer.html?file=/api/document/files/${$scope.team._id}/${token}/${file.fileName}.pdf`
        }else if(file.fileType == "movie"){
            link = `${link}/document/embed_video?video=/api/document/files/${$scope.team._id}/${token}/${file.fileName}.mp4`
        }else if(file.fileType == "zip"){
            link = `${link}/api/document/files/${$scope.team._id}/${token}/${file.fileName}.zip`
        }
        $scope.go(link);
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }

    $scope.fileIcon = function(type){
        if(type == null) return "fa-file";
        switch(type){
            case 'pdf':
                return "fa-file-pdf";
            case 'movie':
                return "fa-file-video";
            case 'zip':
                return "fa-file-archive";
        }
        return "fa-file";
    }

    $scope.langContent = function(data, target){
        if(data[target]) return data[target];
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;        
        })[0][target]);

        return(data[target]);
    }

    $http.get("/api/competitions/" + competitionId + "/documents/" + leagueId).then(function (response) {
        $scope.competition = response.data
        $scope.files = [];
        for(let b of response.data.blocks){
            for(let q of b.questions){
                if(q.public && (q.type=="pdf" || q.type=="movie" || q.type=="zip")){
                    $scope.files.push({
                        fileName: q.fileName,
                        fileType: q.type,
                        i18n: q.i18n
                    });
                }
            }
        }
        console.log($scope.files)

        $scope.languages = response.data.languages;
        //Check 1st lang
        for(let l of $scope.languages){
            if(l.language == $scope.displayLang && l.enable) return;
        }

        //Set alternative lang
        for(let l of $scope.languages){
            if(l.enable){
                $scope.displayLang = l.language;
                return;
            }
        }
    })

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/teams/" + teamId).then(function (response) {
        $scope.team = response.data;
    })
}])
