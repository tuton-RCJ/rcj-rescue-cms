var app = angular.module("ResvList", ['ngTouch','pascalprecht.translate', 'ngCookies']).controller("ResvListController", function ($scope, $http) {
    $scope.competitionId = competitionId


    $http.get("/api/competitions/" + competitionId).then(function (response) {
        $scope.competition = response.data
    })

    function updateList(){
        $http.get(`/api/reservation/config/${competitionId}`).then(function (response) {
            $scope.reservation = response.data
        })
    }
    updateList();
    
    $scope.go = function (path) {
        window.location = path
    }

    $scope.edit = function(id){
        window.location = `/admin/${competitionId}/reservation/edit/${id}`;
    }

    $scope.delete = async function (resv) {
        const {
            value: operation
        } = await swal({
            title: "Remove reservation setting?",
            text: "Are you sure you want to remove the reservation setting: " +
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
})
