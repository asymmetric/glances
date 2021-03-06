var glancesApp = angular.module('glancesApp', ['ngRoute'])

.config(["$routeProvider", "$locationProvider", function($routeProvider, $locationProvider) {
    $routeProvider.when('/:refresh_time?', {
        templateUrl : 'stats.html',
        controller : 'statsController',
        resolve: {
            help: ["GlancesStats", function(GlancesStats) {
                return GlancesStats.getHelp();
            }],
            arguments: ["GlancesStats", "$route", function(GlancesStats, $route) {
                return GlancesStats.getArguments().then(function(arguments) {
                    var refreshTimeRoute = parseInt($route.current.params.refresh_time);
                    if (!isNaN(refreshTimeRoute) && refreshTimeRoute > 1) {
                        arguments.time = refreshTimeRoute;
                    }

                    return arguments;
                });
            }]
        }
    });

    $locationProvider.html5Mode(true);
}])
.run(["$rootScope", function($rootScope) {
      $rootScope.title = "Glances";
}]);

glancesApp.directive("sortableTh", function() {
    return {
        restrict: 'A',
        scope: {
            sorter: '='
        },
        link: function (scope, element, attrs) {

            element.addClass('sortable');

            scope.$watch(function() {
                return scope.sorter.column;
            }, function(newValue, oldValue) {

                if (angular.isArray(newValue)) {
                    if (newValue.indexOf(attrs.column) !== -1) {
                        element.addClass('sort');
                    } else {
                        element.removeClass('sort');
                    }
                } else {
                    if (attrs.column === newValue) {
                        element.addClass('sort');
                    } else {
                        element.removeClass('sort');
                    }
                }

            });

            element.on('click', function() {

                scope.sorter.column = attrs.column;

                scope.$apply();
            });
        }
    };
});
glancesApp.filter('min_size', function() {
    return function(input, max) {
        var max = max || 8;
        if (input.length > max) {
            return "_" + input.substring(input.length - max)
        }
        return input
    };
});
glancesApp.filter('exclamation', function() {
    return function(input) {
        if (input === undefined || input === '') {
            return '?';
        }
        return input;
    };
});

glancesApp.filter('bytes', function() {
    return function (bytes, low_precision) {
        low_precision = low_precision || false;
        if (isNaN(parseFloat(bytes)) || !isFinite(bytes) || bytes == 0){
            return bytes;
        }

        var symbols = ['K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
        var prefix = {
          'Y': 1208925819614629174706176,
          'Z': 1180591620717411303424,
          'E': 1152921504606846976,
          'P': 1125899906842624,
          'T': 1099511627776,
          'G': 1073741824,
          'M': 1048576,
          'K': 1024
        };

        var reverseSymbols = _(symbols).reverse().value();
        for (var i = 0; i < reverseSymbols.length; i++) {
          var symbol = reverseSymbols[i];
          var value = bytes / prefix[symbol];

          if(value > 1) {
            var decimal_precision = 0;

            if(value < 10) {
              decimal_precision = 2;
            }
            else if(value < 100) {
              decimal_precision = 1;
            }

            if(low_precision) {
              if(symbol == 'MK') {
                decimal_precision = 0;
              }
              else {
                decimal_precision = _.min([1, decimal_precision]);
              }
            }
            else if(symbol == 'K') {
              decimal_precision = 0;
            }

            return parseFloat(value).toFixed(decimal_precision) + symbol;
          }
        }

        return bytes.toFixed(0);
    }
});

glancesApp.filter('bits', ["$filter", function($filter) {
    return function (bits, low_precision) {
      bits = Math.round(bits) * 8;
      return $filter('bytes')(bits, low_precision) + 'b';
    }
}]);

glancesApp.filter('leftPad', ["$filter", function($filter) {
    return function (value, length, chars) {
      length = length || 0;
      chars = chars || ' ';
      return _.padStart(value, length, chars);
    }
}]);

glancesApp.filter('timemillis', function() {
    return function (array) {
      var sum = 0.0;
      for (var i = 0; i < array.length; i++) {
          sum += array[i] * 1000.0;
      }
      return sum;
    }
});

glancesApp.filter('timedelta', ["$filter", function($filter) {
    return function (value) {
      var sum = $filter('timemillis')(value);
      var d = new Date(sum);

      return {
        hours: d.getUTCHours(), // TODO : multiple days ( * (d.getDay() * 24)))
        minutes: d.getUTCMinutes(),
        seconds: d.getUTCSeconds(),
        milliseconds: parseInt("" + d.getUTCMilliseconds() / 10)
      };
    }
}]);

glancesApp.controller('statsController', ["$scope", "$rootScope", "$interval", "GlancesStats", "help", "arguments", function ($scope, $rootScope, $interval, GlancesStats, help, arguments) {
    $scope.help = help;
    $scope.arguments = arguments;

    $scope.sorter = {
        column: "cpu_percent",
        auto: true,
        isReverseColumn: function (column) {
            return !(column == 'username' || column == 'name');
        },
        getColumnLabel: function (column) {
            if (_.isEqual(column, ['io_read', 'io_write'])) {
                return 'io_counters';
            } else {
                return column;
            }
        }
    };

    $scope.dataLoaded = false;
    $scope.refreshData = function () {
        GlancesStats.getData().then(function (data) {

            $scope.statsAlert = GlancesStats.getPlugin('alert');
            $scope.statsCpu = GlancesStats.getPlugin('cpu');
            $scope.statsDiskio = GlancesStats.getPlugin('diskio');
	    $scope.statsIrq = GlancesStats.getPlugin('irq');
            $scope.statsDocker = GlancesStats.getPlugin('docker');
            $scope.statsFs = GlancesStats.getPlugin('fs');
            $scope.statsFolders = GlancesStats.getPlugin('folders');
            $scope.statsIp = GlancesStats.getPlugin('ip');
            $scope.statsLoad = GlancesStats.getPlugin('load');
            $scope.statsMem = GlancesStats.getPlugin('mem');
            $scope.statsMemSwap = GlancesStats.getPlugin('memswap');
            $scope.statsAmps = GlancesStats.getPlugin('amps');
            $scope.statsNetwork = GlancesStats.getPlugin('network');
            $scope.statsPerCpu = GlancesStats.getPlugin('percpu');
            $scope.statsProcessCount = GlancesStats.getPlugin('processcount');
            $scope.statsProcessList = GlancesStats.getPlugin('processlist');
            $scope.statsQuicklook = GlancesStats.getPlugin('quicklook');
            $scope.statsRaid = GlancesStats.getPlugin('raid');
            $scope.statsSensors = GlancesStats.getPlugin('sensors');
            $scope.statsSystem = GlancesStats.getPlugin('system');
            $scope.statsUptime = GlancesStats.getPlugin('uptime');
            $scope.statsPorts = GlancesStats.getPlugin('ports');

            $rootScope.title = $scope.statsSystem.hostname + ' - Glances';

            $scope.is_disconnected = false;
            $scope.dataLoaded = true;
        }, function() {
            $scope.is_disconnected = true;
        });
    };

    $scope.refreshData();
    $interval(function () {
        $scope.refreshData();
    }, arguments.time * 1000); // in milliseconds

    $scope.onKeyDown = function ($event) {

        switch (true) {
            case !$event.shiftKey && $event.keyCode == keycodes.a:
                // a => Sort processes automatically
                $scope.sorter.column = "cpu_percent";
                $scope.sorter.auto = true;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.A:
                // A => Enable/disable AMPs
                $scope.arguments.disable_amps = !$scope.arguments.disable_amps;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.c:
                // c => Sort processes by CPU%
                $scope.sorter.column = "cpu_percent";
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.m:
                // m => Sort processes by MEM%
                $scope.sorter.column = "memory_percent";
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.u:
                // u => Sort processes by user
                $scope.sorter.column = "username";
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.p:
                // p => Sort processes by name
                $scope.sorter.column = "name";
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.i:
                // i => Sort processes by I/O rate
                $scope.sorter.column = ['io_read', 'io_write'];
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.t:
                // t => Sort processes by time
                $scope.sorter.column = "timemillis";
                $scope.sorter.auto = false;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.d:
                // d => Show/hide disk I/O stats
                $scope.arguments.disable_diskio = !$scope.arguments.disable_diskio;
                break;
	    case $event.shiftKey && $event.keyCode == keycodes.Q:
                // R => Show/hide IRQ
                $scope.arguments.disable_irq = !$scope.arguments.disable_irq;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.f:
                // f => Show/hide filesystem stats
                $scope.arguments.disable_fs = !$scope.arguments.disable_fs;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.n:
                // n => Show/hide network stats
                $scope.arguments.disable_network = !$scope.arguments.disable_network;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.s:
                // s => Show/hide sensors stats
                $scope.arguments.disable_sensors = !$scope.arguments.disable_sensors;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.TWO:
                // 2 => Show/hide left sidebar
                $scope.arguments.disable_left_sidebar = !$scope.arguments.disable_left_sidebar;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.z:
                // z => Enable/disable processes stats
                $scope.arguments.disable_process = !$scope.arguments.disable_process;
                break;
            case $event.keyCode == keycodes.SLASH:
                // SLASH => Enable/disable short processes name
                $scope.arguments.process_short_name = !$scope.arguments.process_short_name;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.D:
                // D => Enable/disable Docker stats
                $scope.arguments.disable_docker = !$scope.arguments.disable_docker;
                break;
            case !$event.shiftKey && $event.keyCode == keycodes.b:
                // b => Bytes or bits for network I/O
                $scope.arguments.byte = !$scope.arguments.byte;
               break;
            case $event.shiftKey && $event.keyCode == keycodes.b:
               // 'B' => Switch between bit/s and IO/s for Disk IO
                $scope.arguments.diskio_iops = !$scope.arguments.diskio_iops;
               break;
            case !$event.shiftKey && $event.keyCode == keycodes.l:
                // l => Show/hide alert logs
                $scope.arguments.disable_log = !$scope.arguments.disable_log;
               break;
            case $event.shiftKey && $event.keyCode == keycodes.ONE:
               // 1 => Global CPU or per-CPU stats
               $scope.arguments.percpu = !$scope.arguments.percpu;
               break;
            case !$event.shiftKey && $event.keyCode == keycodes.h:
                // h => Show/hide this help screen
                $scope.arguments.help_tag = !$scope.arguments.help_tag;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.T:
                // T => View network I/O as combination
                $scope.arguments.network_sum = !$scope.arguments.network_sum;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.u:
                // U => View cumulative network I/O
                $scope.arguments.network_cumul = !$scope.arguments.network_cumul;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.f:
                // F => Show filesystem free space
                $scope.arguments.fs_free_space = !$scope.arguments.fs_free_space;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.THREE:
                // 3 => Enable/disable quick look plugin
                $scope.arguments.disable_quicklook = !$scope.arguments.disable_quicklook;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.FIVE:
                $scope.arguments.disable_quicklook = !$scope.arguments.disable_quicklook;
                $scope.arguments.disable_cpu = !$scope.arguments.disable_cpu;
                $scope.arguments.disable_mem = !$scope.arguments.disable_mem;
                $scope.arguments.disable_swap = !$scope.arguments.disable_swap;
                $scope.arguments.disable_load = !$scope.arguments.disable_load;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.i:
                // I => Show/hide IP module
                $scope.arguments.disable_ip = !$scope.arguments.disable_ip;
                break;
            case $event.shiftKey && $event.keyCode == keycodes.p:
                // I => Enable/disable ports module
                $scope.arguments.disable_ports = !$scope.arguments.disable_ports;
                break;
        }
    };
}]);

var keycodes = {
	'a' : '65',
	'c' : '67',
	'm' : '77',
	'p' : '80',
	'i' : '73',
	't' : '84',
	'u' : '85',
	'd' : '68',
	'f' : '70',
	'n' : '78',
	's' : '83',
	'z' : '90',
	'e' : '69',
	'SLASH': '191',
	'D' : '68',
	'b' : '66',
	'l' : '76',
	'w' : '87',
	'x' : '88',
	'ONE': '49',
	'TWO': '50',
	'THREE': '51',
	'FOUR': '52',
	'FIVE': '53',
	'h' : '72',
	'T' : '84',
	'F' : '70',
	'g' : '71',
	'r' : '82',
	'q' : '81',
	'A' : '65',
	'R' : '82',
}

glancesApp.service('GlancesStats', ["$http", "$injector", "$q", "GlancesPlugin", function($http, $injector, $q, GlancesPlugin) {
    var _stats = [], _views = [], _limits = [];

    var _plugins = {
        'alert': 'GlancesPluginAlert',
        'cpu': 'GlancesPluginCpu',
        'diskio': 'GlancesPluginDiskio',
	'irq'   : 'GlancesPluginIrq',
        'docker': 'GlancesPluginDocker',
        'ip': 'GlancesPluginIp',
        'fs': 'GlancesPluginFs',
        'folders': 'GlancesPluginFolders',
        'load': 'GlancesPluginLoad',
        'mem': 'GlancesPluginMem',
        'memswap': 'GlancesPluginMemSwap',
        'amps': 'GlancesPluginAmps',
        'network': 'GlancesPluginNetwork',
        'percpu': 'GlancesPluginPerCpu',
        'processcount': 'GlancesPluginProcessCount',
        'processlist': 'GlancesPluginProcessList',
        'quicklook': 'GlancesPluginQuicklook',
        'raid': 'GlancesPluginRaid',
        'sensors': 'GlancesPluginSensors',
        'system': 'GlancesPluginSystem',
        'uptime': 'GlancesPluginUptime',
        'ports': 'GlancesPluginPorts'
    };

    this.getData = function() {
        return $q.all([
            this.getAllStats(),
            this.getAllViews()
        ]).then(function(results) {
            return {
                'stats': results[0],
                'view': results[1]
            };
        });
    };

    this.getAllStats = function() {
        return $http.get('/api/2/all').then(function (response) {
            _stats = response.data;

            return response.data;
        });
    };

    this.getAllLimits = function() {
        return $http.get('/api/2/all/limits').then(function (response) {
            _limits = response.data;

            return response.data;
        });
    };

    this.getAllViews = function() {
        return $http.get('/api/2/all/views').then(function (response) {
            _views = response.data;

            return response.data;
        });
    };

    this.getHelp = function() {
        return $http.get('/api/2/help').then(function (response) {
            return response.data;
        });
    };

    this.getArguments = function() {
        return $http.get('/api/2/args').then(function (response) {
            return response.data;
        });
    };

    this.getPlugin = function(name) {
        var plugin = _plugins[name];

        if (plugin === undefined) {
            throw "Plugin '" + name + "' not found";
        }

        plugin = $injector.get(plugin);
        plugin.setData(_stats, _views);

        return plugin;
    };

    // load limits to init GlancePlugin helper
    this.getAllLimits().then(function(limits) {
        GlancesPlugin.setLimits(limits);
    });

}]);

glancesApp.service('GlancesPluginAlert', function () {
    var _pluginName = "alert";
    var _alerts = [];

    this.setData = function (data, views) {
        data = data[_pluginName];
        _alerts = [];

        if(!_.isArray(data)) {
          data = [];
        }

        for (var i = 0; i < data.length; i++) {
            var alertData = data[i];
            var alert = {};

            alert.name = alertData[3];
            alert.level = alertData[2];
            alert.begin = alertData[0] * 1000;
            alert.end = alertData[1] * 1000;
            alert.ongoing = alertData[1] == -1;
            alert.min = alertData[6];
            alert.mean = alertData[5];
            alert.max = alertData[4];

            if (!alert.ongoing) {
                var duration = alert.end - alert.begin;
                var seconds = parseInt((duration / 1000) % 60)
                    , minutes = parseInt((duration / (1000 * 60)) % 60)
                    , hours = parseInt((duration / (1000 * 60 * 60)) % 24);

                alert.duration = _.padLeft(hours, 2, '0') + ":" + _.padLeft(minutes, 2, '0') + ":" + _.padLeft(seconds, 2, '0');
            }

            _alerts.push(alert);
        }
    };

    this.hasAlerts = function () {
        return _alerts.length > 0;
    };

    this.getAlerts = function () {
        return _alerts;
    };

    this.count = function () {
        return _alerts.length;
    };
});

glancesApp.service('GlancesPluginAmps', function() {
    var _pluginName = "amps";
    this.processes = [];

    this.setData = function(data, views) {
        var processes = data[_pluginName];

        this.processes = [];
        angular.forEach(processes, function(process) {
            if (process.result !== null) {
                this.processes.push(process);
            }
        }, this);
    };

    this.getDescriptionDecoration = function(process) {
        var count = process.count;
        var countMin = process.countmin;
        var countMax = process.countmax;
        var decoration = "ok";

        if (count > 0) {
            if ((countMin == null || count >= countMin) && (countMax == null || count <= countMax)) {
                decoration = 'ok';
            } else {
                decoration = 'careful';
            }
        } else {
            decoration = countMin == null ? 'ok' : 'critical';
        }

        return decoration;
    }
});

glancesApp.service('GlancesPluginCpu', function() {
    var _pluginName = "cpu";
    var _view = {};

    this.total = null;
    this.user = null;
    this.system = null;
    this.idle = null;
    this.nice = null;
    this.irq = null;
    this.iowait = null;
    this.steal = null;
    this.ctx_switches = null;
    this.interrupts = null;
    this.soft_interrupts = null;
    this.syscalls = null;

    this.setData = function(data, views) {
        data = data[_pluginName];
        _view = views[_pluginName];

        this.total = data.total;
        this.user = data.user;
        this.system = data.system;
        this.idle = data.idle;
        this.nice = data.nice;
        this.irq = data.irq;
        this.iowait = data.iowait;
        this.steal = data.steal;

        if (data.ctx_switches) {
          this.ctx_switches = Math.floor(data.ctx_switches / data.time_since_update);
        }

        if (data.interrupts) {
          this.interrupts = Math.floor(data.interrupts / data.time_since_update);
        }

        if (data.soft_interrupts) {
          this.soft_interrupts = Math.floor(data.soft_interrupts / data.time_since_update);
        }

        if (data.syscalls) {
          this.syscalls = Math.floor(data.syscalls / data.time_since_update);
        }
    }

    this.getDecoration = function(value) {
        if(_view[value] == undefined) {
            return;
        }

        return _view[value].decoration.toLowerCase();
    }
});

glancesApp.service('GlancesPluginDiskio', ["$filter", function($filter) {
    var _pluginName = "diskio";
    this.disks = [];

    this.setData = function(data, views) {
        data = data[_pluginName];
        data = $filter('orderBy')(data,'disk_name');
        this.disks = [];

        for (var i = 0; i < data.length; i++) {
            var diskioData = data[i];
            var timeSinceUpdate = diskioData['time_since_update'];

            var diskio = {
                'name': diskioData['disk_name'],
                'bitrate': {
                  'txps': $filter('bytes')(diskioData['read_bytes'] / timeSinceUpdate),
                  'rxps': $filter('bytes')(diskioData['write_bytes'] / timeSinceUpdate)
                },
                'count': {
                  'txps': $filter('bytes')(diskioData['read_count'] / timeSinceUpdate),
                  'rxps': $filter('bytes')(diskioData['write_count'] / timeSinceUpdate)
                },
                'alias': diskioData['alias'] !== undefined ? diskioData['alias'] : null
            };

            this.disks.push(diskio);
        }
    };
}]);

glancesApp.service('GlancesPluginDocker', ["GlancesPlugin", function(GlancesPlugin) {

    var _pluginName = "docker";
    this.containers = [];
    this.version = null;

    this.setData = function(data, views) {
        data = data[_pluginName];
        this.containers = [];

        if(_.isEmpty(data)) {
            return;
        }

        for (var i = 0; i < data['containers'].length; i++) {
            var containerData = data['containers'][i];

            var container = {
                'id': containerData.Id,
                'name': containerData.Names[0].split('/').splice(-1)[0],
                'status': containerData.Status,
                'cpu': containerData.cpu.total,
                'memory': containerData.memory.usage != undefined ? containerData.memory.usage : '?',
                'ior': containerData.io.ior != undefined ? containerData.io.ior : '?',
                'iow': containerData.io.iow != undefined ? containerData.io.iow : '?',
                'io_time_since_update': containerData.io.time_since_update,
                'rx': containerData.network.rx != undefined ? containerData.network.rx : '?',
                'tx': containerData.network.tx != undefined ? containerData.network.tx : '?',
                'net_time_since_update': containerData.network.time_since_update,
                'command': containerData.Command,
                'image': containerData.Image
            };

            this.containers.push(container);
        }

        this.version = data['version']['Version'];
    };
}]);

glancesApp.service('GlancesPluginFolders', function() {
    var _pluginName = "folders";
    this.folders = [];

    this.setData = function(data, views) {
        data = data[_pluginName];
        this.folders = [];

        for (var i = 0; i < data.length; i++) {
            var folderData = data[i];

            var folder = {
                'path': folderData['path'],
                'size': folderData['size'],
                'careful': folderData['careful'],
                'warning': folderData['warning'],
                'critical': folderData['critical']
            };

            this.folders.push(folder);
        }
    };

    this.getDecoration = function(folder) {

        if (!Number.isInteger(folder.size)) {
            return;
        }

        if (folder.critical !== null && folder.size > (folder.critical * 1000000)) {
            return 'critical';
        } else if (folder.warning !== null && folder.size > (folder.warning * 1000000)) {
            return 'warning';
        } else if (folder.careful !== null && folder.size > (folder.careful * 1000000)) {
            return 'careful';
        }

        return 'ok';
    };
});

glancesApp.service('GlancesPluginFs', function() {
    var _pluginName = "fs";
    var _view = {};
    this.fileSystems = [];

    this.setData = function(data, views) {
        _view = views[_pluginName];
        data = data[_pluginName];
        this.fileSystems = [];

        for (var i = 0; i < data.length; i++) {
            var fsData = data[i];

            var fs = {
                'name': fsData['device_name'],
                'mountPoint': fsData['mnt_point'],
                'percent': fsData['percent'],
                'size': fsData['size'],
                'used': fsData['used'],
                'free': fsData['free']
            };

            this.fileSystems.push(fs);
        }
    };

    this.getDecoration = function(mountPoint, field) {
        if(_view[mountPoint][field] == undefined) {
            return;
        }

        return _view[mountPoint][field].decoration.toLowerCase();
    };
});

glancesApp.service('GlancesPluginIp', function() {
    var _pluginName = "ip";

    this.address  = null;
    this.gateway = null;
    this.mask = null;
    this.maskCidr = null;
    this.publicAddress = null;

    this.setData = function(data, views) {
        data = data[_pluginName];

        this.address = data.address;
        this.gateway = data.gateway;
        this.mask = data.mask;
        this.maskCidr = data.mask_cidr;
        this.publicAddress = data.public_address
    };
});

glancesApp.service('GlancesPluginIrq', function() {
    var _pluginName = "irq";
    this.irqs = [];

    this.setData = function(data, views) {
        data = data[_pluginName];
        this.irqs = [];

        for (var i = 0; i < data.length; i++) {
            var IrqData = data[i];
            var timeSinceUpdate = IrqData['time_since_update'];

            var irq = {
                'irq_line': IrqData['irq_line'],
		'irq_rate': IrqData['irq_rate']
            };

            this.irqs.push(irq);
        }
    };
});

glancesApp.service('GlancesPluginLoad', function() {
    var _pluginName = "load";
    var _view = {};

    this.cpucore = null;
    this.min1 = null;
    this.min5 = null;
    this.min15 = null;

    this.setData = function(data, views) {
        _view = views[_pluginName];
        data = data[_pluginName];

        this.cpucore = data['cpucore'];
        this.min1 = data['min1'];
        this.min5 = data['min5'];
        this.min15 = data['min15'];
    };

    this.getDecoration = function(value) {
        if(_view[value] == undefined) {
            return;
        }

        return _view[value].decoration.toLowerCase();
    };
});

glancesApp.service('GlancesPluginMem', function() {
    var _pluginName = "mem";
    var _view = {};

    this.percent = null;
    this.total = null;
    this.used = null;
    this.free = null;
    this.version = null;
    this.active = null;
    this.inactive = null;
    this.buffers = null;
    this.cached = null;

    this.setData = function(data, views) {
        _view = views[_pluginName];
        data = data[_pluginName];

        this.percent = data['percent'];
        this.total = data['total'];
        this.used = data['used'];
        this.free = data['free'];
        this.active = data['active'];
        this.inactive = data['inactive'];
        this.buffers = data['buffers'];
        this.cached = data['cached'];
    };

    this.getDecoration = function(value) {
        if(_view[value] == undefined) {
            return;
        }

        return _view[value].decoration.toLowerCase();
    };
});

glancesApp.service('GlancesPluginMemSwap', function() {
    var _pluginName = "memswap";
    var _view = {};

    this.percent = null;
    this.total = null;
    this.used = null;
    this.free = null;

    this.setData = function(data, views) {
        _view = views[_pluginName];
        data = data[_pluginName];

        this.percent = data['percent'];
        this.total = data['total'];
        this.used = data['used'];
        this.free = data['free'];
    };

    this.getDecoration = function(value) {
        if(_view[value] == undefined) {
            return;
        }

        return _view[value].decoration.toLowerCase();
    };
});

glancesApp.service('GlancesPluginNetwork', function() {
    var _pluginName = "network";
    this.networks = [];

    this.setData = function(data, views) {
        this.networks = [];

        for (var i = 0; i < data[_pluginName].length; i++) {
            var networkData = data[_pluginName][i];

            var network = {
                'interfaceName': networkData['interface_name'],
                'rx': networkData['rx'],
                'tx': networkData['tx'],
                'cx': networkData['cx'],
                'time_since_update': networkData['time_since_update'],
                'cumulativeRx': networkData['cumulative_rx'],
                'cumulativeTx': networkData['cumulative_tx'],
                'cumulativeCx': networkData['cumulative_cx']
            };

            this.networks.push(network);
        }
    };
});

glancesApp.service('GlancesPluginPerCpu', ["$filter", "GlancesPlugin", function($filter, GlancesPlugin) {
    var _pluginName = "percpu";
    this.cpus = [];

    this.setData = function(data, views) {
        data = data[_pluginName];
        this.cpus = [];

        for (var i = 0; i < data.length; i++) {
            var cpuData = data[i];

            this.cpus.push({
                'total': cpuData.total,
                'user': cpuData.user,
                'system': cpuData.system,
                'idle': cpuData.idle,
                'iowait': cpuData.iowait,
                'steal': cpuData.steal
            });
        }
    };

    this.getUserAlert = function(cpu) {
        return GlancesPlugin.getAlert(_pluginName, 'percpu_user_', cpu.user)
    };

    this.getSystemAlert = function(cpu) {
        return GlancesPlugin.getAlert(_pluginName, 'percpu_system_', cpu.system);
    };
}]);

glancesApp.service('GlancesPlugin', function () {

    var plugin = {
        'limits': {},
        'limitSuffix': ['critical', 'careful', 'warning']
    };

    plugin.setLimits = function(limits){
        this.limits = limits;
    };

    plugin.getAlert = function (pluginName, limitNamePrefix, current, maximum, log) {
        current = current || 0;
        maximum = maximum || 100;
        log = log || false;

        var log_str = log ? '_log' : '';
        var value = (current * 100) / maximum;

        if (this.limits[pluginName] != undefined) {
            for (var i = 0; i < this.limitSuffix.length; i++) {
                var limitName = limitNamePrefix + this.limitSuffix[i];
                var limit = this.limits[pluginName][limitName];

                if (value >= limit) {
                    var pos = limitName.lastIndexOf("_");
                    var className = limitName.substring(pos + 1);

                    return className + log_str;
                }
            }
        }

        return "ok" + log_str;
    };

    plugin.getAlertLog = function (pluginName, limitNamePrefix, current, maximum) {
        return this.getAlert(pluginName, limitNamePrefix, current, maximum, true);
    };

    return plugin;
});

glancesApp.service('GlancesPluginPorts', function() {
  var _pluginName = "ports";
  this.ports = [];

  this.setData = function(data, views) {
    var ports = data[_pluginName];
    this.ports = [];

    angular.forEach(ports, function(port) {
      this.ports.push(port);
    }, this);
  };

  this.getDecoration = function(port) {
    if (port.status === null) {
      return 'careful';
    }

    if (port.status === false) {
      return 'critical';
    }

    if (port.rtt_warning !== null && port.status > port.rtt_warning) {
      return 'warning';
    }

    return 'ok';
  };
});

glancesApp.service('GlancesPluginProcessCount', function() {
    var _pluginName = "processcount";

    this.total  = null;
    this.running = null;
    this.sleeping = null;
    this.stopped = null;
    this.thread = null;

    this.setData = function(data, views) {
        data = data[_pluginName];

        this.total = data['total'] || 0;
        this.running = data['running'] || 0;
        this.sleeping = data['sleeping'] || 0;
        this.stopped = data['stopped'] || 0;
        this.thread = data['thread'] || 0;
    };
});

glancesApp.service('GlancesPluginProcessList', ["$filter", "GlancesPlugin", function($filter, GlancesPlugin) {
    var _pluginName = "processlist";
    var _ioReadWritePresent = false;
    this.processes = [];

    this.setData = function(data, views) {
        this.processes = [];
        this.ioReadWritePresent = false;

        for (var i = 0; i < data[_pluginName].length; i++) {
            var process = data[_pluginName][i];

            process.memvirt = process.memory_info[1];
            process.memres  = process.memory_info[0];
            process.timeplus = $filter('timedelta')(process.cpu_times);
            process.timemillis = $filter('timemillis')(process.cpu_times);

            process.ioRead = null;
            process.ioWrite = null;

            if (process.io_counters) {
                this.ioReadWritePresent = true;

                process.ioRead  = (process.io_counters[0] - process.io_counters[2]) / process.time_since_update;

                if (process.ioRead != 0) {
                    process.ioRead = $filter('bytes')(process.ioRead);
                }

                process.ioWrite = (process.io_counters[1] - process.io_counters[3]) / process.time_since_update;

                if (process.ioWrite != 0) {
                    process.ioWrite = $filter('bytes')(process.ioWrite);
                }
            }

            process.isNice = process.nice !== undefined && ((data['system'].os_name === 'Windows' && process.nice != 32) || (data['system'].os_name !== 'Windows' && process.nice != 0));

            if (Array.isArray(process.cmdline)) {
                process.cmdline = process.cmdline.join(' ');
            }

            this.processes.push(process);
        }
    };

    this.getCpuPercentAlert = function(process) {
        return GlancesPlugin.getAlert(_pluginName, 'processlist_cpu_', process.cpu_percent);
    };

    this.getMemoryPercentAlert = function(process) {
        return GlancesPlugin.getAlert(_pluginName, 'processlist_mem_', process.cpu_percent);
    };
}]);

glancesApp.service('GlancesPluginQuicklook', function() {
    var _pluginName = "quicklook";
    var _view = {};

    this.mem = null;
    this.cpu = null;
    this.cpu_name = null;
    this.cpu_hz_current = null;
    this.cpu_hz = null;
    this.swap = null;
    this.percpus = [];

    this.setData = function(data, views) {
        data = data[_pluginName];
        _view = views[_pluginName];

        this.mem = data.mem;
        this.cpu = data.cpu;
        this.cpu_name = data.cpu_name;
        this.cpu_hz_current = data.cpu_hz_current;
        this.cpu_hz = data.cpu_hz;
        this.swap = data.swap;
        this.percpus = [];

        angular.forEach(data.percpu, function(cpu) {
            this.percpus.push({
                'number': cpu.cpu_number,
                'total': cpu.total
            });
        }, this);
    }

    this.getDecoration = function(value) {
        if(_view[value] == undefined) {
            return;
        }

        return _view[value].decoration.toLowerCase();
    }
});

glancesApp.service('GlancesPluginRaid', function () {
    var _pluginName = "raid";
    this.disks = [];

    this.setData = function (data, views) {
      this.disks = [];
        data = data[_pluginName];

        _.forIn(data, function(diskData, diskKey) {
            var disk = {
                'name': diskKey,
                'type': diskData.type == null ? 'UNKNOWN' : diskData.type,
                'used': diskData.used,
                'available': diskData.available,
                'status': diskData.status,
                'degraded': diskData.used < diskData.available,
                'config': diskData.config == null ? '' : diskData.config.replace('_', 'A'),
                'inactive': diskData.status == 'inactive',
                'components': []
            };

            _.forEach(diskData.components, function(number, name) {
                disk.components.push({
                    'number': number,
                    'name': name
                });
            });

            this.disks.push(disk);
        }, this);
    };

    this.hasDisks = function() {
        return this.disks.length > 0;
    }

    this.getAlert = function(disk) {
        if (disk.inactive) {
            return 'critical';
        }

        if (disk.degraded) {
            return 'warning';
        }

        return 'ok'
    }
});

glancesApp.service('GlancesPluginSensors', ["GlancesPlugin", function(GlancesPlugin) {

    var _pluginName = "sensors";
    this.sensors = [];

    this.setData = function(data, views) {
        data = data[_pluginName];

        _.remove(data, function(sensor) {
            return (_.isArray(sensor.value) && _.isEmpty(sensor.value)) || sensor.value === 0;
        });

        this.sensors = data;
    };

    this.getAlert = function(sensor) {
        var current = sensor.type == 'battery' ? 100 - sensor.value : sensor.value;

        return GlancesPlugin.getAlert(_pluginName, 'sensors_' + sensor.type + '_', current);
    };
}]);

glancesApp.service('GlancesPluginSystem', function() {
    var _pluginName = "system";

    this.hostname  = null;
    this.platform = null;
    this.humanReadableName = null;
    this.os = {
        'name': null,
        'version': null
    };

    this.setData = function(data, views) {
        data = data[_pluginName];
        
        this.hostname = data['hostname'];
        this.platform = data['platform'];
        this.os.name = data['os_name'];
        this.os.version = data['os_version'];
        this.humanReadableName = data['hr_name'];
    };

    this.isBsd = function() {
        return this.os.name === 'FreeBSD';
    };

    this.isLinux = function() {
        return this.os.name === 'Linux';
    };

    this.isMac = function() {
        return this.os.name === 'Darwin';
    };

    this.isWindows = function() {
        return this.os.name === 'Windows';
    };
});

glancesApp.service('GlancesPluginUptime', function() {
    this.uptime = null;

    this.setData = function(data, views) {
        this.uptime = data['uptime'];
    };
});
