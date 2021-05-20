var app = angular.module("SurveyAnswers", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies', 'ngSanitize']);

app.controller("SurveyAnswersController", ['$scope', '$http', '$translate','$sce', function ($scope, $http, $translate, $sce) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });
    
    let saved_mes;
    $translate('document.saved').then(function (val) {
        saved_mes = val;
    }, function (translationId) {
    // = translationId;
    });

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();
    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;
    
    $scope.competitionId = competitionId

    $scope.go = function (path) {
        window.location = path
    }
    
    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })


    $http.get(`/api/survey/edit/${competitionId}/${survId}`).then(function (response) {
        $scope.survey = response.data;
        //Check 1st lang
        for(let l of $scope.survey.languages){
            if(l.language == $scope.displayLang && l.enable){
                updateAnswers();
                return;
            }
        }

        //Set alternative lang
        for(let l of $scope.survey.languages){
            if(l.enable){
                $scope.displayLang = l.language;
                updateAnswers();
                return;
            }
        }
    })

    function updateAnswers(){
        $http.get(`/api/survey/answer/${competitionId}/${survId}`).then(function (response) {
            $scope.answers = response.data;
            for(let answer of $scope.answers){
                for(let ans of answer.answer){
                    let question = $scope.survey.questions.filter(q => q.questionId == ans.questionId);
                    if(question.length == 1){
                        question = question[0];
                        if(question.type == 'select'){
                            ans.answer = question.i18n.filter(i => i.language == $scope.displayLang)[0].options.filter(o => o.value == ans.answer)[0].text;
                        }
                    }
                }
            }
        })
    }
    

    $scope.edit = function(surv){
        window.open(`/mypage/${surv.team._id}/${surv.team.document.token}/survey/${survId}`, '_blank');
    }

    $scope.langContent = function(data, target){
        if(!data) return;
        if(data[target]) return data[target];
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;        
        })[0][target]);

        return(data[target]);
    }

    $scope.getAnswer = function(answers, question){
        let answer = answers.filter(a => a.questionId == question.questionId)
        if(answer.length == 1){
            return answer[0].answer;
        }
        return "";
    }

    $scope.delete = async function (ans) {
        if(!ans.team){
            ans.team = {};
            ans.team.name = "Deleted team";
        }
        const {
            value: operation
        } = await swal({
            title: "Remove this answer?",
            text: "Are you sure you want to remove the answer by: " + ans.team.name + '?',
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
            $http.delete(`/api/survey/answer/${competitionId}/${ans._id}`).then(function (response) {
                updateAnswers()
            }, function (error) {
                console.log(error)
            })
        }
    }
    
}]);