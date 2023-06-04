const app = angular.module("AdminSettings", ['ngTouch', 'pascalprecht.translate', 'ngCookies', 'color.picker','ngSanitize']);
app.controller("AdminSettingsController", ['$scope', '$http', function ($scope, $http) {
  $scope.competitionId = competitionId
  updateUserList()
  $http.get("/api/competitions/" + competitionId).then(function (response) {
    $scope.competition = response.data;
    $scope.cName = response.data.name;
    $scope.cColor = response.data.color;
    $scope.bColor = response.data.bkColor;
    $scope.message = response.data.message;
    $scope.description = response.data.description;
    $scope.logo = response.data.logo;
    $scope.competitonUseRule = response.data.rule;
    $scope.preparation = response.data.preparation;
    let ranking  = response.data.ranking;
    $http.get("/api/teams/leagues/all/" + competitionId).then(function (response) {
      let leagues = response.data;
      $scope.ranking = [];
      for(let i in leagues){
        let index = -1;
        for(let j in ranking){
          if(ranking[j].league == leagues[i].id){
            index = j;
            break;
          }
        }
        if (index == -1) {
          $scope.ranking.push({
            'id': leagues[i].id,
            'name': leagues[i].name,
            'count': 20,
            'disclose': false,
            'mode': "SUM_OF_BEST_N_GAMES"
          });
        } else {
          console.log(ranking[index])
          $scope.ranking.push({
            'id': leagues[i].id,
            'name': leagues[i].name,
            'count': ranking[index].num,
            'disclose': ranking[index].disclose,
            'mode': ranking[index].mode
          });
        }
      }
      console.log($scope.ranking)
    })
  })

  $http.get("/api/competitions/rules").then(function (response) {
    $scope.rules = response.data;
  })

  $scope.updateAuthority = function (userid, acLevel) {
    $http.put("/api/users/" + userid + "/" + competitionId + "/" + acLevel).then(function (response) {
      updateUserList()
    }, function (error) {
      console.log(error)
    })

  }

  $scope.go = function (path) {
    window.location = path
  }


  $scope.set = function () {
    let data = {
      name: $scope.cName,
      rule: $scope.competitonUseRule,
      logo: $scope.logo,
      bkColor: $scope.bColor,
      color: $scope.cColor,
      message: $scope.message,
      description: $scope.description,
      ranking: $scope.ranking,
      preparation: $scope.preparation
    }

    $http.put("/api/competitions/" + $scope.competitionId, data).then(function (response) {
      location.reload();
    }, function (response) {
      console.log("Error: " + response.statusText);
      alert(response.data.msg);
    });
  }


  function updateUserList() {
    $http.get("/api/users").then(function (response) {
      $scope.users = response.data

      for (let i = 0; i < $scope.users.length; i++) {
        $scope.users[i].nowAuth = -1
        for (let j = 0; j < $scope.users[i].competitions.length; j++) {
          if ($scope.competitionId == $scope.users[i].competitions[j].id) {
            $scope.users[i].nowAuth = $scope.users[i].competitions[j].accessLevel
            break;
          }
        }
      }
    })

  }

  var file = null;
  var blob = null;
  const THUMBNAIL_WIDTH = 500;
  const THUMBNAIL_HEIGHT = 300;

  if (window.File) {
    var select = document.getElementById('select');

    select.addEventListener('change', function (e) {
      var file = e.target.files[0];

      if (file.type != 'image/jpeg' && file.type != 'image/png' && file.type != 'image/gif') {
        file = null;
        blob = null;
        return;
      }

      var image = new Image();
      var reader = new FileReader();
      reader.onload = function(e) {
        image.onload = function() {
          var width, height;
          if(image.width > image.height){
            var ratio = image.height/image.width;
            width = THUMBNAIL_WIDTH;
            height = THUMBNAIL_WIDTH * ratio;
          } else {
            var ratio = image.width/image.height;
            width = THUMBNAIL_HEIGHT * ratio;
            height = THUMBNAIL_HEIGHT;
          }
          var canvas = $('#canvas')
            .attr('width', width)
            .attr('height', height);
          var ctx = canvas[0].getContext('2d');
          ctx.clearRect(0,0,width,height);
          ctx.drawImage(image,0,0,image.width,image.height,0,0,width,height);

          var base64 = canvas.get(0).toDataURL('image/png');
          $scope.logo = base64;
          $scope.$apply()
        }
        image.src = e.target.result;
      }

      reader.readAsDataURL(file);
    }, false);
  }
}]);
