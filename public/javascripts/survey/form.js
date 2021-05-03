// register the directive with your app module
var app = angular.module('SurveyForm', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies', 'ngQuill', 'ngSanitize']);
app.constant('NG_QUILL_CONFIG', {
    /*
     * @NOTE: this config/output is not localizable.
     */
    modules: {
      toolbar: [
        ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
        ['blockquote', 'code-block'],
  
        [{ 'header': 1 }, { 'header': 2 }],               // custom button values
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'script': 'sub' }, { 'script': 'super' }],     // superscript/subscript
        [{ 'indent': '-1' }, { 'indent': '+1' }],         // outdent/indent
        [{ 'direction': 'rtl' }],                         // text direction
  
        [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
        [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
  
        [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
        [{ 'font': [] }],
        [{ 'align': [] }],
  
        ['clean'],                                         // remove formatting button
  
        ['link']                         // link and image, video
      ]
    },
    theme: 'snow',
    debug: 'warn',
    placeholder: '',
    readOnly: false,
    bounds: document.body,
    scrollContainer: null
  })
  
  app.config([
    'ngQuillConfigProvider',
    'NG_QUILL_CONFIG',
  
    function (ngQuillConfigProvider, NG_QUILL_CONFIG) {
      ngQuillConfigProvider.set(NG_QUILL_CONFIG)
    }
  ])

// function referenced by the drop target
app.controller('SurveyFormController', ['$scope', '$uibModal', '$log', '$http', '$translate','$sce', '$timeout' , function ($scope, $uibModal, $log, $http, $translate, $sce, $timeout) {

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

    let trans = [];
    function loadTranslation(tag){
        $translate(`survey.js.${tag}`).then(function (val) {
            trans[tag] = val;
        }, function (translationId) {
        // = translationId;
        });
    }

    loadTranslation("multiple");
    loadTranslation("onlyOnce");
    loadTranslation("submit");
    loadTranslation("submitButton");
    loadTranslation("cancelButton");
    loadTranslation("complete");

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    $scope.token = token;
    $scope.teamId = teamId;

    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;

    $scope.rangeS =  (start, end) => [...Array((end - start) + 1)].map((_, i) => start + i);
    
    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/teams/" + teamId).then(function (response) {
        $scope.team = response.data;
        $http.get(`/api/survey/question/${teamId}/${token}/${survId}`).then(function (response) {
            $scope.survey = response.data;

            $http.get(`/api/survey/answer/${teamId}/${token}/${survId}`).then(function (response) {
                let ans = response.data;
                $scope.answers = [];
                if(ans){
                    for(let a of ans){
                        $scope.answers[a.questionId] = a.answer;
                    }
                }else{
                    for(let q of $scope.survey.questions){
                        if(q.type == 'select'){
                            $scope.answers[q.questionId] = 'option1';
                        }else if(q.type == 'scale'){
                            $scope.answers[q.questionId] = q.scale.least;
                        }else{
                            $scope.answers[q.questionId] = '';
                        }
                    }
                    console.log($scope.answers)
                }        
            })
            
            //Check 1st lang
            for(let l of $scope.survey.languages){
                if(l.language == $scope.displayLang && l.enable) return;
            }
    
            //Set alternative lang
            for(let l of $scope.survey.languages){
                if(l.enable){
                    $scope.displayLang = l.language;
                    return;
                }
            }
        })
    })


    $scope.submit = async function () {
        let sendAns = [];
        for (let key in $scope.answers) {
            let tmp = {
                questionId: key,
                answer: $scope.answers[key]
            };
            sendAns.push(tmp);
        }
        
        let confirmMes = '';
        if($scope.survey.reEdit){
            confirmMes = trans["multiple"];
        }else{
            confirmMes = trans["onlyOnce"];
        }

        const {
            value: operation
        } = await swal({
            title: trans["submit"],
            text: confirmMes,
            type: "warning",
            showCancelButton: true,
            confirmButtonText: trans["submitButton"],
            cancelButtonText: trans["cancelButton"],
            confirmButtonColor: "#2ecc71",
        })

        if (operation) {
            $http.put(`/api/survey/answer/${teamId}/${token}/${survId}`, sendAns).then(function (response) {
                Swal.fire({
                    title: trans["complete"],
                    type: "success",
                    confirmButtonText: `OK`,
                  }).then((result) => {
                    window.location = `/mypage/${teamId}/${token}`;
                  })
                
            }, function (response) {
                Swal.fire(
                    'Oops!',
                    response.data.msg,
                    'error'
                )
            });
        }
    }


    $scope.deadline = function(time){
        if(!time) return;
        let d = new Date(time);
        let options = { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",timeZoneName:"long" };
        return(new Intl.DateTimeFormat(navigator.language, options).format(d));
    }

    $scope.langContent = function(data, target){
        if(!data) return;
        if(data[target]) return data[target];
        data[target] = $sce.trustAsHtml(data.filter( function( value ) {
            return value.language == $scope.displayLang;        
        })[0][target]);

        return(data[target]);
    }

    $scope.langArray = function(data, target){
        if(data[target]) return data[target];
        data[target] = data.filter( function( value ) {
            return value.language == $scope.displayLang;        
        })[0][target];
        return(data[target]);
    }

    
    $scope.changeLocale = function(){
        $scope.go('/locales');
    }

    $scope.go = function (path) {
        window.location = path
    }

}]);
