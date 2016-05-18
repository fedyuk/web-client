define(['angular', 
	'webitel-library',
	'scripts/webitel/utils',
	'scripts/shared/notifier'
], function (angular, Webitel, utils) {

	var webitel = angular.module('app.webitel', ['app.notifier']);

	webitel.service('webitel', ['$location', '$http', '$localStorage', '$rootScope', '$modal', 'notifi', '$q', '$routeParams', '$timeout',
	 function($location, $http, $localStorage, $rootScope, $modal, notifi, $q, $routeParams, $timeout){

		var connection = {
			connected: false,
			instance: {},
			session: null,
			httpApi: httpApi,
			_ws: '',
			_http: '',
			_cdr: ''
		};

		// TODO remove
		 window.webitel = connection;

		 var parent = $rootScope;
		 var $scope = parent.$new();

		 var deferredOnConnect = $q.defer();
		 var promiseOnConnect = deferredOnConnect;

		 function getDomainFromUrl() {
			 return $routeParams.domain || $location.$$search.domain;
		 }

		var selectDomain = getDomainFromUrl();


		 function changeDomain (newDomain) {
			if (newDomain.name === selectDomain)
				return false;
			selectDomain = newDomain.name;
			$location.search('domain', selectDomain);
			console.debug('change domain ', newDomain);
			$rootScope.$emit('webitel:changeDomain', selectDomain);
		};

		 $rootScope.$on('$locationChangeStart', function (event, next, current) {
			 if (selectDomain)
				 $location.search('domain', selectDomain);
			 return true;
		 });

		function getSelectedDomain() {
			return (connection.session && connection.session.domain) || selectDomain || $routeParams.domain;
		}


		// region Session
		var Session = function(option) {
			if (!option)
				throw 'Bad user parameters';

			this.acl = $localStorage.acl = option.acl;
			this.expires =  $localStorage.expires = option.expires;
			this.key =  $localStorage.key = option.key;
			this.token = $localStorage.token = option.token;
			this.username =  $localStorage.login = option.username;
			this.domain = $localStorage.domain = option.domain;
			this.roleName = option.roleName;
			this.cdr = option.cdr;
			setTokenKey(this.token, this.key);
			this.setCdrLocation();

			var config = {
	              server : connection._ws,
	              account: this.username,
	              key: this.key,
	              token: this.token,
	              debug  : 1,
	              reconnect: 15
	        };

	        var instance = connection.instance = new Webitel(config);
	        // TODO delete 
	        window.ws = instance;

	        // Subscribe events
	        instance.onError(function (err) {
	        	notifi.error(err, 5000)
	        });
	        var scope = this;
	        instance.onConnect(function () {
	        	// TODO
	        });

	        instance.onServerEvent("DOMAIN_CREATE", function(e) {
				$scope.$emit('DOMAIN_CREATE', e);
	        });
			instance.onServerEvent("DOMAIN_DESTROY", function(e) {
				$scope.$emit('DOMAIN_DESTROY', e);
			});
	        instance.connect();
			console.debug('session:create', this);
			promiseOnConnect.resolve(scope);
		};
		Session.prototype.destroy = function () {
			destroyLocalSession();
		};
		 
		Session.prototype.setCdrLocation = function () {
			if (this.cdr && String(this.cdr.useProxy) == 'false' && this.cdr.host) 
				return connection._cdr = this.cdr.host.replace(/\/$/, '');
			return connection._cdr = connection._http;
		};
		
		Session.prototype.checkResource = function (resources, action, ignoreAllPerm) {
			if (!this.acl)
				throw "Bad session acl!";

			if (!resources || !action)
				return false;

			
			if (typeof resources == 'string')
				resources = [].concat(resources);

			var scope = this;
			for (var i = 0, len = resources.length; i < len; i++) {
				if (check(resources[i]))
					return true;
			};
			return false;

			function check(resource) {
				if (!scope.acl[resource])
					return false;
				if (ignoreAllPerm)
					return !!~scope.acl[resource].indexOf(action) && !~scope.acl[resource].indexOf('*');

				return !!~scope.acl[resource].indexOf(action) || !!~scope.acl[resource].indexOf('*');			
			};
		};

		function setTokenKey (token, key) {
			$http.defaults.headers.common['x-key'] = key;
			$http.defaults.headers.common['x-access-token'] = token;
		};
		// end region

	 	function destroyLocalSession () {
			setTokenKey('','');
			angular.forEach(['acl', 'expires', 'key', 'token', 'username', 'domain'], function(value, key){
				delete $localStorage[value];
			})
		}

		function signout(cb) {
			connection.session && connection.session.destroy();
			return cb && cb(null)
		}

		function signin(options, cb) {
			var serverStr = options && options.server;
			if (!serverStr || serverStr.length < 1)
				return cb(new Error('Bad request (server uri is required.)'));

			var server = parseServerUri(serverStr);
			connection._http = server.httpUri;
			connection._ws = server.wsUri;
			$localStorage.server = serverStr;
			if (options.token && options.key) {
				// TODO expires ???
				if (options.expires && options.expires - Date.now() < 10000) {
					return cb(new Error('Token expires.'))
				}

				setTokenKey(options.token, options.key);

				httpApi('GET', '/api/v2/whoami', function (err, res) {
					return doCb(err, {
						"acl": res.acl,
						"expires": res.expires,
						"username": res.id,
						"domain": res.domain,
						"key": options.key,
						"token": options.token,
						"roleName": res.roleName,
						"cdr": res.cdr,
					})
				})
			} 

			else if (options.login) {
				httpApi('POST', '/login', {"username": options.login, "password": options.password} ,function (err, res) {
					if (err)
						return cb(err);
					doCb(null, res);
				})
			} else {
				cb(new Error('Bad request.'))
			};

			function doCb (err, res) {
				if (err) {
					destroyLocalSession();
					setTokenKey("", "");
					return cb(err);
				}
				connection.session = new Session(res);
				changeDomain({name: getDomainFromUrl()});
				connection.connected = true;
				return cb(null, res);
			}

			// TODO on Connect -> set;
			//      on disconnect -> unset 


		}

		function parseServerUri (serverStr) {
			var serverUri = '',
				wsUri = ''
			;
			
			if (serverStr.indexOf('ws') == 0) {
				serverUri = serverStr.replace(/ws/, 'http');
				wsUri = serverStr;
			} 
			else if (serverStr.indexOf('http') == 0) {
				serverUri = serverStr;
				wsUri = serverStr.replace(/http/, 'ws')
			} else {
				serverUri = 'http://' + serverStr;
				wsUri = 'ws://' + serverStr;
			}

			return {
				httpUri: serverUri,
				wsUri: wsUri
			};
		}

		function isConnected() {
			return !!connection.session;
		}

		function httpApi(method, url, args, cb) {
			return api(connection._http, method, url, args, cb);
		};

		 function cdrApi(method, url, args, cb) {
			 return api(connection._cdr, method, url, args, cb);
		 };

		 function api(srv, method, url, args, cb) {
			 if (typeof args == 'function') {
				 cb = args;
				 args = null;
			 };

			 if (args)
			 	args = JSON.stringify(args);

			 var req = {
				 method: method,
				 url: srv + url,
				 data: args
			 };
			 return $http(req).success(function(res){
				 cb(null, res);
			 }).error(function(e, statusCode){
				 var _e = e.message ? e : new Error(e.info || "Internal errror");
				 if (statusCode === 401) {
					 signout(function () {
						 notifi.error(new Error("Unauthorized"));
						 if ($location.$$path !== "/pages/signin")
							 window.location.href = "/";
					 });
				 }
				 cb(_e, {}, statusCode);
			 });
		 };

		return {
			"signin": signin,
			"signout": signout,
			"api": httpApi,
			"cdr": cdrApi,
			"connected": isConnected,
			"connection": connection,
			"changeDomain": changeDomain,
			"domain": getSelectedDomain,
			"onConnect": promiseOnConnect.promise,
			"$scope": $scope,
			"destroyLocalSession": destroyLocalSession
		};
	}]);
	
	webitel.factory('TableSearch', function () {
		var searches = {};

		return {
			set: function (value, moduleName) {
				return searches[moduleName] = value;
			},
			get: function (moduleName) {
				return searches[moduleName] || '';
			}
		}
	})
});
