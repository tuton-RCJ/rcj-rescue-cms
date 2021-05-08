var app = angular.module("SurveyList", ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies', 'ui.select']);

app.controller('SurveyListController', ['$scope', '$uibModal', '$log', '$http', '$translate', function ($scope, $uibModal, $log, $http, $translate) {
    $scope.competitionId = competitionId

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    function updateList(){
        $http.get(`/api/survey/list/${competitionId}`).then(function (response) {
            $scope.survey = response.data
            for(let suvr of $scope.survey){
                let name = suvr.i18n.filter(i => i.language == currentLang && suvr.languages.some( l => l.language == i.language && l.enable));
                if(name.length == 1){
                    suvr.name = name[0].name;
                }else{
                    let name = suvr.i18n.filter(i => suvr.languages.some( l => l.language == i.language && l.enable));
                    if(name.length > 0){
                        suvr.name = name[0].name;
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
        window.location = `/admin/${competitionId}/survey/edit/${id}`;
    }

    $scope.answers = function(id){
        window.location = `/admin/${competitionId}/survey/answers/${id}`;
    }

    $scope.delete = async function (surv) {
        const {
            value: operation
        } = await swal({
            title: "Remove this survey?",
            text: "Are you sure you want to remove the survey: " + surv.name + '?',
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
            $http.delete(`/api/survey/delete/${competitionId}/${surv._id}`).then(function (response) {
                updateList()
            }, function (error) {
                console.log(error)
            })
        }
    }
}])
