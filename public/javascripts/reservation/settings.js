var app = angular.module("ReservationSettings", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies','ui.select', 'ngSanitize', 'ngQuill']);

app.controller("ReservationSettingsController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
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

    
    $scope.competitionId = competitionId

    $scope.go = function (path) {
        window.location = path
    }

    $scope.getLeagueName = function (id){
        return($scope.leagues.find(l => l.id === id).name)
    }

    $scope.deadline = function(unixTime){
        let d = new Date(unixTime * 1000);
        let options = { weekday: "short", year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",timeZoneName:"long" };
        return(new Intl.DateTimeFormat(navigator.language, options).format(d));
    }
    
    $http.get("/api/competitions/leagues").then(function (response) {
        $scope.leagues = response.data
        $http.get("/api/competitions/" + competitionId).then(function (response) {
            $scope.competition = response.data
        })
    })

    $http.get("/api/competitions/" + competitionId + "/teams").then(function (response) {
        $scope.teams = response.data;
        console.log($scope.teams)
    })

    if(resvId){
        //get reservation table
        $http.get(`/api/reservation/config/${competitionId}/${resvId}`).then(function (response) {
            response.data.deadline = new Date(response.data.deadline);

            for(let s of response.data.slot){
                s.start = new Date(s.start);
            }

            $scope.resv = response.data;
        })
    }else{
        //init reservation table
        let tmpDeadline = new Date();
        tmpDeadline.setUTCHours(23);
        tmpDeadline.setMinutes(59);
        tmpDeadline.setSeconds(59);
        tmpDeadline.setMilliseconds(0);
        tmpDeadline.setDate(tmpDeadline.getDate() + 7);
        $scope.resv = {
            'competition': competitionId,
            'name': "Interview reservation",
            'description': "",
            'deadline': tmpDeadline,
            'enable': false,
            'league': [],
            'team': [],
            'slot': []
        };
    }

    $scope.save = function(){
        if(resvId){
            $http.put(`/api/reservation/config/${competitionId}/${resvId}` , $scope.resv).then(function (response) {
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
            $http.post("/api/reservation/config/" + competitionId , $scope.resv).then(function (response) {
                Toast.fire({
                    type: 'success',
                    title: saved_mes
                })
                window.location.href = `/admin/${competitionId}/reservation/edit/${response.data.id}`;
            }, function (response) {
                Toast.fire({
                    type: 'error',
                    title: "Error: " + response.statusText,
                    html: response.data.msg
                })
            });
        }
        
    }

    function getUniqueStr(){
        let strong = 1000;
        return new Date().getTime().toString(16)  + Math.floor(strong*Math.random()).toString(16)
    }

    $scope.addSlot = function(){
        let td = new Date();
        td.setUTCHours(10);
        td.setMinutes(0);
        td.setSeconds(0);
        td.setMilliseconds(0);
        td.setDate(td.getDate() + 14);
        let tmp = {
            'slotId': getUniqueStr(),
            'start': td,
            'duration': 20,
            'max': 1,
            'booked': []
        };
        
        if($scope.resv.slot.length>0){
            td = new Date($scope.resv.slot[$scope.resv.slot.length - 1].start.getTime());
            td.setMinutes(td.getMinutes() + $scope.resv.slot[$scope.resv.slot.length - 1].duration);
            tmp.start = td;
            tmp.duration = $scope.resv.slot[$scope.resv.slot.length - 1].duration;
            tmp.max = $scope.resv.slot[$scope.resv.slot.length - 1].max;
        }
        
        $scope.resv.slot.push(tmp);
    }

    $scope.removeSlot = function(slot){
        $scope.resv.slot.splice($scope.resv.slot.indexOf(slot),1);
    }

    $scope.deadlineColour = function(deadline){
        let today = new Date();
        let tomorrow = new Date();

        tomorrow.setDate(today.getDate() + 1);

        if(deadline > tomorrow) return '#bcffbc';
        if(deadline > today) return '#ffffc6';
        return '#ffcccc';
    }

    
}]);

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