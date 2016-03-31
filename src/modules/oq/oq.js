define(['app', 'async', 'scripts/webitel/utils', 'modules/oq/oqModel'], function (app, async, utils) {

    app.controller('OQCtrl', ['$scope', 'webitel', '$rootScope', 'notifi', 'OqModel', '$location', '$route', '$routeParams',
        '$confirm', 'TableSearch', '$timeout',
        function ($scope, webitel, $rootScope, notifi, OqModel, $location, $route, $routeParams, $confirm, TableSearch,
                  $timeout) {

            $scope.canDelete = webitel.connection.session.checkResource('cc/queue', 'd');
            $scope.canUpdate = webitel.connection.session.checkResource('cc/queue', 'u');
            $scope.canCreate = webitel.connection.session.checkResource('cc/queue', 'c');
            $scope.domain = webitel.domain();

            $scope.displayedCollection = [];

            $scope.query = TableSearch.get('oq');

            $scope.$watch("query", function (newVal) {
                TableSearch.set(newVal, 'oq')
            });

            $scope.$watch('domain', function(domainName) {
                $scope.domain = domainName;
                reloadData();
            });

            function reloadData () {
                if ($location.$$path != '/oq')
                    return 0;

                if (!$scope.domain)
                    return $scope.rowCollection = [];
                $scope.isLoading = true;
                OqModel.list($scope.domain, function (err, res) {
                    $scope.isLoading = false;
                    if (err)
                        return notifi.error(err, 5000);

                    $scope.rowCollection = res;
                });
            };


            $scope.init = function init () {
                if (!!$route.current.method) {
                    return $scope[$route.current.method]();
                };
            }();

    }])
});
