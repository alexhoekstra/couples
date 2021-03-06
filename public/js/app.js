angular.module("couplesApp", ['ngRoute'])
    .factory('_', ['$window', function($window) {
        return $window._; // assumes underscore has already been loaded on the page
    }])
    .config(function($routeProvider) {
        $routeProvider
            .when("/", {
                templateUrl:"couples-name.html",
                controller: "CouplesController"
            })
            .when("/list",{
                templateUrl: "list.html",
                controller: "ListController",
                resolve: {
                    names: function(Names) {
                        return Names.getNames();
                    }
                }
            })
            .when("/new/name", {
                controller: "NewNameController",
                templateUrl: "name-form.html"
            })
            .when("/name/:nameId", {
                controller: "EditNameController",
                templateUrl: "name.html"
            })
            .otherwise({
                redirectTo: "/"
            })
    })
    .service("Names", function($http) {
        this.getNames = function() {
            return $http.get("/names").
                then(function(response) {   
                    return response;
                }, function(response) {
                    alert("Error finding Names.");
                });
        }
        this.createName = function(name) {
            return $http.post("/names", name).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error creating name.");
                });
        }
        this.getName = function(nameId) {
            var url = "/names/" + nameId;
            return $http.get(url).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error finding this name.");
                });
        }
        this.editName = function(name) {
            var url = "/names/" + name._id;
            console.log(name._id);
            return $http.put(url, name).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error editing this name.");
                    console.log(response);
                });
        }
        this.deleteName = function(nameId) {
            var url = "/names/" + nameId;
            return $http.delete(url).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error deleting this name.");
                    console.log(response);
                });
        }
        this.getNameByName = function(name) {
            var url = "/namebyname/"+ name;
            console.log(url);
            return $http.get(url).
                then(function(response) {
                    return response;
                }, function(response) {
                    alert("Error finding this name");
                    console.log(response);
                });
        }
        this.getNamesByGender = function(gender) {;
            if(gender == "both"){
                console.log("request for both genders")
                return this.getNames();
            }
            else {
                var url = "names/gender/" + gender;
                console.log(url);
                return $http.get(url).
                    then(function(response) {
                        return response;
                    }, function(response) {
                        alert("Error finding this name");
                        console.log(response);
                    });
                }
        }
    })

    .controller("CouplesController", function($scope, Names, _) {
        $scope.updateGender = function(selectedGender) {
            $scope.gender = selectedGender;
            if(!(typeof $scope.name === "undefined" || $scope.name == "")
                && $scope.nicknames != null){
                $scope.findMatches($scope.name);
            }
        }

        $scope.findCouples = function(name1Model, name2Model){
            Names.getNameByName(name1Model).
            then(function(doc) {
                var name1 = doc.data;
                Names.getNameByName(name2Model).
                then(function(doc) {
                    var name2 = doc.data;
                    var nickNames = nicknamesForCouple(name1, name2);
                    $scope.coupleNames = formatDisplay(nickNames);
                    $scope.showCouples = true;
                    $scope.couplesString = name1.name + " + " + name2.name;
                }, function(response) {
                    alert(response);
                });
            }, function(response) {
                alert(response);
            });
        }


        $scope.findMatches= function(name){
            Names.getNameByName(name).
            then(function(doc) {
                if(doc.data != null) {
                    //Found a name
                    var name1Model = doc.data;
                    Names.getNamesByGender($scope.gender).
                    then(function(doc) {
                        //received list of names in gender
                        var names = doc.data;
                        var nicknames = [];
                        name1Model.cachedPrefixes = getPrefixes(name1Model.syllables);
                        name1Model.cachedSuffixes = getSuffixes(name1Model.syllables);
                        angular.forEach(names, function(value, key){
                            var nicknameModels = nicknamesForCouple(name1Model, value);
                            if (nicknameModels !== null && !_.isEmpty(nicknameModels)) {
                                nicknames.push(_.max(nicknameModels, function(nicknameModel) {
                                    return nicknameModel.score;
                                }));
                            }
                        });
                        $scope.nicknames = formatDisplay(nicknames);
                    },function(response) {
                    alert(response);
                    });
                }
                else {
                    if(name.indexOf("-") > 0)
                    {
                        var copyName = name;
                        // parse the name
                        var newName = {
                            name : copyName.replace("-",""),
                            syllables : copyName.split("-"),
                            gender : $scope.newGender
                        }
                        Names.createName(newName).
                        then(function(doc) {
                            $scope.name = newName.name;
                            $scope.promptInput = false;
                            $scope.findMatches(newName.name);

                        }, function(response) {
                            alert(response);
                        });

                    }
                    else{
                        $scope.promptInput = true;
                    }
                }
            }, function(response) {
                alert(response);
            });
        }

        var formatDisplay = function(nicknames) {
            var nicknameModels = _.chain(nicknames)
                .groupBy(function(model) {
                    return model.nickname;
                })
                .map(function(models) {
                    return _.max(models, function(model) { return model.score });
                })
                .sortBy(function(model) {
                    return -model.score;
                })
                .value()
                .slice(0, 10);
            
            angular.forEach(nicknameModels, function(nicknameModels) {
                nicknameModels.score = Math.round(nicknameModels.score * 100);
            });
            return nicknameModels;
        }

        var getPrefixes = function(syllables) {
            var prefixes = [];
            var prefix = '';
            var i;

            if (syllables.length === 1) {
              // single syllable names may break on the first vowel
              var name = syllables[0];
              for (i = 0; i < name.length; i++) {
                prefix += name[i];
                if ('aeiou'.indexOf(name[i].toLowerCase()) > -1) {
                  break;
                }
              }
              if (name.length > prefix.length) {
                return [prefix, name];
              }
              return [name];
            }

            for (i = 0; i < syllables.length - 1; i++) {
              prefix += syllables[i];

              // disallow single character prefix
              if (i !== 0 || syllables[i].length > 1) {
                prefixes.push(prefix);
              }
            }

            return prefixes;
        };

        var getSuffixes = function(syllables) {
            var suffixes = [];
            var suffix = '';

            // single syllable words have no suffixes
            if (syllables.length === 1) {
              return [];
            }

            for (var i = syllables.length - 1; i > 0 ; i--) {
              suffix = syllables[i] + suffix;

              // disallow single character suffix
              if (i !== syllables.length - 1 || syllables[i].length > 1) {
                suffixes.push(suffix);
              }
            }
            return suffixes;
        };

          // returns a list of nickname models
        var nicknamesForCouple = function(name1Model, name2Model) {
            var nicknames = [];

            var appendNicknames = function(name1Model, name2Model, nicknames) {
                var suffixes = name2Model.cachedSuffixes || getSuffixes(name2Model.syllables);
                if (suffixes.length) {
                    var prefixes = name1Model.cachedPrefixes || getPrefixes(name1Model.syllables);
                    _.each(prefixes, function(prefix) {
                        _.each(suffixes, function(suffix) {
                            var nicknameModel = {
                                nickname: null,
                                prefix: prefix,
                                suffix: suffix,
                                name1: name1Model.name,
                                name2: name2Model.name,
                                score: null
                            };

                            nicknameModel.nickname = calculateNickname(nicknameModel);
                            nicknameModel.score = calculateScore(nicknameModel);

                            if (nicknameModel.score !== null) {
                            nicknames.push(nicknameModel);
                            }
                        });
                    });
                }
            };

            appendNicknames(name1Model, name2Model, nicknames);
            appendNicknames(name2Model, name1Model, nicknames);
            return nicknames;
        };

        function calculateNickname(nicknameModel) {
            var nickname;

            // squash identical characters on prefix/suffix boundary
            if (nicknameModel.prefix[nicknameModel.prefix.length - 1] === nicknameModel.suffix[0]) {
                nickname = nicknameModel.prefix + nicknameModel.suffix.substring(1);
            } else {
                nickname = nicknameModel.prefix + nicknameModel.suffix;
            }
            return nickname;
        }

        // score from 0 to 1
        // returns null for invalid nicknames
        function calculateScore(nicknameModel) {
            // detect nicknames which have been squashed
            if (nicknameModel.nickname.length !== nicknameModel.prefix.length + nicknameModel.suffix.length) {
                var concat = nicknameModel.prefix + nicknameModel.suffix;
                if (nicknameModel.name1 === concat || nicknameModel.name2 === concat) {
                    return null;
                }
            }

            var score = Math.max(
                natural.JaroWinklerDistance(nicknameModel.nickname, nicknameModel.name1),
                natural.JaroWinklerDistance(nicknameModel.nickname, nicknameModel.name2));
            
            if (score === 1) {
                return null;
            }

            // penalize using the entire name as a prefix
            if (nicknameModel.prefix === nicknameModel.name1) {
                score *= 0.7;
            }
            // penalize short prefixes and suffixes
            if (nicknameModel.prefix.length < 3) {
                score *= 0.75;
            } else if (nicknameModel.prefix.length < 4) {
                score *= 0.99;
            }
            if (nicknameModel.suffix.length < 3) {
                score *= 0.75;
            } else if (nicknameModel.suffix.length < 4) {
                score *= 0.98;
            }

            return score;
        }


        var natural = (function() {
            // Computes the Jaro distance between two string -- intrepreted from:
            // http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
            // s1 is the first string to compare
            // s2 is the second string to compare
            var distance = function(s1, s2) {
                if (typeof(s1) != "string" || typeof(s2) != "string") return 0;
                if (s1.length == 0 || s2.length == 0) 
                    return 0;
                s1 = s1.toLowerCase(), s2 = s2.toLowerCase();
                var matchWindow = (Math.floor(Math.max(s1.length, s2.length) / 2.0)) - 1;
                var matches1 = new Array(s1.length);
                var matches2 = new Array(s2.length);
                var m = 0; // number of matches
                var t = 0; // number of transpositions
        
                // find matches
                for (var i = 0; i < s1.length; i++) {
                    var matched = false;
        
                    // check for an exact match
                    if (s1[i] ==  s2[i]) {
                        matches1[i] = matches2[i] = matched = true;
                        m++
                    }
        
                    // check the "match window"
                    else {
                        // this for loop is a little brutal
                        for (k = (i <= matchWindow) ? 0 : i - matchWindow;
                            (k <= i + matchWindow) && k < s2.length && !matched;
                            k++) {
                                if (s1[i] == s2[k]) {
                                    if(!matches1[i] && !matches2[k]) {
                                        m++;
                                    }
            
                                        matches1[i] = matches2[k] = matched = true;
                                    }
                                }
                    }
                }
        
                if(m == 0)
                    return 0.0;
        
                // count transpositions
                var k = 0;
        
            for(var i = 0; i < s1.length; i++) {
                if(matches1[k]) {
                    while(!matches2[k] && k < matches2.length)
                        k++;
                    if(s1[i] != s2[k] &&  k < matches2.length)  {
                        t++;
                    }
                    k++;
                }
            }
             
            //debug helpers:
            //console.log(" - matches: " + m);
            //console.log(" - transpositions: " + t);
            t = t / 2.0;
            return (m / s1.length + m / s2.length + (m - t) / m) / 3;
            }
         
            // Computes the Winkler distance between two string -- intrepreted from:
            // http://en.wikipedia.org/wiki/Jaro%E2%80%93Winkler_distance
            // s1 is the first string to compare
            // s2 is the second string to compare
            // dj is the Jaro Distance (if you've already computed it), leave blank and the method handles it
            var JaroWinklerDistance = function(s1, s2, dj) {
                var jaro;
                (typeof(dj) == 'undefined')? jaro = distance(s1,s2) : jaro = dj;
                var p = 0.1; //
                var l = 0 // length of the matching prefix
                while(s1[l] == s2[l] && l < 4)
                    l++;
                 
                return jaro + l * p * (1 - jaro);
            }
            return {
                JaroWinklerDistance: JaroWinklerDistance
            };
        }());
    })
    .controller("ListController", function(names, $scope) {
        $scope.names = names.data;
    })
    .controller("NewNameController", function($scope, $location, Names) {
        $scope.back = function() {
            $location.path("#/");
        }

        $scope.saveName = function(name) {
            //parse the syllable string
            name.syllables = $scope.syllableString.split("-");

            Names.createName(name).then(function(doc) {
                var nameUrl = "/name/" + doc.data._id;
                $location.path(nameUrl);
            }, function(response) {
                alert(response);
            });
        }
    })
    .controller("EditNameController", function($scope, $routeParams, Names) {
        Names.getName($routeParams.nameId).then(function(doc) {
            $scope.name = doc.data;
        }, function(response) {
            alert(response);
        });

        $scope.toggleEdit = function() {
            $scope.editMode = true;
            $scope.nameFormUrl = "name-form.html";
        }

        $scope.back = function() {
            $scope.editMode = false;
            $scope.nameFormUrl = "";
        }

        $scope.saveName = function(name) {
            Names.editName(name);
            $scope.editMode = false;
            $scope.nameFormUrl = "";
        }

        $scope.deleteName = function(nameId) {
            Names.deleteName(nameId);
        }
    });