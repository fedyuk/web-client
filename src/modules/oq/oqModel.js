/**
 * Created by i.navrotskyj on 03.02.2016.
 */
'use strict';

define(['app', 'scripts/webitel/utils'], function (app, utils) {
    app.factory('OqModel', ["webitel", function (webitel) {


        function list (domainName, cb) {
            if (!domainName)
                return cb(new Error("Domain is required."));

            webitel.api('GET', '/api/v2/callcenter/queues?domain=' + domainName, function(err, res) {
                var queues = res.data || res.info;
                angular.forEach(queues, function (item) {
                    item.enable = item.enable == 'true';
                });
                return cb && cb(err, queues);
            });
        };

        return {
            list: list
        }
    }]);
});