var app = angular.module("ResvList", ['ngTouch','pascalprecht.translate', 'ngCookies']);
app.controller("ResvListController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    $scope.competitionId = competitionId

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();
    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    function updateList(){
        $http.get(`/api/reservation/config/${competitionId}`).then(function (response) {
            $scope.reservation = response.data
            for(let resv of $scope.reservation){
                let name = resv.i18n.filter(i => i.language == currentLang && resv.languages.some( l => l.language == i.language && l.enable));
                if(name.length == 1){
                    resv.name = name[0].name;
                }else{
                    let name = resv.i18n.filter(i => resv.languages.some( l => l.language == i.language && l.enable));
                    if(name.length > 0){
                        resv.name = name[0].name;
                    }
                }
            }
        })
    }
    updateList();
    
    $scope.go = function (path) {
        window.location = path
    }

    $scope.edit = function(id){
        window.location = `/admin/${competitionId}/reservation/edit/${id}`;
    }

    $scope.admin = function(id){
        window.location = `/admin/${competitionId}/reservation/admin/${id}`;
    }

    $scope.delete = async function (resv) {
        const {
            value: operation
        } = await swal({
            title: "Remove reservation master?",
            text: "Are you sure you want to remove the reservation master: " +
              resv.name + '?',
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
            $http.delete(`/api/reservation/config/${competitionId}/${resv._id}`).then(function (response) {
                updateList()
            }, function (error) {
                console.log(error)
            })
        }
    }
}])
