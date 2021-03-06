/**
 * Created by igor on 06.09.16.
 */

"use strict";

define(['app', 'scripts/webitel/utils', 'modules/server/settings/settingsModel'], function (app, utils) {

    app.controller('ServerSettingsCtrl', ['$scope', 'webitel', '$rootScope', 'notifi', '$timeout', 'ServerSettingsModel', '$confirm',
        function ($scope, webitel, $rootScope, notifi, $timeout, ServerSettingsModel, $confirm) {
            $scope.openDate = function($event, attr) {
                angular.forEach($scope.dateOpenedControl, function (v, key) {
                    if (key !== attr)
                        $scope.dateOpenedControl[key] = false;
                });
                return $event.preventDefault(),
                    $event.stopPropagation(),
                    $scope.dateOpenedControl[attr] = !0
            };
            $scope.executeDelNonExistentFile = false;
            $scope.executeDelFile = false;
            $scope.dateOpenedControl = {};
            $scope.dateOptions = {
                "year-format": "'yy'",
                "starting-day": 1
            };

            $scope.fsModules = ["amqp", "callcenter"];

            $scope.reloadProcess = false;
            
            $scope.reload = function (name) {
                $scope.reloadProcess = true;
                ServerSettingsModel.reload(name, function (err, res) {
                    $scope.reloadProcess = false;
                    if (err)
                        return notifi.error(err, 5000);

                    return notifi.info('Reload ' + name + ': ' + res.info, 5000);
                })
            };
            
            $scope.runDelFiles = function (params) {
                if (!params.from || !params.to) {
                    return notifi.error(new Error('Bad date!'), 5000);
                }
                var from = params.from.getTime(),
                    to = params.to.getTime()
                    ;
                if (to <= from) {
                    params.to = null;
                    return notifi.error(new Error('Date to must > from!'), 5000);
                }
                $confirm({text: 'WARNING: Are you sure you want to delete files from: ' + params.from.toLocaleDateString()
                + ' to ' + params.to.toLocaleDateString() + ' ?'},  { templateUrl: 'views/confirm.html' })
                    .then(function() {
                        ServerSettingsModel.removeFiles(from, to, function (err, result) {

                            if (err) {
                                return notifi.error(err, 5000);
                            }

                            return notifi.info(result.info, 10000);
                        })
                    });
            };

            $scope.runDelNonExistentFile = function (params) {
                if (!params.from || !params.to) {
                    return notifi.error(new Error('Bad date!'), 5000);
                }
                var from = params.from.getTime(),
                    to = params.to.getTime()
                    ;
                if (to <= from) {
                    params.to = null;
                    return notifi.error(new Error('Date to must > from!'), 5000);
                }

                ServerSettingsModel.removeNonExistentFiles(from, to, function (err, result) {

                    if (err) {
                        return notifi.error(err, 5000);
                    }

                    return notifi.info(result.info, 10000);
                })


            }
        }
    ]);
});