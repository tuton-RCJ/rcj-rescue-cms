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

    $http.get(`/api/survey/answer/${competitionId}/${survId}`).then(function (response) {
        $scope.survey = response.data.questions;

        let langCheck = false;
        //Check 1st lang
        for(let l of $scope.survey.languages){
            if(l.language == $scope.displayLang && l.enable){
                langCheck = true;
                break;
            }
        }

        if (!langCheck) {
            //Set alternative lang
            for(let l of $scope.survey.languages){
                if(l.enable){
                    $scope.displayLang = l.language;
                    break;
                }
            }
        }
        
        $scope.answers = response.data.answers;
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

    $scope.getAnswer = function(ans, question){
        let answer = ans.answer.filter(a => a.questionId == question.questionId)
        if(answer.length == 1){
            if (question.type == 'file') {
                let html = `<a href="/api/survey/answer/${ans.team._id}/${ans.team.document.token}/${survId}/file/${question.questionId}" >${answer[0].answer}</a>`;
                if (answer[0].hash) html += `<br><span>MD5 Hash: ${answer[0].hash}</span>`;
                return html;
            }
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

    $scope.downloadExcel = function(){
        let workbook = new ExcelJS.Workbook();
        workbook.creator = 'RCJ CMS';
        workbook.created = new Date();
        workbook.modified = new Date();

        let sheet = workbook.addWorksheet($scope.langContent($scope.survey.i18n, 'name').toString());

        sheet.getRow(1).getCell(1).value = $scope.competition.name;

        sheet.getColumn('B').width = 20;

        sheet.getRow(3).getCell(1).value = "Code";
        sheet.getRow(3).getCell(2).value = "Name";

        let col = 4;
        for (let q of $scope.survey.questions) {
            if (q.type == "explanationOnly") continue;
            sheet.getRow(3).getCell(col).value = $scope.langContent(q.i18n, 'title').toString();
            col++;
        }

        let row = 4;
        for(let a of $scope.answers) {
            sheet.getRow(row).getCell(1).value = a.team.teamCode;
            sheet.getRow(row).getCell(2).value = a.team.name;
            col = 4;
            for (let q of $scope.survey.questions) {
                if (q.type == "explanationOnly") continue;
                sheet.getRow(row).getCell(col).value = $scope.getAnswer(a, q);
                col++;
            }
            row ++;
        }

        workbook.xlsx.writeBuffer( {
            base64: true
        })
        .then( function (xls64) {
            // build anchor tag and attach file (works in chrome)
            var a = document.createElement("a");
            var data = new Blob([xls64], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

            var url = URL.createObjectURL(data);
            a.href = url;
            a.download = `${$scope.competition.name} - ${$scope.langContent($scope.survey.i18n, 'name')}.xlsx`;
            document.body.appendChild(a);
            a.click();
            setTimeout(function() {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                },
                0);
        })
        .catch(function(error) {
            console.log(error.message);
        });
    }
    
}]);