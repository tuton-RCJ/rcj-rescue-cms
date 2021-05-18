var app = angular.module("AdminRestore", ['ngTouch','pascalprecht.translate', 'ngCookies', 'ngFileUpload']);
app.controller("AdminRestoreController", ['$scope', '$http', '$translate', 'Upload', function ($scope, $http, $translate, Upload) {
    let trans = [];
    function loadTranslation(tag){
        $translate(`admin.restore.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }
    loadTranslation("queued");
    
    $scope.competitionId = competitionId
    $scope.job = null;

    $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })

    
    $scope.go = function (path) {
        window.location = path
    }

    function updateJobStatus(jobId){
        $http.get("/api/backup/job/" + jobId).then(function (response) {
            $scope.job = response.data
            if($scope.job.state == "completed"){
                Swal.fire({
                    type: 'success',
                    html: trans["queued"]
                }).then((result) => {
                    $scope.go(`/admin/${$scope.job.competition}`);
                })
            }else if($scope.job.state == "failed"){
                Swal.fire({
                    type: 'error',
                    html: $scope.job.reason
                });
            }else{
                setTimeout(updateJobStatus, 1000, jobId);
            }
        })
    }

    $scope.statusIcon = function(status){
        switch(status){
            case 'completed':
                return "fa-check";
            case 'failed':
                return "fa-times";
            case 'delayed':
                return "fa-clock";
            case 'active':
                return "fa-spinner fa-spin";
            case 'waiting':
                return "fa-hourglass-half";
            case 'paused':
                return "fa-pause";
            case 'stuck':
                return "fa-layer-group";
        }
        return "fa-ellipsis-h";
    }

    $scope.statusColour = function(status){
        switch(status){
            case 'completed':
                return "badge-success";
            case 'failed':
                return "badge-danger";
            case 'delayed':
                return "badge-warning";
            case 'active':
                return "badge-primary";
            case 'waiting':
                return "badge-secondary";
            case 'paused':
                return "badge-secondary";
            case 'stuck':
                return "badge-warning";
        }
        return "badge-secondary";
    }

    $scope.firstUpper = function(text){
        if(!text) return;
        return text.substring(0, 1).toUpperCase() + text.substring(1);
    }

    $scope.upload = function(file, errFiles) {
        $scope.f = file;
        $scope.errFile = errFiles && errFiles[0];
        if($scope.errFile){
            Swal.fire({
                type: 'error',
                title: "Error",
                html: $scope.errFile.$error + ' : ' + $scope.errFile.$errorParam
            })
        }
        if (file) {
            $scope.uploading = true;
            file.upload = Upload.upload({
                url: `/api/backup/restore`,
                data: {file: file}
            });

            file.upload.then(function (response) {
                delete $scope.f;
                updateJobStatus(response.data.jobId);
                    
            }, function (response) {
                if (response.status > 0){
                    $scope.errorMsg = response.status + ': ' + response.data.msg;
                     Swal.fire({
                        type: 'error',
                        title: "Error: " + response.statusText,
                        html: response.data.msg
                    })
                }
            }, function (evt) {
                file.progress = Math.min(100, parseInt(100.0 * 
                                         evt.loaded / evt.total));
            });
        }   
    }

}])
