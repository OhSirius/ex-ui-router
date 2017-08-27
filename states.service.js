angular.module('crmConfigApp')
//Основная идея сервиса в разделении конфигурирования состояний приложения на 2 части:
//  - описание представления каждого состояния (является частью модели UI-контрола) (используем метод addStateDescription)
//  - описание дерева связей ("склейки") состояний (используем метод addStateRelations)
//.provider('statesConfigService', ['stringHelperProvider', function (stringHelper) {
.provider('statesConfigService', [ 'stringHelperProvider', function (stringHelper) {
    //Массив хранит список доступных состояний
    //Состояние объект типа { name, config, instanceProvider}, где
    //   name - название состояния, например 'state1'
    //   config - массив конфигураций, например [ { parent:'state2', views: { view: '', view2: 'toolBar'}, data: { service1: 'service1', service2: 'service2'}}, { parent:'state2.state3', views: ...}]
    //   instanceProvider - фабричный метод для создания экземпляра angularJS объекта состояния , т.е. function(view1, view2, ...){ return { views: [], ...}}
    //                      родитель при этом не устанавливается.  
    //   required - состояние является обязательным
    //   isRoot - состояние является корневым
    var states = [];

    var getState = function(name) {
        if (name === '')
            throw new Error('Не определено название состояния');

        if (!Enumerable.From(states).Any(function(s) { return s.name === name; }))
            throw new Error('Состояние с именем ' + name + ' отсутствует в коллекции');

        var state = Enumerable.From(states).Single(function(s) { return s.name === name; });
        return state;
    };

    var getParentsStates = function(name) {
        var state = getState(name);
        var parents = null;
        if (!!state.parents)
            parents = Enumerable.From(states).Where(function(s) { return Enumerable.From(state.config).Select(function(s) { return s.parent; }).Any(function(p) { return p === s.name; }) }).ToArray();

        return parents;
    };

    var add = function (name, params, config, instanceProvider, required, isRoot) {
        if (name === '')
            throw new Error('Название состояния имеет неверный формат или не определено: ' + name);

        if (!!config && !angular.isArray(config))
            throw new Error('Название родительских состояний не определены');

        if (!!instanceProvider && !angular.isFunction(instanceProvider))
            throw new Error('Не определен фабричный метод для получения состояния');

        if (!Enumerable.From(states).Any(function (s) { return s.name === name; })) 
            states.push({ name: name});

        var state = getState(name);

        if (angular.isDefined(config)) {
            if (!!state.config) {
                //throw new Error('Состояние ' + name + ' уже имеет установленные связи');
                Enumerable.From(config).ForEach(function (c) { state.config.push(c) });
            }
            else
                state.config = config;
        }

        if (!!instanceProvider) {
            if (!!state.instanceProvider)
                throw new Error('Состояние ' + name+ ' уже имеет установленный провайдер');

            state.instanceProvider = instanceProvider;
        }

        if (!!params) {
            if (!!state.params)
                throw new Error('Состояние ' + name+ ' уже имеет установленные параметры');

            state.params = params;
        }

        if (angular.isDefined(required)) {
            if (!angular.isDefined(required))
                throw new Error('Состояние ' + name + ' уже имеет установленный атрибут обязательности');
            state.required = required;
        }

        if (angular.isDefined(isRoot)) {
            //if (!angular.isDefined(isRoot))
            //    throw new Error('Состояние ' + name + ' уже имеет установленный атрибут корневого состояния');
            state.isRoot = isRoot;
        }


        //В случае, если экран не определен, то предполагется использовать неименованный экран родителя 
        //if (!angular.isDefined(views))
        //    views = { view: '' };

    };

    var remove = function (name) {
        var state = getState(name);

        states.splice(states.indexOf(state), 1);
    };

    //#region groupsManager
    var createGroupManager = function(path) {
        if (!path)
            throw new Error('Не определен путь к состоянию');

        var getGroupKey = function(partPath) {
            return stringHelper.contains(partPath, '_') ? partPath.substring(0, partPath.indexOf('_')) : partPath;
        };

        var groups = Enumerable.From(path.split('.')).GroupBy(function(p) {
            return getGroupKey(p);
        }).Select(function(g) {
            return { name: g.Key(), count: g.Count() };
        }).ToArray();

        return {
            _groups: groups,
            getStateInfo: function(name) {
                if (!name)
                    throw new Error('Не определено название состояния');
                var info = Enumerable.From(this._groups).FirstOrDefault(null, function(s) { return s.name === name; });
                return info;
            },
            getStateCount: function(name) {
                var info = this.getStateInfo(name);
                return !info ? 0 : info.count;
            },
            getGroups: function() {
                return this._groups;
            }
        };

    };

    //#endregion

    var formatStateName = function(name, order) {
        if (!name)
            throw new Error('Не определено название состояния');

        return !order || order < 0 ? name : name + '_' + order;
    };

    var formatStateParam = function(param, order) {
        if (!param)
            throw new Error('Не определено название параметра');

        return !order || order < 0 ? param : param + '_' + order;
    };

    var normalizeStateName = function(path) {
        if (!path)
            throw new Error('Состояние не определено');
        if (stringHelper.startWith(path, '.'))
            throw new Error('Абсолютный путь не может начинаться с <.>');
        if (!stringHelper.contains(path, '.'))
            return path;
        if (stringHelper.startWith(path, '_'))
            throw new Error('Пути не могут содержать знак _');

        var manager = createGroupManager(path);
        var normalizePath = '';
        Enumerable.From(path.split('.')).ForEach(function(s) {
            var info = manager.getStateInfo(s);
            if (info) {
                info.counter = 'counter' in info ? info.counter + 1 : 0;
            }
            normalizePath = !normalizePath ? s : normalizePath + '.' + formatStateName(s, info.counter);
        });
        return normalizePath;
    };

    var normalizeStateParams = function (path, paramsInfo, name) {
        if (!name)
            throw new Error('Не определено состояние');
        if (!paramsInfo)
            return null;

        var manager = createGroupManager(path);
        var stateParams = '';
        stateParams += 'prefix' in paramsInfo ? '/' + paramsInfo.prefix : '';
        if (Enumerable.From(paramsInfo.params).Any()) {
            Enumerable.From(paramsInfo.params).ForEach(function(p, i) {
                stateParams += '/{' + formatStateParam(p.name, manager.getStateCount(name) - 1) + '}';
            });
        }

        return stateParams;
    };

    var getNormalizedStateInfo = function(name, parent, params, views) {
        if (!name)
            throw new Error('Не определено название состояния');
        //if (!parent)
        //    throw new Error('Не определено родительское состояние');

        var path = !parent ? name : parent + '.' + name;
        var stateName = normalizeStateName(path);
        var stateParams = normalizeStateParams(path, params, name);
        Enumerable.From(views).Where(function (v) { return stringHelper.contains(v.Value, '@'); }).ForEach(function (v) {
            var parentState = normalizeStateName(v.Value.substring(v.Value.indexOf('@')));
            v.Value = v.Value.substring(0, v.Value.indexOf('@')) + '@' + parentState;
        });
        return { name: stateName, params: stateParams, views: views };
    };

    var go = function(name, params, $state, $stateParams) {
        if (!name)
            throw new Error('Не определено название состояния');

        var parent = $state.current.name;
        var stateName = stringHelper.startWith(name, '.') ? stringHelper.replaceAll('.', '', name) : name;
        var path = !parent ? name : parent + '.' + stateName;
        var manager = createGroupManager(path);
        var order = manager.getStateCount(stateName) - 1;
        var stateParams = {};
        if (!!params) {
            Enumerable.From(params).ForEach(function(p) {
                stateParams[formatStateParam(p.Key, order)] = p.Value;
            });
        }

        $state.go('.' + formatStateName(stateName, order), stateParams);
    };

    var getStateName = function (name, $state, $stateParams, targetPath) {
        if (!name)
            throw new Error('Не определено название состояния');
        //if (!targetPath)
        //    throw new Error('Не определен целевой путь');

        var path = targetPath; //!$state.current.name ? name : $state.current.name + '.' + name;
        if (!path)
            return name;
        var manager = createGroupManager(path);
        return formatStateName(name, manager.getStateCount(name) - 1);
    };

    var getStateOrder = function (name, $state, $stateParams, targetPath) {
        if (!name)
            throw new Error('Не определено название состояния');
        //if (!targetPath)
        //    throw new Error('Не определен целевой путь');

        var path = targetPath; //!$state.current.name ? name : $state.current.name + '.' + name;
        if (!path)
            return name;
        var manager = createGroupManager(path);
        return manager.getStateCount(name);
    };

    var getStateParamName = function (name, param, $state, $stateParams, targetPath) {
        if (!name)
            throw new Error('Не определено название состояния');
        if (!param)
            throw new Error('Не определено название параметра');
        //if (!targetPath)
        //    throw new Error('Не определен целевой путь');

        var path = targetPath;// !$state.current.name ? name : $state.current.name + '.' + name;
        if (!path)
            return param;
        var manager = createGroupManager(path);
        var paramName = formatStateParam(param, manager.getStateCount(name) - 1);
        //if (!(paramName in $stateParams))
        //    throw new Error('Не удалось найти параметр ' + param + '. Состояние ' + name + ' не активировано или неверно задан параметр');
        //return $stateParams[paramName];
        return paramName;
    };

    var validate = function () {
        var stateWithoutRelations = Enumerable.From(states).FirstOrDefault(null, function (s) { return !angular.isDefined(s.config) && s.required === true; });
        if (!!stateWithoutRelations)
            throw new Error('Для состояния ' + stateWithoutRelations.name + ' не определены родительские состояния. Для установки родительских состояний необходимо использовать метод statesConfigServiceProvider.addStateRelations.');

        if (Enumerable.From(states).Count(function (s) { return s.isRoot === true; }) != 1)
            throw new Error('Не найдено или найдено более 1-го состояния, относящегося к корневым');

        var statesWithoutProvider = Enumerable.From(states).Where(function (s) { return !s.instanceProvider && s.required === true; }).Select(function (s) { return s.name; }).ToArray();
        if (Enumerable.From(statesWithoutProvider).Any())
            throw new Error('Данные состояния имеют неопределенный провайдер: ' + statesWithoutProvider.join());

        var statesWithEscapes = Enumerable.From(states).Where(function (s) { return stringHelper.contains(s.name, '_'); }).Select(function (s) { return s.name; }).ToArray();
        if (Enumerable.From(statesWithEscapes).Any())
            throw new Error('Данные состояния имеют запрещенные имена (недопустим знак _): ' + statesWithEscapes.join());

        angular.forEach(states, function(state) {
            if (!!state.config) {
                angular.forEach(state.config, function(configuration) {
                    var paths = configuration.parent.split('.');
                    if (!Enumerable.From(paths).Any(function(p) { return Enumerable.From(states).Any(function(s) { return p === s.name; }) }))
                        throw new Error('Не найдено одно из состояний в пути: ' + configuration.parent);
                });
            }
        });
    };

    return {
        addStateRelations: function (name, config, required) {
            if (!config || !angular.isArray(config))
                throw new Error('Не определен массив родительских состояний');

            add(name, null, config, null, required, false);
            return this;
        },
        addRootState: function (name, instanceProvider) {
            add(name, null, null, instanceProvider, true, true);
            return this;
        },
        removeState: function(name){
            remove(name);
            return this;
        },
        addStateDescription: function(name, params, instanceProvider, required){
            if (!instanceProvider || !angular.isFunction(instanceProvider))
                throw new Error('Не определен фабричный метод для получения состояния');

            add(name, params, null, instanceProvider, required, false);
            return this;
        },
        addState: function (name, params, config, instanceProvider, required) {
            if (!config || !angular.isArray(config))
                throw new Error('Не определен массив родительских состояний');

            if (!instanceProvider || !angular.isFunction(instanceProvider))
                throw new Error('Не определен фабричный метод для получения состояния');

            add(name, params, config, instanceProvider, required, false);
            return this;
        },
        configure: function ($stateProvider) {
            if ($stateProvider == null)
                throw new Error('Не определен провайдер состояний AngularJS. Убедитесь, что добавлен модуль ui-router');

            validate();

            angular.forEach(states, function(state) {
                if (state.isRoot) {
                    var instance = state.instanceProvider();
                    if (instance == null)
                        throw new Error('Не определен экземпляр состояния ' + state.name);
                    $stateProvider.state(state.name, instance);
                } else if(!!state.config){
                    angular.forEach(state.config, function(configuration) {
                        var stateInfo = getNormalizedStateInfo(state.name, configuration.parent, state.params, configuration.views);
                        var params = [];
                        params.push(stateInfo.name);
                        params.push(stateInfo.params);

                        if (!!configuration.views) {
                            var views = Enumerable.From(stateInfo.views).Select(function (v) { return v.Value; }).ToArray();
                            angular.forEach(views, function(value) { params.push(value); });
                        }

                        if (!!configuration.data) {
                            var data = Enumerable.From(configuration.data).Select(function(v) { return v.Value; }).ToArray();
                            angular.forEach(data, function(value) { params.push(value); });
                        }

                        var instance = state.instanceProvider.apply(state, params); //state.instanceProvider();
                        if (instance == null)
                            throw new Error('Не определен экземпляр состояния ' + state.name);

                        //$stateProvider.state(configuration.parent + '.' + state.name, instance);
                        $stateProvider.state(stateInfo.name, instance);
                    });
                }
            });

        },
        $get: ['$state', '$stateParams', function ($state, $stateParams) {
            return {
                _states: states,
                go: function(name, params) {
                    return go(name, params, $state, $stateParams);
                },
                getStateName: function(name, targetPath) {
                    return getStateName(name, $state, $stateParams, targetPath);
                },
                getStateParamName: function (name, param, targetPath) {
                    return getStateParamName(name, param, $state, $stateParams, targetPath);
                },
                getStateOrder: function(name, targetPath) {
                    return getStateOrder(name, $state, $stateParams, targetPath);
                }
            };
        }]
    };
}])