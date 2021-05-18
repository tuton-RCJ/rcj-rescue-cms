var app = angular.module("AdminBackup", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("AdminBackupController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    $scope.competitionId = competitionId

    let trans = [];
    function loadTranslation(tag){
        $translate(`admin.backup.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }

    loadTranslation("queued");

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    function updateList(){
        $http.get("/api/backup/list/" + competitionId).then(function (response) {
            $scope.backedup = response.data
        })
    }
    updateList();
    
    $scope.go = function (path) {
        window.location = path
    }

    $scope.time = function(time){
        let options = {year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric"};
        return(new Intl.DateTimeFormat(navigator.language, options).format(time*1000));
    }
    
    $scope.exeBackup = function () {
        $http.get('/api/backup/'+$scope.competitionId).then(function (response) {
            Swal.close()
            Swal({
                type: 'success',
                html: trans["queued"]
            })
        }, function (error) {
            console.log(error)
            Swal.close()
            Swal({
                type: 'error',
                title: "ERROR",
                html: error.data.msg
            })
        })
    }

    $scope.download = function(name){
        window.open(`/api/backup/archive/${$scope.competitionId}/${name}`)
    }

    $scope.delete = async function (name) {
        const {
            value: operation
        } = await swal({
            title: "Remove this back up?",
            text: "Are you sure you want to remove the back up: " + name + '?',
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
            $http.delete(`/api/backup/archive/${$scope.competitionId}/${name}`).then(function (response) {
                updateList()
            }, function (error) {
                console.log(error)
            })
        }
    }

}])
