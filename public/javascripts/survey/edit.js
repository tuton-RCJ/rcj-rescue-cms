// register the directive with your app module
var app = angular.module('SurveyEditor', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies', 'ngQuill','ui.select']);

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
app.controller('SurveyEditorController', ['$scope', '$uibModal', '$log', '$http', '$translate', function ($scope, $uibModal, $log, $http, $translate) {

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
    

    $translate('document.editor.import').then(function (val) {
        $("#select").fileinput({
            'showUpload': false,
            'showPreview': false,
            'showRemove': false,
            'showCancel': false,
            'msgPlaceholder': val,
            allowedFileExtensions: ['json'],
            msgValidationError: "ERROR"
        });
    }, function (translationId) {
        // = translationId;
    });    

    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    if(survId){
        $http.get(`/api/survey/edit/${competitionId}/${survId}`).then(function (response) {
            $scope.surv = response.data;
            $scope.surv.deadline = new Date($scope.surv.deadline);
            if($scope.surv.languages == null || $scope.surv.languages.length != availableLangs.length){
                for(let l of availableLangs){
                    if(!$scope.surv.languages.some(l => l.language == l)){
                        $scope.surv.languages.push({
                            'language': l,
                            'enable': true
                        });
                    }
                }
            }
        })
    }else{
        let tmpDeadline = new Date();
        tmpDeadline.setUTCHours(23);
        tmpDeadline.setMinutes(59);
        tmpDeadline.setSeconds(59);
        tmpDeadline.setMilliseconds(0);
        tmpDeadline.setDate(tmpDeadline.getDate() + 7);
        $scope.surv = {
            competition: competitionId,
            i18n: [],
            league: [],
            team: [],
            deadline: tmpDeadline,
            enable: false,
            reEdit: false,
            languages: [],
            questions: []
        };

        $scope.surv.i18n.push({
            language: currentLang,
            name: '',
            topDescription: ''
        });
        $scope.surv.languages.push({
            'language': currentLang,
            'enable': true
        });
        for(let l of availableLangs){
            if(l != currentLang){
                $scope.surv.i18n.push({
                    language: l,
                    name: '',
                    topDescription: ''
                });
                $scope.surv.languages.push({
                    'language': l,
                    'enable': true
                });
            }
        }
    }
    

    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    $http.get("/api/competitions/" + competitionId + "/teams").then(function (response) {
        $scope.teams = response.data;
    })


    function getUniqueStr(){
        let strong = 1000;
        return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
    }

    $scope.addQuestion = function (number, type){
        let i18n = [{
            language: currentLang,
            title: '',
            description: '',
            options: [{
                value: 'option0',
                text: ''
            }]
        }];

        for(let l of availableLangs){
            if(l != currentLang){
                i18n.push({
                    language: l,
                    title: '',
                    description: '',
                    options: [{
                        value: 'option0',
                        text: ''
                    }]
                });
            }
        }

        let tmp = {
            questionId: getUniqueStr(),
            i18n: i18n,
            type: type,
            scale: {
                least: 1,
                most: 5
            }
        };
        $scope.surv.questions.splice(number,0,tmp);
    }

    $scope.moveQuestion = function (origin, destination) {
        let temp = $scope.surv.questions[destination];
        $scope.surv.questions[destination] = $scope.surv.questions[origin];
        $scope.surv.questions[origin] = temp;
    };

    $scope.removeQuestion = function (number){
        $scope.surv.questions.splice(number,1);
    }

    $scope.addOption = function(questionNo, i18nNo){
        let otmp = {
            value: 'option'+$scope.surv.questions[questionNo].i18n[i18nNo].options.length,
            text: ''
        };
        $scope.surv.questions[questionNo].i18n[i18nNo].options.push(otmp);
    }

    $scope.moveOption = function (questionNo, i18nNo, origin, destination) {
        let temp = $scope.surv.questions[questionNo].i18n[i18nNo].options[destination].text;
        $scope.surv.questions[questionNo].i18n[i18nNo].options[destination].text = $scope.surv.questions[questionNo].i18n[i18nNo].options[origin].text;
        $scope.surv.questions[questionNo].i18n[i18nNo].options[origin].text = temp;
    };
    
    $scope.removeOption = function (questionNo, i18nNo, number){
        $scope.surv.questions[questionNo].i18n[i18nNo].options.splice(number,1);
    }    
    
    $scope.go = function (path) {
        window.location = path
    }

    
    
    $scope.save = function () {
        if(survId){
            $http.put(`/api/survey/edit/${competitionId}/${survId}`, $scope.surv).then(function (response) {
                Toast.fire({
                    type: 'success',
                    title: saved_mes
                })
            }, function (response) {
                Toast.fire({
                    type: 'error',
                    title: "Error: " + response.statusText,
                    html: response.data.msg
                })
            });
        }else{
            $http.post(`/api/survey/edit/${competitionId}/`, $scope.surv).then(function (response) {
                Toast.fire({
                    type: 'success',
                    title: saved_mes
                })
                window.location.href = `/admin/${competitionId}/survey/edit/${response.data.id}`;
            }, function (response) {
                Toast.fire({
                    type: 'error',
                    title: "Error: " + response.statusText,
                    html: response.data.msg
                })
            });
        }
        
    }

    function remove_id(data){
        for (var key in data) {
            if(key =="_id") delete data[key];
            if(key == "$$hashKey") delete data[key];
            if (typeof data[key] === "object") {
                remove_id(data[key]);
            }
        }
    }
    
    $scope.deadlineColour = function(deadline){
        let today = new Date();
        let tomorrow = new Date();

        tomorrow.setDate(today.getDate() + 1);

        if(deadline > tomorrow) return '#bcffbc';
        if(deadline > today) return '#ffffc6';
        return '#ffcccc';
    }

    $scope.export = function () {
        remove_id($scope.surv);

        var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify($scope.surv))
        var downloadLink = document.createElement('a')
        document.body.appendChild(downloadLink);
        downloadLink.setAttribute("href", dataStr)
        downloadLink.setAttribute("download", $scope.competition.name + '.json')
        downloadLink.click()
        document.body.removeChild(downloadLink);
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
                $scope.surv = data;
                $scope.surv.deadline = new Date($scope.surv.deadline);
                $scope.$apply();
            }

            // ファイル読み取りを実行
            reader.readAsText(fileData);
        }, false);
    }

}]);



