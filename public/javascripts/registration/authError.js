var app = angular.module("authError", ['ngTouch','ngAnimate', 'pascalprecht.translate', 'ngCookies']);

app.controller("authErrorController", ['$scope', '$http', '$translate', function ($scope, $http, $translate) {
    const Toast = Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
    });

    $scope.go = function (path) {
        window.location = path
    }    
}])
