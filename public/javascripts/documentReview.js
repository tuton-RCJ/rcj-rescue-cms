// register the directive with your app module
var app = angular.module('DocumentReview', ['ngTouch','ngAnimate', 'ui.bootstrap', 'pascalprecht.translate', 'ngCookies', 'ngQuill', 'ngSanitize', 'ngFileUpload']);
let uploading_mes;
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
  
        ['link', 'image', 'video']                         // link and image, video
      ],
      imageResize: {
      },
      imageDropAndPaste: {
      },
      imageUpload: {
        url: `/api/document/review/files/usercontent/${teamId}`, // server url. If the url is empty then the base64 returns
        method: 'POST', // change query method, default 'POST'
        name: 'image', // custom form name
        withCredentials: false, // withCredentials
        headers: {}, // add custom headers, example { token: 'your-token'}
        // personalize successful callback and call next function to insert new url to the editor
        callbackOK: (serverResponse, next) => {
            next(serverResponse.url);
            Swal.close()
        },
        // personalize failed callback
        callbackKO: serverError => {
            console.log(serverError)
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: serverError.type
            })
        },
        checkBeforeSend: (file, next) => {
            Swal.fire({
                title: uploading_mes,
                allowOutsideClick : false,
                onBeforeOpen: () => {
                    Swal.showLoading();
                }
            })
            next(file); // go back to component and send to the server
        }
      }
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
app.controller('DocumentReviewController', ['$scope', '$uibModal', '$log', '$http', '$translate','$sce', 'Upload', '$timeout' , function ($scope, $uibModal, $log, $http, $translate, $sce, Upload, $timeout) {

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

    let upload_mes;
    $translate('document.uploaded').then(function (val) {
        upload_mes = val;
    }, function (translationId) {
    // = translationId;
    });

    let hints_mes;
    $translate('document.form.hints').then(function (val) {
        hints_mes = val;
    }, function (translationId) {
    // = translationId;
    });

    $translate('document.form.uploading').then(function (val) {
        uploading_mes = val;
    }, function (translationId) {
    // = translationId;
    });


    const currentLang = $translate.proposedLanguage() || $translate.use();
    const availableLangs =  $translate.getAvailableLanguageKeys();

    $scope.token = token;

    $scope.currentLang = currentLang;
    $scope.displayLang = currentLang;

    $scope.uploaded = [];
    
    $scope.updateTime = new Date().getTime()/1000;

    $scope.videoRefresh = false;
    $scope.rangeS =  (start, end) => [...Array((end - start) + 1)].map((_, i) => start + i);

    $scope.comments = "";

    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    $http.get("/api/teams/" + teamId).then(function (response) {
        $scope.team = response.data;

        $http.get("/api/competitions/leagues/"+$scope.team.league).then(function (response) {
            $scope.league = response.data
        });

        $scope.updateUploaded();
        $scope.updateReviewUploaded();
        
        $http.get("/api/competitions/" + competitionId + "/documents/" + $scope.team.league + "/review").then(function (response) {
            $scope.blocks = response.data.blocks;
            $scope.notifications = response.data.notifications;
            $scope.languages = response.data.languages;
            $scope.review = response.data.review;

            $http.get("/api/document/answer/"+ $scope.team._id + "/" + token).then(function (response) {
                $scope.answers = response.data;
                if(!$scope.answers.length){
                    for(let b of $scope.blocks){
                        let ba = [];
                        for(let q of b.questions){
                            if(q.type == "select") ba.push('option0');
                            else ba.push('');
                        }
                        $scope.answers.push(ba);
                    }
                }
            });

            $http.get("/api/document/review/" + teamId).then(function (response) {
                $scope.reviewComments = response.data;
                let fil = $scope.reviewComments.filter((r) => r.reviewer && r.reviewer._id == userId);
                $scope.myComments = [];

                if(fil.length == 0){
                    for(let b of $scope.review){
                        let ba = [];
                        for(let q of b.questions){
                            if(q.type == "select"){
                                ba.push('option0');
                            }
                            else{
                                ba.push('');
                            }
                        }
                        $scope.myComments.push(ba);
                    }
                }else{
                    $scope.myComments = fil[0].comments;
                }
            })
            
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

        
    })

    

    

    $scope.save = function () {
        $http.put("/api/document/review/" + teamId, $scope.myComments).then(function (response) {
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
    }

    $scope.scaleAnswer = function(b, q, a){
        if(!$scope.myComments[b]) $scope.myComments[b] = [];
        $scope.myComments[b][q] = a;
        $scope.save();
    }

    $scope.langContent = function(data, target){
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
        $scope.save();
        window.location = path
    }

    $scope.getParam = function (key) {
        var str = location.search.split("?");
        if (str.length < 2) {
          return "";
        }

        var params = str[1].split("&");
        for (var i = 0; i < params.length; i++) {
          var keyVal = params[i].split("=");
          if (keyVal[0] == key && keyVal.length == 2) {
            return decodeURIComponent(keyVal[1]);
          }
        }
        return "";
    }

    $scope.backPage = function(){
        if($scope.getParam("return")) $scope.go($scope.getParam("return"));
        else window.history.back(-1);
        return false;
    }


    $scope.updateUploaded = function(){
        $http.get("/api/document/files/" + $scope.team._id + '/' + token).then(function (response) {
            $scope.uploaded = response.data;
            $scope.updateTime = new Date().getTime()/1000;
        })
    }

    $scope.updateReviewUploaded = function(){
        $http.get("/api/document/review/files/" + $scope.team._id).then(function (response) {
            $scope.uploadedReview = response.data;
            $scope.updateTime = new Date().getTime()/1000;
        })
    }

    $scope.checkUploaded = function(name){
        return($scope.uploaded.some((n) => new RegExp(name+'\\.').test(n)));
    }

    $scope.checkUploadedReview = function(name){
        return($scope.uploadedReview.some((n) => new RegExp(userName + '/' + name+'\\.').test(n)));
    }

    $scope.nameUploaded = function(name){
        return($scope.uploaded[$scope.uploaded.findIndex((n) => new RegExp(name+'\\.').test(n))]);
    }

    $scope.nameUploadedReview = function(name){
        return($scope.uploadedReview[$scope.uploadedReview.findIndex((n) => new RegExp(userName + '/' + name+'\\.').test(n))]);
    }

    $scope.getPdfLink = function(name){
        return("/components/pdfjs/web/viewer.html?file=/api/document/files/" + $scope.team._id + "/" + token + "/" + $scope.nameUploaded(name) + '&v=' + $scope.updateTime);
    }

    $scope.getPdfLinkReview = function(name){
        return("/components/pdfjs/web/viewer.html?file=/api/document/review/files/" + $scope.team._id + "/" + $scope.nameUploadedReview(name) + '&v=' + $scope.updateTime);
    }

    $scope.getVideoList = function(name){
        let res = $scope.uploaded.filter(function(value) {
            return new RegExp(name+'\\.').test(value);
        });
        return res;
    }

    $scope.getVideoListReview = function(name){
        let res = $scope.uploadedReview.filter(function(value) {
            return new RegExp(userName + '/' + name+'\\.').test(value);
        });
        return res;
    }


    $scope.getVideoLink = function(path){
        return("/api/document/files/" + $scope.team._id + "/" + token + "/" + path + '?v=' + $scope.updateTime);
    }

    $scope.getVideoLinkReview = function(path){
        return("/api/document/review/files/" + $scope.team._id + "/" + path + '?v=' + $scope.updateTime);
    }

    $scope.getThumbnailLink = function(name){
        return("/api/document/files/" + $scope.team._id + "/" + token + "/" + $scope.nameUploaded(name+'-thumbnail') + '?v=' + $scope.updateTime);
    }

    $scope.getThumbnailLinkReview = function(name){
        return("/api/document/review/files/" + $scope.team._id + "/" + $scope.nameUploadedReview(name+'-thumbnail') + '?v=' + $scope.updateTime);
    }

    $scope.uploadFiles = function(question, file, errFiles) {
        question.f = file;
        question.errFile = errFiles && errFiles[0];
        if(question.errFile){
            Toast.fire({
                type: 'error',
                title: "Error",
                html: question.errFile.$error + ' : ' + question.errFile.$errorParam
            })
        }
        if (file) {
            //File type check
            if(question.type == "pdf"){
                if(file.type != "application/pdf"){
                    question.errFile = file;
                    question.errFile.$error = "File type error. You should select PDF file.";
                    Toast.fire({
                        type: 'error',
                        title: "Error",
                        html: "File type error. You should select PDF file."
                    })
                    return;
                }
            }else if(question.type == "picture"){
                if(!file.type.startsWith("image/")){
                    question.errFile = file;
                    question.errFile.$error = "File type error. You should select image file.";
                    Toast.fire({
                        type: 'error',
                        title: "Error",
                        html: "File type error. You should select image file."
                    })
                    return;
                }
            }else if(question.type == "movie"){
                if(!file.type.startsWith("video/")){
                    question.errFile = file;
                    question.errFile.$error = "File type error. You should select video file.";
                    Toast.fire({
                        type: 'error',
                        title: "Error",
                        html: "File type error. You should select video file."
                    })
                    return;
                }
            }else if(question.type == "zip"){
                if(file.type != "application/zip" && file.type != "application/x-zip-compressed"){
                    question.errFile = file;
                    question.errFile.$error = "File type error. You should select zip file.";
                    Toast.fire({
                        type: 'error',
                        title: "Error",
                        html: "File type error. You should select zip file."
                    })
                    return;
                }
            }
            
            question.uploading = true;
            file.upload = Upload.upload({
                url: '/api/document/review/files/' + $scope.team._id + '/' + question.fileName,
                data: {file: file}
            });

            file.upload.then(function (response) {
                $timeout(function () {
                    $scope.updateReviewUploaded();
                    if(question.type == "movie"){
                        setTimeout((function() {
                            question.uploading = false;
                            
                        }),1);
                    }
                    file.result = response.data;
                    Toast.fire({
                        type: 'success',
                        title: upload_mes
                    })
                    delete question.f;
                });
            }, function (response) {
                if (response.status > 0){
                     question.errorMsg = response.status + ': ' + response.data.msg;
                     Toast.fire({
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

    function resizeQuill(){
        if(qe.container.offsetTop == 0){
            setTimeout(resizeQuill,10);
        }else{
            qe.container.style.height = (window.innerHeight - qe.container.offsetTop - 90) + 'px';
        }
    }

    var A = parseInt($('#ANSWER').width(), 10),
        B = parseInt($('#COMMENTS').width(), 10),
        Z = parseInt($('#DRUG').width(), 10),
        minw = parseInt((A + B + Z) * 10 / 100, 10),
        offset = $('#container').offset(),
        splitter = function(event, ui){
            var aw = parseInt(ui.position.left),
                bw = A + B - aw;
            //set widths and information...
            $('#ANSWER').css({width : aw});
            $('#COMMENTS').css({width : bw + 15});
            //qe.container.style.height = (window.innerHeight - qe.container.offsetTop - 90) + 'px';


        };
    $('#DRUG').draggable({
        axis : 'x',
        containment : [
            offset.left + minw,
            offset.top,
            offset.left + A + B - minw,
            offset.top + $('#container').height()
            ],
        drag : splitter
    });

}]);
