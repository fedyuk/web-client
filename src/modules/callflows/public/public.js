define(['app', 'modules/callflows/editor', 'modules/callflows/callflowUtils', 'scripts/webitel/utils', 'modules/callflows/public/publicModel',
	'tags-input'
	], function (app, aceEditor, callflowUtils, utils) {

	//app.extend( "ngTagsInput" );

	app.controller('CallflowPublicCtrl', ['$scope', 'webitel', '$rootScope', 'notifi', 'CallflowPublicModel',
    	'$location', '$route', '$routeParams', '$confirm', 'FileUploader', 'TableSearch', '$timeout',
        function ($scope, webitel, $rootScope, notifi, CallflowPublicModel, $location, $route, $routeParams, $confirm
        	,FileUploader, TableSearch, $timeout) {
        	$scope.domain = webitel.domain();
        	$scope.public = {};
			$scope.cf = aceEditor.getStrFromJson([]);
			$scope.cfOnDisconnect = aceEditor.getStrFromJson([]);
        	var editor;
	        $scope.rowCollection = [];
	        $scope.rowColflection = [];
	        $scope.isLoading = false;

			$scope.query = TableSearch.get('public');

			$scope.$watch("query", function (newVal) {
				TableSearch.set(newVal, 'public')
			});

	        function initPage () {
				$scope.timeZones = callflowUtils.timeZones;
	        };

			$scope.aceLoaded = function(_editor) {
				// Options
				aceEditor.init(_editor);
			};


			$scope.$watch('[public,cf,cfOnDisconnect]', function(newValue, oldValue) {
				if ($scope.public._new)
					return $scope.isEdit = $scope.isNew = true;

				return $scope.isEdit = !!oldValue[0]._id;
			}, true);

			$scope.cancel = function () {
				$scope.public = angular.copy($scope.oldPublic);
				$scope.cf = angular.copy($scope.oldCf);
				$scope.cfOnDisconnect = angular.copy($scope.oldCfOnDisconnect);
				disableEditMode();
			};

			function disableEditMode () {
				$timeout(function () {
					$scope.isEdit = false;
				}, 0);
			};

	        $scope.canDelete = webitel.connection.session.checkResource('rotes/public', 'd');
	        $scope.canUpdate = webitel.connection.session.checkResource('rotes/public', 'u');
	        $scope.canCreate = webitel.connection.session.checkResource('rotes/public', 'c');

	        $scope.closePage = closePage;
	        $scope.edit = edit;
	        $scope.create = create;
	        $scope.save = save;
	        $scope.reloadData = reloadData;

			// region File
			$scope.downloadScheme = function (row) {
				utils.saveJsonToPc(row, row.name + '.json');
			};

			function uploadJson (data, update) {
				function cb(err, res) {
					if (err)
						return notifi.error(err, 5000);

					reloadData();
					var str;
					if (update) {
						str = "Updated: " + res.name;
					} else {
						str = "Created: " + res.data.name;
					}
					return notifi.success(str, 2000);
				};

				if (update) {
					CallflowPublicModel.update(data, $scope.domain, cb)
				} else {
					CallflowPublicModel.add(data, $scope.domain, cb);
				}
			};

			var uploader = $scope.uploader = new FileUploader();
			uploader.onWhenAddingFileFailed = function(item /*{File|FileLikeObject}*/, filter, options) {
				console.info('onWhenAddingFileFailed', item, filter, options);
			};
			uploader.onAfterAddingFile = function(item) {
				console.info('onAfterAddingFile', item);

				var reader = new FileReader();
				reader.onload = function(event) {
					$.getJSON(event.target.result).then(function(data){
						CallflowPublicModel.item(data._id, $scope.domain, function (err, res) {
							if (err)
								return notifi.error(err, 3000);

							uploadJson(data, !!res);
						});
					}).fail(function (res, e, err) {
						notifi.error(err);
					});

				};
				reader.readAsDataURL(item._file);
			};
			// endregion

	        function create() {
	        	$scope.public = CallflowPublicModel.create();
	        	$scope.public._new = true;
	        };

	        function edit() {
	            var id = $routeParams.id;
	            var domain = $routeParams.domain;	        	
	        	CallflowPublicModel.item(id, domain, function (err, res) {
	        		if (err)
	        			return notifi.error(err);
	        		$scope.public = res;
	        		$scope.oldPublic = angular.copy(res);
	        		var cf = callflowUtils.replaceExpression(res.callflow);
	        		var cfOnDisconnect = callflowUtils.replaceExpression(res.onDisconnect);
					$scope.cf = aceEditor.getStrFromJson(cf);
					$scope.cfOnDisconnect = aceEditor.getStrFromJson(cfOnDisconnect);
					$scope.oldCf = angular.copy($scope.cf);
					$scope.oldCfOnDisconnect = angular.copy($scope.cfOnDisconnect);
					disableEditMode();
	        	});
	        };

	        function save() {
	        	try {
	        		function cb (err, res) {
						if (err)
							return notifi.error(err);

						if ($scope.public._new) {
							return $location.path('/callflows/public/' + res.info + '/edit');
						} else {
							$scope.public.__time = Date.now();
							return edit();
						};
					};
					if(typeof($scope.public.destination_number)=='string'){
						$scope.public.destination_number = $scope.public.destination_number.split(",");
					}
	        		$scope.public.callflow = JSON.parse($scope.cf);
					if ($scope.cfOnDisconnect) {
						$scope.public.onDisconnect = JSON.parse($scope.cfOnDisconnect);
					} else {
						$scope.public.onDisconnect = [];
					}
		        	if (!$scope.public._id) {
	        			CallflowPublicModel.add($scope.public, $scope.domain, cb)
		        	} else {
		        		CallflowPublicModel.update($scope.public, $scope.domain, cb)
		        	}
	        	} catch (e) {
	        		notifi.error(e, 3000);
	        	}
	        };	        

	        var changeDomainEvent = $rootScope.$on('webitel:changeDomain', function (e, domainName) {
	            $scope.domain = domainName;
	            closePage();
	        });      

	        $scope.removeItem = function (row) {
	            $confirm({text: 'Are you sure you want to delete ' + row.name + ' ?'},  { templateUrl: 'views/confirm.html' })
                .then(function() {
                    CallflowPublicModel.remove(row._id, $scope.domain, function (err) {
                        if (err)
                            return notifi.error(err, 5000);
                        reloadData()
                    })
                });
	        }

            $scope.$on('$destroy', function () {
	            changeDomainEvent();
	        });  

            $scope.$watch('domain', function(domainName) {
	            $scope.domain = domainName;
	            reloadData();
	        });


	        function reloadData () {
	            if ($location.$$path != '/callflows/public')
	                return $scope.domain && initPage();

				if (!$scope.domain)
					return $scope.rowCollection = [];

				$scope.isLoading = true;
				CallflowPublicModel.list($scope.domain, function (err, res) {
					$scope.isLoading = false;
	                if (err)
	                    return notifi.error(err);
	                var arr = [];
	                angular.forEach(res, function(item) {
	                    arr.push(item);
	                });
	                $scope.rowCollection = arr;
	            });
	        };
	        
	        function closePage () {
	        	$location.path('/callflows/public');
	        	//$window.history.back();
        	};

	        $scope.init = function init () {
	            if (!!$route.current.method) {
	                return $scope[$route.current.method]();
	            };
	        }();
    }])
});
